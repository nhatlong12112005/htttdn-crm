import { useState, useEffect } from 'react';
import {
  Users,
  ClipboardList,
  MessageSquare,
  Package,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { usersApi, surveysApi, reviewsApi, categoriesApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';

function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-white dark:bg-slate-900 transition-colors p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h2>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSurveys: 0,
    totalReviews: 0,
    totalCategories: 0,
  });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [customersRes, surveysRes, reviewsRes, categoriesRes] = await Promise.allSettled([
          usersApi.getUsers({ page: 1, itemPerPage: 5, role: 'customer' }),
          surveysApi.getSurveys({ page: 1, itemPerPage: 1 }),
          reviewsApi.getReviews({ page: 1, itemPerPage: 1 }),
          categoriesApi.getCategories({ page: 1, itemPerPage: 1 }),
        ]);

        const customersData =
          customersRes.status === 'fulfilled' ? customersRes.value.data : null;
        const surveysData =
          surveysRes.status === 'fulfilled' ? surveysRes.value.data : null;
        const reviewsData =
          reviewsRes.status === 'fulfilled' ? reviewsRes.value.data : null;
        const categoriesData =
          categoriesRes.status === 'fulfilled' ? categoriesRes.value.data : null;

        setStats({
          totalCustomers: customersData?.totalItems || 0,
          totalSurveys: surveysData?.totalItems || 0,
          totalReviews: reviewsData?.totalItems || 0,
          totalCategories: categoriesData?.totalItems || 0,
        });

        setRecentCustomers(customersData?.list || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    window.addEventListener('miva:dashboard', fetchDashboardData);
    return () => window.removeEventListener('miva:dashboard', fetchDashboardData);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Tổng quan Hệ thống CRM & Quản trị Doanh nghiệp
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Xin chào, {user?.fullName || 'Quản trị viên'}! Chào mừng đến hệ thống Quản lý Khách hàng (CRM) & Admin Server.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Tổng Khách hàng (CRM)"
          value={stats.totalCustomers}
          icon={Users}
          color="bg-blue-600"
          loading={loading}
        />
        <StatCard
          title="Chiến dịch Khảo sát"
          value={stats.totalSurveys}
          icon={ClipboardList}
          color="bg-indigo-600"
          loading={loading}
        />
        <StatCard
          title="Phản hồi Sản phẩm"
          value={stats.totalReviews}
          icon={MessageSquare}
          color="bg-amber-500"
          loading={loading}
        />
        <StatCard
          title="Danh mục Sản phẩm"
          value={stats.totalCategories}
          icon={Package}
          color="bg-emerald-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Khách hàng Mới Đăng ký Gần đây
          </h2>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500">Đang tải...</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Khách hàng
                    </th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Email
                    </th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Số điện thoại
                    </th>
                    <th className="pb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentCustomers.map((cus) => (
                    <tr
                      key={cus.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <td className="py-3 text-sm text-slate-800 dark:text-slate-300 font-medium">
                        {cus.fullName}
                      </td>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">
                        {cus.email}
                      </td>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">
                        {cus.phone || '—'}
                      </td>
                      <td className="py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            cus.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}
                        >
                          {cus.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            Kiến trúc Phân hệ Hệ thống
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <ShieldCheck className="w-5 h-5 text-indigo-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Giao diện Admin Server Tách biệt
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quản lý tài khoản, thêm/xóa và phân quyền truy cập độc lập với nghiệp vụ CRM.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Users className="w-5 h-5 text-blue-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Phân hệ Mô phỏng CRM ({stats.totalCustomers} Khách hàng)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quản lý hồ sơ khách hàng, tiếp nhận phản hồi sản phẩm, khảo sát độ hài lòng & báo cáo độ tuổi/sở thích.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  CSDL Độc lập (htttdn_crm)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kết nối PostgreSQL độc lập có hỗ trợ kịch bản sao lưu & phục hồi dữ liệu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
