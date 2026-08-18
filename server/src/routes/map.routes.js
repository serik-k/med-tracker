import { Router } from 'express';
import { asyncRoute } from '../utils/httpErrors.js';
import { tileAccessRateLimit } from '../middlewares/rateLimiter.middleware.js';
import * as mapController from '../controllers/map.controller.js';

const router = Router();

router.get('/api/map-tiles/:z/:x/:y.png', tileAccessRateLimit, asyncRoute(mapController.getMapTiles));

export default router;
