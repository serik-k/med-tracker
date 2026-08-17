import crypto from 'crypto';
import express from 'express';
import { createServer } from 'http';
import fs from 'fs';
import { BlockList, isIP } from 'net';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import { orderStore, StoreError } from './store.js';
import { hashToken, tenantStore } from './db/tenantStore.js';
import { findAccessPhoto } from './services/accessPhotos.js';
import { fetchMapTile, validTileCoordinates } from './services/mapTiles.js';
import { clinicPasswordResetDecision, clinicUserDeletionDecision } from './authPolicy.js';

const configuredInteger = (name, fallback, minimum, maximum) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
};
const SOCKET_CONNECTION_LIMIT = configuredInteger('SOCKET_CONNECTION_RATE_LIMIT', 60, 1, 10_000);
const SOCKET_JOIN_LIMIT = configuredInteger('SOCKET_JOIN_RATE_LIMIT', 30, 1, 1_000);
const SOCKET_LOCATION_LIMIT = configuredInteger('SOCKET_LOCATION_RATE_LIMIT', 60, 1, 10_000);
const SOCKET_MUTATION_LIMIT = configuredInteger('SOCKET_MUTATION_RATE_LIMIT', 30, 1, 1_000);
const SOCKET_PHOTO_LIMIT = configuredInteger('SOCKET_PHOTO_RATE_LIMIT', 6, 1, 100);
const SOCKET_MAX_PAYLOAD_BYTES = configuredInteger('SOCKET_MAX_PAYLOAD_BYTES', 1_100_000, 64 * 1024, 5 * 1024 * 1024);
const LOGIN_IP_LIMIT = configuredInteger('LOGIN_IP_RATE_LIMIT', 50, 1, 10_000);
const LOGIN_FAILURE_LIMIT = configuredInteger('LOGIN_RATE_LIMIT', 10, 1, 1_000);
const ACCESS_LINK_LIMIT = configuredInteger('ACCESS_LINK_RATE_LIMIT', 30, 1, 1_000);
const PUBLIC_ACCESS_LIMIT = configuredInteger('PUBLIC_ACCESS_RATE_LIMIT', 120, 1, 10_000);
const TILE_ACCESS_LIMIT = configuredInteger('TILE_RATE_LIMIT', 300, 1, 10_000);
const PASSWORD_CHANGE_LIMIT = configuredInteger('PASSWORD_CHANGE_RATE_LIMIT', 10, 1, 100);

const app = express();
app.disable('x-powered-by');
const rawTrustProxy = String(process.env.TRUST_PROXY || '').trim();
let trustedProxyHops = 0;
let trustedProxyAddresses = null;
if (rawTrustProxy && rawTrustProxy.toLowerCase() !== 'false') {
  if (rawTrustProxy.toLowerCase() === 'true') {
    trustedProxyHops = 1;
    app.set('trust proxy', 1);
  } else if (/^\d+$/.test(rawTrustProxy) && Number(rawTrustProxy) <= 10) {
    trustedProxyHops = Number(rawTrustProxy);
    if (trustedProxyHops) app.set('trust proxy', trustedProxyHops);
  } else {
    const proxies = rawTrustProxy.split(',').map(value => value.trim()).filter(Boolean);
    const validProxy = value => {
      const separator = value.lastIndexOf('/');
      if (separator < 0) return Boolean(isIP(value));
      const address = value.slice(0, separator);
      const prefix = value.slice(separator + 1);
      const family = isIP(address);
      return Boolean(family) && /^\d+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128);
    };
    if (!proxies.length || proxies.some(value => !validProxy(value))) throw new Error('TRUST_PROXY must be false, true, a hop count from 0 to 10, or a comma-separated IP/CIDR list');
    trustedProxyAddresses = new BlockList();
    for (const proxy of proxies) {
      const separator = proxy.lastIndexOf('/');
      const address = separator < 0 ? proxy : proxy.slice(0, separator);
      const family = isIP(address) === 4 ? 'ipv4' : 'ipv6';
      if (separator < 0) trustedProxyAddresses.addAddress(address, family);
      else trustedProxyAddresses.addSubnet(address, Number(proxy.slice(separator + 1)), family);
    }
    app.set('trust proxy', proxies);
  }
}

const normalizedProxyAddress = value => {
  let address = String(value || '').trim().replace(/^"|"$/g, '');
  const bracketed = address.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketed) address = bracketed[1];
  const ipv4WithPort = address.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) address = ipv4WithPort[1];
  if (address.toLowerCase().startsWith('::ffff:') && isIP(address.slice(7)) === 4) address = address.slice(7);
  return isIP(address) ? address : '';
};
const trustedClientAddress = request => {
  const remoteAddress = normalizedProxyAddress(request.socket?.remoteAddress) || 'unknown';
  const forwarded = String(request.headers?.['x-forwarded-for'] || '').split(',')
    .map(normalizedProxyAddress).filter(Boolean).reverse();
  const chain = [remoteAddress, ...forwarded];
  if (trustedProxyAddresses) {
    let position = 0;
    while (position < chain.length - 1) {
      const current = chain[position];
      const family = isIP(current) === 4 ? 'ipv4' : isIP(current) === 6 ? 'ipv6' : null;
      if (!family || !trustedProxyAddresses.check(current, family)) break;
      position += 1;
    }
    return chain[position];
  }
  return chain[Math.min(trustedProxyHops, chain.length - 1)];
};

const parsedRateBucketLimit = Number(process.env.RATE_LIMIT_MAX_BUCKETS || 2_000);
const RATE_LIMIT_MAX_BUCKETS = Number.isSafeInteger(parsedRateBucketLimit) && parsedRateBucketLimit >= 100 && parsedRateBucketLimit <= 100_000
  ? parsedRateBucketLimit
  : 2_000;
const rememberAttemptBucket = (buckets, key, timestamps, windowMs, now = Date.now()) => {
  // Refresh insertion order so bounded eviction behaves like a small LRU.
  buckets.delete(key);
  buckets.set(key, timestamps);
  if (buckets.size <= RATE_LIMIT_MAX_BUCKETS) return;
  for (const [candidate, values] of buckets) {
    if (!values.some(timestamp => now - timestamp < windowMs)) buckets.delete(candidate);
  }
  while (buckets.size > RATE_LIMIT_MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
};

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
if (allowedOrigins.includes('*')) throw new Error('CORS_ORIGIN must list explicit origins when credentials are enabled');
const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed'));
  }
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  const suppliedRequestId = String(req.headers['x-request-id'] || '').trim();
  req.requestId = /^[A-Za-z0-9_.:-]{1,100}$/.test(suppliedRequestId) ? suppliedRequestId : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'no-cache');
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '256kb', strict: true }));

