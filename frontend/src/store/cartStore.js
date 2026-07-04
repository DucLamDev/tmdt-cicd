import { create } from 'zustand';
import toast from 'react-hot-toast';

// Get cart key based on user ID
const getCartKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?._id ? `cart_${user._id}` : 'cart_guest';
  } catch {
    return 'cart_guest';
  }
};

// User-specific localStorage persistence
const getInitialCart = () => {
  try {
    const cartKey = getCartKey();
    const stored = localStorage.getItem(cartKey);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const normalizeAttributes = (attributes = {}) => Object.entries(attributes || {})
  .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
  .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value).trim() }), {});

const getAttributeSignature = (attributes = {}) => Object.entries(normalizeAttributes(attributes))
  .map(([key, value]) => `${key}:${value}`)
  .join('|');

export const getCartItemKey = (item = {}) => item.cartItemId
  || `${item._id || item.productId}:${item.variantId || ''}:${getAttributeSignature(item.selectedAttributes || {})}`;

const useCartStore = create((set, get) => {
  const saveToStorage = (items) => {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(items));
  };

  return {
    items: getInitialCart(),

    addItem: (product, quantity = 1) => {
      const items = get().items;
      const selectedAttributes = normalizeAttributes(product.selectedAttributes || {});
      const cartItem = {
        ...product,
        selectedAttributes,
        cartItemId: getCartItemKey({ ...product, selectedAttributes })
      };
      const existingItem = items.find((item) => getCartItemKey(item) === cartItem.cartItemId);

      let newItems;
      if (existingItem) {
        newItems = items.map((item) =>
          getCartItemKey(item) === cartItem.cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        toast.success('Đã cập nhật số lượng trong giỏ hàng');
      } else {
        newItems = [...items, { ...cartItem, quantity }];
        toast.success('Đã thêm vào giỏ hàng');
      }
      saveToStorage(newItems);
      set({ items: newItems });
    },

    removeItem: (itemKey) => {
      const newItems = get().items.filter((item) => getCartItemKey(item) !== itemKey && item._id !== itemKey);
      saveToStorage(newItems);
      set({ items: newItems });
      toast.success('Đã xóa khỏi giỏ hàng');
    },

    removeItems: (itemKeys = []) => {
      const selectedIds = new Set(itemKeys);
      const newItems = get().items.filter((item) => !selectedIds.has(getCartItemKey(item)) && !selectedIds.has(item._id));
      saveToStorage(newItems);
      set({ items: newItems });
    },

    updateQuantity: (itemKey, quantity) => {
      if (quantity <= 0) {
        get().removeItem(itemKey);
        return;
      }

      const newItems = get().items.map((item) =>
        getCartItemKey(item) === itemKey || item._id === itemKey ? { ...item, quantity } : item
      );
      saveToStorage(newItems);
      set({ items: newItems });
    },

    clearCart: () => {
      saveToStorage([]);
      set({ items: [] });
    },

    reloadCart: () => {
      const newItems = getInitialCart();
      set({ items: newItems });
    },

    getTotal: () => {
      return get().items.reduce((total, item) => {
        const price = item.salePrice || item.price;
        return total + price * item.quantity;
      }, 0);
    },

    getItemCount: () => {
      return get().items.reduce((count, item) => count + item.quantity, 0);
    },
  };
});

export default useCartStore;
