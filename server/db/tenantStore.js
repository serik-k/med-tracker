import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.LEGACY_DB_DIR || __dirname;
const filePath = path.join(dataDirectory, 'platform_store.json');
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const id = prefix => `${prefix}_${crypto.randomUUID()}`;
const token = () => crypto.randomBytes(32).toString('base64url');
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const seedPassword = (envName, fallback) => {
  const value = process.env[envName];
  if (process.env.NODE_ENV === 'production' && !value) throw new Error(`${envName} is required in production`);
  return value || fallback;
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function seedData() {
  const medClinicId = 'clinic_medclinic_almaty';
  const sanaClinicId = 'clinic_sana_almaty';
  return {
    clinics: [
      { id: medClinicId, name: 'MedClinic Almaty', legalName: 'ТОО «MedClinic Almaty»', bin: '230140012345', city: 'Алматы', timezone: 'Asia/Almaty', contactPhone: '+7 727 000 00 00', plan: 'PRO', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: sanaClinicId, name: 'Sana Clinic', legalName: 'ТОО «Sana Clinic»', bin: '240240065432', city: 'Алматы', timezone: 'Asia/Almaty', contactPhone: '+7 727 111 22 33', plan: 'START', status: 'ACTIVE', createdAt: new Date().toISOString() }
    ],
    users: [
      { id: 'user_platform_admin', clinicId: null, name: 'Администратор MedTracker', email: 'platform@medtracker.kz', role: 'platform_admin', passwordHash: hashPassword(seedPassword('SEED_PLATFORM_PASSWORD', 'Admin123!')), status: 'ACTIVE' },
      { id: 'user_med_owner', clinicId: medClinicId, name: 'Владелец MedClinic', email: 'admin@medclinic.kz', role: 'clinic_owner', passwordHash: hashPassword(seedPassword('SEED_CLINIC_PASSWORD', 'Clinic123!')), status: 'ACTIVE' },
      { id: 'user_med_dispatcher', clinicId: medClinicId, name: 'Диспетчер MedClinic', email: 'dispatcher@medclinic.kz', role: 'dispatcher', passwordHash: hashPassword(seedPassword('SEED_DISPATCHER_PASSWORD', 'Dispatch123!')), status: 'ACTIVE' },
      { id: 'user_sana_owner', clinicId: sanaClinicId, name: 'Владелец Sana Clinic', email: 'admin@sana.kz', role: 'clinic_owner', passwordHash: hashPassword(seedPassword('SEED_CLINIC_PASSWORD', 'Clinic123!')), status: 'ACTIVE' }
    ],
    sessions: [],
    crews: [
      { id: '101', clinicId: medClinicId, name: 'Бригада №101', carPlate: '01 KZ 101 MED', type: 'РЕАНИМАЦИЯ', driverName: 'Алмасов К.', status: 'ON_DUTY', accessTokenHash: hashToken('demo-driver-101') },
      { id: '102', clinicId: medClinicId, name: 'Бригада №102', carPlate: '02 KZ 102 MED', type: 'ПЕДИАТРИЧЕСКАЯ', driverName: 'Иванов С.', status: 'ON_DUTY', accessTokenHash: hashToken('demo-driver-102') },
      { id: '103', clinicId: medClinicId, name: 'Бригада №103', carPlate: '02 KZ 777 ABC', type: 'ЛИНЕЙНАЯ', driverName: 'Нурланов Б.', status: 'ON_DUTY', accessTokenHash: hashToken('demo-driver-103') },
      { id: '201', clinicId: sanaClinicId, name: 'Бригада №201', carPlate: '02 KZ 201 MED', type: 'ЛИНЕЙНАЯ', driverName: 'Сериков А.', status: 'ON_DUTY', accessTokenHash: hashToken('demo-driver-201') }
    ]
  };
}

class TenantStore {
  constructor() {
    try {
      this.data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : seedData();
    } catch (error) {
      console.error('[TenantStore] Failed to load data:', error.message);
      this.data = seedData();
    }
    this.data.sessions ||= [];
    this.data.crews ||= [];
  }

  persist() {
    fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  exportData() {
    return structuredClone(this.data);
  }

  publicUser(user) {
    const clinic = user.clinicId ? this.getClinic(user.clinicId) : null;
    return { id: user.id, clinicId: user.clinicId, clinicName: clinic?.name || null, name: user.name, email: user.email, role: user.role };
  }

  login(email, password) {
    const user = this.data.users.find(item => item.email.toLowerCase() === String(email).trim().toLowerCase() && item.status === 'ACTIVE');
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    if (user.clinicId && this.getClinic(user.clinicId)?.status !== 'ACTIVE') return null;
    const rawToken = token();
    this.data.sessions.push({ tokenHash: hashToken(rawToken), userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
    this.cleanupSessions();
    this.persist();
    return { token: rawToken, user: this.publicUser(user) };
  }

  authenticate(rawToken) {
    if (!rawToken) return null;
    const session = this.data.sessions.find(item => item.tokenHash === hashToken(rawToken) && new Date(item.expiresAt).getTime() > Date.now());
    const user = session && this.data.users.find(item => item.id === session.userId && item.status === 'ACTIVE');
    return user ? this.publicUser(user) : null;
  }

  logout(rawToken) {
    this.data.sessions = this.data.sessions.filter(item => item.tokenHash !== hashToken(rawToken));
    this.persist();
  }

  cleanupSessions() {
    this.data.sessions = this.data.sessions.filter(item => new Date(item.expiresAt).getTime() > Date.now());
  }

  getClinics() { return this.data.clinics; }
  getClinic(clinicId) { return this.data.clinics.find(item => item.id === clinicId) || null; }

  createClinic(payload) {
    const clinic = {
      id: id('clinic'), name: payload.name.trim(), legalName: payload.legalName.trim(), bin: payload.bin.trim(), city: payload.city.trim(),
      timezone: payload.timezone || 'Asia/Almaty', contactPhone: payload.contactPhone.trim(), plan: payload.plan || 'START', status: 'ACTIVE', createdAt: new Date().toISOString()
    };
    const owner = {
      id: id('user'), clinicId: clinic.id, name: payload.ownerName.trim(), email: payload.ownerEmail.trim().toLowerCase(),
      role: 'clinic_owner', passwordHash: hashPassword(payload.ownerPassword), status: 'ACTIVE'
    };
    this.data.clinics.push(clinic);
    this.data.users.push(owner);
    this.persist();
    return { clinic, owner: this.publicUser(owner) };
  }

  emailExists(email) { return this.data.users.some(user => user.email.toLowerCase() === String(email).trim().toLowerCase()); }
  binExists(bin) { return this.data.clinics.some(clinic => clinic.bin === String(bin).trim()); }

  getClinicUsers(clinicId) {
    return this.data.users.filter(user => user.clinicId === clinicId).map(user => this.publicUser(user));
  }

  createClinicUser(clinicId, payload) {
    const user = {
      id: id('user'), clinicId, name: payload.name.trim(), email: payload.email.trim().toLowerCase(),
      role: payload.role, passwordHash: hashPassword(payload.password), status: 'ACTIVE'
    };
    this.data.users.push(user);
    this.persist();
    return this.publicUser(user);
  }

  getCrews(clinicId) { return this.data.crews.filter(item => item.clinicId === clinicId).map(({ accessTokenHash, ...crew }) => crew); }
  getCrew(clinicId, crewId) { return this.data.crews.find(item => item.clinicId === clinicId && item.id === String(crewId)) || null; }

  createCrew(clinicId, payload) {
    const numericIds = this.data.crews.map(item => Number(item.id)).filter(Number.isFinite);
    let nextId = numericIds.length ? Math.max(...numericIds) + 1 : 101;
    const accessToken = token();
    const crew = { id: String(nextId), clinicId, name: payload.name.trim(), carPlate: payload.carPlate.trim(), type: payload.type.trim(), driverName: payload.driverName.trim(), status: payload.status || 'ON_DUTY', accessTokenHash: hashToken(accessToken) };
    this.data.crews.push(crew);
    this.persist();
    const { accessTokenHash, ...publicCrew } = crew;
    return { crew: publicCrew, accessToken };
  }

  updateCrew(clinicId, crewId, payload) {
    const crew = this.getCrew(clinicId, crewId);
    if (!crew) return null;
    for (const field of ['name', 'carPlate', 'type', 'driverName', 'status']) {
      if (payload[field] !== undefined) crew[field] = payload[field];
    }
    this.persist();
    const { accessTokenHash, ...publicCrew } = crew;
    return publicCrew;
  }

  deleteCrew(clinicId, crewId) {
    const index = this.data.crews.findIndex(item => item.clinicId === clinicId && item.id === String(crewId));
    if (index === -1) return false;
    this.data.crews.splice(index, 1);
    this.persist();
    return true;
  }

  findCrewByAccessToken(rawToken) {
    return this.data.crews.find(item => item.accessTokenHash === hashToken(rawToken)) || null;
  }

  rotateCrewAccess(clinicId, crewId) {
    const crew = this.getCrew(clinicId, crewId);
    if (!crew) return null;
    const rawToken = token();
    crew.accessTokenHash = hashToken(rawToken);
    this.persist();
    return rawToken;
  }
}

export const tenantStore = new TenantStore();
