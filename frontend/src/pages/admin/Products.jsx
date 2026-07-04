import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiXCircle, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [filter, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const isApproved = filter === 'approved' ? 'true' : filter === 'pending' ? 'false' : undefined;
      
      const response = await axios.get('http://localhost:5000/api/admin/products', {
        params: { page, limit: 20, isApproved },
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data?.data || {};
      setProducts(Array.isArray(payload.products) ? payload.products : []);
      setPagination(payload.pagination || {});
    } catch (error) {
      toast.error('Không tải được danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const approveProduct = async (productId, approved) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/admin/products/${productId}/approve`,
        { approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(approved ? 'Đã duyệt sản phẩm' : 'Đã từ chối sản phẩm');
      fetchProducts();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const openRejectModal = (product) => {
    setSelectedProduct(product);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.patch(
        `http://localhost:5000/api/admin/products/${selectedProduct._id}/approve`,
        { approved: false, reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Đã từ chối sản phẩm');
      setShowRejectModal(false);
      fetchProducts();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`http://localhost:5000/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
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
      <h1 className="text-3xl font-bold mb-8">Quản lý sản phẩm</h1>

      {/* Filters */}
      <div className="flex space-x-2 mb-6">
        {['pending', 'approved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img src={product.images[0]} alt={product.title} className="w-16 h-16 object-cover rounded" />
                      <div className="ml-4">
                        <div className="font-medium">{product.title}</div>
                        <div className="text-sm text-gray-500">{product.brand || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{product.sellerId?.shopName || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{product.price.toLocaleString()} ₫</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.isApproved
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!product.isApproved && (
                      <>
                        <button
                          onClick={() => approveProduct(product._id, true)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Duyệt"
                        >
                          <FiCheckCircle className="inline" />
                        </button>
                        <button
                          onClick={() => openRejectModal(product)}
                          className="text-red-600 hover:text-red-900 mr-3"
                          title="Từ chối"
                        >
                          <FiXCircle className="inline" />
                        </button>
                      </>
                    )}
                    {product.isApproved && (
                      <button
                        onClick={() => openRejectModal(product)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                        title="Gỡ duyệt"
                      >
                        <FiXCircle className="inline" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteProduct(product._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Xóa"
                    >
                      <FiTrash2 className="inline" />
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Từ chối sản phẩm</h2>
            <p className="text-gray-600 mb-4">
              Bạn đang từ chối sản phẩm <strong>{selectedProduct?.title}</strong>.
              Vui lòng nhập lý do từ chối:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="input w-full h-32 resize-none"
              placeholder="Nhập lý do từ chối..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
