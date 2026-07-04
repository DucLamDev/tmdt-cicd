import { renderHook, act } from '@testing-library/react';
import useCartStore from '../cartStore';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast');

describe('cartStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    useCartStore.setState({ items: [] });
  });

  describe('Initial State', () => {
    test('should have empty cart initially', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.getItemCount()).toBe(0);
      expect(result.current.getTotal()).toBe(0);
    });

    test('should load cart from localStorage', () => {
      const mockCart = [
        { _id: '1', title: 'Product 1', price: 100000, quantity: 2 },
      ];
      localStorage.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCartStore());

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('addItem', () => {
    test('should add new item to cart', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
        images: ['image.jpg'],
      };

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]._id).toBe('1');
      expect(result.current.items[0].quantity).toBe(2);
      expect(toast.success).toHaveBeenCalledWith('Đã thêm vào giỏ hàng');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should update quantity for existing item', () => {
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(product, 1);
      });

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(toast.success).toHaveBeenCalledWith('Đã cập nhật số lượng trong giỏ hàng');
    });

    test('should add item with default quantity of 1', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items[0].quantity).toBe(1);
    });
  });

  describe('removeItem', () => {
    test('should remove item from cart', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.removeItem('1');
      });

      expect(result.current.items).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith('Đã xóa khỏi giỏ hàng');
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should not affect other items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ _id: '1', title: 'Product 1', price: 100000 }, 1);
        result.current.addItem({ _id: '2', title: 'Product 2', price: 200000 }, 1);
      });

      act(() => {
        result.current.removeItem('1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]._id).toBe('2');
    });
  });

  describe('updateQuantity', () => {
    test('should update item quantity', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      act(() => {
        result.current.addItem(product, 2);
      });

      act(() => {
        result.current.updateQuantity('1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should remove item when quantity is 0', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      act(() => {
        result.current.addItem(product, 2);
      });

      act(() => {
        result.current.updateQuantity('1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    test('should remove item when quantity is negative', () => {
      const { result } = renderHook(() => useCartStore());
      const product = {
        _id: '1',
        title: 'Test Product',
        price: 100000,
      };

      act(() => {
        result.current.addItem(product, 2);
      });

      act(() => {
        result.current.updateQuantity('1', -1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    test('should clear all items from cart', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ _id: '1', title: 'Product 1', price: 100000 }, 1);
        result.current.addItem({ _id: '2', title: 'Product 2', price: 200000 }, 1);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getTotal', () => {
    test('should calculate total price', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ _id: '1', title: 'Product 1', price: 100000 }, 2);
        result.current.addItem({ _id: '2', title: 'Product 2', price: 50000 }, 3);
      });

      const total = result.current.getTotal();
      expect(total).toBe(350000);
    });

    test('should use sale price if available', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({
          _id: '1',
          title: 'Product 1',
          price: 100000,
          salePrice: 80000,
        }, 2);
      });

      const total = result.current.getTotal();
      expect(total).toBe(160000);
    });

    test('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      const total = result.current.getTotal();
      expect(total).toBe(0);
    });
  });

  describe('getItemCount', () => {
    test('should count total items', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem({ _id: '1', title: 'Product 1', price: 100000 }, 2);
        result.current.addItem({ _id: '2', title: 'Product 2', price: 50000 }, 3);
      });

      const count = result.current.getItemCount();
      expect(count).toBe(5);
    });

    test('should return 0 for empty cart', () => {
      const { result } = renderHook(() => useCartStore());

      const count = result.current.getItemCount();
      expect(count).toBe(0);
    });
  });

  describe('reloadCart', () => {
    test('should reload cart from localStorage', () => {
      const mockCart = [
        { _id: '1', title: 'Product 1', price: 100000, quantity: 2 },
      ];
      localStorage.getItem.mockReturnValue(JSON.stringify(mockCart));

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.reloadCart();
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]._id).toBe('1');
    });
  });
});
