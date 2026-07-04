import { create } from 'zustand';
import { authAPI } from '../api/auth';
import { adminAPI } from '../api/admin';
import toast from 'react-hot-toast';
import useCartStore from './cartStore';

const ADMIN_SESSION_KEY = 'admin_impersonation_session';

const getSavedAdminSession = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isImpersonating: !!getSavedAdminSession(),
  loading: false,

  login: async (credentials) => {
    try {
      set({ loading: true });
      const response = await authAPI.login(credentials);
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.removeItem(ADMIN_SESSION_KEY);

      set({ user, isAuthenticated: true, isImpersonating: false, loading: false });
      useCartStore.getState().reloadCart();
      toast.success('Đăng nhập thành công');
      return true;
    } catch (error) {
      set({ loading: false });
      return false;
    }
  },

  register: async (data) => {
    try {
      set({ loading: true });
      const response = await authAPI.register(data);
      const { message, requiresApproval } = response;
      
      // If requires approval (seller/shipper), do NOT log them in
      if (requiresApproval) {
        set({ loading: false });
        toast.success(message || 'Đăng ký thành công! Vui lòng đợi admin phê duyệt.');
        return { success: true, requiresApproval: true };
      }

      // For customer, log them in immediately
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.removeItem(ADMIN_SESSION_KEY);

      set({ user, isAuthenticated: true, isImpersonating: false, loading: false });
      useCartStore.getState().reloadCart();
      toast.success(message || 'Đăng ký thành công');
      return { success: true, requiresApproval: false };
    } catch (error) {
      set({ loading: false });
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
      return { success: false };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore error
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(ADMIN_SESSION_KEY);
      set({ user: null, isAuthenticated: false, isImpersonating: false });
      useCartStore.getState().reloadCart();
      toast.success('Đăng xuất thành công');
    }
  },

  impersonateAs: async (userId, secretCode) => {
    const currentUser = useAuthStore.getState().user;
    const currentAccessToken = localStorage.getItem('accessToken');
    const currentRefreshToken = localStorage.getItem('refreshToken');

    if (!getSavedAdminSession()) {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        user: currentUser,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken
      }));
    }

    const response = await adminAPI.impersonateUser(userId, { secretCode });
    const { user, accessToken, refreshToken } = response.data;

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true, isImpersonating: true });
    useCartStore.getState().reloadCart();
    toast.success(response.message || 'Đã đăng nhập thay tài khoản');
    return true;
  },

  stopImpersonation: () => {
    const adminSession = getSavedAdminSession();
    if (!adminSession) return false;

    localStorage.setItem('user', JSON.stringify(adminSession.user));
    localStorage.setItem('accessToken', adminSession.accessToken);
    localStorage.setItem('refreshToken', adminSession.refreshToken);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    set({ user: adminSession.user, isAuthenticated: true, isImpersonating: false });
    useCartStore.getState().reloadCart();
    toast.success('Đã quay lại phiên admin');
    return true;
  },

  updateUser: (userData) => {
    const updatedUser = { ...useAuthStore.getState().user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      set({ user: null, isAuthenticated: false, isImpersonating: false });
      return;
    }

    try {
      const response = await authAPI.getMe();
      const user = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      useCartStore.getState().reloadCart();
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(ADMIN_SESSION_KEY);
      set({ user: null, isAuthenticated: false, isImpersonating: false });
    }
  },

  // For OAuth callback
  setAuthData: (user, accessToken, refreshToken) => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    set({ user, isAuthenticated: true, isImpersonating: false });
  },
}));

export default useAuthStore;
