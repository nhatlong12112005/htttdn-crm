import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { logout } from '../features/auth/authSlice';
import { authService } from '../services/authService';

export default function RealtimeBridge() {
  const userId = useSelector((state) => state.auth.user?.id);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const lockHandledRef = useRef(false);

  useEffect(() => {
    lockHandledRef.current = false;
  }, [userId]);

  useEffect(() => {
    const handleAccountLocked = async (payload) => {
      if (lockHandledRef.current) return;
      lockHandledRef.current = true;
      const message =
        payload?.message ||
        payload?.detail?.message ||
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
      try {
        await authService.logout();
      } catch {
        // Ignore sign-out network error
      }
      dispatch(logout());
      queryClient.clear();
      alert(message);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const onWindowLocked = (event) => handleAccountLocked(event?.detail);
    window.addEventListener('miva:account-locked', onWindowLocked);

    const socket = io('/realtime', { auth: { role: userId ? 'client' : 'guest' }, withCredentials: true });
    const refreshOrders = (event) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (event?.orderId) queryClient.invalidateQueries({ queryKey: ['order', event.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    };
    const refreshProducts = () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['checkout-preview'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['voucher-offers'] });
    };
    const refreshVouchers = () => {
      queryClient.invalidateQueries({ queryKey: ['voucher-offers'] });
      queryClient.invalidateQueries({ queryKey: ['checkout-preview'] });
    };
    const refreshCategories = () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      refreshProducts();
    };
    socket.on('realtime:ready', ({ role }) => {
      refreshCategories();
      refreshVouchers();
      if (role === 'client') {
        refreshOrders();
        window.dispatchEvent(new Event('miva:notification'));
      }
    });
    socket.on('account:locked', handleAccountLocked);
    socket.on('order:created', refreshOrders);
    socket.on('order:updated', refreshOrders);
    socket.on('payment:updated', refreshOrders);
    socket.on('shipment:updated', refreshOrders);
    socket.on('product:updated', refreshProducts);
    socket.on('category:updated', refreshCategories);
    socket.on('voucher:updated', refreshVouchers);
    socket.on('notification:created', () => window.dispatchEvent(new Event('miva:notification')));
    socket.on('notification:updated', () => window.dispatchEvent(new Event('miva:notification')));
    return () => {
      window.removeEventListener('miva:account-locked', onWindowLocked);
      socket.disconnect();
    };
  }, [userId, dispatch, queryClient]);
  return null;
}
