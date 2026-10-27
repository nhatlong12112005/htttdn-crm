import { SetMetadata } from '@nestjs/common';
import { AdminRoleCode } from './admin-role';
export type UserRole = 'admin' | 'client' | 'vendor' | 'employee';


export const ROLES_KEY = 'roles';
export const ADMIN_ROLES_KEY = 'adminRoles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const AdminRoles = (...roles: AdminRoleCode[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
