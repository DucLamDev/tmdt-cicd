import { useState, useEffect } from 'react';
import { FiDownload, FiPackage, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const ShipperReports = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const backendURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${backendURL}/api/shipper/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      toast.error('Không thể tải báo cáo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const backendURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      const response = await fetch(`${backendURL}/api/shipper/reports/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể xuất báo cáo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-giao-hang-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      toast.error(error.message || 'Không thể xuất báo cáo');
      console.error(error);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Báo cáo giao hàng</h1>
          <p className="text-gray-600">Thống kê và phân tích công việc giao hàng</p>
        </div>
        <button 
          onClick={handleExportReport}
          className="btn-primary flex items-center gap-2"
        >
          <FiDownload />
          Xuất báo cáo Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Từ ngày</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Đến ngày</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="btn-primary w-full"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <FiPackage className="text-3xl text-blue-600" />
              <span className="text-sm text-gray-500">Tổng đơn</span>
            </div>
            <div className="text-2xl font-bold">{stats.deliveries?.total || 0}</div>
            <div className="text-sm text-gray-500 mt-1">
              Hôm nay: {stats.deliveries?.today || 0}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <FiCheckCircle className="text-3xl text-green-600" />
              <span className="text-sm text-gray-500">Thành công</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.deliveries?.successful || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Đã giao</div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <FiXCircle className="text-3xl text-red-600" />
              <span className="text-sm text-gray-500">Thất bại</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.deliveries?.failed || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">Giao lỗi</div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <FiDollarSign className="text-3xl text-purple-600" />
              <span className="text-sm text-gray-500">COD</span>
            </div>
            <div className="text-2xl font-bold">
              {(stats.cod?.total || 0).toLocaleString()} ₫
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Hôm nay: {(stats.cod?.today || 0).toLocaleString()} ₫
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4">Thông tin chi tiết</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Đơn đang giao</span>
            <span className="font-medium">{stats?.deliveries?.inTransit || 0}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <span className="text-gray-700">Đơn chờ lấy</span>
            <span className="font-medium">{stats?.deliveries?.pending || 0}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <span className="text-gray-700">Tỷ lệ thành công</span>
            <span className="font-medium text-green-600">
              {stats?.deliveries?.total > 0 
                ? ((stats.deliveries.successful / stats.deliveries.total) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipperReports;
