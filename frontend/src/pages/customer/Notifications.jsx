import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiPackage, FiTag, FiMessageCircle, FiInfo } from 'react-icons/fi';
import { notificationAPI } from '../../api/notifications';
import toast from 'react-hot-toast';

const typeIcons = {
  order: FiPackage,
  promotion: FiTag,
  message: FiMessageCircle,
  payment: FiCheckCircle,
  system: FiInfo,
};

const typeColors = {
  order: 'bg-blue-100 text-blue-600',
  promotion: 'bg-orange-100 text-orange-600',
  message: 'bg-green-100 text-green-600',
  payment: 'bg-purple-100 text-purple-600',
  system: 'bg-gray-100 text-gray-600',
};

const typeLabels = {
  order: 'Đơn hàng',
  promotion: 'Khuyến mãi',
  message: 'Tin nhắn',
  payment: 'Thanh toán',
  system: 'Hệ thống',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filter === 'unread') params.unreadOnly = 'true';

      const response = await notificationAPI.getNotifications(params);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Đã xóa thông báo');
    } catch (error) {
      toast.error('Không thể xóa thông báo');
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FiBell className="w-7 h-7 text-primary-600" />
            <h1 className="text-3xl font-bold">Thông báo</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm rounded-full px-2 py-0.5 font-medium">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <FiCheck className="w-4 h-4" />
              Đánh dấu đọc tất cả
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => { setFilter('all'); setPage(1); }}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => { setFilter('unread'); setPage(1); }}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'unread'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FiBell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Không có thông báo nào</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'Bạn đã đọc hết thông báo!' : 'Thông báo mới sẽ xuất hiện ở đây'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || FiInfo;
              const colorClass = typeColors[notification.type] || 'bg-gray-100 text-gray-600';
              const label = typeLabels[notification.type] || 'Hệ thống';

              return (
                <div
                  key={notification._id}
                  className={`card p-4 flex items-start gap-4 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50 border-blue-100' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
                            {label}
                          </span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <h3 className={`mt-1 ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Action Link */}
                    {notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        className="inline-block mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                      >
                        Xem chi tiết →
                      </Link>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Đánh dấu đã đọc"
                      >
                        <FiCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Xóa thông báo"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={page === pagination.pages}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
