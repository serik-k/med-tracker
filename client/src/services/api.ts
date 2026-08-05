export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 0,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 12_000;

export async function apiFetch(path: string, init: ApiRequestInit = {}) {
  const controller = new AbortController();
  const { timeoutMs = DEFAULT_TIMEOUT, signal: externalSignal, headers, ...requestInit } = init;
  const abortFromExternal = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
  const timer = window.setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const response = await fetch(path, {
      ...requestInit,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers }
    });
    const isProtectedShell = /^\/(dispatcher|admin|platform)(\/|$)/.test(window.location.pathname);
    if (response.status === 401 && isProtectedShell && !['/api/auth/login', '/api/auth/me', '/api/auth/logout'].some(endpoint => path.startsWith(endpoint))) {
      window.dispatchEvent(new CustomEvent('medtracker:unauthorized'));
    }
    return response;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError('Сервер не ответил вовремя. Проверьте соединение и повторите.', 0, 'TIMEOUT');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Не удалось связаться с сервером', 0, 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

export async function readApiError(response: Response, fallback = 'Не удалось выполнить запрос') {
  const body = await response.json().catch(() => null) as {
    error?: string | { message?: string; code?: string };
    message?: string;
    code?: string;
  } | null;
  const nested = typeof body?.error === 'object' ? body.error : null;
  const message = typeof body?.error === 'string' ? body.error : nested?.message || body?.message || fallback;
  return new ApiError(message, response.status, nested?.code || body?.code);
}

export async function apiJson<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) throw await readApiError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown, fallback = 'Что-то пошло не так') {
  return error instanceof Error && error.message ? error.message : fallback;
}

function accessPhotoToken(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    return url.pathname.match(/^\/api\/access-photos\/([A-Za-z0-9_-]{32,80})$/)?.[1] || '';
  } catch {
    return '';
  }
}

export async function fetchAccessPhotoBlob(photoUrl: string, accessToken?: string, signal?: AbortSignal) {
  if (/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(photoUrl) && photoUrl.length < 1_100_000) {
    const response = await fetch(photoUrl, { signal });
    return response.blob();
  }
  const photoToken = accessPhotoToken(photoUrl);
  if (!photoToken) throw new ApiError('Некорректная ссылка на фотографию', 400, 'INVALID_PHOTO_URL');
  const response = await apiFetch(accessToken ? '/api/public/access-photo' : '/api/access-photo', {
    method: 'POST',
    headers: { Accept: 'image/jpeg,image/png,image/webp', 'Content-Type': 'application/json' },
    body: JSON.stringify(accessToken ? { photoToken, accessToken } : { photoToken }),
    signal
  });
  if (!response.ok) throw await readApiError(response, 'Не удалось загрузить защищённую фотографию');
  const blob = await response.blob();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 800 * 1024) {
    throw new ApiError('Сервер вернул некорректный файл фотографии', 502, 'INVALID_PHOTO_RESPONSE');
  }
  return blob;
}
