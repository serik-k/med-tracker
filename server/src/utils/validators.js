import crypto from 'crypto';
import { httpError } from './httpErrors.js';

export const assertObject = value => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'INVALID_PAYLOAD', 'Ожидался JSON-объект');
  return value;
};

export const cleanString = (value, field, { min = 0, max = 255, required = false } = {}) => {
  const result = String(value ?? '').trim();
  if (required && result.length < Math.max(1, min)) throw httpError(400, 'VALIDATION_ERROR', `Поле «${field}» обязательно`, { field });
  if (result.length < min || result.length > max) throw httpError(400, 'VALIDATION_ERROR', `Поле «${field}» должно содержать от ${min} до ${max} символов`, { field });
  return result;
};

export const cleanOptional = (value, field, max = 255, min = 0) => value === undefined ? undefined : cleanString(value, field, { max, min });

export const cleanPhone = (value, field, optional = false) => {
  if (optional && value === undefined) return undefined;
  const result = cleanString(value, field, { required: true, min: 5, max: 40 });
  if (!/^[+\d\s().-]+$/.test(result) || (result.match(/\d/g) || []).length < 5) throw httpError(400, 'VALIDATION_ERROR', `Некорректный телефон в поле «${field}»`, { field });
  return result;
};

export const cleanTimezone = (value, optional = false) => {
  if (optional && value === undefined) return undefined;
  const timezone = cleanString(value, 'timezone', { required: true, min: 1, max: 80 });
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
  catch { throw httpError(400, 'VALIDATION_ERROR', 'Укажите корректный часовой пояс IANA', { field: 'timezone' }); }
  return timezone;
};

export const cleanId = (value, field = 'id', nullable = false) => {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  const result = cleanString(value, field, { required: true, max: 100 });
  if (!/^[\p{L}\p{N}_-]+$/u.test(result)) throw httpError(400, 'VALIDATION_ERROR', `Некорректное поле «${field}»`, { field });
  return result;
};

export const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const cleanHospitals = value => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 50) throw httpError(400, 'VALIDATION_ERROR', 'Список стационаров должен содержать не более 50 элементов', { field: 'hospitalOptions' });
  return value.map((item, index) => {
    assertObject(item);
    const sourceLocation = item.location && typeof item.location === 'object' ? item.location : item;
    if (sourceLocation.lat === '' || sourceLocation.lat === null || sourceLocation.lat === undefined || sourceLocation.lng === '' || sourceLocation.lng === null || sourceLocation.lng === undefined) throw httpError(400, 'VALIDATION_ERROR', `Не указаны координаты стационара №${index + 1}`, { field: `hospitalOptions.${index}.location` });
    const lat = Number(sourceLocation.lat);
    const lng = Number(sourceLocation.lng);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) throw httpError(400, 'VALIDATION_ERROR', `Некорректные координаты стационара №${index + 1}`, { field: `hospitalOptions.${index}.location` });
    return {
      id: item.id ? cleanId(item.id, `hospitalOptions.${index}.id`) : `hospital_${crypto.randomUUID()}`,
      name: cleanString(item.name, `hospitalOptions.${index}.name`, { required: true, min: 2, max: 160 }),
      address: cleanOptional(item.address, `hospitalOptions.${index}.address`, 300) || '',
      lat, lng, location: { lat, lng }
    };
  });
};

export const cleanPhotoToken = value => {
  const photoToken = cleanString(value, 'photoToken', { required: true, min: 32, max: 80 });
  if (!/^[A-Za-z0-9_-]+$/.test(photoToken)) throw httpError(400, 'INVALID_PHOTO_TOKEN', 'Некорректный идентификатор фото');
  return photoToken;
};

export const cleanHandshakeToken = value => {
  return typeof value === 'string' && value.length <= 200 ? value : '';
};
