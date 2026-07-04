import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { ChevronRight, Edit2, Headphones, Home, Laptop, Package, Plus, Shirt, Smartphone, Tablet, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const getCategoryIcon = (name = '') => {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes('điện thoại') || normalizedName.includes('phone')) return Smartphone;
  if (normalizedName.includes('laptop')) return Laptop;
  if (normalizedName.includes('máy tính bảng') || normalizedName.includes('tablet')) return Tablet;
  if (normalizedName.includes('phụ kiện') || normalizedName.includes('tai nghe')) return Headphones;
  if (normalizedName.includes('thời trang')) return Shirt;
  if (normalizedName.includes('gia dụng') || normalizedName.includes('home')) return Home;
  return Package;
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', parentId: '', icon: '', image: '' });
  const [page, setPage] = useState(1);

  const ROOTS_PER_PAGE = 10;

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories?flat=true');
      setCategories(res.data);
      setPage(1);
    } catch { toast.error('Lỗi tải danh mục'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, parentId: form.parentId || null };
      if (editingId) {
        await apiClient.put(`/admin/categories/${editingId}`, data);
        toast.success('Cập nhật thành công');
      } else {
        await apiClient.post('/admin/categories', data);
        toast.success('Tạo danh mục thành công');
      }
      setShowForm(false); setEditingId(null); setForm({ name: '', description: '', parentId: '', icon: '', image: '' });
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa danh mục này?')) return;
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      toast.success('Đã xóa');
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const startEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId || '', icon: cat.icon || '', image: cat.image || '' });
    setEditingId(cat._id);
    setShowForm(true);
  };

  const roots = categories.filter(c => !c.parentId);
  const getChildren = (parentId) => categories.filter(c => c.parentId === parentId);
  const totalPages = Math.ceil(roots.length / ROOTS_PER_PAGE);
  const pagedRoots = roots.slice((page - 1) * ROOTS_PER_PAGE, page * ROOTS_PER_PAGE);

  const renderTree = (cats, depth = 0) => cats.map(cat => (
    <div key={cat._id}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', paddingLeft: `${16 + depth * 24}px`, borderBottom: '1px solid #f1f5f9', background: depth > 0 ? '#fafbfc' : '#fff' }}>
        {getChildren(cat._id).length > 0 && <ChevronRight size={14} style={{ color: '#94a3b8' }} />}
        {(() => {
          const CategoryIcon = getCategoryIcon(cat.name);
          return <CategoryIcon size={18} style={{ color: '#2563eb' }} />;
        })()}
        <span style={{ flex: 1, fontWeight: depth === 0 ? 600 : 400, fontSize: '0.875rem' }}>{cat.name}</span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '8px' }}>Lv{cat.level} · {cat.productCount || 0} SP</span>
        <button onClick={() => startEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px' }}><Edit2 size={14} /></button>
        <button onClick={() => handleDelete(cat._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}><Trash2 size={14} /></button>
      </div>
      {renderTree(getChildren(cat._id), depth + 1)}
    </div>
  ));

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quản lý danh mục</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', description: '', parentId: '', icon: '', image: '' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
          <Plus size={18} /> Thêm danh mục
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tên danh mục *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Danh mục cha</label>
              <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
                <option value="">-- Không (Root) --</option>
                {categories.map(c => <option key={c._id} value={c._id}>{'  '.repeat(c.level)}{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Icon (tên gợi ý)</label>
              <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} placeholder="phone, laptop, home..." />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Ảnh URL</label>
              <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Mô tả</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
            <button type="submit" style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{editingId ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải...</div> :
          categories.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chưa có danh mục</div> :
          renderTree(pagedRoots)}
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1rem' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{ padding: '8px 14px', border: page === p ? 'none' : '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: page === p ? '#3b82f6' : '#fff', color: page === p ? '#fff' : '#334155', fontWeight: 600 }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
