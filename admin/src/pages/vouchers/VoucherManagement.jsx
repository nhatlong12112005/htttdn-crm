import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Eye, Edit, Lock, Unlock, CalendarClock, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { vouchersApi } from '../../api';
import { formatCurrency, formatDate } from '../../utils/formatHelpers';
import { Button, Select, Badge, Modal, Input } from '../../components/ui';
import VoucherFormModal from './VoucherFormModal';

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Client-side pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voucherToEdit, setVoucherToEdit] = useState(null);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vouchersApi.getVouchers();
      // res.data could be an array or paginated object, fallback if needed
      const data = res.data.list ? res.data.list : (Array.isArray(res.data) ? res.data : []);
      setVouchers(data);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Client-side filtering
  const filteredVouchers = useMemo(() => {
    const q = search.toLowerCase();
    return vouchers.filter(v =>
      (v.code || '').toLowerCase().includes(q) ||
      (v.name || '').toLowerCase().includes(q) ||
      (v.categories || []).some(c => (c.name || '').toLowerCase().includes(q))
    );
  }, [vouchers, search]);

  // Client-side pagination derivation
  const totalItems = filteredVouchers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  const currentVouchers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredVouchers.slice(start, start + itemsPerPage);
  }, [filteredVouchers, page, itemsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleAddClick = () => {
    setVoucherToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (voucher) => {
    setVoucherToEdit(voucher);
    setIsModalOpen(true);
  };

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [voucherToRenew, setVoucherToRenew] = useState(null);
  const [renewEndDate, setRenewEndDate] = useState('');

  const handleToggleStatus = async (voucher) => {
    const nextStatus = voucher.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'inactive' ? 'khóa' : 'mở khóa';
    if (window.confirm(`Bạn có chắc chắn muốn ${actionLabel} voucher "${voucher.code}"?`)) {
      try {
        await vouchersApi.updateVoucher(voucher.id, { status: nextStatus });
        await fetchVouchers();
      } catch (err) {
        alert(err.response?.data?.message || `Không thể ${actionLabel} voucher`);
      }
    }
  };

  const handleOpenRenew = (voucher) => {
    setVoucherToRenew(voucher);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setRenewEndDate(`${yyyy}-${mm}-${dd}`);
    setIsRenewModalOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!voucherToRenew || !renewEndDate) return;
    try {
      const endDate = new Date(renewEndDate);
      endDate.setHours(23, 59, 59, 999);
      await vouchersApi.updateVoucher(voucherToRenew.id, {
        endDate: endDate.toISOString(),
        status: 'active',
      });
      setIsRenewModalOpen(false);
      setVoucherToRenew(null);
      await fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gia hạn voucher thất bại');
    }
  };

  const handleSave = async (savedData) => {
    if (voucherToEdit) {
      await vouchersApi.updateVoucher(voucherToEdit.id, savedData);
    } else {
      await vouchersApi.createVoucher(savedData);
    }
    setIsModalOpen(false);
    await fetchVouchers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quản lý Voucher</h1>
          <p className="text-slate-500 dark:text-slate-400">{totalItems} vouchers</p>
        </div>
        <Button icon={Plus} onClick={handleAddClick}>
          Thêm Voucher
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 max-w-md">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input type="text" placeholder="Tìm kiếm theo mã hoặc tên..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-800 dark:text-slate-100" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex items-center justify-center py-20">
               <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
               <span className="ml-2 text-slate-500">Đang tải...</span>
             </div>
          ) : currentVouchers.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              Không tìm thấy voucher nào.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Mã code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tên</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Phạm vi áp dụng</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Giảm giá</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Đã dùng</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Thời hạn</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentVouchers.map(v => (
                  <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-sm font-medium">{v.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">{v.name}</td>
                    <td className="px-4 py-3 text-xs">
                      {Array.isArray(v.categories) && v.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.categories.map(cat => (
                            <span
                              key={cat.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 font-medium"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium">
                          Tất cả sản phẩm (Toàn sàn)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                      {v.discountType === 'percentage' ? `${v.discountValue}%` : formatCurrency(v.discountValue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{v.usedQuantity || 0}/{v.quantity}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(v.startDate)} → {formatDate(v.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 dark:text-slate-400'}`}>
                        {v.status ? v.status.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" icon={Edit} className="text-slate-400 hover:text-amber-600" onClick={() => handleEditClick(v)} />
                        <Button variant="ghost" size="sm" icon={v.status === 'active' ? Lock : Unlock} className={v.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} onClick={() => handleToggleStatus(v)} title={v.status === 'active' ? 'Khóa voucher' : 'Mở khóa voucher'} />
                        {(v.status === 'expired' || (v.endDate && new Date(v.endDate) < new Date())) && (
                          <Button variant="ghost" size="sm" icon={CalendarClock} className="text-blue-600 hover:bg-blue-50" onClick={() => handleOpenRenew(v)} title="Gia hạn voucher" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trang {page} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                icon={ChevronLeft} 
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              />
              <Button 
                variant="outline" 
                size="sm" 
                icon={ChevronRight}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <VoucherFormModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          voucherToEdit={voucherToEdit}
          onSave={handleSave}
        />
      )}

      {/* Modal Gia hạn Voucher */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => { setIsRenewModalOpen(false); setVoucherToRenew(null); }}
        title={`Gia hạn Voucher: ${voucherToRenew?.code || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIsRenewModalOpen(false); setVoucherToRenew(null); }}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleConfirmRenew}>
              Xác nhận gia hạn
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Voucher <strong className="text-slate-800 dark:text-slate-200">{voucherToRenew?.code}</strong> đã hết hạn.
            Chọn ngày kết thúc mới để gia hạn và kích hoạt lại voucher.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Ngày kết thúc mới *
            </label>
            <input
              type="date"
              value={renewEndDate}
              onChange={(e) => setRenewEndDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
          </div>
          {voucherToRenew && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div><span className="text-slate-500">Tên:</span> <strong>{voucherToRenew.name}</strong></div>
              <div><span className="text-slate-500">Hạn cũ:</span> {voucherToRenew.endDate ? new Date(voucherToRenew.endDate).toLocaleDateString('vi-VN') : '—'}</div>
              <div><span className="text-slate-500">Đã dùng:</span> {voucherToRenew.usedQuantity || 0}/{voucherToRenew.quantity}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
