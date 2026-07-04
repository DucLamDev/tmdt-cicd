import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import PasswordInput from '../../components/PasswordInput';
import { isStrongPassword, isValidVietnamPhone, passwordRuleText } from '../../utils/validation';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu không khớp');
      return;
    }
    if (!isStrongPassword(formData.password)) {
      alert(passwordRuleText);
      return;
    }
    if (formData.phone && !isValidVietnamPhone(formData.phone)) {
      alert('Số điện thoại không hợp lệ');
      return;
    }
    const result = await register(formData);
    if (result?.success) {
      if (result.requiresApproval) {
        // Seller/Shipper: redirect to login page, cannot access system yet
        navigate('/login');
      } else {
        // Customer: redirect to home, logged in
        navigate('/');
      }
    }
  };

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto card p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Đăng ký</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-2">Họ tên</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            />
          </div>
          <div>
            <label className="block font-medium mb-2">Vai trò</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input w-full"
            >
              <option value="customer">Khách hàng</option>
              <option value="seller">Người bán</option>
              <option value="shipper">Shipper</option>
            </select>
            {(formData.role === 'seller' || formData.role === 'shipper') && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ Tài khoản {formData.role === 'seller' ? 'người bán' : 'shipper'} cần được admin phê duyệt trước khi sử dụng.
              </p>
            )}
          </div>
          <div>
            <label className="block font-medium mb-2">Mật khẩu</label>
            <PasswordInput
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-500">{passwordRuleText}</p>
          </div>
          <div>
            <label className="block font-medium mb-2">Xác nhận mật khẩu</label>
            <PasswordInput
              name="confirmPassword"
              required
              minLength={8}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <p className="mt-6 text-center">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
