import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit, FiMapPin, FiPlus, FiStar, FiTrash2, FiX } from 'react-icons/fi';
import { addressAPI } from '../api/address';
import { isValidVietnamPhone } from '../utils/validation';

const emptyForm = {
  label: '',
  recipientName: '',
  phone: '',
  city: '',
  provinceCode: '',
  district: '',
  districtCode: '',
  ward: '',
  wardCode: '',
  street: '',
  isDefault: false
};

const AddressManager = ({ onDefaultChange }) => {
  const [addresses, setAddresses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await addressAPI.list();
      const data = response.data || [];
      setAddresses(data);
      onDefaultChange?.(data.find((item) => item.isDefault));
    } catch {
      toast.error('Không thể tải danh sách địa chỉ');
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (provinceCode) => {
    if (!provinceCode) {
      setDistricts([]);
      setWards([]);
      return [];
    }
    const provinceData = await addressAPI.getProvinceWithDistricts(provinceCode);
    const nextDistricts = provinceData?.districts || [];
    const nextWards = provinceData?.wards || [];
    setDistricts(nextDistricts);
    setWards(nextWards);
    return provinceData;
  };

  const loadWards = async (districtCode) => {
    if (!districtCode) {
      setWards([]);
      return [];
    }
    const districtData = await addressAPI.getDistrictWithWards(districtCode);
    const nextWards = districtData?.wards || [];
    setWards(nextWards);
    return nextWards;
  };

  useEffect(() => {
    loadAddresses();
    addressAPI.getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDistricts([]);
    setWards([]);
  };

  const startEdit = (address) => {
    setEditingId(address._id);
    setForm({
      label: address.label || '',
      recipientName: address.recipientName || '',
      phone: address.phone || '',
      city: address.city || '',
      provinceCode: address.provinceCode || '',
      district: address.district || '',
      districtCode: address.districtCode || '',
      ward: address.ward || '',
      wardCode: address.wardCode || '',
      street: address.street || '',
      isDefault: Boolean(address.isDefault)
    });
    loadDistricts(address.provinceCode).then((provinceData) => {
      if (provinceData?.mode !== 'province_ward' && address.districtCode) loadWards(address.districtCode);
    });
  };

  const handleProvinceChange = async (event) => {
    const provinceCode = event.target.value;
    const province = provinces.find((item) => String(item.code) === provinceCode);
    setForm((current) => ({
      ...current,
      provinceCode,
      city: province?.name || '',
      district: '',
      districtCode: '',
      ward: '',
      wardCode: ''
    }));
    await loadDistricts(provinceCode);
  };

  const handleDistrictChange = async (event) => {
    const districtCode = event.target.value;
    const district = districts.find((item) => String(item.code) === districtCode);
    setForm((current) => ({
      ...current,
      districtCode,
      district: district?.name || '',
      ward: '',
      wardCode: ''
    }));
    await loadWards(districtCode);
  };

  const handleWardChange = (event) => {
    const wardCode = event.target.value;
    const ward = wards.find((item) => String(item.code) === wardCode);
    setForm((current) => ({
      ...current,
      wardCode,
      ward: ward?.name || ''
    }));
  };

  const validate = () => {
    if (!form.recipientName || !form.phone || !form.city || !form.ward || !form.street) {
      toast.error('Vui lòng nhập đầy đủ thông tin địa chỉ');
      return false;
    }
    if (!isValidVietnamPhone(form.phone)) {
      toast.error('Số điện thoại nhận hàng không hợp lệ');
      return false;
    }
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      if (editingId) {
        await addressAPI.update(editingId, form);
        toast.success('Đã cập nhật địa chỉ');
      } else {
        await addressAPI.create(form);
        toast.success('Đã thêm địa chỉ');
      }
      resetForm();
      loadAddresses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể lưu địa chỉ');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa địa chỉ nhận hàng này?')) return;
    try {
      await addressAPI.remove(id);
      toast.success('Đã xóa địa chỉ');
      loadAddresses();
    } catch {
      toast.error('Không thể xóa địa chỉ');
    }
  };

  const setDefault = async (id) => {
    try {
      await addressAPI.setDefault(id);
      toast.success('Đã đặt làm mặc định');
      loadAddresses();
    } catch {
      toast.error('Không thể đặt địa chỉ mặc định');
    }
  };

  const usesDistrictLevel = districts.length > 0;

  return (
    <div className="card p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Địa chỉ nhận hàng</h2>
        <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-2 px-4 py-2">
          <FiPlus /> Thêm mới
        </button>
      </div>

      <form onSubmit={submit} className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <input className="input w-full" placeholder="Nhãn địa chỉ (Nhà, Công ty...)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <input className="input w-full" placeholder="Họ tên người nhận *" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required />
        <input className="input w-full" placeholder="Số điện thoại *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <select className="input w-full" value={form.provinceCode} onChange={handleProvinceChange} required>
          <option value="">{form.city && !form.provinceCode ? form.city : 'Chọn Tỉnh/Thành phố *'}</option>
          {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
        </select>
        <select className={`input w-full ${usesDistrictLevel ? '' : 'hidden'}`} value={form.districtCode} onChange={handleDistrictChange} disabled={!form.provinceCode} required={usesDistrictLevel}>
          <option value="">{form.district && !form.districtCode ? form.district : 'Chọn Quận/Huyện *'}</option>
          {districts.map((district) => <option key={district.code} value={district.code}>{district.name}</option>)}
        </select>
        <select className="input w-full" value={form.wardCode} onChange={handleWardChange} disabled={!form.provinceCode || (usesDistrictLevel && !form.districtCode)} required>
          <option value="">{form.ward && !form.wardCode ? form.ward : 'Chọn Phường/Xã *'}</option>
          {wards.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
        </select>
        <input className="input w-full md:col-span-2" placeholder="Số nhà, tên đường *" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
          Đặt làm địa chỉ mặc định
        </label>
        <div className="flex justify-end gap-2 md:col-span-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-2 px-4 py-2">
              <FiX /> Hủy
            </button>
          )}
          <button type="submit" className="btn-primary px-5 py-2">
            {editingId ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-gray-500">Đang tải địa chỉ...</div>
      ) : addresses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-gray-500">Chưa có địa chỉ nhận hàng</div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div key={address._id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
                    <FiMapPin className="text-primary-600" />
                    {address.label || 'Địa chỉ'} {address.isDefault && <span className="rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700">Mặc định</span>}
                  </div>
                  <div>{address.recipientName} - {address.phone}</div>
                  <div className="text-sm text-gray-600">{addressAPI.formatAddressLine(address)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault && (
                    <button type="button" onClick={() => setDefault(address._id)} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
                      <FiStar className="inline" /> Mặc định
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(address)} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
                    <FiEdit className="inline" /> Sửa
                  </button>
                  <button type="button" onClick={() => remove(address._id)} className="rounded border px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <FiTrash2 className="inline" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressManager;
