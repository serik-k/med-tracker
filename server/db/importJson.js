import crypto from 'crypto';
import { createPool } from './database.js';
import { tenantStore } from './tenantStore.js';
import { loadSavedOrders } from './fileStore.js';

const pool = createPool(process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL);
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const getCrewId = value => String(value || '').match(/№\s*(\d+)/)?.[1] || String(value || '').match(/\b(\d{3})\b/)?.[1] || null;
const platform = tenantStore.exportData();
const orders = Array.from(loadSavedOrders().values());
const knownCrews = new Set(platform.crews.map(crew => `${crew.clinicId}:${crew.id}`));
const client = await pool.connect();

try {
  await client.query('BEGIN');
  for (const clinic of platform.clinics) {
    await client.query(`INSERT INTO clinics (id, name, legal_name, bin, city, timezone, contact_phone, plan, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, legal_name=EXCLUDED.legal_name, bin=EXCLUDED.bin, city=EXCLUDED.city, timezone=EXCLUDED.timezone, contact_phone=EXCLUDED.contact_phone, plan=EXCLUDED.plan, status=EXCLUDED.status`,
      [clinic.id, clinic.name, clinic.legalName, clinic.bin, clinic.city, clinic.timezone, clinic.contactPhone, clinic.plan, clinic.status, clinic.createdAt || new Date()]);
  }

  for (const user of platform.users) {
    await client.query(`INSERT INTO users (id, clinic_id, name, email, role, password_hash, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET clinic_id=EXCLUDED.clinic_id, name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, password_hash=EXCLUDED.password_hash, status=EXCLUDED.status`,
      [user.id, user.clinicId, user.name, user.email, user.role, user.passwordHash, user.status]);
  }

  for (const crew of platform.crews) {
    await client.query(`INSERT INTO crews (id, clinic_id, name, car_plate, type, driver_name, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (clinic_id, id) DO UPDATE SET name=EXCLUDED.name, car_plate=EXCLUDED.car_plate, type=EXCLUDED.type, driver_name=EXCLUDED.driver_name, status=EXCLUDED.status`,
      [crew.id, crew.clinicId, crew.name, crew.carPlate, crew.type, crew.driverName, crew.status]);
    if (crew.accessTokenHash) {
      await client.query(`INSERT INTO crew_access_tokens (token_hash, clinic_id, crew_id) VALUES ($1,$2,$3)
        ON CONFLICT (token_hash) DO UPDATE SET clinic_id=EXCLUDED.clinic_id, crew_id=EXCLUDED.crew_id, revoked_at=NULL`,
        [crew.accessTokenHash, crew.clinicId, crew.id]);
    }
  }

  for (const order of orders) {
    const clinicId = order.clinicId || 'clinic_medclinic_almaty';
    const parsedCrewId = getCrewId(order.carNumber);
    const crewId = knownCrews.has(`${clinicId}:${parsedCrewId}`) ? parsedCrewId : null;
    const expiresAt = order.completedAt || (order.expired ? new Date().toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    await client.query(`INSERT INTO orders (
      token_hash, business_id, clinic_id, crew_id, patient_name, patient_phone, address, priority, status, hospital_name,
      destination, current_location, route_path, eta_minutes, distance_km, access_info, symptoms, sos_alert, sos_time,
      is_simulating, expires_at, completed_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    ON CONFLICT (token_hash) DO NOTHING`, [
      hashToken(order.token), order.id, clinicId, crewId, order.patientName, order.patientPhone, order.address,
      order.priority || 'EMERGENCY', order.status, order.hospitalName || null, order.destinationLoc, order.currentLoc,
      order.routePath || [], order.etaMinutes || null, order.distanceKm || null, order.accessInfo || {}, order.symptoms || [],
      Boolean(order.sosAlert), order.sosTime || null, Boolean(order.isSimulating), expiresAt, order.completedAt || null, order.createdAt || new Date()
    ]);
    for (const log of order.auditLogs || []) {
      await client.query(`INSERT INTO audit_logs (clinic_id, order_token_hash, event, message, created_at)
        SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS (
          SELECT 1 FROM audit_logs WHERE order_token_hash=$2 AND event=$3 AND message=$4 AND created_at=$5
        )`, [clinicId, hashToken(order.token), log.event, log.text, log.timestamp || new Date()]);
    }
  }

  await client.query('COMMIT');
  console.log(`[Database] Imported ${platform.clinics.length} clinics, ${platform.users.length} users, ${platform.crews.length} crews and ${orders.length} orders`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
