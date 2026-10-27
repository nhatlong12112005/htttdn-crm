import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Tags,
  Package,
  ShoppingCart,
  Ticket,
  MessageSquare,
  LogOut,
  ClipboardList,
  PieChart,
  ShieldCheck,
} from 'lucide-react';

const crmManagerGroups = [
  {
    title: 'QUẢN LÝ KHÁCH HÀNG (CRM)',
    items: [
      { name: 'Tổng quan CRM', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Quản lý Khách hàng', path: '/users', icon: Users },
      { name: 'Phản hồi Sản phẩm', path: '/reviews', icon: MessageSquare },
      { name: 'Khảo sát Khách hàng', path: '/surveys', icon: ClipboardList },
      { name: 'Báo cáo Độ tuổi & Sở thích', path: '/customer-analytics', icon: PieChart },
    ],
  },
  {
    title: 'CỬA HÀNG & ĐƠN HÀNG',
    items: [
      { name: 'Sản phẩm', path: '/products', icon: Package },
      { name: 'Danh mục', path: '/categories', icon: Tags },
      { name: 'Đơn đặt hàng', path: '/orders', icon: ShoppingCart },
      { name: 'Mã giảm giá', path: '/vouchers', icon: Ticket },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login/crm');
  };

  return (
    <aside className="w-64 bg-indigo-950 text-slate-200 h-screen flex flex-col shrink-0 border-r border-indigo-900 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-indigo-900/80 shrink-0 bg-indigo-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md bg-indigo-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              MIVA CRM
            </h1>
            <p className="text-[11px] text-indigo-300">
              Quản lý Khách hàng
            </p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        {crmManagerGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-indigo-300/80 uppercase">
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
                            ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                            : 'text-indigo-200/80 hover:text-white hover:bg-indigo-900/70'
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
      <div className="p-3 border-t border-indigo-900/80 bg-indigo-950 shrink-0">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 mb-2 rounded-lg bg-indigo-900/60 text-xs">
          <div className="truncate">
            <p className="font-semibold text-white truncate">
              {user?.fullName || 'Người Quản lý CRM'}
            </p>
            <p className="text-[10px] text-indigo-300 truncate">
              {user?.email || 'crm@miva.vn'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/25 border border-rose-400/25 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
