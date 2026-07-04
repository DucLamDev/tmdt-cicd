import { useState, useEffect } from 'react';
import { FiMapPin, FiPackage, FiCheckCircle } from 'react-icons/fi';
import * as shipperAPI from '../../api/shipper';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AvailableOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', district: '' });

  useEffect(() => {
    fetchAvailableOrders();
  }, [filters]);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const response = await shipperAPI.getAvailableOrders(filters);
      setOrders(response.data);
    } catch (error) {
      toast.error('Không thể tải đơn hàng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await shipperAPI.pickupOrder(orderId, { note: 'Đã nhận đơn hàng' });
      toast.success('Đã nhận đơn hàng thành công');
      fetchAvailableOrders();
    } catch (error) {
      toast.error('Không thể nhận đơn hàng');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đơn hàng khả dụng</h1>
        <p className="text-gray-600">Chọn đơn hàng để giao</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Lọc theo thành phố"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          className="input flex-1"
        />
        <input
          type="text"
          placeholder="Lọc theo quận/huyện"
          value={filters.district}
          onChange={(e) => setFilters({ ...filters, district: e.target.value })}
          className="input flex-1"
        />
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div key={order._id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="font-bold text-lg">#{order.orderNumber}</div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Khách hàng:</div>
                  <div className="font-medium">
                    {order.buyerId?.name} - {order.buyerId?.phone}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FiMapPin className="text-primary-600 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-600">Địa chỉ:</div>
                    <div className="text-sm">
                      {order.shippingAddress?.street}, {order.shippingAddress?.district},{' '}
                      {order.shippingAddress?.city}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="font-bold text-lg">
                    {order.totals?.grandTotal?.toLocaleString()} ₫
                  </span>
                </div>

                {order.paymentMethod === 'cod' && (
                  <div className="bg-yellow-50 p-2 rounded">
                    <span className="text-yellow-700 font-medium text-xs">
                      Thu COD: {order.codAmount?.toLocaleString()} ₫
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleAcceptOrder(order._id)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <FiCheckCircle />
                Nhận đơn này
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-500">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Không có đơn hàng khả dụng</p>
        </div>
      )}
    </div>
  );
};

export default AvailableOrders;