const httpServer = createServer(app);
const socketHandshakeAttempts = new Map();
const allowSocketRequest = (request, callback) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) return callback('Origin is not allowed', false);
  const key = trustedClientAddress(request);
  const now = Date.now();
  const recent = (socketHandshakeAttempts.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  if (recent.length >= SOCKET_CONNECTION_LIMIT) return callback('Connection rate limit exceeded', false);
  recent.push(now);
  rememberAttemptBucket(socketHandshakeAttempts, key, recent, 60_000, now);
  callback(null, true);
};
const io = new Server(httpServer, {
  cors: { ...corsOptions, methods: ['GET', 'POST'] },
  allowRequest: allowSocketRequest,
  // Capability-protected rooms must always be rejoined after fresh credential
  // validation. Automatic room recovery could replay PHI after an offline
  // token was revoked.
  maxHttpBufferSize: SOCKET_MAX_PAYLOAD_BYTES
});

const STAFF_ROLES = new Set(['clinic_owner', 'clinic_admin', 'dispatcher']);
const ACTIVE_STATUSES = new Set(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT']);
const CREW_STATUSES = new Set(['ON_DUTY', 'ON_CALL', 'BREAK', 'OFF_DUTY']);
const PRIORITIES = new Set(['EMERGENCY', 'URGENT', 'STANDARD']);
const ORDER_STATUSES = new Set(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT', 'COMPLETED']);
let acceptingTraffic = false;
let shuttingDown = false;

const parseCookies = header => Object.fromEntries(String(header || '').split(';').map(item => item.trim()).filter(item => item.includes('=')).map(item => {
  const separator = item.indexOf('=');
  const rawValue = item.slice(separator + 1);
  try { return [item.slice(0, separator), decodeURIComponent(rawValue)]; }
  catch { return [item.slice(0, separator), rawValue]; }
}));
const sessionToken = req => parseCookies(req.headers.cookie).medtracker_session || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const httpError = (status, code, message, details) => Object.assign(new Error(message), { status, code, details });
const createRateLimiter = ({ windowMs, max, prefix, key = req => req.ip }) => {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const attemptKey = `${prefix}:${key(req) || 'unknown'}`;
    const recent = (attempts.get(attemptKey) || []).filter(timestamp => now - timestamp < windowMs);
    if (recent.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - recent[0])) / 1000)));
      return next(httpError(429, 'RATE_LIMITED', 'Слишком много запросов. Повторите попытку позже'));
    }
    recent.push(now);
    rememberAttemptBucket(attempts, attemptKey, recent, windowMs, now);
    next();
  };
};
const socketCapabilityAttempts = new Map();
const enforceCapabilityRate = (bucket, capability, max, windowMs) => {
  const now = Date.now();
  const attemptKey = `${bucket}:${capability}`;
  const recent = (socketCapabilityAttempts.get(attemptKey) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= max) throw httpError(429, 'RATE_LIMITED', 'Слишком много realtime-изменений. Повторите попытку позже');
  recent.push(now);
  rememberAttemptBucket(socketCapabilityAttempts, attemptKey, recent, windowMs, now);
};
const assertObject = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'INVALID_PAYLOAD', 'Ожидался JSON-объект');
  return value;
};
const cleanString = (value, field, { min = 0, max = 255, required = false } = {}) => {
  const result = String(value ?? '').trim();
  if (required && result.length < Math.max(1, min)) throw httpError(400, 'VALIDATION_ERROR', `Поле «${field}» обязательно`, { field });
  if (result.length < min || result.length > max) throw httpError(400, 'VALIDATION_ERROR', `Поле «${field}» должно содержать от ${min} до ${max} символов`, { field });
  return result;
};
const cleanOptional = (value, field, max = 255, min = 0) => value === undefined ? undefined : cleanString(value, field, { max, min });
const cleanPhone = (value, field, optional = false) => {
  if (optional && value === undefined) return undefined;
  const result = cleanString(value, field, { required: true, min: 5, max: 40 });
  if (!/^[+\d\s().-]+$/.test(result) || (result.match(/\d/g) || []).length < 5) throw httpError(400, 'VALIDATION_ERROR', `Некорректный телефон в поле «${field}»`, { field });
  return result;
};
const cleanTimezone = (value, optional = false) => {
  if (optional && value === undefined) return undefined;
  const timezone = cleanString(value, 'timezone', { required: true, min: 1, max: 80 });
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
  catch { throw httpError(400, 'VALIDATION_ERROR', 'Укажите корректный часовой пояс IANA', { field: 'timezone' }); }
  return timezone;
};
const cleanId = (value, field = 'id', nullable = false) => {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  const result = cleanString(value, field, { required: true, max: 100 });
  if (!/^[\p{L}\p{N}_-]+$/u.test(result)) throw httpError(400, 'VALIDATION_ERROR', `Некорректное поле «${field}»`, { field });
  return result;
};
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const cleanHospitals = value => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 50) throw httpError(400, 'VALIDATION_ERROR', 'Список стационаров должен содержать не более 50 элементов', { field: 'hospitalOptions' });
  return value.map((item, index) => {
    assertObject(item);
    const sourceLocation = item.location && typeof item.location === 'object' ? item.location : item;
    if (sourceLocation.lat === '' || sourceLocation.lat === null || sourceLocation.lat === undefined || sourceLocation.lng === '' || sourceLocation.lng === null || sourceLocation.lng === undefined) throw httpError(400, 'VALIDATION_ERROR', `Не указаны координаты стационара №${index + 1}`, { field: `hospitalOptions.${index}.location` });
    const lat = Number(sourceLocation.lat);
    const lng = Number(sourceLocation.lng);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) throw httpError(400, 'VALIDATION_ERROR', `Некорректные координаты стационара №${index + 1}`, { field: `hospitalOptions.${index}.location` });
    return {
      id: item.id ? cleanId(item.id, `hospitalOptions.${index}.id`) : `hospital_${crypto.randomUUID()}`,
      name: cleanString(item.name, `hospitalOptions.${index}.name`, { required: true, min: 2, max: 160 }),
      address: cleanOptional(item.address, `hospitalOptions.${index}.address`, 300) || '',
      lat, lng, location: { lat, lng }
    };
  });
};
const patientRoom = orderId => `order_${orderId}`;
const dispatcherRoom = clinicId => `dispatchers_${clinicId}`;
const crewRoom = (clinicId, crewId) => `crew_${clinicId}_${crewId}`;
const publicCreatedOrder = order => {
  const { patientAccessToken, patientAccessPath, ...safe } = order;
  return safe;
};
const broadcastClinicSettings = async clinic => {
  try {
    io.to(dispatcherRoom(clinic.id)).emit('clinic_settings_updated', clinic);
    const activeOrders = await orderStore.getAllActiveOrders(clinic.id);
    for (const order of activeOrders) io.to(patientRoom(order.token)).emit('order_data', order);
  } catch (error) {
    console.warn('[Realtime] Could not broadcast clinic settings:', error.message);
  }
};
const broadcastCrews = async clinicId => {
  try {
    io.to(dispatcherRoom(clinicId)).emit('all_crews', await orderStore.getAllCrews(clinicId));
  } catch (error) {
    console.warn('[Realtime] Could not refresh crews:', error.message);
  }
};

