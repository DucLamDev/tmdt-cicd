import api from './client';

export const notificationAPI = {
  // Get user notifications
  getNotifications: (params) =>
    api.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  getNavigationBadges: () =>
    api.get('/notifications/navigation-badges'),

  // Mark one notification as read
  markAsRead: (id) =>
    api.patch(`/notifications/${id}/read`),

  // Mark all notifications as read
  markAllAsRead: () =>
    api.patch('/notifications/read-all'),

  // Delete notification
  deleteNotification: (id) =>
    api.delete(`/notifications/${id}`),

  // Admin: Create notification
  createNotification: (data) =>
    api.post('/notifications', data),

  // Admin: Broadcast notification
  broadcastNotification: (data) =>
    api.post('/notifications/broadcast', data),
};

export default notificationAPI;
