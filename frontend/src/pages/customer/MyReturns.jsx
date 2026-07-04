import { useState, useEffect } from 'react';
import { returnAPI } from '../../api/features';
import { Link, useNavigate } from 'react-router-dom';
import { FiPackage, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  RETURN_REQUESTED: { label: 'Đang chờ duyệt', color: '#eab308', icon: FiClock },
  RETURN_APPROVED: { label: 'Shop đã duyệt', color: '#3b82f6', icon: FiCheckCircle },
  RETURN_REJECTED: { label: 'Từ chối', color: '#ef4444', icon: FiXCircle },
  RETURN_PICKED: { label: 'Shipper đã lấy hàng', color: '#8b5cf6', icon: FiPackage },
  RETURN_COMPLETED: { label: 'Đã hoàn tất', color: '#22c55e', icon: FiCheckCircle },
  REQUESTED: { label: 'Đang chờ', color: '#eab308', icon: FiClock },
  APPROVED: { label: 'Đã duyệt', color: '#3b82f6', icon: FiCheckCircle },
  REJECTED: { label: 'Từ chối', color: '#ef4444', icon: FiXCircle },
  SHIPPED_BACK: { label: 'Đã gửi lại', color: '#8b5cf6', icon: FiPackage },
  RECEIVED: { label: 'Đã nhận', color: '#06b6d4', icon: FiRefreshCw },
  REFUNDED: { label: 'Đã hoàn tiền', color: '#22c55e', icon: FiCheckCircle },
};

const MyReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => { fetchReturns(); }, [filter, page]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await returnAPI.getMyReturns({ status: filter || undefined, page, limit: 10 });
      setReturns(res.data.returns);
      setPagination(res.data.pagination || {});
    } catch { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Yêu cầu đổi/trả hàng</h1>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[{ v: '', l: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([v, { label: l }]) => ({ v, l }))].map(({ v, l }) => (
          <button key={v} onClick={() => { setFilter(v); setPage(1); }}
            style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: filter === v ? '#3b82f6' : '#f1f5f9', color: filter === v ? '#fff' : '#64748b' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải...</div> : returns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chưa có yêu cầu đổi/trả nào</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {returns.map(ret => {
            const status = STATUS_MAP[ret.status] || { label: ret.status, color: '#64748b' };
            const StatusIcon = status.icon || FiClock;
            return (
              <div key={ret._id} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{ret.returnNumber}</span>
                    <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(ret.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: status.color }}>
                    <StatusIcon size={14} /> {status.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {ret.items?.map(item => (
                    <div key={item._id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {item.image && <img src={item.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />}
                      <div><div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{item.title}</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>x{item.quantity}</div></div>
                    </div>
                  ))}
                </div>
                {ret.images?.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {ret.images.map((image, index) => (
                      <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer">
                        <img src={image} alt="Evidence" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Hoàn tiền: <strong style={{ color: '#3b82f6' }}>{ret.refundAmount?.toLocaleString('vi-VN')} ₫</strong></span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Đơn: {ret.orderId?.orderNumber || ret.orderId}</span>
                </div>
              </div>
            );
          })}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.5rem' }}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
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
      )}
    </div>
  );
};

export default MyReturns;
