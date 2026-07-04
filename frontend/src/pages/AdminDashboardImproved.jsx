import { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminAPI } from '../api/admin';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const AdminDashboardImproved = () => {
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, revenueRes] = await Promise.all([
        adminAPI.getDashboardStats(dateRange),
        adminAPI.getRevenueReport({
          ...dateRange,
          groupBy: 'day'
        })
      ]);

      setStats(statsRes.data.data);
      
      // Format revenue data for charts
      const formattedRevenue = revenueRes.data.data.map(item => ({
        date: `${item._id.day}/${item._id.month}`,
        revenue: item.totalRevenue,
        orders: item.totalOrders
      })).reverse();
      
      setRevenueData(formattedRevenue);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.exportSystemReport(dateRange);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao-cao-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Không thể xuất báo cáo');
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Đang tải dữ liệu...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers?.toLocaleString() || '0',
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.newUsers || 0} mới`,
      changeColor: 'text-green-600'
    },
    {
      title: 'Sản phẩm',
      value: stats.totalProducts?.toLocaleString() || '0',
      icon: Package,
      color: 'bg-green-500',
      change: `${stats.pendingProducts || 0} chờ duyệt`,
      changeColor: 'text-orange-600'
    },
    {
      title: 'Đơn hàng',
      value: stats.totalOrders?.toLocaleString() || '0',
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'Doanh thu',
      value: `${(stats.totalRevenue || 0).toLocaleString()} VNĐ`,
      icon: DollarSign,
      color: 'bg-yellow-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Tổng quan hệ thống</p>
        </div>
        
        <div className="flex gap-4">
          {/* Date Range Filter */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="text-white" size={24} />
              </div>
              {stat.change && (
                <span className={`text-sm font-medium ${stat.changeColor}`}>
                  {stat.change}
                </span>
              )}
            </div>
            <div>
              <p className="text-gray-600 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Doanh thu theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `${value.toLocaleString()} VNĐ`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                name="Doanh thu"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Số đơn hàng theo ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="orders" 
                fill="#10B981" 
                name="Đơn hàng"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Thống kê nhanh
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="text-gray-700">Đơn hàng trung bình/ngày</span>
              <span className="font-semibold">
                {revenueData.length > 0 
                  ? Math.round(revenueData.reduce((sum, d) => sum + d.orders, 0) / revenueData.length)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-700">Doanh thu trung bình/đơn</span>
              <span className="font-semibold">
                {stats.totalOrders > 0
                  ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()
                  : 0} VNĐ
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
              <span className="text-gray-700">Sản phẩm/người bán</span>
              <span className="font-semibold">
                {stats.totalProducts && stats.totalUsers
                  ? Math.round(stats.totalProducts / Math.max(stats.totalUsers * 0.1, 1))
                  : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Cần xử lý
          </h3>
          <div className="space-y-3">
            {stats.pendingProducts > 0 && (
              <a
                href="/admin/products?isApproved=false"
                className="block p-3 bg-orange-50 rounded hover:bg-orange-100 transition"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Sản phẩm chờ duyệt</span>
                  <span className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-semibold">
                    {stats.pendingProducts}
                  </span>
                </div>
              </a>
            )}
            
            <a
              href="/admin/approvals"
              className="block p-3 bg-blue-50 rounded hover:bg-blue-100 transition"
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Tài khoản chờ duyệt</span>
                <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-semibold">
                  Kiểm tra
                </span>
              </div>
            </a>
            
            <a
              href="/admin/payments"
              className="block p-3 bg-yellow-50 rounded hover:bg-yellow-100 transition"
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Thanh toán chờ xác nhận</span>
                <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm font-semibold">
                  Xem
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Truy cập nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="/admin/users"
              className="p-3 bg-gray-50 rounded text-center hover:bg-gray-100 transition"
            >
              <Users size={24} className="mx-auto mb-1 text-gray-600" />
              <span className="text-sm text-gray-700">Người dùng</span>
            </a>
            <a
              href="/admin/products"
              className="p-3 bg-gray-50 rounded text-center hover:bg-gray-100 transition"
            >
              <Package size={24} className="mx-auto mb-1 text-gray-600" />
              <span className="text-sm text-gray-700">Sản phẩm</span>
            </a>
            <a
              href="/admin/orders"
              className="p-3 bg-gray-50 rounded text-center hover:bg-gray-100 transition"
            >
              <ShoppingCart size={24} className="mx-auto mb-1 text-gray-600" />
              <span className="text-sm text-gray-700">Đơn hàng</span>
            </a>
            <a
              href="/admin/promotions"
              className="p-3 bg-gray-50 rounded text-center hover:bg-gray-100 transition"
            >
              <DollarSign size={24} className="mx-auto mb-1 text-gray-600" />
              <span className="text-sm text-gray-700">Khuyến mãi</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardImproved;
