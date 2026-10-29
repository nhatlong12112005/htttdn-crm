import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { getAppRoleHeader } from '../utils/portalMode';

export default function RealtimeBridge() {
  const { user, logout } = useAuth();
  const lockHandledRef = useRef(false);

  useEffect(() => {
    lockHandledRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const role = getAppRoleHeader();
    const socket = io('/realtime', { auth: { role }, withCredentials: true });
    const dispatch = (name) => () => window.dispatchEvent(new Event(`miva:${name}`));
    const orders = dispatch('orders');
    const shipping = dispatch('shipping');
    const categories = dispatch('categories');
    const notifications = dispatch('notification');
    const dashboard = dispatch('dashboard');

    const handleAccountLocked = async (payload) => {
      if (lockHandledRef.current) return;
      lockHandledRef.current = true;
      const message =
        payload?.message ||
        payload?.detail?.message ||
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
      await logout();
      alert(message);
      window.location.href = '/login';
    };

    const onWindowLocked = (event) => handleAccountLocked(event?.detail);
    window.addEventListener('miva:account-locked', onWindowLocked);

    socket.on('realtime:ready', () => { orders(); shipping(); categories(); notifications(); dashboard(); });
    socket.on('account:locked', handleAccountLocked);
    socket.on('order:created', () => { orders(); shipping(); notifications(); dashboard(); });
    socket.on('order:updated', () => { orders(); shipping(); notifications(); dashboard(); });
    socket.on('payment:updated', () => { orders(); dashboard(); });
    socket.on('shipment:updated', () => { shipping(); orders(); dashboard(); });
    socket.on('product:updated', () => { dashboard(); });
    socket.on('category:updated', () => { categories(); dashboard(); });
    socket.on('notification:created', notifications);
    socket.on('notification:updated', notifications);
    return () => {
      window.removeEventListener('miva:account-locked', onWindowLocked);
      socket.disconnect();
    };
  }, [user?.id, logout]);
  return null;
}
