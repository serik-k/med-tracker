import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { publicAccessRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as driverController from '../controllers/driver.controller.js';

const router = Router();

router.post('/api/public/driver-access', publicAccessRateLimit, asyncRoute(driverController.driverAccessPublic));
router.get('/api/driver-access/:accessToken/active-order', publicAccessRateLimit, asyncRoute(driverController.driverAccessActiveOrder));

export default router;
