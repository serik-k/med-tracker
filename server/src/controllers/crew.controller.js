import { orderStore } from '../../store.js';
import { tenantStore } from '../../db/tenantStore.js';
import { CREW_STATUSES } from '../config/constants.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanId } from '../utils/validators.js';
import { dispatcherRoom, revokeSocket } from '../sockets/roomHelpers.js';

let ioInstance = null;
export const setCrewSocketIO = (io) => { ioInstance = io; };

export const getCrews = async (req, res) => res.json(await orderStore.getAllCrews(req.user.clinicId));

export const createCrew = async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    carPlate: cleanString(body.carPlate, 'carPlate', { required: true, min: 3, max: 30 }),
    type: cleanString(body.type, 'type', { required: true, min: 2, max: 80 }),
    driverName: cleanString(body.driverName, 'driverName', { required: true, min: 2, max: 120 }),
    status: body.status || 'ON_DUTY'
  };
  if (!CREW_STATUSES.has(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус бригады', { field: 'status' });
  if (payload.status === 'ON_CALL') throw httpError(409, 'SYSTEM_MANAGED_STATUS', 'Статус «На вызове» назначается системой при выдаче вызова');
  const crews = await orderStore.getAllCrews(req.user.clinicId);
  if (crews.some(crew => crew.carPlate.toLowerCase() === payload.carPlate.toLowerCase())) throw httpError(409, 'CAR_PLATE_EXISTS', 'Автомобиль с таким госномером уже зарегистрирован');
  const created = await orderStore.addCrew(req.user.clinicId, payload);
  if (ioInstance) ioInstance.to(dispatcherRoom(req.user.clinicId)).emit('crew_added', created.crew);
  res.status(201).json(created.crew);
};

export const updateCrew = async (req, res) => {
  const body = assertObject(req.body);
  const crewId = cleanId(req.params.id);
  const existing = await tenantStore.getCrew(req.user.clinicId, crewId);
  if (!existing) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  const payload = {};
  for (const [field, limits] of Object.entries({ name: [2, 120], carPlate: [3, 30], type: [2, 80], driverName: [2, 120] })) {
    if (body[field] !== undefined) payload[field] = cleanString(body[field], field, { required: true, min: limits[0], max: limits[1] });
  }
  if (body.status !== undefined) {
    if (!CREW_STATUSES.has(body.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус бригады', { field: 'status' });
    if (body.status !== existing.status) {
      if (body.status === 'ON_CALL') throw httpError(409, 'SYSTEM_MANAGED_STATUS', 'Статус «На вызове» назначается системой при выдаче вызова');
      payload.status = body.status;
    }
  }
  const updated = await orderStore.updateCrew(req.user.clinicId, crewId, payload);
  if (!updated) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  if (ioInstance) ioInstance.to(dispatcherRoom(req.user.clinicId)).emit('crew_updated', updated);
  res.json(updated);
};

export const deleteCrew = async (req, res) => {
  const crewId = cleanId(req.params.id);
  if (await orderStore.hasActiveAssignment(req.user.clinicId, crewId)) throw httpError(409, 'CREW_BUSY', 'Нельзя удалить бригаду с активным вызовом');
  if (!await orderStore.deleteCrew(req.user.clinicId, crewId)) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  if (ioInstance) {
    for (const socket of ioInstance.sockets.sockets.values()) {
      if (socket.data.driverClinicId === req.user.clinicId && socket.data.driverCrewId === crewId) revokeSocket(socket, 'driver', 'CREW_ARCHIVED');
    }
    ioInstance.to(dispatcherRoom(req.user.clinicId)).emit('crew_deleted', crewId);
  }
  res.status(204).end();
};

export const rotateCrewAccess = async (req, res) => {
  const result = await tenantStore.rotateCrewAccess(req.user.clinicId, cleanId(req.params.id));
  if (!result) throw httpError(404, 'CREW_NOT_FOUND', 'Бригада не найдена');
  if (ioInstance) {
    for (const socket of ioInstance.sockets.sockets.values()) {
      if (socket.data.driverClinicId === req.user.clinicId && socket.data.driverCrewId === req.params.id) revokeSocket(socket, 'driver', 'DRIVER_LINK_ROTATED');
    }
  }
  res.json({ token: result.token, path: `/driver-access#${result.token}`, expiresAt: result.expiresAt });
};
