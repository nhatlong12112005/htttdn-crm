import { useEffect, useState } from 'react';
import { reportsApi } from '../../api';

const money = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : '—';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default function Reconciliation() {
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (endDate < startDate) return;
    let alive = true;
    setLoading(true);
    reportsApi.getReconciliation({ startDate, endDate, page, itemPerPage: 20, kind })
      .then((response) => { if (alive) { setData(response.data); setError(''); } })
      .catch((err) => { if (alive) setError(err.response?.data?.message || 'Không tải được dữ liệu đối soát'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [startDate, endDate, page, kind]);

  const summary = data?.summary || {};
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Đối soát thanh toán</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          GMV theo ngày tạo đơn đã hoàn tất; tiền thu theo ngày thanh toán; hoàn tiền theo ngày hoàn tiền.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Từ ngày
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="block mt-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-normal text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 dark:[color-scheme:dark]"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Đến ngày
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="block mt-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-normal text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 dark:[color-scheme:dark]"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => { setKind('all'); setPage(1); }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Xem tất cả đơn
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Đang xem: <strong className="text-slate-700 dark:text-slate-200">{({ all: 'tất cả', gmv: 'đơn tạo GMV', paid: 'đơn đã thu tiền', refund: 'đơn hoàn tiền', net: 'đơn thu hoặc hoàn tiền' })[kind]}</strong>
          </span>
        </div>
      </div>

      {endDate < startDate && <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">Ngày kết thúc phải sau ngày bắt đầu.</p>}
      {error && <p className="text-rose-600 dark:text-rose-400 text-sm font-medium">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['GMV', summary.totalGmv, 'gmv', 'text-slate-900 dark:text-white'],
          ['Đã thu', summary.grossCashIn, 'paid', 'text-emerald-600 dark:text-emerald-400'],
          ['Hoàn tiền', summary.refundedAmount, 'refund', 'text-rose-600 dark:text-rose-400'],
          ['Thu ròng', summary.netCashIn, 'net', 'text-blue-600 dark:text-blue-400'],
          ['Chênh lệch với GMV', summary.difference, 'all', 'text-amber-600 dark:text-amber-400'],
        ].map(([label, value, cardKind, valueColor]) => (
          <button
            key={label}
            onClick={() => { setKind(cardKind); setPage(1); }}
            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border text-left transition-all shadow-sm hover:border-blue-400 dark:hover:border-blue-500 ${
              kind === cardKind
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <strong className={`block text-lg font-bold mt-1 ${valueColor}`}>{money(value)}</strong>
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chênh lệch phát sinh khi đơn đã thanh toán nhưng chưa hoàn tất, đơn hoàn tất được thanh toán ở kỳ khác, hoặc có hoàn tiền. Cột từng đơn bên dưới cho biết khoản nào được tính vào mỗi tổng.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Các khoản hoàn tiền cũ được gán ngày từ lần cập nhật cuối của thanh toán khi chuyển đổi dữ liệu.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              {['Đơn hàng', 'Khách hàng', 'Trạng thái đơn', 'Thanh toán', 'Ngày tạo', 'Ngày thu', 'Ngày hoàn', 'GMV', 'Đã thu', 'Hoàn tiền', 'Chênh lệch'].map((h) => (
                <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data?.list?.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{row.orderCode}</td>
                <td className="px-3 py-3 text-slate-700 dark:text-slate-200 truncate max-w-[140px]" title={row.client?.fullName}>{row.client?.fullName || '—'}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.orderStatus}</td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.paymentMethod || '—'} · {row.paymentStatus || '—'}</td>
                <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{dateTime(row.orderCreatedAt)}</td>
                <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{dateTime(row.paidAt)}</td>
                <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{dateTime(row.refundedAt)}</td>
                <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{money(row.gmv)}</td>
                <td className="px-3 py-3 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{money(row.cashIn)}</td>
                <td className="px-3 py-3 font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">{money(row.refund)}</td>
                <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{money(row.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data?.list?.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Không có giao dịch trong khoảng thời gian này.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 text-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {loading ? 'Đang tải...' : `Trang ${page} / ${data?.totalPages || 1}`}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          Trước
        </button>
        <button
          disabled={page >= (data?.totalPages || 1)}
          onClick={() => setPage(page + 1)}
          className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
