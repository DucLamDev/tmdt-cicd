import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Headphones,
  Mic,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Truck,
  Zap
} from 'lucide-react';
import { productsAPI } from '../api/products';
import { flashSaleAPI } from '../api/features';
import ProductCard from '../components/ProductCard';
import RecentlyViewedProducts from '../components/RecentlyViewedProducts';
import SmartRecommendations from '../components/SmartRecommendations';
import { getProductImage } from '../utils/productHelpers';

const bannerSlides = [
  {
    badge: 'Siêu deal hôm nay',
    title: 'Mua sắm nhanh hơn với các lựa chọn nổi bật mỗi ngày.',
    description: 'Điện thoại, laptop, tai nghe, thời trang và phụ kiện được gom theo nhu cầu để bạn chọn đúng món trong vài cú nhấp.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=85',
    link: '/products?sort=popular',
    cta: 'Khám phá sản phẩm',
    icon: ShoppingBag,
    overlay: 'from-white/96 via-white/84 to-sky-100/58'
  },
  {
    badge: 'Tìm kiếm thông minh',
    title: 'Tìm bằng ảnh, giọng nói hoặc mô tả món đồ bạn muốn.',
    description: 'Gợi ý theo ngữ cảnh học tập, làm việc, đi chơi, quà tặng và ngân sách để trải nghiệm mua hàng tự nhiên hơn.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=85',
    link: '/products',
    cta: 'Tìm món phù hợp',
    icon: Sparkles,
    overlay: 'from-white/95 via-emerald-50/86 to-amber-100/60'
  },
  {
    badge: 'Thời trang & lifestyle',
    title: 'Ảnh rõ, nhiều góc xem và gợi ý phối đồ dễ chọn hơn.',
    description: 'Các sản phẩm thời trang, giày, túi và phụ kiện được trình bày trực quan để bạn dễ hình dung trước khi mua.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=85',
    link: '/products?category=fashion',
    cta: 'Xem thời trang',
    icon: Shirt,
    overlay: 'from-white/95 via-rose-50/84 to-orange-100/58'
  }
];

const categoryHighlights = [
  {
    title: 'Điện thoại',
    desc: 'Camera, pin, hiệu năng',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=82',
    link: '/products?category=phone',
    icon: Smartphone
  },
  {
    title: 'Laptop làm việc',
    desc: 'Mỏng nhẹ, bền bỉ',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=82',
    link: '/products?category=laptop',
    icon: PackageCheck
  },
  {
    title: 'Âm thanh',
    desc: 'Tai nghe, loa, gaming',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=82',
    link: '/products?category=accessories',
    icon: Headphones
  },
  {
    title: 'Thời trang',
    desc: 'Áo, giày, túi dễ phối',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=82',
    link: '/products?category=fashion',
    icon: Shirt
  }
];

const brandLogos = [
  { name: 'Apple', logo: 'https://cdn.simpleicons.org/apple/111827' },
  { name: 'Samsung', logo: 'https://cdn.simpleicons.org/samsung/1428a0' },
  { name: 'Sony', logo: 'https://cdn.simpleicons.org/sony/111827' },
  { name: 'Dell', logo: 'https://cdn.simpleicons.org/dell/0076ce' },
  { name: 'Xiaomi', logo: 'https://cdn.simpleicons.org/xiaomi/ff6900' },
  { name: 'Logitech', logo: '/logitech-g-logo.svg' },
  { name: 'Nike', logo: 'https://cdn.simpleicons.org/nike/111827' },
  { name: 'Adidas', logo: 'https://cdn.simpleicons.org/adidas/111827' },
  { name: 'Uniqlo', logo: 'https://cdn.simpleicons.org/uniqlo/ff0000' },
  { name: 'Lenovo', logo: 'https://cdn.simpleicons.org/lenovo/e2231a' }
];

