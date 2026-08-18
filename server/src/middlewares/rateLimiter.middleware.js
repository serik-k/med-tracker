import { LOGIN_IP_LIMIT, ACCESS_LINK_LIMIT, PUBLIC_ACCESS_LIMIT, TILE_ACCESS_LIMIT, PASSWORD_CHANGE_LIMIT } from '../config/env.js';
import { createRateLimiter } from '../utils/rateLimiter.js';

export const loginIpRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: LOGIN_IP_LIMIT, prefix: 'login' });
export const accessLinkRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: ACCESS_LINK_LIMIT, prefix: 'link', key: req => req.user?.id || req.ip });
export const publicAccessRateLimit = createRateLimiter({ windowMs: 5 * 60 * 1000, max: PUBLIC_ACCESS_LIMIT, prefix: 'public' });
export const tileAccessRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: TILE_ACCESS_LIMIT, prefix: 'tile' });
export const passwordChangeRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: PASSWORD_CHANGE_LIMIT, prefix: 'password-change', key: req => req.user?.id || req.ip });
