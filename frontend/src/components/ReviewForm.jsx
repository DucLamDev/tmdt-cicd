import { useState } from 'react';
import { Star } from 'lucide-react';
import { reviewAPI } from '../api/reviews';
import toast from 'react-hot-toast';

const ReviewForm = ({ productId, orderId, onSuccess }) => {
  const [formData, setFormData] = useState({
    productId,
    orderId,
    rating: 5,
    title: '',
    text: '',
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      toast.error('Vui lòng nhập nội dung đánh giá');
      return;
    }

    try {
      setLoading(true);
      await reviewAPI.createReview(formData);
      toast.success('Đánh giá của bạn đã được gửi thành công!');
      
      // Reset form
      setFormData({
        productId,
        orderId,
        rating: 5,
        title: '',
        text: '',
        images: []
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingClick = (rating) => {
    setFormData({ ...formData, rating });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4">Viết đánh giá của bạn</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Đánh giá của bạn *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    star <= (hoverRating || formData.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {formData.rating === 5 && 'Tuyệt vời'}
            {formData.rating === 4 && 'Tốt'}
            {formData.rating === 3 && 'Trung bình'}
            {formData.rating === 2 && 'Tệ'}
            {formData.rating === 1 && 'Rất tệ'}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tiêu đề (tùy chọn)
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tóm tắt đánh giá của bạn"
            maxLength={200}
          />
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nội dung đánh giá *
          </label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
            rows={5}
            maxLength={2000}
            required
          />
          <div className="text-sm text-gray-500 text-right mt-1">
            {formData.text.length}/2000
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setFormData({
                productId,
                orderId,
                rating: 5,
                title: '',
                text: '',
                images: []
              });
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
