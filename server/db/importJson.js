import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool } from './database.js';
import { loadSavedOrders } from './fileStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacyDirectory = process.env.LEGACY_DB_DIR || __dirname;
const platformPath = path.join(legacyDirectory, 'platform_store.json');
if (!fs.existsSync(platformPath)) throw new Error(`Legacy platform store was not found: ${platformPath}`);

const pool = createPool(process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL);
const hashToken = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomTokenHash = () => hashToken(crypto.randomBytes(32).toString('base64url'));
const platform = JSON.parse(fs.readFileSync(platformPath, 'utf8'));
const orders = Array.from(loadSavedOrders().entries()).map(([key, order]) => ({ key, order }))
  .sort((a, b) => new Date(b.order.createdAt || 0) - new Date(a.order.createdAt || 0));
const knownCrews = new Set(platform.crews.map(crew => `${crew.clinicId}:${crew.id}`));
const activeCrewAssignments = new Set();
const activeStatuses = new Set(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT']);
const validLocation = value => value && Number.isFinite(Number(value.lat)) && Math.abs(Number(value.lat)) <= 90 && Number.isFinite(Number(value.lng)) && Math.abs(Number(value.lng)) <= 180;
const client = await pool.connect();
let importedOrders = 0;

try {
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.current_clinic_id', '', true)");
  await client.query("SELECT set_config('app.is_platform_admin', 'true', true)");

  for (const clinic of platform.clinics || []) {
    await client.query(`INSERT INTO clinics (id,name,legal_name,bin,city,timezone,contact_phone,hospital_options,plan,status,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,legal_name=EXCLUDED.legal_name,bin=EXCLUDED.bin,city=EXCLUDED.city,
      timezone=EXCLUDED.timezone,contact_phone=EXCLUDED.contact_phone,hospital_options=EXCLUDED.hospital_options,plan=EXCLUDED.plan,status=EXCLUDED.status`,
    [clinic.id, clinic.name, clinic.legalName, clinic.bin, clinic.city, clinic.timezone || 'Asia/Almaty', clinic.contactPhone,
      clinic.hospitalOptions || [], clinic.plan || 'START', clinic.status || 'ACTIVE', clinic.createdAt || new Date()]);
  }

  for (const user of platform.users || []) {
    await client.query(`INSERT INTO users (id,clinic_id,name,email,role,password_hash,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET clinic_id=EXCLUDED.clinic_id,name=EXCLUDED.name,email=EXCLUDED.email,
      role=EXCLUDED.role,password_hash=EXCLUDED.password_hash,status=EXCLUDED.status`,
    [user.id, user.clinicId, user.name, user.email, user.role, user.passwordHash, user.status || 'ACTIVE']);
  }

  for (const crew of platform.crews || []) {
    await client.query(`INSERT INTO crews (id,clinic_id,name,car_plate,type,driver_name,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (clinic_id,id) DO UPDATE SET name=EXCLUDED.name,car_plate=EXCLUDED.car_plate,type=EXCLUDED.type,
      driver_name=EXCLUDED.driver_name,status=EXCLUDED.status,archived_at=NULL`,
    [crew.id, crew.clinicId, crew.name, crew.carPlate, crew.type, crew.driverName, crew.status || 'ON_DUTY']);
    // Legacy driver secrets may have been predictable. Revoke all of them and
    // require an administrator to issue a fresh link through the application.
    await client.query('UPDATE crew_access_tokens SET revoked_at=now() WHERE clinic_id=$1 AND crew_id=$2 AND revoked_at IS NULL', [crew.clinicId, crew.id]);
    await client.query(`INSERT INTO crew_access_tokens (token_hash,clinic_id,crew_id,expires_at)
      VALUES ($1,$2,$3,now()+interval '30 days')`, [randomTokenHash(), crew.clinicId, crew.id]);
  }

  for (const { key, order } of orders) {
    const clinicId = order.clinicId || 'clinic_medclinic_almaty';
    if (!validLocation(order.destinationLoc)) {
      console.warn(`[Database] Skipped ${order.id || key}: destination coordinates are missing or invalid`);
      continue;
    }
    // Never carry a legacy patient secret forward, even as a hash. The raw
    // token may already exist in repository history or logs. Imported active
    // orders remain visible to staff by access_id, but public access stays
    // revoked until staff explicitly issues a new patient/viewer link.
    const tokenDigest = randomTokenHash();
    const explicitCrewId = order.crewId ? String(order.crewId) : null;
    const assignmentKey = `${clinicId}:${explicitCrewId}`;
    const canAssign = explicitCrewId && knownCrews.has(assignmentKey)
      && (!activeStatuses.has(order.status) || !activeCrewAssignments.has(assignmentKey));
    const crewId = canAssign ? explicitCrewId : null;
    if (crewId && activeStatuses.has(order.status)) activeCrewAssignments.add(assignmentKey);
    const terminalAt = order.completedAt || order.cancelledAt || new Date();
    const expiresAt = terminalAt;
    const legacyIdentity = `${clinicId}:${order.id || key}`;
    const stableAccessId = order.accessId || (!String(key).startsWith('trk_') ? key : null)
      || `ord_${hashToken(`legacy:${legacyIdentity}`).slice(0, 30)}`;
    const stableBusinessId = order.id || `ORD-${hashToken(`business:${legacyIdentity}`).slice(0, 8).toUpperCase()}`;
    const accessInfo = order.accessInfo && typeof order.accessInfo === 'object' && !Array.isArray(order.accessInfo)
      ? { ...order.accessInfo }
      : {};
    delete accessInfo.photoUrl;

    const imported = await client.query(`INSERT INTO orders (
      token_hash,access_id,business_id,clinic_id,crew_id,patient_name,patient_phone,address,priority,status,hospital_name,
      destination,hospital_location,current_location,route_path,eta_minutes,distance_km,access_info,symptoms,sos_alert,sos_time,
      is_simulating,expires_at,assigned_at,location_updated_at,eta_updated_at,completed_at,cancelled_at,cancel_reason,created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'[]'::jsonb,NULL,NULL,$15,$16,$17,$18,false,$19,$20,$21,NULL,$22,$23,$24,$25)
    ON CONFLICT (clinic_id,business_id) DO UPDATE SET
      token_hash=EXCLUDED.token_hash,
      expires_at=EXCLUDED.expires_at,
      viewer_token_hash=NULL,
      viewer_expires_at=NULL
    RETURNING token_hash`, [
      tokenDigest, stableAccessId, stableBusinessId, clinicId, crewId,
      order.patientName || 'Пациент', order.patientPhone || '', order.address || '', order.priority || 'EMERGENCY', order.status || 'ACCEPTED',
      order.hospitalName || null, order.destinationLoc, order.hospitalLocation || null, validLocation(order.currentLoc) ? order.currentLoc : null,
      accessInfo, order.symptoms || [], Boolean(order.sosAlert), order.sosTime || null, expiresAt,
      crewId ? (order.assignedAt || order.createdAt || new Date()) : null, order.locationUpdatedAt || null,
      order.completedAt || null, order.cancelledAt || null, order.cancelReason || null, order.createdAt || new Date()
    ]);
    const importedTokenDigest = String(imported.rows[0].token_hash).trim();
    for (const log of order.auditLogs || []) {
      await client.query(`INSERT INTO audit_logs (clinic_id,order_token_hash,event,message,metadata,created_at)
        SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (
          SELECT 1 FROM audit_logs WHERE order_token_hash=$2 AND event=$3 AND message=$4 AND created_at=$6
        )`, [clinicId, importedTokenDigest, log.event || 'IMPORTED', log.text || 'Импортировано', log.metadata || {}, log.timestamp || new Date()]);
    }
    importedOrders += 1;
  }

  await client.query('COMMIT');
  console.log(`[Database] Imported ${(platform.clinics || []).length} clinics, ${(platform.users || []).length} users, ${(platform.crews || []).length} crews and ${importedOrders} orders`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
