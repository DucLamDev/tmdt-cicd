import { useEffect, useRef, useState } from 'react';
import { FiDownload, FiImage, FiLoader, FiMapPin, FiRefreshCw, FiUpload, FiX, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { tryonAPI } from '../api/tryon';
import { getProductImage, getTryOnCategory, isFashionProduct } from '../utils/productHelpers';

const providerLabel = {
  openai_gpt_image: 'Bản ảnh nâng cao',
  replicate_idm_vton: 'Bản thử đồ',
  prompt_image: 'Bản phối ảnh',
  opencv_fallback: 'Bản xem trước'
};

const tryOnContexts = [
  { value: 'auto', label: 'Tự động' },
  { value: 'casual outing, walking around the city or meeting friends', label: 'Đi chơi' },
  { value: 'comfortable at-home lifestyle setting', label: 'Ở nhà' },
  { value: 'light jogging or active outdoor setting', label: 'Chạy bộ' },
  { value: 'clean office or study setting', label: 'Văn phòng' },
  { value: 'minimal fashion studio with ecommerce lighting', label: 'Studio' },
  { value: 'custom', label: 'Tùy chỉnh' }
];

const getWarningText = (warning = '') => (
  warning.includes('No real AI try-on provider')
    ? 'Chức năng thử đồ nâng cao chưa sẵn sàng, hệ thống đang hiển thị bản xem trước tạm thời.'
    : warning
);

const VirtualTryOnModal = ({ product, onClose }) => {
  const [userImage, setUserImage] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [serviceReady, setServiceReady] = useState(null);
  const [tryOnContext, setTryOnContext] = useState('auto');
  const [customContext, setCustomContext] = useState('');
  const fileInputRef = useRef(null);

  const productImageUrl = getProductImage(product);
  const tryOnCategory = getTryOnCategory(product);

  useEffect(() => {
    tryonAPI.healthCheck()
      .then((ready) => setServiceReady(ready))
      .catch(() => setServiceReady(false));
  }, []);

  useEffect(() => () => {
    if (userImagePreview) URL.revokeObjectURL(userImagePreview);
  }, [userImagePreview]);

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ảnh không được lớn hơn 10MB');
      return;
    }

    if (userImagePreview) URL.revokeObjectURL(userImagePreview);
    setUserImage(file);
    setUserImagePreview(URL.createObjectURL(file));
    setResult(null);
  };

  const resetUserImage = () => {
    if (userImagePreview) URL.revokeObjectURL(userImagePreview);
    setUserImage(null);
    setUserImagePreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTryOn = async () => {
    if (!userImage) {
      toast.error('Vui lòng chọn ảnh của bạn');
      return;
    }

    if (!isFashionProduct(product)) {
      toast.error('Thử đồ ảo chỉ áp dụng cho sản phẩm thời trang');
      return;
    }

    try {
      setLoading(true);
      const sceneContext = tryOnContext === 'custom' ? customContext.trim() : tryOnContext;
      const response = await tryonAPI.virtualTryOn(
        userImage,
        productImageUrl,
        product.title,
        tryOnCategory,
        sceneContext
      );

      if (response.success) {
        setResult(response.data);
        toast.success(response.data?.warning ? 'Đã tạo bản xem trước' : 'Đã tạo ảnh thử đồ');
      } else {
        toast.error(response.message || 'Không thể xử lý thử đồ ảo');
      }
    } catch (error) {
      console.error('Try-on error:', error);
      toast.error(error.response?.data?.message || error.message || 'Lỗi kết nối đến dịch vụ thử đồ');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.resultImage) return;
    const link = document.createElement('a');
    link.href = result.resultImage;
    link.download = `try-on-${product.slug || product._id || 'result'}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-sm font-bold text-purple-700">
              <FiZap />
              Thử đồ ảo
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950">Thử đồ ảo</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{product.title}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{tryOnCategory}</span>
              <span className={`rounded-full px-3 py-1 ${serviceReady === false ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {serviceReady === null ? 'Đang kiểm tra trạng thái' : serviceReady ? 'Sẵn sàng' : 'Tạm thời chưa phản hồi'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">Ảnh của bạn</h3>
                  {userImagePreview && (
                    <button type="button" onClick={resetUserImage} className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                      Đổi ảnh
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-purple-400"
                >
                  {userImagePreview ? (
                    <img src={userImagePreview} alt="Ảnh của bạn" className="h-full w-full object-cover" />
                  ) : (
                    <span className="p-6 text-slate-500">
                      <FiUpload className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                      <span className="block font-semibold">Tải ảnh lên</span>
                      <span className="mt-1 block text-xs">JPG, PNG, WebP</span>
                    </span>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>

              <div>
                <h3 className="mb-3 font-bold text-slate-900">Sản phẩm</h3>
                <div className="aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={productImageUrl} alt={product.title} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900" htmlFor="tryon-context">
                <FiMapPin className="text-purple-600" />
                Bối cảnh thử đồ
              </label>
              <select
                id="tryon-context"
                value={tryOnContext}
                onChange={(event) => setTryOnContext(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-purple-300 focus:bg-white"
              >
                {tryOnContexts.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              {tryOnContext === 'custom' && (
                <input
                  value={customContext}
                  onChange={(event) => setCustomContext(event.target.value)}
                  maxLength={160}
                  placeholder="Ví dụ: đi biển buổi chiều, cafe cuối tuần..."
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-purple-300 focus:bg-white"
                />
              )}
            </div>

            <button
              onClick={handleTryOn}
              disabled={!userImage || loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <FiZap className="h-5 w-5" />
                  Thử đồ ngay
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900">Kết quả</h3>
              {result?.provider && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {providerLabel[result.provider] || 'Bản xử lý ảnh'}
                </span>
              )}
            </div>

            {result?.resultImage ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border bg-white">
                  <img src={result.resultImage} alt="Kết quả thử đồ" className="w-full object-cover" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleDownload} className="btn-secondary px-4 py-2">
                    <FiDownload />
                    Tải ảnh
                  </button>
                  <button type="button" onClick={handleTryOn} disabled={loading || !userImage} className="btn-outline px-4 py-2">
                    <FiRefreshCw />
                    Tạo lại
                  </button>
                </div>
                {result.warning && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    {getWarningText(result.warning)}
                  </div>
                )}
                {result.aiAnalysis && (
                  <div className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-700">
                    <div className="mb-2 font-bold text-slate-900">Gợi ý phối đồ</div>
                    <div className="whitespace-pre-wrap">{result.aiAnalysis}</div>
                  </div>
                )}
                {result.tryonContext && (
                  <div className="rounded-lg bg-white p-4 text-sm leading-6 text-slate-700">
                    <div className="mb-1 font-bold text-slate-900">Bối cảnh</div>
                    <div>{result.tryonContext}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center text-slate-500">
                <FiImage className="mb-3 h-12 w-12 text-slate-300" />
                <div className="font-semibold">Kết quả sẽ hiển thị ở đây</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnModal;
