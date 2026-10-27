export function isAdminServerPort() {
  if (typeof window === 'undefined') return false;
  const configuredMode = import.meta.env.VITE_PORTAL_MODE;
  if (configuredMode === 'admin') return true;
  if (configuredMode === 'crm') return false;
  return window.location.port === '5175';
}

export function getAppRoleHeader() {
  if (typeof window === 'undefined') return 'admin';
  return isAdminServerPort() ? 'admin' : 'crm';
}
