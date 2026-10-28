// End-to-end checks against the running local API, PostgreSQL and Vite portals.
// Every inserted row is marked and removed in finally.
require('dotenv').config();
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('../../client/node_modules/playwright');

const prisma = new PrismaClient();
const apiBase = process.env.CRM_TEST_API_URL || 'http://localhost:3000/api';
const password = process.env.CRM_TEST_PASSWORD || 'admin123';
const marker = `SYSTEM-E2E-${randomUUID().slice(0, 8)}`;
const owned = { clients: [], orders: [], surveyId: null, reviewId: null, productId: null };

async function call(path, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
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
  if (owned.orders.length) await prisma.order.deleteMany({ where: { id: { in: owned.orders }, notes: marker } });
  if (owned.productId) await prisma.product.deleteMany({ where: { id: owned.productId, name: marker } });
  if (owned.clients.length) await prisma.client.deleteMany({ where: { id: { in: owned.clients }, fullName: marker } });
}

async function main() {
  let browser;
  try {
    const crmEmail = process.env.CRM_TEST_CRM_EMAIL || 'crm@miva.vn';
    const adminEmail = process.env.CRM_TEST_ADMIN_EMAIL || 'admin@miva.vn';
    const crmToken = await login(crmEmail, 'crm');
    const adminToken = await login(adminEmail, 'admin');
    const crm = await prisma.admin.findUniqueOrThrow({ where: { email: crmEmail }, select: { id: true } });
    const product = await prisma.product.findFirstOrThrow({ where: { status: 'active', deletedAt: null }, select: { id: true } });
    const clientPassword = 'System-E2E-Password-123!';
    const hash = await bcrypt.hash(clientPassword, 4);
    for (let i = 0; i < 2; i++) {
      const client = await prisma.client.create({ data: { email: `${marker}-${i}@example.com`.toLowerCase(), fullName: marker, password: hash } });
      owned.clients.push(client.id);
    }
    const [firstToken, secondToken] = await Promise.all(owned.clients.map((_, i) => login(`${marker}-${i}@example.com`.toLowerCase(), 'client', clientPassword)));
    const now = Date.now();
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
    console.log('PASS survey: date range, invitation counts, open/submit stages, close/reopen, expiry, extension');

    const review = await call('/reviews', { method: 'POST', token: firstToken, expected: 201, body: { productId: product.id, rating: 5, content: marker } });
    owned.reviewId = review.id;
    const reviewNotice = await prisma.notification.findFirstOrThrow({ where: { adminId: crm.id, data: { path: ['reviewId'], equals: review.id } } });
    const exactReview = await call(`/reviews/admin/${review.id}`, { token: crmToken });
    assert.equal(exactReview.id, review.id);
    console.log('PASS review: customer post, CRM notice, direct record lookup');

    const category = await prisma.category.findFirstOrThrow({ where: { deletedAt: null }, select: { id: true } });
    const checkoutProduct = await prisma.product.create({
      data: {
        categoryId: category.id, name: marker, slug: marker.toLowerCase(), status: 'active',
        colors: { create: { color: 'E2E', variants: { create: { size: 'standard', stock: 2, price: 12345 } } } },
      },
      include: { colors: { include: { variants: true } } },
    });
    owned.productId = checkoutProduct.id;
    const variantId = checkoutProduct.colors[0].variants[0].id;
    await call('/cart/items', { method: 'POST', token: firstToken, expected: 201, body: { productVariantId: variantId, quantity: 1 } });
    const cart = await call('/cart', { token: firstToken });
    assert.equal(cart.items.length, 1);
    browser = await chromium.launch({ channel: process.env.MIVA_BROWSER_CHANNEL || 'msedge', headless: true });
    const clientContext = await browser.newContext();
    await browserLogin(clientContext, 5173, 'client', `${marker}-0@example.com`.toLowerCase(), clientPassword);
    const clientPage = await clientContext.newPage();
    await clientPage.goto('http://localhost:5173/checkout', { waitUntil: 'domcontentloaded' });
    await clientPage.getByRole('heading', { name: 'Thanh toán đơn hàng' }).waitFor();
    await clientPage.getByText(marker, { exact: true }).first().waitFor();
    await clientContext.close();
    const preview = await call('/orders/preview', { method: 'POST', token: firstToken, expected: 201, body: { voucherCodes: [] } });
    assert.equal(Number(preview.totalAmount), 12345);
    const checkedOut = await call('/orders/checkout', {
      method: 'POST', token: firstToken, expected: 201,
      body: { voucherCodes: [], receiverName: marker, receiverPhone: '0901234567', shippingAddress: '123 E2E Test Street', paymentMethod: 'cod', notes: marker, expectedTotalAmount: 12345 },
    });
    owned.orders.push(checkedOut.id);
    assert.equal(checkedOut.totalOrders, 1);
    assert.equal((await call('/cart', { token: firstToken })).items.length, 0);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 1);
    assert.ok((await call('/orders/mine', { token: firstToken })).some((order) => order.id === checkedOut.id));
    assert.equal((await call(`/orders/${checkedOut.id}`, { token: crmToken })).id, checkedOut.id);
    console.log('PASS commerce: cart, price preview, COD checkout, stock, client and CRM order views');

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
    console.log('PASS reconciliation: GMV, paid, refund, net, difference and filters');

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
    await adminContext.close();
    console.log('PASS browser: notification deep links and reconciliation filter');
  } finally {
    if (browser) await browser.close();
    try { await cleanup(); } finally { await prisma.$disconnect(); }
  }
}

main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
