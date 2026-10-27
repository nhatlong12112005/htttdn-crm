import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminServerPort } from '../../utils/portalMode';

export default function ProtectedRoute({ portal }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Đang kiểm tra phiên đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  const isSystemPortal = portal === 'admin' || location.pathname.startsWith('/system');

  if (isSystemPortal !== isAdminServerPort()) {
    return <Navigate to={isAdminServerPort() ? '/login/admin' : '/login/crm'} replace />;
  }

  if (!user) {
    return <Navigate to={isSystemPortal ? '/login/admin' : '/login/crm'} replace />;
  }

  const isAdminServerAccount = user.roleCode === 'SUPER_ADMIN';
  const isCrmAccount = user.roleCode === 'CRM_MANAGER';

  // Tách biệt hoàn toàn: Tài khoản Quản lý (CRM / Bán hàng / HRM / Kho) không được vào Admin Server (/system/*)
  if (isSystemPortal && !isAdminServerAccount) {
    return <Navigate to="/login/admin" replace />;
  }

  // Tách biệt hoàn toàn: Tài khoản Admin Server (SUPER_ADMIN) chỉ ở giao diện Admin Server (/system/accounts), không dùng chung giao diện CRM
  if (!isSystemPortal && isAdminServerAccount) {
    return <Navigate to="/login/crm" replace />;
  }

  if (!isSystemPortal && !isCrmAccount) {
    return <Navigate to="/login/crm" replace />;
  }

  return <Outlet />;
}
