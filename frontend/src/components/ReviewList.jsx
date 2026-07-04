import { useState, useEffect } from 'react';
import { reviewAPI } from '../api/reviews';
import { Star, ThumbsUp } from 'lucide-react';

const ReviewList = ({ productId, refreshTrigger }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Reset to page 1 when productId, filter, or refreshTrigger changes
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [productId, filter, refreshTrigger]);

  useEffect(() => {
    fetchReviews();
  }, [productId, pagination.page, filter, refreshTrigger]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 10
      };
      
      if (filter !== 'all') {
        params.rating = filter;
      }
      
      const response = await reviewAPI.getProductReviews(productId, params);
      
      // Note: apiClient interceptor already unwraps response.data, so response is already the data object
      // Response structure: { success: true, data: { reviews: [...], pagination: {...} } }
      const reviewsData = response?.data?.reviews || [];
      const paginationData = response?.data?.pagination || { page: 1, pages: 1, total: 0 };
      
      setReviews(reviewsData);
      setPagination(paginationData);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      console.error('Error response:', error.response?.data);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await reviewAPI.markHelpful(reviewId);
      fetchReviews();
    } catch (error) {
      console.error('Failed to mark helpful:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Đang tải đánh giá...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map((rating) => (
          <button
            key={rating}
            onClick={() => setFilter(rating)}
            className={`px-4 py-2 rounded-lg flex items-center gap-1 ${
              filter === rating
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {rating} <Star size={14} className="fill-current" />
          </button>
        ))}
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Chưa có đánh giá nào
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="border rounded-lg p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">
                    {review.userId?.name || 'Người dùng'}
                  </div>
                  {renderStars(review.rating)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <div className="font-medium">{review.title}</div>
              )}

              {/* Content */}
              <div className="text-gray-700">{review.text}</div>

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Review"
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                    />
                  ))}
                </div>
              )}

              {/* Verified Purchase */}
              {review.isVerifiedPurchase && (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Đã mua hàng
                </div>
              )}

              {/* Helpful */}
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleHelpful(review._id)}
                  className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                >
                  <ThumbsUp size={16} />
                  Hữu ích ({review.helpfulCount || 0})
                </button>
              </div>

              {/* Seller Response */}
              {review.sellerResponse && (
                <div className="bg-gray-50 rounded p-3 mt-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    Phản hồi từ người bán:
                  </div>
                  <div className="text-sm text-gray-600">
                    {review.sellerResponse.text}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(review.sellerResponse.respondedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination({ ...pagination, page })}
              className={`px-4 py-2 rounded ${
                page === pagination.page
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewList;