const requireAuth = asyncRoute(async (req, res, next) => {
  const user = await tenantStore.authenticate(sessionToken(req));
  if (!user) throw httpError(401, 'AUTH_REQUIRED', 'Требуется вход в систему');
  req.user = user;
  next();
});
const allowRoles = (...roles) => (req, _res, next) => roles.includes(req.user.role) ? next() : next(httpError(403, 'FORBIDDEN', 'Недостаточно прав'));
const requireClinic = (req, _res, next) => req.user.clinicId ? next() : next(httpError(403, 'CLINIC_REQUIRED', 'Для операции требуется клиника'));
const loginIpRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: LOGIN_IP_LIMIT, prefix: 'login' });
const accessLinkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: ACCESS_LINK_LIMIT, prefix: 'link', key: req => req.user?.id || req.ip });
const publicAccessRateLimit = createRateLimiter({ windowMs: 5 * 60 * 1000, max: PUBLIC_ACCESS_LIMIT, prefix: 'public' });
const tileAccessRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: TILE_ACCESS_LIMIT, prefix: 'tile' });
const passwordChangeRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: PASSWORD_CHANGE_LIMIT, prefix: 'password-change', key: req => req.user?.id || req.ip });

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = LOGIN_FAILURE_LIMIT;

app.get('/health/live', (_req, res) => res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) }));
app.get('/health/ready', asyncRoute(async (_req, res) => {
  const databaseReady = acceptingTraffic && await tenantStore.health();
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ready' : 'not_ready', storage: tenantStore.mode });
}));
app.get('/health', asyncRoute(async (_req, res) => {
  const ready = acceptingTraffic && await tenantStore.health();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'degraded', storage: tenantStore.mode });
}));

app.post('/api/auth/login', loginIpRateLimit, asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const email = cleanString(body.email, 'email', { required: true, max: 254 }).toLowerCase();
  const password = cleanString(body.password, 'password', { required: true, max: 256 });
  if (!validEmail(email)) throw httpError(400, 'VALIDATION_ERROR', 'Некорректный email', { field: 'email' });
  const attemptKey = `${req.ip}:${email}`;
  const recent = (loginAttempts.get(attemptKey) || []).filter(timestamp => Date.now() - timestamp < LOGIN_WINDOW_MS);
  if (recent.length >= LOGIN_LIMIT) throw httpError(429, 'LOGIN_RATE_LIMITED', 'Слишком много попыток. Повторите вход через 15 минут');
  const result = await tenantStore.login(email, password);
  if (!result) {
    const now = Date.now();
    recent.push(now);
    rememberAttemptBucket(loginAttempts, attemptKey, recent, LOGIN_WINDOW_MS, now);
    throw httpError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
  }
  loginAttempts.delete(attemptKey);
  res.cookie('medtracker_session', result.token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    maxAge: Number(process.env.SESSION_TTL_HOURS || 24) * 60 * 60 * 1000, path: '/'
  });
  res.json({ user: result.user });
}));

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));
app.post('/api/auth/change-password', requireAuth, passwordChangeRateLimit, asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const currentPassword = cleanString(body.currentPassword, 'currentPassword', { required: true, max: 256 });
  const newPassword = cleanString(body.newPassword, 'newPassword', { required: true, min: 10, max: 256 });
  if (currentPassword === newPassword) throw httpError(400, 'PASSWORD_UNCHANGED', 'Новый пароль должен отличаться от текущего');
  const changed = await tenantStore.changeOwnPassword(req.user.id, currentPassword, newPassword);
  if (!changed) throw httpError(400, 'PASSWORD_CHANGE_FAILED', 'Не удалось сменить пароль. Проверьте текущий пароль');
  res.clearCookie('medtracker_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.staffUserId === req.user.id) revokeSocket(socket, 'staff', 'PASSWORD_CHANGED');
  }
  res.status(204).end();
}));
app.post('/api/auth/logout', asyncRoute(async (req, res) => {
  const raw = sessionToken(req);
  // Clearing the browser credential must not depend on the session still
  // being valid (or on storage being healthy). If revocation fails, the error
  // response still carries Set-Cookie and the client is safely logged out.
  res.clearCookie('medtracker_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  await tenantStore.logout(raw);
  if (raw) {
    const digest = hashToken(raw);
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.staffSessionHash === digest) revokeSocket(socket, 'staff', 'LOGOUT');
    }
  }
  res.status(204).end();
}));

app.get('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), asyncRoute(async (_req, res) => res.json(await tenantStore.getClinics())));
app.post('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    legalName: cleanString(body.legalName, 'legalName', { required: true, min: 2, max: 200 }),
    bin: cleanString(body.bin, 'bin', { required: true, min: 12, max: 12 }),
    city: cleanString(body.city, 'city', { required: true, min: 2, max: 100 }),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone'),
    ownerName: cleanString(body.ownerName, 'ownerName', { required: true, min: 2, max: 120 }),
    ownerEmail: cleanString(body.ownerEmail, 'ownerEmail', { required: true, max: 254 }).toLowerCase(),
    ownerPassword: cleanString(body.ownerPassword, 'ownerPassword', { required: true, min: 10, max: 256 }),
    timezone: body.timezone === undefined ? undefined : cleanTimezone(body.timezone), plan: body.plan || 'START'
  };
  if (!/^\d{12}$/.test(payload.bin)) throw httpError(400, 'VALIDATION_ERROR', 'БИН должен содержать 12 цифр', { field: 'bin' });
  if (!validEmail(payload.ownerEmail)) throw httpError(400, 'VALIDATION_ERROR', 'Некорректный email владельца', { field: 'ownerEmail' });
  if (!['START', 'PRO', 'ENTERPRISE'].includes(payload.plan)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый тариф', { field: 'plan' });
  if (await tenantStore.binExists(payload.bin)) throw httpError(409, 'BIN_EXISTS', 'Клиника с таким БИН уже существует');
  if (await tenantStore.emailExists(payload.ownerEmail)) throw httpError(409, 'EMAIL_EXISTS', 'Пользователь с таким email уже существует');
  res.status(201).json(await tenantStore.createClinic(payload));
}));

