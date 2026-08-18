import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import platformRoutes from './platform.routes.js';
import clinicRoutes from './clinic.routes.js';
import crewRoutes from './crew.routes.js';
import orderRoutes from './order.routes.js';
import driverRoutes from './driver.routes.js';
import photoRoutes from './photo.routes.js';
import mapRoutes from './map.routes.js';

export const registerRoutes = (app) => {
  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(platformRoutes);
  app.use(clinicRoutes);
  app.use(crewRoutes);
  app.use(orderRoutes);
  app.use(driverRoutes);
  app.use(photoRoutes);
  app.use(mapRoutes);
};
