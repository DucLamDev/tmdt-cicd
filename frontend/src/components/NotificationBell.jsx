import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck, FiCheckCircle, FiPackage, FiTag, FiMessageCircle, FiInfo } from 'react-icons/fi';
import { notificationAPI } from '../api/notifications';
import { createRealtimeSource } from '../api/realtime';

const typeIcons = {
  order: FiPackage,
  promotion: FiTag,
  message: FiMessageCircle,
  payment: FiCheckCircle,
  system: FiInfo,
};

const typeColors = {
  order: 'text-blue-500',
  promotion: 'text-orange-500',
  message: 'text-green-500',
  payment: 'text-purple-500',
  system: 'text-gray-500',
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const source = createRealtimeSource();
    if (!source) return undefined;

    const handleNewNotification = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload.notification) return;
        setNotifications((prev) => {
          const exists = prev.some((item) => item._id === payload.notification._id);
          return exists ? prev : [payload.notification, ...prev].slice(0, 10);
        });
      } catch {
        fetchUnreadCount();
      }
    };

    const handleCountUpdate = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.delta === 'number') {
          setUnreadCount((prev) => Math.max(0, prev + payload.delta));
        } else {
          fetchUnreadCount();
        }
      } catch {
        fetchUnreadCount();
      }
    };

    const handleRead = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.all) {
          setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
          setUnreadCount(0);
          return;
        }
        if (payload.notificationId) {
          setNotifications((prev) => prev.map((item) => (
            item._id === payload.notificationId ? { ...item, isRead: true } : item
          )));
        }
      } catch {
        fetchUnreadCount();
      }
    };

    const handleDeleted = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setNotifications((prev) => prev.filter((item) => item._id !== payload.notificationId));
      } catch {
        fetchNotifications();
      }
    };

    source.addEventListener('notification:new', handleNewNotification);
    source.addEventListener('notification:count:update', handleCountUpdate);
    source.addEventListener('notification:count:refresh', fetchUnreadCount);
    source.addEventListener('notification:read', handleRead);
    source.addEventListener('notification:deleted', handleDeleted);

    return () => {
      source.removeEventListener('notification:new', handleNewNotification);
      source.removeEventListener('notification:count:update', handleCountUpdate);
      source.removeEventListener('notification:count:refresh', fetchUnreadCount);
      source.removeEventListener('notification:read', handleRead);
      source.removeEventListener('notification:deleted', handleDeleted);
      source.close();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      // Silently fail
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications({ limit: 10 });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
        aria-label="Thông báo"
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <FiCheck className="w-3 h-3" />
                Đánh dấu đọc tất cả
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner border-primary-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || FiInfo;
                const colorClass = typeColors[notification.type] || 'text-gray-500';

                const content = (
                  <div
                    key={notification._id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b last:border-b-0 ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                  >
                    <div className={`mt-1 flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                // Wrap with Link if actionUrl exists
                if (notification.actionUrl) {
                  return (
                    <Link
                      key={notification._id}
                      to={notification.actionUrl}
                      onClick={() => {
                        setIsOpen(false);
                        if (!notification.isRead) handleMarkAsRead(notification._id);
                      }}
                    >
                      {content}
                    </Link>
                  );
                }

                return content;
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t bg-gray-50">
              <Link
                to="/notifications"
                className="block text-center py-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Xem tất cả thông báo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
