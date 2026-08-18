import { tenantStore } from '../../db/tenantStore.js';
import { asyncRoute, httpError } from '../utils/httpErrors.js';

export const parseCookies = header => Object.fromEntries(String(header || '').split(';').map(item => item.trim()).filter(item => item.includes('=')).map(item => {
  const separator = item.indexOf('=');
  const rawValue = item.slice(separator + 1);
  try { return [item.slice(0, separator), decodeURIComponent(rawValue)]; }
  catch { return [item.slice(0, separator), rawValue]; }
}));

export const sessionToken = req => parseCookies(req.headers.cookie).medtracker_session || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

export const requireAuth = asyncRoute(async (req, res, next) => {
  const user = await tenantStore.authenticate(sessionToken(req));
  if (!user) throw httpError(401, 'AUTH_REQUIRED', 'Требуется вход в систему');
  req.user = user;
  next();
});

export const allowRoles = (...roles) => (req, _res, next) => roles.includes(req.user.role) ? next() : next(httpError(403, 'FORBIDDEN', 'Недостаточно прав'));

export const requireClinic = (req, _res, next) => req.user.clinicId ? next() : next(httpError(403, 'CLINIC_REQUIRED', 'Для операции требуется клиника'));
