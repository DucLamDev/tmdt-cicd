import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiRefreshCw, FiStar, FiX } from 'react-icons/fi';
import { ordersAPI } from '../../api/orders';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import ReviewModal from '../../components/ReviewModal';
import { returnAPI } from '../../api/features';
import apiClient from '../../api/client';
import toast from 'react-hot-toast';
import { shipperReviewAPI } from '../../api/reviews';
import ImagePasteInput from '../../components/ImagePasteInput';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({ returnReason: 'other', description: '', images: '' });
  const [returnFiles, setReturnFiles] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [shipperReview, setShipperReview] = useState({ rating: 5, content: '', images: '' });
  const [shipperReviewFiles, setShipperReviewFiles] = useState([]);
  const [reviewingShipper, setReviewingShipper] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await ordersAPI.getOrder(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const canRequestReturn = () => {
    if (!order || order.orderStatus !== 'DELIVERED') return false;
    const deliveredDate = new Date(order.actualDelivery || order.updatedAt);
    return (Date.now() - deliveredDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
  };

  const uploadImages = async (files) => {
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const uploadResponse = await apiClient.post('/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return uploadResponse.data.map((file) => file.url);
  };

  const submitReturnRequest = async (event) => {
    event.preventDefault();
    const needsEvidence = ['defective', 'wrong_item', 'not_as_described', 'damaged'].includes(returnForm.returnReason);
    if (returnForm.description.trim().length < 20) {
      toast.error('Vui lòng mô tả rõ lý do trả hàng, tối thiểu 20 ký tự');
      return;
    }
    if (needsEvidence && returnFiles.length === 0 && !returnForm.images.trim()) {
      toast.error('Vui lòng chụp/đính kèm ảnh sản phẩm để làm minh chứng');
      return;
    }
    if (!returnForm.description.trim()) {
      toast.error('Vui lòng nhập lý do trả hàng');
      return;
    }

    try {
      setReturnLoading(true);
      const uploadedImages = await uploadImages(returnFiles);

      await returnAPI.create({
        orderId: order._id,
        returnReason: returnForm.returnReason,
        description: returnForm.description.trim(),
        images: [
          ...uploadedImages,
          ...returnForm.images.split('\n').map((item) => item.trim()).filter(Boolean)
        ],
        items: order.items.map((item) => ({
          productId: typeof item.productId === 'object' ? item.productId._id : item.productId,
          quantity: item.quantity,
          reason: returnForm.returnReason
        }))
      });
      toast.success('Đã gửi yêu cầu trả hàng');
      setShowReturnModal(false);
      setReturnFiles([]);
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu trả hàng');
    } finally {
      setReturnLoading(false);
    }
  };

  const submitShipperReview = async (event) => {
    event.preventDefault();
    try {
      setReviewingShipper(true);
      const uploadedImages = await uploadImages(shipperReviewFiles);
      await shipperReviewAPI.create({
        orderId: order._id,
        rating: shipperReview.rating,
        content: shipperReview.content,
        images: [
          ...uploadedImages,
          ...shipperReview.images.split('\n').map((item) => item.trim()).filter(Boolean)
        ]
      });
      toast.success('Đã gửi đánh giá shipper');
      setShipperReview({ rating: 5, content: '', images: '' });
      setShipperReviewFiles([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đánh giá shipper');
    } finally {
      setReviewingShipper(false);
    }
  };

  if (loading) return <div className="container py-20 flex justify-center"><div className="spinner border-primary-600"></div></div>;
  if (!order) return <div className="container py-20 text-center"><h2 className="text-2xl font-bold">Không tìm thấy đơn hàng</h2></div>;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Đơn hàng #{order.orderNumber}</h1>
      <p className="text-gray-600 mb-8">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-bold text-xl mb-4">Sản phẩm</h3>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-4 mb-4 pb-4 border-b last:border-0">
                {item.image && <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600">Số lượng: {item.quantity}</div>
                  
                  {/* Review button for delivered orders */}
                  {order.orderStatus === 'DELIVERED' && (
                    <button
                      onClick={() => setReviewProduct({ 
                        ...item, 
                        _id: typeof item.productId === 'object' ? item.productId._id : item.productId 
                      })}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <FiStar size={14} />
                      Đánh giá sản phẩm
                    </button>
                  )}
                </div>
                <div className="font-bold text-primary-600">{(item.price * item.quantity).toLocaleString()} ₫</div>
              </div>
            ))}
          </div>
          <div className="card p-6">
            <h3 className="font-bold text-xl mb-4">Địa chỉ giao hàng</h3>
            <p className="mb-1">{order.shippingAddress.recipientName} - {order.shippingAddress.phone}</p>
            <p className="text-gray-600">{order.shippingAddress.street}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.city}</p>
          </div>
          {order.orderStatus === 'DELIVERED' && order.shipperId && (
            <form onSubmit={submitShipperReview} className="card p-6">
              <h3 className="font-bold text-xl mb-4">Đánh giá shipper</h3>
              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block font-medium">Số sao</label>
                  <select className="input w-full" value={shipperReview.rating} onChange={(e) => setShipperReview({ ...shipperReview, rating: Number(e.target.value) })}>
                    {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
                  </select>
                </div>
                <textarea className="input w-full" rows="3" placeholder="Nội dung đánh giá" value={shipperReview.content} onChange={(e) => setShipperReview({ ...shipperReview, content: e.target.value })} maxLength={1000} />
                <ImagePasteInput
                  title="Ảnh đánh giá shipper"
                  files={shipperReviewFiles}
                  onFilesChange={setShipperReviewFiles}
                  urls={shipperReview.images}
                  onUrlsChange={(value) => setShipperReview({ ...shipperReview, images: value })}
                  urlPlaceholder="Mỗi link một dòng"
                />
                <button type="submit" disabled={reviewingShipper} className="btn-primary w-fit px-5 py-2">
                  {reviewingShipper ? 'Đang gửi...' : 'Gửi đánh giá shipper'}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="card p-6 h-fit">
          <h3 className="font-bold text-xl mb-4">Thông tin thanh toán</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Tạm tính:</span><span>{order.totals.subtotal.toLocaleString()} ₫</span></div>
            <div className="flex justify-between"><span>Phí vận chuyển:</span><span>{order.totals.shipping.toLocaleString()} ₫</span></div>
            {order.totals.discount > 0 && <div className="flex justify-between text-red-600"><span>Giảm giá:</span><span>-{order.totals.discount.toLocaleString()} ₫</span></div>}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Tổng:</span>
              <span className="text-primary-600">{order.totals.grandTotal.toLocaleString()} ₫</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">Phương thức thanh toán</div>
            <div className="font-medium">{order.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}</div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600 mb-2">Trạng thái</div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          {canRequestReturn() && (
            <button
              type="button"
              onClick={() => setShowReturnModal(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700"
            >
              <FiRefreshCw /> Yêu cầu trả hàng
            </button>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewProduct && (
        <ReviewModal
          product={reviewProduct}
          orderId={order._id}
          onClose={() => setReviewProduct(null)}
          onSuccess={() => {
            setReviewProduct(null);
            fetchOrder();
          }}
        />
      )}

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={submitReturnRequest} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Yêu cầu trả hàng</h2>
              <button type="button" onClick={() => setShowReturnModal(false)} className="rounded p-2 hover:bg-gray-100">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-medium">Lý do</label>
                <select value={returnForm.returnReason} onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })} className="input w-full">
                  <option value="defective">Sản phẩm lỗi</option>
                  <option value="wrong_item">Giao sai sản phẩm</option>
                  <option value="not_as_described">Không đúng mô tả</option>
                  <option value="damaged">Hư hỏng khi nhận</option>
                  <option value="wrong_size">Sai kích cỡ</option>
                  <option value="changed_mind">Đổi ý</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block font-medium">Mô tả chi tiết *</label>
                <textarea className="input w-full" rows="4" value={returnForm.description} onChange={(e) => setReturnForm({ ...returnForm, description: e.target.value })} maxLength={2000} required />
              </div>
              <ImagePasteInput
                title="Ảnh minh chứng"
                files={returnFiles}
                onFilesChange={setReturnFiles}
                urls={returnForm.images}
                onUrlsChange={(value) => setReturnForm({ ...returnForm, images: value })}
                capture="environment"
                urlPlaceholder="Mỗi link một dòng"
              />
              <div className="hidden">
                <label className="mb-2 block font-medium">Link hình ảnh minh chứng</label>
                <textarea className="input w-full" rows="3" placeholder="Mỗi link một dòng" value={returnForm.images} onChange={(e) => setReturnForm({ ...returnForm, images: e.target.value })} />
              </div>
              <div className="hidden">
                <label className="mb-2 block font-medium">
                  Ảnh sản phẩm thực tế {['defective', 'wrong_item', 'not_as_described', 'damaged'].includes(returnForm.returnReason) ? '*' : ''}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => setReturnFiles(Array.from(e.target.files || []))}
                  className="input w-full"
                />
                {returnFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {returnFiles.map((file, index) => (
                      <img
                        key={`${file.name}-${index}`}
                        src={URL.createObjectURL(file)}
                        alt={`Ảnh minh chứng ${index + 1}`}
                        className="h-20 w-full rounded border object-cover"
                      />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Với hàng lỗi, hư hỏng, sai/mất mô tả hoặc giao sai sản phẩm, cần ít nhất 1 ảnh minh chứng.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowReturnModal(false)} className="btn-secondary px-4 py-2">Hủy</button>
              <button type="submit" disabled={returnLoading} className="btn-primary px-4 py-2">
                {returnLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