app.patch('/api/platform/clinics/:id', requireAuth, allowRoles('platform_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanOptional(body.name, 'name', 120, 2), legalName: cleanOptional(body.legalName, 'legalName', 200, 2),
    city: cleanOptional(body.city, 'city', 100, 2), timezone: cleanTimezone(body.timezone, true),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone', true), hospitalOptions: cleanHospitals(body.hospitalOptions ?? body.clinicHospitals), plan: body.plan, status: body.status
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  if (payload.plan && !['START', 'PRO', 'ENTERPRISE'].includes(payload.plan)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый тариф', { field: 'plan' });
  if (payload.status && !['TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус', { field: 'status' });
  const clinic = await tenantStore.updateClinic(cleanId(req.params.id), payload);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  await broadcastClinicSettings(clinic);
  if (payload.status && payload.status !== 'ACTIVE') {
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.staffClinicId === clinic.id) revokeSocket(socket, 'staff', `CLINIC_${payload.status}`);
      else if (socket.data.driverClinicId === clinic.id) revokeSocket(socket, 'driver', `CLINIC_${payload.status}`);
      else if (socket.data.patientClinicId === clinic.id) revokeSocket(socket, socket.data.patientAccessScope || 'patient', `CLINIC_${payload.status}`);
    }
  }
  res.json(clinic);
}));

app.get('/api/clinic/settings', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const clinic = await tenantStore.getClinic(req.user.clinicId);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  res.json(clinic);
}));

app.patch('/api/clinic/settings', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanOptional(body.name, 'name', 120, 2), legalName: cleanOptional(body.legalName, 'legalName', 200, 2),
    city: cleanOptional(body.city, 'city', 100, 2), timezone: cleanTimezone(body.timezone, true),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone', true),
    hospitalOptions: cleanHospitals(body.hospitalOptions ?? body.clinicHospitals)
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  const clinic = await tenantStore.updateClinic(req.user.clinicId, payload);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  await broadcastClinicSettings(clinic);
  res.json(clinic);
}));

app.get('/api/clinic/users', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => res.json(await tenantStore.getClinicUsers(req.user.clinicId))));
app.post('/api/clinic/users', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    email: cleanString(body.email, 'email', { required: true, max: 254 }).toLowerCase(),
    password: cleanString(body.password, 'password', { required: true, min: 10, max: 256 }),
    role: cleanString(body.role, 'role', { required: true, max: 30 })
  };
  if (!validEmail(payload.email)) throw httpError(400, 'VALIDATION_ERROR', 'Некорректный email', { field: 'email' });
  if (!['dispatcher', 'clinic_admin'].includes(payload.role)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимая роль', { field: 'role' });
  if (await tenantStore.emailExists(payload.email)) throw httpError(409, 'EMAIL_EXISTS', 'Пользователь с таким email уже существует');
  res.status(201).json(await tenantStore.createClinicUser(req.user.clinicId, payload));
}));

app.patch('/api/clinic/users/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const targetId = cleanId(req.params.id);
  if (targetId === req.user.id && req.body?.status && req.body.status !== 'ACTIVE') throw httpError(409, 'CANNOT_DISABLE_SELF', 'Нельзя отключить собственную учётную запись');
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  if (target.role === 'clinic_owner') throw httpError(403, 'OWNER_PROTECTED', 'Учётная запись владельца защищена');
  const body = assertObject(req.body);
  const payload = { role: body.role, status: body.status, name: cleanOptional(body.name, 'name', 120, 2) };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  if (payload.role && !['dispatcher', 'clinic_admin'].includes(payload.role)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимая роль', { field: 'role' });
  if (payload.status && !['INVITED', 'ACTIVE', 'DISABLED'].includes(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус', { field: 'status' });
  if (payload.role === target.role) delete payload.role;
  const shouldRevokeCredentials = payload.role !== undefined || (payload.status !== undefined && payload.status !== 'ACTIVE');
  const updated = await tenantStore.updateClinicUser(req.user.clinicId, targetId, payload);
  if (shouldRevokeCredentials) {
    const reason = payload.role !== undefined ? 'ROLE_CHANGED' : `USER_${payload.status}`;
    for (const socket of io.sockets.sockets.values()) if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', reason);
  }
  res.json(updated);
}));

app.delete('/api/clinic/users/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const targetId = cleanId(req.params.id);
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  const decision = clinicUserDeletionDecision(req.user, target);
  if (!decision.allowed) {
    const message = decision.code === 'CANNOT_DELETE_SELF'
      ? 'Нельзя удалить собственную учётную запись'
      : 'Учётная запись владельца защищена';
    throw httpError(decision.status, decision.code, message);
  }
  if (!await tenantStore.deleteClinicUser(req.user.clinicId, targetId)) {
    throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  }
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', 'USER_DELETED');
  }
  res.status(204).end();
}));

app.post('/api/clinic/users/:id/reset-password', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const targetId = cleanId(req.params.id);
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  const resetDecision = clinicPasswordResetDecision(req.user, target);
  if (!resetDecision.allowed) {
    const message = resetDecision.code === 'USE_SELF_PASSWORD_CHANGE'
      ? 'Для смены собственного пароля укажите текущий пароль'
      : 'Учётная запись владельца защищена';
    throw httpError(resetDecision.status, resetDecision.code, message);
  }
  const password = cleanString(assertObject(req.body).password, 'password', { required: true, min: 10, max: 256 });
  await tenantStore.resetClinicUserPassword(req.user.clinicId, targetId, password);
  for (const socket of io.sockets.sockets.values()) if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', 'PASSWORD_RESET');
  res.status(204).end();
}));

app.get('/api/crews', requireAuth, requireClinic, asyncRoute(async (req, res) => res.json(await orderStore.getAllCrews(req.user.clinicId))));
app.post('/api/crews', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    carPlate: cleanString(body.carPlate, 'carPlate', { required: true, min: 3, max: 30 }),
    type: cleanString(body.type, 'type', { required: true, min: 2, max: 80 }),
    driverName: cleanString(body.driverName, 'driverName', { required: true, min: 2, max: 120 }),
    status: body.status || 'ON_DUTY'
  };
  if (!CREW_STATUSES.has(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус бригады', { field: 'status' });
  if (payload.status === 'ON_CALL') throw httpError(409, 'SYSTEM_MANAGED_STATUS', 'Статус «На вызове» назначается системой при выдаче вызова');
  const crews = await orderStore.getAllCrews(req.user.clinicId);
  if (crews.some(crew => crew.carPlate.toLowerCase() === payload.carPlate.toLowerCase())) throw httpError(409, 'CAR_PLATE_EXISTS', 'Автомобиль с таким госномером уже зарегистрирован');
  const created = await orderStore.addCrew(req.user.clinicId, payload);
  io.to(dispatcherRoom(req.user.clinicId)).emit('crew_added', created.crew);
  res.status(201).json(created.crew);
}));

app.put('/api/crews/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const crewId = cleanId(req.params.id);
  const existing = await tenantStore.getCrew(req.user.clinicId, crewId);
  if (!existing) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  const payload = {};
  for (const [field, limits] of Object.entries({ name: [2, 120], carPlate: [3, 30], type: [2, 80], driverName: [2, 120] })) {
    if (body[field] !== undefined) payload[field] = cleanString(body[field], field, { required: true, min: limits[0], max: limits[1] });
  }
  if (body.status !== undefined) {
    if (!CREW_STATUSES.has(body.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус бригады', { field: 'status' });
    if (body.status !== existing.status) {
      if (body.status === 'ON_CALL') throw httpError(409, 'SYSTEM_MANAGED_STATUS', 'Статус «На вызове» назначается системой при выдаче вызова');
      payload.status = body.status;
    }
  }
  const updated = await orderStore.updateCrew(req.user.clinicId, crewId, payload);
  if (!updated) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  io.to(dispatcherRoom(req.user.clinicId)).emit('crew_updated', updated);
  res.json(updated);
}));

