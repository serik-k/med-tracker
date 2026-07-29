import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { orderStore } from './store.js';
import { tenantStore } from './db/tenantStore.js';

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const getCrewId = (carNumber = '') => carNumber.match(/№\s*(\d+)/)?.[1] || carNumber.match(/\b(\d{3})\b/)?.[1] || null;
const parseCookies = header => Object.fromEntries(String(header || '').split(';').map(item => item.trim()).filter(item => item.includes('=')).map(item => {
  const separator = item.indexOf('=');
  return [item.slice(0, separator), item.slice(separator + 1)];
}));
const sessionToken = req => parseCookies(req.headers.cookie).medtracker_session || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const requireAuth = (req, res, next) => {
  const user = tenantStore.authenticate(sessionToken(req));
  if (!user) return res.status(401).json({ error: 'Требуется вход в систему' });
  req.user = user;
  next();
};
const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Недостаточно прав' });
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;

app.post('/api/auth/login', (req, res) => {
  const attemptKey = `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
  const recentAttempts = (loginAttempts.get(attemptKey) || []).filter(timestamp => Date.now() - timestamp < LOGIN_WINDOW_MS);
  if (recentAttempts.length >= LOGIN_LIMIT) return res.status(429).json({ error: 'Слишком много попыток. Повторите вход через 15 минут' });
  const result = tenantStore.login(req.body?.email, req.body?.password);
  if (!result) {
    recentAttempts.push(Date.now());
    loginAttempts.set(attemptKey, recentAttempts);
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  loginAttempts.delete(attemptKey);
  res.cookie('medtracker_session', result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  res.json({ user: result.user });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));
app.post('/api/auth/logout', requireAuth, (req, res) => {
  tenantStore.logout(sessionToken(req));
  res.clearCookie('medtracker_session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.status(204).end();
});

app.get('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), (req, res) => {
  res.json(tenantStore.getClinics());
});

app.post('/api/platform/clinics', requireAuth, allowRoles('platform_admin'), (req, res) => {
  const fields = ['name', 'legalName', 'bin', 'city', 'contactPhone', 'ownerName', 'ownerEmail', 'ownerPassword'];
  if (fields.some(field => !String(req.body?.[field] || '').trim())) return res.status(400).json({ error: 'Заполните все обязательные поля' });
  if (!/^\d{12}$/.test(String(req.body.bin).trim())) return res.status(400).json({ error: 'БИН должен содержать 12 цифр' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(req.body.ownerEmail).trim())) return res.status(400).json({ error: 'Некорректный email владельца' });
  if (tenantStore.binExists(req.body.bin)) return res.status(409).json({ error: 'Клиника с таким БИН уже существует' });
  if (tenantStore.emailExists(req.body.ownerEmail)) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  if (String(req.body.ownerPassword).length < 8) return res.status(400).json({ error: 'Пароль должен содержать не менее 8 символов' });
  res.status(201).json(tenantStore.createClinic(req.body));
});

app.get('/api/clinic/users', requireAuth, allowRoles('clinic_owner', 'clinic_admin'), (req, res) => {
  res.json(tenantStore.getClinicUsers(req.user.clinicId));
});

app.post('/api/clinic/users', requireAuth, allowRoles('clinic_owner', 'clinic_admin'), (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (![name, email, password, role].every(value => String(value || '').trim())) return res.status(400).json({ error: 'Заполните все поля сотрудника' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return res.status(400).json({ error: 'Некорректный email' });
  if (!['dispatcher', 'clinic_admin'].includes(role)) return res.status(400).json({ error: 'Недопустимая роль' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Пароль должен содержать не менее 8 символов' });
  if (tenantStore.emailExists(email)) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  res.status(201).json(tenantStore.createClinicUser(req.user.clinicId, req.body));
});

// REST Endpoints
app.get('/api/crews', requireAuth, (req, res) => {
  if (!req.user.clinicId) return res.json([]);
  res.json(orderStore.getAllCrews(req.user.clinicId));
});

app.post('/api/crews', requireAuth, allowRoles('clinic_owner', 'clinic_admin'), (req, res) => {
  const crewData = req.body || {};
  const requiredFields = ['name', 'carPlate', 'type', 'driverName'];
  const missingField = requiredFields.find(field => !String(crewData[field] || '').trim());
  if (missingField) return res.status(400).json({ error: 'Заполните все поля бригады' });
  if (orderStore.getAllCrews(req.user.clinicId).some(crew => crew.carPlate.toLowerCase() === String(crewData.carPlate).trim().toLowerCase())) {
    return res.status(409).json({ error: 'Автомобиль с таким госномером уже зарегистрирован' });
  }
  const created = orderStore.addCrew(req.user.clinicId, crewData);
  io.to(`dispatchers_${req.user.clinicId}`).emit('crew_added', created.crew);
  res.status(201).json(created.crew);
});

app.put('/api/crews/:id', requireAuth, allowRoles('clinic_owner', 'clinic_admin'), (req, res) => {
  const updated = orderStore.updateCrew(req.user.clinicId, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Бригада не найдена' });
  io.to(`dispatchers_${req.user.clinicId}`).emit('crew_updated', updated);
  res.json(updated);
});

app.delete('/api/crews/:id', requireAuth, allowRoles('clinic_owner', 'clinic_admin'), (req, res) => {
  const hasActiveOrder = orderStore.getAllActiveOrders(req.user.clinicId).some(order => getCrewId(order.carNumber) === req.params.id);
  if (hasActiveOrder) return res.status(409).json({ error: 'Нельзя удалить бригаду с активным вызовом' });
  const deleted = orderStore.deleteCrew(req.user.clinicId, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Бригада не найдена' });
  io.to(`dispatchers_${req.user.clinicId}`).emit('crew_deleted', req.params.id);
  res.status(204).end();
});

app.get('/api/orders', requireAuth, (req, res) => {
  res.json(orderStore.getAllActiveOrders(req.user.clinicId));
});

app.get('/api/driver-access/:accessToken/active-order', (req, res) => {
  const crew = tenantStore.findCrewByAccessToken(req.params.accessToken);
  if (!crew) return res.status(404).json({ error: 'Ссылка бригады недействительна' });
  const order = orderStore.getAllActiveOrders(crew.clinicId)
    .filter(item => getCrewId(item.carNumber) === crew.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!order) return res.status(204).end();
  res.json(order);
});

app.post('/api/orders', requireAuth, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), async (req, res) => {
  const assignedCrewId = getCrewId(req.body?.carNumber);
  if (assignedCrewId && !tenantStore.getCrew(req.user.clinicId, assignedCrewId)) {
    return res.status(400).json({ error: 'Выбранная бригада не принадлежит вашей клинике' });
  }
  const order = await orderStore.createOrder(req.user.clinicId, req.body);
  io.to(`dispatchers_${req.user.clinicId}`).emit('order_created', order);
  const crewId = getCrewId(order.carNumber);
  if (crewId) io.to(`crew_${crewId}`).emit('crew_order', order);
  res.status(201).json(order);
});

app.post('/api/crews/:id/access-link', requireAuth, allowRoles('clinic_owner', 'clinic_admin', 'dispatcher'), (req, res) => {
  const rawToken = tenantStore.rotateCrewAccess(req.user.clinicId, req.params.id);
  if (!rawToken) return res.status(404).json({ error: 'Бригада не найдена' });
  res.json({ token: rawToken, path: `/driver-access/${rawToken}` });
});

app.get('/api/orders/:token', (req, res) => {
  const order = orderStore.getOrderByToken(req.params.token);
  if (!order) {
    return res.status(404).json({ error: 'Ссылка устарела или вызов не найден' });
  }
  if (order.expired) {
    return res.status(410).json({ error: 'Ссылка сгорела. Вызов был завершен.' });
  }
  res.json(order);
});

// Socket.io Real-Time Handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  const staffUser = tenantStore.authenticate(parseCookies(socket.handshake.headers.cookie).medtracker_session);
  const driverCrew = tenantStore.findCrewByAccessToken(socket.handshake.auth?.driverToken || '');

  socket.on('join_dispatcher', () => {
    if (!staffUser?.clinicId || !['clinic_owner', 'clinic_admin', 'dispatcher'].includes(staffUser.role)) return;
    socket.join(`dispatchers_${staffUser.clinicId}`);
    socket.emit('all_orders', orderStore.getAllDispatcherOrders(staffUser.clinicId));
    socket.emit('all_crews', orderStore.getAllCrews(staffUser.clinicId));
  });

  socket.on('join_order', (token) => {
    const order = orderStore.getOrderByToken(token);
    const isPatient = socket.handshake.auth?.patientToken === token;
    const canAccess = order && (isPatient || staffUser?.clinicId === order.clinicId || (driverCrew?.clinicId === order.clinicId && getCrewId(order.carNumber) === driverCrew.id));
    if (canAccess) {
      socket.join(`order_${token}`);
      if (isPatient) socket.data.patientToken = token;
      socket.emit('order_data', order);
    }
  });

  socket.on('join_crew', () => {
    if (!driverCrew) return;
    socket.join(`crew_${driverCrew.id}`);
    const assignedOrder = orderStore.getAllActiveOrders(driverCrew.clinicId)
      .filter(order => getCrewId(order.carNumber) === driverCrew.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (assignedOrder) socket.emit('crew_order', assignedOrder);
  });

  socket.on('update_location', ({ token, lat, lng }) => {
    const order = orderStore.getOrderByToken(token);
    if (!driverCrew || !order || driverCrew.clinicId !== order.clinicId || getCrewId(order.carNumber) !== driverCrew.id) return;
    const updated = orderStore.updateLocation(token, lat, lng);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('location_updated', {
        token,
        currentLoc: updated.currentLoc
      });
    }
  });

  socket.on('update_status', ({ token, status, hospitalName }) => {
    const order = orderStore.getOrderByToken(token);
    if (!driverCrew || !order || driverCrew.clinicId !== order.clinicId || getCrewId(order.carNumber) !== driverCrew.id) return;
    const updated = orderStore.updateOrderStatus(token, status, hospitalName);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('status_updated', {
        token,
        status: updated.status,
        hospitalName: updated.hospitalName || null,
        auditLogs: updated.auditLogs,
        expired: updated.expired,
        completedAt: updated.completedAt || null
      });
      if (updated.status === 'COMPLETED') {
        const crewId = getCrewId(updated.carNumber);
        if (crewId) io.to(`crew_${crewId}`).emit('crew_order_cleared', { token });
      }
    }
  });

  socket.on('trigger_sos', ({ token, note }) => {
    if (socket.data.patientToken !== token) return;
    const updated = orderStore.addSosAlert(token, note);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('sos_triggered', {
        token,
        sosAlert: true,
        sosTime: updated.sosTime,
        auditLogs: updated.auditLogs
      });
    }
  });

  socket.on('update_access', ({ token, accessInfo }) => {
    if (socket.data.patientToken !== token) return;
    const updated = orderStore.updateAccessInfo(token, accessInfo);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('access_updated', {
        token,
        accessInfo: updated.accessInfo,
        auditLogs: updated.auditLogs
      });
    }
  });

  socket.on('update_symptoms', ({ token, symptoms }) => {
    if (socket.data.patientToken !== token) return;
    const updated = orderStore.updateSymptoms(token, symptoms);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('symptoms_updated', {
        token,
        symptoms: updated.symptoms,
        auditLogs: updated.auditLogs
      });
    }
  });

  socket.on('toggle_simulation', ({ token, isSimulating }) => {
    const targetOrder = orderStore.getOrderByToken(token);
    if (!staffUser?.clinicId || targetOrder?.clinicId !== staffUser.clinicId) return;
    const updated = orderStore.toggleSimulation(token, isSimulating);
    if (updated) {
      io.to(`order_${token}`).to(`dispatchers_${updated.clinicId}`).emit('simulation_toggled', {
        token,
        isSimulating: updated.isSimulating
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Simulation Loop for active simulation orders
setInterval(() => {
  const activeOrders = orderStore.getAllActiveOrders();
  activeOrders.forEach(order => {
    if (order.isSimulating && order.status === 'EN_ROUTE' && !order.expired) {
      // Step location slightly towards destination
      const dest = order.destinationLoc;
      const curr = order.currentLoc;

      const dLat = dest.lat - curr.lat;
      const dLng = dest.lng - curr.lng;

      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      if (distance > 0.0005) {
        // Move 5% closer each tick
        const newLat = curr.lat + dLat * 0.05 + (Math.random() - 0.5) * 0.0001;
        const newLng = curr.lng + dLng * 0.05 + (Math.random() - 0.5) * 0.0001;
        orderStore.updateLocation(order.token, newLat, newLng);

        io.to(`order_${order.token}`).to(`dispatchers_${order.clinicId}`).emit('location_updated', {
          token: order.token,
          currentLoc: { lat: newLat, lng: newLng }
        });
      } else {
        // Arrived at destination in simulation!
        orderStore.updateOrderStatus(order.token, 'ARRIVED');
        io.to(`order_${order.token}`).to(`dispatchers_${order.clinicId}`).emit('status_updated', {
          token: order.token,
          status: 'ARRIVED',
          expired: false
        });
      }
    }
  });
}, 2500);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Ambulance Tracker Backend Server running on http://localhost:${PORT}`);
});
