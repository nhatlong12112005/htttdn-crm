import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Tags,
  ShoppingCart,
  Ticket,
  MessageSquare,
  LineChart,
  LogOut,
  ClipboardList,
  PieChart,
  ShieldCheck,
  Server,
  KeyRound,
} from 'lucide-react';

const adminServerGroups = [
  {
    title: 'QUẢN TRỊ HỆ THỐNG (ADMIN SERVER)',
    items: [
      {
        name: 'Tài khoản & Phân quyền',
        path: '/system/accounts',
        icon: KeyRound,
      },
    ],
  },
];

const crmManagerGroups = [
  {
    title: 'MÔ PHỎNG HỆ THỐNG CRM (MỤC 4.1)',
    items: [
      { name: 'Tổng quan CRM', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Quản lý Khách hàng', path: '/users', icon: Users },
      { name: 'Tiếp nhận Phản hồi KH', path: '/reviews', icon: MessageSquare },
      { name: 'Khảo sát & Thống kê', path: '/surveys', icon: ClipboardList },
      { name: 'Báo cáo Độ tuổi & Sở thích', path: '/customer-analytics', icon: PieChart },
    ],
  },
  {
    title: 'DANH MỤC & ĐƠN HÀNG',
    items: [
      { name: 'Danh mục Sản phẩm', path: '/categories', icon: Tags },
      { name: 'Quản lý Đơn hàng', path: '/orders', icon: ShoppingCart },
      { name: 'Mã giảm giá', path: '/vouchers', icon: Ticket },
      { name: 'Báo cáo Doanh thu', path: '/analytics', icon: LineChart },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const isCrmOnlyRole = user?.department === 'CRM_MANAGER';
  const [workspaceMode, setWorkspaceMode] = useState(() =>
    location.pathname.startsWith('/system') && !isCrmOnlyRole ? 'system' : 'crm'
  );

  useEffect(() => {
    if (isCrmOnlyRole) {
      setWorkspaceMode('crm');
    } else if (location.pathname.startsWith('/system')) {
      setWorkspaceMode('system');
    }
  }, [location.pathname, isCrmOnlyRole]);

  const handleSwitchMode = (mode) => {
    setWorkspaceMode(mode);
    if (mode === 'system') {
      navigate('/system/accounts');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const activeGroups = workspaceMode === 'system' ? adminServerGroups : crmManagerGroups;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col shrink-0 border-r border-slate-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0 bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md ${
              workspaceMode === 'system'
                ? 'bg-gradient-to-tr from-rose-600 to-amber-500 shadow-rose-600/30'
                : 'bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-indigo-600/30'
            }`}
          >
            {workspaceMode === 'system' ? (
              <Server className="w-4 h-4" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-white tracking-wider">
              {workspaceMode === 'system' ? 'ADMIN SERVER' : 'CRM MANAGEMENT'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {workspaceMode === 'system'
                ? 'Quản trị Tài khoản & Phân quyền'
                : 'Hệ thống Quản lý Khách hàng'}
            </p>
          </div>
        </div>
      </div>

      {/* Separation Switcher between Admin Server UI & CRM Manager UI */}
      {!isCrmOnlyRole && (
        <div className="p-3 border-b border-slate-800 bg-slate-950/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
            Chuyển đổi Phân hệ Giao diện
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchMode('crm')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                workspaceMode === 'crm'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quản lý CRM
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('system')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                workspaceMode === 'system'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin Server
            </button>
          </div>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {activeGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {group.title}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? workspaceMode === 'system'
                              ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/25'
                              : 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/25'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 mr-2.5 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sticky User Profile & Logout Footer */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-900/95 shrink-0">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 mb-2 rounded-lg bg-slate-800/50 text-xs">
          <div className="truncate">
            <p className="font-semibold text-slate-200 truncate">
              {user?.fullName || 'Quản trị viên'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.email || 'admin@miva.vn'}
            </p>
          </div>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              isCrmOnlyRole
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {isCrmOnlyRole ? 'CRM MGR' : 'ADMIN'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
