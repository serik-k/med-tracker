import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { loginIpRateLimit, passwordChangeRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();
router.post('/api/auth/login', loginIpRateLimit, asyncRoute(authController.login));
router.get('/api/auth/me', requireAuth, authController.getMe);
router.post('/api/auth/change-password', requireAuth, passwordChangeRateLimit, asyncRoute(authController.changePassword));
router.post('/api/auth/logout', asyncRoute(authController.logout));

export default router;
