import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiStar, FiTrash2, FiShoppingCart, FiX } from 'react-icons/fi';
import useCompareStore from '../store/compareStore';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';

const Compare = () => {
  const { items, removeItem, clearAll } = useCompareStore();
  const addToCart = useCartStore(s => s.addItem);
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>So sánh sản phẩm</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Chưa có sản phẩm nào để so sánh. Hãy thêm sản phẩm từ trang danh sách.</p>
        <button onClick={() => navigate('/products')} style={{ padding: '12px 32px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          Xem sản phẩm
        </button>
      </div>
    );
  }

  const allSpecs = [...new Set(items.flatMap(p => Object.keys(p.specifications || {})))];

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>So sánh sản phẩm ({items.length})</h1>
        <button onClick={clearAll} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}>
          Xóa tất cả
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', width: '150px', background: '#f8fafc' }}>Thuộc tính</th>
              {items.map(p => (
                <th key={p._id} style={{ padding: '16px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', background: '#f8fafc', position: 'relative' }}>
                  <button onClick={() => removeItem(p._id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><FiX /></button>
                  <img src={p.images?.[0] || '/placeholder.png'} alt={p.title} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>{p.title}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Giá</td>
              {items.map(p => (
                <td key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#3b82f6' }}>{(p.salePrice || p.price)?.toLocaleString('vi-VN')} ₫</span>
                  {p.salePrice && p.salePrice < p.price && <div style={{ fontSize: '0.75rem', color: '#94a3b8', textDecoration: 'line-through' }}>{p.price?.toLocaleString('vi-VN')} ₫</div>}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Đánh giá</td>
              {items.map(p => (
                <td key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <FiStar style={{ color: '#eab308', fill: '#eab308' }} /> {p.ratingAvg?.toFixed(1) || '0'}
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Thương hiệu</td>
              {items.map(p => <td key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{p.brand || '—'}</td>)}
            </tr>
            <tr>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Danh mục</td>
              {items.map(p => <td key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{p.categories?.join(', ') || '—'}</td>)}
            </tr>
            {allSpecs.map(spec => (
              <tr key={spec}>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{spec}</td>
                {items.map(p => <td key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{p.specifications?.[spec] || '—'}</td>)}
              </tr>
            ))}
            <tr>
              <td style={{ padding: '16px', fontWeight: 600 }}>Hành động</td>
              {items.map(p => (
                <td key={p._id} style={{ padding: '16px', textAlign: 'center' }}>
                  <button onClick={() => { addToCart(p, 1); }} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                    <FiShoppingCart style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Thêm vào giỏ
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Compare;
