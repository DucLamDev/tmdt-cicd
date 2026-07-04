import { useState, useEffect, useRef } from 'react';
import {
  BadgePercent,
  Bot,
  CreditCard,
  Eye,
  Gift,
  Loader2,
  MessageCircle,
  PackageCheck,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../api/chatbot';
import useCartStore from '../store/cartStore';
import { getProductImage, handleProductImageError } from '../utils/productHelpers';

const starterPrompts = [
  { icon: Search, text: 'Tìm điện thoại dưới 10 triệu' },
  { icon: BadgePercent, text: 'Sản phẩm đang giảm giá' },
  { icon: PackageCheck, text: 'Tôi muốn kiểm tra đơn hàng' },
  { icon: CreditCard, text: 'Các phương thức thanh toán' }
];

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatbot_session_id');
    if (savedSessionId) setSessionId(savedSessionId);
  }, []);

  useEffect(() => {
    if (isOpen && sessionId && messages.length === 0) {
      loadConversation(sessionId);
    }
  }, [isOpen, sessionId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversation = async (sid) => {
    try {
      const response = await chatbotAPI.getConversation(sid);
      if (response.data?.messages) setMessages(response.data.messages);
    } catch {
      localStorage.removeItem('chatbot_session_id');
      setSessionId(null);
      setMessages([]);
    }
  };

  const submitMessage = async (message) => {
    const content = message.trim();
    if (!content || loading) return;

    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', content, timestamp: new Date() }]);

    try {
      setLoading(true);
      const response = await chatbotAPI.sendMessage({ message: content, sessionId });
      const newSessionId = response.data.sessionId;

      if (!sessionId) {
        setSessionId(newSessionId);
        localStorage.setItem('chatbot_session_id', newSessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.message,
          products: response.data.products || [],
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, trợ lý mua sắm đang gặp lỗi kết nối. Bạn thử lại sau nhé.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    submitMessage(inputMessage);
  };

  const handleClearChat = async () => {
    if (!sessionId || !confirm('Bạn có chắc muốn xóa lịch sử trò chuyện?')) return;
    try {
      await chatbotAPI.clearConversation(sessionId);
    } finally {
      setMessages([]);
      setSessionId(null);
      localStorage.removeItem('chatbot_session_id');
    }
  };

  const handleAddToCart = (product, event) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, 1);
  };

  const handleBuyNow = (product, event) => {
    event.preventDefault();
    event.stopPropagation();
    addItem(product, 1);
    navigate('/checkout');
    setIsOpen(false);
  };

  const handleViewDetail = (product, event) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(`/products/${product.slug || product._id}`);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="chatbot-launch-button fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-white shadow-2xl shadow-blue-600/25 hover:from-blue-700 hover:to-cyan-600"
        aria-label="Mở trợ lý mua sắm"
      >
        <span className="chatbot-lucky-wheel-badge" aria-hidden="true">
          <span className="chatbot-lucky-wheel-disc" />
          <Gift size={13} className="relative z-10" />
        </span>
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/12">
          <MessageCircle size={21} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-blue-600" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-extrabold">Trợ lý mua sắm</span>
          <span className="block text-xs text-blue-50">Tư vấn mua sắm</span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[34rem] w-[min(26rem,calc(100vw-2rem))] animate-pop flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/18">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
              <Bot size={23} />
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-extrabold">
                Trợ lý mua sắm
                <Sparkles size={15} className="text-amber-300" />
              </div>
              <div className="text-xs font-medium text-blue-50">Gợi ý sản phẩm, đơn hàng, thanh toán</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={handleClearChat} className="btn-ghost min-h-9 px-2 text-white hover:bg-white/10" title="Xóa lịch sử">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="btn-ghost min-h-9 px-2 text-white hover:bg-white/10" title="Đóng">
              <X size={19} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4">
        {messages.length === 0 && (
          <div className="animate-fade-up rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles size={25} />
            </div>
            <p className="mb-2 text-sm font-extrabold text-slate-900">Bạn muốn mua gì hôm nay?</p>
            <p className="mb-4 text-xs font-medium leading-5 text-slate-500">
              Mình có thể tìm sản phẩm, tư vấn lựa chọn, kiểm tra đơn hàng và giải thích thanh toán.
            </p>
            <div className="grid gap-2">
              {starterPrompts.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => setInputMessage(text)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon size={17} />
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={`${msg.timestamp || index}-${index}`} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[84%] rounded-3xl px-4 py-3 text-sm font-medium leading-6 shadow-sm ${
                msg.role === 'user'
                  ? 'rounded-br-lg bg-blue-600 text-white'
                  : 'rounded-bl-lg border border-slate-200 bg-white text-slate-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>

            {msg.role === 'assistant' && msg.products?.length > 0 && (
              <div className="mt-3 w-full max-w-[90%] space-y-3">
                {msg.products.map((product) => {
                  const price = product.salePrice || product.price || 0;
                  const hasDiscount = product.salePrice && product.salePrice < product.price;
                  const discountPercent = hasDiscount
                    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
                    : 0;

                  return (
                    <div key={product._id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <div className="flex gap-3 p-3">
                        <button
                          type="button"
                          onClick={(event) => handleViewDetail(product, event)}
                          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 text-left"
                          title="Xem chi tiết"
                        >
                          <img
                            src={getProductImage(product)}
                            alt={product.title}
                            onError={(event) => handleProductImageError(event, product)}
                            className="h-full w-full object-cover"
                          />
                          {hasDiscount && (
                            <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
                              -{discountPercent}%
                            </span>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(event) => handleViewDetail(product, event)}
                            className="mb-1 line-clamp-2 text-left text-sm font-extrabold text-slate-900 hover:text-blue-600"
                          >
                            {product.title}
                          </button>
                          {product.ratingAvg > 0 && (
                            <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <Star size={13} className="fill-amber-400 text-amber-400" />
                              {Number(product.ratingAvg).toFixed(1)} ({product.reviewCount || 0})
                            </div>
                          )}
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-base font-extrabold text-blue-600">{price.toLocaleString('vi-VN')} ₫</span>
                            {hasDiscount && (
                              <span className="text-xs font-semibold text-slate-400 line-through">{product.price.toLocaleString('vi-VN')} ₫</span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={(event) => handleViewDetail(product, event)} className="btn-outline min-h-9 px-2 text-xs" title="Xem chi tiết">
                              <Eye size={14} />
                            </button>
                            <button onClick={(event) => handleAddToCart(product, event)} className="btn-secondary min-h-9 flex-1 px-2 text-xs">
                              <ShoppingCart size={14} />
                              Giỏ
                            </button>
                            <button onClick={(event) => handleBuyNow(product, event)} className="btn-primary min-h-9 flex-1 px-2 text-xs">
                              Mua ngay
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="ai-thinking-dot h-2 w-2 rounded-full bg-blue-500" />
              <span className="ai-thinking-dot h-2 w-2 rounded-full bg-blue-500" />
              <span className="ai-thinking-dot h-2 w-2 rounded-full bg-blue-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            placeholder="Nhập câu hỏi hoặc sản phẩm cần tìm..."
            className="input flex-1 rounded-full"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !inputMessage.trim()} className="btn-primary min-h-11 w-12 px-0" aria-label="Gửi">
            {loading ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotWidget;
