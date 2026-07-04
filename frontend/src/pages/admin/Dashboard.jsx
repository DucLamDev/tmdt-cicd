import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiDollarSign, FiPackage, FiSend, FiShoppingBag, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh';
import { adminAPI } from '../../api/admin';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];
const CARD_COLORS = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  green: 'bg-green-50 text-green-600'
};

const currency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [aiTrends, setAiTrends] = useState(null);
  const [adminAIQuestion, setAdminAIQuestion] = useState('');
  const [adminAIAnswer, setAdminAIAnswer] = useState(null);
  const [adminAILoading, setAdminAILoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setStats(response.data);
      adminAPI.getAITrends().then((trendResponse) => {
        setAiTrends(trendResponse.data);
      }).catch(() => setAiTrends(null));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useRealtimeRefresh(['dashboard:update', 'message:new', 'order:update'], fetchStats, 10000);

  const askAdminAI = async (question = adminAIQuestion) => {
    const finalQuestion = question.trim();
    if (!finalQuestion || adminAILoading) return;

    try {
      setAdminAILoading(true);
      setAdminAIQuestion(finalQuestion);
      const response = await adminAPI.askAI({ question: finalQuestion, days: 30 });
      setAdminAIAnswer(response.data);
    } catch (error) {
      console.error('Admin assistant error:', error);
      setAdminAIAnswer({ answer: 'Trợ lý quản trị đang gặp lỗi. Vui lòng thử lại sau.' });
    } finally {
      setAdminAILoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="spinner border-primary-600"></div></div>;
  }

  const cards = [
    { label: 'Người dùng', value: stats?.totalUsers, sub: `+${stats?.newUsers || 0} mới`, icon: FiUsers, color: 'blue' },
    { label: 'Sản phẩm', value: stats?.totalProducts, sub: `${stats?.pendingProducts || 0} chờ duyệt`, icon: FiPackage, color: 'purple' },
    { label: 'Đơn hàng', value: stats?.totalOrders, sub: 'Toàn hệ thống', icon: FiShoppingBag, color: 'cyan' },
    { label: 'Doanh thu', value: currency(stats?.totalRevenue), sub: 'Đơn đã giao', icon: FiDollarSign, color: 'green' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Dữ liệu thực tế từ đơn hàng, người dùng, sản phẩm và shop.</p>
        </div>
        <Link to="/admin/reports" className="btn-primary px-5 py-2">Xem báo cáo</Link>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div className={`rounded-lg p-3 ${CARD_COLORS[card.color]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <FiTrendingUp className="text-green-600" />
              </div>
              <div className="text-sm text-gray-600">{card.label}</div>
              <div className="mt-1 text-2xl font-bold">{typeof card.value === 'number' ? card.value.toLocaleString('vi-VN') : card.value}</div>
              <div className="mt-2 text-sm text-gray-500">{card.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Doanh thu 30 ngày</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueTrend || []}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000000)}tr`} />
                <Tooltip formatter={(value, name) => name === 'revenue' ? currency(value) : value} />
                <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#2563eb" fill="url(#revenueFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Vai trò người dùng</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.roleDistribution || []} dataKey="count" nameKey="role" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {(stats?.roleDistribution || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {aiTrends && (
        <div className="rounded-lg border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Dự đoán xu hướng</h2>
              <p className="text-sm text-gray-600">Phân tích bán chạy, đơn gần đây và tồn kho.</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-4 py-2 text-right">
              <div className="text-xs text-emerald-700">Điểm xu hướng</div>
              <div className="text-2xl font-bold text-emerald-700">{aiTrends.trendScore || 0}</div>
            </div>
          </div>
          <p className="mb-4 text-gray-700">{aiTrends.summary}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-emerald-800">Cơ hội nên đẩy</h3>
              <div className="space-y-2">
                {(aiTrends.opportunities || []).slice(0, 4).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-lg bg-emerald-50 p-3 text-sm">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-gray-600">{item.reason}</div>
                    <div className="mt-1 text-emerald-700">{item.action}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-amber-800">Rủi ro cần xử lý</h3>
              <div className="space-y-2">
                {(aiTrends.risks || []).slice(0, 4).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-lg bg-amber-50 p-3 text-sm">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-gray-600">{item.reason}</div>
                    <div className="mt-1 text-amber-700">{item.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Trợ lý quản trị kho và bán hàng</h2>
            <p className="text-sm text-gray-600">Hỏi theo dữ liệu thật: tồn kho, sản phẩm bán chạy, bán chậm, doanh thu và đơn gần đây.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            Dữ liệu cập nhật
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {['Sản phẩm nào bán chạy nhất?', 'Mặt hàng nào sắp hết kho?', 'Nên nhập thêm sản phẩm nào?', 'Ý tưởng voucher tuần này là gì?'].map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => askAdminAI(question)}
              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
            >
              {question}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            askAdminAI();
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <input
            value={adminAIQuestion}
            onChange={(event) => setAdminAIQuestion(event.target.value)}
            placeholder="Ví dụ: Kho nào cần bổ sung trước khi chạy sale?"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={adminAILoading || !adminAIQuestion.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSend />
            {adminAILoading ? 'Đang hỏi...' : 'Hỏi trợ lý'}
          </button>
        </form>

        {adminAIAnswer?.answer && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {adminAIAnswer.answer}
          </div>
        )}

        {aiTrends?.inventoryActions?.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {aiTrends.inventoryActions.slice(0, 6).map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="font-semibold text-gray-900">{item.title}</div>
                <div className="mt-1 text-gray-600">Tồn: {item.currentStock ?? 0} · Đã bán: {item.soldCount ?? 0}</div>
                <div className="mt-1 text-blue-700">{item.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Top sản phẩm theo doanh thu</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topProducts || []} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${Math.round(value / 1000000)}tr`} />
                <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => currency(value)} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Trạng thái đơn hàng</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.orderStatusDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Hành động cần xử lý</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/admin/pending-approvals" className="rounded-lg border border-red-100 bg-red-50 p-4 hover:bg-red-100">
            <div className="flex items-center justify-between font-semibold text-red-900"><span>Duyệt tài khoản</span><FiClock /></div>
            <div className="mt-1 text-sm text-red-700">{stats?.pendingApprovals || 0} yêu cầu chờ duyệt</div>
          </Link>
          <Link to="/admin/products" className="rounded-lg border border-yellow-100 bg-yellow-50 p-4 hover:bg-yellow-100">
            <div className="flex items-center justify-between font-semibold text-yellow-900"><span>Duyệt sản phẩm</span><FiPackage /></div>
            <div className="mt-1 text-sm text-yellow-700">{stats?.pendingProducts || 0} sản phẩm chờ duyệt</div>
          </Link>
          <Link to="/admin/orders" className="rounded-lg border border-blue-100 bg-blue-50 p-4 hover:bg-blue-100">
            <div className="flex items-center justify-between font-semibold text-blue-900"><span>Quản lý đơn hàng</span><FiShoppingBag /></div>
            <div className="mt-1 text-sm text-blue-700">{stats?.totalOrders || 0} đơn hàng</div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
