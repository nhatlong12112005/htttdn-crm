import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Trash2,
  KeyRound,
  Loader2,
  CheckCircle2,
  Server,
  Users,
  Edit,
} from 'lucide-react';
import { usersApi } from '../../api';
import { formatDate } from '../../utils/formatHelpers';
import { Button, Input, Select, Modal } from '../../components/ui';

const PERMISSION_ROLES = [
  {
    value: 'SUPER_ADMIN',
    label: 'SUPER_ADMIN — Quản trị Hệ thống (Admin Server)',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    permissions: [
      'Thêm, xóa, khóa/mở khóa tài khoản hệ thống',
      'Phân quyền vai trò (Admin Server / Quản lý CRM)',
      'Cấu hình danh mục, đơn hàng và toàn quyền hệ thống',
    ],
  },
  {
    value: 'CRM_MANAGER',
    label: 'CRM_MANAGER — Người Quản lý Khách hàng (CRM)',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    permissions: [
      'Thêm, sửa, xóa và khóa tài khoản khách hàng',
      'Tiếp nhận và phản hồi đánh giá sản phẩm của khách hàng',
      'Tạo bảng khảo sát, gửi đến khách hàng & thống kê kết quả',
      'Xem báo cáo khách hàng theo tỷ lệ độ tuổi & sở thích',
    ],
  },
];

