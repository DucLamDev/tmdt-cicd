import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/admin/orders', {
        params: { page, limit: 20, status: statusFilter },
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data?.data || {};
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      setPagination(payload.pagination || {});
    } catch (error) {
      toast.error('Không tải được danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (orderId) => {
    try {
      setLoadingDetail(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`http://localhost:5000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedOrder(response.data?.data || null);
    } catch (error) {
      toast.error('Không tải được chi tiết đơn hàng');
    } finally {
      setLoadingDetail(false);
    }
  };

  const statusLabels = {
    '': 'Tất cả',
    'PLACED': 'Đã đặt hàng',
    'CONFIRMED': 'Đã xác nhận',
    'PACKED': 'Đã đóng gói',
    'ASSIGNED': 'Chờ lấy hàng',
    'PICKED_UP': 'Đã lấy hàng',
    'IN_TRANSIT': 'Đang giao',
    'DELIVERED': 'Đã giao',
    'CANCELLED': 'Đã hủy'
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Quản lý đơn hàng</h1>

      {/* Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['', 'PLACED', 'CONFIRMED', 'PACKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã ĐH</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">#{order.orderNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium">{order.buyerId?.name || 'N/A'}</div>
                      <div className="text-gray-500">{order.buyerId?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{order.sellerId?.shopName || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{order.totals?.grandTotal.toLocaleString()} ₫</div>
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={order.orderStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openOrderDetail(order._id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Xem chi tiết"
                    >
                      <FiEye className="inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-4 py-2 rounded-lg ${
                page === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {(selectedOrder || loadingDetail) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-xl font-bold">
                Chi tiết đơn hàng {selectedOrder?.orderNumber ? `#${selectedOrder.orderNumber}` : ''}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
                disabled={loadingDetail}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center text-gray-600">Đang tải chi tiết...</div>
            ) : selectedOrder ? (
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Khách hàng</div>
                    <div className="font-medium">{selectedOrder.buyerId?.name || 'N/A'}</div>
                    <div className="text-gray-600">{selectedOrder.buyerId?.email || 'N/A'}</div>
                    <div className="text-gray-600">{selectedOrder.buyerId?.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Shop bán</div>
                    <div className="font-medium">{selectedOrder.sellerId?.shopName || 'N/A'}</div>
                    <div className="text-gray-600">Thanh toán: {selectedOrder.paymentMethod || 'N/A'}</div>
                    <div className="mt-1"><OrderStatusBadge status={selectedOrder.orderStatus} /></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Sản phẩm</h4>
                  <div className="space-y-3">
                    {(selectedOrder.items || []).map((item, index) => (
                      <div key={`${item.productId || index}-${index}`} className="flex items-center gap-3 border rounded-lg p-3">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-14 h-14 rounded object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded bg-gray-100" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-600">
                            SL: {item.quantity || 0} x {(item.price || 0).toLocaleString()} ₫
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div className="flex justify-between py-1">
                    <span>Tạm tính</span>
                    <span>{(selectedOrder.totals?.subtotal || 0).toLocaleString()} ₫</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Phí vận chuyển</span>
                    <span>{(selectedOrder.totals?.shipping || 0).toLocaleString()} ₫</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Giảm giá</span>
                    <span>-{(selectedOrder.totals?.discount || 0).toLocaleString()} ₫</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t font-semibold text-base">
                    <span>Tổng cộng</span>
                    <span>{(selectedOrder.totals?.grandTotal || 0).toLocaleString()} ₫</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
