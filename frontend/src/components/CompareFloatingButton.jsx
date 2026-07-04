import { useNavigate } from 'react-router-dom';
import { FiBarChart2, FiX } from 'react-icons/fi';
import useCompareStore from '../store/compareStore';

const CompareFloatingButton = () => {
  const items = useCompareStore(s => s.items);
  const clearAll = useCompareStore(s => s.clearAll);
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '100px', right: '24px', zIndex: 999,
      background: '#1e293b', color: '#fff', borderRadius: '16px', padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
      cursor: 'pointer', animation: 'slideUp 0.3s ease'
    }}>
      <div onClick={() => navigate('/compare')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FiBarChart2 size={18} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>So sánh ({items.length})</span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); clearAll(); }}
        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
        <FiX size={14} />
      </button>
    </div>
  );
};

export default CompareFloatingButton;
