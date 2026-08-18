import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth, allowRoles } from '../middlewares/auth.middleware.js';
import * as platformController from '../controllers/platform.controller.js';

const router = Router();
router.get('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), asyncRoute(platformController.getClinics));
router.post('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), asyncRoute(platformController.createClinic));
router.patch('/api/platform/clinics/:id', requireAuth, allowRoles('platform_admin'), asyncRoute(platformController.updateClinic));

export default router;
