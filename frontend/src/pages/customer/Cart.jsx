import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore, { getCartItemKey } from '../../store/cartStore';
import { FiCheckSquare, FiMinus, FiPlus, FiSquare, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Cart = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity } = useCartStore();
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.length === 0) return items.map((item) => getCartItemKey(item));
      return current.filter((id) => items.some((item) => getCartItemKey(item) === id || item._id === id));
    });
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(getCartItemKey(item)) || selectedIds.includes(item._id)),
    [items, selectedIds]
  );

  const subtotal = selectedItems.reduce((total, item) => {
    const price = item.salePrice || item.price;
    return total + price * item.quantity;
  }, 0);
  const shipping = selectedItems.length > 0 ? 30000 : 0;

  const toggleItem = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === items.length ? [] : items.map((item) => getCartItemKey(item)));
  };

  const checkoutSelected = () => {
    if (selectedItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }
    sessionStorage.setItem('checkout_items', JSON.stringify(selectedItems));
    navigate('/checkout?mode=cart-selected');
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h2 className="mb-4 text-2xl font-bold">Giỏ hàng trống</h2>
        <Link to="/products" className="btn-primary px-6 py-3">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Giỏ hàng</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <button type="button" onClick={toggleAll} className="flex items-center gap-2 font-medium">
              {selectedIds.length === items.length ? <FiCheckSquare /> : <FiSquare />}
              Chọn tất cả ({items.length})
            </button>
            <span className="text-sm text-gray-600">Đã chọn {selectedItems.length} sản phẩm</span>
          </div>

          {items.map((item) => {
            const price = item.salePrice || item.price;
            const itemKey = getCartItemKey(item);
            const selected = selectedIds.includes(itemKey) || selectedIds.includes(item._id);
            const selectedAttributes = Object.entries(item.selectedAttributes || {}).filter(([, value]) => value);
            return (
              <div key={itemKey} className="mb-4 flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleItem(itemKey)}
                  className={`p-2 ${selected ? 'text-primary-600' : 'text-gray-400'}`}
                  aria-label={selected ? 'Bỏ chọn sản phẩm' : 'Chọn sản phẩm'}
                >
                  {selected ? <FiCheckSquare /> : <FiSquare />}
                </button>
                <img src={item.images?.[0] || '/placeholder.png'} alt={item.title} className="h-24 w-24 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-medium">{item.title}</h3>
                  {selectedAttributes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-500">
                      {selectedAttributes.map(([key, value]) => (
                        <span key={key} className="rounded-full bg-gray-100 px-2 py-0.5">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-bold text-primary-600">{price.toLocaleString('vi-VN')} đ</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(itemKey, item.quantity - 1)} className="rounded p-2 hover:bg-gray-100">
                    <FiMinus />
                  </button>
                  <span className="w-12 text-center">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(itemKey, item.quantity + 1)} className="rounded p-2 hover:bg-gray-100">
                    <FiPlus />
                  </button>
                </div>
                <button type="button" onClick={() => removeItem(itemKey)} className="p-2 text-red-600">
                  <FiTrash2 />
                </button>
              </div>
            );
          })}
        </div>

        <div className="h-fit rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">Tóm tắt</h3>
          <div className="mb-2 flex justify-between">
            <span>Tạm tính:</span>
            <span className="font-bold">{subtotal.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="mb-4 flex justify-between border-b pb-4">
            <span>Phí vận chuyển:</span>
            <span>{shipping.toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="mb-6 flex justify-between text-xl font-bold">
            <span>Tổng:</span>
            <span className="text-primary-600">{(subtotal + shipping).toLocaleString('vi-VN')} đ</span>
          </div>
          <button type="button" onClick={checkoutSelected} className="btn-primary w-full py-3">
            Thanh toán sản phẩm đã chọn
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