app.delete('/api/crews/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(async (req, res) => {
  const crewId = cleanId(req.params.id);
  if (await orderStore.hasActiveAssignment(req.user.clinicId, crewId)) throw httpError(409, 'CREW_BUSY', 'Нельзя удалить бригаду с активным вызовом');
  if (!await orderStore.deleteCrew(req.user.clinicId, crewId)) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId === req.user.clinicId && socket.data.driverCrewId === crewId) revokeSocket(socket, 'driver', 'CREW_ARCHIVED');
  }
  io.to(dispatcherRoom(req.user.clinicId)).emit('crew_deleted', crewId);
  res.status(204).end();
}));

app.post('/api/crews/:id/access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(async (req, res) => {
  const result = await tenantStore.rotateCrewAccess(req.user.clinicId, cleanId(req.params.id));
  if (!result) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId === req.user.clinicId && socket.data.driverCrewId === req.params.id) revokeSocket(socket, 'driver', 'DRIVER_LINK_ROTATED');
  }
  res.json({ token: result.token, path: `/driver-access#${result.token}`, expiresAt: result.expiresAt });
}));

app.get('/api/orders', requireAuth, requireClinic, asyncRoute(async (req, res) => res.json(await orderStore.getAllActiveOrders(req.user.clinicId))));
app.post('/api/orders', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  if (body.carNumber && body.crewId === undefined) throw httpError(400, 'CREW_ID_REQUIRED', 'Передавайте явный crewId вместо отображаемого названия бригады', { field: 'crewId' });
  const payload = {
    patientName: cleanString(body.patientName, 'patientName', { required: true, min: 2, max: 120 }),
    patientPhone: cleanPhone(body.patientPhone, 'patientPhone'),
    address: cleanString(body.address, 'address', { required: true, min: 5, max: 300 }),
    priority: body.priority || 'EMERGENCY', crewId: cleanId(body.crewId, 'crewId', true), lat: body.lat, lng: body.lng,
    idempotencyKey: req.headers['idempotency-key'] ? cleanString(req.headers['idempotency-key'], 'Idempotency-Key', { min: 8, max: 100 }) : null
  };
  if (!PRIORITIES.has(payload.priority)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый приоритет', { field: 'priority' });
  const created = await orderStore.createOrder(req.user.clinicId, payload, req.user.id);
  const safeOrder = publicCreatedOrder(created);
  if (!created.idempotentReplay) {
    io.to(dispatcherRoom(req.user.clinicId)).emit('order_created', safeOrder);
    if (safeOrder.crewId) attachCrewSockets(req.user.clinicId, safeOrder.crewId, safeOrder);
    if (safeOrder.crewId) await broadcastCrews(req.user.clinicId);
  }
  res.status(created.idempotentReplay ? 200 : 201).json(created);
}));

async function assignOrder(req, res) {
  const body = assertObject(req.body);
  const crewId = cleanId(body.crewId, 'crewId', true);
  const result = await orderStore.assignOrder(req.user.clinicId, cleanId(req.params.token), crewId, req.user.id);
  const payload = { token: result.order.token, crewId: result.order.crewId, assignedCrew: result.order.assignedCrew, carNumber: result.order.carNumber, order: result.order, updatedAt: result.order.updatedAt };
  if (result.previousCrewId && result.previousCrewId !== result.order.crewId) detachCrewSockets(req.user.clinicId, result.previousCrewId, result.order.token, result.order.crewId ? 'REASSIGNED' : 'UNASSIGNED');
  if (result.order.crewId) attachCrewSockets(req.user.clinicId, result.order.crewId, result.order);
  io.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('assignment_updated', payload);
  await broadcastCrews(req.user.clinicId);
  res.json(result.order);
}
app.patch('/api/orders/:token/assignment', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(assignOrder));
app.post('/api/orders/:token/assign', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(assignOrder));

app.post('/api/orders/:token/cancel', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(async (req, res) => {
  const reason = cleanOptional(assertObject(req.body || {}).reason, 'reason', 500) || '';
  const result = await orderStore.cancelOrder(req.user.clinicId, cleanId(req.params.token), reason, req.user.id);
  const payload = { token: result.order.token, status: result.order.status, cancelledAt: result.order.cancelledAt, cancelReason: result.order.cancelReason, expired: true, updatedAt: result.order.updatedAt };
  io.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('status_updated', payload);
  io.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('order_cancelled', { order: result.order, token: result.order.token });
  if (result.previousCrewId) detachCrewSockets(req.user.clinicId, result.previousCrewId, result.order.token, 'CANCELLED');
  if (result.previousCrewId) await broadcastCrews(req.user.clinicId);
  setTimeout(() => disconnectPatientSockets(result.order.token, null, 'ORDER_CANCELLED'), 100).unref();
  res.json(result.order);
}));

app.post('/api/orders/:token/patient-access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(async (req, res) => {
  const orderId = cleanId(req.params.token);
  const result = await orderStore.rotatePatientAccess(req.user.clinicId, orderId, req.user.id);
  if (!result) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
  disconnectPatientSockets(orderId, 'patient', 'PATIENT_LINK_ROTATED');
  res.json(result);
}));

app.post('/api/orders/:token/viewer-access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(async (req, res) => {
  const orderId = cleanId(req.params.token);
  const result = await orderStore.rotateViewerAccess(req.user.clinicId, orderId, req.user.id);
  if (!result) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
  disconnectPatientSockets(orderId, 'viewer', 'VIEWER_LINK_ROTATED');
  res.json(result);
}));



const respondWithDriverOrder = async (rawToken, res) => {
  const crew = await tenantStore.findCrewByAccessToken(cleanString(rawToken, 'token', { required: true, max: 200 }));
  if (!crew) throw httpError(404, 'DRIVER_LINK_INVALID', 'Ссылка бригады недействительна или истекла');
  const order = (await orderStore.getAllActiveOrders(crew.clinicId)).find(item => item.crewId === crew.id);
  if (!order) return res.status(204).end();
  return res.json(order);
};
app.post('/api/public/driver-access', publicAccessRateLimit, asyncRoute(async (req, res) => {
  await respondWithDriverOrder(assertObject(req.body).token, res);
}));
// Temporary compatibility endpoint. New links keep the secret in the URL
// fragment and exchange it through the POST body above so proxies do not log it.
app.get('/api/driver-access/:accessToken/active-order', publicAccessRateLimit, asyncRoute(async (req, res) => {
  res.setHeader('Deprecation', 'true');
  await respondWithDriverOrder(req.params.accessToken, res);
}));

