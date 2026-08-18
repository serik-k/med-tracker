import { orderStore } from '../../store.js';
import { PRIORITIES, ACTIVE_STATUSES } from '../config/constants.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanPhone, cleanOptional, cleanId } from '../utils/validators.js';
import { dispatcherRoom, patientRoom, publicCreatedOrder, attachCrewSockets, detachCrewSockets, disconnectPatientSockets, broadcastCrews } from '../sockets/roomHelpers.js';

let ioInstance = null;
export const setOrderSocketIO = (io) => { ioInstance = io; };

export const getOrders = async (req, res) => res.json(await orderStore.getAllActiveOrders(req.user.clinicId));

export const createOrder = async (req, res) => {
  const body = assertObject(req.body);
  if (body.carNumber && body.crewId === undefined) throw httpError(400, 'CREW_ID_REQUIRED', 'Передавайте явный crewId вместо отображаемого названия бригады', { field: 'crewId' });
  const payload = {
    patientName: cleanString(body.patientName, 'patientName', { required: true, min: 2, max: 120 }),
    patientPhone: cleanPhone(body.patientPhone, 'patientPhone'),
    address: cleanString(body.address, 'address', { required: true, min: 5, max: 300 }),
    priority: body.priority || 'EMERGENCY', crewId: cleanId(body.crewId, 'crewId', true), lat: body.lat, lng: body.lng,
    idempotencyKey: req.headers['idempotency-key'] ? cleanString(req.headers['idempotency-key'], 'Idempotency-Key', { min: 8, max: 100 }) : null
  };
  if (!PRIORITIES.has(payload.priority)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый приоритет', { field: 'priority' });
  const created = await orderStore.createOrder(req.user.clinicId, payload, req.user.id);
  const safeOrder = publicCreatedOrder(created);
  if (!created.idempotentReplay && ioInstance) {
    ioInstance.to(dispatcherRoom(req.user.clinicId)).emit('order_created', safeOrder);
    if (safeOrder.crewId) attachCrewSockets(ioInstance, req.user.clinicId, safeOrder.crewId, safeOrder);
    if (safeOrder.crewId) await broadcastCrews(ioInstance, req.user.clinicId);
  }
  res.status(created.idempotentReplay ? 200 : 201).json(created);
};

export const assignOrder = async (req, res) => {
  const body = assertObject(req.body);
  const crewId = cleanId(body.crewId, 'crewId', true);
  const result = await orderStore.assignOrder(req.user.clinicId, cleanId(req.params.token), crewId, req.user.id);
  const payload = { token: result.order.token, crewId: result.order.crewId, assignedCrew: result.order.assignedCrew, carNumber: result.order.carNumber, order: result.order, updatedAt: result.order.updatedAt };
  if (ioInstance) {
    if (result.previousCrewId && result.previousCrewId !== result.order.crewId) detachCrewSockets(ioInstance, req.user.clinicId, result.previousCrewId, result.order.token, result.order.crewId ? 'REASSIGNED' : 'UNASSIGNED');
    if (result.order.crewId) attachCrewSockets(ioInstance, req.user.clinicId, result.order.crewId, result.order);
    ioInstance.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('assignment_updated', payload);
    await broadcastCrews(ioInstance, req.user.clinicId);
  }
  res.json(result.order);
};

export const cancelOrder = async (req, res) => {
  const reason = cleanOptional(assertObject(req.body || {}).reason, 'reason', 500) || '';
  const result = await orderStore.cancelOrder(req.user.clinicId, cleanId(req.params.token), reason, req.user.id);
  const payload = { token: result.order.token, status: result.order.status, cancelledAt: result.order.cancelledAt, cancelReason: result.order.cancelReason, expired: true, updatedAt: result.order.updatedAt };
  if (ioInstance) {
    ioInstance.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('status_updated', payload);
    ioInstance.to(dispatcherRoom(req.user.clinicId)).to(patientRoom(result.order.token)).emit('order_cancelled', { order: result.order, token: result.order.token });
    if (result.previousCrewId) detachCrewSockets(ioInstance, req.user.clinicId, result.previousCrewId, result.order.token, 'CANCELLED');
    if (result.previousCrewId) await broadcastCrews(ioInstance, req.user.clinicId);
    setTimeout(() => disconnectPatientSockets(ioInstance, result.order.token, null, 'ORDER_CANCELLED'), 100).unref();
  }
  res.json(result.order);
};

export const rotatePatientAccess = async (req, res) => {
  const orderId = cleanId(req.params.token);
  const result = await orderStore.rotatePatientAccess(req.user.clinicId, orderId, req.user.id);
  if (!result) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
  if (ioInstance) disconnectPatientSockets(ioInstance, orderId, 'patient', 'PATIENT_LINK_ROTATED');
  res.json(result);
};

export const rotateViewerAccess = async (req, res) => {
  const orderId = cleanId(req.params.token);
  const result = await orderStore.rotateViewerAccess(req.user.clinicId, orderId, req.user.id);
  if (!result) throw httpError(404, 'ORDER_NOT_FOUND', 'Вызов не найден');
  if (ioInstance) disconnectPatientSockets(ioInstance, orderId, 'viewer', 'VIEWER_LINK_ROTATED');
  res.json(result);
};

export const respondWithPatientOrder = async (rawTokenValue, res) => {
  const rawToken = cleanString(rawTokenValue, 'token', { required: true, max: 200 });
  const order = await orderStore.getPatientOrder(rawToken);
  if (!order) throw httpError(404, 'PATIENT_LINK_INVALID', 'Ссылка недействительна или вызов не найден');
  if (order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PATIENT_LINK_EXPIRED', 'Ссылка истекла или вызов завершён');
  return res.json(order);
};

export const getPatientOrderPublic = async (req, res) => {
  await respondWithPatientOrder(assertObject(req.body).token, res);
};

export const getPatientOrderGetRetired = async (req, res) => {
  res.setHeader('Deprecation', 'true');
  await respondWithPatientOrder(req.params.token, res);
};
