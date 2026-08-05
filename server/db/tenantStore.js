import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPool, databaseConfigured, withTenant } from './database.js';
import { writeJsonFileAtomic } from './atomicFile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.LEGACY_DB_DIR || __dirname;
const filePath = path.join(dataDirectory, 'platform_store.json');
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 24) * 60 * 60 * 1000;
const DRIVER_TOKEN_TTL_MS = Number(process.env.DRIVER_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;
const KNOWN_DEMO_TOKEN_HASHES = new Set([
  '73d9b20c20c3118e4d7c403e6905dacaf0c8a743e9537727a57c303284f1f247',
  'a8e96ea1843158746e84a7d5927eaa2b0730ce30999d757bf3aaae8c409269ab',
  '7ddf15882017a240f7dabe0a9ce82e0065c3a9e0a4cf97e80e9b0e9ee6481e78',
  'a46eec5192fb90f572c167f026cd42ceb5745a53e0bbf625b954e3cc36053427'
]);

const id = prefix => `${prefix}_${crypto.randomUUID()}`;
const token = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = value => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const seedPassword = (envName, fallback) => {
  const value = process.env[envName];
  if (process.env.NODE_ENV === 'production' && !value) throw new Error(`${envName} is required in production`);
  if (process.env.NODE_ENV === 'production' && String(value).length < 10) throw new Error(`${envName} must contain at least 10 characters`);
  return value || fallback;
};

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString('hex')}`;
}

const DUMMY_PASSWORD_HASH = hashPassword(crypto.randomBytes(32).toString('base64url'));
const derivePassword = (password, salt) => new Promise((resolve, reject) => {
  crypto.scrypt(String(password || ''), salt, 64, (error, result) => error ? reject(error) : resolve(result));
});

async function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = await derivePassword(password, salt);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function seedData() {
  const medClinicId = 'clinic_medclinic_almaty';
  const sanaClinicId = 'clinic_sana_almaty';
  const expiresAt = new Date(Date.now() + DRIVER_TOKEN_TTL_MS).toISOString();
  const crew = (crewId, clinicId, name, carPlate, type, driverName) => ({
    id: crewId,
    clinicId,
    name,
    carPlate,
    type,
    driverName,
    status: 'ON_DUTY',
    accessTokenHash: hashToken(token()),
    accessTokenExpiresAt: expiresAt,
    currentLoc: null,
    locationUpdatedAt: null
  });

  return {
    clinics: [
      { id: medClinicId, name: 'MedClinic Almaty', legalName: 'ТОО «MedClinic Almaty»', bin: '230140012345', city: 'Алматы', timezone: 'Asia/Almaty', contactPhone: '+7 727 000 00 00', hospitalOptions: [], plan: 'PRO', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: sanaClinicId, name: 'Sana Clinic', legalName: 'ТОО «Sana Clinic»', bin: '240240065432', city: 'Алматы', timezone: 'Asia/Almaty', contactPhone: '+7 727 111 22 33', hospitalOptions: [], plan: 'START', status: 'ACTIVE', createdAt: new Date().toISOString() }
    ],
    users: [
      { id: 'user_platform_admin', clinicId: null, name: 'Администратор MedTracker', email: 'platform@medtracker.kz', role: 'platform_admin', passwordHash: hashPassword(seedPassword('SEED_PLATFORM_PASSWORD', 'Admin123!')), status: 'ACTIVE' },
      { id: 'user_med_owner', clinicId: medClinicId, name: 'Владелец MedClinic', email: 'admin@medclinic.kz', role: 'clinic_owner', passwordHash: hashPassword(seedPassword('SEED_CLINIC_PASSWORD', 'Clinic123!')), status: 'ACTIVE' },
      { id: 'user_med_dispatcher', clinicId: medClinicId, name: 'Диспетчер MedClinic', email: 'dispatcher@medclinic.kz', role: 'dispatcher', passwordHash: hashPassword(seedPassword('SEED_DISPATCHER_PASSWORD', 'Dispatch123!')), status: 'ACTIVE' },
      { id: 'user_sana_owner', clinicId: sanaClinicId, name: 'Владелец Sana Clinic', email: 'admin@sana.kz', role: 'clinic_owner', passwordHash: hashPassword(seedPassword('SEED_CLINIC_PASSWORD', 'Clinic123!')), status: 'ACTIVE' }
    ],
    sessions: [],
    crews: [
      crew('101', medClinicId, 'Бригада №101', '01 KZ 101 MED', 'РЕАНИМАЦИЯ', 'Алмасов К.'),
      crew('102', medClinicId, 'Бригада №102', '02 KZ 102 MED', 'ПЕДИАТРИЧЕСКАЯ', 'Иванов С.'),
      crew('103', medClinicId, 'Бригада №103', '02 KZ 777 ABC', 'ЛИНЕЙНАЯ', 'Нурланов Б.'),
      crew('201', sanaClinicId, 'Бригада №201', '02 KZ 201 MED', 'ЛИНЕЙНАЯ', 'Сериков А.')
    ]
  };
}

const publicClinic = row => ({
  id: row.id,
  name: row.name,
  legalName: row.legal_name ?? row.legalName,
  bin: row.bin,
  city: row.city,
  timezone: row.timezone,
  contactPhone: row.contact_phone ?? row.contactPhone,
  hospitalOptions: row.hospital_options ?? row.hospitalOptions ?? [],
  plan: row.plan,
  status: row.status,
  createdAt: row.created_at?.toISOString?.() || row.created_at || row.createdAt,
  updatedAt: row.updated_at?.toISOString?.() || row.updated_at || row.updatedAt || null
});

const publicCrew = row => ({
  id: String(row.id),
  clinicId: row.clinic_id ?? row.clinicId,
  name: row.name,
  carPlate: row.car_plate ?? row.carPlate,
  type: row.type,
  driverName: row.driver_name ?? row.driverName,
  status: row.status,
  currentLoc: row.current_location ?? row.currentLoc ?? null,
  locationUpdatedAt: row.location_updated_at?.toISOString?.() || row.location_updated_at || row.locationUpdatedAt || null,
  hospitalOptions: row.hospital_options ?? row.hospitalOptions ?? [],
  clinicHospitals: row.hospital_options ?? row.hospitalOptions ?? [],
  createdAt: row.created_at?.toISOString?.() || row.created_at || row.createdAt,
  updatedAt: row.updated_at?.toISOString?.() || row.updated_at || row.updatedAt,
  archivedAt: row.archived_at?.toISOString?.() || row.archived_at || row.archivedAt || null
});

class TenantStore {
  constructor() {
    this.mode = databaseConfigured() ? 'postgres' : 'file';
    this.pool = this.mode === 'postgres' ? createPool() : null;
    this.ready = false;
    this.data = null;
    this.revokeClinicPublicAccess = null;
  }

  registerClinicPublicAccessRevoker(revoker) {
    this.revokeClinicPublicAccess = typeof revoker === 'function' ? revoker : null;
  }

  async init() {
    if (this.ready) return;
    if (this.mode === 'postgres') {
      await this.pool.query('SELECT 1');
      await this.seedPostgresIfEmpty();
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('DATABASE_URL is required in production; file fallback is development-only');
      }
      this.loadFileData();
    }
    this.ready = true;
  }

  loadFileData() {
    try { this.data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : seedData(); }
    catch (error) {
      console.error('[TenantStore] Failed to load local data:', error.message);
      throw error;
    }
    this.data.sessions ||= [];
    this.data.crews ||= [];
    let repaired = false;
    for (const crew of this.data.crews) {
      if (!crew.accessTokenExpiresAt || KNOWN_DEMO_TOKEN_HASHES.has(crew.accessTokenHash)) {
        crew.accessTokenHash = hashToken(token());
        crew.accessTokenExpiresAt = new Date(Date.now() + DRIVER_TOKEN_TTL_MS).toISOString();
        repaired = true;
      }
    }
    if (repaired || !fs.existsSync(filePath)) this.persist();
  }

  async seedPostgresIfEmpty() {
    await withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const { rows: [{ count }] } = await client.query('SELECT count(*)::int AS count FROM clinics');
      if (count > 0) return;
      const seeds = seedData();

      for (const clinic of seeds.clinics) {
        await client.query(`INSERT INTO clinics (id,name,legal_name,bin,city,timezone,contact_phone,plan,status,created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [clinic.id, clinic.name, clinic.legalName, clinic.bin, clinic.city, clinic.timezone, clinic.contactPhone, clinic.plan, clinic.status, clinic.createdAt]);
      }
      for (const user of seeds.users) {
        await client.query(`INSERT INTO users (id,clinic_id,name,email,role,password_hash,status)
          VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [user.id, user.clinicId, user.name, user.email, user.role, user.passwordHash, user.status]);
      }
      for (const crew of seeds.crews) {
        await client.query(`INSERT INTO crews (id,clinic_id,name,car_plate,type,driver_name,status,current_location,location_updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [crew.id, crew.clinicId, crew.name, crew.carPlate, crew.type, crew.driverName, crew.status, crew.currentLoc, crew.locationUpdatedAt]);
        await client.query(`INSERT INTO crew_access_tokens (token_hash,clinic_id,crew_id,expires_at)
          VALUES ($1,$2,$3,$4)`, [crew.accessTokenHash, crew.clinicId, crew.id, crew.accessTokenExpiresAt]);
      }
    });
  }

  persist() {
    if (this.mode !== 'file') return;
    writeJsonFileAtomic(filePath, this.data);
  }

  async health() {
    if (!this.ready) return false;
    if (this.mode === 'file') return true;
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close() {
    if (this.pool) await this.pool.end();
    this.ready = false;
  }

  publicUser(user) {
    return {
      id: user.id,
      clinicId: user.clinic_id ?? user.clinicId ?? null,
      clinicName: user.clinic_name ?? user.clinicName ?? null,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at?.toISOString?.() || user.created_at || user.createdAt || null
    };
  }

  async login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return null;
    const rawToken = token();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    if (this.mode === 'file') {
      const user = this.data.users.find(item => item.email.toLowerCase() === normalizedEmail && item.status === 'ACTIVE');
      const clinic = user?.clinicId ? this.data.clinics.find(item => item.id === user.clinicId) : null;
      const observedHash = user?.passwordHash || DUMMY_PASSWORD_HASH;
      const passwordValid = await verifyPassword(password, observedHash);
      if (!user || user.passwordHash !== observedHash || !passwordValid || user.status !== 'ACTIVE' || (clinic && clinic.status !== 'ACTIVE')) return null;
      this.cleanupSessions();
      this.data.sessions.push({ tokenHash: hashToken(rawToken), userId: user.id, expiresAt: expiresAt.toISOString() });
      this.persist();
      return { token: rawToken, user: this.publicUser({ ...user, clinicName: clinic?.name || null }) };
    }

    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const { rows } = await client.query(`SELECT u.*, c.name AS clinic_name, c.status AS clinic_status
        FROM users u LEFT JOIN clinics c ON c.id=u.clinic_id WHERE lower(u.email)=$1 LIMIT 1 FOR UPDATE OF u`, [normalizedEmail]);
      const user = rows[0];
      const passwordValid = await verifyPassword(password, user?.password_hash || DUMMY_PASSWORD_HASH);
      if (!user || user.status !== 'ACTIVE' || (user.clinic_id && user.clinic_status !== 'ACTIVE') || !passwordValid) return null;
      await client.query('DELETE FROM sessions WHERE expires_at <= now()');
      await client.query('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)', [hashToken(rawToken), user.id, expiresAt]);
      return { token: rawToken, user: this.publicUser(user) };
    });
  }

  async authenticate(rawToken) {
    if (!rawToken) return null;
    const digest = hashToken(rawToken);
    if (this.mode === 'file') {
      const session = this.data.sessions.find(item => item.tokenHash === digest && new Date(item.expiresAt).getTime() > Date.now());
      const user = session && this.data.users.find(item => item.id === session.userId && item.status === 'ACTIVE');
      const clinic = user?.clinicId ? this.data.clinics.find(item => item.id === user.clinicId && item.status === 'ACTIVE') : null;
      if (!user || (user.clinicId && !clinic)) return null;
      return this.publicUser({ ...user, clinicName: clinic?.name || null });
    }
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const { rows } = await client.query(`SELECT u.*, c.name AS clinic_name, c.status AS clinic_status
        FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN clinics c ON c.id=u.clinic_id
        WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='ACTIVE' LIMIT 1`, [digest]);
      const user = rows[0];
      if (!user || (user.clinic_id && user.clinic_status !== 'ACTIVE')) return null;
      return this.publicUser(user);
    });
  }

  async logout(rawToken) {
    if (!rawToken) return;
    const digest = hashToken(rawToken);
    if (this.mode === 'file') {
      this.data.sessions = this.data.sessions.filter(item => item.tokenHash !== digest);
      this.persist();
      return;
    }
    await withTenant(this.pool, { isPlatformAdmin: true }, client => client.query('DELETE FROM sessions WHERE token_hash=$1', [digest]));
  }

  cleanupSessions() {
    this.data.sessions = this.data.sessions.filter(item => new Date(item.expiresAt).getTime() > Date.now());
  }

  async getClinics() {
    if (this.mode === 'file') return this.data.clinics.map(publicClinic);
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => (await client.query('SELECT * FROM clinics ORDER BY created_at DESC')).rows.map(publicClinic));
  }

  async getClinic(clinicId) {
    if (!clinicId) return null;
    if (this.mode === 'file') return this.data.clinics.find(item => item.id === clinicId) || null;
    return withTenant(this.pool, { clinicId }, async client => {
      const row = (await client.query('SELECT * FROM clinics WHERE id=$1', [clinicId])).rows[0];
      return row ? publicClinic(row) : null;
    });
  }

  async createClinic(payload) {
    const clinic = {
      id: id('clinic'), name: payload.name.trim(), legalName: payload.legalName.trim(), bin: payload.bin.trim(), city: payload.city.trim(),
      timezone: payload.timezone || 'Asia/Almaty', contactPhone: payload.contactPhone.trim(), hospitalOptions: payload.hospitalOptions || [], plan: payload.plan || 'START', status: 'ACTIVE', createdAt: new Date().toISOString()
    };
    const owner = {
      id: id('user'), clinicId: clinic.id, name: payload.ownerName.trim(), email: payload.ownerEmail.trim().toLowerCase(),
      role: 'clinic_owner', passwordHash: hashPassword(payload.ownerPassword), status: 'ACTIVE'
    };
    if (this.mode === 'file') {
      this.data.clinics.push(clinic);
      this.data.users.push(owner);
      this.persist();
      return { clinic, owner: this.publicUser({ ...owner, clinicName: clinic.name }) };
    }
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      await client.query(`INSERT INTO clinics (id,name,legal_name,bin,city,timezone,contact_phone,plan,status,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [clinic.id, clinic.name, clinic.legalName, clinic.bin, clinic.city, clinic.timezone, clinic.contactPhone, clinic.plan, clinic.status, clinic.createdAt]);
      await client.query(`INSERT INTO users (id,clinic_id,name,email,role,password_hash,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [owner.id, owner.clinicId, owner.name, owner.email, owner.role, owner.passwordHash, owner.status]);
      return { clinic, owner: this.publicUser({ ...owner, clinicName: clinic.name }) };
    });
  }

  async updateClinic(clinicId, payload) {
    const allowed = ['name', 'legalName', 'city', 'timezone', 'contactPhone', 'hospitalOptions', 'plan', 'status'];
    const shouldRevokeCredentials = payload.status !== undefined && payload.status !== 'ACTIVE';
    if (this.mode === 'file') {
      const clinic = this.data.clinics.find(item => item.id === clinicId);
      if (!clinic) return null;
      // Public order capabilities live in OrderStore in file mode. Revoke them
      // before making the status change visible so reactivation can never
      // resurrect an old patient or viewer link.
      if (shouldRevokeCredentials && this.revokeClinicPublicAccess) await this.revokeClinicPublicAccess(clinicId);
      for (const field of allowed) if (payload[field] !== undefined) clinic[field] = payload[field];
      if (shouldRevokeCredentials) {
        const clinicUserIds = new Set(this.data.users.filter(user => user.clinicId === clinicId).map(user => user.id));
        this.data.sessions = this.data.sessions.filter(session => !clinicUserIds.has(session.userId));
        for (const crew of this.data.crews.filter(item => item.clinicId === clinicId)) {
          crew.accessTokenHash = hashToken(token());
          crew.accessTokenExpiresAt = new Date(0).toISOString();
        }
      }
      clinic.updatedAt = new Date().toISOString();
      this.persist();
      return publicClinic(clinic);
    }
    const columns = { name: 'name', legalName: 'legal_name', city: 'city', timezone: 'timezone', contactPhone: 'contact_phone', hospitalOptions: 'hospital_options', plan: 'plan', status: 'status' };
    const entries = allowed.filter(field => payload[field] !== undefined).map(field => [columns[field], payload[field]]);
    if (!entries.length) return this.getClinic(clinicId);
    const assignments = entries.map(([column], index) => `${column}=$${index + 2}`).join(',');
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const row = (await client.query(`UPDATE clinics SET ${assignments} WHERE id=$1 RETURNING *`, [clinicId, ...entries.map(([, value]) => value)])).rows[0];
      if (row && shouldRevokeCredentials) {
        await client.query(`DELETE FROM sessions USING users
          WHERE sessions.user_id=users.id AND users.clinic_id=$1`, [clinicId]);
        await client.query(`UPDATE crew_access_tokens SET revoked_at=COALESCE(revoked_at, now())
          WHERE clinic_id=$1 AND revoked_at IS NULL`, [clinicId]);
        const { rows: orders } = await client.query('SELECT token_hash FROM orders WHERE clinic_id=$1 FOR UPDATE', [clinicId]);
        for (const order of orders) {
          const replacementHash = hashToken(token());
          await client.query(`UPDATE orders
            SET token_hash=$1, expires_at=now(), viewer_token_hash=NULL, viewer_expires_at=now()
            WHERE clinic_id=$2 AND token_hash=$3`, [replacementHash, clinicId, order.token_hash]);
        }
      }
      return row ? publicClinic(row) : null;
    });
  }

  async emailExists(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (this.mode === 'file') return this.data.users.some(user => user.email.toLowerCase() === normalized);
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => (await client.query('SELECT 1 FROM users WHERE lower(email)=$1', [normalized])).rowCount > 0);
  }

  async binExists(bin) {
    const normalized = String(bin || '').trim();
    if (this.mode === 'file') return this.data.clinics.some(clinic => clinic.bin === normalized);
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => (await client.query('SELECT 1 FROM clinics WHERE bin=$1', [normalized])).rowCount > 0);
  }

  async getClinicUsers(clinicId) {
    if (this.mode === 'file') {
      const clinic = this.data.clinics.find(item => item.id === clinicId);
      return this.data.users.filter(user => user.clinicId === clinicId).map(user => this.publicUser({ ...user, clinicName: clinic?.name || null }));
    }
    return withTenant(this.pool, { clinicId }, async client => (await client.query(`SELECT u.*, c.name AS clinic_name FROM users u JOIN clinics c ON c.id=u.clinic_id WHERE u.clinic_id=$1 ORDER BY u.name`, [clinicId])).rows.map(row => this.publicUser(row)));
  }

  async createClinicUser(clinicId, payload) {
    const user = { id: id('user'), clinicId, name: payload.name.trim(), email: payload.email.trim().toLowerCase(), role: payload.role, passwordHash: hashPassword(payload.password), status: 'ACTIVE' };
    if (this.mode === 'file') {
      this.data.users.push(user);
      this.persist();
      const clinic = this.data.clinics.find(item => item.id === clinicId);
      return this.publicUser({ ...user, clinicName: clinic?.name || null });
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const row = (await client.query(`INSERT INTO users (id,clinic_id,name,email,role,password_hash,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [user.id, clinicId, user.name, user.email, user.role, user.passwordHash, user.status])).rows[0];
      const clinic = (await client.query('SELECT name FROM clinics WHERE id=$1', [clinicId])).rows[0];
      return this.publicUser({ ...row, clinic_name: clinic?.name });
    });
  }

  async updateClinicUser(clinicId, userId, payload) {
    const allowed = ['role', 'status', 'name'];
    if (this.mode === 'file') {
      const user = this.data.users.find(item => item.clinicId === clinicId && item.id === userId);
      if (!user) return null;
      for (const field of allowed) if (payload[field] !== undefined) user[field] = payload[field];
      if (payload.role !== undefined || (payload.status !== undefined && payload.status !== 'ACTIVE')) {
        this.data.sessions = this.data.sessions.filter(session => session.userId !== userId);
      }
      this.persist();
      const clinic = this.data.clinics.find(item => item.id === clinicId);
      return this.publicUser({ ...user, clinicName: clinic?.name || null });
    }
    const entries = allowed.filter(field => payload[field] !== undefined).map(field => [field, payload[field]]);
    if (!entries.length) {
      const users = await this.getClinicUsers(clinicId);
      return users.find(user => user.id === userId) || null;
    }
    const assignments = entries.map(([column], index) => `${column}=$${index + 3}`).join(',');
    return withTenant(this.pool, { clinicId }, async client => {
      const row = (await client.query(`UPDATE users SET ${assignments} WHERE clinic_id=$1 AND id=$2 RETURNING *`, [clinicId, userId, ...entries.map(([, value]) => value)])).rows[0];
      if (!row) return null;
      if (payload.role !== undefined || (payload.status !== undefined && payload.status !== 'ACTIVE')) {
        await client.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
      }
      const clinic = (await client.query('SELECT name FROM clinics WHERE id=$1', [clinicId])).rows[0];
      return this.publicUser({ ...row, clinic_name: clinic?.name });
    });
  }

  async resetClinicUserPassword(clinicId, userId, password) {
    const passwordHash = hashPassword(password);
    if (this.mode === 'file') {
      const user = this.data.users.find(item => item.clinicId === clinicId && item.id === userId);
      if (!user) return false;
      user.passwordHash = passwordHash;
      this.data.sessions = this.data.sessions.filter(session => session.userId !== userId);
      this.persist();
      return true;
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const result = await client.query('UPDATE users SET password_hash=$1 WHERE clinic_id=$2 AND id=$3', [passwordHash, clinicId, userId]);
      if (!result.rowCount) return false;
      await client.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
      return true;
    });
  }

  async changeOwnPassword(userId, currentPassword, newPassword) {
    if (this.mode === 'file') {
      const user = this.data.users.find(item => item.id === userId && item.status === 'ACTIVE');
      if (!user) return false;
      const observedHash = user.passwordHash;
      if (!await verifyPassword(currentPassword, observedHash) || user.passwordHash !== observedHash) return false;
      user.passwordHash = hashPassword(newPassword);
      this.data.sessions = this.data.sessions.filter(session => session.userId !== userId);
      this.persist();
      return true;
    }
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const user = (await client.query('SELECT password_hash,status FROM users WHERE id=$1 FOR UPDATE', [userId])).rows[0];
      if (!user || user.status !== 'ACTIVE' || !await verifyPassword(currentPassword, user.password_hash)) return false;
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashPassword(newPassword), userId]);
      await client.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
      return true;
    });
  }

  async getCrews(clinicId) {
    if (!clinicId) return [];
    if (this.mode === 'file') {
      const hospitalOptions = this.data.clinics.find(item => item.id === clinicId)?.hospitalOptions || [];
      return this.data.crews.filter(item => item.clinicId === clinicId && !item.archivedAt).map(item => publicCrew({ ...item, hospitalOptions }));
    }
    return withTenant(this.pool, { clinicId }, async client => (await client.query('SELECT c.*,cl.hospital_options FROM crews c JOIN clinics cl ON cl.id=c.clinic_id WHERE c.clinic_id=$1 AND c.archived_at IS NULL ORDER BY c.id', [clinicId])).rows.map(publicCrew));
  }

  async getCrew(clinicId, crewId) {
    if (!clinicId || !crewId) return null;
    if (this.mode === 'file') {
      const crew = this.data.crews.find(item => item.clinicId === clinicId && item.id === String(crewId) && !item.archivedAt);
      const hospitalOptions = this.data.clinics.find(item => item.id === clinicId)?.hospitalOptions || [];
      return crew ? publicCrew({ ...crew, hospitalOptions }) : null;
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const row = (await client.query('SELECT c.*,cl.hospital_options FROM crews c JOIN clinics cl ON cl.id=c.clinic_id WHERE c.clinic_id=$1 AND c.id=$2 AND c.archived_at IS NULL', [clinicId, String(crewId)])).rows[0];
      return row ? publicCrew(row) : null;
    });
  }

  async createCrew(clinicId, payload) {
    const accessToken = token();
    const expiresAt = new Date(Date.now() + DRIVER_TOKEN_TTL_MS);
    if (this.mode === 'file') {
      const numericIds = this.data.crews.filter(item => item.clinicId === clinicId).map(item => Number(item.id)).filter(Number.isFinite);
      const crew = { id: String(numericIds.length ? Math.max(...numericIds) + 1 : 101), clinicId, name: payload.name.trim(), carPlate: payload.carPlate.trim(), type: payload.type.trim(), driverName: payload.driverName.trim(), status: payload.status || 'ON_DUTY', accessTokenHash: hashToken(accessToken), accessTokenExpiresAt: expiresAt.toISOString(), currentLoc: null, locationUpdatedAt: null };
      this.data.crews.push(crew);
      this.persist();
      const hospitalOptions = this.data.clinics.find(item => item.id === clinicId)?.hospitalOptions || [];
      return { crew: publicCrew({ ...crew, hospitalOptions }), accessToken, accessTokenExpiresAt: expiresAt.toISOString() };
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const { rows: [{ next_id }] } = await client.query(`SELECT COALESCE(max(CASE WHEN id ~ '^\\d+$' THEN id::int END),100)+1 AS next_id FROM crews WHERE clinic_id=$1`, [clinicId]);
      const crewId = String(next_id);
      const row = (await client.query(`INSERT INTO crews (id,clinic_id,name,car_plate,type,driver_name,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [crewId, clinicId, payload.name.trim(), payload.carPlate.trim(), payload.type.trim(), payload.driverName.trim(), payload.status || 'ON_DUTY'])).rows[0];
      await client.query('INSERT INTO crew_access_tokens (token_hash,clinic_id,crew_id,expires_at) VALUES ($1,$2,$3,$4)', [hashToken(accessToken), clinicId, crewId, expiresAt]);
      const clinic = (await client.query('SELECT hospital_options FROM clinics WHERE id=$1', [clinicId])).rows[0];
      return { crew: publicCrew({ ...row, hospital_options: clinic?.hospital_options || [] }), accessToken, accessTokenExpiresAt: expiresAt.toISOString() };
    });
  }

  async updateCrew(clinicId, crewId, payload) {
    const allowed = ['name', 'carPlate', 'type', 'driverName', 'status', 'currentLoc', 'locationUpdatedAt'];
    if (this.mode === 'file') {
      const crew = this.data.crews.find(item => item.clinicId === clinicId && item.id === String(crewId) && !item.archivedAt);
      if (!crew) return null;
      for (const field of allowed) if (payload[field] !== undefined) crew[field] = payload[field];
      this.persist();
      const hospitalOptions = this.data.clinics.find(item => item.id === clinicId)?.hospitalOptions || [];
      return publicCrew({ ...crew, hospitalOptions });
    }
    const columns = { name: 'name', carPlate: 'car_plate', type: 'type', driverName: 'driver_name', status: 'status', currentLoc: 'current_location', locationUpdatedAt: 'location_updated_at' };
    const entries = allowed.filter(field => payload[field] !== undefined).map(field => [columns[field], payload[field]]);
    if (!entries.length) return this.getCrew(clinicId, crewId);
    const assignments = entries.map(([column], index) => `${column}=$${index + 3}`).join(',');
    return withTenant(this.pool, { clinicId }, async client => {
      const row = (await client.query(`UPDATE crews SET ${assignments} WHERE clinic_id=$1 AND id=$2 AND archived_at IS NULL RETURNING *`, [clinicId, String(crewId), ...entries.map(([, value]) => value)])).rows[0];
      if (!row) return null;
      const clinic = (await client.query('SELECT hospital_options FROM clinics WHERE id=$1', [clinicId])).rows[0];
      return publicCrew({ ...row, hospital_options: clinic?.hospital_options || [] });
    });
  }

  async deleteCrew(clinicId, crewId) {
    if (this.mode === 'file') {
      const crew = this.data.crews.find(item => item.clinicId === clinicId && item.id === String(crewId) && !item.archivedAt);
      if (!crew) return false;
      crew.archivedAt = new Date().toISOString();
      crew.status = 'OFF_DUTY';
      crew.accessTokenHash = hashToken(token());
      crew.accessTokenExpiresAt = crew.archivedAt;
      this.persist();
      return true;
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const result = await client.query(`UPDATE crews SET archived_at=now(),status='OFF_DUTY'
        WHERE clinic_id=$1 AND id=$2 AND archived_at IS NULL AND NOT EXISTS (
          SELECT 1 FROM orders WHERE orders.clinic_id=$1 AND orders.crew_id=$2 AND orders.status IN ('ACCEPTED','EN_ROUTE','ARRIVED','HOSPITAL_TRANSPORT')
        )`, [clinicId, String(crewId)]);
      if (result.rowCount) await client.query('UPDATE crew_access_tokens SET revoked_at=now() WHERE clinic_id=$1 AND crew_id=$2 AND revoked_at IS NULL', [clinicId, String(crewId)]);
      return result.rowCount > 0;
    });
  }

  async findCrewByAccessToken(rawToken) {
    if (!rawToken) return null;
    const digest = hashToken(rawToken);
    if (this.mode === 'file') {
      const crew = this.data.crews.find(item => !item.archivedAt && item.accessTokenHash === digest && new Date(item.accessTokenExpiresAt || 0).getTime() > Date.now());
      const clinic = crew ? this.data.clinics.find(item => item.id === crew.clinicId && item.status === 'ACTIVE') : null;
      return crew && clinic ? publicCrew({ ...crew, hospitalOptions: clinic.hospitalOptions || [] }) : null;
    }
    return withTenant(this.pool, { isPlatformAdmin: true }, async client => {
      const row = (await client.query(`SELECT c.*,cl.hospital_options FROM crew_access_tokens t JOIN crews c ON c.clinic_id=t.clinic_id AND c.id=t.crew_id
        JOIN clinics cl ON cl.id=c.clinic_id
        WHERE t.token_hash=$1 AND t.revoked_at IS NULL AND t.expires_at>now() AND cl.status='ACTIVE' AND c.archived_at IS NULL LIMIT 1`, [digest])).rows[0];
      return row ? publicCrew(row) : null;
    });
  }

  async rotateCrewAccess(clinicId, crewId) {
    const rawToken = token();
    const expiresAt = new Date(Date.now() + DRIVER_TOKEN_TTL_MS);
    if (this.mode === 'file') {
      const crew = this.data.crews.find(item => item.clinicId === clinicId && item.id === String(crewId) && !item.archivedAt);
      if (!crew) return null;
      crew.accessTokenHash = hashToken(rawToken);
      crew.accessTokenExpiresAt = expiresAt.toISOString();
      this.persist();
      return { token: rawToken, expiresAt: expiresAt.toISOString() };
    }
    return withTenant(this.pool, { clinicId }, async client => {
      const exists = (await client.query('SELECT 1 FROM crews WHERE clinic_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE', [clinicId, String(crewId)])).rowCount;
      if (!exists) return null;
      await client.query('UPDATE crew_access_tokens SET revoked_at=now() WHERE clinic_id=$1 AND crew_id=$2 AND revoked_at IS NULL', [clinicId, String(crewId)]);
      await client.query('INSERT INTO crew_access_tokens (token_hash,clinic_id,crew_id,expires_at) VALUES ($1,$2,$3,$4)', [hashToken(rawToken), clinicId, String(crewId), expiresAt]);
      return { token: rawToken, expiresAt: expiresAt.toISOString() };
    });
  }
}

export const tenantStore = new TenantStore();
