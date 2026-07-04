import { FiShare2, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SocialShare = ({ url, title }) => {
  const shareUrl = url || window.location.href;
  const shareTitle = title || document.title;

  const platforms = [
    { name: 'Facebook', color: '#1877f2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { name: 'Zalo', color: '#0068ff', url: `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}` },
    { name: 'Twitter', color: '#1da1f2', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}` },
    { name: 'Telegram', color: '#0088cc', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}` },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Đã sao chép liên kết');
  };

  const openShare = (shareUrl) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <FiShare2 size={14} /> Chia sẻ:
      </span>
      {platforms.map(p => (
        <button key={p.name} onClick={() => openShare(p.url)} title={p.name}
          style={{ padding: '6px 12px', background: `${p.color}15`, color: p.color, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = p.color; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = `${p.color}15`; e.currentTarget.style.color = p.color; }}>
          {p.name}
        </button>
      ))}
      <button onClick={copyLink} title="Sao chép liên kết"
        style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
        <FiCopy size={12} /> Copy
      </button>
    </div>
  );
};

export default SocialShare;
