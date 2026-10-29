// End-to-end checks against the running local API, PostgreSQL and Vite portals.
// Every inserted row is marked and removed in finally.
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('../../client/node_modules/playwright');
const { ensurePortals } = require('./ensure-portals.cjs');

const prisma = new PrismaClient();
let apiBase = process.env.CRM_TEST_API_URL || 'http://localhost:3000/api';
const password = process.env.CRM_TEST_PASSWORD || 'admin123';
const marker = `SYSTEM-E2E-${randomUUID().slice(0, 8)}`;
const owned = {
  clients: [],
  orders: [],
  surveyId: null,
  reviewId: null,
  productId: null,
  categoryId: null,
  voucherId: null,
};

async function call(path, { method = 'GET', token, body, expected = 200, appRole } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(appRole ? { 'x-app-role': appRole } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = { message: raw.slice(0, 120) }; }
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status} ${payload?.message || ''}`);
  return payload?.data ?? payload;
}

async function login(email, role, secret = password) {
  const response = await fetch(`${apiBase}/auth/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-role': role },
    body: JSON.stringify({ email, password: secret }),
  });
  assert.equal(response.status, 201, `${role} login: HTTP ${response.status}`);
  const payload = await response.json();
  return payload.data.accessToken;
}

async function browserLogin(context, port, role, email, secret = password) {
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await context.request.post(`http://localhost:${port}/api/auth/sign-in`, {
      headers: { 'x-app-role': role },
      data: { email, password: secret },
    });
    if (response.status() !== 502) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(response.status(), 201, `${role} browser login: HTTP ${response.status()}`);
}

async function cleanup() {
  if (owned.reviewId) {
    await prisma.notification.deleteMany({ where: { data: { path: ['reviewId'], equals: owned.reviewId } } });
    await prisma.review.deleteMany({ where: { id: owned.reviewId, content: marker } });
  }
  if (owned.surveyId) {
    await prisma.notification.deleteMany({ where: { surveyId: owned.surveyId } });
    await prisma.surveyResponse.deleteMany({ where: { surveyId: owned.surveyId } });
    await prisma.survey.deleteMany({ where: { id: owned.surveyId, title: marker } });
  }
  if (owned.orders.length) {
    await prisma.surveyResponse.deleteMany({ where: { orderId: { in: owned.orders } } });
    await prisma.order.deleteMany({ where: { id: { in: owned.orders }, notes: marker } });
  }
  if (owned.voucherId) {
    await prisma.voucher.deleteMany({ where: { id: owned.voucherId } });
  }
  if (owned.productId) {
    await prisma.product.deleteMany({ where: { id: owned.productId, name: marker } });
  }
  if (owned.categoryId) {
    await prisma.category.deleteMany({ where: { id: owned.categoryId } });
  }
  if (owned.clients.length) {
    await prisma.notification.deleteMany({ where: { clientId: { in: owned.clients } } });
    await prisma.surveyResponse.deleteMany({ where: { clientId: { in: owned.clients } } });
    await prisma.client.deleteMany({ where: { id: { in: owned.clients } } });
  }
}

