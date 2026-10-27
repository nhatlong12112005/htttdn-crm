import { createServer } from 'vite';

async function startPortalOnPort(port, label) {
  try {
    const server = await createServer({
      configFile: './vite.config.js',
      mode: port === 5175 ? 'admin' : 'crm',
      server: {
        port,
        strictPort: true,
      },
    });
    await server.listen();
    return { port, status: 'started', server };
  } catch (err) {
    if (err?.code === 'EADDRINUSE' || String(err?.message).includes('already in use')) {
      console.log(`ℹ️  Cổng ${port} (${label}) đã đang chạy sẵn.`);
      return { port, status: 'already_running', server: null };
    }
    throw err;
  }
}

async function startDualPortals() {
  // 1. Khởi chạy Cổng Người Quản lý CRM tại đúng Port 5174
  await startPortalOnPort(5174, 'Người Quản lý CRM');

  // 2. Khởi chạy Cổng Admin Server tại đúng Port 5175
  await startPortalOnPort(5175, 'Admin Server');

  console.log('\n====================================================================');
  console.log('🚀 HỆ THỐNG ĐÃ SẴN SÀNG TRÊN CÁC CỔNG LOCALHOST ĐỘC LẬP');
  console.log('====================================================================');
  console.log('🔵 [1] CỔNG NGƯỜI QUẢN LÝ CRM : http://localhost:5174/login/crm');
  console.log('       • Tài khoản            : crm@miva.vn / admin123');
  console.log('--------------------------------------------------------------------');
  console.log('🔴 [2] CỔNG ADMIN SERVER      : http://localhost:5175/login/admin');
  console.log('       • Tài khoản            : admin@miva.vn / admin123');
  console.log('====================================================================\n');
}

startDualPortals().catch((err) => {
  console.error('Lỗi khởi động dev servers:', err);
  process.exit(1);
});