const cleanPhotoToken = value => {
  const photoToken = cleanString(value, 'photoToken', { required: true, min: 32, max: 80 });
  if (!/^[A-Za-z0-9_-]+$/.test(photoToken)) throw httpError(400, 'INVALID_PHOTO_TOKEN', 'Некорректный идентификатор фото');
  return photoToken;
};
const sendAccessPhoto = async (photoToken, clinicId, res) => {
  const storage = tenantStore.mode === 'postgres' ? { pool: tenantStore.pool, clinicId } : {};
  const photo = await findAccessPhoto(photoToken, storage);
  if (!photo) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  res.type(photo.mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  return photo.data ? res.send(photo.data) : res.sendFile(photo.filePath);
};

app.post('/api/access-photo', requireAuth, requireClinic, publicAccessRateLimit, asyncRoute(async (req, res) => {
  const photoToken = cleanPhotoToken(assertObject(req.body).photoToken);
  const url = `/api/access-photos/${photoToken}`;
  const order = await orderStore.getOrderByPhotoUrl(url);
  if (!order) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  if (order.clinicId !== req.user.clinicId) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  if (order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PHOTO_EXPIRED', 'Доступ к фото завершён');
  await sendAccessPhoto(photoToken, order.clinicId, res);
}));

app.post('/api/public/access-photo', publicAccessRateLimit, asyncRoute(async (req, res) => {
  const body = assertObject(req.body);
  const photoToken = cleanPhotoToken(body.photoToken);
  const accessToken = cleanString(body.accessToken, 'accessToken', { required: true, max: 200 });
  const expectedPhotoUrl = `/api/access-photos/${photoToken}`;
  let authorizedOrder = await orderStore.getPatientOrder(accessToken);
  if (authorizedOrder && (authorizedOrder.expired || authorizedOrder.clinicStatus !== 'ACTIVE' || !ACTIVE_STATUSES.has(authorizedOrder.status))) authorizedOrder = null;
  if (!authorizedOrder) {
    const crew = await tenantStore.findCrewByAccessToken(accessToken);
    if (crew) authorizedOrder = (await orderStore.getAllActiveOrders(crew.clinicId)).find(order => order.crewId === crew.id) || null;
  }
  if (!authorizedOrder || authorizedOrder.accessInfo?.photoUrl !== expectedPhotoUrl) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено или ссылка доступа недействительна');
  await sendAccessPhoto(photoToken, authorizedOrder.clinicId, res);
}));

// The former GET endpoint exposed a standalone bearer capability in URLs and
// could not be revoked by rotating patient/driver credentials. Keep an explicit
// tombstone so stale clients fail closed and never receive protected bytes.
app.get('/api/access-photos/:token', publicAccessRateLimit, asyncRoute(async (_req, res) => {
  res.setHeader('Deprecation', 'true');
  throw httpError(410, 'PHOTO_GET_RETIRED', 'Используйте защищённый POST-запрос для загрузки фото');
}));

app.get('/api/map-tiles/:z/:x/:y.png', tileAccessRateLimit, asyncRoute(async (req, res) => {
  const values = [req.params.z, req.params.x, req.params.y];
  if (values.some(value => !/^\d{1,7}$/.test(String(value)))) throw httpError(400, 'INVALID_TILE', 'Некорректные координаты тайла');
  const [z, x, y] = values.map(Number);
  if (!validTileCoordinates(z, x, y)) throw httpError(400, 'INVALID_TILE', 'Некорректные координаты тайла');
  const tile = await fetchMapTile(z, x, y);
  res.setHeader('Content-Type', tile.contentType);
  res.setHeader('Content-Length', String(tile.body.length));
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // Tile coordinates at high zoom reveal the call area. Keep caching strictly
  // inside this process; browsers and shared proxies must not retain them.
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(tile.body);
}));

const respondWithPatientOrder = async (rawTokenValue, res) => {
  const rawToken = cleanString(rawTokenValue, 'token', { required: true, max: 200 });
  const order = await orderStore.getPatientOrder(rawToken);
  if (!order) throw httpError(404, 'PATIENT_LINK_INVALID', 'Ссылка недействительна или вызов не найден');
  if (order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка истекла или вызов завершён');
  return res.json(order);
};
app.post('/api/public/order-access', publicAccessRateLimit, asyncRoute(async (req, res) => {
  await respondWithPatientOrder(assertObject(req.body).token, res);
}));
app.get('/api/orders/:token', publicAccessRateLimit, asyncRoute(async (req, res) => {
  res.setHeader('Deprecation', 'true');
  await respondWithPatientOrder(req.params.token, res);
}));

function revokeSocket(socket, scope, reason) {
  const payload = { scope, reason, revokedAt: new Date().toISOString() };
  socket.emit('access_revoked', payload);
  if (scope === 'staff') socket.emit('session_revoked', payload);
  socket.disconnect(true);
}

function disconnectPatientSockets(orderId, scope = null, reason = 'ACCESS_REVOKED') {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.patientOrderId === orderId && (!scope || socket.data.patientAccessScope === scope)) {
      revokeSocket(socket, socket.data.patientAccessScope || 'patient', reason);
    }
  }
}

function attachCrewSockets(clinicId, crewId, order) {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId !== clinicId || socket.data.driverCrewId !== String(crewId)) continue;
    socket.join(crewRoom(clinicId, crewId));
    socket.join(patientRoom(order.token));
    socket.emit('crew_order', order);
  }
}

function detachCrewSockets(clinicId, crewId, orderId, reason) {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId !== clinicId || socket.data.driverCrewId !== String(crewId)) continue;
    socket.leave(patientRoom(orderId));
    socket.emit('crew_order_cleared', { token: orderId, reason });
  }
}

const socketError = error => ({
  ok: false,
  error: {
    code: error.code || (error instanceof StoreError ? error.code : 'INTERNAL_ERROR'),
    message: error.status >= 500 || (!error.status && !(error instanceof StoreError)) ? 'Внутренняя ошибка сервера' : error.message
  }
});
const socketOk = payload => ({ ok: true, ...(payload || {}) });

