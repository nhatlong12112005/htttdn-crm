import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Edit,
  Lock,
  Unlock,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
} from 'lucide-react';
import { usersApi } from '../../api';
import { formatDate } from '../../utils/formatHelpers';
import { Button, Input, Select } from '../../components/ui';
import UserFormModal from './UserFormModal';
import UserDetailModal from './UserDetailModal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [userToView, setUserToView] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, itemPerPage: 10, role: 'customer' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await usersApi.getUsers(params);
      const data = res.data;
      setUsers(data.list || []);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.totalItems || 0);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const getStatusBadge = (status) => {
    return status === 'active'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
  };

  const handleAddClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (user) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleViewClick = (user) => {
    setUserToView(user);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'inactive' ? 'khóa' : 'mở khóa';
    if (
      window.confirm(
        `Bạn có chắc chắn muốn ${actionLabel} tài khoản khách hàng "${user.fullName || user.email}"?`
      )
    ) {
      try {
        await usersApi.updateUserStatus(user.id, nextStatus);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || `Không thể ${actionLabel} tài khoản khách hàng`);
      }
    }
  };

  const handleDeleteUser = async (user) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa khách hàng "${user.fullName || user.email}"?`
      )
    ) {
      try {
        await usersApi.deleteUser(user.id);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Không thể xóa khách hàng');
      }
    }
  };

  const handleSave = async (savedData) => {
    try {
      if (userToEdit) {
        await usersApi.updateUser(userToEdit.id, savedData);
      } else {
        await usersApi.createUser({ ...savedData, role: 'customer' });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          'Lưu khách hàng thất bại'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            Quản lý Khách hàng (CRM)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thêm mới, chỉnh sửa hồ sơ, khóa/mở khóa và xóa tài khoản khách hàng ({totalItems} khách hàng)
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleAddClick}>
          Thêm khách hàng mới
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Tìm kiếm khách hàng theo họ tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hoạt động (Active)' },
              { value: 'inactive', label: 'Đã khóa tài khoản (Locked)' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-56"
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-500">Đang tải danh sách khách hàng...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400">
              Không tìm thấy khách hàng nào.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Mã KH
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Khách hàng
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Email & SĐT
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Ngày đăng ký
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                    Thao tác CRM
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const code = user.userCode || `CUS-${user.id.slice(0, 8).toUpperCase()}`;
                  const isLocked = user.status === 'inactive';
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          {code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold mr-3 overflow-hidden shrink-0">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.fullName?.charAt(0) || '?'
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 block">
                              {user.fullName}
                            </span>
                            {user.address && (
                              <span className="text-xs text-slate-400 truncate max-w-[220px] block">
                                {user.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        <div>{user.email}</div>
                        {user.phone && <div className="text-xs text-slate-400">{user.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                            user.status
                          )}`}
                        >
                          {isLocked ? 'Đã khóa tài khoản' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            className="text-slate-400 hover:text-blue-600"
                            onClick={() => handleViewClick(user)}
                            title="Xem chi tiết khách hàng"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            className="text-slate-400 hover:text-amber-600"
                            onClick={() => handleEditClick(user)}
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
                            onClick={() => handleToggleStatus(user)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản khách hàng'}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteUser(user)}
                            title="Xóa khách hàng"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Trang {page} / {totalPages} ({totalItems} khách hàng)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        )}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={userToEdit}
        onSave={handleSave}
      />

      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={userToView}
      />
    </div>
  );
}
