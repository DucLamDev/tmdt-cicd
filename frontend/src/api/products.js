import apiClient from './client';

export const productsAPI = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProduct: (idOrSlug) => apiClient.get(`/products/${idOrSlug}`),
  getCategories: () => apiClient.get('/products/categories'),
  getBrands: () => apiClient.get('/products/brands'),
  
  // Seller
  getSellerProducts: (params) => apiClient.get('/seller/products', { params }),
  createProduct: (data) => apiClient.post('/seller/products', data),
  updateProduct: (id, data) => apiClient.put(`/seller/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/seller/products/${id}`),
};