io.on('connection', socket => {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const staffSession = cookies.medtracker_session || '';
  const driverToken = cleanHandshakeToken(socket.handshake.auth?.driverToken);
  const patientSecret = cleanHandshakeToken(socket.handshake.auth?.patientToken);
  socket.data.staffSession = staffSession || socket.data.staffSession || '';
  socket.data.staffSessionHash = socket.data.staffSession ? hashToken(socket.data.staffSession) : null;
  socket.data.driverToken = driverToken || socket.data.driverToken || '';
  socket.data.patientSecret = patientSecret || socket.data.patientSecret || '';
  socket.data.activeAuthScopes ||= {};

  const enforceSocketRate = (bucket, max, windowMs) => {
    const now = Date.now();
    socket.data.rateBuckets ||= {};
    const recent = (socket.data.rateBuckets[bucket] || []).filter(timestamp => now - timestamp < windowMs);
    if (recent.length >= max) throw httpError(429, 'RATE_LIMITED', 'Слишком много realtime-запросов');
    recent.push(now);
    socket.data.rateBuckets[bucket] = recent;
  };

  const on = (event, handler) => socket.on(event, async (...args) => {
    const possibleAck = args.at(-1);
    const ack = typeof possibleAck === 'function' ? possibleAck : () => {};
    const payload = (typeof possibleAck === 'function' ? args.slice(0, -1) : args)[0];
    try {
      const response = await handler(payload);
      ack(socketOk(response));
    } catch (error) {
      console.warn(`[Socket:${event}]`, error.code || error.message);
      const response = socketError(error);
      ack(response);
      socket.emit('operation_error', { event, ...response.error });
    }
  });

  const staff = async () => {
    const user = await tenantStore.authenticate(staffSession);
    if (!user || !user.clinicId || !STAFF_ROLES.has(user.role)) throw httpError(401, 'AUTH_REQUIRED', 'Сессия сотрудника недействительна');
    socket.data.staffUserId = user.id;
    socket.data.staffClinicId = user.clinicId;
    socket.data.activeAuthScopes.staff = true;
    return user;
  };
  const driver = async () => {
    const crew = await tenantStore.findCrewByAccessToken(driverToken);
    if (!crew) throw httpError(401, 'DRIVER_LINK_INVALID', 'Ссылка бригады недействительна или истекла');
    socket.data.driverClinicId = crew.clinicId;
    socket.data.driverCrewId = crew.id;
    socket.data.activeAuthScopes.driver = true;
    return crew;
  };
  const patient = async reference => {
    if (!patientSecret || socket.data.patientOrderId !== String(reference || '')) throw httpError(403, 'PATIENT_ACCESS_DENIED', 'Нет доступа к вызову');
    const order = await orderStore.getPatientOrder(patientSecret);
    if (!order || order.clinicStatus !== 'ACTIVE' || order.token !== socket.data.patientOrderId || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка пациента истекла');
    if (order.patientAccessScope !== 'patient') throw httpError(403, 'VIEWER_READ_ONLY', 'Ссылка родственника доступна только для просмотра');
    socket.data.activeAuthScopes.patient = true;
    return order;
  };

  on('join_dispatcher', async () => {
    enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
    const user = await staff();
    socket.join(dispatcherRoom(user.clinicId));
    const [orders, crews] = await Promise.all([orderStore.getAllDispatcherOrders(user.clinicId), orderStore.getAllCrews(user.clinicId)]);
    socket.emit('all_orders', orders);
    socket.emit('all_crews', crews);
    return { orders, crews };
  });

  on('join_crew', async () => {
    enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
    const crew = await driver();
    socket.join(crewRoom(crew.clinicId, crew.id));
    const order = (await orderStore.getAllActiveOrders(crew.clinicId)).find(item => item.crewId === crew.id) || null;
    if (order) {
      socket.join(patientRoom(order.token));
      socket.emit('crew_order', order);
    }
    return { crew, order };
  });

  on('join_order', async payload => {
    enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
    const reference = typeof payload === 'string' ? payload : payload?.token;
    if (!reference || typeof reference !== 'string' || reference.length > 200) throw httpError(400, 'INVALID_PAYLOAD', 'Некорректный идентификатор вызова');
    let order = null;

    if (patientSecret) {
      const patientOrder = await orderStore.getPatientOrder(patientSecret);
      if (!patientOrder) throw httpError(404, 'PATIENT_LINK_INVALID', 'Ссылка пациента недействительна');
      if (patientOrder.clinicStatus !== 'ACTIVE' || patientOrder.expired || !ACTIVE_STATUSES.has(patientOrder.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка пациента истекла');
      if (reference !== patientSecret && reference !== patientOrder.token) throw httpError(403, 'PATIENT_ACCESS_DENIED', 'Нет доступа к вызову');
      order = patientOrder;
      socket.data.patientOrderId = order.token;
      socket.data.patientClinicId = order.clinicId;
      socket.data.patientAccessScope = order.patientAccessScope || 'patient';
      socket.data.activeAuthScopes.patient = true;
    } else if (driverToken) {
      const crew = await driver();
      order = await orderStore.getOrderByRef(reference, crew.clinicId);
      if (!order || order.crewId !== crew.id || !ACTIVE_STATUSES.has(order.status)) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
    } else {
      const user = await staff();
      order = await orderStore.getOrderByRef(reference, user.clinicId);
      if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
    }
    socket.join(patientRoom(order.token));
    socket.emit('order_data', order);
    return { order };
  });

  on('update_location', async payload => {
    enforceSocketRate('location', SOCKET_LOCATION_LIMIT, 60_000);
    const body = assertObject(payload);
    const crew = await driver();
    enforceCapabilityRate('driver-location', hashToken(socket.data.driverToken), SOCKET_LOCATION_LIMIT, 60_000);
    const reference = cleanId(body.token, 'token');
    const order = await orderStore.getOrderByRef(reference, crew.clinicId);
    if (!order || order.crewId !== crew.id) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
    const updated = await orderStore.updateLocation(crew.clinicId, reference, crew.id, body.lat, body.lng);
    if (!updated) throw httpError(409, 'ORDER_NOT_ACTIVE', 'Вызов больше не активен');
    const event = { token: updated.token, currentLoc: updated.currentLoc, locationUpdatedAt: updated.locationUpdatedAt, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, etaUpdatedAt: updated.etaUpdatedAt, updatedAt: updated.updatedAt };
    io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('location_updated', event);
    return { order: updated, ...event };
  });

  on('update_status', async payload => {
    enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
    const body = assertObject(payload);
    const crew = await driver();
    enforceCapabilityRate('driver-mutation', hashToken(socket.data.driverToken), SOCKET_MUTATION_LIMIT, 60_000);
    const reference = cleanId(body.token, 'token');
    if (!ORDER_STATUSES.has(body.status)) throw httpError(400, 'INVALID_STATUS', 'Недопустимый статус');
    const current = await orderStore.getOrderByRef(reference, crew.clinicId);
    if (!current || current.crewId !== crew.id) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
    const updated = await orderStore.updateOrderStatus(crew.clinicId, reference, body.status, body.hospitalName, body.hospitalLocation, { crewId: crew.id });
    if (!updated) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
    const event = { token: updated.token, status: updated.status, hospitalName: updated.hospitalName, hospitalLocation: updated.hospitalLocation, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, auditLogs: updated.auditLogs, expired: updated.expired, completedAt: updated.completedAt, updatedAt: updated.updatedAt };
    io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('status_updated', event);
    if (updated.status === 'COMPLETED') {
      detachCrewSockets(updated.clinicId, crew.id, updated.token, 'COMPLETED');
      await broadcastCrews(updated.clinicId);
      setTimeout(() => disconnectPatientSockets(updated.token, null, 'ORDER_COMPLETED'), 100).unref();
    }
    return { order: updated, ...event };
  });



  on('update_access', async payload => {
    enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
    const body = assertObject(payload);
    const reference = cleanId(body.token, 'token');
    const current = await patient(reference);
    enforceCapabilityRate('patient-mutation', hashToken(socket.data.patientSecret), SOCKET_MUTATION_LIMIT, 60_000);
    if (typeof body.accessInfo?.photoUrl === 'string' && body.accessInfo.photoUrl.startsWith('data:')) {
      enforceSocketRate('photo', SOCKET_PHOTO_LIMIT, 5 * 60_000);
      enforceCapabilityRate('patient-photo', hashToken(socket.data.patientSecret), SOCKET_PHOTO_LIMIT, 5 * 60_000);
    }
    const updated = await orderStore.updateAccessInfo(current.token, assertObject(body.accessInfo), socket.data.patientSecret);
    const event = { token: updated.token, accessInfo: updated.accessInfo, auditLogs: updated.auditLogs, updatedAt: updated.updatedAt };
    io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('access_updated', event);
    return { order: updated, ...event };
  });

  on('update_symptoms', async payload => {
    enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
    const body = assertObject(payload);
    const reference = cleanId(body.token, 'token');
    const current = await patient(reference);
    enforceCapabilityRate('patient-mutation', hashToken(socket.data.patientSecret), SOCKET_MUTATION_LIMIT, 60_000);
    const updated = await orderStore.updateSymptoms(current.token, body.symptoms, socket.data.patientSecret);
    const event = { token: updated.token, symptoms: updated.symptoms, auditLogs: updated.auditLogs, updatedAt: updated.updatedAt };
    io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('symptoms_updated', event);
    return { order: updated, ...event };
  });

  on('toggle_simulation', async payload => {
    enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
    const body = assertObject(payload);
    const user = await staff();
    enforceCapabilityRate('staff-mutation', user.id, SOCKET_MUTATION_LIMIT, 60_000);
    const updated = await orderStore.toggleSimulation(user.clinicId, cleanId(body.token, 'token'), Boolean(body.isSimulating));
    if (!updated) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
    const event = { token: updated.token, isSimulating: updated.isSimulating, updatedAt: updated.updatedAt };
    io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('simulation_toggled', event);
    return { order: updated, ...event };
  });
});

function cleanHandshakeToken(value) {
  return typeof value === 'string' && value.length <= 200 ? value : '';
}

let simulationTimer = null;
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SIMULATION === 'true') {
  simulationTimer = setInterval(async () => {
    try {
      const orders = await orderStore.getAllActiveOrders();
      for (const order of orders) {
        if (!order.isSimulating || order.status !== 'EN_ROUTE' || !order.currentLoc || !order.destinationLoc || !order.crewId) continue;
        const dLat = order.destinationLoc.lat - order.currentLoc.lat;
        const dLng = order.destinationLoc.lng - order.currentLoc.lng;
        if (Math.hypot(dLat, dLng) <= 0.0005) continue;
        const updated = await orderStore.updateLocation(order.clinicId, order.token, order.crewId, order.currentLoc.lat + dLat * 0.05, order.currentLoc.lng + dLng * 0.05);
        if (updated) io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('location_updated', { token: updated.token, currentLoc: updated.currentLoc, locationUpdatedAt: updated.locationUpdatedAt, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, etaUpdatedAt: updated.etaUpdatedAt });
      }
    } catch (error) {
      console.warn('[Simulation] Tick failed:', error.message);
    }
  }, 10_000);
  simulationTimer.unref();
}

const credentialTimer = setInterval(async () => {
  for (const socket of io.sockets.sockets.values()) {
    try {
      const scopes = socket.data.activeAuthScopes || {};
      if (scopes.staff && !await tenantStore.authenticate(socket.data.staffSession)) {
        revokeSocket(socket, 'staff', 'SESSION_EXPIRED');
        continue;
      }
      if (scopes.driver && !await tenantStore.findCrewByAccessToken(socket.data.driverToken)) {
        revokeSocket(socket, 'driver', 'DRIVER_LINK_EXPIRED');
        continue;
      }
      if (scopes.patient) {
        const order = await orderStore.getPatientOrder(socket.data.patientSecret);
        if (!order || order.token !== socket.data.patientOrderId || order.patientAccessScope !== socket.data.patientAccessScope
          || order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) {
          revokeSocket(socket, socket.data.patientAccessScope || 'patient', 'PATIENT_LINK_EXPIRED');
        }
      }
    } catch {
      const scopes = socket.data.activeAuthScopes || {};
      revokeSocket(socket, scopes.staff ? 'staff' : scopes.driver ? 'driver' : socket.data.patientAccessScope || 'patient', 'CREDENTIAL_CHECK_FAILED');
    }
  }
}, 60_000);
credentialTimer.unref();

const staticDirectory = String(process.env.STATIC_DIR || '').trim();
if (staticDirectory) {
  const resolvedStaticDirectory = path.resolve(staticDirectory);
  const indexFile = path.join(resolvedStaticDirectory, 'index.html');
  if (!fs.existsSync(indexFile)) throw new Error(`STATIC_DIR does not contain index.html: ${resolvedStaticDirectory}`);
  app.use(express.static(resolvedStaticDirectory, {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0
  }));
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(indexFile));
}

app.use((req, _res, next) => next(httpError(404, 'NOT_FOUND', 'Маршрут API не найден')));
app.use((error, req, res, _next) => {
  if (error?.message === 'Origin is not allowed') error = httpError(403, 'CORS_FORBIDDEN', 'Источник запроса не разрешён');
  if (error?.type === 'entity.too.large') error = httpError(413, 'PAYLOAD_TOO_LARGE', 'Размер запроса превышает допустимый');
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) error = httpError(400, 'INVALID_JSON', 'Некорректный JSON');
  if (error?.code === '23505') error = httpError(409, 'CONFLICT', 'Запись с такими данными уже существует');
  const status = error.status || (error instanceof StoreError ? error.status : 500);
  const code = error.code || (error instanceof StoreError ? error.code : 'INTERNAL_ERROR');
  const message = status >= 500 ? 'Внутренняя ошибка сервера' : error.message;
  if (status >= 500) console.error(`[${req.requestId}]`, error);
  res.status(status).json({ error: message, code, details: error.details, requestId: req.requestId });
});

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await orderStore.init();
  acceptingTraffic = true;
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
  acceptingTraffic = false;
  console.log(`[Server] ${signal}: graceful shutdown started`);
  clearInterval(credentialTimer);
  if (simulationTimer) clearInterval(simulationTimer);
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
