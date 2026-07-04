import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiPackage, FiEdit } from 'react-icons/fi';
import * as sellerAPI from '../../api/seller';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);

  useEffect(() => {
    fetchInventoryAlerts();
  }, [threshold]);

  const fetchInventoryAlerts = async () => {
    try {
      setLoading(true);
      const response = await sellerAPI.getInventoryAlerts({ threshold });
      setAlerts(response.data);
    } catch (error) {
      toast.error('Không thể tải cảnh báo tồn kho');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý tồn kho</h1>
          <p className="text-gray-600">Theo dõi và cảnh báo sản phẩm sắp hết hàng</p>
        </div>
        <Link to="/seller/products" className="btn-outline px-4 py-2">
          Quản lý sản phẩm
        </Link>
      </div>

      {/* Threshold Setting */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium">Ngưỡng cảnh báo:</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
            min="1"
            max="100"
            className="input w-32"
          />
          <span className="text-gray-600 text-sm">
            Cảnh báo khi số lượng tồn ≤ {threshold}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 mb-1">Sản phẩm sắp hết</div>
              <div className="text-4xl font-bold text-yellow-600">
                {alerts?.alerts?.lowStockCount || 0}
              </div>
            </div>
            <div className="p-4 bg-yellow-100 rounded-lg">
              <FiAlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 mb-1">Sản phẩm hết hàng</div>
              <div className="text-4xl font-bold text-red-600">
                {alerts?.alerts?.outOfStockCount || 0}
              </div>
            </div>
            <div className="p-4 bg-red-100 rounded-lg">
              <FiPackage className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Out of Stock Products */}
      {alerts?.outOfStock && alerts.outOfStock.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiPackage className="text-red-600" />
            <h3 className="font-bold text-lg">Sản phẩm hết hàng ({alerts.outOfStock.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Đã bán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tồn kho
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alerts.outOfStock.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium">{product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{product.soldCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        Hết hàng
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/seller/products/edit/${product._id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiEdit size={16} />
                        Cập nhật
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock Products */}
      {alerts?.lowStock && alerts.lowStock.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="text-yellow-600" />
            <h3 className="font-bold text-lg">Sản phẩm sắp hết ({alerts.lowStock.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Đã bán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Còn lại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alerts.lowStock.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium">{product.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-600">{product.soldCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        product.stock <= 5
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.stock} sản phẩm
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/seller/products/edit/${product._id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FiEdit size={16} />
                        Nhập thêm
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Alerts */}
      {(!alerts?.lowStock || alerts.lowStock.length === 0) &&
       (!alerts?.outOfStock || alerts.outOfStock.length === 0) && (
        <div className="card p-12 text-center">
          <FiPackage className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Tất cả sản phẩm đều có đủ tồn kho</p>
        </div>
      )}
    </div>
  );
};

export default Inventory;
