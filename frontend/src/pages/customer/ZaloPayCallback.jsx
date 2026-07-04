import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../api/payments';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';

const ZaloPayCallback = () => {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const response = await paymentAPI.verifyZaloPayReturn(params);
        setResult(response);
      } catch (error) {
        setResult({
          success: false,
          message: 'Không thể xác minh kết quả thanh toán',
          data: {}
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <FiLoader className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
        <h2 className="text-xl font-semibold">Đang xác minh thanh toán ZaloPay...</h2>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto card p-8 text-center">
        {result?.success ? (
          <>
            <FiCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Thanh toán ZaloPay thành công!</h2>
            <p className="text-gray-600 mb-4">{result.message}</p>
            {result.data?.appTransId && (
              <p className="text-sm text-gray-500 mb-4">
                Mã giao dịch: <strong>{result.data.appTransId}</strong>
              </p>
            )}
          </>
        ) : (
          <>
            <FiXCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Thanh toán ZaloPay thất bại</h2>
            <p className="text-gray-600 mb-4">{result?.message || 'Giao dịch không thành công'}</p>
          </>
        )}

        <div className="flex gap-4 justify-center mt-6">
          <Link to="/orders" className="btn-primary px-6 py-2">Đơn hàng của tôi</Link>
          <Link to="/" className="btn-outline px-6 py-2">Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
};

export default ZaloPayCallback;
