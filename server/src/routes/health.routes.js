import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import * as healthController from '../controllers/health.controller.js';

const router = Router();
router.get('/health/live', healthController.getLive);
router.get('/health/ready', asyncRoute(healthController.getReady));
router.get('/health', asyncRoute(healthController.getHealth));

export default router;
