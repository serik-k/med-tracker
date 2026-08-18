import { tenantStore } from '../../db/tenantStore.js';
import { orderStore } from '../../store.js';
import { findAccessPhoto } from '../../services/accessPhotos.js';
import { ACTIVE_STATUSES } from '../config/constants.js';
import { httpError } from '../utils/httpErrors.js';
import { assertObject, cleanString, cleanPhotoToken } from '../utils/validators.js';

export const sendAccessPhoto = async (photoToken, clinicId, res) => {
  const storage = tenantStore.mode === 'postgres' ? { pool: tenantStore.pool, clinicId } : {};
  const photo = await findAccessPhoto(photoToken, storage);
  if (!photo) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  res.type(photo.mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  return photo.data ? res.send(photo.data) : res.sendFile(photo.filePath);
};

export const accessPhotoAuth = async (req, res) => {
  const photoToken = cleanPhotoToken(assertObject(req.body).photoToken);
  const url = `/api/access-photos/${photoToken}`;
  const order = await orderStore.getOrderByPhotoUrl(url);
  if (!order) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  if (order.clinicId !== req.user.clinicId) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено');
  if (order.clinicStatus !== 'ACTIVE' || order.expired || !ACTIVE_STATUSES.has(order.status)) throw httpError(410, 'PHOTO_EXPIRED', 'Доступ к фото завершён');
  await sendAccessPhoto(photoToken, order.clinicId, res);
};

export const accessPhotoPublic = async (req, res) => {
  const body = assertObject(req.body);
  const photoToken = cleanPhotoToken(body.photoToken);
  const accessToken = cleanString(body.accessToken, 'accessToken', { required: true, max: 200 });
  const expectedPhotoUrl = `/api/access-photos/${photoToken}`;
  let authorizedOrder = await orderStore.getPatientOrder(accessToken);
  if (authorizedOrder && (authorizedOrder.expired || authorizedOrder.clinicStatus !== 'ACTIVE' || !ACTIVE_STATUSES.has(authorizedOrder.status))) authorizedOrder = null;
  if (!authorizedOrder) {
    const crew = await tenantStore.findCrewByAccessToken(accessToken);
    if (crew) authorizedOrder = (await orderStore.getAllActiveOrders(crew.clinicId)).find(order => order.crewId === crew.id) || null;
  }
  if (!authorizedOrder || authorizedOrder.accessInfo?.photoUrl !== expectedPhotoUrl) throw httpError(404, 'PHOTO_NOT_FOUND', 'Фото не найдено или ссылка доступа недействительна');
  await sendAccessPhoto(photoToken, authorizedOrder.clinicId, res);
};

export const retiredGetAccessPhoto = async (_req, res) => {
  res.setHeader('Deprecation', 'true');
  throw httpError(410, 'PHOTO_GET_RETIRED', 'Используйте защищённый POST-запрос для загрузки фото');
};
