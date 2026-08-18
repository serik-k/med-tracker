import { tenantStore } from '../../db/tenantStore.js';

let isAcceptingTraffic = false;

export const setAcceptingTraffic = (value) => {
  isAcceptingTraffic = Boolean(value);
};

export const getLive = (_req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
};

export const getReady = async (_req, res) => {
  const databaseReady = isAcceptingTraffic && await tenantStore.health();
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ready' : 'not_ready', storage: tenantStore.mode });
};

export const getHealth = async (_req, res) => {
  const ready = isAcceptingTraffic && await tenantStore.health();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'degraded', storage: tenantStore.mode });
};
