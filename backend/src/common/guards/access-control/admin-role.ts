export const ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'CRM_MANAGER'] as const;
export type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number];

export function resolveAdminRole(account: {
  roleCode?: string | null;
  department?: string | null;
}): AdminRoleCode | null {
  if (
    account.department &&
    account.department !== 'SUPER_ADMIN' &&
    account.department !== 'CRM_MANAGER'
  ) {
    return null;
  }
  // Old CRM rows inherited the SUPER_ADMIN database default. Keep them
  // restricted until the role migration has been applied.
  if (
    account.department === 'CRM_MANAGER' &&
    account.roleCode === 'SUPER_ADMIN'
  ) {
    return 'CRM_MANAGER';
  }
  if (
    account.roleCode === 'SUPER_ADMIN' ||
    account.roleCode === 'CRM_MANAGER'
  ) {
    return account.roleCode;
  }
  if (
    account.department === 'SUPER_ADMIN' ||
    account.department === 'CRM_MANAGER'
  ) {
    return account.department;
  }
  return null;
}
