const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');

async function isBackendUpToDate(baseUrl) {
  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-role': 'admin' },
      body: JSON.stringify({
        email: process.env.CRM_TEST_ADMIN_EMAIL || 'admin@miva.vn',
        password: process.env.CRM_TEST_PASSWORD || 'admin123',
      }),
    });
    if (loginRes.status !== 201) return false;
    const payload = await loginRes.json();
    const token = payload?.data?.accessToken;
    if (!token) return false;
    const checkRes = await fetch(`${baseUrl}/api/admin/reports/analytics?period=all`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (checkRes.status !== 200) return false;
    const reportPayload = await checkRes.json();
    const summary = reportPayload?.data?.summary ?? reportPayload?.summary;
    return typeof summary?.totalRefundedAmount === 'number';
  } catch {
    return false;
  }
}

async function isPortReachable(port) {
  try {
    const res = await fetch(`http://localhost:${port}`);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function startTempBackend(port) {
  const backendDir = path.resolve(__dirname, '..');
  const child = spawn(
    process.execPath,
    ['-r', 'tsconfig-paths/register', path.join(backendDir, 'dist', 'main.js')],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(port),
        TS_NODE_BASEURL: path.join(backendDir, 'dist'),
      },
      stdio: 'ignore',
    },
  );

  const target = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    if (await isBackendUpToDate(target)) {
      return { child, target };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(`Timed out waiting for temporary backend on port ${port}`);
}

async function ensurePortals() {
  const startedServers = [];
  let backendChild = null;
  let apiTarget = 'http://localhost:3000';

  if (!(await isBackendUpToDate(apiTarget))) {
    const port3000Reachable = await isPortReachable(3000);
    const tempPort = port3000Reachable ? 3099 : 3000;
    const started = await startTempBackend(tempPort);
    backendChild = started.child;
    apiTarget = started.target;
  }

  const proxyConfig = {
    '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
    '/api': { target: apiTarget, changeOrigin: true },
    '/uploads': { target: apiTarget, changeOrigin: true },
  };

  const clientRoot = path.resolve(__dirname, '../../client');
  const adminRoot = path.resolve(__dirname, '../../admin');

  const clientViteUrl = pathToFileURL(
    path.join(clientRoot, 'node_modules/vite/dist/node/index.js'),
  ).href;
  const adminViteUrl = pathToFileURL(
    path.join(adminRoot, 'node_modules/vite/dist/node/index.js'),
  ).href;

  const startViteIfNeeded = async ({ viteUrl, root, port, mode }) => {
    if (apiTarget === 'http://localhost:3000' && (await isPortReachable(port))) {
      return;
    }
    const { createServer } = await import(viteUrl);
    const server = await createServer({
      root,
      configFile: path.join(root, 'vite.config.js'),
      mode,
      logLevel: 'silent',
      server: {
        port,
        strictPort: true,
        proxy: proxyConfig,
      },
    });
    await server.listen();
    startedServers.push(server);
  };

  await startViteIfNeeded({
    viteUrl: clientViteUrl,
    root: clientRoot,
    port: 5173,
    mode: 'development',
  });
  await startViteIfNeeded({
    viteUrl: adminViteUrl,
    root: adminRoot,
    port: 5174,
    mode: 'crm',
  });
  await startViteIfNeeded({
    viteUrl: adminViteUrl,
    root: adminRoot,
    port: 5175,
    mode: 'admin',
  });

  return {
    apiBase: `${apiTarget}/api`,
    stop: async () => {
      for (const s of startedServers) {
        try {
          await s.close();
        } catch {
          // ignore
        }
      }
      if (backendChild) {
        try {
          backendChild.kill();
        } catch {
          // ignore
        }
      }
    },
  };
}

module.exports = { ensurePortals };
