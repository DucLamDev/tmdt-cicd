const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const createRealtimeSource = () => {
  const token = localStorage.getItem('accessToken');
  if (!token || typeof EventSource === 'undefined') return null;
  return new EventSource(`${API_URL}/api/realtime/events?token=${encodeURIComponent(token)}`);
};
