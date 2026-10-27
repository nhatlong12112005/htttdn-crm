import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra xem user đã đăng nhập chưa (qua cookie)
  const checkAuth = useCallback(async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    await authApi.signIn({ email, password });
    // Sau khi sign-in, cookie đã được set tự động.
    // Fetch profile để lấy thông tin user
    const profile = await checkAuth();
    return profile;
  };

  const logout = async () => {
    try {
      await authApi.signOut();
    } catch {
      // ignore error
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
