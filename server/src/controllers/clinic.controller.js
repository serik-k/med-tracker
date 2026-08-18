import { tenantStore } from '../../db/tenantStore.js';
import { clinicPasswordResetDecision, clinicUserDeletionDecision } from '../../authPolicy.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanOptional, cleanPhone, cleanTimezone, cleanId, validEmail, cleanHospitals } from '../utils/validators.js';
import { broadcastClinicSettings, revokeSocket } from '../sockets/roomHelpers.js';

let ioInstance = null;
export const setClinicSocketIO = (io) => { ioInstance = io; };

export const getSettings = async (req, res) => {
  const clinic = await tenantStore.getClinic(req.user.clinicId);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  res.json(clinic);
};

export const updateSettings = async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanOptional(body.name, 'name', 120, 2), legalName: cleanOptional(body.legalName, 'legalName', 200, 2),
    city: cleanOptional(body.city, 'city', 100, 2), timezone: cleanTimezone(body.timezone, true),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone', true),
    hospitalOptions: cleanHospitals(body.hospitalOptions ?? body.clinicHospitals)
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  const clinic = await tenantStore.updateClinic(req.user.clinicId, payload);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  if (ioInstance) await broadcastClinicSettings(ioInstance, clinic);
  res.json(clinic);
};

export const getUsers = async (req, res) => res.json(await tenantStore.getClinicUsers(req.user.clinicId));

export const createUser = async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    email: cleanString(body.email, 'email', { required: true, max: 254 }).toLowerCase(),
    password: cleanString(body.password, 'password', { required: true, min: 10, max: 256 }),
    role: cleanString(body.role, 'role', { required: true, max: 30 })
  };
  if (!validEmail(payload.email)) throw httpError(400, 'VALIDATION_ERROR', 'Некорректный email', { field: 'email' });
  if (!['dispatcher', 'clinic_admin'].includes(payload.role)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимая роль', { field: 'role' });
  if (await tenantStore.emailExists(payload.email)) throw httpError(409, 'EMAIL_EXISTS', 'Пользователь с таким email уже существует');
  res.status(201).json(await tenantStore.createClinicUser(req.user.clinicId, payload));
};

export const updateUser = async (req, res) => {
  const targetId = cleanId(req.params.id);
  if (targetId === req.user.id && req.body?.status && req.body.status !== 'ACTIVE') throw httpError(409, 'CANNOT_DISABLE_SELF', 'Нельзя отключить собственную учётную запись');
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  if (target.role === 'clinic_owner') throw httpError(403, 'OWNER_PROTECTED', 'Учётная запись владельца защищена');
  const body = assertObject(req.body);
  const payload = { role: body.role, status: body.status, name: cleanOptional(body.name, 'name', 120, 2) };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  if (payload.role && !['dispatcher', 'clinic_admin'].includes(payload.role)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимая роль', { field: 'role' });
  if (payload.status && !['INVITED', 'ACTIVE', 'DISABLED'].includes(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус', { field: 'status' });
  if (payload.role === target.role) delete payload.role;
  const shouldRevokeCredentials = payload.role !== undefined || (payload.status !== undefined && payload.status !== 'ACTIVE');
  const updated = await tenantStore.updateClinicUser(req.user.clinicId, targetId, payload);
  if (shouldRevokeCredentials && ioInstance) {
    const reason = payload.role !== undefined ? 'ROLE_CHANGED' : `USER_${payload.status}`;
    for (const socket of ioInstance.sockets.sockets.values()) if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', reason);
  }
  res.json(updated);
};

export const deleteUser = async (req, res) => {
  const targetId = cleanId(req.params.id);
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  const decision = clinicUserDeletionDecision(req.user, target);
  if (!decision.allowed) {
    const message = decision.code === 'CANNOT_DELETE_SELF'
      ? 'Нельзя удалить собственную учётную запись'
      : 'Учётная запись владельца защищена';
    throw httpError(decision.status, decision.code, message);
  }
  if (!await tenantStore.deleteClinicUser(req.user.clinicId, targetId)) {
    throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  }
  if (ioInstance) {
    for (const socket of ioInstance.sockets.sockets.values()) {
      if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', 'USER_DELETED');
    }
  }
  res.status(204).end();
};

export const resetUserPassword = async (req, res) => {
  const targetId = cleanId(req.params.id);
  const users = await tenantStore.getClinicUsers(req.user.clinicId);
  const target = users.find(user => user.id === targetId);
  if (!target) throw httpError(404, 'USER_NOT_FOUND', 'Сотрудник не найден');
  const resetDecision = clinicPasswordResetDecision(req.user, target);
  if (!resetDecision.allowed) {
    const message = resetDecision.code === 'USE_SELF_PASSWORD_CHANGE'
      ? 'Для смены собственного пароля укажите текущий пароль'
      : 'Учётная запись владельца защищена';
    throw httpError(resetDecision.status, resetDecision.code, message);
  }
  const password = cleanString(assertObject(req.body).password, 'password', { required: true, min: 10, max: 256 });
  await tenantStore.resetClinicUserPassword(req.user.clinicId, targetId, password);
  if (ioInstance) {
    for (const socket of ioInstance.sockets.sockets.values()) if (socket.data.staffUserId === targetId) revokeSocket(socket, 'staff', 'PASSWORD_RESET');
  }
  res.status(204).end();
};
