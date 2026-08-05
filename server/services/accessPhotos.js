import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = process.env.UPLOAD_DIR
  || path.join(process.env.LEGACY_DB_DIR || path.join(__dirname, '..', 'db'), 'uploads');
const MAX_PHOTO_BYTES = Number(process.env.MAX_ACCESS_PHOTO_BYTES || 750 * 1024);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,80}$/;

const formats = {
  'image/jpeg': { extension: 'jpg', matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: 'png', matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { extension: 'webp', matches: buffer => buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' }
};

export class PhotoError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function saveAccessPhoto(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new PhotoError('INVALID_PHOTO', 'Поддерживаются изображения JPEG, PNG и WebP');
  const format = formats[match[1]];
  let buffer;
  try { buffer = Buffer.from(match[2].replace(/[\r\n]/g, ''), 'base64'); }
  catch { throw new PhotoError('INVALID_PHOTO', 'Не удалось прочитать изображение'); }
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) throw new PhotoError('PHOTO_TOO_LARGE', 'Размер фото не должен превышать 750 КБ', 413);
  if (!format.matches(buffer)) throw new PhotoError('INVALID_PHOTO', 'Содержимое файла не соответствует формату изображения');

  fs.mkdirSync(uploadDirectory, { recursive: true, mode: 0o700 });
  const token = crypto.randomBytes(32).toString('base64url');
  const filename = `${token}.${format.extension}`;
  fs.writeFileSync(path.join(uploadDirectory, filename), buffer, { flag: 'wx', mode: 0o600 });
  return { token, url: `/api/access-photos/${token}`, mimeType: match[1], size: buffer.length };
}

export function findAccessPhoto(token) {
  if (!TOKEN_PATTERN.test(String(token || ''))) return null;
  for (const [mimeType, format] of Object.entries(formats)) {
    const filePath = path.join(uploadDirectory, `${token}.${format.extension}`);
    if (fs.existsSync(filePath)) return { filePath, mimeType };
  }
  return null;
}

export function removeAccessPhoto(photoUrl) {
  const token = String(photoUrl || '').match(/^\/api\/access-photos\/([A-Za-z0-9_-]{32,80})$/)?.[1];
  if (!token) return;
  const found = findAccessPhoto(token);
  if (found) fs.rmSync(found.filePath, { force: true });
}
