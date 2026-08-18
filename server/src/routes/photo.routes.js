import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth, requireClinic } from '../middlewares/auth.middleware.js';
import { publicAccessRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as photoController from '../controllers/photo.controller.js';

const router = Router();

router.post('/api/access-photo', requireAuth, requireClinic, publicAccessRateLimit, asyncRoute(photoController.accessPhotoAuth));
router.post('/api/public/access-photo', publicAccessRateLimit, asyncRoute(photoController.accessPhotoPublic));
router.get('/api/access-photos/:token', publicAccessRateLimit, asyncRoute(photoController.retiredGetAccessPhoto));

export default router;
