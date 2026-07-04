import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const ProtectedRoute = ({ children, requireRole }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Debug logging
  console.log('ProtectedRoute Debug:', {
    isAuthenticated,
    user: user ? { name: user.name, roles: user.roles } : null,
    pathname: location.pathname,
    requireRole
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Auto-redirect admin to admin dashboard if they access root
  if (user?.roles?.includes('admin') && location.pathname === '/') {
    console.log('Redirecting admin to /admin');
    return <Navigate to="/admin" replace />;
  }

  // Auto-redirect seller to seller dashboard if they access root
  if (user?.roles?.includes('seller') && location.pathname === '/') {
    return <Navigate to="/seller" replace />;
  }

  // Auto-redirect shipper to shipper dashboard if they access root
  if (user?.roles?.includes('shipper') && location.pathname === '/') {
    return <Navigate to="/shipper" replace />;
  }

  if (requireRole && !user?.roles?.includes(requireRole)) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold text-red-600">Không có quyền truy cập</h1>
        <p className="mt-4 text-gray-600">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
