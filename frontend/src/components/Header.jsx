import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  BookOpen,
  Gift,
  Grid3X3,
  Heart,
  Home,
  Info,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Search,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  User,
  X,
  Zap
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import NotificationBell from './NotificationBell';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, isImpersonating, stopImpersonation } = useAuthStore();
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const [searchValue, setSearchValue] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Trang chủ', icon: Home },
    { path: '/products', label: 'Sản phẩm', icon: Grid3X3 },
    { path: '/flash-sales', label: 'Flash Sale', icon: Zap },
    { path: '/games', label: 'Voucher', icon: Gift },
    { path: '/blog', label: 'Blog', icon: BookOpen },
    { path: '/about', label: 'Về chúng tôi', icon: Info },
    { path: '/contact', label: 'Liên hệ', icon: Mail },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSearch = () => {
    const keyword = searchValue.trim();
    if (!keyword) return;
    navigate(`/products?query=${encodeURIComponent(keyword)}`);
    setMobileOpen(false);
  };

  const handleStopImpersonation = () => {
    if (stopImpersonation()) navigate('/admin/users');
  };

  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 shadow-sm backdrop-blur-xl">
      {isImpersonating && (
        <div className="bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">
          <div className="container flex flex-wrap items-center justify-between gap-2">
            <span>Đang đăng nhập thay: {user?.name || user?.email}</span>
            <button type="button" onClick={handleStopImpersonation} className="rounded-lg bg-white px-3 py-1 text-sm font-bold text-amber-700 hover:bg-amber-50">
              Quay lại admin
            </button>
          </div>
        </div>
      )}
      <div className="container">
        <div className="flex min-h-20 items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
              <ShoppingBag size={23} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-xl font-extrabold text-slate-950">Marketplace</span>
              <span className="block text-xs font-semibold text-slate-500">Smart commerce</span>
            </span>
          </Link>

          <div className="hidden flex-1 lg:block">
            <div className="mx-auto flex max-w-2xl items-center rounded-full border border-slate-200 bg-slate-50/90 p-1 shadow-inner">
              <div className="flex flex-1 items-center gap-2 px-4">
                <Search size={18} className="text-slate-400" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Tìm sản phẩm, danh mục, thương hiệu..."
                  className="h-11 w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                />
              </div>
              <button type="button" onClick={handleSearch} className="btn-primary min-h-11 px-5">
                <Sparkles size={16} />
                Tìm kiếm
              </button>
            </div>
          </div>

          <nav className="ml-auto hidden items-center gap-2 lg:flex">
            <Link to="/cart" className="btn-ghost relative min-h-11 px-3" title="Giỏ hàng">
              <ShoppingCart size={21} />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold text-white">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>

            {isAuthenticated && <NotificationBell />}
            {isAuthenticated && (
              <Link to="/messages" className="btn-ghost min-h-11 px-3" title="Tin nhắn">
                <MessageSquare size={21} />
              </Link>
            )}

            {isAuthenticated ? (
              <div className="group relative">
                <button className="flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-md">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user?.name || 'avatar'} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-700">{userInitial}</span>
                  )}
                  <span className="max-w-28 truncate text-sm">{user?.name}</span>
                </button>

                <div className="invisible absolute right-0 mt-3 w-60 translate-y-2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-2xl shadow-slate-900/12 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <Link to="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <User size={16} /> Tài khoản
                  </Link>
                  <Link to="/orders" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Package size={16} /> Đơn hàng
                  </Link>
                  <Link to="/wishlist" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Heart size={16} /> Yêu thích
                  </Link>
                  <Link to="/messages" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <MessageSquare size={16} /> Tin nhắn
                  </Link>
                  <Link to="/loyalty" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Gift size={16} /> Điểm thưởng
                  </Link>

                  {user?.roles?.includes('seller') && (
                    <Link to="/seller" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
                      <Package size={16} /> Seller Dashboard
                    </Link>
                  )}
                  {user?.roles?.includes('shipper') && (
                    <Link to="/shipper" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50">
                      <Truck size={16} /> Shipper Dashboard
                    </Link>
                  )}
                  {user?.roles?.includes('admin') && (
                    <Link to="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
                      <Shield size={16} /> Admin Dashboard
                    </Link>
                  )}

                  <div className="my-2 h-px bg-slate-100" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost">Đăng nhập</Link>
                <Link to="/register" className="btn-primary">Đăng ký</Link>
              </div>
            )}
          </nav>

          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="btn-secondary ml-auto min-h-11 px-3 lg:hidden" aria-label="Mở menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="hidden border-t border-slate-100 py-3 lg:block">
          <nav className="flex items-center gap-2 overflow-x-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2.5 rounded-full px-4 py-3 text-base font-bold transition-all ${
                    isActive(link.path)
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon size={19} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {mobileOpen && (
          <div className="animate-pop border-t border-slate-100 py-4 lg:hidden">
            <div className="mb-4 flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search size={18} className="text-slate-400" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch();
                  }}
                  placeholder="Tìm sản phẩm..."
                  className="h-10 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <button type="button" onClick={handleSearch} className="btn-primary min-h-10 px-4">
                Tìm
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-4 text-base font-bold ${
                      isActive(link.path)
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Icon size={19} />
                    {link.label}
                  </Link>
                );
              })}
              <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-bold text-slate-700">
                <ShoppingCart size={17} /> Giỏ hàng
              </Link>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-base font-bold text-rose-700">
                  <LogOut size={17} /> Đăng xuất
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-bold text-slate-700">
                  <User size={17} /> Đăng nhập
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
