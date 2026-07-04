import { useState, useEffect } from 'react';
import { FiKey, FiLock, FiLogIn, FiUnlock, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ActionReasonModal from '../../components/ActionReasonModal';
import { adminAPI } from '../../api/admin';
import PasswordInput from '../../components/PasswordInput';
import { isStrongPassword, passwordRuleText } from '../../utils/validation';
import useAuthStore from '../../store/authStore';

const AdminUsers = () => {
  const navigate = useNavigate();
  const impersonateAs = useAuthStore((state) => state.impersonateAs);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null,
    userId: null,
    userName: '',
    currentStatus: null
  });
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, userId: null, userName: '', newPassword: '', confirmPassword: '' });
  const [impersonateModal, setImpersonateModal] = useState({ isOpen: false, userId: null, userName: '', secretCode: '', loading: false });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({ page, limit: 20, role: roleFilter, search });
      const payload = response.data || {};
      setUsers(Array.isArray(payload.users) ? payload.users : []);
      setPagination(payload.pagination || {});
    } catch (error) {
      toast.error('Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const openLockModal = (userId, userName, currentStatus) => {
    setModalState({
      isOpen: true,
      type: 'lock',
      userId,
      userName,
      currentStatus
    });
  };

  const toggleUserLock = async (reason) => {
    const { userId, currentStatus } = modalState;
    
    try {
      await adminAPI.toggleUserLock(userId, { reason: reason || '' });
      toast.success(currentStatus ? 'Đã khóa người dùng' : 'Đã mở khóa người dùng');
      fetchUsers();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const openDeleteModal = (userId, userName) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      userId,
      userName,
      currentStatus: null
    });
  };

  const deleteUser = async (reason) => {
    const { userId } = modalState;

    try {
      await adminAPI.deleteUser(userId, { reason });
      toast.success('Đã xóa người dùng');
      fetchUsers();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const openPasswordModal = (userId, userName) => {
    setPasswordModal({ isOpen: true, userId, userName, newPassword: '', confirmPassword: '' });
  };

  const openImpersonateModal = (userId, userName) => {
    setImpersonateModal({ isOpen: true, userId, userName, secretCode: '', loading: false });
  };

  const submitImpersonation = async (e) => {
    e.preventDefault();
    if (!impersonateModal.secretCode.trim()) {
      toast.error('Vui lòng nhập mã bí mật admin');
      return;
    }
    try {
      setImpersonateModal((current) => ({ ...current, loading: true }));
      await impersonateAs(impersonateModal.userId, impersonateModal.secretCode);
      setImpersonateModal({ isOpen: false, userId: null, userName: '', secretCode: '', loading: false });
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đăng nhập thay tài khoản');
      setImpersonateModal((current) => ({ ...current, loading: false }));
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!isStrongPassword(passwordModal.newPassword)) {
      toast.error(passwordRuleText);
      return;
    }
    try {
      await adminAPI.changeUserPassword(passwordModal.userId, { newPassword: passwordModal.newPassword });
      toast.success('Đã đổi mật khẩu người dùng');
      setPasswordModal({ isOpen: false, userId: null, userName: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: null,
      userId: null,
      userName: '',
      currentStatus: null
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
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
      <h1 className="text-3xl font-bold mb-8">Quản lý người dùng</h1>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email..."
              className="input flex-1"
            />
            <button type="submit" className="btn-primary px-4">
              <FiSearch />
            </button>
          </form>
          
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="input w-full md:w-48"
          >
            <option value="">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="seller">Người bán</option>
            <option value="shipper">Shipper</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người dùng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vai trò</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                      {user.approvalStatus && user.approvalStatus !== 'approved' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          user.approvalStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Đã từ chối'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => openLockModal(user._id, user.name, user.isActive)}
                      className="text-yellow-600 hover:text-yellow-900 mr-3"
                      title={user.isActive ? 'Khóa' : 'Mở khóa'}
                    >
                      {user.isActive ? <FiLock /> : <FiUnlock />}
                    </button>
                    <button
                      onClick={() => openPasswordModal(user._id, user.name)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Đổi mật khẩu"
                    >
                      <FiKey />
                    </button>
                    {!user.roles.includes('admin') && (
                      <button
                        onClick={() => openImpersonateModal(user._id, user.name)}
                        className="text-emerald-600 hover:text-emerald-900 mr-3"
                        title="Đăng nhập thay"
                      >
                        <FiLogIn />
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(user._id, user.name)}
                      className="text-red-600 hover:text-red-900"
                      title="Xóa"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
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

      {/* Action Reason Modal */}
      <ActionReasonModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.type === 'lock' ? toggleUserLock : deleteUser}
        title={
          modalState.type === 'lock'
            ? (modalState.currentStatus ? 'Khóa tài khoản' : 'Mở khóa tài khoản')
            : 'Xóa tài khoản'
        }
        description={
          modalState.type === 'lock'
            ? (modalState.currentStatus
                ? `Bạn có chắc muốn khóa tài khoản "${modalState.userName}"? Lý do sẽ được gửi đến email của người dùng.`
                : `Bạn có chắc muốn mở khóa tài khoản "${modalState.userName}"?`)
            : `Bạn có chắc muốn xóa tài khoản "${modalState.userName}"? Hành động này không thể hoàn tác. Lý do sẽ được gửi đến email của người dùng.`
        }
        actionType={modalState.type === 'delete' ? 'danger' : 'warning'}
        confirmText={
          modalState.type === 'lock'
            ? (modalState.currentStatus ? 'Khóa tài khoản' : 'Mở khóa')
            : 'Xóa tài khoản'
        }
        requireReason={modalState.type === 'delete' || (modalState.type === 'lock' && modalState.currentStatus)}
      />

      {impersonateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={submitImpersonation} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Đăng nhập thay tài khoản</h2>
                <p className="text-sm text-gray-600">{impersonateModal.userName}</p>
              </div>
              <button
                type="button"
                onClick={() => setImpersonateModal({ isOpen: false, userId: null, userName: '', secretCode: '', loading: false })}
                className="rounded p-2 hover:bg-gray-100"
              >
                <FiX />
              </button>
            </div>
            <div>
              <label className="mb-2 block font-medium">Mã bí mật admin *</label>
              <input
                type="password"
                value={impersonateModal.secretCode}
                onChange={(e) => setImpersonateModal({ ...impersonateModal, secretCode: e.target.value })}
                className="input w-full"
                autoComplete="one-time-code"
                required
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary px-4 py-2"
                onClick={() => setImpersonateModal({ isOpen: false, userId: null, userName: '', secretCode: '', loading: false })}
              >
                Hủy
              </button>
              <button type="submit" disabled={impersonateModal.loading} className="btn-primary px-4 py-2">
                {impersonateModal.loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <form onSubmit={changePassword} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
                <p className="text-sm text-gray-600">{passwordModal.userName}</p>
              </div>
              <button type="button" onClick={() => setPasswordModal({ isOpen: false, userId: null, userName: '', newPassword: '', confirmPassword: '' })} className="rounded p-2 hover:bg-gray-100">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-medium">Mật khẩu mới</label>
                <PasswordInput
                  name="adminNewPassword"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500">{passwordRuleText}</p>
              </div>
              <div>
                <label className="mb-2 block font-medium">Xác nhận mật khẩu</label>
                <PasswordInput
                  name="adminConfirmPassword"
                  value={passwordModal.confirmPassword}
                  onChange={(e) => setPasswordModal({ ...passwordModal, confirmPassword: e.target.value })}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary px-4 py-2" onClick={() => setPasswordModal({ isOpen: false, userId: null, userName: '', newPassword: '', confirmPassword: '' })}>Hủy</button>
              <button type="submit" className="btn-primary px-4 py-2">Cập nhật</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
