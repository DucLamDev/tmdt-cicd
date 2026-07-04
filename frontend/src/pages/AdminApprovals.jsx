import { useState, useEffect } from 'react';
import { Check, X, User, Package, Truck } from 'lucide-react';
import { adminAPI } from '../api/admin';

const AdminApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, [pagination.page]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingApprovals({ page: pagination.page });
      setPendingUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      alert('Không thể tải danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (confirm('Bạn có chắc muốn phê duyệt người dùng này?')) {
      try {
        await adminAPI.approveUser(userId, { approved: true });
        alert('Phê duyệt thành công');
        fetchPendingApprovals();
      } catch (error) {
        console.error('Failed to approve user:', error);
        alert('Không thể phê duyệt người dùng');
      }
    }
  };

  const handleReject = async (userId) => {
    if (!rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await adminAPI.approveUser(userId, {
        approved: false,
        reason: rejectionReason
      });
      alert('Đã từ chối người dùng');
      setSelectedUser(null);
      setRejectionReason('');
      fetchPendingApprovals();
    } catch (error) {
      console.error('Failed to reject user:', error);
      alert('Không thể từ chối người dùng');
    }
  };

  const getRoleIcon = (roles) => {
    if (roles.includes('seller')) return <Package className="text-blue-500" />;
    if (roles.includes('shipper')) return <Truck className="text-green-500" />;
    return <User className="text-gray-500" />;
  };

  const getRoleLabel = (roles) => {
    if (roles.includes('seller')) return 'Người bán';
    if (roles.includes('shipper')) return 'Người giao hàng';
    return 'Người dùng';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Phê duyệt đăng ký</h1>
        <p className="text-gray-600 mt-1">
          Quản lý các yêu cầu đăng ký làm Seller và Shipper
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Check size={64} className="mx-auto" />
          </div>
          <p className="text-gray-600">Không có yêu cầu nào cần phê duyệt</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div key={user._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100 rounded-full">
                    {getRoleIcon(user.roles)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{user.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {getRoleLabel(user.roles)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Email: {user.email}</div>
                      {user.phone && <div>Điện thoại: {user.phone}</div>}
                      <div>
                        Đăng ký: {new Date(user.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    {user.shop && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium mb-1">Thông tin shop:</div>
                        <div className="text-sm text-gray-600">
                          <div>Tên shop: {user.shop.shopName}</div>
                          {user.shop.description && (
                            <div className="mt-1">Mô tả: {user.shop.description}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(user._id)}
                    className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Check size={18} />
                    Phê duyệt
                  </button>
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    <X size={18} />
                    Từ chối
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination({ ...pagination, page })}
              className={`px-4 py-2 rounded ${
                page === pagination.page
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Từ chối đăng ký</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Bạn đang từ chối đăng ký của: <strong>{selectedUser.name}</strong>
              </p>
              
              <label className="block text-sm font-medium mb-2">
                Lý do từ chối *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows="4"
                placeholder="Nhập lý do từ chối để người dùng biết và có thể đăng ký lại..."
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleReject(selectedUser._id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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

export default AdminApprovals;
