import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { adminAPI } from '../api/admin';

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    maxDiscount: '',
    minOrderValue: 0,
    usageLimit: '',
    usageLimitPerUser: 1,
    validFrom: '',
    validUntil: '',
    applicableTo: 'all',
    isActive: true
  });

  useEffect(() => {
    fetchPromotions();
  }, [pagination.page]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPromotions({ page: pagination.page });
      setPromotions(response.data.data.promotions);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
      alert('Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPromotion) {
        await adminAPI.updatePromotion(editingPromotion._id, formData);
        alert('Cập nhật khuyến mãi thành công');
      } else {
        await adminAPI.createPromotion(formData);
        alert('Tạo khuyến mãi thành công');
      }
      
      setShowModal(false);
      resetForm();
      fetchPromotions();
    } catch (error) {
      console.error('Failed to save promotion:', error);
      alert(error.response?.data?.message || 'Không thể lưu khuyến mãi');
    }
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      description: promotion.description || '',
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscount: promotion.maxDiscount || '',
      minOrderValue: promotion.minOrderValue || 0,
      usageLimit: promotion.usageLimit || '',
      usageLimitPerUser: promotion.usageLimitPerUser || 1,
      validFrom: promotion.validFrom ? new Date(promotion.validFrom).toISOString().slice(0, 16) : '',
      validUntil: promotion.validUntil ? new Date(promotion.validUntil).toISOString().slice(0, 16) : '',
      applicableTo: promotion.applicableTo || 'all',
      isActive: promotion.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (promotionId) => {
    if (confirm('Bạn có chắc muốn xóa khuyến mãi này?')) {
      try {
        await adminAPI.deletePromotion(promotionId);
        alert('Xóa khuyến mãi thành công');
        fetchPromotions();
      } catch (error) {
        console.error('Failed to delete promotion:', error);
        alert('Không thể xóa khuyến mãi');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      maxDiscount: '',
      minOrderValue: 0,
      usageLimit: '',
      usageLimitPerUser: 1,
      validFrom: '',
      validUntil: '',
      applicableTo: 'all',
      isActive: true
    });
    setEditingPromotion(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý Khuyến mãi</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          <Plus size={20} />
          Tạo khuyến mãi
        </button>
      </div>

      {/* Promotions List */}
      {loading ? (
        <div className="text-center py-8">Đang tải...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giảm giá</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn tối thiểu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sử dụng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hiệu lực</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((promo) => (
                <tr key={promo._id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{promo.code}</div>
                    <div className="text-sm text-gray-500">{promo.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    {promo.discountType === 'percentage' 
                      ? `${promo.discountValue}%`
                      : `${promo.discountValue.toLocaleString()} VNĐ`}
                    {promo.maxDiscount && (
                      <div className="text-sm text-gray-500">
                        Tối đa: {promo.maxDiscount.toLocaleString()} VNĐ
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {promo.minOrderValue.toLocaleString()} VNĐ
                  </td>
                  <td className="px-6 py-4">
                    {promo.usedCount}/{promo.usageLimit || '∞'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>{new Date(promo.validFrom).toLocaleDateString('vi-VN')}</div>
                    <div className="text-gray-500">
                      đến {new Date(promo.validUntil).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {promo.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                        Tắt
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(promo)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(promo._id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingPromotion ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mã khuyến mãi *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    disabled={!!editingPromotion}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Loại giảm giá *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Giá trị giảm *</label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    min="0"
                  />
                </div>

                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Giảm tối đa (VNĐ)</label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn hàng tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Giới hạn sử dụng</label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hiệu lực từ *</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hiệu lực đến *</label>
                  <input
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium">Kích hoạt ngay</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
