import apiClient from './client';

// Customer endpoints
export const getMessages = (params) => apiClient.get('/messages', { params });

export const createMessage = (data) => apiClient.post('/messages', data);

export const getMessage = (id) => apiClient.get(`/messages/${id}`);

export const deleteMessage = (id) => apiClient.delete(`/messages/${id}`);

// Seller endpoints
export const getSellerMessages = (params) => apiClient.get('/messages/seller', { params });

// Admin endpoints
export const getAdminMessages = (params) => apiClient.get('/messages/admin', { params });

// Reply to message
export const replyToMessage = (id, data) => apiClient.post(`/messages/${id}/reply`, data);

// Update message status
export const updateMessageStatus = (id, status) => apiClient.patch(`/messages/${id}/status`, { status });

// Get message statistics
export const getMessageStats = () => apiClient.get('/messages/stats');

export default {
  getMessages,
  createMessage,
  getMessage,
  deleteMessage,
  getSellerMessages,
  getAdminMessages,
  replyToMessage,
  updateMessageStatus,
  getMessageStats,
};
