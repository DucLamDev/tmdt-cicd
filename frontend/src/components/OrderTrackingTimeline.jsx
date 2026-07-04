import { FiCheck, FiPackage, FiTruck, FiMapPin, FiClock, FiXCircle, FiCheckCircle } from 'react-icons/fi';

const STEPS = {
  PLACED: { icon: FiClock, label: 'Đã đặt hàng', color: '#94a3b8' },
  CONFIRMED: { icon: FiCheck, label: 'Đã xác nhận', color: '#3b82f6' },
  PACKED: { icon: FiPackage, label: 'Đã đóng gói', color: '#8b5cf6' },
  ASSIGNED: { icon: FiMapPin, label: 'Đã chuyển shipper', color: '#06b6d4' },
  PICKED_UP: { icon: FiTruck, label: 'Đã lấy hàng', color: '#f59e0b' },
  IN_TRANSIT: { icon: FiTruck, label: 'Đang giao hàng', color: '#f97316' },
  DELIVERED: { icon: FiCheckCircle, label: 'Đã giao hàng', color: '#22c55e' },
  FAILED: { icon: FiXCircle, label: 'Giao thất bại', color: '#ef4444' },
  CANCELLED: { icon: FiXCircle, label: 'Đã hủy', color: '#ef4444' },
};

const ALL_STEPS = ['PLACED', 'CONFIRMED', 'PACKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

const OrderTrackingTimeline = ({ statusHistory = [], currentStatus }) => {
  const completedStatuses = statusHistory.map(h => h.status);
  const statusMap = {};
  statusHistory.forEach(h => { statusMap[h.status] = h; });

  const isCancelled = currentStatus === 'CANCELLED';
  const isFailed = currentStatus === 'FAILED';

  const steps = isCancelled || isFailed ? [...completedStatuses] : ALL_STEPS;

  return (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Trạng thái đơn hàng</h3>
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: '15px', top: '0', bottom: '0', width: '2px', background: '#e2e8f0' }} />

        {steps.map((step, i) => {
          const info = STEPS[step] || { icon: FiClock, label: step, color: '#94a3b8' };
          const Icon = info.icon;
          const isCompleted = completedStatuses.includes(step);
          const isCurrent = step === currentStatus;
          const historyEntry = statusMap[step];

          return (
            <div key={step} style={{ position: 'relative', paddingBottom: i < steps.length - 1 ? '1.5rem' : '0', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {/* Circle */}
              <div style={{
                position: 'absolute', left: '-2rem', width: '30px', height: '30px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                background: isCompleted || isCurrent ? info.color : '#f1f5f9',
                color: isCompleted || isCurrent ? '#fff' : '#94a3b8',
                border: isCurrent ? `3px solid ${info.color}40` : 'none',
                transition: 'all 0.3s',
                boxShadow: isCurrent ? `0 0 0 4px ${info.color}20` : 'none'
              }}>
                <Icon size={14} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                <div style={{ fontWeight: isCurrent ? 700 : isCompleted ? 500 : 400, fontSize: '0.9rem', color: isCompleted || isCurrent ? '#1e293b' : '#94a3b8' }}>
                  {info.label}
                </div>
                {historyEntry && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(historyEntry.timestamp).toLocaleString('vi-VN')}
                    {historyEntry.note && <span style={{ marginLeft: '8px' }}>· {historyEntry.note}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTrackingTimeline;
