import api from './client';

export const adminAPI = {
  // Dashboard stats
  getDashboardStats: (params) => 
    api.get('/admin/stats', { params }),

  getAITrends: () =>
    api.get('/admin/ai/trends'),

  askAI: (data) =>
    api.post('/admin/ai/ask', data),
  
  // Users
  getUsers: (params) => 
    api.get('/admin/users', { params }),
  
  getPendingApprovals: (params) => 
    api.get('/admin/pending-approvals', { params }),
  
  approveUser: (userId, approvalData) => 
    api.patch(`/admin/users/${userId}/approval`, approvalData),
  
  toggleUserLock: (userId, data = {}) => 
    api.patch(`/admin/users/${userId}/lock`, data),

  issueQualityWarning: (userId, data = {}) =>
    api.patch(`/admin/users/${userId}/quality-warning`, data),

  changeUserPassword: (userId, data) =>
    api.patch(`/admin/users/${userId}/password`, data),

  impersonateUser: (userId, data) =>
    api.post(`/admin/users/${userId}/impersonate`, data),
  
  deleteUser: (userId, data = {}) => 
    api.delete(`/admin/users/${userId}`, { data }),
  
  // Products
  getProducts: (params) => 
    api.get('/admin/products', { params }),
  
  approveProduct: (productId, approvalData) => 
    api.patch(`/admin/products/${productId}/approve`, approvalData),
  
  deleteProduct: (productId) => 
    api.delete(`/admin/products/${productId}`),
  
  // Orders
  getOrders: (params) => 
    api.get('/admin/orders', { params }),
  
  // Promotions/Coupons
  getPromotions: (params) => 
    api.get('/admin/promotions', { params }),
  
  createPromotion: (promotionData) => 
    api.post('/admin/promotions', promotionData),
  
  updatePromotion: (promotionId, promotionData) => 
    api.put(`/admin/promotions/${promotionId}`, promotionData),
  
  deletePromotion: (promotionId) => 
    api.delete(`/admin/promotions/${promotionId}`),
  
  // Reports
  getRevenueReport: (params) => 
    api.get('/admin/reports/revenue', { params }),

  getQualityScores: () =>
    api.get('/admin/reports/quality-scores'),
  
  exportSystemReport: (params) => 
    api.get('/admin/reports/export', { params, responseType: 'blob' })
};

export default adminAPI;
