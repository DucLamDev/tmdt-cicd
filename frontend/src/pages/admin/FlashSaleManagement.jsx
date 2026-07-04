import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FiPlus, FiEdit2, FiTrash2, FiZap, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const FlashSaleManagement = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startTime: '', endTime: '', products: [] });
  const [productInput, setProductInput] = useState({ productId: '', flashPrice: '', flashStock: '' });

  useEffect(() => { fetchSales(); }, []);

  const fetchSales = async () => {
    try { const r = await apiClient.get('/admin/flash-sales'); setSales(r.data.sales); } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/flash-sales', form);
      toast.success('Tạo Flash Sale thành công');
      setShowForm(false); setForm({ title: '', description: '', startTime: '', endTime: '', products: [] });
      fetchSales();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const addProduct = () => {
    if (!productInput.productId || !productInput.flashPrice) return toast.error('Điền ID sản phẩm và giá flash');
    setForm({ ...form, products: [...form.products, { ...productInput, flashPrice: Number(productInput.flashPrice), flashStock: Number(productInput.flashStock) || 50 }] });
    setProductInput({ productId: '', flashPrice: '', flashStock: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa Flash Sale này?')) return;
    try { await apiClient.delete(`/api/admin/flash-sales/${id}`); toast.success('Đã xóa'); fetchSales(); } catch { toast.error('Lỗi'); }
  };

  const getStatus = (sale) => {
    const now = new Date();
    if (now < new Date(sale.startTime)) return { label: 'Sắp diễn ra', color: '#eab308' };
    if (now > new Date(sale.endTime)) return { label: 'Đã kết thúc', color: '#94a3b8' };
    return { label: 'Đang diễn ra', color: '#22c55e' };
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quản lý Flash Sale</h1>
        <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          <FiZap /> Tạo Flash Sale
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiêu đề *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Bắt đầu *</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Kết thúc *</label>
              <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sản phẩm Flash Sale</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input placeholder="Product ID" value={productInput.productId} onChange={e => setProductInput({ ...productInput, productId: e.target.value })} style={{ flex: 2, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }} />
              <input placeholder="Giá Flash" type="number" value={productInput.flashPrice} onChange={e => setProductInput({ ...productInput, flashPrice: e.target.value })} style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }} />
              <input placeholder="SL" type="number" value={productInput.flashStock} onChange={e => setProductInput({ ...productInput, flashStock: e.target.value })} style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }} />
              <button type="button" onClick={addProduct} style={{ padding: '8px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><FiPlus /></button>
            </div>
            {form.products.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '4px', fontSize: '0.8rem' }}>
                <span>ID: {p.productId} · Giá: {Number(p.flashPrice).toLocaleString('vi-VN')} ₫ · SL: {p.flashStock}</span>
                <button type="button" onClick={() => setForm({ ...form, products: form.products.filter((_, j) => j !== i) })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><FiTrash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
            <button type="submit" style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Tạo Flash Sale</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</div> : sales.length === 0 ?
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Chưa có Flash Sale</div> :
          sales.map(sale => {
            const status = getStatus(sale);
            return (
              <div key={sale._id} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiZap style={{ color: '#ef4444' }} />
                    <span style={{ fontWeight: 600 }}>{sale.title}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '20px', background: `${status.color}20`, color: status.color, fontWeight: 600 }}>{status.label}</span>
                  </div>
                  <button onClick={() => handleDelete(sale._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><FiTrash2 /></button>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                  <span><FiCalendar size={12} style={{ verticalAlign: 'middle' }} /> {new Date(sale.startTime).toLocaleString('vi-VN')} - {new Date(sale.endTime).toLocaleString('vi-VN')}</span>
                  <span>{sale.products?.length || 0} sản phẩm</span>
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
};

export default FlashSaleManagement;
