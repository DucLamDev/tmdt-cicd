import { renderHook, act } from '@testing-library/react';
import useAuthStore from '../authStore';
import { authAPI } from '../../api/auth';
import toast from 'react-hot-toast';

jest.mock('../../api/auth');
jest.mock('react-hot-toast');

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    test('should load user from localStorage', () => {
      const mockUser = { _id: '123', email: 'test@example.com', name: 'Test User' };
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        if (key === 'accessToken') return 'mock-token';
        return null;
      });

      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    test('should login successfully', async () => {
      const mockUser = { _id: '123', email: 'test@example.com', name: 'Test User' };
      const mockResponse = {
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      authAPI.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
      expect(toast.success).toHaveBeenCalledWith('Đăng nhập thành công');
    });

    test('should handle login failure', async () => {
      authAPI.login.mockRejectedValue(new Error('Login failed'));

      const { result } = renderHook(() => useAuthStore());

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('register', () => {
    test('should register customer successfully', async () => {
      const mockUser = { _id: '123', email: 'test@example.com', name: 'Test User' };
      const mockResponse = {
        message: 'Đăng ký thành công',
        requiresApproval: false,
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      authAPI.register.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(registerResult.success).toBe(true);
      expect(registerResult.requiresApproval).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(toast.success).toHaveBeenCalled();
    });

    test('should register seller with approval required', async () => {
      const mockResponse = {
        message: 'Đăng ký thành công! Vui lòng đợi admin phê duyệt.',
        requiresApproval: true,
      };

      authAPI.register.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthStore());

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          name: 'Seller User',
          email: 'seller@example.com',
          password: 'password123',
          role: 'seller',
        });
      });

      expect(registerResult.success).toBe(true);
      expect(registerResult.requiresApproval).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(toast.success).toHaveBeenCalled();
    });

    test('should handle registration failure', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Email đã được sử dụng',
          },
        },
      };

      authAPI.register.mockRejectedValue(errorResponse);

      const { result } = renderHook(() => useAuthStore());

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123',
        });
      });

      expect(registerResult.success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Email đã được sử dụng');
    });
  });

  describe('logout', () => {
    test('should logout successfully', async () => {
      const mockUser = { _id: '123', email: 'test@example.com' };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      authAPI.logout.mockResolvedValue({});

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(toast.success).toHaveBeenCalledWith('Đăng xuất thành công');
    });

    test('should logout even if API call fails', async () => {
      authAPI.logout.mockRejectedValue(new Error('Logout failed'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(toast.success).toHaveBeenCalledWith('Đăng xuất thành công');
    });
  });

  describe('updateUser', () => {
    test('should update user data', () => {
      const mockUser = { _id: '123', email: 'test@example.com', name: 'Test User' };
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.updateUser({ name: 'Updated Name', phone: '0123456789' });
      });

      expect(result.current.user.name).toBe('Updated Name');
      expect(result.current.user.phone).toBe('0123456789');
      expect(result.current.user.email).toBe('test@example.com');
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('checkAuth', () => {
    test('should verify authentication with valid token', async () => {
      const mockUser = { _id: '123', email: 'test@example.com', name: 'Test User' };
      localStorage.getItem.mockReturnValue('valid-token');
      authAPI.getMe.mockResolvedValue({ data: mockUser });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should clear auth on invalid token', async () => {
      localStorage.getItem.mockReturnValue('invalid-token');
      authAPI.getMe.mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    test('should clear auth when no token', async () => {
      localStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
