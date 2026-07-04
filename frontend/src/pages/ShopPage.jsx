import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiMessageSquare, FiPackage, FiShoppingBag, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { shopAPI } from '../api/features';
import ProductCard from '../components/ProductCard';
import useAuthStore from '../store/authStore';

const formatAddress = (address) => {
  if (!address) return 'Việt Nam';
  if (typeof address === 'string') return address;
  return [address.street, address.ward, address.district, address.city, address.country]
    .filter(Boolean)
    .join(', ') || 'Việt Nam';
};

const getTotalSold = (products) => products.reduce((sum, product) => sum + (product.soldCount || 0), 0);

const ShopPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchShop();
  }, [slug, sort]);

  const fetchShop = async (page = 1) => {
    try {
      setLoading(true);
      const response = await shopAPI.getBySlug(slug, { page, limit: 20, sort });
      setShop(response.data.shop);
      setProducts(response.data.products || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      setShop(null);
      toast.error('Không tìm thấy shop');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSold = shop?.stats?.totalSold ?? getTotalSold(products);
    return [
      { label: 'Sản phẩm', value: shop?.stats?.totalProducts || pagination.total || products.length, icon: FiPackage },
      { label: 'Lượt mua', value: totalSold, icon: FiShoppingBag },
      { label: 'Đánh giá', value: shop?.ratingCount || shop?.stats?.totalReviews || 0, icon: FiStar },
      { label: 'Điểm shop', value: Number(shop?.ratingAvg || 0).toFixed(1), icon: FiStar }
    ];
  }, [pagination.total, products, shop]);

  const handleChat = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để chat với shop');
      navigate('/login');
      return;
    }
    navigate(`/messages?shopId=${shop._id}&shopName=${encodeURIComponent(shop.shopName || 'Shop')}`);
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="spinner mx-auto border-primary-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">Shop không tồn tại</h1>
        <Link to="/products" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          Quay lại mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 pb-12">
      <section className="bg-slate-900 text-white">
        <div className="container py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <img
                src={shop.logoUrl || '/default-shop.png'}
                alt={shop.shopName}
                className="h-24 w-24 rounded-full border-4 border-white/20 object-cover"
              />
              <div>
                <h1 className="text-3xl font-bold">{shop.shopName}</h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-200">
                  <span className="flex items-center gap-1">
                    <FiMapPin /> {formatAddress(shop.address)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiCalendar /> Tham gia {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {shop.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">{shop.description}</p>
                )}
              </div>
            </div>

            <button type="button" onClick={handleChat} className="btn bg-white px-5 py-3 text-slate-900 hover:bg-slate-100">
              <FiMessageSquare className="mr-2 h-5 w-5" />
              Chat với seller
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg bg-white/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-200">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <div className="text-2xl font-bold">{Number(item.value || 0).toLocaleString('vi-VN')}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <main className="container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Sản phẩm đang bán</h2>
            <p className="text-sm text-gray-500">Có thể thêm vào giỏ hoặc mua ngay từ từng sản phẩm.</p>
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="input w-48">
            <option value="newest">Mới nhất</option>
            <option value="popular">Bán chạy</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="rating">Đánh giá cao</option>
          </select>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg bg-white py-16 text-center text-gray-500">
            Shop chưa có sản phẩm đang bán
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: pagination.pages }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => fetchShop(index + 1)}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  pagination.page === index + 1
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopPage;
