import { useCallback, useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiPackage, FiTruck } from 'react-icons/fi';
import { getDashboardStats } from '../../api/shipper';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';

const ShipperDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useRealtimeRefresh(['dashboard:update'], fetchStats, 10000);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner border-primary-600"></div></div>;

  const cards = [
    { label: 'Đơn sẵn sàng nhận', value: stats?.tasks?.pendingPickups || 0, icon: FiPackage, color: 'bg-blue-100 text-blue-600' },
    { label: 'Đang giao', value: stats?.tasks?.inTransit || 0, icon: FiTruck, color: 'bg-orange-100 text-orange-600' },
    { label: 'Đã giao hôm nay', value: stats?.deliveries?.today || 0, icon: FiCheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'COD hôm nay', value: `${(stats?.cod?.todayTotal || 0).toLocaleString('vi-VN')} ₫`, icon: FiClock, color: 'bg-purple-100 text-purple-600' }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Shipper Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-sm text-gray-600 mb-1">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShipperDashboard;
