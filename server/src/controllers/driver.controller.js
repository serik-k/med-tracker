import { tenantStore } from '../../db/tenantStore.js';
import { orderStore } from '../../store.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString } from '../utils/validators.js';

export const respondWithDriverOrder = async (rawToken, res) => {
  const crew = await tenantStore.findCrewByAccessToken(cleanString(rawToken, 'token', { required: true, max: 200 }));
  if (!crew) throw httpError(404, 'DRIVER_LINK_INVALID', 'Ссылка бригады недействительна или истекла');
  const order = (await orderStore.getAllActiveOrders(crew.clinicId)).find(item => item.crewId === crew.id);
  if (!order) return res.status(204).end();
  return res.json(order);
};

export const driverAccessPublic = async (req, res) => {
  await respondWithDriverOrder(assertObject(req.body).token, res);
};

export const driverAccessActiveOrder = async (req, res) => {
  res.setHeader('Deprecation', 'true');
  await respondWithDriverOrder(req.params.accessToken, res);
};
