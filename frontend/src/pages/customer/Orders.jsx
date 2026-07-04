import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../../api/orders';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getUserOrders();
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container py-20 flex justify-center"><div className="spinner border-primary-600"></div></div>;
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-600 mb-4">Chưa có đơn hàng nào</p>
          <Link to="/products" className="btn-primary px-6 py-3">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link key={order._id} to={`/orders/${order._id}`} className="card p-6 block hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg">#{order.orderNumber}</div>
                  <div className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-sm">{item.title} x{item.quantity}</div>
                ))}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Tổng tiền</div>
                <div className="text-xl font-bold text-primary-600">{order.totals.grandTotal.toLocaleString()} ₫</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
