import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Sparkles, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import apiClient from '../api/client';
import { getProductImage, handleProductImageError } from '../utils/productHelpers';

const ProductCard = ({ product }) => {
  const addItem = useCartStore((state) => state.addItem);
  const navigate = useNavigate();

  const price = product.salePrice || product.price || 0;
  const productImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean).slice(0, 4)
    : [getProductImage(product)];
  const hasImageGallery = productImages.length > 1;
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const hasSelectableOptions = (product.variants || []).length > 0
      || Object.values(product.attributes || {}).some((value) => String(value || '').split(/[,;/|]+/).filter(Boolean).length > 1);

    if (hasSelectableOptions) {
      toast('Chọn thuộc tính sản phẩm trước khi thêm vào giỏ');
      navigate(`/products/${product.slug || product._id}`);
      return;
    }

    addItem(product, 1);
    toast.success('Đã thêm vào giỏ hàng');
  };

  const handleAddToWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await apiClient.post('/wishlist', { productId: product._id });
      toast.success('Đã thêm vào danh sách yêu thích');
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 401) {
        toast.error('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
        return;
      }
      if (message?.includes('đã có') || message?.includes('Ã„â€˜ÃƒÂ£ cÃƒÂ³')) {
        toast.success('Sản phẩm đã có trong danh sách yêu thích');
        return;
      }
      toast.error(message || 'Không thể thêm vào yêu thích');
    }
  };

  return (
    <Link
      to={`/products/${product.slug || product._id}`}
      className="card product-card group block overflow-hidden bg-white"
    >
      <div
        className="product-card-gallery relative aspect-[4/4.2] overflow-hidden bg-slate-100"
        style={{ '--gallery-count': productImages.length }}
      >
        {productImages.map((image, index) => (
          <img
            key={`${product._id || product.slug}-${image}-${index}`}
            src={image}
            alt={index === 0 ? product.title : `${product.title} ${index + 1}`}
            onError={(event) => handleProductImageError(event, product)}
            className="product-card-gallery-image h-full w-full object-cover"
            style={{ '--gallery-index': index }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/32 to-transparent" />

        {hasImageGallery && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/82 px-2 py-1 shadow-lg backdrop-blur">
            {productImages.map((image, index) => (
              <span
                key={`${image}-${index}-dot`}
                className="product-card-gallery-dot h-1.5 w-1.5 rounded-full bg-slate-400"
                style={{ '--gallery-index': index }}
              />
            ))}
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {hasDiscount && (
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-lg">
              -{discountPercent}%
            </span>
          )}
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-extrabold text-slate-950 shadow-lg">
              <Sparkles size={13} />
              Nổi bật
            </span>
          )}
        </div>

        <button
          onClick={handleAddToWishlist}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/92 text-slate-700 shadow-lg backdrop-blur hover:bg-rose-50 hover:text-rose-500"
          title="Thêm vào yêu thích"
          aria-label="Thêm vào yêu thích"
        >
          <Heart size={19} />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {Number(product.ratingAvg || 0).toFixed(1)}
            <span className="text-amber-600/70">({product.reviewCount || 0})</span>
          </div>
          {product.soldCount > 0 && (
            <span className="text-xs font-semibold text-slate-500">Đã bán {product.soldCount}</span>
          )}
        </div>

        <h3 className="mb-3 min-h-[2.75rem] text-sm font-bold leading-5 text-slate-900 line-clamp-2">
          {product.title}
        </h3>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-blue-600">
              {price.toLocaleString('vi-VN')} ₫
            </div>
            {hasDiscount && (
              <div className="text-xs font-semibold text-slate-400 line-through">
                {product.price.toLocaleString('vi-VN')} ₫
              </div>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-cyan-600"
            title="Thêm vào giỏ"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
