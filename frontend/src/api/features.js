import apiClient from './client';

// Note: apiClient.baseURL already includes /api
export const categoryAPI = {
  getAll: (flat) => apiClient.get('/categories', { params: { flat } }),
  getBySlug: (slug, params) => apiClient.get(`/categories/${slug}`, { params }),
};

export const returnAPI = {
  create: (data) => apiClient.post('/returns', data),
  getMyReturns: (params) => apiClient.get('/returns/my-returns', { params }),
  getDetail: (id) => apiClient.get(`/returns/${id}`),
};

export const flashSaleAPI = {
  getAll: () => apiClient.get('/flash-sales'),
  getById: (id) => apiClient.get(`/flash-sales/${id}`),
};

export const blogAPI = {
  getPosts: (params) => apiClient.get('/blog', { params }),
  getBySlug: (slug) => apiClient.get(`/blog/${slug}`),
};

export const loyaltyAPI = {
  getMyPoints: () => apiClient.get('/loyalty/my-points'),
  getRoleScores: () => apiClient.get('/loyalty/role-scores'),
  getHistory: (params) => apiClient.get('/loyalty/history', { params }),
  redeem: (data) => apiClient.post('/loyalty/redeem', data),
  getTiers: () => apiClient.get('/loyalty/tiers'),
};

export const gameAPI = {
  getLuckyWheelRewards: () => apiClient.get('/games/lucky-wheel/rewards'),
  playLuckyWheel: () => apiClient.post('/games/lucky-wheel/play'),
  getMyVouchers: () => apiClient.get('/games/my-vouchers'),
};

export const questionAPI = {
  getByProduct: (productId, params) => apiClient.get(`/questions/product/${productId}`, { params }),
  ask: (productId, data) => apiClient.post(`/questions/product/${productId}`, data),
  answer: (questionId, data) => apiClient.post(`/questions/${questionId}/answer`, data),
};

export const compareAPI = {
  compare: (ids) => apiClient.get('/products/compare', { params: { ids: ids.join(',') } }),
};

export const shopAPI = {
  search: (params) => apiClient.get('/shop', { params }),
  getBySlug: (slug, params) => apiClient.get(`/shop/${slug}/products`, { params }),
  getById: (id) => apiClient.get(`/shop/${id}`),
  getProducts: (id, params) => apiClient.get(`/shop/${id}/products`, { params }),
};

export const similarAPI = {
  get: (productId) => apiClient.get(`/products/${productId}/similar`),
};
