import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../api/auth';
import toast from 'react-hot-toast';
import { FiEdit, FiSave, FiStar, FiX, FiUpload } from 'react-icons/fi';
import PasswordInput from '../../components/PasswordInput';
import AddressManager from '../../components/AddressManager';
import { isStrongPassword, passwordRuleText } from '../../utils/validation';
import { getDashboardStats as getShipperDashboardStats } from '../../api/shipper';

const Profile = () => {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [shipperRating, setShipperRating] = useState(null);
  const isShipper = user?.roles?.includes('shipper');

  useEffect(() => {
    if (!isShipper) return;
    getShipperDashboardStats()
      .then((response) => setShipperRating(response.data?.rating || null))
      .catch(() => setShipperRating(null));
  }, [isShipper]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await authAPI.updateProfile(formData);
      updateUser(response.data);
      toast.success('Cập nhật thông tin thành công');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!isStrongPassword(passwordData.newPassword)) {
      toast.error(passwordRuleText);
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Đổi mật khẩu thành công');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangingPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const formDataUpload = new FormData();
      formDataUpload.append('avatar', file);
      const uploadRes = await authAPI.uploadAvatar(formDataUpload);
      const avatarUrl = uploadRes?.data?.url;

      if (!avatarUrl) {
        throw new Error('Không lấy được đường dẫn ảnh đại diện');
      }

      const updateRes = await authAPI.updateProfile({ avatarUrl });
      updateUser(updateRes.data);
      toast.success('Cập nhật ảnh đại diện thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Không thể cập nhật ảnh đại diện');
    } finally {
      e.target.value = '';
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Thông tin tài khoản</h1>
      
      <div className="grid gap-6 max-w-4xl">
        {/* Profile Information */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || 'avatar'}
                className="w-20 h-20 rounded-full object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold text-lg">{user?.name}</div>
              <div className="text-sm text-gray-600">{user?.email}</div>
            </div>
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 cursor-pointer ${uploadingAvatar ? 'opacity-60 pointer-events-none' : ''}`}>
              <FiUpload />
              {uploadingAvatar ? 'Đang tải ảnh...' : 'Đổi avatar'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
            {!editing && (
              <button 
                onClick={() => setEditing(true)}
                className="btn-secondary px-4 py-2 flex items-center"
              >
                <FiEdit className="mr-2" /> Chỉnh sửa
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Họ tên *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input w-full"
                  placeholder="0xxx xxx xxx"
                />
              </div>
              <div className="flex space-x-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary px-6 py-2 flex items-center"
                >
                  <FiSave className="mr-2" /> {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({ name: user?.name || '', phone: user?.phone || '' });
                  }}
                  className="btn-secondary px-6 py-2 flex items-center"
                >
                  <FiX className="mr-2" /> Hủy
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2 text-gray-600">Họ tên</label>
                <div className="text-lg">{user?.name}</div>
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-600">Email</label>
                <div className="text-lg">{user?.email}</div>
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-600">Số điện thoại</label>
                <div className="text-lg">{user?.phone || 'Chưa cập nhật'}</div>
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-600">Vai trò</label>
                <div className="flex space-x-2">
                  {user?.roles?.map((role) => (
                    <span key={role} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium capitalize">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {isShipper && (
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Đánh giá giao hàng</h2>
                <p className="mt-1 text-sm text-gray-600">Điểm sao khách hàng đã đánh giá cho các đơn giao thành công</p>
              </div>
              <div className="rounded-lg bg-yellow-50 px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1 text-2xl font-bold text-yellow-700">
                  <FiStar className="h-6 w-6 fill-current" />
                  {Number(shipperRating?.average || 0).toFixed(1)}
                </div>
                <div className="text-xs text-yellow-700">{shipperRating?.count || 0} đánh giá</div>
              </div>
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
            {!changingPassword && (
              <button 
                onClick={() => setChangingPassword(true)}
                className="btn-secondary px-4 py-2"
              >
                Đổi mật khẩu
              </button>
            )}
          </div>

          {changingPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Mật khẩu hiện tại *</label>
                <PasswordInput
                  name="currentPassword"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block font-medium mb-2">Mật khẩu mới *</label>
                <PasswordInput
                  name="newPassword"
                  required
                  minLength={8}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-gray-500">{passwordRuleText}</p>
              </div>
              <div>
                <label className="block font-medium mb-2">Xác nhận mật khẩu mới *</label>
                <PasswordInput
                  name="confirmPassword"
                  required
                  minLength={8}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex space-x-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary px-6 py-2"
                >
                  {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="btn-secondary px-6 py-2"
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600">Nhấn nút "Đổi mật khẩu" để thay đổi mật khẩu của bạn</p>
          )}
        </div>

        <AddressManager />
      </div>
    </div>
  );
};

export default Profile;
