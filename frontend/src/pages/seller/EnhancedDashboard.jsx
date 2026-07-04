import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiShoppingBag, FiPackage, FiTrendingUp, FiAlertCircle, FiStar } from 'react-icons/fi';
import * as sellerAPI from '../../api/seller';
import StatCard from '../../components/StatCard';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const EnhancedDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await sellerAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!stats) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Bạn chưa tạo shop</h2>
        <p className="text-gray-600 mb-6">Hãy tạo shop để bắt đầu bán hàng</p>
        <Link to="/seller/shop" className="btn-primary px-6 py-3 inline-block">
          Tạo shop ngay
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Tổng quan hoạt động kinh doanh</p>
        </div>
        <Link to="/seller/reports" className="btn-outline px-4 py-2">
          Xem báo cáo chi tiết
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Tổng doanh thu"
          value={`${stats.revenue?.total?.toLocaleString() || 0} ₫`}
          subtitle={`Hôm nay: ${stats.revenue?.today?.toLocaleString() || 0} ₫`}
          icon={FiDollarSign}
          color="green"
        />
        <StatCard
          title="Đơn hàng"
          value={stats.orders?.total || 0}
          subtitle={`Hôm nay: ${stats.orders?.today || 0} đơn`}
          icon={FiShoppingBag}
          color="blue"
        />
        <StatCard
          title="Đơn chờ xử lý"
          value={stats.orders?.pending || 0}
          subtitle="Cần xác nhận"
          icon={FiAlertCircle}
          color="yellow"
        />
        <StatCard
          title="Sản phẩm"
          value={stats.products?.total || 0}
          subtitle={`Đang bán: ${stats.products?.active || 0}`}
          icon={FiPackage}
          color="purple"
        />
        <StatCard
          title="Rating shop"
          value={`${Number(stats.rating?.average || 0).toFixed(1)}/5`}
          subtitle={`${stats.rating?.count || 0} đánh giá`}
          icon={FiStar}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Sản phẩm bán chạy</h3>
            <Link to="/seller/reports" className="text-primary-600 text-sm hover:underline">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-3">
            {stats.topSellingProducts && stats.topSellingProducts.length > 0 ? (
              stats.topSellingProducts.map((product) => (
                <div key={product._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={product.images?.[0] || '/placeholder.png'}
                    alt={product.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.title}</div>
                    <div className="text-sm text-gray-600">
                      Đã bán: {product.soldCount} | {product.price?.toLocaleString()} ₫
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Đơn hàng gần đây</h3>
            <Link to="/seller/orders" className="text-primary-600 text-sm hover:underline">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">#{order.orderNumber}</div>
                    <div className="text-sm text-gray-600">
                      {order.buyerId?.name || 'Khách hàng'}
                    </div>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={order.orderStatus} />
                    <div className="text-sm font-medium mt-1">
                      {order.totals?.grandTotal?.toLocaleString()} ₫
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có đơn hàng</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/seller/products/new"
          className="card p-6 hover:shadow-lg transition-shadow text-center"
        >
          <FiPackage className="w-8 h-8 mx-auto mb-2 text-primary-600" />
          <div className="font-medium">Thêm sản phẩm mới</div>
        </Link>
        <Link
          to="/seller/messages"
          className="card p-6 hover:shadow-lg transition-shadow text-center"
        >
          <FiAlertCircle className="w-8 h-8 mx-auto mb-2 text-primary-600" />
          <div className="font-medium">Tin nhắn từ khách</div>
        </Link>
        <Link
          to="/seller/inventory"
          className="card p-6 hover:shadow-lg transition-shadow text-center"
        >
          <FiTrendingUp className="w-8 h-8 mx-auto mb-2 text-primary-600" />
          <div className="font-medium">Kiểm tra tồn kho</div>
        </Link>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
