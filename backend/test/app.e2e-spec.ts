// @ts-nocheck
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashSync } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { initApp } from '../src/init';

describe('Authentication and users (Admin Server, CRM Manager & Client HTTP integration)', () => {
  let app: INestApplication;
  let records: any[];
  const password = 'Test-password-123!';
  const passwordHash = hashSync(password, 4);
  const ids = {
    client: '11111111-1111-4111-8111-111111111111',
    crm: '22222222-2222-4222-8222-222222222222',
    admin: '33333333-3333-4333-8333-333333333333',
  };
  const roles = ['client', 'admin'] as const;

  const project = (row: any, args: any = {}) => {
    if (!row) return null;
    if (args.select) {
      return Object.fromEntries(
        Object.keys(args.select)
          .filter((key) => args.select[key])
          .map((key) => [key, row[key]]),
      );
    }
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => !args.omit?.[key] && key !== 'role'),
    );
  };

  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'email' && typeof value === 'object')
        return row.email.toLowerCase() === value.equals.toLowerCase();
      if (key === 'id' && value && typeof value === 'object' && 'not' in value)
        return row.id !== value.not;
      return row[key] === value;
    });

  const accountDelegate = (role: string) => ({
    findFirst: jest.fn((args) =>
      project(records.find((row) => row.role === role && matches(row, args.where)), args),
    ),
    findUnique: jest.fn((args) =>
      project(records.find((row) => row.role === role && matches(row, args.where)), args),
    ),
    findMany: jest.fn((args) =>
      records
        .filter((row) => row.role === role && matches(row, args?.where))
        .map((row) => project(row, args)),
    ),
    count: jest.fn(
      (args) => records.filter((row) => row.role === role && matches(row, args?.where)).length,
    ),
    create: jest.fn((args) => {
      const row = {
        id: randomUUID(),
        role,
        status: 'active',
        deletedAt: null,
        phone: null,
        avatarUrl: null,
        addresses: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      records.push(row);
      return project(row, args);
    }),
    update: jest.fn((args) => {
      const row = records.find((item) => item.role === role && matches(item, args.where));
      if (!row) throw new Error('Record not found');
      Object.assign(row, args.data);
      return project(row, args);
    }),
  });

  const delegates = Object.fromEntries(roles.map((role) => [role, accountDelegate(role)]));

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ ...delegates, extended: delegates })
      .compile();
    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    initApp(app);
    await app.init();
  });

  beforeEach(() => {
    records = [
      {
        id: ids.client,
        role: 'client',
        email: 'client@example.com',
        fullName: 'Client User',
        password: passwordHash,
        phone: '0909123456',
        avatarUrl: null,
        addresses: [],
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ids.crm,
        role: 'admin',
        email: 'crm@example.com',
        fullName: 'CRM Manager',
        department: 'CRM_MANAGER',
        roleCode: 'CRM_MANAGER',
        permissions: ['CUSTOMERS', 'REVIEWS', 'SURVEYS', 'ANALYTICS'],
        password: passwordHash,
        phone: '0901000002',
        avatarUrl: null,
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ids.admin,
        role: 'admin',
        email: 'admin@example.com',
        fullName: 'Admin Server',
        department: 'SUPER_ADMIN',
        roleCode: 'SUPER_ADMIN',
        permissions: ['ACCOUNTS', 'CUSTOMERS', 'PRODUCTS', 'ORDERS', 'REVIEWS', 'SURVEYS', 'ANALYTICS'],
        password: passwordHash,
        phone: '0901000001',
        avatarUrl: null,
        status: 'active',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    jest.clearAllMocks();
  });

  afterAll(async () => app?.close());

  const login = async (email: string, roleHeader: 'client' | 'admin') => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .set('x-app-role', roleHeader)
      .send({ email, password })
      .expect(201);
    return response.body.data as { accessToken: string; refreshToken: string };
  };

  it('rejects anonymous profile and administration requests', async () => {
    const response = await request(app.getHttpServer()).get('/api/users/profile').expect(401);
    expect(response.body.message).toBe(response.body.errors[0].message);
    expect(response.body.message).not.toBe('ERROR');
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('logs a client in and returns a profile without a password hash', async () => {
    const tokens = await login('client@example.com', 'client');
    const response = await request(app.getHttpServer())
      .get('/api/users/profile')
      .auth(tokens.accessToken, { type: 'bearer' })
      .expect(200);
    expect(response.body).toMatchObject({ email: 'client@example.com', role: 'customer' });
    expect(response.body).not.toHaveProperty('password');
  });

  it('lets client update their profile but rejects privileged fields', async () => {
    const tokens = await login('client@example.com', 'client');
    const response = await request(app.getHttpServer())
      .patch('/api/users/profile')
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({ fullName: 'Updated Client' })
      .expect(200);
    expect(response.body.fullName).toBe('Updated Client');
    expect(response.body).not.toHaveProperty('password');
    for (const body of [
      { role: 'admin' },
      { status: 'inactive' },
      { password: 'plaintext' },
      { deletedAt: new Date().toISOString() },
    ]) {
      await request(app.getHttpServer())
        .patch('/api/users/profile')
        .auth(tokens.accessToken, { type: 'bearer' })
        .send(body)
        .expect(400);
    }
  });

  it('blocks a client from editing another account', async () => {
    const tokens = await login('client@example.com', 'client');
    await request(app.getHttpServer())
      .patch(`/api/users/${ids.admin}`)
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({ fullName: 'Hijacked' })
      .expect(403);
  });

  it('allows admin to create, list, lock/unlock, and soft-delete accounts (Mục II.2 & 4.1)', async () => {
    const tokens = await login('admin@example.com', 'admin');

    // Create new customer account
    const createdCustomer = await request(app.getHttpServer())
      .post('/api/users')
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({
        fullName: 'Khách Hàng Mới',
        email: 'newcustomer@example.com',
        password: 'Password123!',
        role: 'customer',
        phone: '0912345678',
      })
      .expect(201);
    expect(createdCustomer.body).toMatchObject({
      email: 'newcustomer@example.com',
      role: 'customer',
    });

    const list = await request(app.getHttpServer())
      .get('/api/users?role=client')
      .auth(tokens.accessToken, { type: 'bearer' })
      .expect(200);
    expect(list.body.list.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(list.body)).not.toContain(passwordHash);

    // Lock customer account
    const update = await request(app.getHttpServer())
      .patch(`/api/users/${ids.client}/status`)
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({ status: 'inactive' })
      .expect(200);
    expect(update.body.status).toBe('inactive');

    // Unlock customer account
    const unlocked = await request(app.getHttpServer())
      .patch(`/api/users/${ids.client}/status`)
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({ status: 'active' })
      .expect(200);
    expect(unlocked.body.status).toBe('active');

    // Soft-delete customer account
    const lockedViaDelete = await request(app.getHttpServer())
      .delete(`/api/users/${ids.client}`)
      .auth(tokens.accessToken, { type: 'bearer' })
      .expect(200);
    expect(lockedViaDelete.body.status).toBe('inactive');
    expect(lockedViaDelete.body.deletedAt).toEqual(expect.any(String));

    // Prevent admin self-lock
    await request(app.getHttpServer())
      .patch(`/api/users/${ids.admin}/status`)
      .auth(tokens.accessToken, { type: 'bearer' })
      .send({ status: 'inactive' })
      .expect(400);
  });

  it('rejects access and refresh tokens used for the wrong purpose', async () => {
    const tokens = await login('client@example.com', 'client');
    await request(app.getHttpServer())
      .get('/api/users/profile')
      .auth(tokens.refreshToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('x-app-role', 'client')
      .set('Cookie', `refreshToken_client=${tokens.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .set('x-app-role', 'client')
      .set('Cookie', `refreshToken_client=${tokens.refreshToken}`)
      .expect(201);
  });

  it('revokes a disabled account immediately', async () => {
    const tokens = await login('admin@example.com', 'admin');
    records.find((row) => row.id === ids.admin).status = 'inactive';
    await request(app.getHttpServer())
      .post('/api/auth/sign-in')
      .set('x-app-role', 'admin')
      .send({ email: 'admin@example.com', password })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/users/profile')
      .auth(tokens.accessToken, { type: 'bearer' })
      .expect(401);
  });
});
