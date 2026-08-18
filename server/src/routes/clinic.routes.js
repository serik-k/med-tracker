import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { requireAuth, requireClinic, allowRoles } from '../middlewares/auth.middleware.js';
import * as clinicController from '../controllers/clinic.controller.js';

const router = Router();

router.use('/api/clinic', requireAuth, requireClinic, allowRoles('clinic_owner', 'clinic_admin'));

router.get('/api/clinic/settings', asyncRoute(clinicController.getSettings));
router.patch('/api/clinic/settings', asyncRoute(clinicController.updateSettings));
router.get('/api/clinic/users', asyncRoute(clinicController.getUsers));
router.post('/api/clinic/users', asyncRoute(clinicController.createUser));
router.patch('/api/clinic/users/:id', asyncRoute(clinicController.updateUser));
router.delete('/api/clinic/users/:id', asyncRoute(clinicController.deleteUser));
router.post('/api/clinic/users/:id/reset-password', asyncRoute(clinicController.resetUserPassword));

export default router;
