import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheck, FiX, FiUser, FiMail, FiPhone, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PendingApprovals = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, [page]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/admin/pending-approvals', {
        params: { page, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data?.data || {};
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setPagination(payload.pagination || {});
    } catch (error) {
      toast.error('Không tải được danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Bạn có chắc muốn phê duyệt tài khoản của ${userName}?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/admin/users/${userId}/approval`,
        { approved: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã phê duyệt tài khoản');
      fetchPendingApprovals();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi phê duyệt');
    }
  };

  const openRejectModal = (user) => {
    setSelectedUser(user);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/admin/users/${selectedUser._id}/approval`,
        { approved: false, reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã từ chối tài khoản');
      setShowRejectModal(false);
      fetchPendingApprovals();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi từ chối');
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      seller: 'Người bán',
      shipper: 'Shipper',
      customer: 'Khách hàng'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      seller: 'bg-purple-100 text-purple-800',
      shipper: 'bg-blue-100 text-blue-800',
      customer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Duyệt tài khoản</h1>
        <div className="flex items-center gap-2 text-gray-600">
          <FiClock className="text-xl" />
          <span>{pagination.total || 0} tài khoản chờ duyệt</span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="card p-12 text-center">
          <FiCheck className="text-6xl text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Không có tài khoản nào chờ duyệt</h2>
          <p className="text-gray-600">Tất cả yêu cầu đăng ký đã được xử lý</p>
        </div>
      ) : (
        <>
          {/* Approvals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div key={user._id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{user.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                          >
                            {getRoleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMail className="flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiPhone className="flex-shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="flex-shrink-0" />
                    <span>Đăng ký: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(user._id, user.name)}
                    className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
                  >
                    <FiCheck />
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => openRejectModal(user)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiX />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg ${
                    page === p
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Từ chối tài khoản</h2>
            <p className="text-gray-600 mb-4">
              Bạn đang từ chối tài khoản của <strong>{selectedUser?.name}</strong>.
              Vui lòng nhập lý do từ chối:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="input w-full h-32 resize-none"
              placeholder="Nhập lý do từ chối..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
