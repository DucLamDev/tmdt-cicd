import api from './client';

const AI_TRYON_URL = import.meta.env.VITE_AI_TRYON_URL || 'http://localhost:8000';

export const tryonAPI = {
  virtualTryOn: async (userImage, productImage, productName = '', productCategory = 'clothing', tryOnContext = '') => {
    const formData = new FormData();
    formData.append('user_image', userImage);
    if (productImage instanceof File || productImage instanceof Blob) {
      formData.append('product_image', productImage);
    } else if (productImage) {
      formData.append('product_image_url', productImage);
    }
    formData.append('product_name', productName);
    formData.append('product_category', productCategory);
    formData.append('tryon_context', tryOnContext);

    return api.post('/ai/tryon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  analyzeOutfit: async (image, question = '') => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('question', question);

    const response = await fetch(`${AI_TRYON_URL}/api/analyze-outfit`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi phân tích outfit');
    }

    return response.json();
  },

  getSizeRecommendation: async (userImage, productName = '', sizes = 'S,M,L,XL,XXL') => {
    const formData = new FormData();
    formData.append('user_image', userImage);
    formData.append('product_name', productName);
    formData.append('product_sizes', sizes);

    const response = await fetch(`${AI_TRYON_URL}/api/size-recommend`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Lỗi gợi ý kích cỡ');
    }

    return response.json();
  },

  healthCheck: async () => {
    try {
      const response = await fetch(`${AI_TRYON_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
};

export default tryonAPI;
