import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { FiEdit, FiTrash2, FiPlus, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SellerProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/seller/products', {
        params: { page, limit: 10 }
      });
      setProducts(response.data.products || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Không tải được sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;

    try {
      await api.delete(`/seller/products/${id}`);
      toast.success('Xóa sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  const toggleProductStatus = async (id, currentStatus) => {
    try {
      await api.patch(`/seller/products/${id}`, { isActive: !currentStatus });
      toast.success(currentStatus ? 'Đã ẩn sản phẩm' : 'Đã hiện sản phẩm');
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
        <Link to="/seller/products/new" className="btn-primary px-4 py-2 flex items-center">
          <FiPlus className="mr-2" />
          Thêm sản phẩm
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-gray-600 mb-4">Chưa có sản phẩm nào</p>
          <Link to="/seller/products/new" className="btn-primary px-6 py-3 inline-block">
            Thêm sản phẩm đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tồn kho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img 
                            src={product.images[0]} 
                            alt={product.title} 
                            className="w-12 h-12 object-cover rounded" 
                          />
                          <div className="ml-4">
                            <div className="font-medium">{product.title}</div>
                            <div className="text-sm text-gray-500">{product.brand || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{product.price.toLocaleString()} ₫</div>
                        {product.salePrice && (
                          <div className="text-sm text-red-600">{product.salePrice.toLocaleString()} ₫</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.stock > 10 ? 'bg-green-100 text-green-800' :
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.isActive && product.isApproved ? 'bg-green-100 text-green-800' :
                          !product.isApproved ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.isActive && product.isApproved ? 'Đang bán' :
                           !product.isApproved ? 'Chờ duyệt' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleProductStatus(product._id, product.isActive)}
                          className="text-gray-600 hover:text-gray-900 mr-3"
                          title={product.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
                        >
                          {product.isActive ? <FiEyeOff /> : <FiEye />}
                        </button>
                        <Link 
                          to={`/seller/products/edit/${product._id}`} 
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <FiEdit className="inline" />
                        </Link>
                        <button 
                          onClick={() => deleteProduct(product._id)} 
                          className="text-red-600 hover:text-red-900"
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
        </>
      )}
    </div>
  );
};

export default SellerProducts;
