import { useState, useEffect } from 'react';
import { Check, X, Eye, ExternalLink } from 'lucide-react';
import { paymentAPI } from '../api/payments';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    fetchPendingPayments();
  }, [pagination.page]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPendingPayments({ page: pagination.page });
      setPayments(response.data.data.payments);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch pending payments:', error);
      alert('Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (paymentId, verified) => {
    try {
      await paymentAPI.verifyPayment(paymentId, {
        verified,
        notes: verificationNotes
      });
      
      alert(verified ? 'Đã xác nhận thanh toán' : 'Đã từ chối thanh toán');
      setSelectedPayment(null);
      setVerificationNotes('');
      fetchPendingPayments();
    } catch (error) {
      console.error('Failed to verify payment:', error);
      alert('Không thể xác nhận thanh toán');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Xác nhận thanh toán</h1>
        <p className="text-gray-600 mt-1">
          Quản lý và xác nhận các giao dịch chuyển khoản ngân hàng
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Check size={64} className="mx-auto" />
          </div>
          <p className="text-gray-600">Không có thanh toán nào cần xác nhận</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment._id} className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Đơn hàng: {payment.orderId?.orderNumber || 'N/A'}
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Khách hàng: {payment.userId?.name}</div>
                        <div>Email: {payment.userId?.email}</div>
                        {payment.userId?.phone && (
                          <div>SĐT: {payment.userId?.phone}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {payment.amount.toLocaleString()} VNĐ
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(payment.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* Bank Transfer Details */}
                  {payment.bankTransferDetails && (
                    <div className="bg-gray-50 rounded p-4 space-y-2">
                      <h4 className="font-medium mb-2">Thông tin chuyển khoản:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Ngân hàng:</span>
                          <div className="font-medium">{payment.bankTransferDetails.bankName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Số tài khoản:</span>
                          <div className="font-medium">{payment.bankTransferDetails.accountNumber}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tên tài khoản:</span>
                          <div className="font-medium">{payment.bankTransferDetails.accountName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Mã giao dịch:</span>
                          <div className="font-medium">{payment.bankTransferDetails.transferCode || 'N/A'}</div>
                        </div>
                      </div>
                      {payment.bankTransferDetails.notes && (
                        <div className="mt-2">
                          <span className="text-gray-600">Ghi chú:</span>
                          <div className="text-sm">{payment.bankTransferDetails.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Proof Image */}
                <div>
                  {payment.bankTransferDetails?.proofImage ? (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Ảnh chứng từ:
                      </label>
                      <div className="relative">
                        <img
                          src={payment.bankTransferDetails.proofImage}
                          alt="Proof of transfer"
                          className="w-full h-48 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => {
                            setSelectedImage(payment.bankTransferDetails.proofImage);
                            setShowImageModal(true);
                          }}
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(payment.bankTransferDetails.proofImage);
                            setShowImageModal(true);
                          }}
                          className="absolute bottom-2 right-2 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Không có ảnh chứng từ
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      <Check size={18} />
                      Xác nhận
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setVerificationNotes('');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <X size={18} />
                      Từ chối
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPagination({ ...pagination, page })}
              className={`px-4 py-2 rounded ${
                page === pagination.page
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Xác nhận thanh toán
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Đơn hàng: <strong>{selectedPayment.orderId?.orderNumber}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Số tiền: <strong>{selectedPayment.amount.toLocaleString()} VNĐ</strong>
              </p>
              
              <label className="block text-sm font-medium mb-2">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Ghi chú về xác nhận thanh toán..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setVerificationNotes('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleVerify(selectedPayment._id, false)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Từ chối
              </button>
              <button
                onClick={() => handleVerify(selectedPayment._id, true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="max-w-4xl w-full">
            <img
              src={selectedImage}
              alt="Proof of transfer"
              className="w-full h-auto rounded"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white text-black p-2 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
