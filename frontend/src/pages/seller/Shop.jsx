import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';
import apiClient from '../../api/client';
import { addressAPI } from '../../api/address';
import ImagePasteInput from '../../components/ImagePasteInput';

const emptyForm = {
  shopName: '',
  description: '',
  logoUrl: '',
  bannerUrl: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  provinceCode: '',
  district: '',
  districtCode: '',
  ward: '',
  wardCode: ''
};

const SellerShop = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [logoFiles, setLogoFiles] = useState([]);
  const [bannerFiles, setBannerFiles] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

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

  const fetchShop = async () => {
    try {
      const response = await apiClient.get('/seller/shop');
      const shopData = response.data;
      setShop(shopData);

      if (shopData) {
        const address = shopData.address || {};
        setFormData({
          shopName: shopData.shopName || '',
          description: shopData.description || '',
          logoUrl: shopData.logoUrl || '',
          bannerUrl: shopData.bannerUrl || '',
          phone: shopData.phone || '',
          email: shopData.email || '',
          street: address.street || '',
          city: address.city || '',
          provinceCode: address.provinceCode || '',
          district: address.district || '',
          districtCode: address.districtCode || '',
          ward: address.ward || '',
          wardCode: address.wardCode || ''
        });
        loadDistricts(address.provinceCode).then((provinceData) => {
          if (provinceData?.mode !== 'province_ward' && address.districtCode) loadWards(address.districtCode);
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Không thể tải thông tin shop');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
    addressAPI.getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleProvinceChange = async (event) => {
    const provinceCode = event.target.value;
    const province = provinces.find((item) => String(item.code) === provinceCode);
    setFormData((current) => ({
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
    setFormData((current) => ({
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
    setFormData((current) => ({
      ...current,
      wardCode,
      ward: ward?.name || ''
    }));
  };

  const uploadSingleImage = async (file) => {
    if (!file) return '';
    const uploadData = new FormData();
    uploadData.append('file', file);
    const response = await apiClient.post('/uploads/single', uploadData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data?.url || '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const uploadedLogoUrl = await uploadSingleImage(logoFiles[0]);
      const uploadedBannerUrl = await uploadSingleImage(bannerFiles[0]);
      const payload = {
        shopName: formData.shopName,
        description: formData.description,
        logoUrl: uploadedLogoUrl || formData.logoUrl,
        bannerUrl: uploadedBannerUrl || formData.bannerUrl,
        phone: formData.phone,
        email: formData.email,
        address: {
          street: formData.street,
          ward: formData.ward,
          wardCode: formData.wardCode,
          district: formData.district,
          districtCode: formData.districtCode,
          city: formData.city,
          provinceCode: formData.provinceCode
        }
      };

      if (shop) {
        await apiClient.put('/seller/shop', payload);
        toast.success('Cập nhật thông tin shop thành công');
      } else {
        await apiClient.post('/seller/shop', payload);
        toast.success('Tạo shop thành công');
      }

      setLogoFiles([]);
      setBannerFiles([]);
      fetchShop();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner border-primary-600"></div>
      </div>
    );
  }

  const usesDistrictLevel = districts.length > 0;

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">
        {shop ? 'Quản lý cửa hàng' : 'Tạo cửa hàng'}
      </h1>
      <p className="mb-8 text-gray-600">
        {shop ? 'Cập nhật thông tin cửa hàng của bạn' : 'Thiết lập thông tin cửa hàng để bắt đầu bán hàng'}
      </p>

      <form onSubmit={handleSubmit} className="card max-w-4xl p-6">
        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-medium">
              Tên cửa hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="shopName"
              required
              value={formData.shopName}
              onChange={handleChange}
              className="input w-full"
              placeholder="Nhập tên cửa hàng"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Mô tả</label>
            <textarea
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              className="input w-full"
              placeholder="Giới thiệu về cửa hàng của bạn"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ImagePasteInput
              title="Logo shop"
              files={logoFiles}
              onFilesChange={setLogoFiles}
              urls={formData.logoUrl}
              onUrlsChange={(value) => setFormData((current) => ({ ...current, logoUrl: value.trim() }))}
              multiple={false}
              maxFiles={1}
              urlLabel="Hoặc nhập URL logo"
              urlPlaceholder="https://example.com/logo.png"
            />
            <ImagePasteInput
              title="Banner shop"
              files={bannerFiles}
              onFilesChange={setBannerFiles}
              urls={formData.bannerUrl}
              onUrlsChange={(value) => setFormData((current) => ({ ...current, bannerUrl: value.trim() }))}
              multiple={false}
              maxFiles={1}
              urlLabel="Hoặc nhập URL banner"
              urlPlaceholder="https://example.com/banner.png"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-bold">Thông tin liên hệ</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="input w-full" placeholder="0123456789" />
              </div>
              <div>
                <label className="mb-2 block font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="input w-full" placeholder="shop@example.com" />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="mb-4 text-lg font-bold">Địa chỉ lấy hàng</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <select className="input w-full" value={formData.provinceCode} onChange={handleProvinceChange} required>
                <option value="">{formData.city && !formData.provinceCode ? formData.city : 'Chọn Tỉnh/Thành phố *'}</option>
                {provinces.map((province) => <option key={province.code} value={province.code}>{province.name}</option>)}
              </select>
              <select className={`input w-full ${usesDistrictLevel ? '' : 'hidden'}`} value={formData.districtCode} onChange={handleDistrictChange} disabled={!formData.provinceCode} required={usesDistrictLevel}>
                <option value="">{formData.district && !formData.districtCode ? formData.district : 'Chọn Quận/Huyện *'}</option>
                {districts.map((district) => <option key={district.code} value={district.code}>{district.name}</option>)}
              </select>
              <select className="input w-full" value={formData.wardCode} onChange={handleWardChange} disabled={!formData.provinceCode || (usesDistrictLevel && !formData.districtCode)} required>
                <option value="">{formData.ward && !formData.wardCode ? formData.ward : 'Chọn Phường/Xã *'}</option>
                {wards.map((ward) => <option key={ward.code} value={ward.code}>{ward.name}</option>)}
              </select>
              <input
                type="text"
                name="street"
                required
                value={formData.street}
                onChange={handleChange}
                className="input w-full md:col-span-3"
                placeholder="Số nhà, tên đường"
              />
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving} className="btn-primary flex items-center px-6 py-3">
              <FiSave className="mr-2" />
              {saving ? 'Đang lưu...' : shop ? 'Cập nhật' : 'Tạo cửa hàng'}
            </button>
          </div>
        </div>
      </form>

      {shop && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-6">
            <div className="mb-1 text-sm text-gray-600">Đánh giá trung bình</div>
            <div className="text-2xl font-bold">{shop.ratingAvg || 0} sao</div>
          </div>
          <div className="card p-6">
            <div className="mb-1 text-sm text-gray-600">Tổng đánh giá</div>
            <div className="text-2xl font-bold">{shop.ratingCount || 0}</div>
          </div>
          <div className="card p-6">
            <div className="mb-1 text-sm text-gray-600">Trạng thái</div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${shop.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {shop.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerShop;
