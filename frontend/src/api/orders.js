import apiClient from './client';

export const ordersAPI = {
  createOrder: (data) => apiClient.post('/orders', data),
  getUserOrders: (params) => apiClient.get('/orders', { params }),
  getOrder: (id) => apiClient.get(`/orders/${id}`),
  cancelOrder: (id, data) => apiClient.patch(`/orders/${id}/cancel`, data),
  
  // Seller
  getSellerOrders: (params) => apiClient.get('/seller/orders', { params }),
  updateOrderStatus: (id, data) => apiClient.patch(`/seller/orders/${id}/status`, data),
  
  // Shipper
  getShipperAssignments: (params) => apiClient.get('/shipper/assignments', { params }),
  updateShipperStatus: (id, data) => apiClient.patch(`/shipper/orders/${id}/status`, data),
};
