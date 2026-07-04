import apiClient from './client';

// Create review
export const createReview = (data) => 
  apiClient.post('/reviews', data);

// Get product reviews
export const getProductReviews = (productId, params) => 
  apiClient.get(`/reviews/product/${productId}`, { params });

// Update review
export const updateReview = (id, data) => 
  apiClient.put(`/reviews/${id}`, data);

// Delete review
export const deleteReview = (id) => 
  apiClient.delete(`/reviews/${id}`);

// Mark review as helpful
export const markHelpful = (id) => 
  apiClient.post(`/reviews/${id}/helpful`);

// Seller respond to review
export const respondToReview = (id, data) => 
  apiClient.post(`/reviews/${id}/respond`, data);

export default {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful,
  respondToReview
};
