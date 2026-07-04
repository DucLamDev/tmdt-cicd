import { useState } from 'react';
import { authAPI } from '../../api/auth';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authAPI.forgotPassword({ email });
      toast.success('Mật khẩu mới đã được gửi đến email của bạn. Vui lòng kiểm tra email!', {
        duration: 5000
      });
      setEmail(''); // Clear email field after success
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto card p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Quên mật khẩu</h1>
        <p className="text-gray-600 mb-6">
          Nhập email của bạn, chúng tôi sẽ gửi mật khẩu mới về email đăng ký
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="seller1@marketplace.com"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Đang xử lý...' : 'Gửi mật khẩu mới'}
          </button>
        </form>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Lưu ý:</strong> Sau khi nhận được mật khẩu mới qua email, vui lòng đăng nhập và đổi mật khẩu ngay để bảo mật tài khoản.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
