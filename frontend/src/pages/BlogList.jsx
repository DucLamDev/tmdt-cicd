import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogAPI } from '../api/features';
import { FiCalendar, FiEye, FiTag, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: '', label: 'Tất cả' },
  { value: 'news', label: 'Tin tức' },
  { value: 'tutorial', label: 'Hướng dẫn' },
  { value: 'review', label: 'Đánh giá' },
  { value: 'promotion', label: 'Khuyến mãi' },
  { value: 'lifestyle', label: 'Phong cách' },
];

const BlogList = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => { fetchPosts(); }, [category]);

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      const res = await blogAPI.getPosts({ page, limit: 12, category: category || undefined });
      setPosts(res.data.posts);
      setPagination(res.data.pagination);
    } catch (e) { toast.error('Lỗi tải bài viết'); }
    finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Blog</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Tin tức, hướng dẫn, và đánh giá sản phẩm</p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)}
            style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, background: category === c.value ? '#3b82f6' : '#f1f5f9', color: category === c.value ? '#fff' : '#64748b', transition: 'all 0.2s' }}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {posts.map(post => (
            <Link to={`/blog/${post.slug || post._id}`} key={post._id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}>
                {post.coverImage && <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar size={12} /> {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiEye size={12} /> {post.viewCount}</span>
                  </div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.title}</h2>
                  {post.excerpt && <p style={{ fontSize: '0.875rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>}
                  {post.tags?.length > 0 && <div style={{ display: 'flex', gap: '4px', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {post.tags.slice(0, 3).map(t => <span key={t} style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', color: '#64748b' }}>{t}</span>)}
                  </div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2rem' }}>
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button key={i} onClick={() => fetchPosts(i + 1)} style={{ padding: '8px 14px', border: pagination.page === i + 1 ? 'none' : '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', background: pagination.page === i + 1 ? '#3b82f6' : '#fff', color: pagination.page === i + 1 ? '#fff' : '#334155', fontWeight: 600 }}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogList;
