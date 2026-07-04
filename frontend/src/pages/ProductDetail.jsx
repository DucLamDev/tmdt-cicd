import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productsAPI } from '../api/products';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { FiStar, FiShoppingCart, FiMinus, FiPlus, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import RecentlyViewedProducts, { saveRecentlyViewed } from '../components/RecentlyViewedProducts';
import SmartRecommendations from '../components/SmartRecommendations';
import VirtualTryOnModal from '../components/VirtualTryOnModal';
import { reviewAPI } from '../api/reviews';
import { getProductFallbackImage, getProductImage, handleProductImageError, isFashionProduct } from '../utils/productHelpers';

const attributeLabels = {
  color: 'Màu sắc',
  size: 'Size',
  storage: 'Dung lượng',
  ram: 'RAM',
  material: 'Chất liệu',
  capacity: 'Dung tích/Kích thước'
};

const splitAttributeValue = (value) => String(value || '')
  .split(/[,;/|]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeComparable = (value) => String(value || '').trim().toLowerCase();

const normalizeColorName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .trim();

const COLOR_SWATCHES = [
  { terms: ['trang', 'white'], value: '#ffffff', border: '#cbd5e1' },
  { terms: ['den', 'black', 'graphite', 'space black'], value: '#111827' },
  { terms: ['xam', 'gray', 'grey', 'ghi', 'titan'], value: '#94a3b8' },
  { terms: ['bac', 'silver'], value: '#dbe3ef' },
  { terms: ['xanh', 'blue'], value: '#2563eb' },
  { terms: ['xanh la', 'green'], value: '#16a34a' },
  { terms: ['do', 'red'], value: '#ef4444' },
  { terms: ['hong', 'pink'], value: '#ec4899' },
  { terms: ['vang', 'yellow'], value: '#facc15' },
  { terms: ['tim', 'purple'], value: '#8b5cf6' },
  { terms: ['nau', 'brown'], value: '#92400e' }
];

const getColorSwatchStyle = (value) => {
  const normalized = normalizeColorName(value);
  const swatch = COLOR_SWATCHES.find((item) => item.terms.some((term) => normalized.includes(term)));
  return {
    background: swatch?.value || 'linear-gradient(135deg, #e2e8f0, #64748b)',
    borderColor: swatch?.border || 'rgba(15,23,42,0.18)'
  };
};

const getAttributeOptions = (product = {}) => {
  const options = {};

  (product.variants || []).forEach((variant) => {
    Object.entries(variant.attributes || {}).forEach(([key, value]) => {
      if (!value) return;
      options[key] = options[key] || [];
      if (!options[key].some((item) => normalizeComparable(item) === normalizeComparable(value))) {
        options[key].push(String(value).trim());
      }
    });
  });

  Object.entries(product.attributes || {}).forEach(([key, value]) => {
    const values = splitAttributeValue(value);
    if (!values.length) return;
    options[key] = options[key] || [];
    values.forEach((item) => {
      if (!options[key].some((current) => normalizeComparable(current) === normalizeComparable(item))) {
        options[key].push(item);
      }
    });
  });

  return Object.entries(options)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => ({ key, values }));
};

const variantMatchesAttributes = (variant, selectedAttributes = {}) => Object.entries(selectedAttributes)
  .every(([key, value]) => (
    !value
    || variant.attributes?.[key] === undefined
    || normalizeComparable(variant.attributes?.[key]) === normalizeComparable(value)
  ));

const findSelectedVariant = (product, selectedAttributes = {}) => {
  const variants = product?.variants || [];
  if (!variants.length) return null;
  return variants.find((variant) => variantMatchesAttributes(variant, selectedAttributes)) || null;
};

const getBestVariantImages = (product, selectedAttributes = {}) => {
  const selectedEntries = Object.entries(selectedAttributes).filter(([, value]) => value);
  if (!product?.variants?.length || !selectedEntries.length) return null;

  const matchingVariants = product.variants
    .filter((variant) => variant.images?.length)
    .map((variant) => {
      const matchCount = selectedEntries.reduce((count, [key, value]) => (
        normalizeComparable(variant.attributes?.[key]) === normalizeComparable(value) ? count + 1 : count
      ), 0);
      return { variant, matchCount };
    })
    .filter((item) => item.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  return matchingVariants[0]?.variant.images || null;
};

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(false);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
  const [showTryOn, setShowTryOn] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product && isAuthenticated) {
      checkCanReview();
    }
  }, [product, isAuthenticated]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProduct(slug);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Không tìm thấy sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  // Save to recently viewed when product is loaded
  useEffect(() => {
    if (product) {
      saveRecentlyViewed(product);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const autoSelected = {};
    getAttributeOptions(product).forEach(({ key, values }) => {
      if (values.length === 1) autoSelected[key] = values[0];
    });
    setSelectedAttributes(autoSelected);
    setQuantity(1);
    setSelectedImage(0);
  }, [product?._id]);

  const checkCanReview = async () => {
    if (!product?._id || !isAuthenticated) return;
    
    try {
      setCheckingReview(true);
      const response = await reviewAPI.canReviewProduct(product._id);
      const { canReview, hasReviewed, orderId } = response.data;
      setCanReview(canReview);
      setHasReviewed(hasReviewed);
      setReviewOrderId(orderId);
    } catch (error) {
      console.error('Error checking review status:', error);
      // If error, assume cannot review
      setCanReview(false);
    } finally {
      setCheckingReview(false);
    }
  };

  const attributeOptions = product ? getAttributeOptions(product) : [];
  const requiresAttributeSelection = attributeOptions.length > 0;
  const missingAttributes = attributeOptions.filter(({ key }) => !selectedAttributes[key]);
  const isSelectionReady = !requiresAttributeSelection || missingAttributes.length === 0;
  const matchedVariant = findSelectedVariant(product, selectedAttributes);
  const selectedVariant = isSelectionReady ? matchedVariant : null;
  const activeStock = selectedVariant ? selectedVariant.stock : product?.stock;
  const hasValidVariant = !product?.variants?.length || !isSelectionReady || Boolean(selectedVariant);
  const canPurchase = isSelectionReady && hasValidVariant && Number(activeStock || 0) >= quantity;
  const variantMatchedImages = product ? getBestVariantImages(product, selectedAttributes) : null;

  const buildSelectedProduct = () => {
    const variantImages = selectedVariant?.images?.length ? selectedVariant.images : variantMatchedImages;
    return {
      ...product,
      variantId: selectedVariant?._id,
      selectedAttributes,
      price: selectedVariant?.price ?? product.price,
      salePrice: selectedVariant?.salePrice ?? product.salePrice,
      stock: activeStock,
      images: variantImages || product.images
    };
  };

  const validateSelection = () => {
    if (!isSelectionReady) {
      toast.error('Vui lòng chọn đầy đủ thuộc tính sản phẩm');
      return false;
    }
    if (!canPurchase) {
      toast.error('Sản phẩm không đủ số lượng trong kho');
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateSelection()) return;
    addItem(buildSelectedProduct(), quantity);
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;
    sessionStorage.setItem('checkout_items', JSON.stringify([{ ...buildSelectedProduct(), quantity }]));
    navigate('/checkout?mode=buy-now');
  };

  const handleChatWithSeller = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để chat với shop');
      navigate('/login');
      return;
    }
    const shop = product.sellerId;
    if (!shop?._id) {
      toast.error('Không tìm thấy thông tin shop');
      return;
    }
    navigate(`/messages?shopId=${shop._id}&productId=${product._id}&shopName=${encodeURIComponent(shop.shopName || 'Shop')}`);
  };

  if (loading) {
    return (
      <div className="container py-20 flex justify-center">
        <div className="spinner border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-2xl font-bold">Không tìm thấy sản phẩm</h2>
      </div>
    );
  }

  const activeImages = (selectedVariant?.images?.length ? selectedVariant.images : variantMatchedImages || product.images) || [];
  const activeImageProduct = { ...product, images: activeImages };
  const galleryImages = activeImages.length
    ? activeImages.map((_, index) => getProductImage(activeImageProduct, index))
    : [getProductFallbackImage(product)];
  const selectedColor = selectedAttributes.color;
  const price = selectedVariant?.salePrice || selectedVariant?.price || product.salePrice || product.price;
  const originalPrice = selectedVariant?.price || product.price;
  const hasDiscount = price && originalPrice && price < originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="product-detail-main-image relative aspect-square overflow-hidden rounded-lg bg-gray-100 mb-4">
            <img
              src={galleryImages[selectedImage] || getProductImage(product)}
              alt={product.title}
              onError={(event) => handleProductImageError(event, activeImageProduct)}
              className="h-full w-full object-cover"
            />
            {selectedColor && (
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-extrabold text-slate-800 shadow-lg backdrop-blur">
                <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(selectedColor)} />
                Đang xem màu {selectedColor}
              </div>
            )}
          </div>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-slate-800">Ảnh sản phẩm ({galleryImages.length})</span>
            <span className="text-xs font-semibold text-slate-500">Chọn màu để đổi bộ ảnh tương ứng</span>
          </div>
          <div className="product-detail-thumbnails flex gap-3 overflow-x-auto pb-2">
            {galleryImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-gray-100 transition ${
                  selectedImage === index ? 'border-primary-600 shadow-lg shadow-blue-600/18' : 'border-transparent hover:border-primary-200'
                }`}
                type="button"
              >
                <img
                  src={image}
                  alt=""
                  onError={(event) => handleProductImageError(event, activeImageProduct)}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 right-1 rounded-full bg-white/88 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  {index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

          {/* Rating */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-1">
              <FiStar className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="font-medium">{product.ratingAvg || 0}</span>
              <span className="text-gray-600">({product.reviewCount || 0} đánh giá)</span>
            </div>
            <div className="text-gray-600">
              Đã bán {product.soldCount || 0}
            </div>
          </div>

          {/* Price */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="flex items-baseline space-x-4">
              <div className="text-4xl font-bold text-primary-600">
                {price.toLocaleString()} ₫
              </div>
              {hasDiscount && (
                <>
                  <div className="text-xl text-gray-400 line-through">
                    {originalPrice.toLocaleString()} ₫
                  </div>
                  <div className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-bold">
                    -{discountPercent}%
                  </div>
                </>
              )}
            </div>
          </div>

          {attributeOptions.length > 0 && (
            <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5">
              <h3 className="mb-4 font-bold">Thuộc tính sản phẩm</h3>
              <div className="space-y-4">
                {attributeOptions.map(({ key, values }) => {
                  return (
                    <div key={key}>
                      <div className="mb-2 text-sm font-semibold text-gray-700">
                        {attributeLabels[key] || key}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {values.map((option) => {
                          const nextSelection = { ...selectedAttributes, [key]: option };
                          const variantAllowed = !product.variants?.length
                            || product.variants.some((variant) => variantMatchesAttributes(variant, nextSelection));
                          const active = selectedAttributes[key] === option;

                          return (
                            <button
                              type="button"
                              key={`${key}-${option}`}
                              disabled={!variantAllowed}
                              onClick={() => {
                                setSelectedAttributes((current) => ({ ...current, [key]: option }));
                                setQuantity(1);
                                setSelectedImage(0);
                              }}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition ${
                                active
                                  ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                                  : 'border-primary-100 bg-primary-50 text-primary-700 hover:border-primary-300'
                              } disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400`}
                            >
                              {key === 'color' && (
                                <span
                                  className={`h-4 w-4 rounded-full border ${active ? 'border-white/80' : ''}`}
                                  style={getColorSwatchStyle(option)}
                                />
                              )}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!isSelectionReady && (
                <div className="mt-3 text-sm font-medium text-amber-600">
                  Chọn {missingAttributes.map(({ key }) => attributeLabels[key] || key).join(', ')} trước khi mua hàng.
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block font-medium mb-2">Số lượng</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-100"
                >
                  <FiMinus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  min="1"
                  max={activeStock || 1}
                  onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), Math.max(1, activeStock || 1)))}
                  className="w-20 text-center border-x border-gray-300 py-2"
                />
                <button
                  onClick={() => setQuantity(Math.min(quantity + 1, Math.max(1, activeStock || 1)))}
                  className="p-3 hover:bg-gray-100"
                >
                  <FiPlus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-gray-600">
                {activeStock || 0} sản phẩm có sẵn
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 mb-4">
            <button
              onClick={handleAddToCart}
              disabled={!canPurchase}
              className="btn-outline flex-1 px-6 py-3"
            >
              <FiShoppingCart className="w-5 h-5 mr-2" />
              Thêm vào giỏ
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!canPurchase}
              className="btn-primary flex-1 px-6 py-3"
            >
              Mua ngay
            </button>
          </div>

          {/* Virtual try-on button */}
          {product.categories?.some(c => 
            ['ao', 'áo', 'quần', 'quan', 'đầm', 'dam', 'váy', 'vay', 'shirt', 'top', 'bottom', 'dress', 'clothing', 'thời trang'].some(
              kw => c.toLowerCase().includes(kw)
            )
          ) && (
            <button
              onClick={() => setShowTryOn(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all mb-8"
            >
              <FiZap className="w-5 h-5" />
              <span className="font-medium">Thử đồ ảo</span>
            </button>
          )}

          {/* Shop Info */}
          {product.sellerId && (
            <div className="border-t pt-6">
              <h3 className="font-bold mb-2">Thông tin shop</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Link to={`/shop/${product.sellerId.slug || product.sellerId._id}`} className="flex items-center gap-4 hover:text-primary-600">
                  <img
                    src={product.sellerId.logoUrl || '/default-shop.png'}
                    alt={product.sellerId.shopName}
                    className="h-12 w-12 rounded-full border border-gray-100 object-cover"
                  />
                  <div>
                    <div className="font-medium">{product.sellerId.shopName}</div>
                    <div className="text-sm text-gray-600">
                      Rating: {product.sellerId.ratingAvg || 0} ⭐ · {product.sellerId.stats?.totalOrders || 0} lượt mua
                    </div>
                  </div>
                </Link>
                <button type="button" onClick={handleChatWithSeller} className="btn-secondary px-4 py-2">
                  Chat với shop
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-12">
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-4">Mô tả sản phẩm</h2>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{product.description}</p>
          </div>
          
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-6">
              <h3 className="font-bold mb-3">Thông số kỹ thuật</h3>
              <table className="w-full">
                <tbody>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 font-medium capitalize">{key}</td>
                      <td className="py-2 text-gray-600">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-6">Đánh giá sản phẩm</h2>
          
          {/* Review Form - Show for all authenticated users if they haven't reviewed yet */}
          {isAuthenticated && !checkingReview && !hasReviewed && (
            <div className="mb-8 pb-8 border-b">
              <ReviewForm 
                productId={product._id} 
                orderId={reviewOrderId}
                onSuccess={async () => {
                  setHasReviewed(true);
                  setCanReview(false);
                  toast.success('Đánh giá của bạn đã được gửi thành công!');
                  // Refresh product data and reviews
                  await fetchProduct();
                  setReviewRefreshTrigger(prev => prev + 1);
                }}
              />
            </div>
          )}

          {/* Message if user already reviewed */}
          {isAuthenticated && !checkingReview && hasReviewed && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">Bạn đã đánh giá sản phẩm này.</p>
            </div>
          )}

          <ReviewList productId={product._id} refreshTrigger={reviewRefreshTrigger} />
        </div>
      </div>

      {/* Recently Viewed Products */}
      <RecentlyViewedProducts excludeProductId={product._id} />
      <SmartRecommendations title="Có thể bạn cũng thích" excludeProductId={product._id} />

      {/* Virtual Try-On Modal */}
      {showTryOn && (
        <VirtualTryOnModal
          product={product}
          onClose={() => setShowTryOn(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail;
