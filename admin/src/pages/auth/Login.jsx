import { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Login({ mode: propMode }) {
  const navigate = useNavigate();
  const { login, logout, user, loading } = useAuth();

  const isSystemLogin = propMode === 'admin';

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isSystemLogin ? 'bg-slate-950' : 'bg-slate-50'
        }`}
      >
        <div
          className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
            isSystemLogin ? 'border-rose-500' : 'border-indigo-600'
          }`}
        />
      </div>
    );
  }

  if (user) {
    const isAdminServerUser = user.roleCode === 'SUPER_ADMIN';
    if (isAdminServerUser && isSystemLogin) {
      return <Navigate to="/system/accounts" replace />;
    }
    if (!isAdminServerUser && !isSystemLogin && user.roleCode === 'CRM_MANAGER') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await login(formData.email, formData.password);
      const isAdminServerUser = profile?.roleCode === 'SUPER_ADMIN';

      if (isSystemLogin) {
        if (!isAdminServerUser) {
          await logout();
          setError(
            'Tài khoản này không có quyền truy cập Admin Server!'
          );
          return;
        }
        navigate('/system/accounts');
      } else {
        if (isAdminServerUser) {
          await logout();
          setError(
            'Vui lòng đăng nhập tài khoản Admin tại cổng riêng của Admin Server!'
          );
          return;
        }
        navigate('/dashboard');
      }
    } catch (err) {
      const message =
        err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setError('');
    if (isSystemLogin) {
      setFormData({ email: 'admin@miva.vn', password: 'admin123' });
    } else {
      setFormData({ email: 'crm@miva.vn', password: 'admin123' });
    }
  };

  // ============================================================================
  // GIAO DIỆN ĐĂNG NHẬP 1: ADMIN SERVER (:5175)
  // ============================================================================
  if (isSystemLogin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-600 text-white mb-3 shadow-md">
              <Server className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Server</h1>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý Tài khoản &amp; Dashboard Doanh thu
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-950/70 text-rose-200 text-xs font-medium rounded-xl border border-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Admin
              </label>
              <input
                type="email"
                placeholder="admin@miva.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                className="absolute right-3 top-[32px] p-1 text-slate-400 hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end text-xs">
              <button
                type="button"
                onClick={handleFillDemo}
                className="font-semibold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              >
                Điền nhanh TK Admin (admin@miva.vn)
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-none"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập Admin Server'
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // GIAO DIỆN ĐĂNG NHẬP 2: NGƯỜI QUẢN LÝ CRM (:5174)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-3 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý Khách hàng (CRM)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
            Đăng nhập vào hệ thống quản lý khách hàng &amp; đơn hàng
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/50 text-red-700 dark:text-rose-300 text-xs font-medium rounded-xl border border-red-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="crm@miva.vn"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="relative">
            <Input
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-[28px] p-1 text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-end text-xs">
            <button
              type="button"
              onClick={handleFillDemo}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Điền nhanh TK CRM (crm@miva.vn)
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng nhập CRM'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
