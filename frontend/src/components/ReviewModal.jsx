import { useState } from 'react';
import { FiX, FiStar } from 'react-icons/fi';
import { reviewAPI } from '../api/reviews';
import toast from 'react-hot-toast';

const ReviewModal = ({ product, orderId, onClose, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    try {
      setLoading(true);
      await reviewAPI.createReview({
        productId: product._id,
        orderId,
        rating,
        title,
        text
      });

      toast.success('Đánh giá thành công!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đánh giá sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Đánh giá sản phẩm</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Product Info */}
        <div className="p-6 border-b">
          <div className="flex gap-4">
            <img
              src={product.image || '/placeholder.png'}
              alt={product.title}
              className="w-20 h-20 object-cover rounded"
            />
            <div>
              <h3 className="font-medium">{product.title}</h3>
              <p className="text-sm text-gray-600">Số lượng: {product.quantity}</p>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block font-medium mb-2">Đánh giá của bạn *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <FiStar
                    size={32}
                    fill={(hoveredRating || rating) >= star ? '#FFC107' : 'none'}
                    stroke={(hoveredRating || rating) >= star ? '#FFC107' : '#CBD5E0'}
                    strokeWidth={2}
                  />
                </button>
              ))}
              <span className="ml-2 text-lg">
                {rating === 1 && 'Rất tệ'}
                {rating === 2 && 'Tệ'}
                {rating === 3 && 'Bình thường'}
                {rating === 4 && 'Tốt'}
                {rating === 5 && 'Rất tốt'}
              </span>
            </div>
          </div>

          {/* Title (Optional) */}
          <div>
            <label className="block font-medium mb-2">Tiêu đề (tùy chọn)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tóm tắt đánh giá của bạn"
              className="input w-full"
              maxLength={200}
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="block font-medium mb-2">Nội dung đánh giá *</label>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              className="input w-full"
              rows="5"
              maxLength={2000}
            />
            <p className="text-sm text-gray-500 mt-1">{text.length}/2000 ký tự</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6 py-2"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 py-2"
            >
              {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
