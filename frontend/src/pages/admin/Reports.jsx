import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiLock,
  FiShoppingBag,
  FiTrendingUp,
  FiUnlock,
  FiUsers
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminAPI } from '../../api/admin';

const getDefaultFilters = () => ({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
});

const currency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const getQualityStatusMeta = (status) => {
  switch (status) {
    case 'lock_recommended':
      return { label: 'Đủ cảnh báo', className: 'bg-red-100 text-red-700' };
    case 'warning':
      return { label: 'Cần cảnh báo', className: 'bg-yellow-100 text-yellow-700' };
    case 'needs_more_reviews':
      return { label: 'Chưa đủ dữ liệu', className: 'bg-slate-100 text-slate-600' };
    default:
      return { label: 'Ổn định', className: 'bg-green-100 text-green-700' };
  }
};

const AdminReports = () => {
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [qualityScores, setQualityScores] = useState({ sellers: [], shippers: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(getDefaultFilters);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes, qualityRes] = await Promise.all([
        adminAPI.getDashboardStats(),
        adminAPI.getRevenueReport(filters),
        adminAPI.getQualityScores()
      ]);

      setStats(statsRes.data || null);
      setRevenueData(revenueRes.data || []);
      setQualityScores(qualityRes.data || { sellers: [], shippers: [] });
    } catch (error) {
      toast.error('Không thể tải báo cáo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleIssueWarning = async (item, label) => {
    if (!item.id) return;
    if (item.status === 'needs_more_reviews') {
      toast.error('Chưa đủ số lượt đánh giá để gửi cảnh báo');
      return;
    }
    if (item.status === 'normal') {
      toast.success('Điểm đánh giá đang ổn định, chưa cần cảnh báo');
      return;
    }

    const role = item.role || (label === 'Seller' ? 'seller' : 'shipper');
    const reason = window.prompt(
      `Nhập nội dung cảnh báo ${label} lần ${Number(item.warningCount || 0) + 1}/${item.warningLimit || 3}:`,
      `Điểm đánh giá ${Number(item.score || 0).toFixed(1)}/5 với ${item.reviews || 0} lượt đánh giá. Vui lòng cải thiện chất lượng phục vụ trước khi tài khoản bị xem xét khóa.`
    );
    if (reason === null) return;

    try {
      const response = await adminAPI.issueQualityWarning(item.id, {
        role,
        reason,
        score: item.score,
        reviews: item.reviews
      });
      toast.success(response.data?.deliveryStatusMessage || response.message || 'Đã gửi cảnh báo');
      fetchReports();
    } catch (error) {
      toast.error('Không thể gửi cảnh báo');
    }
  };

  const handleToggleLock = async (item) => {
    if (!item.id) return;
    if (item.isActive && !item.canLock) {
      toast.error(`Cần cảnh báo đủ ${item.warningLimit || 3} lần trước khi khóa tài khoản`);
      return;
    }

    const reason = window.prompt(
      item.isActive ? 'Nhập lý do khóa tài khoản:' : 'Nhập ghi chú mở khóa:',
      item.isActive
        ? `Tài khoản đã nhận ${item.warningCount || 0}/${item.warningLimit || 3} cảnh báo chất lượng và điểm vẫn thấp.`
        : 'Mở khóa sau khi đã xử lý/cải thiện chất lượng.'
    );
    if (reason === null) return;

    try {
      await adminAPI.toggleUserLock(item.id, { reason });
      toast.success(item.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      fetchReports();
    } catch (error) {
      toast.error('Không thể cập nhật tài khoản');
    }
  };

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      const blob = await adminAPI.exportSystemReport(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-he-thong-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      toast.error(error.message || 'Không thể xuất báo cáo');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const statCards = [
    {
      label: 'Người dùng',
      icon: FiUsers,
      color: 'text-blue-600',
      value: stats?.totalUsers || 0,
      sub: `Seller: ${stats?.totalSellers || 0} | Shipper: ${stats?.totalShippers || 0}`
    },
    {
      label: 'Sản phẩm',
      icon: FiShoppingBag,
      color: 'text-purple-600',
      value: stats?.totalProducts || 0,
      sub: 'Đang hoạt động'
    },
    {
      label: 'Đơn hàng',
      icon: FiTrendingUp,
      color: 'text-orange-600',
      value: stats?.totalOrders || 0,
      sub: 'Tổng số'
    },
    {
      label: 'Doanh thu',
      icon: FiDollarSign,
      color: 'text-green-600',
      value: currency(stats?.totalRevenue),
      sub: 'Tổng cộng'
    }
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Báo cáo hệ thống</h1>
          <p className="text-gray-600">Tổng quan, doanh thu và chất lượng seller/shipper</p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiDownload className="h-4 w-4" />
          {isExporting ? 'Đang xuất file...' : 'Xuất báo cáo Excel'}
        </button>
      </div>

      <div className="card mb-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Từ ngày</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Đến ngày</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
              className="input w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReports}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
            >
              <FiFilter className="h-4 w-4" />
              Áp dụng
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Icon className={`text-3xl ${card.color}`} />
                  <span className="text-sm text-gray-500">{card.label}</span>
                </div>
                <div className="text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString('vi-VN') : card.value}</div>
                <div className="mt-1 text-sm text-gray-500">{card.sub}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mb-8 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold">Điểm đánh giá Seller/Shipper</h3>
          <p className="mt-1 text-sm text-gray-600">
            Tài khoản điểm thấp cần được cảnh báo khoảng 3 lần trước khi admin cân nhắc khóa.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            ['Seller', qualityScores.sellers || []],
            ['Shipper', qualityScores.shippers || []]
          ].map(([label, rows]) => (
            <div key={label} className="overflow-x-auto">
              <h4 className="mb-3 font-semibold">{label}</h4>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Tên</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Điểm</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Cảnh báo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Số lần</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((item) => {
                    const statusMeta = getQualityStatusMeta(item.status);
                    const warningCount = Number(item.warningCount || 0);
                    const warningLimit = Number(item.warningLimit || 3);
                    const canWarn = item.isActive && item.status === 'warning' && warningCount < warningLimit;
                    const canToggleLock = !item.isActive || item.canLock;

                    return (
                      <tr key={item.id || item.shopId}>
                        <td className="px-3 py-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.email}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {Number(item.score || 0).toFixed(1)}/5 ({item.reviews || 0})
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold">{warningCount}/{warningLimit}</div>
                          {item.lastWarningAt && (
                            <div className="text-xs text-gray-500">
                              {new Date(item.lastWarningAt).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canWarn && (
                              <button
                                onClick={() => handleIssueWarning(item, label)}
                                className="inline-flex items-center gap-1 rounded border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
                              >
                                <FiAlertTriangle /> Cảnh báo
                              </button>
                            )}
                            {canToggleLock && (
                              <button
                                onClick={() => handleToggleLock(item)}
                                className={`inline-flex items-center gap-1 rounded border px-3 py-1 text-xs font-semibold ${
                                  item.isActive
                                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                {item.isActive ? <FiLock /> : <FiUnlock />}
                                {item.isActive ? 'Khóa' : 'Mở khóa'}
                              </button>
                            )}
                            {!canWarn && !canToggleLock && (
                              <span className="text-xs font-medium text-gray-500">
                                {item.status === 'needs_more_reviews' ? 'Theo dõi thêm' : 'Không cần xử lý'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan="5">
                        Chưa có dữ liệu đánh giá
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {revenueData && revenueData.length > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-bold">Doanh thu theo thời gian</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Ngày</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Số đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueData.slice(0, 10).map((item, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-6 py-4">
                      {item._id
                        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`
                        : 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">{item.totalOrders || 0}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-green-600">
                      {currency(item.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
