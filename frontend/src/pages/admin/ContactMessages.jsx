import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiMail, FiUser, FiClock, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filter, setFilter] = useState('all');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('http://localhost:5000/api/contact/admin/messages', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      const payload = response.data?.data || {};
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch (error) {
      toast.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/contact/admin/messages/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cập nhật trạng thái thành công');
      fetchMessages();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const sendResponse = async (id) => {
    if (!responseText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/contact/admin/messages/${id}`,
        { responseText, status: 'resolved' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã gửi phản hồi');
      setResponseText('');
      setSelectedMessage(null);
      fetchMessages();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin nhắn này?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`http://localhost:5000/api/contact/admin/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã xóa tin nhắn');
      fetchMessages();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const getSubjectLabel = (subject) => {
    const labels = {
      general: 'Câu hỏi chung',
      support: 'Hỗ trợ kỹ thuật',
      partnership: 'Hợp tác kinh doanh',
      complaint: 'Khiếu nại',
      other: 'Khác'
    };
    return labels[subject] || subject;
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-700' },
      in_progress: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700' },
      resolved: { label: 'Đã giải quyết', color: 'bg-green-100 text-green-700' },
      closed: { label: 'Đã đóng', color: 'bg-gray-100 text-gray-700' }
    };
    const badge = config[status] || config.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Tin nhắn liên hệ</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          >
            Chờ xử lý
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded ${filter === 'resolved' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
          >
            Đã giải quyết
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {messages.map((msg) => (
          <div key={msg._id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <FiUser className="text-gray-400" />
                  <span className="font-semibold">{msg.name}</span>
                  <span className="text-gray-600">{msg.email}</span>
                  {msg.phone && <span className="text-gray-600">• {msg.phone}</span>}
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <FiClock className="text-gray-400" />
                  <span>{new Date(msg.createdAt).toLocaleString('vi-VN')}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {getSubjectLabel(msg.subject)}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(msg.status)}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
            </div>

            {msg.adminResponse && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="font-semibold text-green-700 mb-2">Phản hồi từ Admin:</div>
                <p className="text-gray-700">{msg.adminResponse.text}</p>
                <div className="text-sm text-gray-600 mt-2">
                  {new Date(msg.adminResponse.respondedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            )}

            {selectedMessage === msg._id ? (
              <div className="mt-4">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="input w-full mb-2"
                  rows="4"
                  placeholder="Nhập phản hồi của bạn..."
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => sendResponse(msg._id)}
                    className="btn-primary px-4 py-2"
                  >
                    Gửi phản hồi
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMessage(null);
                      setResponseText('');
                    }}
                    className="btn-secondary px-4 py-2"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-2">
                {!msg.adminResponse && (
                  <button
                    onClick={() => setSelectedMessage(msg._id)}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    <FiMail className="inline mr-1" /> Phản hồi
                  </button>
                )}
                {msg.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(msg._id, 'in_progress')}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Đang xử lý
                  </button>
                )}
                {msg.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(msg._id, 'resolved')}
                    className="btn-secondary px-4 py-2 text-sm text-green-600"
                  >
                    <FiCheck className="inline mr-1" /> Đã giải quyết
                  </button>
                )}
                <button
                  onClick={() => deleteMessage(msg._id)}
                  className="btn-secondary px-4 py-2 text-sm text-red-600 hover:bg-red-100"
                >
                  <FiX className="inline mr-1" /> Xóa
                </button>
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Không có tin nhắn nào
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactMessages;
