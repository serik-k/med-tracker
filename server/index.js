import { createServer } from 'http';
import { orderStore } from './store.js';
import { tenantStore } from './db/tenantStore.js';
import { PORT } from './src/config/env.js';
import { createApp } from './src/app.js';
import { setAcceptingTraffic } from './src/controllers/health.controller.js';
import { setAuthSocketIO } from './src/controllers/auth.controller.js';
import { setPlatformSocketIO } from './src/controllers/platform.controller.js';
import { setClinicSocketIO } from './src/controllers/clinic.controller.js';
import { setCrewSocketIO } from './src/controllers/crew.controller.js';
import { setOrderSocketIO } from './src/controllers/order.controller.js';
import { createSocketServer, startSocketBackgroundTasks } from './src/sockets/socketManager.js';

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);

// Wire socket reference into controllers
setAuthSocketIO(io);
setPlatformSocketIO(io);
setClinicSocketIO(io);
setCrewSocketIO(io);
setOrderSocketIO(io);

let backgroundTasks = null;
let shuttingDown = false;

async function start() {
  await orderStore.init();
  setAcceptingTraffic(true);
  backgroundTasks = startSocketBackgroundTasks(io);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(PORT, () => {
      httpServer.off('error', reject);
      console.log(`[Server] Ambulance Tracker listening on :${PORT} (${tenantStore.mode})`);
      resolve();
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  setAcceptingTraffic(false);
  console.log(`[Server] ${signal}: graceful shutdown started`);
  if (backgroundTasks) {
    clearInterval(backgroundTasks.credentialTimer);
    if (backgroundTasks.simulationTimer) clearInterval(backgroundTasks.simulationTimer);
  }
  const forceTimer = setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out');
    process.exit(1);
  }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000));
  forceTimer.unref();
  try {
    await new Promise(resolve => io.close(resolve));
    if (httpServer.listening) await new Promise(resolve => httpServer.close(resolve));
    await orderStore.close();
    await tenantStore.close();
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown failed:', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

start().catch(error => {
  console.error('[Server] Startup failed:', error);
  process.exitCode = 1;
});

export { app, httpServer, io };
