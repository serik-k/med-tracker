import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.join(__dirname, 'orders_store.json');

export function loadSavedOrders() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const data = fs.readFileSync(dbFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.error('[FileStore] Failed to load saved orders:', err.message);
  }
  return new Map();
}

export function saveOrdersToFile(ordersMap) {
  try {
    const obj = Object.fromEntries(ordersMap);
    fs.writeFileSync(dbFilePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.error('[FileStore] Failed to persist orders to file:', err.message);
  }
}
