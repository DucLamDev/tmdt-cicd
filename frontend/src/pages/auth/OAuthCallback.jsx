import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const { setAuthData } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (!accessToken || !refreshToken) {
          throw new Error('Không nhận được token từ Google');
        }

        // Save tokens to localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // Fetch user info
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Không thể lấy thông tin người dùng');
        }

        const userData = await response.json();
        const user = userData.data || userData;

        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update auth store
        setAuthData(user, accessToken, refreshToken);

        setStatus('success');
        toast.success('Đăng nhập thành công với Google!');

        // Redirect based on role
        setTimeout(() => {
          if (user.roles?.includes('admin')) {
            navigate('/admin');
          } else if (user.roles?.includes('seller')) {
            navigate('/seller');
          } else if (user.roles?.includes('shipper')) {
            navigate('/shipper');
          } else {
            navigate('/');
          }
        }, 1000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        toast.error(error.message || 'Đăng nhập thất bại');
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuthData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">
              Đang xử lý đăng nhập với Google...
            </h2>
            <p className="text-gray-500 mt-2">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-700">
              Đăng nhập thành công!
            </h2>
            <p className="text-gray-500 mt-2">Đang chuyển hướng...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-gray-700">
              Đăng nhập thất bại
            </h2>
            <p className="text-gray-500 mt-2">Đang quay lại trang đăng nhập...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
