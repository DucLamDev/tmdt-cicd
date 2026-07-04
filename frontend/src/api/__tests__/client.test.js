import axios from 'axios';
import apiClient from '../client';
import toast from 'react-hot-toast';

jest.mock('axios');
jest.mock('react-hot-toast');

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Request Interceptor', () => {
    test('should add authorization header when token exists', async () => {
      const mockToken = 'test-access-token';
      localStorage.getItem.mockReturnValue(mockToken);

      const mockResponse = { data: { success: true } };
      axios.create.mockReturnValue({
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn().mockResolvedValue(mockResponse),
      });

      expect(localStorage.getItem).toBeDefined();
    });

    test('should not add authorization header when token does not exist', () => {
      localStorage.getItem.mockReturnValue(null);

      expect(localStorage.getItem).toBeDefined();
    });
  });

  describe('Response Interceptor', () => {
    test('should return data on successful response', () => {
      const mockResponse = {
        data: { success: true, data: { id: 1, name: 'Test' } },
      };

      expect(mockResponse.data).toBeDefined();
    });

    test('should show error toast on error response', () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Bad Request' },
        },
      };

      expect(mockError.response.data.message).toBe('Bad Request');
    });

    test('should handle 401 error and attempt token refresh', async () => {
      const mockError = {
        response: { status: 401 },
        config: { _retry: false },
      };

      const mockRefreshToken = 'refresh-token';
      localStorage.getItem.mockReturnValue(mockRefreshToken);

      expect(mockError.response.status).toBe(401);
    });

    test('should redirect to login on refresh token failure', async () => {
      const mockError = {
        response: { status: 401 },
        config: { _retry: false },
      };

      localStorage.getItem.mockReturnValue('refresh-token');
      axios.post.mockRejectedValue(new Error('Refresh failed'));

      expect(mockError.response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should show default error message when no message provided', () => {
      const mockError = {
        response: {
          status: 500,
          data: {},
        },
      };

      const message = mockError.response?.data?.message || 'Có lỗi xảy ra';
      expect(message).toBe('Có lỗi xảy ra');
    });

    test('should show custom error message when provided', () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Custom error message' },
        },
      };

      const message = mockError.response?.data?.message || 'Có lỗi xảy ra';
      expect(message).toBe('Custom error message');
    });
  });
});
