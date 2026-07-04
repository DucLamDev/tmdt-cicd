import { FiX, FiStar, FiShoppingCart } from 'react-icons/fi';
import useCartStore from '../store/cartStore';
import useCompareStore from '../store/compareStore';

const QuickViewModal = ({ product, onClose }) => {
  const addToCart = useCartStore(s => s.addItem);
  const addToCompare = useCompareStore(s => s.addItem);

  if (!product) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: '16px', maxWidth: '700px', width: '95%', maxHeight: '80vh', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}><FiX /></button>

        <div style={{ padding: '1.5rem' }}>
          <img src={product.images?.[0] || '/placeholder.png'} alt={product.title} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '12px' }} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem', overflowX: 'auto' }}>
            {product.images?.slice(1, 5).map((img, i) => (
              <img key={i} src={img} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.4, marginBottom: '0.75rem' }}>{product.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiStar style={{ color: '#eab308', fill: '#eab308', width: 14 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{product.ratingAvg?.toFixed(1) || '0'}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({product.reviewCount || 0} đánh giá)</span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>· Đã bán {product.soldCount || 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{(product.salePrice || product.price)?.toLocaleString('vi-VN')} ₫</span>
              {product.salePrice && product.salePrice < product.price && (
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' }}>{product.price?.toLocaleString('vi-VN')} ₫</span>
              )}
            </div>
            {product.brand && <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Thương hiệu: <strong>{product.brand}</strong></div>}
            <div style={{ fontSize: '0.85rem', color: product.stock > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1.5rem' }}>
            <button onClick={() => { addToCart(product, 1); onClose(); }}
              style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <FiShoppingCart /> Thêm vào giỏ hàng
            </button>
            <button onClick={() => addToCompare(product)}
              style={{ padding: '10px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
              So sánh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
