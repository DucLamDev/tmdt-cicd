import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheckSquare, FiCalendar } from 'react-icons/fi';
import * as shipperAPI from '../../api/shipper';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const CODManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, pagination.page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await shipperAPI.getCODTransactions({
        status: statusFilter,
        page: pagination.page,
        limit: pagination.limit
      });
      setTransactions(response.data.transactions);
      setSummary(response.data.summary);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Không thể tải giao dịch COD');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn giao dịch cần nộp');
      return;
    }

    try {
      await shipperAPI.remitCOD({
        transactionIds: selectedIds,
        note: `Nộp tiền COD ngày ${new Date().toLocaleDateString('vi-VN')}`
      });
      toast.success('Nộp tiền COD thành công');
      setSelectedIds([]);
      fetchTransactions();
    } catch (error) {
      toast.error('Không thể nộp tiền COD');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t => t._id));
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quản lý COD</h1>
        <p className="text-gray-600">Theo dõi và nộp tiền thu hộ</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Chờ nộp</div>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.pending?.toLocaleString() || 0} ₫
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Đã nộp</div>
            <div className="text-2xl font-bold text-green-600">
              {summary.remitted?.toLocaleString() || 0} ₫
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-gray-600 mb-1">Tổng đã thu</div>
            <div className="text-2xl font-bold text-primary-600">
              {summary.totalCollected?.toLocaleString() || 0} ₫
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-4 mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          {['pending', 'remitted', 'verified'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {status === 'pending' ? 'Chờ nộp' : status === 'remitted' ? 'Đã nộp' : 'Đã xác nhận'}
            </button>
          ))}
        </div>

        {statusFilter === 'pending' && selectedIds.length > 0 && (
          <button
            onClick={handleRemit}
            className="btn-primary flex items-center gap-2"
          >
            <FiDollarSign />
            Nộp tiền ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="card p-6">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {statusFilter === 'pending' && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === transactions.length}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Đơn hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày thu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    {statusFilter === 'pending' && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(transaction._id)}
                          onChange={() => toggleSelect(transaction._id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">
                        #{transaction.orderId?.orderNumber || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.orderId?.shippingAddress?.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                      {transaction.amount?.toLocaleString()} ₫
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(transaction.collectedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : transaction.status === 'remitted'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {transaction.status === 'pending'
                          ? 'Chờ nộp'
                          : transaction.status === 'remitted'
                          ? 'Đã nộp'
                          : 'Đã xác nhận'}
                      </span>
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
                  className="btn-outline px-3 py-1 text-sm"
                >
                  Trước
                </button>
                <span className="px-3 py-1">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="btn-outline px-3 py-1 text-sm"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Không có giao dịch COD nào
          </div>
        )}
      </div>
    </div>
  );
};

export default CODManagement;
