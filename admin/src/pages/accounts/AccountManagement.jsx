import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Trash2,
  KeyRound,
  Loader2,
  Users,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { usersApi } from '../../api';
import { formatDate } from '../../utils/formatHelpers';
import { Button, Input, Select, Modal } from '../../components/ui';

const PERMISSION_ROLES = [
  {
    value: 'SUPER_ADMIN',
    shortLabel: 'Admin Server',
    label: 'SUPER_ADMIN — Quản trị Hệ thống (Admin Server)',
    badgeClass:
      'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    desc: 'Quản lý tài khoản toàn hệ thống và xem Dashboard doanh thu',
  },
  {
    value: 'CRM_MANAGER',
    shortLabel: 'Quản lý CRM',
    label: 'CRM_MANAGER — Người Quản lý Khách hàng (CRM)',
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
    desc: 'Quản lý khách hàng, khảo sát, phản hồi sản phẩm và báo cáo độ tuổi/sở thích',
  },
];

export default function AccountManagement() {
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
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

  const fetchAllAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, customerRes] = await Promise.all([
        usersApi.getUsers({ page: 1, itemPerPage: 100, role: 'admin' }),
        usersApi.getUsers({ page: 1, itemPerPage: 100, role: 'customer' }),
      ]);
      setAdminAccounts(adminRes?.data?.list || []);
      setCustomerAccounts(customerRes?.data?.list || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllAccounts();
  }, [fetchAllAccounts]);

  const combinedAccounts = useMemo(() => {
    let list = [...adminAccounts, ...customerAccounts];

    if (departmentFilter) {
      list = list.filter((acc) => {
        if (departmentFilter === 'CLIENT') return acc.role === 'customer';
        return (
          acc.role === 'admin' &&
          (acc.adminRole || acc.department) === departmentFilter
        );
      });
    }

    if (statusFilter) {
      list = list.filter((acc) => acc.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (acc) =>
          acc.fullName?.toLowerCase().includes(q) ||
          acc.email?.toLowerCase().includes(q) ||
          acc.phone?.toLowerCase().includes(q) ||
          acc.userCode?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [adminAccounts, customerAccounts, departmentFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = adminAccounts.length + customerAccounts.length;
    const lockedCount = [...adminAccounts, ...customerAccounts].filter(
      (a) => a.status === 'inactive'
    ).length;
    return {
      total,
      admins: adminAccounts.length,
      customers: customerAccounts.length,
      lockedCount,
    };
  }, [adminAccounts, customerAccounts]);

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
      department: acc.adminRole || acc.department || 'CRM_MANAGER',
      status: acc.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenPermissionModal = (acc) => {
    setPermModalAccount(acc);
    setSelectedDepartment(acc.adminRole || acc.department || 'CRM_MANAGER');
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
      fetchAllAccounts();
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
      fetchAllAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Cập nhật phân quyền thất bại');
    } finally {
      setSavingPerm(false);
    }
  };

  const handleToggleLock = async (acc) => {
    const nextStatus = acc.status === 'active' ? 'inactive' : 'active';
    const label = nextStatus === 'inactive' ? 'KHÓA' : 'MỞ KHÓA';
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn ${label} tài khoản "${acc.fullName}" (${acc.email})?`
      )
    ) {
      return;
    }
    try {
      await usersApi.updateUserStatus(acc.id, nextStatus);
      fetchAllAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản');
    }
  };

  const handleDeleteAccount = async (acc) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn XÓA tài khoản "${acc.fullName}" (${acc.email})?`
      )
    ) {
      return;
    }
    try {
      await usersApi.deleteUser(acc.id);
      fetchAllAccounts();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa tài khoản');
    }
  };

  const getPermissionBadge = (acc) => {
    if (acc.role === 'customer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Khách hàng (Client)
        </span>
      );
    }
    const code = acc.adminRole || acc.department || 'CRM_MANAGER';
    const found = PERMISSION_ROLES.find((r) => r.value === code) || PERMISSION_ROLES[0];
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${found.badgeClass}`}
      >
        <KeyRound className="w-3.5 h-3.5" />
        {found.shortLabel}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý Tài khoản &amp; Phân quyền
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Thêm mới, khóa/mở khóa, xóa và cấp quyền vai trò cho các tài khoản trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" icon={RefreshCw} onClick={fetchAllAccounts}>
            Làm mới
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={handleOpenCreate}
            className="bg-rose-600 hover:bg-rose-700 border-none"
          >
            + Thêm Tài khoản
          </Button>
        </div>
      </div>

      {/* 4 Compact Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng tài khoản</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Quản trị &amp; Quản lý
            </p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.admins}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Khách hàng</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.customers}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Đã khóa</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {stats.lockedCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accounts Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Tìm theo mã, họ tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              options={[
                { value: '', label: 'Tất cả vai trò' },
                { value: 'SUPER_ADMIN', label: 'Admin Server (SUPER_ADMIN)' },
                { value: 'CRM_MANAGER', label: 'Quản lý CRM (CRM_MANAGER)' },
                { value: 'CLIENT', label: 'Khách hàng (Client)' },
              ]}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-52"
            />
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

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              <span className="ml-2 text-sm text-slate-500">Đang tải danh sách tài khoản...</span>
            </div>
          ) : combinedAccounts.length === 0 ? (
            <div className="text-center py-14 text-slate-500 text-sm">
              Không tìm thấy tài khoản nào phù hợp.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">Mã TK</th>
                  <th className="px-4 py-3">Họ tên &amp; Email</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {combinedAccounts.map((acc) => {
                  const isLocked = acc.status === 'inactive';
                  const code =
                    acc.userCode ||
                    (acc.role === 'admin'
                      ? `ADM-${acc.id.slice(0, 6).toUpperCase()}`
                      : `CUS-${acc.id.slice(0, 6).toUpperCase()}`);
                  return (
                    <tr
                      key={`${acc.role}-${acc.id}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                          {acc.fullName}
                        </div>
                        <div className="text-xs text-slate-500">{acc.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {acc.phone || '—'}
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
                          {isLocked ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(acc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {acc.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={KeyRound}
                              onClick={() => handleOpenPermissionModal(acc)}
                              title="Phân quyền vai trò"
                            >
                              Phân quyền
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => handleOpenEdit(acc)}
                            title="Sửa tài khoản"
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
                            title={isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
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
        title={editingAccount ? 'Cập nhật Tài khoản' : 'Thêm Tài khoản Mới'}
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
            placeholder="Nguyễn Văn A"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          />
          <Input
            label="Email đăng nhập *"
            type="email"
            placeholder="user@miva.vn"
            value={formData.email}
            disabled={!!editingAccount}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          {!editingAccount && (
            <Input
              label="Mật khẩu"
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
              label="Loại tài khoản"
              options={[
                { value: 'admin', label: 'Tài khoản Quản trị / Quản lý bộ phận' },
                { value: 'customer', label: 'Tài khoản Khách hàng (Client)' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          )}
          {formData.role === 'admin' && (
            <Select
              label="Phân quyền vai trò"
              options={PERMISSION_ROLES.map((r) => ({ value: r.value, label: r.label }))}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          )}
          <Select
            label="Trạng thái"
            options={[
              { value: 'active', label: 'Hoạt động (Active)' },
              { value: 'inactive', label: 'Khóa tài khoản (Inactive)' },
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
        title={`Phân quyền: ${permModalAccount?.fullName || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPermModalAccount(null)} disabled={savingPerm}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSavePermission} disabled={savingPerm}>
              {savingPerm ? 'Đang lưu...' : 'Lưu phân quyền'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Chọn vai trò cho tài khoản <strong>{permModalAccount?.email}</strong>:
          </p>
          <div className="space-y-2.5">
            {PERMISSION_ROLES.map((roleInfo) => {
              const checked = selectedDepartment === roleInfo.value;
              return (
                <label
                  key={roleInfo.value}
                  onClick={() => setSelectedDepartment(roleInfo.value)}
                  className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                    checked
                      ? 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {roleInfo.label}
                    </span>
                    <input
                      type="radio"
                      name="departmentRole"
                      checked={checked}
                      onChange={() => setSelectedDepartment(roleInfo.value)}
                      className="text-rose-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{roleInfo.desc}</p>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
