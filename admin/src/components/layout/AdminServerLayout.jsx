import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Server,
  LogOut,
  Sun,
  Moon,
  UserCheck,
  KeyRound,
  LineChart,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const ADMIN_NAV_ITEMS = [
  {
    name: 'Quản lý Tài khoản',
    path: '/system/accounts',
    icon: KeyRound,
  },
  {
    name: 'Dashboard Doanh thu',
    path: '/system/revenue',
    icon: LineChart,
  },
];

export default function AdminServerLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login/admin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Clean Horizontal Header */}
      <header className="bg-slate-900 dark:bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand + 2 Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold tracking-wide text-white">
                Admin Server
              </span>
            </div>

            <nav className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Đổi giao diện Sáng / Tối"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <UserCheck className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-medium text-slate-200">
                {user?.fullName || 'Admin'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
