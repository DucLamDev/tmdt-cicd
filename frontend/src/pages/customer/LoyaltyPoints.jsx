import { useState, useEffect } from 'react';
import { gameAPI, loyaltyAPI } from '../../api/features';
import { FiAward, FiGift, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TIER_COLORS = { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2', diamond: '#b9f2ff' };
const TIER_ICONS = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };
const WHEEL_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#2563eb', '#8b5cf6', '#06b6d4'];
const FALLBACK_WHEEL_REWARDS = [
  { _id: 'fallback-5', name: 'Giảm 5%', discountType: 'percentage', discountValue: 5, minOrderValue: 100000 },
  { _id: 'fallback-20', name: 'Giảm 20K', discountType: 'fixed', discountValue: 20000, minOrderValue: 200000 },
  { _id: 'fallback-50', name: 'Giảm 50K', discountType: 'fixed', discountValue: 50000, minOrderValue: 500000 },
];

const formatMoney = (value = 0) => Number(value || 0).toLocaleString('vi-VN');

const getRewardText = (reward = {}) => (
  reward.discountType === 'percentage'
    ? `Giảm ${reward.discountValue || 0}%`
    : `Giảm ${formatMoney(reward.discountValue)}đ`
);

const resolveRewardIndex = (result, rewards) => {
  if (Number.isInteger(result?.rewardIndex)) return result.rewardIndex;
  const rewardId = result?.reward?._id || result?.rewardId;
  const index = rewards.findIndex((reward) => String(reward._id) === String(rewardId));
  return index >= 0 ? index : 0;
};

const LoyaltyPoints = () => {
  const [data, setData] = useState(null);
  const [tiers, setTiers] = useState({});
  const [history, setHistory] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [wheelRewards, setWheelRewards] = useState([]);
  const [wheelResult, setWheelResult] = useState(null);
  const [roleScores, setRoleScores] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loyaltyAPI.getMyPoints(),
      loyaltyAPI.getTiers(),
      loyaltyAPI.getHistory({ limit: 20 }),
      loyaltyAPI.getRoleScores(),
      gameAPI.getLuckyWheelRewards(),
      gameAPI.getMyVouchers()
    ]).then(([pts, t, h, role, rewards, v]) => {
      setData(pts.data || {});
      setTiers(t.data || {});
      setHistory(h.data?.transactions || []);
      setRoleScores(role.data || []);
      setWheelRewards(rewards.data || []);
      setVouchers(v.data || []);
      setLoading(false);
    }).catch(() => { toast.error('Lỗi tải dữ liệu'); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-20 text-center">Đang tải...</div>;

  const currentTier = tiers[data?.tier] || {};
  const nextTiers = Object.entries(tiers).filter(([, v]) => v.minPoints > (data?.lifetimePoints || 0));
  const nextTier = nextTiers.length > 0 ? nextTiers[0] : null;
  const progress = nextTier ? Math.min(100, ((data?.lifetimePoints || 0) / nextTier[1].minPoints) * 100) : 100;
  const displayRewards = wheelRewards.length ? wheelRewards : FALLBACK_WHEEL_REWARDS;
  const segmentAngle = 360 / displayRewards.length;
  const wheelGradient = displayRewards.map((reward, index) => (
    `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${index * segmentAngle}deg ${(index + 1) * segmentAngle}deg`
  )).join(', ');

  const playLuckyWheel = async () => {
    try {
      setSpinning(true);
      const response = await gameAPI.playLuckyWheel();
      const result = response.data;
      const rewardIndex = resolveRewardIndex(result, displayRewards);
      const targetCenter = rewardIndex * segmentAngle + (segmentAngle / 2);
      const targetRotation = 360 - targetCenter;

      setWheelResult(result);
      setWheelRotation((currentRotation) => {
        const normalizedRotation = ((currentRotation % 360) + 360) % 360;
        const delta = (360 * 6) + ((targetRotation - normalizedRotation + 360) % 360);
        return currentRotation + delta;
      });
      toast.success(`Nhận voucher ${result.code}`);
      const voucherResponse = await gameAPI.getMyVouchers();
      setVouchers(voucherResponse.data || []);
      setTimeout(() => setSpinning(false), 4300);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể quay hôm nay');
      setSpinning(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Điểm thưởng</h1>

      {/* Points Overview */}
      <div style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)', borderRadius: '16px', padding: '2rem', color: '#fff', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '4px' }}>Điểm hiện tại</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{data?.totalPoints?.toLocaleString('vi-VN') || 0}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>≈ {((data?.totalPoints || 0) * 10).toLocaleString('vi-VN')} ₫ giảm giá</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>{TIER_ICONS[data?.tier] || '🥉'}</div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{currentTier.label || 'Đồng'}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Giảm {currentTier.discount || 0}%</div>
          </div>
        </div>
        {nextTier && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.8, marginBottom: '6px' }}>
              <span>{data?.lifetimePoints?.toLocaleString('vi-VN')} điểm tích lũy</span>
              <span>Cần {nextTier[1].minPoints?.toLocaleString('vi-VN')} để lên {TIER_ICONS[nextTier[0]]} {nextTier[1].label}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', height: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#3b82f6', width: `${progress}%`, height: '100%', borderRadius: '20px', transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
      </div>

      {roleScores.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Điểm Role</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {roleScores.map((item) => (
              <div key={item.role} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>{item.score}</span>
                  <span style={{ color: '#64748b', fontSize: '0.875rem' }}>/ 1000 · {item.level}</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${Math.min(100, item.score / 10)}%`, height: '100%', background: '#2563eb' }} />
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.criteria?.join(' · ')}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Vòng quay voucher</h2>
      <div className="mb-8 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-6 p-5 md:grid-cols-[360px_1fr] md:p-7">
          <div className="flex justify-center">
            <div className="relative aspect-square w-[min(78vw,330px)]">
              <div className="absolute -top-2 left-1/2 z-30 -translate-x-1/2">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-600/25">
                  <FiZap className="h-6 w-6" />
                  <span className="absolute top-12 h-0 w-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-rose-500 drop-shadow-lg" />
                </div>
              </div>

              <div className="absolute inset-3 rounded-full bg-blue-600/10 shadow-inner" />
              <div
                className={`voucher-wheel-disc absolute inset-0 rounded-full border-[10px] border-white shadow-2xl shadow-slate-900/18 ${spinning ? 'is-spinning' : ''}`}
                style={{
                  background: `conic-gradient(${wheelGradient})`,
                  transform: `rotate(${wheelRotation}deg)`
                }}
              >
                {displayRewards.map((reward, index) => {
                  const angle = (index * segmentAngle) + (segmentAngle / 2);
                  return (
                    <div
                      key={reward._id || reward.name}
                      className="absolute inset-0 flex justify-center"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <span className="mt-8 max-w-[88px] rounded-full bg-white/88 px-2 py-1 text-center text-[11px] font-black leading-tight text-slate-950 shadow-sm">
                        {reward.name}
                      </span>
                    </div>
                  );
                })}
                <div className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[8px] border-white bg-gradient-to-br from-blue-600 to-cyan-500 text-center text-white shadow-xl shadow-blue-600/25">
                  <div>
                    <FiGift className="mx-auto mb-1 h-6 w-6" />
                    <div className="text-xs font-black uppercase tracking-wide">Voucher</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
              <FiAward className="h-4 w-4" />
              1 lượt mỗi ngày
            </div>
            <div className="mb-2 text-2xl font-extrabold text-slate-950">Mỗi tài khoản có 1 lượt quay mỗi ngày</div>
            <p className="mb-5 max-w-xl text-sm font-medium leading-6 text-slate-500">
              Voucher nhận được sẽ lưu vào tài khoản và có hạn sử dụng riêng.
            </p>

            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {displayRewards.map((reward, index) => (
                <div key={reward._id || reward.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <span className="h-3 w-3 rounded-full" style={{ background: WHEEL_COLORS[index % WHEEL_COLORS.length] }} />
                    {getRewardText(reward)}
                  </div>
                  <div className="text-xs font-semibold text-slate-500">Đơn tối thiểu {formatMoney(reward.minOrderValue)}đ</div>
                </div>
              ))}
            </div>

            <button onClick={playLuckyWheel} disabled={spinning} className="btn-primary w-fit px-6 py-3">
              {spinning ? 'Đang quay...' : 'Quay nhận voucher'}
            </button>

            {wheelResult && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                Ô trúng: {wheelResult.reward?.name || 'Voucher'} - mã {wheelResult.code}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Voucher của tôi</h2>
      {wheelRewards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
          {wheelRewards.map((reward, index) => (
            <div key={reward._id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem', background: '#fff' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'][index % 4] }} />
                {reward.name}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>
                Đơn tối thiểu {Number(reward.minOrderValue || 0).toLocaleString('vi-VN')}đ
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {vouchers.length === 0 ? (
          <div style={{ color: '#64748b' }}>Chưa có voucher</div>
        ) : vouchers.map((voucher) => (
          <div key={voucher._id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', background: '#fff' }}>
            <div style={{ fontWeight: 700, color: '#2563eb' }}>{voucher.code}</div>
            <div style={{ fontSize: '0.875rem', marginTop: 4 }}>
              {voucher.discountType === 'percentage' ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucher.discountValue.toLocaleString('vi-VN')}₫`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Đơn tối thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}₫</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>HSD {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}</div>
          </div>
        ))}
      </div>

      {/* Tier Benefits */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Bảng quyền lợi</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {Object.entries(tiers).map(([key, tier]) => (
          <div key={key} style={{ padding: '1rem', borderRadius: '12px', border: data?.tier === key ? `2px solid ${TIER_COLORS[key]}` : '1px solid #e2e8f0', textAlign: 'center', background: data?.tier === key ? '#f8fafc' : '#fff' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{TIER_ICONS[key]}</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tier.label}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Giảm {tier.discount}%</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{tier.freeShipping ? '🚚 Free ship' : ''}</div>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Lịch sử điểm</h2>
      {history.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Chưa có giao dịch</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {history.map((tx, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{tx.description}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
              </div>
              <span style={{ fontWeight: 700, color: tx.points > 0 ? '#22c55e' : '#ef4444' }}>{tx.points > 0 ? '+' : ''}{tx.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoyaltyPoints;