const movingGalleryRows = [
  [
    {
      title: 'Góc công nghệ',
      label: 'Điện thoại, laptop',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=technology'
    },
    {
      title: 'Bàn làm việc',
      label: 'Setup gọn gàng',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=study'
    },
    {
      title: 'Tai nghe nổi bật',
      label: 'Âm thanh, gaming',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=accessories'
    },
    {
      title: 'Thời trang mới',
      label: 'Outfit cuối tuần',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=fashion'
    },
    {
      title: 'Đồng hồ thông minh',
      label: 'Sức khỏe mỗi ngày',
      image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=watch'
    }
  ],
  [
    {
      title: 'Phụ kiện nhanh',
      label: 'Sạc, chuột, phím',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=accessories'
    },
    {
      title: 'Laptop hiệu năng',
      label: 'Học tập, làm việc',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=laptop'
    },
    {
      title: 'Gợi ý thông minh',
      label: 'Theo nhu cầu thật',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=82',
      link: '/products'
    },
    {
      title: 'Giày và túi',
      label: 'Đi chơi, đi làm',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=82',
      link: '/products?category=fashion'
    },
    {
      title: 'Deal trong ngày',
      label: 'Giá tốt, ảnh rõ',
      image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=82',
      link: '/products?sort=popular'
    }
  ]
];

const animatedShowcaseCards = [
  {
    title: 'Chọn đúng màu ngay từ ảnh',
    label: 'Ảnh theo màu sắc',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1000&q=82',
    icon: Camera,
    link: '/products?category=technology'
  },
  {
    title: 'Phụ kiện nổi bật cho góc làm việc',
    label: 'Setup gọn gàng',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=82',
    icon: Zap,
    link: '/products?category=accessories'
  },
  {
    title: 'Outfit có nhiều góc xem hơn',
    label: 'Thời trang mỗi ngày',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=82',
    icon: Shirt,
    link: '/products?category=fashion'
  }
];

const animatedStackScenes = [
  {
    title: 'Tai nghe, chuột, bàn phím',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=82',
    link: '/products?category=accessories'
  },
  {
    title: 'Laptop và tablet làm việc',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=82',
    link: '/products?category=laptop'
  },
  {
    title: 'Áo, jean, váy dễ phối',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=82',
    link: '/products?category=fashion'
  }
];

const shoppingMoods = [
  {
    title: 'Setup học tập gọn gàng',
    description: 'Laptop, tablet, tai nghe và phụ kiện cho góc học tập yên tĩnh.',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=82',
    icon: Headphones,
    link: '/products?category=study'
  },
  {
    title: 'Outfit đi chơi cuối tuần',
    description: 'Các món thời trang dễ phối, ảnh rõ và có nhiều lựa chọn màu.',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1100&q=82',
    icon: Shirt,
    link: '/products?category=fashion'
  },
  {
    title: 'Phụ kiện nâng cấp mỗi ngày',
    description: 'Sạc, chuột, bàn phím, đồng hồ và tai nghe đang có giá tốt.',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1100&q=82',
    icon: Zap,
    link: '/products?category=accessories'
  }
];

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const toTimeParts = (seconds) => [
  Math.floor(seconds / 3600),
  Math.floor((seconds % 3600) / 60),
  seconds % 60
].map((value) => String(value).padStart(2, '0'));

