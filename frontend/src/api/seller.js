import apiClient from './client';

// Shop Management
export const getShop = () => apiClient.get('/seller/shop');

export const createShop = (data) => apiClient.post('/seller/shop', data);

export const updateShop = (data) => apiClient.put('/seller/shop/update', data);

// Dashboard
export const getDashboardStats = () => apiClient.get('/seller/dashboard');

// Products
export const getSellerProducts = (params) => apiClient.get('/seller/products', { params });

export const createProduct = (data) => apiClient.post('/seller/products', data);

export const updateProduct = (id, data) => apiClient.put(`/seller/products/${id}`, data);

export const deleteProduct = (id) => apiClient.delete(`/seller/products/${id}`);

// Orders
export const getSellerOrders = (params) => apiClient.get('/seller/orders', { params });

export const updateOrderStatus = (id, data) => 
  apiClient.patch(`/seller/orders/${id}/status`, data);

export const generateShippingLabel = (id) => 
  apiClient.post(`/seller/orders/${id}/shipping-label`);

// Reports
export const getReports = () => apiClient.get('/seller/reports');

export const getSalesReport = (params) => 
  apiClient.get('/seller/reports/sales', { params });

export const getBestSellers = (params) => 
  apiClient.get('/seller/reports/best-sellers', { params });

// Messages
export const getMessages = (params) => apiClient.get('/seller/messages', { params });

export const replyToMessage = (id, data) => 
  apiClient.post(`/seller/messages/${id}/reply`, data);

// Inventory
export const getInventoryAlerts = (params) => 
  apiClient.get('/seller/inventory/alerts', { params });

export default {
  getShop,
  createShop,
  updateShop,
  getDashboardStats,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  updateOrderStatus,
  generateShippingLabel,
  getReports,
  getSalesReport,
  getBestSellers,
  getMessages,
  replyToMessage,
  getInventoryAlerts,
};
