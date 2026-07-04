import apiClient from './client';

// Validate coupon
export const validateCoupon = (data) => 
  apiClient.post('/coupons/validate', data);

// Get available coupons (public)
export const getAvailableCoupons = (params) => 
  apiClient.get('/coupons/available', { params });

// Admin routes
export const createCoupon = (data) => 
  apiClient.post('/coupons', data);

export const getCoupons = (params) => 
  apiClient.get('/coupons', { params });

export const getCoupon = (id) => 
  apiClient.get(`/coupons/${id}`);

export const updateCoupon = (id, data) => 
  apiClient.put(`/coupons/${id}`, data);

export const deleteCoupon = (id) => 
  apiClient.delete(`/coupons/${id}`);

export default {
  validateCoupon,
  getAvailableCoupons,
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon
};