const getResponseList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  return [];
};

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [fallbackSaleEnd] = useState(() => Date.now() + 2 * 60 * 60 + 35 * 60 * 1000);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [productsResponse, flashSaleResponse] = await Promise.allSettled([
          productsAPI.getProducts({ limit: 12, sort: 'popular' }),
          flashSaleAPI.getAll()
        ]);

        if (productsResponse.status === 'fulfilled') {
          setFeaturedProducts(getResponseList(productsResponse.value));
        }

        if (flashSaleResponse.status === 'fulfilled') {
          setFlashSales(getResponseList(flashSaleResponse.value));
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isSliderPaused) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((value) => (value + 1) % bannerSlides.length);
    }, 4600);
    return () => clearInterval(timer);
  }, [isSliderPaused]);

  const slide = bannerSlides[activeSlide];
  const SlideIcon = slide.icon;
  const activeFlashSale = flashSales.find((sale) => sale.isRunning) || flashSales[0];
  const saleDeadline = activeFlashSale?.endTime ? new Date(activeFlashSale.endTime).getTime() : fallbackSaleEnd;
  const saleSeconds = Math.max(0, Math.floor((saleDeadline - nowTick) / 1000));
  const saleTime = toTimeParts(saleSeconds);
  const showcaseProducts = featuredProducts.slice(0, 4);
  const marqueeBrands = [...brandLogos, ...brandLogos];

  const flashProducts = (activeFlashSale?.products?.length ? activeFlashSale.products : featuredProducts.slice(0, 6))
    .map((item, index) => {
      const product = item.productId || item.product || item;
      if (!product?._id) return null;

      const originalPrice = Number(item.originalPrice || product.price || product.salePrice || 0);
      const fallbackPrice = originalPrice ? Math.max(1000, Math.round(originalPrice * (0.9 - Math.min(index, 4) * 0.03))) : 0;
      const flashPrice = Number(item.flashPrice || product.salePrice || fallbackPrice || originalPrice);
      const flashStock = Number(item.flashStock || product.stock || 60);
      const soldCount = Number(item.soldCount || product.soldCount || Math.min(flashStock - 1, 12 + index * 7));
      const discountPercent = originalPrice > 0 && flashPrice < originalPrice
        ? Math.max(1, Math.round(((originalPrice - flashPrice) / originalPrice) * 100))
        : 0;

      return {
        id: item._id || product._id,
        product,
        title: product.title,
        image: getProductImage(product),
        originalPrice,
        flashPrice,
        flashStock,
        soldCount,
        discountPercent,
        soldPercent: flashStock > 0 ? Math.min(100, Math.round((soldCount / flashStock) * 100)) : 0
      };
    })
    .filter(Boolean)
    .slice(0, 6);

  const goToSlide = (nextIndex) => {
    setActiveSlide((nextIndex + bannerSlides.length) % bannerSlides.length);
  };

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-amber-50">
        <div className="absolute inset-0">
          {bannerSlides.map((item, index) => (
            <img
              key={item.title}
              src={item.image}
              alt=""
              className={`home-hero-slide ${index === activeSlide ? 'is-active' : ''}`}
            />
          ))}
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.overlay}`} />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/74 to-transparent" />
        </div>

        <div className="container relative flex min-h-[640px] flex-col justify-center py-16">
          <div className="max-w-3xl animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/82 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur">
              <SlideIcon size={16} />
              {slide.badge}
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-slate-950 md:text-6xl">
              {slide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
              {slide.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={slide.link} className="btn-primary px-6 py-3">
                {slide.cta}
                <ArrowRight size={18} />
              </Link>
              <Link to="/flash-sales" className="btn-secondary px-6 py-3">
                Xem flash sale
                <Flame size={18} className="text-rose-500" />
              </Link>
            </div>

            <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-lg border border-orange-100 bg-white/86 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm backdrop-blur">
              <BadgePercent size={18} className="text-orange-500" />
              <span>Ưu đãi còn</span>
              <span className="flex gap-1">
                {saleTime.map((part, index) => (
                  <span key={`${part}-${index}`} className="rounded-md bg-orange-500 px-2 py-1 text-white shadow-sm">
                    {part}
                  </span>
                ))}
              </span>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [Search, 'Tìm văn bản'],
                [Camera, 'Tìm bằng ảnh'],
                [Mic, 'Giọng nói'],
                [Tag, 'Voucher']
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white/82 px-3 py-3 shadow-sm backdrop-blur">
                  <Icon size={18} className="mb-2 text-blue-600" />
                  <div className="text-xs font-bold text-slate-700">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => goToSlide(activeSlide - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/84 text-slate-800 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Banner trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goToSlide(activeSlide + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/84 text-slate-800 shadow-sm backdrop-blur hover:bg-white"
              aria-label="Banner tiếp theo"
            >
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => setIsSliderPaused((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/84 text-slate-800 shadow-sm backdrop-blur hover:bg-white"
              aria-label={isSliderPaused ? 'Chạy banner' : 'Tạm dừng banner'}
            >
              {isSliderPaused ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
            </button>
            <div className="ml-0 flex gap-2 sm:ml-2">
              {bannerSlides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeSlide ? 'w-10 bg-blue-600' : 'w-2.5 bg-slate-300 hover:bg-blue-300'}`}
                  aria-label={`Chọn banner ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {showcaseProducts.length > 0 && (
            <div className="hero-preview-strip mt-10 grid gap-3 sm:grid-cols-4">
              {showcaseProducts.map((product, index) => (
                <Link
                  key={product._id}
                  to={`/products/${product.slug || product._id}`}
                  className="floating-product group overflow-hidden rounded-lg border border-white/80 bg-white/86 p-2 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:bg-white"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <img src={getProductImage(product)} alt={product.title} className="h-28 w-full rounded-md object-cover" />
                  <div className="mt-2 line-clamp-1 text-xs font-bold text-slate-800">{product.title}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="container grid gap-4 py-7 md:grid-cols-4">
          {[
            [ShieldCheck, 'Shop đã kiểm duyệt', 'Giảm rủi ro khi mua'],
            [Truck, 'Giao hàng rõ trạng thái', 'Theo dõi đơn dễ dàng'],
            [PackageCheck, 'Đổi/trả minh bạch', 'Quy trình có ghi nhận'],
            [Store, 'Hỗ trợ seller nhỏ', 'Quản lý gọn, bán nhanh']
          ].map(([Icon, title, desc]) => (
            <div key={title} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <Icon size={21} />
              </span>
              <div>
                <div className="text-sm font-extrabold text-slate-900">{title}</div>
                <div className="text-xs font-medium text-slate-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="container">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="pill mb-3">
                <Sparkles size={14} />
                Danh mục gợi ý
              </div>
              <h2 className="section-title text-3xl">Mua nhanh theo nhóm sản phẩm</h2>
            </div>
            <Link to="/products" className="btn-outline">
              Vào gian hàng
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-4">
            {categoryHighlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.link}
                  className="category-motion-card group"
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="category-motion-media">
                    <img src={item.image} alt="" />
                    <span className="category-motion-icon">
                      <Icon size={20} />
                    </span>
                  </div>
                  <div className="category-motion-body">
                    <h3 className="text-lg font-extrabold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flash-sale-section py-14">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-extrabold text-orange-600 shadow-sm">
                <Flame size={16} />
                Flash sale
              </div>
              <h2 className="section-title text-3xl">
                {activeFlashSale?.title || 'Ưu đãi chớp nhoáng đang nổi bật'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                {activeFlashSale?.description || 'Sản phẩm được chọn lọc với mức giá tốt, hình ảnh rõ và trạng thái tồn kho dễ theo dõi.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm">
                <Clock3 size={18} className="text-orange-500" />
                {saleTime.map((part, index) => (
                  <span key={`${part}-${index}`} className="rounded-md bg-orange-500 px-2 py-1 text-white">
                    {part}
                  </span>
                ))}
              </div>
              <Link to="/flash-sales" className="btn-primary px-5 py-3">
                Xem tất cả
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          {flashProducts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {flashProducts.map((item, index) => (
                <Link
                  key={item.id}
                  to={`/products/${item.product.slug || item.product._id}`}
                  className="flash-sale-card group"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="relative overflow-hidden rounded-lg bg-orange-50">
                    <img src={item.image} alt={item.title} className="flash-sale-image h-48 w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
                      -{item.discountPercent || 8}%
                    </span>
                    <span className="flash-sale-orbit" />
                  </div>
                  <div className="mt-4">
                    <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-extrabold leading-5 text-slate-900">
                      {item.title}
                    </h3>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-xl font-black text-rose-600">{formatCurrency(item.flashPrice)}</div>
                        {item.originalPrice > item.flashPrice && (
                          <div className="text-xs font-semibold text-slate-400 line-through">
                            {formatCurrency(item.originalPrice)}
                          </div>
                        )}
                      </div>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-extrabold text-orange-700">
                        Đã bán {item.soldCount}
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500" style={{ width: `${item.soldPercent}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-orange-200 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-500">
              Chưa có sản phẩm flash sale để hiển thị.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden bg-gradient-to-br from-sky-50 via-white to-violet-50 py-12">
        <div className="container mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="pill mb-3">
              <Sparkles size={14} />
              Bộ sưu tập nổi bật
            </div>
            <h2 className="max-w-2xl text-3xl font-extrabold text-slate-950">Khám phá nhanh qua các góc mua sắm nổi bật</h2>
          </div>
          <Link to="/products" className="btn-outline px-5 py-3">
            Vào gian hàng
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="space-y-4">
          {movingGalleryRows.map((row, rowIndex) => (
            <div key={`gallery-row-${rowIndex}`} className="home-image-flow">
              <div className={`home-image-flow-track ${rowIndex % 2 === 1 ? 'is-reverse' : ''}`}>
                {[...row, ...row].map((item, index) => (
                  <Link
                    key={`${item.title}-${index}`}
                    to={item.link}
                    className="home-image-chip group"
                  >
                    <img src={item.image} alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-700/72 via-sky-500/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-sky-50">{item.label}</div>
                      <div className="mt-1 text-lg font-extrabold text-white">{item.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden bg-white py-14">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="pill mb-3">
                <Camera size={14} />
                Ảnh sản phẩm sống động
              </div>
              <h2 className="section-title text-3xl">Xem sản phẩm qua các khung ảnh có animation</h2>
            </div>
            <Link to="/products" className="btn-outline">
              Khám phá gian hàng
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-5 md:grid-cols-3">
              {animatedShowcaseCards.map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.link}
                    className="animated-showcase-card group"
                    style={{ animationDelay: `${index * 140}ms` }}
                  >
                    <img src={item.image} alt="" />
                    <div className="animated-showcase-shade" />
                    <span className="animated-showcase-icon">
                      <ItemIcon size={20} />
                    </span>
                    <div className="animated-showcase-content">
                      <div className="text-xs font-black uppercase tracking-wide text-blue-600">{item.label}</div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-950">{item.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="animated-stack-stage">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">Bộ ảnh gợi ý nhanh</div>
                  <div className="text-xs font-semibold text-slate-500">Gợi ý nhanh theo từng nhu cầu mua sắm</div>
                </div>
                <PackageCheck size={22} className="text-emerald-500" />
              </div>
              <div className="relative min-h-[340px]">
                {animatedStackScenes.map((item, index) => (
                  <Link
                    key={item.title}
                    to={item.link}
                    className={`animated-stack-image animated-stack-image-${index + 1}`}
                  >
                    <img src={item.image} alt="" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-slate-50 py-10">
        <div className="container mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="pill mb-3">
              <Sparkles size={14} />
              Thương hiệu nổi bật
            </div>
            <h2 className="section-title text-3xl">Các nhãn hàng đang được tìm nhiều</h2>
          </div>
          <Link to="/products" className="btn-outline">
            Xem sản phẩm
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="brand-marquee">
          <div className="brand-marquee-track">
            {marqueeBrands.map((brand, index) => (
              <Link
                key={`${brand.name}-${index}`}
                to={`/products?brand=${encodeURIComponent(brand.name)}`}
                className="brand-logo-chip"
                aria-label={`Xem sản phẩm ${brand.name}`}
              >
                <img src={brand.logo} alt={brand.name} />
                <span>{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="pill mb-3">
                <Zap size={14} />
                Gợi ý theo cảm hứng
              </div>
              <h2 className="section-title text-3xl">Mua nhanh theo nhu cầu hôm nay</h2>
            </div>
            <Link to="/products" className="btn-outline">
              Khám phá thêm
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {shoppingMoods.map((mood, index) => {
              const MoodIcon = mood.icon;
              return (
                <Link
                  key={mood.title}
                  to={mood.link}
                  className="motion-tile group relative min-h-[270px] overflow-hidden rounded-lg"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <img src={mood.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-700/72 via-sky-500/24 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-700 shadow-lg">
                      <MoodIcon size={21} />
                    </span>
                    <h3 className="text-xl font-extrabold">{mood.title}</h3>
                    <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-sky-50">{mood.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="pill mb-3">
                <Sparkles size={14} />
                Đang được quan tâm
              </div>
              <h2 className="section-title text-3xl">Sản phẩm nổi bật</h2>
            </div>
            <Link to="/products" className="btn-outline">
              Xem tất cả
              <ArrowRight size={17} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="container">
          <RecentlyViewedProducts />
          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
            <SmartRecommendations />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 py-16 text-white">
        <div className="container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-sm font-bold text-amber-100">
              <Store size={16} />
              Seller nhỏ cũng có thể bán chuyên nghiệp
            </div>
            <h2 className="max-w-2xl text-3xl font-extrabold">Bắt đầu bán hàng cùng Marketplace</h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-blue-50">
              Quản lý sản phẩm, đơn hàng, tồn kho, đổi trả và báo cáo trong cùng một khu vực làm việc.
            </p>
          </div>
          <Link to="/register" className="btn-secondary px-6 py-3">
            Đăng ký ngay
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
