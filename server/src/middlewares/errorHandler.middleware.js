import { StoreError } from '../../store.js';
import { httpError } from '../utils/httpErrors.js';

export const notFoundHandler = (req, _res, next) => next(httpError(404, 'NOT_FOUND', 'Маршрут API не найден'));

export const errorHandler = (error, req, res, _next) => {
  if (error?.message === 'Origin is not allowed') error = httpError(403, 'CORS_FORBIDDEN', 'Источник запроса не разрешён');
  if (error?.type === 'entity.too.large') error = httpError(413, 'PAYLOAD_TOO_LARGE', 'Размер запроса превышает допустимый');
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) error = httpError(400, 'INVALID_JSON', 'Некорректный JSON');
  if (error?.code === '23505') error = httpError(409, 'CONFLICT', 'Запись с такими данными уже существует');
  const status = error.status || (error instanceof StoreError ? error.status : 500);
  const code = error.code || (error instanceof StoreError ? error.code : 'INTERNAL_ERROR');
  const message = status >= 500 ? 'Внутренняя ошибка сервера' : error.message;
  if (status >= 500) console.error(`[${req.requestId}]`, error);
  res.status(status).json({ error: message, code, details: error.details, requestId: req.requestId });
};
