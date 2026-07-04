import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../api/payments';
import { FiCheckCircle, FiXCircle, FiLoader, FiCreditCard } from 'react-icons/fi';

const StripeCheckout = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const clientSecret = searchParams.get('clientSecret');
  const paymentIntentId = searchParams.get('paymentIntentId');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // In production, you would load Stripe.js and use Stripe Elements
    // For now, show a simplified payment form
    if (!clientSecret || !paymentIntentId) {
      setError('Thông tin thanh toán không hợp lệ');
    }
  }, [clientSecret, paymentIntentId]);

  const handleConfirmPayment = async () => {
    try {
      setLoading(true);
      // In production, this would use Stripe.js to confirm the payment
      // stripe.confirmCardPayment(clientSecret, { payment_method: {...} })
      
      const response = await paymentAPI.confirmStripePayment(paymentIntentId);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container py-20">
        <div className="max-w-md mx-auto card p-8 text-center">
          <FiXCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Lỗi thanh toán</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link to="/orders" className="btn-primary px-6 py-2">Đơn hàng của tôi</Link>
            <Link to="/" className="btn-outline px-6 py-2">Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="container py-20">
        <div className="max-w-md mx-auto card p-8 text-center">
          <FiCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán Stripe thành công!</h2>
          <p className="text-gray-600 mb-4">{result.message}</p>
          <div className="flex gap-4 justify-center mt-6">
            <Link to="/orders" className="btn-primary px-6 py-2">Đơn hàng của tôi</Link>
            <Link to="/" className="btn-outline px-6 py-2">Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <div className="max-w-lg mx-auto card p-8">
        <div className="text-center mb-8">
          <FiCreditCard className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
          <h2 className="text-2xl font-bold">Thanh toán Stripe</h2>
          <p className="text-gray-600 mt-2">
            Nhập thông tin thẻ để hoàn tất thanh toán
          </p>
        </div>

        {/* Stripe Elements sẽ được tích hợp ở đây */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số thẻ</label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                className="input w-full"
                maxLength="19"
              />
              <p className="text-xs text-gray-400 mt-1">Sử dụng test card: 4242 4242 4242 4242</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                <input type="text" placeholder="MM/YY" className="input w-full" maxLength="5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                <input type="text" placeholder="123" className="input w-full" maxLength="4" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <FiLoader className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <FiCreditCard className="w-5 h-5" />
              Thanh toán ngay
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          🔒 Thông tin được bảo mật bởi Stripe
        </p>
      </div>
    </div>
  );
};

export default StripeCheckout;
