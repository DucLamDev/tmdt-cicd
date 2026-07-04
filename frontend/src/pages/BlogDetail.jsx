import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogAPI } from '../api/features';
import { FiCalendar, FiEye, FiUser, FiArrowLeft } from 'react-icons/fi';

const BlogDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogAPI.getBySlug(slug).then(r => {
      setPost(r.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container py-20 text-center">Đang tải...</div>;
  if (!post) return <div className="container py-20 text-center">Bài viết không tồn tại</div>;

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', textDecoration: 'none', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <FiArrowLeft /> Quay lại Blog
      </Link>

      {post.coverImage && <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '2rem' }} />}

      <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>{post.title}</h1>

      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiUser size={14} /> {post.authorId?.name || 'Admin'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCalendar size={14} /> {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiEye size={14} /> {post.viewCount} lượt xem</span>
      </div>

      <div style={{ lineHeight: 1.8, fontSize: '1rem', color: '#334155' }} dangerouslySetInnerHTML={{ __html: post.content }} />

      {post.tags?.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <strong>Tags:</strong>
          <div style={{ display: 'flex', gap: '6px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {post.tags.map(t => <span key={t} style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#64748b' }}>{t}</span>)}
          </div>
        </div>
      )}

      {post.relatedProducts?.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Sản phẩm liên quan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
            {post.relatedProducts.map(p => (
              <Link to={`/products/${p.slug || p._id}`} key={p._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={p.images?.[0] || '/placeholder.png'} alt={p.title} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  <div style={{ padding: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>{(p.salePrice || p.price)?.toLocaleString('vi-VN')} ₫</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogDetail;
