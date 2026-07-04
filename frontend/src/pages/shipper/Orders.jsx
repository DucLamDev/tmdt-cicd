import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiMapPin, FiNavigation } from 'react-icons/fi';
import * as shipperAPI from '../../api/shipper';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  const statusFilter = searchParams.get('status') || '';

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, pagination.page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await shipperAPI.getMyOrders({
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setOrders(response.data.orders);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Không thể tải đơn hàng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = async (orderId) => {
    try {
      setActionLoading(true);
      await shipperAPI.pickupOrder(orderId, { note });
      toast.success('Đã nhận đơn hàng. Hãy đến shop lấy hàng!');
      setNote('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Không thể nhận đơn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPickup = async (orderId) => {
    try {
      setActionLoading(true);
      await shipperAPI.confirmPickup(orderId, { note });
      toast.success('Đã xác nhận lấy hàng');
      setNote('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Không thể xác nhận lấy hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInTransit = async (orderId) => {
    try {
      setActionLoading(true);
      await shipperAPI.updateToInTransit(orderId, { note });
      toast.success('Đã cập nhật đang giao hàng');
      setNote('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (orderId) => {
    try {
      setActionLoading(true);
      await shipperAPI.deliverOrder(orderId, {
        note,
        codCollected: selectedOrder?.paymentMethod === 'cod',
        collectedAmount: selectedOrder?.codAmount
      });
      toast.success('Đã giao hàng thành công');
      setNote('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Không thể xác nhận giao hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFail = async (orderId) => {
    if (!failureReason.trim()) {
      toast.error('Vui lòng nhập lý do giao hàng thất bại');
      return;
    }

    try {
      setActionLoading(true);
      await shipperAPI.failDelivery(orderId, {
        reason: failureReason,
        note
      });
      toast.success('Đã cập nhật giao hàng thất bại');
      setNote('');
      setFailureReason('');
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const openDirections = (address) => {
    const parts = [address?.street, address?.ward, address?.district, address?.city].filter(Boolean);
    if (!parts.length) {
      toast.error('Địa chỉ chưa đủ để mở chỉ đường');
      return;
    }
    const destination = encodeURIComponent(parts.join(', '));
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đơn hàng của tôi</h1>
        <p className="text-gray-600">Quản lý đơn hàng đã nhận</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'ASSIGNED', label: 'Chờ lấy hàng' },
          { value: 'PICKED_UP', label: 'Đã lấy hàng' },
          { value: 'IN_TRANSIT', label: 'Đang giao' },
          { value: 'DELIVERED', label: 'Đã giao' },
          { value: 'FAILED', label: 'Thất bại' },
        ].map((status) => (
          <button
            key={status.value}
            onClick={() => setSearchParams({ status: status.value })}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              statusFilter === status.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {status.label}
          </button>
        ))}
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders List */}
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`card p-6 cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedOrder?._id === order._id ? 'border-2 border-primary-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-lg">#{order.orderNumber}</div>
                    <div className="text-sm text-gray-600">
                      {order.buyerId?.name} - {order.buyerId?.phone}
                    </div>
                  </div>
                  <OrderStatusBadge status={order.orderStatus} />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <FiMapPin className="text-primary-600 mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Địa chỉ giao hàng:</div>
                      <div className="text-gray-600">
                        {order.shippingAddress?.street}, {order.shippingAddress?.ward},{' '}
                        {order.shippingAddress?.district}, {order.shippingAddress?.city}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDirections(order.shippingAddress);
                    }}
                    className="mt-2 flex items-center gap-2 rounded-lg border border-primary-100 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
                  >
                    <FiNavigation /> Chỉ đường giao hàng
                  </button>

                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Tổng tiền:</span>
                    <span className="font-bold">{order.totals?.grandTotal?.toLocaleString()} ₫</span>
                  </div>

                  {order.paymentMethod === 'cod' && (
                    <div className="bg-yellow-50 p-2 rounded">
                      <span className="text-yellow-700 font-medium text-xs">
                        COD: {order.codAmount?.toLocaleString()} ₫
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
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

          {/* Order Detail & Actions */}
          <div>
            {selectedOrder ? (
              <div className="card p-6 sticky top-4">
                <h3 className="font-bold text-lg mb-4">Chi tiết đơn hàng</h3>
                
                {/* Seller Info */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Người bán:</div>
                  <div className="font-medium">{selectedOrder.sellerId?.shopName}</div>
                  <div className="text-sm text-gray-600">
                    {selectedOrder.sellerId?.phone}
                  </div>
                  {selectedOrder.sellerId?.address && (
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedOrder.sellerId.address.street}, {selectedOrder.sellerId.address.city}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openDirections(selectedOrder.sellerId?.address)}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-white"
                  >
                    <FiNavigation /> Chỉ đường tới shop
                  </button>
                </div>

                {/* Products */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Sản phẩm:</div>
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-3 mb-2 p-2 bg-gray-50 rounded">
                      <img
                        src={item.image || '/placeholder.png'}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-gray-600">x{item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Ghi chú</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows="2"
                    className="input w-full"
                    placeholder="Nhập ghi chú (không bắt buộc)"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Step 1: Accept order (PACKED -> ASSIGNED) */}
                  {selectedOrder.orderStatus === 'PACKED' && (
                    <button
                      onClick={() => handlePickup(selectedOrder._id)}
                      disabled={actionLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <FiCheckCircle />
                      Nhận đơn này
                    </button>
                  )}

                  {/* Step 2: Confirm pickup (ASSIGNED -> PICKED_UP) */}
                  {selectedOrder.orderStatus === 'ASSIGNED' && (
                    <button
                      onClick={() => handleConfirmPickup(selectedOrder._id)}
                      disabled={actionLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <FiPackage />
                      Xác nhận đã lấy hàng
                    </button>
                  )}

                  {/* Step 3: Start delivery (PICKED_UP -> IN_TRANSIT) */}
                  {selectedOrder.orderStatus === 'PICKED_UP' && (
                    <button
                      onClick={() => handleInTransit(selectedOrder._id)}
                      disabled={actionLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <FiTruck />
                      Bắt đầu giao hàng
                    </button>
                  )}

                  {/* Step 4: Deliver or fail (IN_TRANSIT only) */}
                  {selectedOrder.orderStatus === 'IN_TRANSIT' && (
                    <>
                      <button
                        onClick={() => handleDeliver(selectedOrder._id)}
                        disabled={actionLoading}
                        className="btn-success w-full flex items-center justify-center gap-2"
                      >
                        <FiCheckCircle />
                        Giao hàng thành công
                      </button>

                      <div className="border-t pt-2 mt-2">
                        <input
                          type="text"
                          value={failureReason}
                          onChange={(e) => setFailureReason(e.target.value)}
                          placeholder="Lý do giao hàng thất bại"
                          className="input w-full mb-2"
                        />
                        <button
                          onClick={() => handleFail(selectedOrder._id)}
                          disabled={actionLoading}
                          className="btn-danger w-full flex items-center justify-center gap-2"
                        >
                          <FiXCircle />
                          Giao hàng thất bại
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center text-gray-500">
                <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Chọn một đơn hàng để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-500">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Không có đơn hàng nào</p>
          <Link to="/shipper/available-orders" className="btn-primary mt-4 inline-block">
            Xem đơn hàng khả dụng
          </Link>
        </div>
      )}
    </div>
  );
};

export default Orders;
