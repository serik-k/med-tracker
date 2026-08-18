import { StoreError } from '../../store.js';

export const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const httpError = (status, code, message, details) => Object.assign(new Error(message), { status, code, details });

export const socketError = error => ({
  ok: false,
  error: {
    code: error.code || (error instanceof StoreError ? error.code : 'INTERNAL_ERROR'),
    message: error.status >= 500 || (!error.status && !(error instanceof StoreError)) ? 'Внутренняя ошибка сервера' : error.message
  }
});

export const socketOk = payload => ({ ok: true, ...(payload || {}) });
