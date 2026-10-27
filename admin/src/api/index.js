import axiosClient from './axiosClient';

// ==================== AUTH ====================

export const authApi = {
  signIn: (data) => axiosClient.post('/auth/sign-in', data),
  signOut: () => axiosClient.post('/auth/sign-out'),
  refreshToken: () => axiosClient.post('/auth/refresh-token'),
  getProfile: () => axiosClient.get('/admins/profile'),
};

// ==================== USERS & ACCOUNTS ====================

export const usersApi = {
  getUsers: (params = {}) => axiosClient.get('/users', { params }),
  getUser: (id) => axiosClient.get(`/users/${id}`),
  createUser: (data) => axiosClient.post('/users', data),
  updateUser: (id, data) => axiosClient.patch(`/users/${id}`, data),
  updateUserStatus: (id, status) => axiosClient.patch(`/users/${id}/status`, { status }),
  deleteUser: (id) => axiosClient.delete(`/users/${id}`),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await axiosClient.post('/users/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data?.data?.url || res?.data?.url || res?.url;
  },
};

// ==================== CATEGORIES ====================

export const categoriesApi = {
  getCategories: (params = {}) => axiosClient.get('/categories', { params }),
  createCategory: (data) => axiosClient.post('/categories', data),
  updateCategory: (id, data) => axiosClient.patch(`/categories/${id}`, data),
  deleteCategory: (id) => axiosClient.delete(`/categories/${id}`),
};

// ==================== ORDERS ====================

export const ordersApi = {
  getOrders: (params = {}) => axiosClient.get('/orders/admin/all', { params }),
  updateOrderStatus: (id, status, note) => axiosClient.patch(`/orders/${id}/status`, { status, note }),
  assignOrder: (id, data) => axiosClient.patch(`/orders/${id}/assign`, data),
  autoAssignOrder: (id, params = {}) => axiosClient.post(`/orders/${id}/auto-assign`, null, { params }),
  autoAssignAll: () => axiosClient.post('/orders/admin/auto-assign-all'),
};

// ==================== VOUCHERS ====================

export const vouchersApi = {
  getVouchers: (params = {}) => axiosClient.get('/vouchers/admin/all', { params }),
  createVoucher: (data) => axiosClient.post('/vouchers', data),
  updateVoucher: (id, data) => axiosClient.patch(`/vouchers/${id}`, data),
  deleteVoucher: (id) => axiosClient.delete(`/vouchers/${id}`),
};

// ==================== REVIEWS & CUSTOMER FEEDBACK ====================

export const reviewsApi = {
  getReviews: (params = {}) => axiosClient.get('/reviews/admin/all', { params }),
  replyReview: (id, adminReply) => axiosClient.patch(`/reviews/admin/${id}/reply`, { adminReply }),
  deleteReview: (id) => axiosClient.delete(`/reviews/admin/${id}`),
};

// ==================== REPORTS & ANALYTICS ====================

export const reportsApi = {
  getAnalytics: (params = {}) => axiosClient.get('/admin/reports/analytics', { params }),
  getCustomerReport: (params = {}) => axiosClient.get('/admin/reports/customers', { params }),
  getCustomerAnalytics: (params = {}) => axiosClient.get('/admin/reports/customer-analytics', { params }),
  getFinanceConfig: () => axiosClient.get('/admin/reports/finance-config'),
  updateFinanceConfig: (data) => axiosClient.post('/admin/reports/finance-config', data),
};

// ==================== EMPLOYEES (compatibility fallback) ====================

export const employeesApi = {
  getEmployees: (params = {}) => axiosClient.get('/users', { params: { ...params, role: 'admin' } }),
};

// ==================== SURVEYS (CRM) ====================

export const surveysApi = {
  getSurveys: (params = {}) => axiosClient.get('/surveys/admin/all', { params }),
  getMine: (params = {}) => axiosClient.get('/surveys/mine', { params }),
  getTemplates: (target = 'client') => axiosClient.get('/surveys/templates', { params: { target } }),
  createSurvey: (data) => axiosClient.post('/surveys', data),
  getSurveyDetail: (id) => axiosClient.get(`/surveys/${id}/manage`),
  updateSurvey: (id, data) => axiosClient.patch(`/surveys/${id}`, data),
  changeStatus: (id, status, recipientIds) =>
    axiosClient.patch(`/surveys/${id}/status`, {
      status,
      ...(recipientIds?.length ? { recipientIds } : {}),
    }),
  getResults: (id, params = {}) => axiosClient.get(`/surveys/${id}/results`, { params }),
  deleteSurvey: (id) => axiosClient.delete(`/surveys/${id}`),
};

// ==================== NOTIFICATIONS ====================

export const notificationsApi = {
  getNotifications: (params = {}) => axiosClient.get('/notifications', { params }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count'),
  markAsRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axiosClient.patch('/notifications/read-all'),
};
