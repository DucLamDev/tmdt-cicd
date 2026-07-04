import { useState, useEffect } from 'react';
import { FiDownload, FiCalendar } from 'react-icons/fi';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as sellerAPI from '../../api/seller';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Reports = () => {
  const [salesReport, setSalesReport] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day',
    period: 30
  });

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [salesRes, bestRes] = await Promise.all([
        sellerAPI.getSalesReport({
          startDate: filters.startDate,
          endDate: filters.endDate,
          groupBy: filters.groupBy
        }),
        sellerAPI.getBestSellers({ period: filters.period, limit: 20 })
      ]);
      
      setSalesReport(salesRes.data);
      setBestSellers(bestRes.data);
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
        period: filters.period
      });

      const response = await fetch(`${backendURL}/api/seller/reports/export?${params}`, {
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
      a.download = `bao-cao-ban-hang-${Date.now()}.xlsx`;
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
          <h1 className="text-3xl font-bold mb-2">Báo cáo bán hàng</h1>
          <p className="text-gray-600">Phân tích chi tiết doanh số và sản phẩm</p>
        </div>
        <button 
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <FiDownload />
          Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_180px_160px]">
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
          <div>
            <label className="block text-sm font-medium mb-2">Nhóm theo</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="input w-full"
            >
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              <FiCalendar /> Áp dụng
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {salesReport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Tổng đơn hàng</div>
            <div className="text-3xl font-bold text-primary-600">
              {salesReport.summary?.totalOrders || 0}
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Tổng doanh thu</div>
            <div className="text-3xl font-bold text-green-600">
              {salesReport.summary?.totalRevenue?.toLocaleString() || 0} ₫
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Giá trị TB/đơn</div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(salesReport.summary?.avgOrderValue || 0).toLocaleString()} ₫
            </div>
          </div>
        </div>
      )}

      {/* Sales Chart Data */}
      {salesReport?.salesData && salesReport.salesData.length > 0 && (
        <div className="card p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">Biểu đồ doanh thu</h3>
          <div className="mb-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesReport.salesData.map((item) => ({ ...item, date: item._id }))}>
                <defs>
                  <linearGradient id="sellerRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000000)}tr`} />
                <Tooltip formatter={(value, name) => name === 'totalRevenue' ? `${Number(value).toLocaleString('vi-VN')}đ` : value} />
                <Area type="monotone" dataKey="totalRevenue" name="Doanh thu" stroke="#2563eb" fill="url(#sellerRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TB/đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {salesReport.salesData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{item._id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.totalOrders}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {item.totalRevenue.toLocaleString()} ₫
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {Math.round(item.avgOrderValue).toLocaleString()} ₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Best Sellers */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Top sản phẩm bán chạy ({filters.period} ngày)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đã bán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bestSellers.map((product, index) => (
                <tr key={product._id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image || '/placeholder.png'}
                        alt={product.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <span className="font-medium">{product.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {product.totalQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                    {product.totalRevenue.toLocaleString()} ₫
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Math.round(product.avgPrice).toLocaleString()} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Performance */}
      {salesReport?.categoryPerformance && salesReport.categoryPerformance.length > 0 && (
        <div className="card p-6 mt-6">
          <h3 className="font-bold text-lg mb-4">Hiệu suất theo danh mục</h3>
          <div className="space-y-3">
            {salesReport.categoryPerformance.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{cat._id || 'Chưa phân loại'}</div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Đã bán: {cat.totalSold}</div>
                  <div className="font-medium text-green-600">
                    {cat.totalRevenue.toLocaleString()} ₫
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
