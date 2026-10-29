// @ts-nocheck
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hashSync } from 'bcrypt';
import { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app/app.module';
import { CartService } from '../src/app/cart/cart.service';
import { OrdersService } from '../src/app/orders/orders.service';
import { ReportsService } from '../src/app/reports/reports.service';
import { ReviewsService } from '../src/app/reviews/reviews.service';
import { SurveysService } from '../src/app/surveys/surveys.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { initApp } from '../src/init';

describe('CRM Module (Mục 4.1 & 4.3: Surveys, Product Feedback, Cart/Orders & Customer Analytics E2E)', () => {
  let app: INestApplication;

  const ids = {
    system: 'aaaaaaaa-1111-4111-8111-111111111111',
    crm: '11111111-1111-4111-8111-111111111111',
    client: '22222222-2222-4222-8222-222222222222',
    product: '33333333-3333-4333-8333-333333333333',
    review: '44444444-4444-4444-8444-444444444444',
    survey: '55555555-5555-4555-8555-555555555555',
    response: '66666666-6666-4666-8666-666666666666',
    question: '77777777-7777-4777-8777-777777777777',
    variant: '88888888-8888-4888-8888-888888888888',
    cartItem: '99999999-9999-4999-8999-999999999999',
    order: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  };

  const password = 'Test-password-123!';
  const passwordHash = hashSync(password, 4);

  const users = [
    {
      id: ids.system,
      role: 'admin',
      email: 'system@example.com',
      fullName: 'Admin Server',
      department: 'SUPER_ADMIN',
      roleCode: 'SUPER_ADMIN',
      password: passwordHash,
      status: 'active',
      deletedAt: null,
    },
    {
      id: ids.crm,
      role: 'admin',
      email: 'crm@example.com',
      fullName: 'Người Quản lý CRM',
      department: 'CRM_MANAGER',
      roleCode: 'CRM_MANAGER',
      password: passwordHash,
      status: 'active',
      deletedAt: null,
    },
    {
      id: ids.client,
      role: 'client',
      email: 'client@example.com',
      fullName: 'Nguyễn Văn Khách Hàng',
      password: passwordHash,
      status: 'active',
      deletedAt: null,
    },
  ];

  const accountDelegate = (role: 'client' | 'admin') => ({
    findFirst: jest.fn(({ where }) =>
      users.find(
        (item) =>
          item.role === role &&
          item.email.toLowerCase() === where.email.equals.toLowerCase(),
      ) ?? null,
    ),
    findUnique: jest.fn(({ where }) =>
      users.find((item) => item.role === role && item.id === where.id) ?? null,
    ),
    create: jest.fn(({ data }) => {
      const account = {
        id: role === 'admin'
          ? 'bbbbbbbb-1111-4111-8111-111111111111'
          : 'cccccccc-1111-4111-8111-111111111111',
        ...data,
        role,
        deletedAt: null,
        createdAt: new Date(),
      };
      users.push(account);
      return account;
    }),
  });

  const reviewsService = {
    create: jest.fn().mockImplementation((clientId, dto) => ({
      id: ids.review,
      clientId,
      productId: dto.productId,
      rating: dto.rating,
      content: dto.content,
      adminReply: null,
      repliedAt: null,
    })),
    listAll: jest.fn().mockResolvedValue({
      list: [
        {
          id: ids.review,
          rating: 5,
          content: 'Áo Polo vải mát, chuẩn size M!',
          adminReply: null,
        },
      ],
      totalItems: 1,
      totalPages: 1,
    }),
    replyReview: jest.fn().mockImplementation((id, adminReply) => ({
      id,
      rating: 5,
      content: 'Áo Polo vải mát, chuẩn size M!',
      adminReply,
      repliedAt: new Date().toISOString(),
    })),
  };

  const surveysService = {
    create: jest.fn().mockImplementation((dto) => ({
      id: ids.survey,
      title: dto.title,
      status: 'draft',
      audienceType: dto.audienceType,
      questions: dto.questions,
    })),
    changeStatus: jest.fn().mockImplementation((id, status, _user, recipientIds) => ({
      id,
      status,
      deliveredCount: recipientIds?.length ?? 1,
    })),
    listInbox: jest.fn().mockResolvedValue({
      list: [
        {
          id: ids.response,
          surveyId: ids.survey,
          status: 'pending',
          survey: {
            id: ids.survey,
            title: 'Khảo sát thăm dò Bộ sưu tập Thu - Đông mới',
          },
        },
      ],
      totalItems: 1,
    }),
    submitResponse: jest.fn().mockImplementation((responseId, _user, dto) => ({
      id: responseId,
      status: 'submitted',
      answersCount: dto.answers.length,
    })),
    getResults: jest.fn().mockResolvedValue({
      survey: {
        id: ids.survey,
        title: 'Khảo sát thăm dò Bộ sưu tập Thu - Đông mới',
        status: 'active',
      },
      summary: {
        totalInvited: 1,
        openedCount: 1,
        submittedCount: 1,
        completionRate: 100,
      },
      questions: [
        {
          id: ids.question,
          question: 'Mức độ yêu thích thiết kế MIVA?',
          type: 'rating',
          averageRating: 5,
          totalAnswers: 1,
        },
      ],
    }),
  };

  const reportsService = {
    analyticsOverview: jest.fn().mockResolvedValue({ summary: { totalOrdersCount: 3 } }),
    customerDemographicsAndPreferences: jest.fn().mockResolvedValue({
      summary: {
        totalCustomers: 25,
        customersWithDob: 20,
        averageAge: 26,
        totalFavorites: 48,
      },
      ageDistribution: [
        { group: '18-24', label: '18 - 24 tuổi (Gen Z)', count: 10, percentage: 50 },
        { group: '25-34', label: '25 - 34 tuổi (Trẻ)', count: 10, percentage: 50 },
      ],
      favoriteCategories: [
        { id: 'cat-1', name: 'Áo Polo Nam', favoriteCount: 18, purchaseCount: 30, interestScore: 78 },
      ],
    }),
  };

  const cartService = {
    get: jest.fn().mockResolvedValue({
      id: 'cart-1',
      clientId: ids.client,
      items: [
        {
          id: ids.cartItem,
          quantity: 2,
          productVariantId: ids.variant,
          productVariant: {
            id: ids.variant,
            price: '250000.00',
            stock: 15,
            size: 'L',
            productColor: {
              color: 'Đen',
              product: { id: ids.product, name: 'Áo Polo Nam MIVA' },
            },
          },
        },
      ],
      totalQuantity: 2,
      subtotalAmount: '500000.00',
    }),
    add: jest.fn().mockImplementation((clientId, dto) => ({
      id: 'cart-1',
      clientId,
      items: [
        {
          id: ids.cartItem,
          quantity: dto.quantity,
          productVariantId: dto.productVariantId,
          productVariant: {
            id: dto.productVariantId,
            price: '250000.00',
            stock: 15,
            size: 'L',
            productColor: {
              color: 'Đen',
              product: { id: ids.product, name: 'Áo Polo Nam MIVA' },
            },
          },
        },
      ],
      totalQuantity: dto.quantity,
      subtotalAmount: String(dto.quantity * 250000),
    })),
  };

  const ordersService = {
    previewCheckout: jest.fn().mockResolvedValue({
      subtotalAmount: '500000.00',
      discountAmount: '0.00',
      totalAmount: '500000.00',
      appliedVouchers: [],
      packages: [
        {
          vendorId: 'platform',
          subtotalAmount: '500000.00',
          discountAmount: '0.00',
          totalAmount: '500000.00',
        },
      ],
    }),
    checkout: jest.fn().mockImplementation((clientId, dto) => ({
      id: ids.order,
      orderCode: 'ORD-MIVA-001',
      clientId,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      status: 'pending',
      totalAmount: '500000.00',
      orders: [
        {
          id: ids.order,
          orderCode: 'ORD-MIVA-001',
          status: 'pending',
          totalAmount: '500000.00',
        },
      ],
    })),
    updateStatus: jest.fn().mockImplementation((orderId, dto) => ({
      id: orderId,
      orderCode: 'ORD-MIVA-001',
      status: dto.status,
    })),
  };

  beforeAll(async () => {
    const delegates = {
      client: accountDelegate('client'),
      admin: accountDelegate('admin'),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ ...delegates, extended: delegates })
      .overrideProvider(ReviewsService)
      .useValue(reviewsService)
      .overrideProvider(SurveysService)
      .useValue(surveysService)
      .overrideProvider(ReportsService)
      .useValue(reportsService)
      .overrideProvider(CartService)
      .useValue(cartService)
      .overrideProvider(OrdersService)
      .useValue(ordersService)
      .compile();

    app = module.createNestApplication();
    app.useLogger(false);
    initApp(app);
    await app.init();
  });

  afterAll(async () => app?.close());

  const server = (): Server => app.getHttpServer() as Server;

  const login = async (email: string) => {
    const res = await request(server())
      .post('/api/auth/sign-in')
      .send({ email, password })
      .expect(201);
    return res.body.data.accessToken as string;
  };

  it('allows Client to submit direct product feedback and CRM Manager to reply (Mục 4.1 & 4.3)', async () => {
    const clientToken = await login('client@example.com');
    const crmToken = await login('crm@example.com');

    // Client sends product feedback directly without needing orderDetailId
    const createdFeedback = await request(server())
      .post('/api/reviews')
      .auth(clientToken, { type: 'bearer' })
      .send({
        productId: ids.product,
        rating: 5,
        content: 'Áo Polo vải mát, chuẩn size M!',
      })
      .expect(201);
    expect(createdFeedback.body).toMatchObject({
      productId: ids.product,
      rating: 5,
      content: 'Áo Polo vải mát, chuẩn size M!',
    });

    // CRM Manager views feedback and replies
    const replied = await request(server())
      .patch(`/api/reviews/admin/${ids.review}/reply`)
      .auth(crmToken, { type: 'bearer' })
      .send({
        adminReply: 'Cảm ơn bạn đã tin tưởng và ủng hộ thời trang MIVA!',
      })
      .expect(200);
    expect(replied.body.adminReply).toBe(
      'Cảm ơn bạn đã tin tưởng và ủng hộ thời trang MIVA!',
    );
  });

  it('runs end-to-end Survey flow: CRM creates & publishes -> Client receives & submits -> CRM views statistics (Mục 4.1 & 4.3)', async () => {
    const crmToken = await login('crm@example.com');
    const clientToken = await login('client@example.com');

    // 1. CRM Manager creates survey
    const createdSurvey = await request(server())
      .post('/api/surveys')
      .auth(crmToken, { type: 'bearer' })
      .send({
        title: 'Khảo sát thăm dò Bộ sưu tập Thu - Đông mới',
        audienceType: 'selected_users',
        triggerType: 'manual',
        questions: [
          {
            question: 'Mức độ yêu thích thiết kế MIVA?',
            type: 'rating',
            required: true,
            position: 1,
          },
        ],
      })
      .expect(201);
    expect(createdSurvey.body.id).toBe(ids.survey);

    // 2. CRM Manager activates survey and sends to selected customer account
    const activated = await request(server())
      .patch(`/api/surveys/${ids.survey}/status`)
      .auth(crmToken, { type: 'bearer' })
      .send({
        status: 'active',
        recipientIds: [ids.client],
      })
      .expect(200);
    expect(activated.body.status).toBe('active');

    // 3. Client checks Survey Inbox
    const inbox = await request(server())
      .get('/api/surveys/inbox')
      .auth(clientToken, { type: 'bearer' })
      .expect(200);
    expect(inbox.body.list[0].id).toBe(ids.response);

    // 4. Client submits survey response
    const submitted = await request(server())
      .post(`/api/surveys/inbox/${ids.response}/responses`)
      .auth(clientToken, { type: 'bearer' })
      .send({
        answers: [{ questionId: ids.question, ratingValue: 5 }],
      })
      .expect(201);
    expect(submitted.body.status).toBe('submitted');

    // 5. CRM Manager views survey statistical results
    const results = await request(server())
      .get(`/api/surveys/${ids.survey}/results`)
      .auth(crmToken, { type: 'bearer' })
      .expect(200);
    expect(results.body.summary).toMatchObject({
      totalInvited: 1,
      submittedCount: 1,
      completionRate: 100,
    });
  });

  it('returns Customer Age & Preference Analytics report for CRM Manager (Mục 4.1)', async () => {
    const crmToken = await login('crm@example.com');

    const report = await request(server())
      .get('/api/admin/reports/customer-analytics')
      .auth(crmToken, { type: 'bearer' })
      .expect(200);

    expect(report.body.summary.totalCustomers).toBe(25);
    expect(report.body.ageDistribution).toHaveLength(2);
    expect(report.body.favoriteCategories[0].name).toBe('Áo Polo Nam');
  });

  it('keeps CRM credentials out of Admin Server account and revenue APIs', async () => {
    const crmToken = await login('crm@example.com');

    await request(server())
      .get('/api/admin/reports/analytics')
      .auth(crmToken, { type: 'bearer' })
      .expect(403);
    await request(server())
      .get('/api/admins')
      .auth(crmToken, { type: 'bearer' })
      .expect(403);
    await request(server())
      .get('/api/users?role=admin')
      .auth(crmToken, { type: 'bearer' })
      .expect(403);
    await request(server())
      .get(`/api/users/${ids.crm}`)
      .auth(crmToken, { type: 'bearer' })
      .expect(403);
    await request(server())
      .patch(`/api/users/${ids.crm}`)
      .auth(crmToken, { type: 'bearer' })
      .send({ department: 'SUPER_ADMIN' })
      .expect(403);
    await request(server())
      .patch('/api/admins/profile')
      .auth(crmToken, { type: 'bearer' })
      .send({ department: 'SUPER_ADMIN' })
      .expect(400);
    await request(server())
      .post('/api/users')
      .auth(crmToken, { type: 'bearer' })
      .send({ fullName: 'Unexpected Admin', email: 'wrong@example.com', role: 'admin' })
      .expect(403);
    await request(server())
      .post('/api/auth/sign-in')
      .set('x-app-role', 'admin')
      .send({ email: 'crm@example.com', password })
      .expect(401);
  });

  it('allows Admin Server revenue access while denying CRM operations', async () => {
    const response = await request(server())
      .post('/api/auth/sign-in')
      .set('x-app-role', 'admin')
      .send({ email: 'system@example.com', password })
      .expect(201);
    const token = response.body.data.accessToken;

    await request(server())
      .get('/api/admin/reports/analytics')
      .auth(token, { type: 'bearer' })
      .expect(200);
    await request(server())
      .get('/api/reviews/admin/all')
      .auth(token, { type: 'bearer' })
      .expect(403);
    const profile = await request(server())
      .get('/api/admins/profile')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(profile.body.roleCode).toBe('SUPER_ADMIN');
  });

  it('lets Admin Server assign CRM access while CRM can create only customers', async () => {
    const systemLogin = await request(server())
      .post('/api/auth/sign-in')
      .set('x-app-role', 'admin')
      .send({ email: 'system@example.com', password })
      .expect(201);
    const systemToken = systemLogin.body.data.accessToken;
    const createdManager = await request(server())
      .post('/api/users')
      .auth(systemToken, { type: 'bearer' })
      .send({
        fullName: 'Quản lý CRM mới',
        email: 'manager-new@example.com',
        password: 'Test-password-123!',
        role: 'admin',
        department: 'CRM_MANAGER',
      })
      .expect(201);
    expect(createdManager.body.roleCode).toBe('CRM_MANAGER');

    const crmToken = await login('crm@example.com');
    const createdCustomer = await request(server())
      .post('/api/users')
      .auth(crmToken, { type: 'bearer' })
      .send({
        fullName: 'Khách hàng mới',
        email: 'customer-new@example.com',
        password: 'Test-password-123!',
        role: 'customer',
      })
      .expect(201);
    expect(createdCustomer.body.role).toBe('customer');
  });

  it('completes Cart -> Preview -> Order Checkout -> CRM Status Progression flow end-to-end', async () => {
    const clientToken = await login('client@example.com');
    const crmToken = await login('crm@example.com');

    // 1. Client adds product variant to cart
    const added = await request(server())
      .post('/api/cart/items')
      .auth(clientToken, { type: 'bearer' })
      .send({
        productVariantId: ids.variant,
        quantity: 2,
      })
      .expect(201);
    expect(added.body.totalQuantity).toBe(2);

    // 2. Client views cart
    const cart = await request(server())
      .get('/api/cart')
      .auth(clientToken, { type: 'bearer' })
      .expect(200);
    expect(cart.body.items).toHaveLength(1);

    // 3. Client previews checkout pricing
    const preview = await request(server())
      .post('/api/orders/preview')
      .auth(clientToken, { type: 'bearer' })
      .send({
        cartItemIds: [ids.cartItem],
        voucherCodes: [],
      })
      .expect(201);
    expect(preview.body.totalAmount).toBe('500000.00');

    // 4. Client places order
    const checkedOut = await request(server())
      .post('/api/orders/checkout')
      .auth(clientToken, { type: 'bearer' })
      .send({
        receiverName: 'Nguyễn Văn Khách Hàng',
        receiverPhone: '0901234567',
        shippingAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        paymentMethod: 'cod',
        voucherCodes: [],
        expectedTotalAmount: 500000,
        cartItemIds: [ids.cartItem],
      })
      .expect(201);
    expect(checkedOut.body.orderCode).toBe('ORD-MIVA-001');
    expect(checkedOut.body.status).toBe('pending');

    // 5. CRM Manager updates order status: pending -> confirmed -> processing -> shipping -> completed
    for (const nextStatus of ['confirmed', 'processing', 'shipping', 'completed']) {
      const updated = await request(server())
        .patch(`/api/orders/${ids.order}/status`)
        .auth(crmToken, { type: 'bearer' })
        .send({ status: nextStatus })
        .expect(200);
      expect(updated.body.status).toBe(nextStatus);
    }

    // 6. Client returns completed order within 7 days (completed -> returned)
    const returned = await request(server())
      .patch(`/api/orders/${ids.order}/status`)
      .auth(clientToken, { type: 'bearer' })
      .send({ status: 'returned', note: 'Trả hàng hoàn tiền trong 7 ngày' })
      .expect(200);
    expect(returned.body.status).toBe('returned');

    // 7. Client uses Buy Now (direct items in preview and checkout without cartItemIds)
    await request(server())
      .post('/api/orders/preview')
      .auth(clientToken, { type: 'bearer' })
      .send({
        items: [{ productVariantId: ids.variant, quantity: 1 }],
        voucherCodes: [],
      })
      .expect(201);

    const buyNowOrder = await request(server())
      .post('/api/orders/checkout')
      .auth(clientToken, { type: 'bearer' })
      .send({
        receiverName: 'Nguyễn Văn Khách Hàng',
        receiverPhone: '0901234567',
        shippingAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        paymentMethod: 'pay_later',
        voucherCodes: [],
        items: [{ productVariantId: ids.variant, quantity: 1 }],
      })
      .expect(201);
    expect(buyNowOrder.body.paymentMethod).toBe('pay_later');
  });
});
