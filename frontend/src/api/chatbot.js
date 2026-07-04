import api from './client';

export const chatbotAPI = {
  // Send message to chatbot
  sendMessage: (messageData) => 
    api.post('/ai/chat', messageData),
  
  // Get conversation history
  getConversation: (sessionId) => 
    api.get(`/ai/conversations/${sessionId}`),
  
  // Clear conversation
  clearConversation: (sessionId) => 
    api.delete(`/ai/conversations/${sessionId}`),
  
  // Get recommendations
  getRecommendations: (params) => 
    api.get('/ai/recommendations', { params }),

  searchByVoice: (data) =>
    api.post('/ai/search/voice', data),

  searchByImage: (image, params) => {
    const formData = new FormData();
    formData.append('image', image);
    return api.post('/ai/search/image', formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default chatbotAPI;
