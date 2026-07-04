import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, MessageCircle, Send, X } from 'lucide-react';
import { replyToMessage, updateMessageStatus } from '../api/messages';

const statusConfig = {
  pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-800' },
  replied: { label: 'Đã phản hồi', className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Đã giải quyết', className: 'bg-emerald-100 text-emerald-800' },
  closed: { label: 'Đã đóng', className: 'bg-gray-100 text-gray-700' }
};

const priorityConfig = {
  low: { label: 'Thấp', className: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Bình thường', className: 'bg-blue-100 text-blue-800' },
  high: { label: 'Cao', className: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-800' }
};

const typeLabel = {
  question: 'Câu hỏi',
  complaint: 'Khiếu nại',
  general: 'Chung',
  product_inquiry: 'Hỏi sản phẩm'
};

const getInitial = (name, fallback) => (name || fallback || '?').charAt(0).toUpperCase();

const hasRole = (user, role) => {
  if (!user) return false;
  if (Array.isArray(user.roles)) return user.roles.includes(role);
  return user.role === role;
};

const MessageThread = ({ message, onClose, onUpdate, userRole }) => {
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const canReply = ['customer', 'seller', 'admin'].includes(userRole);
  const canChangeStatus = ['seller', 'admin'].includes(userRole);
  const recipientName = message.recipientRole === 'admin'
    ? 'Admin'
    : (message.sellerId?.shopName || 'Shop');

  const chatItems = useMemo(() => {
    const original = {
      id: message._id,
      content: message.content,
      senderName: message.customerId?.name || 'Khách hàng',
      senderRole: 'customer',
      createdAt: message.createdAt,
      avatar: message.customerId?.avatarUrl
    };

    const replies = (message.replies || []).map((reply) => {
      let senderRole = 'seller';
      if (hasRole(reply.repliedBy, 'admin')) senderRole = 'admin';
      if (hasRole(reply.repliedBy, 'customer')) senderRole = 'customer';

      return {
        id: reply._id,
        content: reply.content,
        senderName: reply.repliedBy?.name || (senderRole === 'admin' ? 'Admin' : 'Shop'),
        senderRole,
        createdAt: reply.repliedAt,
        avatar: reply.repliedBy?.avatarUrl
      };
    });

    return [original, ...replies].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [message]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatItems.length, error]);

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const config = priorityConfig[priority] || priorityConfig.normal;
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  const isMine = (item) => {
    if (userRole === 'customer') return item.senderRole === 'customer';
    if (userRole === 'admin') return item.senderRole === 'admin';
    return item.senderRole === 'seller';
  };

  const handleReply = async (e) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      setError('Vui lòng nhập nội dung phản hồi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await replyToMessage(message._id, { content: replyContent.trim() });
      setReplyContent('');
      onUpdate(response.data || response);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    setLoading(true);
    setError('');

    try {
      const response = await updateMessageStatus(message._id, status);
      onUpdate(response.data || response);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[86vh] sm:rounded-2xl">
        <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{message.subject}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {getStatusBadge(message.status)}
                  {getPriorityBadge(message.priority)}
                  <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
                    {typeLabel[message.type] || 'Tin nhắn'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              aria-label="Đóng hội thoại"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {message.productId && (
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <img
                src={message.productId.images?.[0] || '/placeholder.png'}
                alt={message.productId.title}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{message.productId.title}</p>
                <p className="text-xs text-gray-500">Đang trao đổi với {recipientName}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {chatItems.map((item) => {
              const mine = isMine(item);
              return (
                <div key={item.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    item.avatar ? (
                      <img src={item.avatar} alt={item.senderName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-gray-700">
                        {getInitial(item.senderName, item.senderRole)}
                      </div>
                    )
                  )}
                  <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`mb-1 text-xs ${mine ? 'text-right text-blue-700' : 'text-gray-500'}`}>
                      {item.senderName} · {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        mine
                          ? 'rounded-br-md bg-blue-600 text-white'
                          : 'rounded-bl-md bg-white text-gray-800 ring-1 ring-gray-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-6">{item.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-5">
          {canReply && message.status !== 'closed' && (
            <form onSubmit={handleReply} className="flex items-end gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows="1"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập tin nhắn..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !replyContent.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                aria-label="Gửi tin nhắn"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          )}

          {canChangeStatus && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs font-medium text-gray-500">Trạng thái:</span>
              {message.status !== 'replied' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('replied')}
                  disabled={loading}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  Đã phản hồi
                </button>
              )}
              {message.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Đã giải quyết
                </button>
              )}
              {message.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('closed')}
                  disabled={loading}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Đóng
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
