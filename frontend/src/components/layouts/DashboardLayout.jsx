import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { FiHome, FiPackage, FiShoppingBag, FiShoppingCart, FiTruck, FiUsers, FiSettings, FiUser, FiLogOut, FiClock, FiMail, FiGrid, FiZap, FiBookOpen, FiRefreshCw, FiBarChart2, FiBox, FiMessageSquare, FiMap, FiDollarSign } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import { notificationAPI } from '../../api/notifications';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [badges, setBadges] = useState({});

  const isSeller = user?.roles?.includes('seller');
  const isShipper = user?.roles?.includes('shipper');
  const isAdmin = user?.roles?.includes('admin');

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    try {
      const response = await notificationAPI.getNavigationBadges();
      setBadges(response.data?.badges || {});
    } catch {
      setBadges({});
    }
  }, [user]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  useRealtimeRefresh(['dashboard:update', 'message:new', 'notification:new'], fetchBadges, 10000);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sellerNav = [
    { path: '/seller', label: 'Dashboard', icon: FiHome },
    { path: '/seller/products', label: 'Sản phẩm', icon: FiPackage },
    { path: '/seller/orders', label: 'Đơn hàng', icon: FiShoppingBag },
    { path: '/seller/shop', label: 'Cửa hàng', icon: FiShoppingCart },
    { path: '/seller/inventory', label: 'Kho hàng', icon: FiBox },
    { path: '/seller/returns', label: 'Đổi/Trả hàng', icon: FiRefreshCw },
    { path: '/seller/messages', label: 'Tin nhắn', icon: FiMessageSquare },
    { path: '/seller/reports', label: 'Báo cáo', icon: FiBarChart2 },
  ];

  const shipperNav = [
    { path: '/shipper', label: 'Dashboard', icon: FiTruck },
    { path: '/shipper/available-orders', label: 'Đơn chờ nhận', icon: FiPackage },
    { path: '/shipper/orders', label: 'Đơn đang giao', icon: FiMap },
    { path: '/shipper/cod', label: 'Quản lý COD', icon: FiDollarSign },
    { path: '/shipper/history', label: 'Lịch sử', icon: FiClock },
    { path: '/shipper/reports', label: 'Báo cáo', icon: FiBarChart2 },
  ];

  const adminNav = [
    { path: '/admin', label: 'Dashboard', icon: FiHome },
    { path: '/admin/users', label: 'Người dùng', icon: FiUsers },
    { path: '/admin/pending-approvals', label: 'Duyệt tài khoản', icon: FiClock },
    { path: '/admin/products', label: 'Sản phẩm', icon: FiPackage },
    { path: '/admin/orders', label: 'Đơn hàng', icon: FiShoppingBag },
    { path: '/admin/categories', label: 'Danh mục', icon: FiGrid },
    { path: '/admin/flash-sales', label: 'Flash Sale', icon: FiZap },
    { path: '/admin/blog', label: 'Blog', icon: FiBookOpen },
    { path: '/admin/messages', label: 'Tin nhắn', icon: FiMessageSquare },
    { path: '/admin/returns', label: 'Đổi/Trả hàng', icon: FiRefreshCw },
    { path: '/admin/promotions', label: 'Khuyến mãi', icon: FiSettings },
    { path: '/admin/reports', label: 'Báo cáo', icon: FiBarChart2 },
    { path: '/admin/contact-messages', label: 'Liên hệ', icon: FiMail },
  ];

  const navigation = isAdmin ? adminNav : isShipper ? shipperNav : isSeller ? sellerNav : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 flex h-screen w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white/92 shadow-xl shadow-slate-900/6 backdrop-blur">
          <div className="p-6">
            <Link to="/" className="text-2xl font-extrabold text-slate-950">
              Marketplace
            </Link>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isAdmin ? 'Admin Panel' : isSeller ? 'Seller Panel' : isShipper ? 'Shipper Panel' : 'Dashboard'}
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-2 pb-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badge = badges[item.path] || 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mb-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20'
                      : 'text-slate-600 font-semibold hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {badge > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Bottom section - User info & actions */}
          <div className="border-t border-slate-200 bg-white/95">
            {/* User info */}
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.name || 'avatar'} className="w-10 h-10 rounded-full object-cover border" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100">
                    <FiUser className="w-5 h-5 text-primary-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{user?.name}</p>
                  <p className="truncate text-xs font-medium text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="px-4 py-2">
              <Link
                to="/"
                className="mb-1 flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                <FiHome className="w-5 h-5" />
                <span>Về trang chủ</span>
              </Link>
              <Link
                to="/profile"
                className="mb-1 flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                <FiUser className="w-5 h-5" />
                <span>Tài khoản</span>
              </Link>
              <button
                onClick={handleLogout}
                className="mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                <FiLogOut className="w-5 h-5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="page-shell p-5 lg:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
