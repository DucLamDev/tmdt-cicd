import { useCallback, useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiFilter } from 'react-icons/fi';
import * as sellerAPI from '../../api/seller';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sellerAPI.getMessages({
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setMessages(response.data.messages);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Không thể tải tin nhắn');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useRealtimeRefresh(['message:new', 'message:reply'], fetchMessages, 10000);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !selectedMessage) return;

    try {
      await sellerAPI.replyToMessage(selectedMessage._id, { reply });
      toast.success('Đã gửi trả lời');
      setReply('');
      fetchMessages();
      setSelectedMessage(null);
    } catch (error) {
      toast.error('Không thể gửi trả lời');
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: 'bg-yellow-100 text-yellow-700',
      replied: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      pending: 'Chờ trả lời',
      replied: 'Đã trả lời',
      resolved: 'Đã giải quyết',
      closed: 'Đã đóng',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tin nhắn & Câu hỏi</h1>
          <p className="text-gray-600">Quản lý câu hỏi từ khách hàng</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <FiFilter className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input flex-1 max-w-xs"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ trả lời</option>
            <option value="replied">Đã trả lời</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="closed">Đã đóng</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 space-y-3">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div
                key={msg._id}
                onClick={() => setSelectedMessage(msg)}
                className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedMessage?._id === msg._id ? 'border-2 border-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="text-primary-600" />
                    <span className="font-medium">{msg.customerId?.name || 'Khách hàng'}</span>
                  </div>
                  {getStatusBadge(msg.status)}
                </div>
                <div className="text-sm font-medium mb-1">{msg.subject}</div>
                <div className="text-xs text-gray-600 line-clamp-2">{msg.content}</div>
                {msg.productId && (
                  <div className="text-xs text-primary-600 mt-2">
                    SP: {msg.productId.title}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(msg.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
            ))
          ) : (
            <div className="card p-8 text-center text-gray-500">
              Không có tin nhắn nào
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="btn-outline px-3 py-1 text-sm"
              >
                Trước
              </button>
              <span className="px-3 py-1">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="btn-outline px-3 py-1 text-sm"
              >
                Sau
              </button>
            </div>
          )}
        </div>

        {/* Message Detail & Reply */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="card p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{selectedMessage.subject}</h3>
                  {getStatusBadge(selectedMessage.status)}
                </div>
                
                {/* Customer Info */}
                <div className="flex items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-bold">
                      {selectedMessage.customerId?.name?.charAt(0) || 'K'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{selectedMessage.customerId?.name}</div>
                    <div className="text-sm text-gray-600">{selectedMessage.customerId?.email}</div>
                  </div>
                </div>

                {/* Product Info */}
                {selectedMessage.productId && (
                  <div className="flex items-center gap-3 mb-4 p-4 bg-blue-50 rounded-lg">
                    <img
                      src={selectedMessage.productId.images?.[0] || '/placeholder.png'}
                      alt={selectedMessage.productId.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <div className="text-sm text-gray-600">Sản phẩm:</div>
                      <div className="font-medium">{selectedMessage.productId.title}</div>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Nội dung:</div>
                  <div className="p-4 bg-gray-50 rounded-lg">{selectedMessage.content}</div>
                </div>

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">Các trả lời:</div>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((r, idx) => (
                        <div key={idx} className="p-4 bg-green-50 rounded-lg">
                          <div className="font-medium text-sm mb-1">Bạn đã trả lời:</div>
                          <div>{r.content}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(r.repliedAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReply}>
                <label className="block text-sm font-medium mb-2">Trả lời khách hàng</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows="4"
                  className="input w-full mb-3"
                  placeholder="Nhập nội dung trả lời..."
                  required
                />
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <FiSend />
                  Gửi trả lời
                </button>
              </form>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <FiMessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Chọn một tin nhắn để xem chi tiết và trả lời</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
