// Browser smoke for the current Client, CRM and Admin Server portals.
// Uses existing demo accounts and does not change application data.
require('dotenv').config();
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('../../client/node_modules/playwright');
const { ensurePortals } = require('./ensure-portals.cjs');

const prisma = new PrismaClient();
const portals = [
  {
    name: 'client', port: 5173, role: 'client',
    email: process.env.CRM_TEST_CLIENT_EMAIL || 'client1@miva.vn',
    password: process.env.CRM_TEST_PASSWORD || 'admin123',
    routes: ['/', '/products', '/cart', '/checkout', '/profile', '/orders', '/favorites', '/surveys', '/about', '/contact'],
  },
  {
    name: 'crm', port: 5174, role: 'crm',
    email: process.env.CRM_TEST_CRM_EMAIL || 'crm@miva.vn',
    password: process.env.CRM_TEST_PASSWORD || 'admin123',
    routes: ['/dashboard', '/users', '/categories', '/products', '/orders', '/vouchers', '/reviews', '/surveys', '/customer-analytics'],
  },
  {
    name: 'admin', port: 5175, role: 'admin',
    email: process.env.CRM_TEST_ADMIN_EMAIL || 'admin@miva.vn',
    password: process.env.CRM_TEST_PASSWORD || 'admin123',
    routes: ['/system/accounts', '/system/revenue', '/system/reconciliation'],
  },
];

async function main() {
  const portalsRuntime = await ensurePortals();
  const product = await prisma.product.findFirst({ where: { status: 'active', deletedAt: null }, select: { id: true } });
  if (product) portals[0].routes.push(`/products/${product.id}`);
  const browser = await chromium.launch({ channel: process.env.MIVA_BROWSER_CHANNEL || 'msedge', headless: true });
  const results = [];
  try {
    for (const portal of portals) {
      const base = `http://localhost:${portal.port}`;
      const context = await browser.newContext();
      try {
        let login;
        for (let attempt = 0; attempt < 3; attempt++) {
          login = await context.request.post(`${base}/api/auth/sign-in`, {
            headers: { 'x-app-role': portal.role },
            data: { email: portal.email, password: portal.password },
          });
          if (login.status() !== 502) break; // Vite proxy can briefly return 502 while starting.
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        assert.equal(login.status(), 201, `${portal.name} login: HTTP ${login.status()}`);
        const page = await context.newPage();
        for (const route of portal.routes) {
          const errors = [];
          const onPageError = (error) => errors.push(`JS ${error.message}`);
          const onResponse = (response) => {
            if (new URL(response.url()).pathname.startsWith('/api/') && response.status() >= 500) {
              errors.push(`API ${response.status()} ${new URL(response.url()).pathname}`);
            }
          };
          page.on('pageerror', onPageError);
          page.on('response', onResponse);
          try {
            const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForFunction(() => {
              const main = document.querySelector('main');
              return main && main.innerText.trim().length >= 30 &&
                !document.body.innerText.includes('Đang kiểm tra phiên đăng nhập...');
            }, null, { timeout: 12000 });
            await page.waitForTimeout(700);
            const body = await page.locator('body').innerText();
            if (response.status() !== 200) errors.push(`Page HTTP ${response.status()}`);
            if (body.trim().length < 30) errors.push('Trang trống');
            const expectedPath = route === '/checkout' ? '/cart' : route; // Empty cart redirects by design.
            if (new URL(page.url()).pathname !== expectedPath) errors.push(`Điều hướng sai: ${new URL(page.url()).pathname}`);
          } catch (error) {
            errors.push(`Navigation ${error.message}`);
          } finally {
            page.off('pageerror', onPageError);
            page.off('response', onResponse);
          }
          results.push({ portal: portal.name, route, errors: [...new Set(errors)] });
        }
      } finally {
        await context.close();
      }
    }
    for (const [portal, port, route] of [
      ['client', 5173, '/login'], ['client', 5173, '/register'],
      ['crm', 5174, '/login/crm'], ['admin', 5175, '/login/admin'],
    ]) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(`JS ${error.message}`));
        const response = await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);
        if (response.status() !== 200) errors.push(`Page HTTP ${response.status()}`);
        if ((await page.locator('body').innerText()).trim().length < 30) errors.push('Trang trống');
        results.push({ portal, route, errors });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await portalsRuntime.stop();
    await prisma.$disconnect();
  }
  for (const result of results) console.log(`${result.errors.length ? 'FAIL' : 'PASS'} ${result.portal} ${result.route}${result.errors.length ? `: ${result.errors.join('; ')}` : ''}`);
  console.log(`Routes checked: ${results.length}; failed: ${results.filter((result) => result.errors.length).length}`);
  if (results.some((result) => result.errors.length)) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
