import { tenantStore } from '../../db/tenantStore.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanOptional, cleanPhone, cleanTimezone, cleanId, validEmail, cleanHospitals } from '../utils/validators.js';
import { broadcastClinicSettings, revokeSocket } from '../sockets/roomHelpers.js';

let ioInstance = null;
export const setPlatformSocketIO = (io) => { ioInstance = io; };

export const getClinics = async (_req, res) => res.json(await tenantStore.getClinics());

export const createClinic = async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanString(body.name, 'name', { required: true, min: 2, max: 120 }),
    legalName: cleanString(body.legalName, 'legalName', { required: true, min: 2, max: 200 }),
    bin: cleanString(body.bin, 'bin', { required: true, min: 12, max: 12 }),
    city: cleanString(body.city, 'city', { required: true, min: 2, max: 100 }),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone'),
    ownerName: cleanString(body.ownerName, 'ownerName', { required: true, min: 2, max: 120 }),
    ownerEmail: cleanString(body.ownerEmail, 'ownerEmail', { required: true, max: 254 }).toLowerCase(),
    ownerPassword: cleanString(body.ownerPassword, 'ownerPassword', { required: true, min: 10, max: 256 }),
    timezone: body.timezone === undefined ? undefined : cleanTimezone(body.timezone), plan: body.plan || 'START'
  };
  if (!/^\d{12}$/.test(payload.bin)) throw httpError(400, 'VALIDATION_ERROR', 'БИН должен содержать 12 цифр', { field: 'bin' });
  if (!validEmail(payload.ownerEmail)) throw httpError(400, 'VALIDATION_ERROR', 'Некорректный email владельца', { field: 'ownerEmail' });
  if (!['START', 'PRO', 'ENTERPRISE'].includes(payload.plan)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый тариф', { field: 'plan' });
  if (await tenantStore.binExists(payload.bin)) throw httpError(409, 'BIN_EXISTS', 'Клиника с таким БИН уже существует');
  if (await tenantStore.emailExists(payload.ownerEmail)) throw httpError(409, 'EMAIL_EXISTS', 'Пользователь с таким email уже существует');
  res.status(201).json(await tenantStore.createClinic(payload));
};

export const updateClinic = async (req, res) => {
  const body = assertObject(req.body);
  const payload = {
    name: cleanOptional(body.name, 'name', 120, 2), legalName: cleanOptional(body.legalName, 'legalName', 200, 2),
    city: cleanOptional(body.city, 'city', 100, 2), timezone: cleanTimezone(body.timezone, true),
    contactPhone: cleanPhone(body.contactPhone, 'contactPhone', true), hospitalOptions: cleanHospitals(body.hospitalOptions ?? body.clinicHospitals), plan: body.plan, status: body.status
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  if (payload.plan && !['START', 'PRO', 'ENTERPRISE'].includes(payload.plan)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый тариф', { field: 'plan' });
  if (payload.status && !['TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(payload.status)) throw httpError(400, 'VALIDATION_ERROR', 'Недопустимый статус', { field: 'status' });
  const clinic = await tenantStore.updateClinic(cleanId(req.params.id), payload);
  if (!clinic) throw httpError(404, 'CLINIC_NOT_FOUND', 'Клиника не найдена');
  if (ioInstance) {
    await broadcastClinicSettings(ioInstance, clinic);
    if (payload.status && payload.status !== 'ACTIVE') {
      for (const socket of ioInstance.sockets.sockets.values()) {
        if (socket.data.staffClinicId === clinic.id) revokeSocket(socket, 'staff', `CLINIC_${payload.status}`);
        else if (socket.data.driverClinicId === clinic.id) revokeSocket(socket, 'driver', `CLINIC_${payload.status}`);
        else if (socket.data.patientClinicId === clinic.id) revokeSocket(socket, socket.data.patientAccessScope || 'patient', `CLINIC_${payload.status}`);
      }
    }
  }
  res.json(clinic);
};
