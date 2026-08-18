import { Server } from 'socket.io';
import { orderStore } from '../../store.js';
import { tenantStore, hashToken } from '../../db/tenantStore.js';
import {
  SOCKET_CONNECTION_LIMIT, SOCKET_JOIN_LIMIT, SOCKET_LOCATION_LIMIT,
  SOCKET_MUTATION_LIMIT, SOCKET_PHOTO_LIMIT, SOCKET_MAX_PAYLOAD_BYTES,
  allowedOrigins, corsOptions, trustedClientAddress
} from '../config/env.js';
import { STAFF_ROLES, ACTIVE_STATUSES, ORDER_STATUSES } from '../config/constants.js';
import { httpError, socketError, socketOk } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanId, cleanHandshakeToken } from '../utils/validators.js';
import { rememberAttemptBucket, enforceCapabilityRate } from '../utils/rateLimiter.js';
import { parseCookies } from '../middlewares/auth.middleware.js';
import {
  patientRoom, dispatcherRoom, crewRoom,
  revokeSocket, disconnectPatientSockets, detachCrewSockets, broadcastCrews
} from './roomHelpers.js';

const socketHandshakeAttempts = new Map();

export const allowSocketRequest = (request, callback) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) return callback('Origin is not allowed', false);
  const key = trustedClientAddress(request);
  const now = Date.now();
  const recent = (socketHandshakeAttempts.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  if (recent.length >= SOCKET_CONNECTION_LIMIT) return callback('Connection rate limit exceeded', false);
  recent.push(now);
  rememberAttemptBucket(socketHandshakeAttempts, key, recent, 60_000, now);
  callback(null, true);
};

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { ...corsOptions, methods: ['GET', 'POST'] },
    allowRequest: allowSocketRequest,
    maxHttpBufferSize: SOCKET_MAX_PAYLOAD_BYTES
  });

  io.on('connection', socket => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const staffSession = cookies.medtracker_session || '';
    const driverToken = cleanHandshakeToken(socket.handshake.auth?.driverToken);
    const patientSecret = cleanHandshakeToken(socket.handshake.auth?.patientToken);
    socket.data.staffSession = staffSession || socket.data.staffSession || '';
    socket.data.staffSessionHash = socket.data.staffSession ? hashToken(socket.data.staffSession) : null;
    socket.data.driverToken = driverToken || socket.data.driverToken || '';
    socket.data.patientSecret = patientSecret || socket.data.patientSecret || '';
    socket.data.activeAuthScopes ||= {};

    const enforceSocketRate = (bucket, max, windowMs) => {
      const now = Date.now();
      socket.data.rateBuckets ||= {};
      const recent = (socket.data.rateBuckets[bucket] || []).filter(timestamp => now - timestamp < windowMs);
      if (recent.length >= max) throw httpError(429, 'RATE_LIMITED', 'Слишком много realtime-запросов');
      recent.push(now);
      socket.data.rateBuckets[bucket] = recent;
    };

    const on = (event, handler) => socket.on(event, async (...args) => {
      const possibleAck = args.at(-1);
      const ack = typeof possibleAck === 'function' ? possibleAck : () => {};
      const payload = (typeof possibleAck === 'function' ? args.slice(0, -1) : args)[0];
      try {
        const response = await handler(payload);
        ack(socketOk(response));
      } catch (error) {
        console.warn(`[Socket:${event}]`, error.code || error.message);
        const response = socketError(error);
        ack(response);
        socket.emit('operation_error', { event, ...response.error });
      }
    });

    const staff = async () => {
      const user = await tenantStore.authenticate(socket.data.staffSession);
      if (!user || !user.clinicId || !STAFF_ROLES.has(user.role)) throw httpError(401, 'AUTH_REQUIRED', 'Сессия сотрудника недействительна');
      socket.data.staffUserId = user.id;
      socket.data.staffClinicId = user.clinicId;
      socket.data.activeAuthScopes.staff = true;
      return user;
    };

    const driver = async () => {
      const crew = await tenantStore.findCrewByAccessToken(driverToken);
      if (!crew) throw httpError(401, 'DRIVER_LINK_INVALID', 'Ссылка бригады недействительна или истекла');
      socket.data.driverClinicId = crew.clinicId;
      socket.data.driverCrewId = crew.id;
      socket.data.activeAuthScopes.driver = true;
      return crew;
    };

    const patient = async reference => {
      if (!patientSecret || socket.data.patientOrderId !== String(reference || '')) throw httpError(403, 'PATIENT_ACCESS_DENIED', 'Нет доступа к вызову');
      const order = await orderStore.getPatientOrder(patientSecret);
      if (!order || order.clinicStatus !== 'ACTIVE' || order.token !== socket.data.patientOrderId || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка пациента истекла');
      if (order.patientAccessScope !== 'patient') throw httpError(403, 'VIEWER_READ_ONLY', 'Ссылка родственника доступна только для просмотра');
      socket.data.activeAuthScopes.patient = true;
      return order;
    };

    on('join_dispatcher', async () => {
      enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
      const user = await staff();
      socket.join(dispatcherRoom(user.clinicId));
      const [orders, crews] = await Promise.all([orderStore.getAllDispatcherOrders(user.clinicId), orderStore.getAllCrews(user.clinicId)]);
      socket.emit('all_orders', orders);
      socket.emit('all_crews', crews);
      return { orders, crews };
    });

    on('join_crew', async () => {
      enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
      const crew = await driver();
      socket.join(crewRoom(crew.clinicId, crew.id));
      const order = (await orderStore.getAllActiveOrders(crew.clinicId)).find(item => item.crewId === crew.id) || null;
      if (order) {
        socket.join(patientRoom(order.token));
        socket.emit('crew_order', order);
      }
      return { crew, order };
    });

    on('join_order', async payload => {
      enforceSocketRate('join', SOCKET_JOIN_LIMIT, 60_000);
      const reference = typeof payload === 'string' ? payload : payload?.token;
      if (!reference || typeof reference !== 'string' || reference.length > 200) throw httpError(400, 'INVALID_PAYLOAD', 'Некорректный идентификатор вызова');
      let order = null;

      if (patientSecret) {
        const patientOrder = await orderStore.getPatientOrder(patientSecret);
        if (!patientOrder) throw httpError(404, 'PATIENT_LINK_INVALID', 'Ссылка пациента недействительна');
        if (patientOrder.clinicStatus !== 'ACTIVE' || patientOrder.expired || !ACTIVE_STATUSES.has(patientOrder.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка пациента истекла');
        if (reference !== patientSecret && reference !== patientOrder.token) throw httpError(403, 'PATIENT_ACCESS_DENIED', 'Нет доступа к вызову');
        order = patientOrder;
        socket.data.patientOrderId = order.token;
        socket.data.patientClinicId = order.clinicId;
        socket.data.patientAccessScope = order.patientAccessScope || 'patient';
        socket.data.activeAuthScopes.patient = true;
      } else if (driverToken) {
        const crew = await driver();
        order = await orderStore.getOrderByRef(reference, crew.clinicId);
        if (!order || order.crewId !== crew.id || !ACTIVE_STATUSES.has(order.status)) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
      } else {
        const user = await staff();
        order = await orderStore.getOrderByRef(reference, user.clinicId);
        if (!order) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
      }
      socket.join(patientRoom(order.token));
      socket.emit('order_data', order);
      return { order };
    });

    on('update_location', async payload => {
      enforceSocketRate('location', SOCKET_LOCATION_LIMIT, 60_000);
      const body = assertObject(payload);
      const crew = await driver();
      enforceCapabilityRate('driver-location', hashToken(socket.data.driverToken), SOCKET_LOCATION_LIMIT, 60_000);
      const reference = cleanId(body.token, 'token');
      const order = await orderStore.getOrderByRef(reference, crew.clinicId);
      if (!order || order.crewId !== crew.id) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
      const updated = await orderStore.updateLocation(crew.clinicId, reference, crew.id, body.lat, body.lng);
      if (!updated) throw httpError(409, 'ORDER_NOT_ACTIVE', 'Вызов больше не активен');
      const event = { token: updated.token, currentLoc: updated.currentLoc, locationUpdatedAt: updated.locationUpdatedAt, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, etaUpdatedAt: updated.etaUpdatedAt, updatedAt: updated.updatedAt };
      io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('location_updated', event);
      return { order: updated, ...event };
    });

    on('update_status', async payload => {
      enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
      const body = assertObject(payload);
      const crew = await driver();
      enforceCapabilityRate('driver-mutation', hashToken(socket.data.driverToken), SOCKET_MUTATION_LIMIT, 60_000);
      const reference = cleanId(body.token, 'token');
      if (!ORDER_STATUSES.has(body.status)) throw httpError(400, 'INVALID_STATUS', 'Недопустимый статус');
      const current = await orderStore.getOrderByRef(reference, crew.clinicId);
      if (!current || current.crewId !== crew.id) throw httpError(403, 'DRIVER_ACCESS_DENIED', 'Вызов не назначен этой бригаде');
      const updated = await orderStore.updateOrderStatus(crew.clinicId, reference, body.status, body.hospitalName, body.hospitalLocation, { crewId: crew.id });
      if (!updated) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
      const event = { token: updated.token, status: updated.status, hospitalName: updated.hospitalName, hospitalLocation: updated.hospitalLocation, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, auditLogs: updated.auditLogs, expired: updated.expired, completedAt: updated.completedAt, updatedAt: updated.updatedAt };
      io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('status_updated', event);
      if (updated.status === 'COMPLETED') {
        detachCrewSockets(io, updated.clinicId, crew.id, updated.token, 'COMPLETED');
        await broadcastCrews(io, updated.clinicId);
        setTimeout(() => disconnectPatientSockets(io, updated.token, null, 'ORDER_COMPLETED'), 100).unref();
      }
      return { order: updated, ...event };
    });

    on('update_access', async payload => {
      enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
      const body = assertObject(payload);
      const reference = cleanId(body.token, 'token');
      const current = await patient(reference);
      enforceCapabilityRate('patient-mutation', hashToken(socket.data.patientSecret), SOCKET_MUTATION_LIMIT, 60_000);
      if (typeof body.accessInfo?.photoUrl === 'string' && body.accessInfo.photoUrl.startsWith('data:')) {
        enforceSocketRate('photo', SOCKET_PHOTO_LIMIT, 5 * 60_000);
        enforceCapabilityRate('patient-photo', hashToken(socket.data.patientSecret), SOCKET_PHOTO_LIMIT, 5 * 60_000);
      }
      const updated = await orderStore.updateAccessInfo(current.token, assertObject(body.accessInfo), socket.data.patientSecret);
      const event = { token: updated.token, accessInfo: updated.accessInfo, auditLogs: updated.auditLogs, updatedAt: updated.updatedAt };
      io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('access_updated', event);
      return { order: updated, ...event };
    });

    on('update_symptoms', async payload => {
      enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
      const body = assertObject(payload);
      const reference = cleanId(body.token, 'token');
      const current = await patient(reference);
      enforceCapabilityRate('patient-mutation', hashToken(socket.data.patientSecret), SOCKET_MUTATION_LIMIT, 60_000);
      const updated = await orderStore.updateSymptoms(current.token, body.symptoms, socket.data.patientSecret);
      const event = { token: updated.token, symptoms: updated.symptoms, auditLogs: updated.auditLogs, updatedAt: updated.updatedAt };
      io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('symptoms_updated', event);
      return { order: updated, ...event };
    });

    on('toggle_simulation', async payload => {
      enforceSocketRate('mutation', SOCKET_MUTATION_LIMIT, 60_000);
      const body = assertObject(payload);
      const user = await staff();
      enforceCapabilityRate('staff-mutation', user.id, SOCKET_MUTATION_LIMIT, 60_000);
      const updated = await orderStore.toggleSimulation(user.clinicId, cleanId(body.token, 'token'), Boolean(body.isSimulating));
      if (!updated) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
      const event = { token: updated.token, isSimulating: updated.isSimulating, updatedAt: updated.updatedAt };
      io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('simulation_toggled', event);
      return { order: updated, ...event };
    });
  });

  return io;
};

export const startSocketBackgroundTasks = (io) => {
  let simulationTimer = null;
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_SIMULATION === 'true') {
    simulationTimer = setInterval(async () => {
      try {
        const orders = await orderStore.getAllActiveOrders();
        for (const order of orders) {
          if (!order.isSimulating || order.status !== 'EN_ROUTE' || !order.currentLoc || !order.destinationLoc || !order.crewId) continue;
          const dLat = order.destinationLoc.lat - order.currentLoc.lat;
          const dLng = order.destinationLoc.lng - order.currentLoc.lng;
          if (Math.hypot(dLat, dLng) <= 0.0005) continue;
          const updated = await orderStore.updateLocation(order.clinicId, order.token, order.crewId, order.currentLoc.lat + dLat * 0.05, order.currentLoc.lng + dLng * 0.05);
          if (updated) io.to(patientRoom(updated.token)).to(dispatcherRoom(updated.clinicId)).emit('location_updated', { token: updated.token, currentLoc: updated.currentLoc, locationUpdatedAt: updated.locationUpdatedAt, routePath: updated.routePath, etaMinutes: updated.etaMinutes, distanceKm: updated.distanceKm, etaUpdatedAt: updated.etaUpdatedAt });
        }
      } catch (error) {
        console.warn('[Simulation] Tick failed:', error.message);
      }
    }, 10_000);
    simulationTimer.unref();
  }

  const credentialTimer = setInterval(async () => {
    for (const socket of io.sockets.sockets.values()) {
      try {
        const scopes = socket.data.activeAuthScopes || {};
        if (scopes.staff && !await tenantStore.authenticate(socket.data.staffSession)) {
          revokeSocket(socket, 'staff', 'SESSION_EXPIRED');
          continue;
        }
        if (scopes.driver && !await tenantStore.findCrewByAccessToken(socket.data.driverToken)) {
          revokeSocket(socket, 'driver', 'DRIVER_LINK_EXPIRED');
          continue;
        }
        if (scopes.patient) {
          const order = await orderStore.getPatientOrder(socket.data.patientSecret);
          if (!order || order.token !== socket.data.patientOrderId || order.patientAccessScope !== socket.data.patientAccessScope
            || order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) {
            revokeSocket(socket, socket.data.patientAccessScope || 'patient', 'PATIENT_LINK_EXPIRED');
          }
        }
      } catch {
        const scopes = socket.data.activeAuthScopes || {};
        revokeSocket(socket, scopes.staff ? 'staff' : scopes.driver ? 'driver' : socket.data.patientAccessScope || 'patient', 'CREDENTIAL_CHECK_FAILED');
      }
    }
  }, 60_000);
  credentialTimer.unref();

  return { credentialTimer, simulationTimer };
};