async function main() {
  let browser;
  const portalsRuntime = await ensurePortals();
  if (!process.env.CRM_TEST_API_URL) {
    apiBase = portalsRuntime.apiBase;
  }
  try {
    const crmEmail = process.env.CRM_TEST_CRM_EMAIL || 'crm@miva.vn';
    const adminEmail = process.env.CRM_TEST_ADMIN_EMAIL || 'admin@miva.vn';
    const crmToken = await login(crmEmail, 'crm');
    const adminToken = await login(adminEmail, 'admin');
    const crm = await prisma.admin.findUniqueOrThrow({ where: { email: crmEmail }, select: { id: true } });
    const product = await prisma.product.findFirstOrThrow({ where: { status: 'active', deletedAt: null }, select: { id: true } });
    const clientPassword = 'System-E2E-Password-123!';
    const hash = await bcrypt.hash(clientPassword, 4);

    // 1. Auth Registration, Profile, Users & Addresses E2E
    const registeredClient = await call('/auth/sign-up', {
      method: 'POST',
      appRole: 'client',
      expected: 201,
      body: {
        email: `${marker}-0@example.com`.toLowerCase(),
        fullName: marker,
        password: clientPassword,
        phone: '0901234560',
      },
    });
    owned.clients.push(registeredClient.id);
    const secondClient = await prisma.client.create({
      data: { email: `${marker}-1@example.com`.toLowerCase(), fullName: marker, password: hash },
    });
    owned.clients.push(secondClient.id);

    const [firstToken, secondToken] = await Promise.all(
      owned.clients.map((_, i) => login(`${marker}-${i}@example.com`.toLowerCase(), 'client', clientPassword)),
    );

    const clientProfile = await call('/users/profile', { token: firstToken });
    assert.equal(clientProfile.email, `${marker}-0@example.com`.toLowerCase());
    await call('/users/profile', {
      method: 'PATCH',
      token: firstToken,
      body: { fullName: marker, phone: '0909888777' },
    });

    const createdAddr = await call('/addresses', {
      method: 'POST',
      token: firstToken,
      expected: 201,
      body: {
        receiverName: marker,
        phone: '0909888777',
        addressLine: '123 Đường Lê Lợi',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        province: 'TP.HCM',
        label: 'Nhà riêng',
        isDefault: true,
      },
    });
    assert.equal(createdAddr.isDefault, true);
    const addrList = await call('/addresses', { token: firstToken });
    assert.equal(addrList.length, 1);
    const updatedAddr = await call(`/addresses/${createdAddr.id}`, {
      method: 'PATCH',
      token: firstToken,
      body: { label: 'Văn phòng' },
    });
    assert.equal(updatedAddr.label, 'Văn phòng');
    await call(`/addresses/${createdAddr.id}`, { method: 'DELETE', token: firstToken });
    assert.equal((await call('/addresses', { token: firstToken })).length, 0);
    console.log('PASS auth, profile & addresses: sign-up, sign-in, profile update, address CRUD');

    // 2. Survey E2E
    const now = Date.now();
    const templates = await call('/surveys/templates?target=client', { token: crmToken });
    assert.ok(Array.isArray(templates.templates));
    const survey = await call('/surveys', {
      method: 'POST', token: crmToken, expected: 201,
      body: {
        title: marker, audienceType: 'selected_users', recipientIds: owned.clients,
        triggerType: 'manual', startDate: new Date(now - 60_000).toISOString(),
        endDate: new Date(now + 86_400_000).toISOString(),
        questions: [{ question: 'Đánh giá E2E?', type: 'rating', required: true, position: 1, options: [] }],
      },
    });
    owned.surveyId = survey.id;
    await call(`/surveys/${survey.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'active' } });
    const responses = await prisma.surveyResponse.findMany({ where: { surveyId: survey.id }, orderBy: { clientId: 'asc' } });
    assert.equal(responses.length, 2);
    const responseByClient = new Map(responses.map((response) => [response.clientId, response]));
    const first = responseByClient.get(owned.clients[0]);
    const second = responseByClient.get(owned.clients[1]);
    const question = await prisma.surveyQuestion.findFirstOrThrow({ where: { surveyId: survey.id }, select: { id: true } });
    const initialResults = await call(`/surveys/${survey.id}/results`, { token: crmToken });
    assert.deepEqual([initialResults.summary.invitedCount, initialResults.summary.unopenedCount, initialResults.summary.responseCount], [2, 2, 0]);
    const initialList = await call(`/surveys/admin/all?search=${encodeURIComponent(marker)}`, { token: crmToken });
    assert.equal(initialList.list[0]._count.responses, 0, 'Lượt phản hồi counted invitations');
    await call(`/surveys/inbox/${first.id}/open`, { method: 'PATCH', token: firstToken });
    const openedResults = await call(`/surveys/${survey.id}/results`, { token: crmToken });
    assert.deepEqual([openedResults.summary.unopenedCount, openedResults.summary.openedPendingCount, openedResults.summary.responseCount], [1, 1, 0]);
    await call(`/surveys/inbox/${first.id}/responses`, {
      method: 'POST', token: firstToken, expected: 201,
      body: { answers: [{ questionId: question.id, ratingValue: 5 }] },
    });
    const oneAnswered = await call(`/surveys/${survey.id}/results`, { token: crmToken });
    assert.deepEqual([oneAnswered.summary.invitedCount, oneAnswered.summary.unopenedCount, oneAnswered.summary.openedPendingCount, oneAnswered.summary.responseCount, oneAnswered.summary.completionRate], [2, 1, 0, 1, 0.5]);
    const updatedList = await call(`/surveys/admin/all?search=${encodeURIComponent(marker)}`, { token: crmToken });
    assert.equal(updatedList.list[0]._count.responses, 1);
    const surveyNotice = await prisma.notification.findFirstOrThrow({ where: { surveyId: survey.id, adminId: crm.id, data: { path: ['kind'], equals: 'survey_response' } } });
    assert.equal(surveyNotice.data.responseId, first.id);
    const exactResponse = await call(`/surveys/${survey.id}/responses/${first.id}`, { token: crmToken });
    assert.equal(exactResponse.id, first.id);
    await call(`/surveys/${survey.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'closed' } });
    await call(`/surveys/inbox/${second.id}/responses`, { method: 'POST', token: secondToken, expected: 400, body: { answers: [{ questionId: question.id, ratingValue: 4 }] } });
    await call(`/surveys/${survey.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'active' } });
    assert.equal(await prisma.surveyResponse.count({ where: { surveyId: survey.id } }), 2, 'Reopening duplicated invitations');
    assert.equal(await prisma.notification.count({ where: { surveyId: survey.id, type: 'survey_invitation' } }), 2, 'Reopening resent invitations');
    const past = new Date(now - 60_000);
    await prisma.survey.update({ where: { id: survey.id }, data: { endDate: past } });
    await prisma.surveyResponse.update({ where: { id: second.id }, data: { expiresAt: past } });
    await call(`/surveys/inbox/${second.id}/responses`, { method: 'POST', token: secondToken, expected: 400, body: { answers: [{ questionId: question.id, ratingValue: 4 }] } });
    const extendedEnd = new Date(now + 172_800_000).toISOString();
    await call(`/surveys/${survey.id}/schedule`, { method: 'PATCH', token: crmToken, body: { endDate: extendedEnd } });
    const extendedResponse = await prisma.surveyResponse.findUniqueOrThrow({ where: { id: second.id } });
    assert.equal(extendedResponse.expiresAt.toISOString(), extendedEnd);
    await call(`/surveys/inbox/${second.id}/responses`, { method: 'POST', token: secondToken, expected: 201, body: { answers: [{ questionId: question.id, ratingValue: 4 }] } });

    // Notifications endpoints check
    const unreadInfo = await call('/notifications/unread-count', { token: firstToken });
    assert.equal(typeof unreadInfo.count, 'number');
    const notifList = await call('/notifications', { token: firstToken });
    assert.ok(Array.isArray(notifList.list));
    if (notifList.list.length > 0) {
      await call(`/notifications/${notifList.list[0].id}/read`, { method: 'PATCH', token: firstToken });
    }
    await call('/notifications/read-all', { method: 'PATCH', token: firstToken });
    assert.equal((await call('/notifications/unread-count', { token: firstToken })).count, 0);
    console.log('PASS survey & notifications: templates, date range, invitation counts, open/submit stages, close/reopen, expiry, extension, notifications');

    // 3. Review E2E
    const review = await call('/reviews', { method: 'POST', token: firstToken, expected: 201, body: { productId: product.id, rating: 5, content: marker } });
    owned.reviewId = review.id;
    const publicReviews = await call(`/reviews/product/${product.id}`);
    assert.ok(Array.isArray(publicReviews));
    const reviewNotice = await prisma.notification.findFirstOrThrow({ where: { adminId: crm.id, data: { path: ['reviewId'], equals: review.id } } });
    const exactReview = await call(`/reviews/admin/${review.id}`, { token: crmToken });
    assert.equal(exactReview.id, review.id);
    const repliedReview = await call(`/reviews/admin/${review.id}/reply`, {
      method: 'PATCH',
      token: crmToken,
      body: { adminReply: 'Cảm ơn quý khách!' },
    });
    assert.equal(repliedReview.adminReply, 'Cảm ơn quý khách!');
    console.log('PASS review: customer post, public list, CRM notice, direct record lookup & CRM reply');

    // 4. Category, Product, Favorites & Vouchers E2E
    const createdCategory = await call('/categories', {
      method: 'POST',
      token: crmToken,
      expected: 201,
      body: { name: `Cat ${marker}` },
    });
    owned.categoryId = createdCategory.id;
    const updatedCategory = await call(`/categories/${createdCategory.id}`, {
      method: 'PATCH',
      token: crmToken,
      body: { name: `Cat Updated ${marker}` },
    });
    assert.equal(updatedCategory.name, `Cat Updated ${marker}`);

    const checkoutProduct = await prisma.product.create({
      data: {
        categoryId: createdCategory.id, name: marker, slug: marker.toLowerCase(), status: 'active',
        colors: { create: { color: 'E2E', variants: { create: { size: 'standard', stock: 10, price: 20000 } } } },
      },
      include: { colors: { include: { variants: true } } },
    });
    owned.productId = checkoutProduct.id;
    const variantId = checkoutProduct.colors[0].variants[0].id;

    // Favorites lifecycle
    await call(`/products/${checkoutProduct.id}/favorite`, { method: 'POST', token: firstToken, expected: 201 });
    const favStatus = await call(`/products/${checkoutProduct.id}/favorite-status`, { token: firstToken });
    assert.equal(favStatus.favorited, true);
    const favList = await call('/products/favorites', { token: firstToken });
    assert.ok(favList.some((f) => f.product?.id === checkoutProduct.id));
    await call(`/products/${checkoutProduct.id}/favorite`, { method: 'DELETE', token: firstToken });
    assert.equal((await call(`/products/${checkoutProduct.id}/favorite-status`, { token: firstToken })).favorited, false);

    // Voucher lifecycle
    const voucherCode = `VCH${randomUUID().slice(0, 6).toUpperCase()}`;
    const createdVoucher = await call('/vouchers', {
      method: 'POST',
      token: crmToken,
      expected: 201,
      body: {
        code: voucherCode,
        name: `Voucher ${marker}`,
        discountType: 'fixed_amount',
        discountValue: 5000,
        minOrderAmount: 10000,
        quantity: 5,
        perUserLimit: 2,
        startDate: new Date(now - 60_000).toISOString(),
        endDate: new Date(now + 86_400_000).toISOString(),
        status: 'active',
      },
    });
    owned.voucherId = createdVoucher.id;
    const availableVouchers = await call('/vouchers/available', { token: firstToken });
    assert.ok(availableVouchers.some((v) => v.code === voucherCode));
    console.log('PASS catalog, categories, favorites & vouchers: CRUD, favorite toggle, voucher creation & discovery');

    // 5. Cart CRUD, Buy Now, Checkout, Payment Demo, Cancel Refund, 7-day Return & Refund, >7-day Return Rejection
    const addedCart = await call('/cart/items', { method: 'POST', token: firstToken, expected: 201, body: { productVariantId: variantId, quantity: 2 } });
    const cartItemId = addedCart.items[0].id;
    await call(`/cart/items/${cartItemId}`, { method: 'PATCH', token: firstToken, body: { quantity: 1 } });
    const cart = await call('/cart', { token: firstToken });
    assert.equal(cart.items.length, 1);
    assert.equal(cart.items[0].quantity, 1);

    browser = await chromium.launch({ channel: process.env.MIVA_BROWSER_CHANNEL || 'msedge', headless: true });
    const clientContext = await browser.newContext();
    await browserLogin(clientContext, 5173, 'client', `${marker}-0@example.com`.toLowerCase(), clientPassword);
    const clientPage = await clientContext.newPage();
    await clientPage.goto(`http://localhost:5173/products/${checkoutProduct.id}`, { waitUntil: 'domcontentloaded' });
    await clientPage.getByTestId('buy-now-button').waitFor();
    await clientPage.getByTestId('buy-now-button').click();
    await clientPage.waitForURL('**/checkout');
    await clientPage.getByRole('heading', { name: 'Thanh toán đơn hàng' }).waitFor();
    await clientPage.locator('main').getByText(marker, { exact: true }).first().waitFor();
    await clientContext.close();

    // Flow A: Cart checkout with COD -> Completed -> 7-day Return & Refund
    const preview = await call('/orders/preview', { method: 'POST', token: firstToken, expected: 201, body: { voucherCodes: [] } });
    assert.equal(Number(preview.totalAmount), 20000);
    const checkedOut = await call('/orders/checkout', {
      method: 'POST', token: firstToken, expected: 201,
      body: { voucherCodes: [], receiverName: marker, receiverPhone: '0901234567', shippingAddress: '123 E2E Test Street', paymentMethod: 'cod', notes: marker, expectedTotalAmount: 20000 },
    });
    owned.orders.push(checkedOut.id);
    assert.equal(checkedOut.totalOrders, 1);
    assert.equal((await call('/cart', { token: firstToken })).items.length, 0);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 9);
    assert.ok((await call('/orders/mine', { token: firstToken })).some((order) => order.id === checkedOut.id));
    assert.equal((await call(`/orders/${checkedOut.id}`, { token: crmToken })).id, checkedOut.id);

    // Flow B: Buy Now (direct items without clearing cart) + Voucher + pay_later auto-paid + Cancel in confirmed status -> Refunded & Voucher restored
    await call('/cart/items', { method: 'POST', token: firstToken, expected: 201, body: { productVariantId: variantId, quantity: 1 } });
    const buyNowPreview = await call('/orders/preview', {
      method: 'POST', token: firstToken, expected: 201,
      body: { items: [{ productVariantId: variantId, quantity: 1 }], voucherCodes: [voucherCode] },
    });
    assert.equal(Number(buyNowPreview.discountAmount), 5000);
    assert.equal(Number(buyNowPreview.totalAmount), 15000);
    const buyNowOrder = await call('/orders/checkout', {
      method: 'POST', token: firstToken, expected: 201,
      body: {
        items: [{ productVariantId: variantId, quantity: 1 }],
        voucherCodes: [voucherCode],
        receiverName: marker,
        receiverPhone: '0901234567',
        shippingAddress: '123 E2E Buy Now Street',
        paymentMethod: 'pay_later',
        notes: marker,
        expectedTotalAmount: 15000,
      },
    });
    owned.orders.push(buyNowOrder.id);
    assert.equal((await call('/cart', { token: firstToken })).items.length, 1, 'Buy Now must not clear existing cart items');
    assert.equal(buyNowOrder.payment?.status, 'paid', 'pay_later must auto-record as paid');
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 8);
    assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: createdVoucher.id } })).usedQuantity, 1);
    await call(`/orders/${buyNowOrder.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'confirmed' } });
    const cancelledBuyNow = await call(`/orders/${buyNowOrder.id}/status`, {
      method: 'PATCH', token: firstToken, body: { status: 'cancelled', note: 'Khách hủy đơn trả sau' },
    });
    assert.equal(cancelledBuyNow.status, 'cancelled');
    assert.equal(cancelledBuyNow.payment?.status, 'refunded');
    assert.ok(cancelledBuyNow.payment?.refundedAt);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 9);
    assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: createdVoucher.id } })).usedQuantity, 0, 'Cancelling order must restore voucher usage');

    // Flow C: Online Payment Demo Gate (bank_transfer) -> processDemoPayment -> paid -> Cancel in processing -> Refunded
    const bankOrder = await call('/orders/checkout', {
      method: 'POST', token: firstToken, expected: 201,
      body: {
        items: [{ productVariantId: variantId, quantity: 1 }],
        voucherCodes: [],
        receiverName: marker,
        receiverPhone: '0901234567',
        shippingAddress: '123 E2E Bank Transfer Street',
        paymentMethod: 'bank_transfer',
        notes: marker,
        expectedTotalAmount: 20000,
      },
    });
    owned.orders.push(bankOrder.id);
    const paymentRecord = await call(`/payments/order/${bankOrder.id}`, { token: firstToken });
    assert.equal(paymentRecord.status, 'pending');
    const paidDemo = await call(`/payments/demo/${paymentRecord.id}`, {
      method: 'POST', token: firstToken, expected: 201, body: { success: true },
    });
    assert.equal(paidDemo.status, 'paid');
    await call(`/orders/${bankOrder.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'confirmed' } });
    await call(`/orders/${bankOrder.id}/status`, { method: 'PATCH', token: crmToken, body: { status: 'processing' } });
    const cancelledBank = await call(`/orders/${bankOrder.id}/status`, {
      method: 'PATCH', token: firstToken, body: { status: 'cancelled', note: 'Khách hủy đơn đang đóng gói' },
    });
    assert.equal(cancelledBank.payment?.status, 'refunded');

    // Complete checkedOut order -> test >7-day return rejection first, then valid 7-day return & refund
    for (const nextStatus of ['confirmed', 'processing', 'shipping', 'completed']) {
      await call(`/orders/${checkedOut.id}/status`, { method: 'PATCH', token: crmToken, body: { status: nextStatus } });
    }
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await prisma.orderStatusHistory.updateMany({
      where: { orderId: checkedOut.id, toStatus: 'completed' },
      data: { createdAt: eightDaysAgo },
    });
    await call(`/orders/${checkedOut.id}/status`, {
      method: 'PATCH', token: firstToken, expected: 400,
      body: { status: 'returned', note: 'Thử trả hàng quá hạn 8 ngày' },
    });
    await prisma.orderStatusHistory.updateMany({
      where: { orderId: checkedOut.id, toStatus: 'completed' },
      data: { createdAt: new Date() },
    });
    const returnedOrder = await call(`/orders/${checkedOut.id}/status`, {
      method: 'PATCH', token: firstToken, body: { status: 'returned', note: 'Trả hàng hoàn tiền trong 7 ngày' },
    });
    assert.equal(returnedOrder.status, 'returned');
    assert.equal(returnedOrder.payment?.status, 'refunded');
    assert.ok(returnedOrder.payment?.refundedAt);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 10);
    console.log('PASS commerce: cart CRUD, Buy Now, voucher discount & restore, pay_later auto-paid, demo gate, cancel refund, 7-day return & >7-day rejection');

    // 6. Reports, Customer Analytics, Finance Config, Revenue Analytics & Reconciliation E2E
    const custAnalytics = await call('/admin/reports/customer-analytics', { token: crmToken });
    assert.equal(typeof custAnalytics.overview?.totalClients, 'number');
    const custReport = await call('/admin/reports/customers', { token: crmToken });
    assert.equal(typeof custReport.customerCount, 'number');
    const finConfig = await call('/admin/reports/finance-config', { token: adminToken });
    assert.ok(finConfig.current);

    const fixtureDate = new Date('2034-02-03T08:00:00.000Z');
    const fixtures = [
      { status: 'completed', amount: 100, paymentStatus: 'paid', refundedAt: null },
      { status: 'shipping', amount: 50, paymentStatus: 'paid', refundedAt: null },
      { status: 'cancelled', amount: 20, paymentStatus: 'refunded', refundedAt: fixtureDate },
    ];
    for (const [index, fixture] of fixtures.entries()) {
      const order = await prisma.order.create({ data: {
        clientId: owned.clients[0], orderCode: `${marker}-${index}`, notes: marker,
        status: fixture.status, totalAmount: fixture.amount, subtotalAmount: fixture.amount,
        createdAt: fixtureDate,
        payment: { create: { method: 'vnpay', amount: fixture.amount, status: fixture.paymentStatus, paidAt: fixtureDate, refundedAt: fixture.refundedAt } },
      } });
      owned.orders.push(order.id);
    }
    const report = await call('/admin/reports/reconciliation?startDate=2034-02-03&endDate=2034-02-03', { token: adminToken });
    assert.deepEqual(report.summary, { totalGmv: 100, grossCashIn: 170, refundedAmount: 20, netCashIn: 150, difference: 50 });
    const paidRows = await call('/admin/reports/reconciliation?startDate=2034-02-03&endDate=2034-02-03&kind=paid', { token: adminToken });
    assert.equal(paidRows.totalItems, 3);
    const refundRows = await call('/admin/reports/reconciliation?startDate=2034-02-03&endDate=2034-02-03&kind=refund', { token: adminToken });
    assert.equal(refundRows.totalItems, 1);
    const revenueOverview = await call('/admin/reports/analytics?period=custom&startDate=2034-02-03&endDate=2034-02-03', { token: adminToken });
    assert.equal(revenueOverview.summary.totalRefundedAmount, 20);
    assert.equal(revenueOverview.summary.netCashIn, 150);
    assert.equal(revenueOverview.summary.refundedOrdersCount, 1);
    console.log('PASS reports: customer analytics, finance config, reconciliation & revenue analytics with refund KPIs');

    // 7. Browser E2E across CRM, Admin Server, and Client (including live Account Lock forced logout)
    const crmContext = await browser.newContext();
    await browserLogin(crmContext, 5174, 'crm', crmEmail);
    const crmPage = await crmContext.newPage();
    await crmPage.goto('http://localhost:5174/reviews', { waitUntil: 'domcontentloaded' });
    await crmPage.locator('button[title="Thông báo"]').click();
    await crmPage.locator(`[data-notification-id="${reviewNotice.id}"]`).click();
    await crmPage.waitForURL(`**/reviews?reviewId=${review.id}`);
    await crmPage.getByText(marker, { exact: true }).first().waitFor();
    await crmPage.locator('button[title="Thông báo"]').click();
    await crmPage.locator(`[data-notification-id="${surveyNotice.id}"]`).click();
    await crmPage.waitForURL(`**/surveys?surveyId=${survey.id}&responseId=${first.id}`);
    await crmPage.getByText(`Phản hồi của ${marker}`).waitFor();
    await crmContext.close();

    const adminContext = await browser.newContext();
    await browserLogin(adminContext, 5175, 'admin', adminEmail);
    const adminPage = await adminContext.newPage();
    await adminPage.goto('http://localhost:5175/system/reconciliation', { waitUntil: 'domcontentloaded' });
    await adminPage.locator('input[type="date"]').nth(0).fill('2034-02-03');
    await adminPage.locator('input[type="date"]').nth(1).fill('2034-02-03');
    await adminPage.getByText(`${marker}-0`).waitFor();
    await adminPage.getByRole('button', { name: /Hoàn tiền/ }).first().click();
    await adminPage.getByText(`${marker}-2`).waitFor();
    await adminPage.goto('http://localhost:5175/system/revenue', { waitUntil: 'domcontentloaded' });
    await adminPage.getByText('Tổng Tiền Hoàn Trả (Refund)').waitFor();
    await adminPage.getByText('Thực Thu Sau Hoàn Tiền').waitFor();
    await adminContext.close();

    // Live Account Lock while Client is actively using the website
    const lockClientContext = await browser.newContext();
    await browserLogin(lockClientContext, 5173, 'client', `${marker}-1@example.com`.toLowerCase(), clientPassword);
    const lockClientPage = await lockClientContext.newPage();
    let lockAlertMessage = '';
    lockClientPage.on('dialog', async (dialog) => {
      lockAlertMessage = dialog.message();
      await dialog.accept();
    });
    await lockClientPage.goto('http://localhost:5173/orders', { waitUntil: 'domcontentloaded' });
    await lockClientPage.waitForTimeout(800);
    await call(`/users/${owned.clients[1]}/status`, {
      method: 'PATCH', token: adminToken, body: { status: 'inactive' },
    });
    await call('/users/profile', { token: secondToken, expected: 401 });
    await lockClientPage.waitForURL('**/login', { timeout: 10000 });
    assert.ok(lockAlertMessage.includes('khóa'), `Expected lock alert message, got: ${lockAlertMessage}`);
    await lockClientContext.close();
    console.log('PASS account lock & browser E2E: active browser session immediately alerted & logged out to /login when locked by Admin');
  } finally {
    if (browser) await browser.close();
    try { await cleanup(); } finally {
      await portalsRuntime.stop();
      await prisma.$disconnect();
    }
  }
}

main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
