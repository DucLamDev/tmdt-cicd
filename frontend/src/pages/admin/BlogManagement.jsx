import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'news', tags: '', coverImage: '', isPublished: false });

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const r = await apiClient.get('/admin/blog'); setPosts(r.data.posts); } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    try {
      if (editingId) {
        await apiClient.put(`/api/admin/blog/${editingId}`, data);
        toast.success('Cập nhật thành công');
      } else {
        await apiClient.post('/admin/blog', data);
        toast.success('Tạo bài viết thành công');
      }
      setShowForm(false); setEditingId(null); resetForm(); fetchPosts();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const resetForm = () => setForm({ title: '', excerpt: '', content: '', category: 'news', tags: '', coverImage: '', isPublished: false });

  const startEdit = (p) => {
    setForm({ title: p.title, excerpt: p.excerpt || '', content: p.content, category: p.category, tags: p.tags?.join(', ') || '', coverImage: p.coverImage || '', isPublished: p.isPublished });
    setEditingId(p._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa bài viết?')) return;
    try { await apiClient.delete(`/api/admin/blog/${id}`); toast.success('Đã xóa'); fetchPosts(); } catch { toast.error('Lỗi'); }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Quản lý Blog</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}><FiPlus /> Tạo bài viết</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tiêu đề *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tóm tắt</label>
              <input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Danh mục</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <option value="news">Tin tức</option><option value="tutorial">Hướng dẫn</option><option value="review">Đánh giá</option>
                  <option value="promotion">Khuyến mãi</option><option value="lifestyle">Phong cách</option></select></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tags (cách nhau bằng dấu phẩy)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} placeholder="tag1, tag2" /></div>
            </div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Ảnh bìa URL</label>
              <input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} /></div>
            <div><label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nội dung *</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={10} style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} /> Xuất bản ngay</label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
            <button type="submit" style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>{editingId ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600 }}>Bài viết</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}>Danh mục</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}>Trạng thái</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}>Lượt xem</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}></th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Đang tải...</td></tr> :
            posts.length === 0 ? <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chưa có bài viết</td></tr> :
            posts.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}>{p.category}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: p.isPublished ? '#dcfce7' : '#fef3c7', color: p.isPublished ? '#16a34a' : '#ca8a04' }}>{p.isPublished ? 'Đã xuất bản' : 'Nháp'}</span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem' }}>{p.viewCount}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', marginRight: '8px' }}><FiEdit2 size={14} /></button>
                  <button onClick={() => handleDelete(p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><FiTrash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BlogManagement;
