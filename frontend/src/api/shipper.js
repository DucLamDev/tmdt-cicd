import apiClient from './client';

// Dashboard
export const getDashboardStats = () => apiClient.get('/shipper/dashboard');

// Orders
export const getAvailableOrders = (params) => 
  apiClient.get('/shipper/available-orders', { params });

export const getMyOrders = (params) => 
  apiClient.get('/shipper/orders', { params });

export const getAssignments = (params) => 
  apiClient.get('/shipper/assignments', { params });

// Order Actions
export const pickupOrder = (id, data) => 
  apiClient.post(`/shipper/orders/${id}/pickup`, data);

export const confirmPickup = (id, data) => 
  apiClient.patch(`/shipper/orders/${id}/confirm-pickup`, data);

export const updateToInTransit = (id, data) => 
  apiClient.patch(`/shipper/orders/${id}/in-transit`, data);

export const deliverOrder = (id, data) => 
  apiClient.post(`/shipper/orders/${id}/deliver`, data);

export const failDelivery = (id, data) => 
  apiClient.post(`/shipper/orders/${id}/fail`, data);

export const updateOrderStatus = (id, data) => 
  apiClient.patch(`/shipper/orders/${id}/status`, data);

// History
export const getDeliveryHistory = (params) => 
  apiClient.get('/shipper/history', { params });

// COD Management
export const getCODTransactions = (params) => 
  apiClient.get('/shipper/cod-transactions', { params });

export const remitCOD = (data) => 
  apiClient.post('/shipper/cod/remit', data);

export default {
  getDashboardStats,
  getAvailableOrders,
  getMyOrders,
  getAssignments,
  pickupOrder,
  confirmPickup,
  updateToInTransit,
  deliverOrder,
  failDelivery,
  updateOrderStatus,
  getDeliveryHistory,
  getCODTransactions,
  remitCOD,
};
