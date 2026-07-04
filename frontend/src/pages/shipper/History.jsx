import { useState, useEffect } from 'react';
import { FiCalendar, FiTruck } from 'react-icons/fi';
import * as shipperAPI from '../../api/shipper';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const History = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  useEffect(() => {
    fetchHistory();
  }, [filters, pagination.page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await shipperAPI.getDeliveryHistory({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });
      setHistory(response.data.orders);
      setStats(response.data.stats);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Không thể tải lịch sử giao hàng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lịch sử giao hàng</h1>
        <p className="text-gray-600">Xem lại các đơn đã giao</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
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
            <button onClick={fetchHistory} className="btn-primary w-full">
              Áp dụng
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Giao thành công</div>
            <div className="text-3xl font-bold text-green-600">{stats.delivered || 0}</div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Giao thất bại</div>
            <div className="text-3xl font-bold text-red-600">{stats.failed || 0}</div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Tổng COD đã thu</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.totalCODCollected?.toLocaleString() || 0} ₫
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="card p-6">
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Đơn hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày giao
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">#{order.orderNumber}</div>
                      <div className="text-sm text-gray-500">{order.sellerId?.shopName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{order.buyerId?.name}</div>
                      <div className="text-xs text-gray-500">{order.buyerId?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.actualDelivery
                        ? new Date(order.actualDelivery).toLocaleDateString('vi-VN')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderStatusBadge status={order.orderStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">
                        {order.totals?.grandTotal?.toLocaleString()} ₫
                      </div>
                      {order.paymentMethod === 'cod' && (
                        <div className="text-xs text-yellow-600">COD</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="btn-outline px-3 py-1 text-sm disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="px-3 py-1">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="btn-outline px-3 py-1 text-sm disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FiTruck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Chưa có lịch sử giao hàng</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
