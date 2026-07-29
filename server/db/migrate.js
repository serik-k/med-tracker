import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(__dirname, 'migrations');
const pool = createPool(process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL);

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Set((await pool.query('SELECT filename FROM schema_migrations')).rows.map(row => row.filename));
  const files = fs.readdirSync(migrationsDirectory).filter(file => file.endsWith('.sql')).sort();
  for (const filename of files) {
    if (applied.has(filename)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8'));
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`[Database] Applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
