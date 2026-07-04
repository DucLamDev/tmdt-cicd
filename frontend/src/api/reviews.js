import api from './client';

export const reviewAPI = {
  // Get reviews for a product
  getProductReviews: (productId, params) => 
    api.get(`/reviews/product/${productId}`, { params }),
  
  // Create review
  createReview: (reviewData) => 
    api.post('/reviews', reviewData),
  
  // Update review
  updateReview: (reviewId, reviewData) => 
    api.put(`/reviews/${reviewId}`, reviewData),
  
  // Delete review
  deleteReview: (reviewId) => 
    api.delete(`/reviews/${reviewId}`),
  
  // Get user's reviews
  getMyReviews: (params) => 
    api.get('/reviews/my-reviews', { params }),
  
  // Mark review as helpful
  markHelpful: (reviewId) => 
    api.post(`/reviews/${reviewId}/helpful`),
  
  // Check if user can review product
  canReviewProduct: (productId) =>
    api.get(`/reviews/product/${productId}/can-review`)
};

export const shipperReviewAPI = {
  create: (data) => api.post('/shipper-reviews', data),
  summary: (shipperId) => api.get(`/shipper-reviews/shipper/${shipperId}/summary`),
};

export default reviewAPI;
