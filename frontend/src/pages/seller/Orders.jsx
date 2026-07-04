import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPackage, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const params = filter !== 'ALL' ? { status: filter } : {};
      const response = await axios.get('http://localhost:5000/api/seller/orders', {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const apiData = response?.data?.data;
      const ordersArray = Array.isArray(apiData?.orders)
        ? apiData.orders
        : Array.isArray(apiData)
          ? apiData
          : [];
      setOrders(ordersArray);
    } catch (error) {
      toast.error('Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/seller/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Cập nhật trạng thái thành công');
      fetchOrders();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PLACED: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PACKED: 'bg-purple-100 text-purple-800',
      PICKED_UP: 'bg-indigo-100 text-indigo-800',
      IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    const labels = {
      PLACED: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      PACKED: 'Đã đóng gói',
      PICKED_UP: 'Đã lấy hàng',
      IN_TRANSIT: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
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
        {['ALL', 'PLACED', 'CONFIRMED', 'PACKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {status === 'ALL' ? 'Tất cả' : getStatusBadge(status).props.children}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {!Array.isArray(orders) || orders.length === 0 ? (
        <div className="card p-6 text-center">
          <FiPackage className="mx-auto w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-600">Không có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-lg">#{order.orderNumber}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                {getStatusBadge(order.orderStatus)}
              </div>

              {/* Customer Info */}
              <div className="border-t pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Khách hàng</div>
                    <div>{order.shippingAddress?.recipientName}</div>
                    <div className="text-sm text-gray-600">{order.shippingAddress?.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Địa chỉ giao hàng</div>
                    <div className="text-sm">
                      {order.shippingAddress?.street}, {order.shippingAddress?.city}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4 mb-4">
                <div className="text-sm font-medium text-gray-600 mb-2">Sản phẩm ({order.items?.length})</div>
                <div className="space-y-2">
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3 text-sm">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-gray-600">x{item.quantity}</div>
                      </div>
                      <div className="font-medium">{item.price.toLocaleString()} ₫</div>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div className="text-sm text-gray-600">... và {order.items.length - 3} sản phẩm khác</div>
                  )}
                </div>
              </div>

              {/* Total & Actions */}
              <div className="border-t pt-4 flex items-center justify-between">
                <div className="text-lg font-bold text-primary-600">
                  Tổng: {order.totals?.grandTotal.toLocaleString()} ₫
                </div>
                <div className="flex space-x-2">
                  {order.orderStatus === 'PLACED' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order._id, 'CONFIRMED')}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        <FiCheckCircle className="inline mr-1" />
                        Xác nhận
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order._id, 'CANCELLED')}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        <FiXCircle className="inline mr-1" />
                        Hủy
                      </button>
                    </>
                  )}
                  {order.orderStatus === 'CONFIRMED' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'PACKED')}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      <FiPackage className="inline mr-1" />
                      Đã đóng gói
                    </button>
                  )}
                  {order.orderStatus === 'PACKED' && (
                    <div className="text-sm text-gray-600 flex items-center">
                      <FiClock className="mr-1" />
                      Chờ shipper lấy hàng
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerOrders;
