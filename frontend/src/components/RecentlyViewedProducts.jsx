import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import apiClient from '../api/client';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 20;
const DAYS_LIMIT = 7;

/**
 * Save a product to recently viewed list
 * @param {Object} product - Product to save
 */
export const saveRecentlyViewed = (product) => {
  if (!product || !product._id) return;

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    // Remove duplicate if exists
    const filtered = stored.filter(item => item._id !== product._id);
    
    // Add to beginning
    filtered.unshift({
      _id: product._id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      salePrice: product.salePrice,
      images: product.images?.slice(0, 1) || [],
      ratingAvg: product.ratingAvg,
      viewedAt: new Date().toISOString()
    });

    // Limit to max items
    const limited = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));

    if (localStorage.getItem('accessToken')) {
      apiClient.post('/recently-viewed', { productId: product._id }).catch(() => {});
    }
  } catch (error) {
    console.error('Error saving recently viewed:', error);
  }
};

/**
 * Get recently viewed products (filtered by DAYS_LIMIT)
 * @returns {Array} Recently viewed products
 */
export const getRecentlyViewed = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_LIMIT);

    return stored.filter(item => new Date(item.viewedAt) > cutoffDate);
  } catch (error) {
    return [];
  }
};

/**
 * RecentlyViewedProducts component
 * Shows a horizontal scrollable list of recently viewed products
 */
const RecentlyViewedProducts = ({ excludeProductId }) => {
  const [products, setProducts] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const load = async () => {
      let items = getRecentlyViewed();
      if (localStorage.getItem('accessToken')) {
        try {
          const response = await apiClient.get('/recently-viewed');
          if (response.data?.length) items = response.data;
        } catch {
          // Local history remains available for guests or temporary API failures.
        }
      }
      if (excludeProductId) {
        items = items.filter(p => p._id !== excludeProductId);
      }
      setProducts(items);
    };
    load();
  }, [excludeProductId]);

  if (products.length === 0) return null;

  const scrollContainer = (direction) => {
    const container = document.getElementById('recently-viewed-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setScrollPosition(container.scrollLeft + scrollAmount);
    }
  };

  return (
    <div className="mt-12">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiClock className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-bold">Sản phẩm đã xem gần đây</h2>
            <span className="text-sm text-gray-500">({products.length})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scrollContainer('left')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollContainer('right')}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          id="recently-viewed-container"
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => {
            const effectivePrice = product.salePrice || product.price;
            const hasDiscount = product.salePrice && product.salePrice < product.price;

            return (
              <Link
                key={product._id}
                to={`/products/${product.slug}`}
                className="flex-shrink-0 w-48 bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.images?.[0] || '/placeholder.png'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
                    {product.title}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary-600 font-bold text-sm">
                      {effectivePrice?.toLocaleString('vi-VN')}₫
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        {product.price?.toLocaleString('vi-VN')}₫
                      </span>
                    )}
                  </div>
                  {product.ratingAvg > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-yellow-400 text-xs">⭐</span>
                      <span className="text-xs text-gray-500">{product.ratingAvg}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewedProducts;
