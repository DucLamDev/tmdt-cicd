import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    maxDiscount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    usageLimitPerUser: 1
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('http://localhost:5000/api/admin/promotions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = response.data?.data || {};
      setPromotions(Array.isArray(payload.promotions) ? payload.promotions : []);
    } catch (error) {
      toast.error('Không tải được danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const payload = {
        code: formData.code,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        validFrom: formData.validFrom ? new Date(formData.validFrom) : new Date(),
        validUntil: new Date(formData.validUntil),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser) : 1
      };

      if (editing) {
        await axios.put(`http://localhost:5000/api/admin/promotions/${editing}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Cập nhật khuyến mãi thành công');
      } else {
        await axios.post('http://localhost:5000/api/admin/promotions', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tạo khuyến mãi thành công');
      }

      setShowForm(false);
      setEditing(null);
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        validFrom: '',
        validUntil: '',
        usageLimit: '',
        usageLimitPerUser: 1
      });
      fetchPromotions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const deletePromotion = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa khuyến mãi này?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`http://localhost:5000/api/admin/promotions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Đã xóa khuyến mãi');
      fetchPromotions();
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Quản lý khuyến mãi</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 flex items-center"
        >
          <FiPlus className="mr-2" />
          Tạo khuyến mãi
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">
            {editing ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Mã khuyến mãi *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="input w-full"
                placeholder="FREESHIP"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Loại *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className="input w-full"
              >
                <option value="percentage">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-2">Giá trị *</label>
              <input
                type="number"
                required
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="input w-full"
                placeholder={formData.discountType === 'percentage' ? '10' : '50000'}
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Đơn tối thiểu</label>
              <input
                type="number"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                className="input w-full"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Ngày kết thúc *</label>
              <input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            <button type="submit" className="btn-primary px-6 py-2">
              {editing ? 'Cập nhật' : 'Tạo'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="btn-secondary px-6 py-2"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Promotions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <div key={promo._id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-primary-600">{promo.code}</div>
                <div className="text-sm text-gray-600">
                  {promo.discountType === 'percentage' && `Giảm ${promo.discountValue}%`}
                  {promo.discountType === 'fixed' && `Giảm ${promo.discountValue.toLocaleString()} ₫`}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {promo.isActive ? 'Hoạt động' : 'Ngưng'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              {promo.minOrderValue > 0 && (
                <div>Đơn tối thiểu: {promo.minOrderValue.toLocaleString()} ₫</div>
              )}
              {promo.usageLimit && (
                <div>Giới hạn: {promo.usedCount}/{promo.usageLimit}</div>
              )}
              {promo.validUntil && (
                <div>HSD: {new Date(promo.validUntil).toLocaleDateString('vi-VN')}</div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setEditing(promo._id);
                  setFormData({
                    code: promo.code,
                    description: promo.description || '',
                    discountType: promo.discountType,
                    discountValue: promo.discountValue,
                    minOrderValue: promo.minOrderValue || '',
                    maxDiscount: promo.maxDiscount || '',
                    validFrom: promo.validFrom ? promo.validFrom.split('T')[0] : '',
                    validUntil: promo.validUntil ? promo.validUntil.split('T')[0] : '',
                    usageLimit: promo.usageLimit || '',
                    usageLimitPerUser: promo.usageLimitPerUser || 1
                  });
                  setShowForm(true);
                }}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                <FiEdit className="inline mr-1" /> Sửa
              </button>
              <button
                onClick={() => deletePromotion(promo._id)}
                className="btn-secondary px-4 py-2 text-red-600 hover:bg-red-100"
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {promotions.length === 0 && (
        <div className="card p-6 text-center text-gray-600">
          Chưa có khuyến mãi nào
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
