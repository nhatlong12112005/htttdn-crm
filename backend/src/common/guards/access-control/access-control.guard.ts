import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_SKIP_AUTH } from '../../../app/auth/auth.decorator';
import { TokenPayload } from '../../../app/auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

import { Actions, ROLE_ACTION } from './access-control.const';
import { ADMIN_ROLES_KEY, ROLES_KEY, UserRole } from './roles.decorator';
import { AdminRoleCode, resolveAdminRole } from './admin-role';
import { RequestMethod } from '../../utils/api-util/api-util.const';

type AuthenticatedUser = TokenPayload;

@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  private async resolveUser(userID: string): Promise<{ user: any; role: UserRole }> {
    let user: any = await this.prismaService.extended.admin.findUnique({
      where: { id: userID },
      select: { status: true, deletedAt: true, roleCode: true, department: true },
    });
    let role: UserRole = 'admin';
    if (!user) {
      user = await this.prismaService.extended.client.findUnique({
        where: { id: userID },
        select: { status: true, deletedAt: true },
      });
      role = 'client';
    }
    return { user, role };
  }

  private async canAccessResources(
    userID: string,
    action: Actions,
  ): Promise<boolean> {
    const { user, role } = await this.resolveUser(userID);

    if (!user || user.status !== 'active' || user.deletedAt) {
      return false;
    }

    const allowedActions = ROLE_ACTION[role] ?? [];

    return (
      allowedActions.includes(Actions.MANAGE) || allowedActions.includes(action)
    );
  }

  private getAction(httpMethod: RequestMethod): Actions {
    const actionsConverter: Partial<Record<RequestMethod, Actions>> = {
      [RequestMethod.GET]: Actions.READ,
      [RequestMethod.POST]: Actions.CREATE,
      [RequestMethod.PUT]: Actions.UPDATE,
      [RequestMethod.PATCH]: Actions.UPDATE,
      [RequestMethod.DELETE]: Actions.DELETE,
    };

    const action = actionsConverter[httpMethod];

    if (!action) {
      throw new BadRequestException(
        `Action for HTTP method "${httpMethod}" is not defined`,
      );
    }

    return action;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSkipAuth = this.reflector.getAllAndOverride<boolean>(IS_SKIP_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isSkipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthenticatedUser;
      }
    >();

    const authenticatedUser = request.user;

    if (!authenticatedUser?.userID) {
      throw new UnauthorizedException('Bạn chưa đăng nhập');
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const allowedAdminRoles = this.reflector.getAllAndOverride<AdminRoleCode[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? ['CRM_MANAGER'];

    if (requiredRoles?.length) {
      const { user: currentUser, role } = await this.resolveUser(authenticatedUser.userID);
      if (
        !currentUser ||
        currentUser.status !== 'active' ||
        currentUser.deletedAt
      ) {
        throw new UnauthorizedException('Tài khoản không còn hoạt động');
      }
      authenticatedUser.role = role;
      if (
        !authenticatedUser.role ||
        !requiredRoles.includes(authenticatedUser.role)
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện chức năng này',
        );
      }

      if (role === 'admin') {
        const adminRole = resolveAdminRole(currentUser);
        if (authenticatedUser.adminRole !== adminRole) {
          throw new UnauthorizedException('Quyền tài khoản đã thay đổi, vui lòng đăng nhập lại');
        }
        if (!adminRole || !allowedAdminRoles.includes(adminRole)) {
          throw new ForbiddenException('Bạn không có quyền truy cập phân hệ này');
        }
        (authenticatedUser as AuthenticatedUser & { adminRole: AdminRoleCode }).adminRole = adminRole;
      }

      return true;
    }

    if (authenticatedUser.role === 'admin') {
      const { user, role } = await this.resolveUser(authenticatedUser.userID);
      const adminRole = role === 'admin' && user ? resolveAdminRole(user) : null;
      if (authenticatedUser.adminRole !== adminRole) {
        throw new UnauthorizedException('Quyền tài khoản đã thay đổi, vui lòng đăng nhập lại');
      }
      if (!adminRole || !allowedAdminRoles.includes(adminRole)) {
        throw new ForbiddenException('Bạn không có quyền truy cập phân hệ này');
      }
      (authenticatedUser as AuthenticatedUser & { adminRole: AdminRoleCode }).adminRole = adminRole;
    }

    const action = this.getAction(request.method as RequestMethod);

    const canAccess = await this.canAccessResources(
      authenticatedUser.userID,
      action,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này',
      );
    }

    return true;
  }
}
