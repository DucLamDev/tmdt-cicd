import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import PasswordInput from '../../components/PasswordInput';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) {
      navigate('/');
    }
  };

  const backendURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleGoogleLogin = () => {
    window.location.href = `${backendURL}/api/auth/oauth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${backendURL}/api/auth/oauth/facebook`;
  };

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto card p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Đăng nhập</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block font-medium mb-2">Mật khẩu</label>
            <PasswordInput
              name="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Hoặc đăng nhập bằng</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3">
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FcGoogle className="text-2xl" />
            <span className="font-medium text-gray-700">Đăng nhập với Google</span>
          </button>

          {/* Facebook Login Button */}
          <button
            onClick={handleFacebookLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors"
          >
            <FaFacebook className="text-2xl" />
            <span className="font-medium">Đăng nhập với Facebook</span>
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <Link to="/forgot-password" className="text-primary-600 hover:underline block">
            Quên mật khẩu?
          </Link>
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-600 hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
