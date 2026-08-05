import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function writeJsonFileAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    // Some Windows filesystems reject POSIX-style replace-by-rename. File mode
    // is development-only; keep a bounded fallback that still fsyncs a fully
    // written temporary file before replacing the destination.
    if (process.platform !== 'win32' || !['EPERM', 'EEXIST', 'EACCES'].includes(error.code)) {
      fs.rmSync(temporaryPath, { force: true });
      throw error;
    }
    try {
      fs.copyFileSync(temporaryPath, filePath);
      fs.chmodSync(filePath, 0o600);
    } finally {
      fs.rmSync(temporaryPath, { force: true });
    }
  }
}
