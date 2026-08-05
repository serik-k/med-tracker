import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeJsonFileAtomic } from './atomicFile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = process.env.LEGACY_DB_DIR || __dirname;
const dbFilePath = path.join(dataDirectory, 'orders_store.json');

export function loadSavedOrders() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.error('[FileStore] Failed to load saved orders:', err.message);
    throw err;
  }
  return new Map();
}

export function saveOrdersToFile(ordersMap) {
  try {
    writeJsonFileAtomic(dbFilePath, Object.fromEntries(ordersMap));
  } catch (err) {
    console.error('[FileStore] Failed to persist orders to file:', err.message);
    throw err;
  }
}