export default function AccountManagement() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('admin'); // 'admin' | 'customer' | ''
  const [statusFilter, setStatusFilter] = useState('');

  // Create / Edit Account Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'admin',
    department: 'CRM_MANAGER',
    status: 'active',
  });

  // Permission Assignment Modal
  const [permModalAccount, setPermModalAccount] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('CRM_MANAGER');
  const [savingPerm, setSavingPerm] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, itemPerPage: 50 };
      if (accountTypeFilter) params.role = accountTypeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await usersApi.getUsers(params);
      const list = res?.data?.list || [];
      // Chỉ hiển thị tài khoản admin và customer (không hiển thị vendor/employee cũ)
      setAccounts(list.filter((u) => u.role === 'admin' || u.role === 'customer'));
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [accountTypeFilter, statusFilter, search]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      role: 'admin',
      department: 'CRM_MANAGER',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc) => {
    setEditingAccount(acc);
    setFormData({
      fullName: acc.fullName || '',
      email: acc.email || '',
      password: '',
      phone: acc.phone || '',
      role: acc.role || 'admin',
      department: acc.department || acc.adminRole || 'SUPER_ADMIN',
      status: acc.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenPermissionModal = (acc) => {
    setPermModalAccount(acc);
    setSelectedDepartment(acc.department || acc.adminRole || 'SUPER_ADMIN');
  };

  const handleSaveAccount = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert('Vui lòng nhập đầy đủ Họ tên và Email');
      return;
    }
    if (!editingAccount && formData.password && formData.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        await usersApi.updateUser(editingAccount.id, {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || null,
          status: formData.status,
          ...(editingAccount.role === 'admin' ? { department: formData.department } : {}),
        });
      } else {
        await usersApi.createUser({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || 'admin123',
          phone: formData.phone.trim() || null,
          role: formData.role,
          status: formData.status,
          ...(formData.role === 'admin' ? { department: formData.department } : {}),
        });
      }
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err) {
      alert(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Không thể lưu tài khoản'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermission = async () => {
    if (!permModalAccount) return;
    setSavingPerm(true);
    try {
      await usersApi.updateUser(permModalAccount.id, {
        department: selectedDepartment,
      });
      setPermModalAccount(null);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật phân quyền thất bại');
    } finally {
      setSavingPerm(false);
    }
  };

  const handleToggleLock = async (acc) => {
    const nextStatus = acc.status === 'active' ? 'inactive' : 'active';
    const label = nextStatus === 'inactive' ? 'KHÓA' : 'MỞ KHÓA';
    if (!window.confirm(`Bạn có chắc chắn muốn ${label} tài khoản "${acc.fullName}" (${acc.email})?`)) {
      return;
    }
    try {
      await usersApi.updateUserStatus(acc.id, nextStatus);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản');
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA tài khoản "${acc.fullName}" (${acc.email})?`)) {
      return;
    }
    try {
      await usersApi.deleteUser(acc.id);
      fetchAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa tài khoản');
    }
  };

  const getPermissionBadge = (acc) => {
    if (acc.role === 'customer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          CLIENT — Khách hàng
        </span>
      );
    }
    const code = acc.department || acc.adminRole || 'SUPER_ADMIN';
    const found = PERMISSION_ROLES.find((r) => r.value === code) || PERMISSION_ROLES[0];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${found.badgeClass}`}>
        <KeyRound className="w-3.5 h-3.5" />
        {found.value === 'SUPER_ADMIN' ? 'Admin Server (Toàn quyền)' : 'Quản lý CRM (Khách hàng)'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
            <Server className="w-3.5 h-3.5" />
            PHÂN HỆ ADMIN SERVER — TÁCH BIỆT NGHIỆP VỤ CRM
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            Quản lý Tài khoản & Phân quyền Hệ thống
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Thêm mới, xóa, khóa tài khoản và cấp quyền truy cập giữa Quản trị Hệ thống (Admin Server) và Người Quản lý Khách hàng (CRM Manager).
          </p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={handleOpenCreate}>
          Thêm tài khoản mới
        </Button>
      </div>

      {/* Role Permission Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERMISSION_ROLES.map((roleInfo) => (
          <div
            key={roleInfo.value}
            className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleInfo.badgeClass}`}>
                {roleInfo.label}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {roleInfo.permissions.map((perm, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Filter & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAccountTypeFilter('admin')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                accountTypeFilter === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Tài khoản Quản trị & CRM
            </button>
            <button
              onClick={() => setAccountTypeFilter('customer')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                accountTypeFilter === 'customer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Tài khoản Khách hàng (Client)
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-lg justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'inactive', label: 'Đã khóa' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-sm text-slate-500">Đang tải danh sách tài khoản...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              Không tìm thấy tài khoản nào phù hợp.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">Mã TK</th>
                  <th className="px-4 py-3">Họ tên & Email</th>
                  <th className="px-4 py-3">Vai trò & Phân quyền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác Quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((acc) => {
                  const isLocked = acc.status === 'inactive';
                  const code =
                    acc.userCode ||
                    (acc.role === 'admin'
                      ? `ADM-${acc.id.slice(0, 6).toUpperCase()}`
                      : `CUS-${acc.id.slice(0, 6).toUpperCase()}`);
                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                          {acc.fullName}
                        </div>
                        <div className="text-xs text-slate-500">{acc.email}</div>
                      </td>
                      <td className="px-4 py-3">{getPermissionBadge(acc)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isLocked
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isLocked ? 'Đã khóa (Inactive)' : 'Hoạt động (Active)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(acc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {acc.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={KeyRound}
                              onClick={() => handleOpenPermissionModal(acc)}
                              title="Phân quyền tài khoản"
                            >
                              Phân quyền
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => handleOpenEdit(acc)}
                            title="Chỉnh sửa thông tin"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={isLocked ? Unlock : Lock}
                            className={
                              isLocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }
                            onClick={() => handleToggleLock(acc)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteAccount(acc)}
                            title="Xóa tài khoản"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Thêm / Sửa Tài Khoản */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Cập nhật Tài khoản Hệ thống' : 'Thêm Tài khoản Mới & Phân quyền'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveAccount} disabled={saving}>
              {saving ? 'Đang lưu...' : editingAccount ? 'Lưu cập nhật' : 'Tạo tài khoản'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Họ và tên *"
            placeholder="Nguyễn Quản Trị"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
          <Input
            label="Email đăng nhập *"
            type="email"
            placeholder="crm.manager@miva.vn"
            value={formData.email}
            disabled={!!editingAccount}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          {!editingAccount && (
            <Input
              label="Mật khẩu khởi tạo"
              type="password"
              placeholder="Tối thiểu 6 ký tự (mặc định: admin123)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}
          <Input
            label="Số điện thoại"
            placeholder="0901234567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          {!editingAccount && (
            <Select
              label="Loại tài khoản (Account Type)"
              options={[
                { value: 'admin', label: 'Tài khoản Quản trị / Quản lý (Admin & CRM)' },
                { value: 'customer', label: 'Tài khoản Khách hàng (Client)' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          )}
          {formData.role === 'admin' && (
            <Select
              label="Phân quyền vai trò hệ thống"
              options={PERMISSION_ROLES.map((r) => ({ value: r.value, label: r.label }))}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          )}
          <Select
            label="Trạng thái hoạt động"
            options={[
              { value: 'active', label: 'Active (Hoạt động)' },
              { value: 'inactive', label: 'Inactive (Khóa tài khoản)' },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modal Phân quyền nhanh */}
      <Modal
        isOpen={!!permModalAccount}
        onClose={() => setPermModalAccount(null)}
        title={`Phân quyền Tài khoản: ${permModalAccount?.fullName || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPermModalAccount(null)} disabled={savingPerm}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSavePermission} disabled={savingPerm}>
              {savingPerm ? 'Đang lưu...' : 'Xác nhận Phân quyền'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Chọn nhóm quyền cho tài khoản <strong>{permModalAccount?.email}</strong>:
          </p>
          <div className="space-y-3">
            {PERMISSION_ROLES.map((roleInfo) => {
              const checked = selectedDepartment === roleInfo.value;
              return (
                <label
                  key={roleInfo.value}
                  onClick={() => setSelectedDepartment(roleInfo.value)}
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {roleInfo.label}
                    </span>
                    <input
                      type="radio"
                      name="departmentRole"
                      checked={checked}
                      onChange={() => setSelectedDepartment(roleInfo.value)}
                      className="text-indigo-600"
                    />
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {roleInfo.permissions.map((p, idx) => (
                      <li key={idx}>• {p}</li>
                    ))}
                  </ul>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
