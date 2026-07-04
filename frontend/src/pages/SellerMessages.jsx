import { useState, useEffect } from 'react';
import { MessageCircle, Eye } from 'lucide-react';
import { getSellerMessages, getMessageStats } from '../api/messages';
import MessageThread from '../components/MessageThread';

const SellerMessages = () => {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [currentPage, statusFilter]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const response = await getSellerMessages(params);
      setMessages(response.data?.messages || []);
      setPagination(response.data?.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getMessageStats();
      setStats(response.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-800' },
      replied: { label: 'Đã phản hồi', className: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Đã giải quyết', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Đã đóng', className: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            Tin nhắn khách hàng
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Tổng số</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Chờ xử lý</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Đã phản hồi</p>
            <p className="text-2xl font-bold text-blue-600">{stats.replied || 0}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Chưa đọc</p>
            <p className="text-2xl font-bold text-red-600">{stats.unread || 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Chờ xử lý
          </button>
          <button
            onClick={() => setStatusFilter('replied')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'replied' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Đã phản hồi
          </button>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có tin nhắn</h3>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div key={message._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{message.subject}</h3>
                        {getStatusBadge(message.status)}
                        {!message.isRead && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Từ: {message.customerId?.name || 'Khách hàng'}</span>
                        <span>•</span>
                        <span>{new Date(message.createdAt).toLocaleDateString('vi-VN')}</span>
                        {message.replies?.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{message.replies.length} phản hồi</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMessage(message)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-4"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}

        {/* Message Thread Modal */}
        {selectedMessage && (
          <MessageThread
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
            onUpdate={(updatedMessage) => {
              setSelectedMessage(updatedMessage);
              fetchMessages();
              fetchStats();
            }}
            userRole="seller"
          />
        )}
      </div>
    </div>
  );
};

export default SellerMessages;
