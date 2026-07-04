import { create } from 'zustand';
import toast from 'react-hot-toast';

const MAX_COMPARE = 4;

const getStored = () => {
  try { return JSON.parse(localStorage.getItem('compare_items') || '[]'); }
  catch { return []; }
};

const useCompareStore = create((set, get) => ({
  items: getStored(),

  addItem: (product) => {
    const items = get().items;
    if (items.find(i => i._id === product._id)) {
      toast.error('Sản phẩm đã có trong danh sách so sánh');
      return;
    }
    if (items.length >= MAX_COMPARE) {
      toast.error(`Tối đa ${MAX_COMPARE} sản phẩm để so sánh`);
      return;
    }
    const newItems = [...items, { _id: product._id, title: product.title, images: product.images, price: product.price, salePrice: product.salePrice, ratingAvg: product.ratingAvg, brand: product.brand, categories: product.categories, specifications: product.specifications }];
    localStorage.setItem('compare_items', JSON.stringify(newItems));
    set({ items: newItems });
    toast.success('Đã thêm vào so sánh');
  },

  removeItem: (id) => {
    const newItems = get().items.filter(i => i._id !== id);
    localStorage.setItem('compare_items', JSON.stringify(newItems));
    set({ items: newItems });
  },

  clearAll: () => {
    localStorage.removeItem('compare_items');
    set({ items: [] });
  }
}));

export default useCompareStore;
