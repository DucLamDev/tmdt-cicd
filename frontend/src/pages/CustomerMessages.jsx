import { useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Plus, Trash2, Eye, Send } from 'lucide-react';
import { getMessages, createMessage, deleteMessage } from '../api/messages';
import { shopAPI } from '../api/features';
import MessageThread from '../components/MessageThread';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';

const CustomerMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [error, setError] = useState('');
  const [shops, setShops] = useState([]);
  const [shopSearch, setShopSearch] = useState('');
  const [searchParams] = useSearchParams();
  const shopIdFromProduct = searchParams.get('shopId') || '';
  const productIdFromProduct = searchParams.get('productId') || '';
  const shopNameFromProduct = searchParams.get('shopName') || '';

  // New message form
  const [formData, setFormData] = useState({
    sellerId: '',
    shopName: '',
    recipient: 'seller',
    subject: '',
    content: '',
    type: 'question'
  });

  useEffect(() => {
    if (shopIdFromProduct) {
      setFormData((current) => ({
        ...current,
        sellerId: shopIdFromProduct,
        shopName: shopNameFromProduct || '',
        productId: productIdFromProduct,
        recipient: 'seller',
        subject: current.subject || `Tư vấn sản phẩm từ ${shopNameFromProduct || 'shop'}`,
        type: 'product_inquiry'
      }));
      setShowNewMessage(true);
    }
  }, [shopIdFromProduct, productIdFromProduct, shopNameFromProduct]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage, limit: 10 };
      if (statusFilter) params.status = statusFilter;

      const response = await getMessages(params);
      setMessages(response.data?.messages || []);
      setPagination(response.data?.pagination || {});
    } catch (err) {
      setError('Không thể tải danh sách tin nhắn');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useRealtimeRefresh(['message:new', 'message:reply'], fetchMessages, 10000);

  useEffect(() => {
    if (!showNewMessage || formData.recipient !== 'seller' || shopIdFromProduct) return;

    const timeout = setTimeout(async () => {
      try {
        const response = await shopAPI.search({ search: shopSearch, limit: 30 });
        setShops(response.data?.shops || []);
      } catch {
        setShops([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [formData.recipient, shopIdFromProduct, shopSearch, showNewMessage]);

  const handleCreateMessage = async (e) => {
    e.preventDefault();
    setError('');

    if ((formData.recipient === 'seller' && !formData.sellerId) || !formData.subject || !formData.content) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (false && formData.recipient === 'seller' && !shopIdFromProduct) {
      setError('Vui lòng mở sản phẩm và bấm "Chat với shop" để hệ thống tự chọn shop');
      return;
    }

    try {
      await createMessage(formData.recipient === 'admin' ? { ...formData, sellerId: '', shopName: '' } : formData);
      setShowNewMessage(false);
      setFormData({ sellerId: '', shopName: '', recipient: 'seller', subject: '', content: '', type: 'question' });
      setShopSearch('');
      fetchMessages();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi tin nhắn');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

    try {
      await deleteMessage(id);
      fetchMessages();
    } catch (err) {
      setError('Không thể xóa tin nhắn');
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
            Tin nhắn của tôi
          </h1>
          <p className="text-gray-600 mt-2">Quản lý tin nhắn với người bán</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === '' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'pending' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Chờ xử lý
            </button>
            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'replied' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Đã phản hồi
            </button>
          </div>

          <button
            onClick={() => setShowNewMessage(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tin nhắn mới
          </button>
        </div>

        {/* Messages List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Đang tải...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có tin nhắn</h3>
            <p className="text-gray-600 mb-6">Bạn chưa có tin nhắn nào với người bán</p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Gửi tin nhắn đầu tiên
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {message.subject}
                        </h3>
                        {getStatusBadge(message.status)}
                        {!message.isRead && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Đến: {message.recipientRole === 'admin' ? 'Admin' : (message.sellerId?.shopName || 'Shop')}</span>
                        <span>•</span>
                        <span>{new Date(message.createdAt).toLocaleDateString('vi-VN')}</span>
                        {message.replies?.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {message.replies.length} phản hồi
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedMessage(message)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(message._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
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
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}

        {/* New Message Modal */}
        {showNewMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tin nhắn mới</h2>
              <form onSubmit={handleCreateMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Người nhận *
                  </label>
                  <select
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="seller">Shop / người bán</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.recipient === 'seller' && shopIdFromProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shop
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-700">
                      {shopNameFromProduct || formData.sellerId}
                    </div>
                  </div>
                )}

                {formData.recipient === 'seller' && !shopIdFromProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn shop *
                    </label>
                    <input
                      type="text"
                      value={shopSearch}
                      onChange={(e) => {
                        setShopSearch(e.target.value);
                        setFormData({ ...formData, sellerId: '', shopName: '' });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tìm theo tên shop"
                    />
                    <select
                      value={formData.sellerId}
                      onChange={(e) => {
                        const shop = shops.find((item) => item._id === e.target.value);
                        setFormData({ ...formData, sellerId: e.target.value, shopName: shop?.shopName || '' });
                      }}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Chọn shop nhận tin</option>
                      {shops.map((shop) => (
                        <option key={shop._id} value={shop._id}>
                          {shop.shopName}{shop.ratingCount ? ` - ${Number(shop.ratingAvg || 0).toFixed(1)} sao` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại tin nhắn
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="question">Câu hỏi</option>
                    <option value="complaint">Khiếu nại</option>
                    <option value="general">Chung</option>
                    <option value="product_inquiry">Hỏi về sản phẩm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tiêu đề"
                    required
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Nhập nội dung tin nhắn..."
                    required
                    maxLength={2000}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.content.length}/2000 ký tự
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewMessage(false);
                      setFormData({ sellerId: '', shopName: '', recipient: 'seller', subject: '', content: '', type: 'question' });
                      setShopSearch('');
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Gửi tin nhắn
                  </button>
                </div>
              </form>
            </div>
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
            }}
            userRole="customer"
          />
        )}
      </div>
    </div>
  );
};

export default CustomerMessages;
