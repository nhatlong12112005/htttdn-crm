import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessControlGuard } from '../../common/guards/access-control/access-control.guard';

describe('Authentication and role verification', () => {
  const adminAccount = {
    id: 'admin-id',
    email: 'admin@example.com',
    password: 'hashed',
    fullName: 'Admin Server',
    department: 'SUPER_ADMIN',
    roleCode: 'SUPER_ADMIN',
    status: 'active',
    deletedAt: null,
  };
  const clientAccount = {
    id: 'client-id',
    email: 'client@example.com',
    password: 'hashed',
    fullName: 'Client',
    status: 'active',
    deletedAt: null,
  };
  const credentials = { email: adminAccount.email, password: 'password' };
  let service: AuthService;
  let db: any;
  let clients: any;
  let jwt: any;
  let strings: any;

  beforeEach(() => {
    db = Object.fromEntries(
      ['admin', 'client'].map((role) => [
        role,
        {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
      ]),
    );
    db.extended = db;
    clients = {
      createClient: jest.fn(async (data) => ({ id: 'new-client', ...data })),
      getClient: jest.fn().mockResolvedValue(clientAccount),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('token'),
      verifyAsync: jest.fn(),
    };
    strings = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('hashed'),
    };
    service = new AuthService({} as any, clients, strings, jwt, db);
  });

  it('registers new clients without issuing tokens', async () => {
    const result = await service.signUp({
      email: clientAccount.email,
      password: 'password',
      fullName: 'New Client',
    });
    expect(clients.createClient).toHaveBeenCalled();
    expect(result).not.toHaveProperty('password');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('allows an active admin to log in', async () => {
    db.admin.findFirst.mockResolvedValue(adminAccount);
    await expect(service.signIn(credentials, 'admin')).resolves.toHaveProperty(
      'data.accessToken',
      'token',
    );
  });

  it('rejects a SUPER_ADMIN account at the CRM login', async () => {
    db.admin.findFirst.mockResolvedValue(adminAccount);
    await expect(service.signIn(credentials, 'crm')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('keeps SUPER_ADMIN away from CRM-only endpoints', async () => {
    db.admin.findUnique.mockResolvedValue(adminAccount);
    const guard = new AccessControlGuard(db, {
      getAllAndOverride: (key: string) => (key === 'roles' ? ['admin'] : undefined),
    } as any);
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          user: { userID: adminAccount.id, role: 'admin', adminRole: 'SUPER_ADMIN' },
        }),
      }),
    };
    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('invalidates an admin session after its database role changes', async () => {
    db.admin.findUnique.mockResolvedValue({
      ...adminAccount,
      department: 'CRM_MANAGER',
      roleCode: 'CRM_MANAGER',
    });
    const guard = new AccessControlGuard(db, {
      getAllAndOverride: (key: string) => {
        if (key === 'roles') return ['admin'];
        if (key === 'adminRoles') return ['SUPER_ADMIN', 'CRM_MANAGER'];
        return undefined;
      },
    } as any);
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          user: { userID: adminAccount.id, role: 'admin', adminRole: 'SUPER_ADMIN' },
        }),
      }),
    };
    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not issue tokens when password does not match', async () => {
    db.admin.findFirst.mockResolvedValue(adminAccount);
    strings.compare.mockResolvedValue(false);
    await expect(service.signIn(credentials, 'admin')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('does not sign in an inactive (locked) account', async () => {
    db.client.findFirst.mockResolvedValue({
      ...clientAccount,
      status: 'inactive',
    });
    await expect(service.signIn(credentials, 'client')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('blocks a locked account from refreshing tokens', async () => {
    jwt.verifyAsync.mockResolvedValue({
      userID: clientAccount.id,
      role: 'client',
      tokenType: 'refresh',
    });
    clients.getClient.mockResolvedValue({
      ...clientAccount,
      status: 'inactive',
    });
    await expect(service.refreshToken('old-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('blocks a client from accessing admin-only routes via AccessControlGuard', async () => {
    db.client.findUnique.mockResolvedValue(clientAccount);
    const guard = new AccessControlGuard(db, {
      getAllAndOverride: (key: string) => (key === 'roles' ? ['admin'] : false),
    } as any);
    const context = {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          user: { userID: clientAccount.id, role: 'client' },
        }),
      }),
    };
    await expect(guard.canActivate(context as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
