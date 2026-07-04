import { useState, useEffect } from 'react';
import { flashSaleAPI } from '../api/features';
import { Link } from 'react-router-dom';
import { FiZap, FiStar } from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';
import { getProductImage } from '../utils/productHelpers';

const FlashSaleCountdown = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) { clearInterval(timer); setTimeLeft({}); return; }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  if (!timeLeft.h && timeLeft.h !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {['h', 'm', 's'].map(k => (
        <span key={k} style={{ background: '#1e293b', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', minWidth: '36px', textAlign: 'center' }}>
          {String(timeLeft[k] || 0).padStart(2, '0')}
        </span>
      ))}
    </div>
  );
};

const FlashSales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore(s => s.addItem);

  useEffect(() => {
    flashSaleAPI.getAll()
      .then(r => { setSales(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-20 text-center">Đang tải...</div>;
  if (sales.length === 0) return <div className="container py-20 text-center"><h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Hiện chưa có Flash Sale nào</h1><p style={{ color: '#64748b', marginTop: '0.5rem' }}>Hãy quay lại sau nhé!</p></div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      {sales.map(sale => (
        <div key={sale._id} style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, #ef4444, #f97316)', padding: '1rem 1.5rem', borderRadius: '12px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiZap size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{sale.title}</h2>
              {sale.isUpcoming && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem' }}>Sắp diễn ra</span>}
            </div>
            <FlashSaleCountdown endTime={sale.endTime} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {(sale.products || []).map(item => {
              const p = item.productId;
              if (!p) return null;
              const originalPrice = item.originalPrice || p.salePrice || p.price || item.flashPrice || 0;
              const discount = originalPrice > 0 ? Math.round(((originalPrice - item.flashPrice) / originalPrice) * 100) : 0;
              const soldPercent = item.flashStock > 0 ? Math.min(100, Math.round(((item.soldCount || 0) / item.flashStock) * 100)) : 0;

              return (
                <div key={item._id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative', transition: 'transform 0.3s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#ef4444', color: '#fff', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, zIndex: 1 }}>-{discount}%</span>
                  <Link to={`/products/${p.slug || p._id}`}><img src={getProductImage(p)} alt={p.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} /></Link>
                  <div style={{ padding: '0.75rem' }}>
                    <Link to={`/products/${p.slug || p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>{p.title}</h3>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>{item.flashPrice?.toLocaleString('vi-VN')} ₫</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'line-through' }}>{originalPrice?.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div style={{ background: '#fee2e2', borderRadius: '20px', height: '6px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ background: '#ef4444', width: `${soldPercent}%`, height: '100%', borderRadius: '20px', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>Đã bán {item.soldCount}/{item.flashStock}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FlashSales;
