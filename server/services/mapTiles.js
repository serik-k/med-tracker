const DEVELOPMENT_TILE_TEMPLATE = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_TILE_BYTES = 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/webp']);
const matchesContent = (contentType, body) => contentType === 'image/png'
  ? body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  : body.length >= 12 && body.subarray(0, 4).toString('ascii') === 'RIFF' && body.subarray(8, 12).toString('ascii') === 'WEBP';
let providerWarningEmitted = false;
const memoryCache = new Map();
const inFlightTiles = new Map();
let memoryCacheBytes = 0;
let activeDownloads = 0;

export class TileError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'TileError';
    this.code = code;
    this.status = status;
  }
}

const positiveInteger = (value, fallback, maximum) => {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
};

const tileTemplate = override => {
  const configured = String(override ?? process.env.TILE_BASE_URL ?? '').trim();
  const candidate = configured || (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_TILE_TEMPLATE);
  if (!candidate) {
    if (!providerWarningEmitted) console.warn('[MapTiles] Disabled: TILE_BASE_URL is required in production');
    providerWarningEmitted = true;
    return null;
  }
  if (!candidate.includes('{z}') || !candidate.includes('{x}') || !candidate.includes('{y}')) {
    if (!providerWarningEmitted) console.warn('[MapTiles] Disabled: TILE_BASE_URL must contain {z}, {x} and {y} placeholders');
    providerWarningEmitted = true;
    return null;
  }
  try {
    const parsed = new URL(candidate.replaceAll('{z}', '0').replaceAll('{x}', '0').replaceAll('{y}', '0').replaceAll('{ext}', 'png'));
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return candidate;
  } catch {
    if (!providerWarningEmitted) console.warn('[MapTiles] Disabled: TILE_BASE_URL must be a valid HTTP(S) URL template');
    providerWarningEmitted = true;
    return null;
  }
};

if (process.env.NODE_ENV === 'production' && !process.env.TILE_BASE_URL) tileTemplate();

export const validTileCoordinates = (z, x, y) => {
  if (![z, x, y].every(Number.isSafeInteger) || z < 0 || z > 19) return false;
  const dimension = 2 ** z;
  return x >= 0 && x < dimension && y >= 0 && y < dimension;
};

async function downloadMapTile(z, x, y, template, options) {
  const url = template.replaceAll('{z}', String(z)).replaceAll('{x}', String(x)).replaceAll('{y}', String(y)).replaceAll('{ext}', 'png');
  const timeoutMs = positiveInteger(options.timeoutMs ?? process.env.TILE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 30_000);
  const maxBytes = positiveInteger(options.maxBytes ?? process.env.MAX_TILE_BYTES, DEFAULT_MAX_TILE_BYTES, 5 * 1024 * 1024);

  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
      headers: { Accept: 'image/webp,image/png;q=0.9' }
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new TileError('TILE_PROVIDER_TIMEOUT', 'Провайдер карт не ответил вовремя', 504);
    throw new TileError('TILE_PROVIDER_UNAVAILABLE', 'Провайдер карт недоступен', 502);
  }
  if (!response.ok) throw new TileError('TILE_PROVIDER_ERROR', 'Провайдер карт вернул ошибку', 502);
  const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) throw new TileError('INVALID_TILE_RESPONSE', 'Провайдер вернул неподдерживаемый формат тайла', 502);
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new TileError('TILE_TOO_LARGE', 'Размер тайла превышает допустимый', 502);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new TileError('INVALID_TILE_RESPONSE', 'Провайдер вернул пустой тайл', 502);
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new TileError('TILE_TOO_LARGE', 'Размер тайла превышает допустимый', 502);
    }
    chunks.push(Buffer.from(value));
  }
  if (!totalBytes) throw new TileError('INVALID_TILE_RESPONSE', 'Провайдер вернул пустой тайл', 502);
  const body = Buffer.concat(chunks, totalBytes);
  if (!matchesContent(contentType, body)) throw new TileError('INVALID_TILE_RESPONSE', 'Содержимое тайла не соответствует заявленному формату', 502);
  return { body, contentType };
}

const cachedTile = (key, now, ttlMs) => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (now - cached.createdAt > ttlMs) {
    memoryCache.delete(key);
    memoryCacheBytes -= cached.body.length;
    return null;
  }
  memoryCache.delete(key);
  memoryCache.set(key, cached);
  return { body: cached.body, contentType: cached.contentType };
};

const rememberTile = (key, tile, now, maximumBytes) => {
  if (tile.body.length > maximumBytes) return;
  const existing = memoryCache.get(key);
  if (existing) memoryCacheBytes -= existing.body.length;
  memoryCache.delete(key);
  while (memoryCache.size && memoryCacheBytes + tile.body.length > maximumBytes) {
    const oldestKey = memoryCache.keys().next().value;
    const oldest = memoryCache.get(oldestKey);
    memoryCache.delete(oldestKey);
    memoryCacheBytes -= oldest.body.length;
  }
  memoryCache.set(key, { ...tile, createdAt: now });
  memoryCacheBytes += tile.body.length;
};

export async function fetchMapTile(z, x, y, options = {}) {
  if (!validTileCoordinates(z, x, y)) throw new TileError('INVALID_TILE', 'Некорректные координаты тайла', 400);
  const template = tileTemplate(options.baseUrl);
  if (!template) throw new TileError('TILE_PROVIDER_NOT_CONFIGURED', 'Провайдер карт не настроен', 503);
  const cacheKey = `${template}\u0000${z}/${x}/${y}`;
  const cacheSeconds = positiveInteger(options.cacheSeconds ?? process.env.TILE_MEMORY_CACHE_SECONDS, 3_600, 86_400);
  const maximumCacheBytes = positiveInteger(options.cacheBytes ?? process.env.TILE_MEMORY_CACHE_BYTES, 32 * 1024 * 1024, 256 * 1024 * 1024);
  const now = Date.now();
  if (options.cache !== false) {
    const cached = cachedTile(cacheKey, now, cacheSeconds * 1_000);
    if (cached) return cached;
    if (inFlightTiles.has(cacheKey)) return inFlightTiles.get(cacheKey);
  }

  const maximumConcurrency = positiveInteger(options.maxConcurrency ?? process.env.TILE_MAX_CONCURRENCY, 16, 128);
  if (activeDownloads >= maximumConcurrency) throw new TileError('TILE_PROXY_BUSY', 'Прокси карт временно перегружен', 503);
  activeDownloads += 1;
  const task = downloadMapTile(z, x, y, template, options);
  if (options.cache !== false) inFlightTiles.set(cacheKey, task);
  try {
    const tile = await task;
    if (options.cache !== false) rememberTile(cacheKey, tile, Date.now(), maximumCacheBytes);
    return tile;
  } finally {
    activeDownloads -= 1;
    if (inFlightTiles.get(cacheKey) === task) inFlightTiles.delete(cacheKey);
  }
}
