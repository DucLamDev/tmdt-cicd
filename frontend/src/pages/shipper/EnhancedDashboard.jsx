import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTruck, FiCheckCircle, FiXCircle, FiDollarSign, FiClock, FiStar } from 'react-icons/fi';
import * as shipperAPI from '../../api/shipper';
import StatCard from '../../components/StatCard';
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
      const response = await shipperAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Không thể tải dữ liệu dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Shipper</h1>
        <p className="text-gray-600">Tổng quan hoạt động giao hàng</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Tổng giao hàng"
          value={stats?.deliveries?.total || 0}
          subtitle={`Hôm nay: ${stats?.deliveries?.today || 0}`}
          icon={FiTruck}
          color="blue"
        />
        <StatCard
          title="Giao thành công"
          value={stats?.deliveries?.successful || 0}
          subtitle={`Tỷ lệ: ${stats?.deliveries?.total > 0 
            ? Math.round((stats.deliveries.successful / stats.deliveries.total) * 100)
            : 0}%`}
          icon={FiCheckCircle}
          color="green"
        />
        <StatCard
          title="Giao thất bại"
          value={stats?.deliveries?.failed || 0}
          icon={FiXCircle}
          color="red"
        />
        <StatCard
          title="COD hôm nay"
          value={`${stats?.cod?.todayTotal?.toLocaleString() || 0} ₫`}
          icon={FiDollarSign}
          color="yellow"
        />
        <StatCard
          title="Đánh giá sao"
          value={`${Number(stats?.rating?.average || 0).toFixed(1)}/5`}
          subtitle={`${stats?.rating?.count || 0} đánh giá`}
          icon={FiStar}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Current Tasks */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Nhiệm vụ hiện tại</h3>
          <div className="space-y-4">
            <Link
              to="/shipper/available-orders"
              className="block p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiClock className="text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-medium">Đơn chờ lấy hàng</div>
                    <div className="text-sm text-gray-600">Cần nhận từ người bán</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.tasks?.pendingPickups || 0}
                </div>
              </div>
            </Link>

            <Link
              to="/shipper/orders?status=IN_TRANSIT"
              className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiTruck className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">Đang giao hàng</div>
                    <div className="text-sm text-gray-600">Đơn đang trên đường</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.tasks?.inTransit || 0}
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-4">Hành động nhanh</h3>
          <div className="space-y-3">
            <Link
              to="/shipper/available-orders"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">Xem đơn hàng khả dụng</div>
              <div className="text-sm text-gray-600">Chọn đơn hàng để giao</div>
            </Link>
            <Link
              to="/shipper/orders"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">Đơn hàng của tôi</div>
              <div className="text-sm text-gray-600">Quản lý đơn đã nhận</div>
            </Link>
            <Link
              to="/shipper/cod"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">Quản lý COD</div>
              <div className="text-sm text-gray-600">Xem & nộp tiền COD</div>
            </Link>
            <Link
              to="/shipper/history"
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">Lịch sử giao hàng</div>
              <div className="text-sm text-gray-600">Xem các đơn đã giao</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4">Hiệu suất</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              {stats?.deliveries?.total > 0
                ? Math.round((stats.deliveries.successful / stats.deliveries.total) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Tỷ lệ giao thành công</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {stats?.deliveries?.today || 0}
            </div>
            <div className="text-sm text-gray-600">Đơn giao hôm nay</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {(stats?.tasks?.pendingPickups || 0) + (stats?.tasks?.inTransit || 0)}
            </div>
            <div className="text-sm text-gray-600">Đơn đang xử lý</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
