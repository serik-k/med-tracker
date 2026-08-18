import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth, requireClinic, allowRoles } from '../middlewares/auth.middleware.js';
import { accessLinkRateLimit, publicAccessRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

router.get('/api/orders', requireAuth, requireClinic, asyncRoute(orderController.getOrders));
router.post('/api/orders', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(orderController.createOrder));
router.patch('/api/orders/:token/assignment', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(orderController.assignOrder));
router.post('/api/orders/:token/assign', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(orderController.assignOrder));
router.post('/api/orders/:token/cancel', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), asyncRoute(orderController.cancelOrder));
router.post('/api/orders/:token/patient-access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(orderController.rotatePatientAccess));
router.post('/api/orders/:token/viewer-access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(orderController.rotateViewerAccess));

router.post('/api/public/order-access', publicAccessRateLimit, asyncRoute(orderController.getPatientOrderPublic));
router.get('/api/orders/:token', publicAccessRateLimit, asyncRoute(orderController.getPatientOrderGetRetired));

export default router;
