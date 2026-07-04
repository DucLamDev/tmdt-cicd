import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiImage, FiSave, FiUpload, FiX } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const defaultFormData = {
  title: '',
  description: '',
  categories: '',
  brand: '',
  price: '',
  salePrice: '',
  stock: '',
  images: '',
  color: '',
  size: '',
  storage: '',
  ram: '',
  material: '',
  capacity: '',
  attributesText: '',
  specifications: ''
};

const knownAttributeKeys = ['color', 'size', 'storage', 'ram', 'material', 'capacity'];

const parseKeyValueText = (value = '') => {
  const result = {};
  value.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      result[key.trim()] = valueParts.join(':').trim();
    }
  });
  return result;
};

const stringifyUnknownAttributes = (attributes = {}) => Object.entries(attributes)
  .filter(([key]) => !knownAttributeKeys.includes(key))
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/api/seller/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const product = response.data.data;
      const attributes = product.attributes || {};

      setFormData({
        title: product.title || '',
        description: product.description || '',
        categories: product.categories?.join(', ') || '',
        brand: product.brand || '',
        price: product.price || '',
        salePrice: product.salePrice || '',
        stock: product.stock || '',
        images: product.images?.join('\n') || '',
        color: attributes.color || '',
        size: attributes.size || '',
        storage: attributes.storage || '',
        ram: attributes.ram || '',
        material: attributes.material || '',
        capacity: attributes.capacity || '',
        attributesText: stringifyUnknownAttributes(attributes),
        specifications: product.specifications
          ? Object.entries(product.specifications).map(([key, value]) => `${key}: ${value}`).join('\n')
          : ''
      });
    } catch (error) {
      toast.error('Không tải được sản phẩm');
      navigate('/seller/products');
    }
  };

  const uploadProductImages = async (token) => {
    if (imageFiles.length === 0) return [];

    const uploadData = new FormData();
    imageFiles.forEach((file) => uploadData.append('productImages', file));

    const response = await axios.post(`${API_URL}/api/uploads/products`, uploadData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return (response.data.data || []).map((file) => file.url).filter(Boolean);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const uploadedImages = await uploadProductImages(token);
      const urlImages = formData.images
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);
      const images = [...uploadedImages, ...urlImages];

      if (images.length === 0) {
        toast.error('Vui lòng chọn ảnh từ máy hoặc nhập ít nhất một URL ảnh');
        return;
      }

      const baseAttributes = {
        color: formData.color,
        size: formData.size,
        storage: formData.storage,
        ram: formData.ram,
        material: formData.material,
        capacity: formData.capacity
      };
      const attributes = {
        ...parseKeyValueText(formData.attributesText),
        ...Object.fromEntries(Object.entries(baseAttributes).filter(([, value]) => String(value || '').trim()))
      };

      const payload = {
        title: formData.title,
        description: formData.description,
        categories: formData.categories.split(',').map((category) => category.trim()).filter(Boolean),
        brand: formData.brand,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
        stock: parseInt(formData.stock, 10),
        images,
        attributes,
        specifications: parseKeyValueText(formData.specifications)
      };

      if (id) {
        await axios.put(`${API_URL}/api/seller/products/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await axios.post(`${API_URL}/api/seller/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tạo sản phẩm thành công');
      }

      navigate('/seller/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const appendImageFiles = (files) => {
    if (!files.length) return;
    setImageFiles((current) => [...current, ...files].slice(0, 10));
  };

  const handleImageFileChange = (event) => {
    appendImageFiles(Array.from(event.target.files || []));
  };

  const handleImagePaste = (event) => {
    const pastedFiles = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.type?.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!pastedFiles.length) return;
    event.preventDefault();
    appendImageFiles(pastedFiles);
  };

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">
        {id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      </h1>

      <form onSubmit={handleSubmit} className="card max-w-4xl p-6">
        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-medium">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="input w-full"
              placeholder="Nhập tên sản phẩm"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Mô tả <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              required
              rows="5"
              value={formData.description}
              onChange={handleChange}
              className="input w-full"
              placeholder="Mô tả chi tiết về sản phẩm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">Danh mục</label>
              <input
                type="text"
                name="categories"
                value={formData.categories}
                onChange={handleChange}
                className="input w-full"
                placeholder="VD: Thời trang, Áo hoặc Điện thoại, Smartphone"
              />
              <p className="mt-1 text-sm text-gray-600">Phân cách nhiều danh mục bằng dấu phẩy.</p>
            </div>

            <div>
              <label className="mb-2 block font-medium">Thương hiệu</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="input w-full"
                placeholder="VD: Apple, Samsung, Local Brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-medium">
                Giá <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                step="1000"
                value={formData.price}
                onChange={handleChange}
                className="input w-full"
                placeholder="Giá gốc (VND)"
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Giá khuyến mãi</label>
              <input
                type="number"
                name="salePrice"
                min="0"
                step="1000"
                value={formData.salePrice}
                onChange={handleChange}
                className="input w-full"
                placeholder="Giá sau giảm (VND)"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Số lượng tồn kho <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="stock"
              required
              min="0"
              value={formData.stock}
              onChange={handleChange}
              className="input w-full"
              placeholder="Số lượng sản phẩm"
            />
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4" onPaste={handleImagePaste} tabIndex={0}>
            <div className="mb-3 flex items-center gap-2 font-semibold text-blue-800">
              <FiUpload />
              Ảnh sản phẩm
            </div>
            <label className="mb-2 block font-medium">Chọn ảnh từ máy</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFileChange}
              className="block w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
            />
            <div className="mt-3 rounded-lg border border-dashed border-blue-200 bg-white px-3 py-3 text-sm font-medium text-slate-600">
              Dán ảnh đã copy vào vùng này
            </div>
            {imageFiles.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {imageFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                    <FiImage className="text-blue-600" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block font-medium">Hoặc nhập URL ảnh</label>
              <textarea
                name="images"
                rows="4"
                value={formData.images}
                onChange={handleChange}
                className="input w-full bg-white"
                placeholder="Mỗi URL một dòng. Ảnh upload từ máy sẽ được ưu tiên làm ảnh đại diện."
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h2 className="mb-3 text-lg font-bold">Thuộc tính lựa chọn</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-medium">Màu sắc</label>
                <input name="color" value={formData.color} onChange={handleChange} className="input w-full bg-white" placeholder="VD: Đen, Trắng, Titan xanh" />
              </div>
              <div>
                <label className="mb-2 block font-medium">Size</label>
                <input name="size" value={formData.size} onChange={handleChange} className="input w-full bg-white" placeholder="VD: S, M, L, XL hoặc 39, 40, 41" />
              </div>
              <div>
                <label className="mb-2 block font-medium">Dung lượng</label>
                <input name="storage" value={formData.storage} onChange={handleChange} className="input w-full bg-white" placeholder="VD: 128GB, 256GB, 512GB" />
              </div>
              <div>
                <label className="mb-2 block font-medium">RAM</label>
                <input name="ram" value={formData.ram} onChange={handleChange} className="input w-full bg-white" placeholder="VD: 8GB, 16GB" />
              </div>
              <div>
                <label className="mb-2 block font-medium">Chất liệu</label>
                <input name="material" value={formData.material} onChange={handleChange} className="input w-full bg-white" placeholder="VD: Cotton, da, nhôm" />
              </div>
              <div>
                <label className="mb-2 block font-medium">Dung tích/Kích thước khác</label>
                <input name="capacity" value={formData.capacity} onChange={handleChange} className="input w-full bg-white" placeholder="VD: 500ml, 45mm" />
              </div>
            </div>
            <textarea
              name="attributesText"
              rows="3"
              value={formData.attributesText}
              onChange={handleChange}
              className="input mt-4 w-full bg-white"
              placeholder="Thuộc tính khác, mỗi dòng theo format: Tên: Giá trị"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Thông số kỹ thuật</label>
            <textarea
              name="specifications"
              rows="5"
              value={formData.specifications}
              onChange={handleChange}
              className="input w-full"
              placeholder="Mỗi thông số một dòng theo format: Tên: Giá trị&#10;VD:&#10;Màn hình: 6.1 inch&#10;CPU: A15 Bionic&#10;Pin: 5000mAh"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex items-center px-6 py-3">
              <FiSave className="mr-2" />
              {loading ? 'Đang xử lý...' : id ? 'Cập nhật' : 'Tạo sản phẩm'}
            </button>
            <button type="button" onClick={() => navigate('/seller/products')} className="btn-secondary flex items-center px-6 py-3">
              <FiX className="mr-2" />
              Hủy
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
