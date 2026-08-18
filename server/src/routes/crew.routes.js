import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth, requireClinic, allowRoles } from '../middlewares/auth.middleware.js';
import { accessLinkRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as crewController from '../controllers/crew.controller.js';

const router = Router();

router.get('/api/crews', requireAuth, requireClinic, asyncRoute(crewController.getCrews));
router.post('/api/crews', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(crewController.createCrew));
router.put('/api/crews/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(crewController.updateCrew));
router.delete('/api/crews/:id', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'), asyncRoute(crewController.deleteCrew));
router.post('/api/crews/:id/access-link', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), accessLinkRateLimit, asyncRoute(crewController.rotateCrewAccess));

export default router;
