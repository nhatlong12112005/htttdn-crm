import { useState, useEffect, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Package,
  RefreshCw,
  Calendar,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { reportsApi } from '../../api';
import { Button, Badge } from '../../components/ui';

export default function Analytics() {
  const [loading, setLoading] = useState(true);

  // Period controls: 'all' | 'custom' | 'year' | 'quarter' | 'month' | 'week'
  const [period, setPeriod] = useState('all');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedQuarter, setSelectedQuarter] = useState(4);
  const [availableYears, setAvailableYears] = useState([2026, 2025]);
  const [startDate, setStartDate] = useState('2026-09-19');
  const [endDate, setEndDate] = useState('2026-10-27');

  const [analyticsData, setAnalyticsData] = useState({
    summary: {
      totalGmv: 0,
      totalCashIn: 0,
      totalRefundedAmount: 0,
      netCashIn: 0,
      totalAdminRevenue: 0,
      orderTaxRevenue: 0,
      vendorNetRevenue: 0,
      totalOrdersCount: 0,
      completedOrdersCount: 0,
      cancelledOrdersCount: 0,
      returnedOrdersCount: 0,
      refundedOrdersCount: 0,
      conversionRate: 0,
    },
    chartData: [],
    topProducts: [],
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportsApi.getAnalytics({
        period,
        year: selectedYear,
        month: selectedMonth,
        quarter: selectedQuarter,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        vendorRegistrationFee: 0,
        commissionTaxRate: 8,
      });

      if (res.data) {
        setAnalyticsData(res.data);
        if (res.data.availableYears && res.data.availableYears.length > 0) {
          setAvailableYears(res.data.availableYears);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics from backend:', err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedYear, selectedMonth, selectedQuarter, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    window.addEventListener('miva:dashboard', fetchAnalytics);
    return () => window.removeEventListener('miva:dashboard', fetchAnalytics);
  }, [fetchAnalytics]);

  const formatVND = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const { summary, chartData, topProducts } = analyticsData;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard Doanh thu
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Thống kê doanh thu và đơn hàng theo chu kỳ. Chi tiết thanh toán nằm trong mục Đối soát.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchAnalytics}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Period Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-rose-600" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kỳ thống kê:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
            {[
              { id: 'all', label: 'Toàn bộ' },
              { id: 'year', label: 'Theo năm' },
              { id: 'quarter', label: 'Theo quý' },
              { id: 'month', label: 'Theo tháng' },
              { id: 'week', label: 'Theo tuần' },
              { id: 'custom', label: 'Tùy chọn ngày' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>
          )}

          {period !== 'all' && period !== 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {period === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {period === 'quarter' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
              >
                <option value={1}>Quý 1 (T1 - T3)</option>
                <option value={2}>Quý 2 (T4 - T6)</option>
                <option value={3}>Quý 3 (T7 - T9)</option>
                <option value={4}>Quý 4 (T10 - T12)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Tổng Doanh Thu (GMV)',
            value: formatVND(summary.totalGmv),
            sub: `${summary.completedOrdersCount || 0} đơn hoàn tất`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-950/60',
          },
          {
            title: 'Thực Thu Sau Hoàn Tiền',
            value: formatVND(summary.netCashIn),
            sub: `Đã thu: ${formatVND(summary.totalCashIn)}`,
            icon: Wallet,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-950/60',
          },
          {
            title: 'Tổng Tiền Hoàn Trả (Refund)',
            value: formatVND(summary.totalRefundedAmount),
            sub: `${summary.refundedOrdersCount || 0} đơn hoàn tiền • ${summary.returnedOrdersCount || 0} đơn trả hàng`,
            icon: RotateCcw,
            color: 'text-rose-600',
            bg: 'bg-rose-100 dark:bg-rose-950/60',
          },
          {
            title: 'Tổng Đơn Hàng',
            value: (summary.totalOrdersCount || 0).toLocaleString(),
            sub: `${summary.completedOrdersCount || 0} hoàn tất • ${summary.returnedOrdersCount || 0} trả hàng • ${summary.cancelledOrdersCount || 0} hủy (${summary.conversionRate || 0}%)`,
            icon: ShoppingBag,
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-950/60',
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {card.value}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue trend chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Biểu đồ doanh thu & hoàn tiền
            </h3>
            <p className="text-xs text-slate-400">
              Giá trị các đơn đã hoàn tất (GMV) và số tiền hoàn trả theo thời gian
            </p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRefund" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  dx={-10}
                  tickFormatter={(val) =>
                    new Intl.NumberFormat('vi-VN', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(val)
                  }
                  width={65}
                />
                <RechartsTooltip
                  formatter={(val, name) => [formatVND(val), name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  name="Tổng Doanh Thu (GMV)"
                  stroke="#e11d48"
                  fillOpacity={1}
                  fill="url(#colorGmv)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="refundedAmount"
                  name="Tiền Hoàn Trả (Refund)"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorRefund)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Breakdown Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Đơn Hoàn tất, Trả hàng & Đã hủy
            </h3>
            <p className="text-xs text-slate-400">Số lượng đơn hàng theo mốc thời gian</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  width={30}
                />
                <RechartsTooltip
                  formatter={(val, name) => [`${val} đơn`, name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="completedOrders" name="Hoàn tất" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returnedOrders" name="Trả hàng & Hoàn tiền" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelledOrders" name="Đã hủy" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-600" />
            Top Sản phẩm Doanh thu Cao nhất
          </h3>
        </div>

        {topProducts.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-sm">
            Chưa có dữ liệu sản phẩm bán ra trong kỳ đã chọn
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                  <th className="pb-2.5">Sản phẩm</th>
                  <th className="pb-2.5">Danh mục</th>
                  <th className="pb-2.5 text-center">Đã bán</th>
                  <th className="pb-2.5 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topProducts.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-bold flex items-center justify-center text-[11px]">
                        {i + 1}
                      </span>
                      <span>{p.name}</span>
                    </td>
                    <td className="py-2.5 text-slate-500">
                      <Badge variant="outline" className="text-[10px] py-0 px-2">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-center font-semibold text-slate-800 dark:text-slate-100">
                      {p.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatVND(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
