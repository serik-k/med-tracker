import pg from 'pg';

const { Pool } = pg;

export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_SIZE || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false
  });
}

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

export async function withTenant(pool, context, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_clinic_id', $1, true)", [context.clinicId || '']);
    await client.query("SELECT set_config('app.is_platform_admin', $1, true)", [context.isPlatformAdmin ? 'true' : 'false']);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
