import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentAPI } from '../../api/payments';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

const VNPayCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Đang xử lý thanh toán...');
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get all query parameters
        const params = {};
        searchParams.forEach((value, key) => {
          params[key] = value;
        });

        // Verify with backend
        const response = await paymentAPI.verifyVNPayReturn(params);

        // Note: API client interceptor already unwraps response.data
        if (response.success) {
          setStatus('success');
          setMessage(response.message);
          setOrderData(response.data);
          toast.success('Thanh toán thành công!');
          
          // Redirect to orders page after 3 seconds
          setTimeout(() => {
            navigate('/orders');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Thanh toán thất bại');
          toast.error('Thanh toán thất bại!');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Có lỗi xảy ra khi xác thực thanh toán');
        toast.error('Có lỗi xảy ra khi xác thực thanh toán');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto">
        <div className="card p-8 text-center">
          {status === 'processing' && (
            <>
              <FiLoader className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold mb-2">Đang xử lý thanh toán</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <FiCheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-green-600">Thanh toán thành công!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              
              {orderData && (
                <div className="bg-gray-50 p-4 rounded-lg text-left mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mã đơn hàng:</span>
                      <span className="font-semibold">{orderData.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mã giao dịch:</span>
                      <span className="font-semibold">{orderData.transactionNo}</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Bạn sẽ được chuyển đến trang đơn hàng trong giây lát...
              </p>
              
              <button
                onClick={() => navigate('/orders')}
                className="btn-primary mt-4"
              >
                Xem đơn hàng ngay
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <FiXCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-red-600">Thanh toán thất bại</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="btn-primary w-full"
                >
                  Xem đơn hàng
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className="btn-secondary w-full"
                >
                  Quay lại giỏ hàng
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Nếu có vấn đề, vui lòng liên hệ với chúng tôi để được hỗ trợ.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VNPayCallback;
