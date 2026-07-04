import { useEffect, useMemo, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { chatbotAPI } from '../api/chatbot';
import { productsAPI } from '../api/products';
import useCartStore from '../store/cartStore';
import ProductCard from './ProductCard';
import { getRecentlyViewed } from './RecentlyViewedProducts';

const normalize = (value = '') => String(value).toLowerCase();

const SmartRecommendations = ({ title = 'Gợi ý dành cho bạn', limit = 8, excludeProductId }) => {
  const cartItems = useCartStore((state) => state.items);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const signals = useMemo(() => {
    const recent = getRecentlyViewed();
    return [...cartItems, ...recent].flatMap((item) => [
      ...(item.categories || []),
      item.brand,
      item.title
    ]).filter(Boolean).map(normalize);
  }, [cartItems]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [aiResponse, popularResponse] = await Promise.all([
          chatbotAPI.getRecommendations({ limit: limit * 2 }).catch(() => ({ data: [] })),
          productsAPI.getProducts({ limit: limit * 2, sort: 'popular' }).catch(() => ({ data: { products: [] } }))
        ]);

        const merged = [
          ...(aiResponse.data || []),
          ...(popularResponse.data?.products || [])
        ];

        const unique = Array.from(new Map(merged.map((product) => [product._id, product])).values())
          .filter((product) => product._id !== excludeProductId)
          .map((product) => {
            const text = normalize([
              product.title,
              product.brand,
              ...(product.categories || [])
            ].join(' '));
            const signalScore = signals.reduce((score, signal) => score + (text.includes(signal) ? 1 : 0), 0);
            return {
              ...product,
              _score: signalScore * 10 + (product.soldCount || 0) + (product.ratingAvg || 0)
            };
          })
          .sort((a, b) => b._score - a._score)
          .slice(0, limit);

        setProducts(unique);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [excludeProductId, limit, signals]);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="mb-6 flex items-center gap-2">
        <FiStar className="h-6 w-6 text-primary-600" />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default SmartRecommendations;
