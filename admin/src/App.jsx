import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import RealtimeBridge from './realtime/RealtimeBridge';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminServerLayout from './components/layout/AdminServerLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import AccountManagement from './pages/accounts/AccountManagement';
import UserManagement from './pages/users/UserManagement';
import CategoryManagement from './pages/categories/CategoryManagement';
import ProductManagement from './pages/products/ProductManagement';
import OrderManagement from './pages/orders/OrderManagement';
import VoucherManagement from './pages/vouchers/VoucherManagement';
import ReviewManagement from './pages/reviews/ReviewManagement';
import Analytics from './pages/analytics/Analytics';
import Reconciliation from './pages/analytics/Reconciliation';
import CustomerAnalytics from './pages/analytics/CustomerAnalytics';
import SurveyManagement from './pages/surveys/SurveyManagement';
import Login from './pages/auth/Login';
import { isAdminServerPort } from './utils/portalMode';

function App() {
  const adminPortal = isAdminServerPort();
  const defaultLoginPath = adminPortal ? '/login/admin' : '/login/crm';

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <RealtimeBridge />
          <Routes>
            <Route path="/" element={<Navigate to={defaultLoginPath} replace />} />
            <Route path="/login" element={<Navigate to={defaultLoginPath} replace />} />
            <Route path="/login/crm" element={adminPortal ? <Navigate to="/login/admin" replace /> : <Login mode="crm" />} />
            <Route path="/login/admin" element={adminPortal ? <Login mode="admin" /> : <Navigate to="/login/crm" replace />} />
            <Route path="/system/login" element={<Navigate to={defaultLoginPath} replace />} />

            {/* GIAO DIỆN 1: ADMIN SERVER CONSOLE (Port 5175 - Quản lý Tài khoản & Dashboard Doanh thu - Mục II.2) */}
            <Route element={<ProtectedRoute portal="admin" />}>
              <Route element={<AdminServerLayout />}>
                <Route path="/system" element={<Navigate to="/system/accounts" replace />} />
                <Route path="/system/accounts" element={<AccountManagement />} />
                <Route path="/system/revenue" element={<Analytics />} />
                <Route path="/system/reconciliation" element={<Reconciliation />} />
                <Route path="/system/dashboard" element={<Navigate to="/system/revenue" replace />} />
              </Route>
            </Route>

            {/* GIAO DIỆN 2: NGƯỜI QUẢN LÝ CRM (Port 5174 - Tách biệt hoàn toàn với Admin Server - Mục III.4.1) */}
            <Route element={<ProtectedRoute portal="crm" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/products" element={<ProductManagement />} />
                <Route path="/orders" element={<OrderManagement />} />
                <Route path="/vouchers" element={<VoucherManagement />} />
                <Route path="/reviews" element={<ReviewManagement />} />
                <Route path="/surveys" element={<SurveyManagement />} />
                <Route path="/customer-analytics" element={<CustomerAnalytics />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
