import { tenantStore, hashToken } from '../../db/tenantStore.js';
import { LOGIN_FAILURE_LIMIT } from '../config/env.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, validEmail } from '../utils/validators.js';
import { rememberAttemptBucket } from '../utils/rateLimiter.js';
import { sessionToken } from '../middlewares/auth.middleware.js';
import { revokeSocket } from '../sockets/roomHelpers.js';

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = LOGIN_FAILURE_LIMIT;

let ioInstance = null;
export const setAuthSocketIO = (io) => { ioInstance = io; };

export const login = async (req, res) => {
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
};

export const getMe = (req, res) => res.json(req.user);

export const changePassword = async (req, res) => {
  const body = assertObject(req.body);
  const currentPassword = cleanString(body.currentPassword, 'currentPassword', { required: true, max: 256 });
  const newPassword = cleanString(body.newPassword, 'newPassword', { required: true, min: 10, max: 256 });
  if (currentPassword === newPassword) throw httpError(400, 'PASSWORD_UNCHANGED', 'Новый пароль должен отличаться от текущего');
  const changed = await tenantStore.changeOwnPassword(req.user.id, currentPassword, newPassword);
  if (!changed) throw httpError(400, 'PASSWORD_CHANGE_FAILED', 'Не удалось сменить пароль. Проверьте текущий пароль');
  res.clearCookie('medtracker_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  if (ioInstance) {
    for (const socket of ioInstance.sockets.sockets.values()) {
      if (socket.data.staffUserId === req.user.id) revokeSocket(socket, 'staff', 'PASSWORD_CHANGED');
    }
  }
  res.status(204).end();
};

export const logout = async (req, res) => {
  const raw = sessionToken(req);
  res.clearCookie('medtracker_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  await tenantStore.logout(raw);
  if (raw && ioInstance) {
    const digest = hashToken(raw);
    for (const socket of ioInstance.sockets.sockets.values()) {
      if (socket.data.staffSessionHash === digest) revokeSocket(socket, 'staff', 'LOGOUT');
    }
  }
  res.status(204).end();
};
