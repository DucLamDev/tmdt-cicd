import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { FiDollarSign, FiShoppingBag, FiPackage, FiTrendingUp } from 'react-icons/fi';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const SellerDashboard = () => {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchShopData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/seller/shop', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShop(response.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  useRealtimeRefresh(['dashboard:update', 'message:new'], fetchShopData, 10000);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner border-primary-600"></div></div>;
  }

  if (!shop) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Bạn chưa tạo shop</h2>
        <p className="text-gray-600 mb-6">Hãy tạo shop để bắt đầu bán hàng</p>
        <a href="/seller/shop" className="btn-primary px-6 py-3">Tạo shop ngay</a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Chào mừng trở lại, {shop.shopName}</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-1">Tổng doanh thu</div>
          <div className="text-2xl font-bold text-primary-600">
            {shop.stats?.totalRevenue?.toLocaleString() || 0} ₫
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-1">Đơn hàng</div>
          <div className="text-2xl font-bold">{shop.stats?.totalOrders || 0}</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FiPackage className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-1">Sản phẩm</div>
          <div className="text-2xl font-bold">{shop.stats?.totalProducts || 0}</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FiTrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-1">Đánh giá</div>
          <div className="text-2xl font-bold">{shop.ratingAvg || 0} ⭐</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Thông tin Shop</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Tên shop</div>
              <div className="font-medium">{shop.shopName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Địa chỉ</div>
              <div className="font-medium">{shop.address?.city || 'Chưa cập nhật'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Trạng thái</div>
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  shop.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {shop.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Hành động nhanh</h3>
          <div className="space-y-3">
            <a href="/seller/products" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <div className="font-medium">Quản lý sản phẩm</div>
              <div className="text-sm text-gray-600">Thêm, sửa, xóa sản phẩm</div>
            </a>
            <a href="/seller/orders" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
              <div className="font-medium">Quản lý đơn hàng</div>
              <div className="text-sm text-gray-600">Xử lý đơn hàng mới</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
