import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FiDollarSign, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [refundingId, setRefundingId] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => { fetchReturns(); }, [filter, page]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const r = await apiClient.get('/admin/returns', { params: { status: filter || undefined, page, limit: 10 } });
      setReturns(r.data.returns);
      setPagination(r.data.pagination || {});
    } catch {} finally { setLoading(false); }
  };

  const handleRefund = async (id, amount) => {
    try {
      await apiClient.patch(`/admin/returns/${id}/refund`, { refundAmount: amount, adminNote });
      toast.success('Hoàn tiền thành công');
      setRefundingId(null); setAdminNote(''); fetchReturns();
    } catch (e) { toast.error(e.response?.data?.message || 'Lỗi'); }
  };

  const STATUS_LABEL = { RETURN_REQUESTED: 'Chờ duyệt', RETURN_APPROVED: 'Đã duyệt', RETURN_REJECTED: 'Từ chối', RETURN_PICKED: 'Shipper đã lấy', RETURN_COMPLETED: 'Hoàn tất' };
  const STATUS_COLOR = { RETURN_REQUESTED: '#eab308', RETURN_APPROVED: '#3b82f6', RETURN_REJECTED: '#ef4444', RETURN_PICKED: '#8b5cf6', RETURN_COMPLETED: '#22c55e' };

  const renderEvidenceImages = (images = []) => images.length > 0 && (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
        <FiEye size={14} /> Ảnh minh chứng
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {images.map((image, index) => (
          <a key={`${image}-${index}`} href={image} target="_blank" rel="noreferrer">
            <img src={image} alt="Ảnh minh chứng" style={{ width: 76, height: 76, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Quản lý đổi/trả (Admin)</h1>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 10, padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
        <strong>Cơ chế hoàn tiền:</strong> hệ thống ghi nhận số tiền cần hoàn trong yêu cầu trả hàng. Khi admin bấm xác nhận, trạng thái đơn/yêu cầu chuyển sang hoàn tất và giao dịch thanh toán được đánh dấu refunded. Nếu thanh toán online, tiền được đối soát theo mã giao dịch cổng thanh toán; nếu COD, admin/kế toán hoàn tiền ngoài hệ thống theo thông tin khách hàng và lưu ghi chú tại đây.
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[{ v: '', l: 'Tất cả' }, ...Object.entries(STATUS_LABEL).map(([v, l]) => ({ v, l }))].map(({ v, l }) => (
          <button key={v} onClick={() => { setFilter(v); setPage(1); }} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: filter === v ? '#3b82f6' : '#f1f5f9', color: filter === v ? '#fff' : '#64748b' }}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {returns.map(ret => (
            <div key={ret._id} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>#{ret.returnNumber}</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>KH: {ret.buyerId?.name || ret.buyerId?.email}</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>Shop: {ret.sellerId?.shopName}</span>
                </div>
                <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: `${STATUS_COLOR[ret.status]}20`, color: STATUS_COLOR[ret.status] }}>{STATUS_LABEL[ret.status]}</span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>Hoàn tiền: <strong style={{ color: '#3b82f6' }}>{ret.refundAmount?.toLocaleString('vi-VN')} ₫</strong></div>
              {ret.description && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#334155' }}><strong>Lý do:</strong> {ret.description}</div>}
              {renderEvidenceImages(ret.images || [])}

              {['RETURN_APPROVED', 'RETURN_PICKED'].includes(ret.status) && (
                refundingId === ret._id ? (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginTop: '0.75rem' }}>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Ghi chú admin" rows={2} style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleRefund(ret._id, ret.refundAmount)} style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}><FiDollarSign size={14} style={{ verticalAlign: 'middle' }} /> Xác nhận hoàn tiền</button>
                      <button onClick={() => setRefundingId(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Hủy</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setRefundingId(ret._id)} style={{ marginTop: '0.75rem', padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}><FiDollarSign size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Xử lý hoàn tiền</button>
                )
              )}
            </div>
          ))}
          {returns.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Không có yêu cầu</div>}
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
      }
    </div>
  );
};

export default AdminReturns;
