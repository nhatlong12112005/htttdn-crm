import { UserStatus } from '@prisma/client';
import { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

describe('RealtimeGateway', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const user = { id, status: UserStatus.active, deletedAt: null, roleCode: 'SUPER_ADMIN' };

  function setup(role: 'client' | 'admin', cookie = '') {
    const auth = {
      verifyToken: jest.fn().mockResolvedValue({
        userID: id,
        role,
        ...(role === 'admin' ? { adminRole: 'SUPER_ADMIN' } : {}),
      }),
    };
    const prisma = {
      admin: {
        findUnique: jest.fn().mockResolvedValue(role === 'admin' ? user : null),
      },
      client: {
        findUnique: jest.fn().mockResolvedValue(role === 'client' ? user : null),
      },
    };
    Object.assign(prisma, { extended: prisma });
    const client = {
      id: 'socket-1',
      handshake: { headers: { cookie }, auth: { role } },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    const gateway = new RealtimeGateway(
      auth as unknown as AuthService,
      prisma as unknown as PrismaService,
      {} as RealtimeService,
    );
    return { gateway, auth, prisma, client };
  }

  it('authenticates the role-specific HttpOnly cookie and joins only client rooms', async () => {
    const { gateway, auth, prisma, client } = setup(
      'client',
      'accessToken_admin=wrong; accessToken_client=valid',
    );
    await gateway.handleConnection(client as unknown as Socket);
    expect(auth.verifyToken).toHaveBeenCalledWith('valid');
    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
    expect(client.join).toHaveBeenCalledWith(`user:${id}`);
    expect(client.join).toHaveBeenCalledWith('catalog');
    expect(client.emit).toHaveBeenCalledWith('realtime:ready', {
      userId: id,
      role: 'client',
    });
  });

  it('accepts an Admin Server token and joins only the system room', async () => {
    const { gateway, client } = setup('admin', 'accessToken_admin=valid');
    await gateway.handleConnection(client as unknown as Socket);
    expect(client.join).toHaveBeenCalledWith(`user:${id}`);
    expect(client.join).toHaveBeenCalledWith('system-admins');
    expect(client.join).not.toHaveBeenCalledWith('admins');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects a CRM token presented to the Admin Server socket', async () => {
    const { gateway, auth, prisma, client } = setup('admin', 'accessToken_admin=valid');
    prisma.admin.findUnique.mockResolvedValue({ ...user, roleCode: 'CRM_MANAGER' });
    auth.verifyToken.mockResolvedValue({ userID: id, role: 'admin', adminRole: 'CRM_MANAGER' });
    await gateway.handleConnection(client as unknown as Socket);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('joins the CRM operations room for a CRM manager', async () => {
    const { gateway, auth, prisma, client } = setup('admin', 'accessToken_crm=valid');
    client.handshake.auth.role = 'crm';
    prisma.admin.findUnique.mockResolvedValue({ ...user, roleCode: 'CRM_MANAGER' });
    auth.verifyToken.mockResolvedValue({ userID: id, role: 'admin', adminRole: 'CRM_MANAGER' });
    await gateway.handleConnection(client as unknown as Socket);
    expect(client.join).toHaveBeenCalledWith('admins');
    expect(client.join).not.toHaveBeenCalledWith('system-admins');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('allows guests to receive only public catalog updates', async () => {
    const { gateway, auth, client } = setup('client');
    client.handshake.auth = {
      role: 'guest',
    } as unknown as typeof client.handshake.auth;
    await gateway.handleConnection(client as unknown as Socket);
    expect(auth.verifyToken).not.toHaveBeenCalled();
    expect(client.join).toHaveBeenCalledTimes(1);
    expect(client.join).toHaveBeenCalledWith('catalog');
    expect(client.emit).toHaveBeenCalledWith('realtime:ready', {
      role: 'guest',
    });
  });

  it('rejects a token whose role differs from the requested role', async () => {
    const { gateway, auth, client } = setup(
      'client',
      'accessToken_client=valid',
    );
    auth.verifyToken.mockResolvedValue({ userID: id, role: 'admin' });
    await gateway.handleConnection(client as unknown as Socket);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });
});
