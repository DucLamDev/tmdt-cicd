import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../api/payments';
import { FiCheckCircle, FiXCircle, FiLoader, FiAlertTriangle } from 'react-icons/fi';

const MoMoCallback = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const response = await paymentAPI.verifyMoMoReturn(params);
        setResult(response);
      } catch (error) {
        // Parse resultCode from URL params directly if API fails
        const resultCode = searchParams.get('resultCode');
        const message = searchParams.get('message') || 'Không thể xác minh kết quả thanh toán';
        setResult({
          success: resultCode === '0',
          message: resultCode === '0' ? 'Thanh toán thành công' : message,
          data: { resultCode }
        });
      } finally {
        setLoading(false);
      }
    };
    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <FiLoader className="w-12 h-12 mx-auto mb-4 animate-spin text-pink-500" />
        <h2 className="text-xl font-semibold">Đang xác minh thanh toán MoMo...</h2>
      </div>
    );
  }

  const isSuccess = result?.success;
  const isSandboxError = result?.message?.includes('từ chối') || result?.message?.includes('nhà phát hành');

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto card p-8 text-center">
        {isSuccess ? (
          <>
            <FiCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán MoMo thành công!</h2>
            <p className="text-gray-600 mb-4">{result.message}</p>
            {result.data?.transactionNo && (
              <p className="text-sm text-gray-500 mb-4">
                Mã giao dịch: <strong>{result.data.transactionNo}</strong>
              </p>
            )}
          </>
        ) : (
          <>
            {isSandboxError ? (
              <>
                <FiAlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                <h2 className="text-2xl font-bold text-yellow-700 mb-2">Thanh toán MoMo Test</h2>
                <p className="text-gray-600 mb-2">{result?.message}</p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left text-sm mt-4">
                  <p className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý - Môi trường Test:</p>
                  <p className="text-yellow-700 mb-1">Đây là lỗi từ <strong>sandbox MoMo</strong>, không phải lỗi hệ thống.</p>
                  <p className="text-yellow-700 mb-1">Để test thành công, bạn cần:</p>
                  <ul className="list-disc ml-4 text-yellow-700 space-y-1">
                    <li>Sử dụng tài khoản MoMo test chính thức</li>
                    <li>Hoặc dùng app MoMo sandbox</li>
                    <li>Đơn hàng vẫn được lưu với trạng thái "Chờ thanh toán"</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <FiXCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h2 className="text-2xl font-bold text-red-700 mb-2">Thanh toán MoMo thất bại</h2>
                <p className="text-gray-600 mb-4">{result?.message || 'Giao dịch không thành công'}</p>
              </>
            )}
          </>
        )}

        <div className="flex gap-4 justify-center mt-6">
          <Link to="/orders" className="btn-primary px-6 py-2">Đơn hàng của tôi</Link>
          <Link to="/" className="btn-outline px-6 py-2">Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
};

export default MoMoCallback;
