import crypto from 'crypto';
import { geocodeAddress } from './services/geocoding.js';
import { fetchRealRoadRoute } from './services/routing.js';
import { loadSavedOrders, saveOrdersToFile } from './db/fileStore.js';
import { hashToken, tenantStore } from './db/tenantStore.js';
import { withTenant } from './db/database.js';
import { PhotoError, removeAccessPhoto, saveAccessPhoto } from './services/accessPhotos.js';

const ACTIVE_STATUSES = new Set(['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'HOSPITAL_TRANSPORT']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);
const PATIENT_TOKEN_TTL_MS = Number(process.env.PATIENT_TOKEN_TTL_HOURS || 72) * 60 * 60 * 1000;
const CREW_LOCATION_MAX_AGE_MS = Number(process.env.CREW_LOCATION_MAX_AGE_MINUTES || 30) * 60 * 1000;

export class StoreError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
    this.status = status;
  }
}

const nowIso = () => new Date().toISOString();
let lastLocationTimestamp = 0;
const nextLocationTimestamp = () => {
  lastLocationTimestamp = Math.max(Date.now(), lastLocationTimestamp + 1);
  return new Date(lastLocationTimestamp).toISOString();
};
const accessId = () => `ord_${crypto.randomBytes(18).toString('base64url')}`;
const patientToken = () => `trk_${crypto.randomBytes(32).toString('base64url')}`;
const businessId = () => `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const finiteCoordinate = (value, max) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= max;
const isLocation = value => value && finiteCoordinate(value.lat, 90) && finiteCoordinate(value.lng, 180);
const location = value => isLocation(value) ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
const crewDisplay = crew => crew ? `${crew.name} (${crew.carPlate})` : '';
const isFreshLocation = crew => isLocation(crew?.currentLoc)
  && crew.locationUpdatedAt
  && Date.now() - new Date(crew.locationUpdatedAt).getTime() <= CREW_LOCATION_MAX_AGE_MS;

const audit = (event, text, metadata = {}) => ({ timestamp: nowIso(), event, text, metadata });
const patientTokenDigest = rawToken => {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token || token.length > 200) throw new StoreError('PATIENT_ACCESS_DENIED', 'Нет доступа к вызову', 403);
  return hashToken(token);
};
const photoStorage = clinicId => tenantStore.mode === 'postgres' ? { pool: tenantStore.pool, clinicId } : {};
const safelyRemovePhoto = async (photoUrl, clinicId) => {
  if (!photoUrl) return;
  try { await removeAccessPhoto(photoUrl, photoStorage(clinicId)); }
  catch (error) { console.warn('[AccessPhoto] Cleanup failed:', error.message); }
};

function normalizeFileOrder(key, source) {
  const legacySecret = source.token || (String(key).startsWith('trk_') ? key : null);
  const stableId = source.accessId || (!String(key).startsWith('trk_') ? key : null) || accessId();
  const createdAt = source.createdAt || nowIso();
  const terminal = TERMINAL_STATUSES.has(source.status);
  const expiresAt = source.patientAccessExpiresAt || source.expiresAt
    || new Date(terminal ? (source.completedAt || source.cancelledAt || createdAt) : new Date(createdAt).getTime() + PATIENT_TOKEN_TTL_MS).toISOString();
  const result = {
    ...source,
    accessId: stableId,
    patientTokenHash: source.patientTokenHash || (legacySecret ? hashToken(legacySecret) : hashToken(patientToken())),
    patientAccessExpiresAt: expiresAt,
    viewerTokenHash: source.viewerTokenHash || null,
    viewerAccessExpiresAt: source.viewerAccessExpiresAt || null,
    crewId: source.crewId || null,
    carNumber: source.crewId ? source.carNumber : '',
    destinationLoc: location(source.destinationLoc),
    currentLoc: location(source.currentLoc),
    hospitalLocation: location(source.hospitalLocation),
    routePath: Array.isArray(source.routePath) ? source.routePath.map(location).filter(Boolean) : [],
    etaMinutes: source.etaMinutes !== null && source.etaMinutes !== undefined && source.etaMinutes !== '' && Number.isFinite(Number(source.etaMinutes)) ? Number(source.etaMinutes) : null,
    distanceKm: source.distanceKm !== null && source.distanceKm !== undefined && source.distanceKm !== '' && Number.isFinite(Number(source.distanceKm)) ? Number(source.distanceKm) : null,
    accessInfo: source.accessInfo && typeof source.accessInfo === 'object' ? source.accessInfo : {},
    symptoms: Array.isArray(source.symptoms) ? source.symptoms : [],
    auditLogs: Array.isArray(source.auditLogs) ? source.auditLogs : [],
    createdAt,
    updatedAt: source.updatedAt || createdAt,
    expired: terminal || new Date(expiresAt).getTime() <= Date.now()
  };
  delete result.token;
  delete result.expiresAt;
  return result;
}

const rowDate = value => value?.toISOString?.() || value || null;

function rowToOrder(row, logs = []) {
  if (!row) return null;
  const assignedCrew = row.crew_id ? {
    id: String(row.crew_id),
    clinicId: row.clinic_id,
    name: row.crew_name,
    carPlate: row.crew_car_plate,
    type: row.crew_type,
    driverName: row.crew_driver_name,
    status: row.crew_status
  } : null;
  const expiresAt = rowDate(row.expires_at);
  return {
    id: row.business_id,
    token: row.access_id,
    clinicId: row.clinic_id,
    clinicName: row.clinic_name || '',
    clinicStatus: row.clinic_status || 'ACTIVE',
    clinicContactPhone: row.clinic_contact_phone || '',
    hospitalOptions: row.clinic_hospital_options || [],
    clinicHospitals: row.clinic_hospital_options || [],
    crewId: row.crew_id ? String(row.crew_id) : null,
    assignedCrew,
    carNumber: crewDisplay(assignedCrew),
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    address: row.address,
    priority: row.priority,
    status: row.status,
    hospitalName: row.hospital_name || null,
    destinationLoc: row.destination,
    hospitalLocation: row.hospital_location || null,
    currentLoc: row.current_location || null,
    routePath: row.route_path || [],
    etaMinutes: row.eta_minutes ?? null,
    distanceKm: row.distance_km ?? null,
    accessInfo: row.access_info || {},
    symptoms: row.symptoms || [],
    isSimulating: Boolean(row.is_simulating),
    assignedAt: rowDate(row.assigned_at),
    locationUpdatedAt: rowDate(row.location_updated_at),
    etaUpdatedAt: rowDate(row.eta_updated_at),
    createdAt: rowDate(row.created_at),
    updatedAt: rowDate(row.updated_at),
    completedAt: rowDate(row.completed_at),
    cancelledAt: rowDate(row.cancelled_at),
    cancelReason: row.cancel_reason || null,
    patientAccessExpiresAt: expiresAt,
    patientAccessExpired: new Date(expiresAt).getTime() <= Date.now(),
    expired: TERMINAL_STATUSES.has(row.status),
    auditLogs: logs
  };
}

const ORDER_SELECT = `SELECT o.*, cl.name AS clinic_name, cl.status AS clinic_status, cl.contact_phone AS clinic_contact_phone, cl.hospital_options AS clinic_hospital_options,
  c.name AS crew_name, c.car_plate AS crew_car_plate, c.type AS crew_type,
  c.driver_name AS crew_driver_name, c.status AS crew_status
  FROM orders o
  JOIN clinics cl ON cl.id=o.clinic_id
  LEFT JOIN crews c ON c.clinic_id=o.clinic_id AND c.id=o.crew_id`;

class OrderStore {
  constructor() {
    this.mode = tenantStore.mode;
    this.orders = new Map();
    this.ready = false;
    tenantStore.registerClinicPublicAccessRevoker(clinicId => this.revokeClinicPublicCapabilities(clinicId));
  }

  async init() {
    if (this.ready) return;
    await tenantStore.init();
    if (this.mode === 'file') {
      const loaded = loadSavedOrders();
      for (const [key, source] of loaded) {
        const order = normalizeFileOrder(key, source);
        this.orders.set(order.accessId, order);
      }
      this.persist();
    }
    this.ready = true;
  }

  async close() {
    this.ready = false;
  }

  persist() {
    if (this.mode !== 'file') return;
    saveOrdersToFile(this.orders);
  }

  async revokeClinicPublicCapabilities(clinicId) {
    if (this.mode !== 'file') return;
    const revokedAt = nowIso();
    let changed = false;
    for (const order of this.orders.values()) {
      if (order.clinicId !== clinicId) continue;
      order.patientTokenHash = hashToken(patientToken());
      order.patientAccessExpiresAt = revokedAt;
      order.viewerTokenHash = null;
      order.viewerAccessExpiresAt = revokedAt;
      order.updatedAt = revokedAt;
      order.auditLogs.push(audit('CLINIC_ACCESS_REVOKED', 'Публичные ссылки отозваны при отключении клиники'));
      changed = true;
    }
    if (changed) this.persist();
  }

  async getAllCrews(clinicId) { return tenantStore.getCrews(clinicId); }
  async addCrew(clinicId, crewData) { return tenantStore.createCrew(clinicId, crewData); }
  async updateCrew(clinicId, id, crewData) {
    if (this.mode === 'file') {
      if (crewData.status !== undefined) {
        const busy = Array.from(this.orders.values()).some(order => order.clinicId === clinicId
          && order.crewId === String(id) && ACTIVE_STATUSES.has(order.status));
        if (busy) throw new StoreError('CREW_BUSY', 'Статус бригады с активным вызовом управляется системой', 409);
      }
      // The file-mode mutation executes synchronously before this async method
      // yields, so assignment/status invariants cannot be split by another turn.
      return tenantStore.updateCrew(clinicId, id, crewData);
    }
    if (crewData.status === undefined) return tenantStore.updateCrew(clinicId, id, crewData);

    const columns = { name: 'name', carPlate: 'car_plate', type: 'type', driverName: 'driver_name', status: 'status' };
    const entries = Object.entries(crewData).filter(([field, value]) => columns[field] && value !== undefined);
    let found = false;
    await withTenant(tenantStore.pool, { clinicId }, async client => {
      const crew = (await client.query(`SELECT 1 FROM crews
        WHERE clinic_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE`, [clinicId, String(id)])).rows[0];
      if (!crew) return;
      found = true;
      const busy = (await client.query(`SELECT 1 FROM orders WHERE clinic_id=$1 AND crew_id=$2
        AND status=ANY($3) LIMIT 1`, [clinicId, String(id), Array.from(ACTIVE_STATUSES)])).rowCount > 0;
      if (busy) throw new StoreError('CREW_BUSY', 'Статус бригады с активным вызовом управляется системой', 409);
      const assignments = entries.map(([field], index) => `${columns[field]}=$${index + 3}`).join(',');
      await client.query(`UPDATE crews SET ${assignments} WHERE clinic_id=$1 AND id=$2`,
        [clinicId, String(id), ...entries.map(([, value]) => value)]);
    });
    return found ? tenantStore.getCrew(clinicId, id) : null;
  }
  async deleteCrew(clinicId, id) {
    if (this.mode === 'file' && this.fileHasActiveAssignment(clinicId, id)) {
      throw new StoreError('CREW_BUSY', 'Нельзя удалить бригаду с активным вызовом', 409);
    }
    return tenantStore.deleteCrew(clinicId, id);
  }

  fileHasActiveAssignment(clinicId, crewId, excludingAccessId = null) {
    return Array.from(this.orders.values()).some(order => order.clinicId === clinicId
      && order.crewId === String(crewId) && ACTIVE_STATUSES.has(order.status) && order.accessId !== excludingAccessId);
  }

  filePublic(order) {
    const copy = structuredClone(order);
    const clinic = tenantStore.data?.clinics?.find(item => item.id === copy.clinicId);
    copy.clinicName = clinic?.name || copy.clinicName || '';
    copy.clinicStatus = clinic?.status || copy.clinicStatus || 'ACTIVE';
    copy.clinicContactPhone = clinic?.contactPhone || copy.clinicContactPhone || '';
    copy.hospitalOptions = clinic?.hospitalOptions || copy.hospitalOptions || [];
    copy.clinicHospitals = copy.hospitalOptions;
    copy.token = copy.accessId;
    delete copy.accessId;
    delete copy.patientTokenHash;
    delete copy.viewerTokenHash;
    delete copy.idempotencyKey;
    delete copy.idempotencyFingerprint;
    copy.patientAccessExpired = new Date(copy.patientAccessExpiresAt).getTime() <= Date.now();
    copy.expired = TERMINAL_STATUSES.has(copy.status);
    return copy;
  }

  async loadLogs(client, tokenHashes) {
    if (!tokenHashes.length) return new Map();
    const { rows } = await client.query(`SELECT order_token_hash,event,message,metadata,created_at
      FROM audit_logs WHERE order_token_hash=ANY($1::bpchar[]) ORDER BY created_at`, [tokenHashes]);
    const result = new Map();
    for (const row of rows) {
      const key = String(row.order_token_hash).trim();
      if (!result.has(key)) result.set(key, []);
      result.get(key).push({ timestamp: rowDate(row.created_at), event: row.event, text: row.message, metadata: row.metadata || {} });
    }
    return result;
  }

  async rowsToOrders(client, rows) {
    const logs = await this.loadLogs(client, rows.map(row => String(row.token_hash).trim()));
    return rows.map(row => rowToOrder(row, logs.get(String(row.token_hash).trim()) || []));
  }

  async getAllActiveOrders(clinicId = null) {
    if (this.mode === 'file') return Array.from(this.orders.values())
      .filter(order => ACTIVE_STATUSES.has(order.status) && (!clinicId || order.clinicId === clinicId))
      .map(order => this.filePublic(order));
    const context = clinicId ? { clinicId } : { isPlatformAdmin: true };
    return withTenant(tenantStore.pool, context, async client => {
      const params = [];
      const clinicWhere = clinicId ? 'AND o.clinic_id=$1' : '';
      if (clinicId) params.push(clinicId);
      const rows = (await client.query(`${ORDER_SELECT} WHERE o.status=ANY($${params.length + 1}) ${clinicWhere} ORDER BY o.created_at DESC`, [...params, Array.from(ACTIVE_STATUSES)])).rows;
      return this.rowsToOrders(client, rows);
    });
  }

  async getAllDispatcherOrders(clinicId) {
    if (this.mode === 'file') return Array.from(this.orders.values()).filter(order => order.clinicId === clinicId).map(order => this.filePublic(order));
    return withTenant(tenantStore.pool, { clinicId }, async client => {
      const rows = (await client.query(`${ORDER_SELECT} WHERE o.clinic_id=$1 ORDER BY o.created_at DESC LIMIT 500`, [clinicId])).rows;
      return this.rowsToOrders(client, rows);
    });
  }

  async getOrderByRef(reference, clinicId = null) {
    const ref = String(reference || '').trim();
    if (!ref) return null;
    if (this.mode === 'file') {
      const direct = this.orders.get(ref);
      const found = direct || Array.from(this.orders.values()).find(order => order.patientTokenHash === hashToken(ref));
      if (!found || (clinicId && found.clinicId !== clinicId)) return null;
      return this.filePublic(found);
    }
    const context = clinicId ? { clinicId } : { isPlatformAdmin: true };
    return withTenant(tenantStore.pool, context, async client => {
      const params = [ref, hashToken(ref)];
      let where = '(o.access_id=$1 OR o.token_hash=$2)';
      if (clinicId) { params.push(clinicId); where += ' AND o.clinic_id=$3'; }
      const row = (await client.query(`${ORDER_SELECT} WHERE ${where} LIMIT 1`, params)).rows[0];
      if (!row) return null;
      const [order] = await this.rowsToOrders(client, [row]);
      return order;
    });
  }

  async getPatientOrder(rawToken) {
    const raw = String(rawToken || '').trim();
    if (!raw) return null;
    if (this.mode === 'file') {
      const digest = hashToken(raw);
      const found = Array.from(this.orders.values()).find(order => order.patientTokenHash === digest || order.viewerTokenHash === digest);
      if (!found) return null;
      const result = this.filePublic(found);
      result.patientAccessScope = found.viewerTokenHash === digest ? 'viewer' : 'patient';
      result.expired = result.patientAccessScope === 'viewer'
        ? TERMINAL_STATUSES.has(found.status) || !found.viewerAccessExpiresAt || new Date(found.viewerAccessExpiresAt).getTime() <= Date.now()
        : TERMINAL_STATUSES.has(found.status) || new Date(found.patientAccessExpiresAt).getTime() <= Date.now();
      return result;
    }
    return withTenant(tenantStore.pool, { isPlatformAdmin: true }, async client => {
      const digest = hashToken(raw);
      const row = (await client.query(`${ORDER_SELECT} WHERE o.token_hash=$1 OR o.viewer_token_hash=$1 LIMIT 1`, [digest])).rows[0];
      if (!row) return null;
      const [order] = await this.rowsToOrders(client, [row]);
      order.patientAccessScope = String(row.viewer_token_hash || '').trim() === digest ? 'viewer' : 'patient';
      order.expired = order.patientAccessScope === 'viewer'
        ? TERMINAL_STATUSES.has(row.status) || !row.viewer_expires_at || new Date(row.viewer_expires_at).getTime() <= Date.now()
        : TERMINAL_STATUSES.has(row.status) || new Date(row.expires_at).getTime() <= Date.now();
      return order;
    });
  }

  async getOrderByPhotoUrl(photoUrl) {
    const url = String(photoUrl || '');
    if (this.mode === 'file') {
      const found = Array.from(this.orders.values()).find(order => order.accessInfo?.photoUrl === url);
      return found ? this.filePublic(found) : null;
    }
    return withTenant(tenantStore.pool, { isPlatformAdmin: true }, async client => {
      const row = (await client.query(`${ORDER_SELECT} WHERE o.access_info->>'photoUrl'=$1 LIMIT 1`, [url])).rows[0];
      if (!row) return null;
      const [order] = await this.rowsToOrders(client, [row]);
      return order;
    });
  }

  async hasActiveAssignment(clinicId, crewId, excludingAccessId = null) {
    if (this.mode === 'file') return this.fileHasActiveAssignment(clinicId, crewId, excludingAccessId);
    return withTenant(tenantStore.pool, { clinicId }, async client => {
      const params = [clinicId, String(crewId), Array.from(ACTIVE_STATUSES)];
      let extra = '';
      if (excludingAccessId) { params.push(excludingAccessId); extra = 'AND access_id<>$4'; }
      return (await client.query(`SELECT 1 FROM orders WHERE clinic_id=$1 AND crew_id=$2 AND status=ANY($3) ${extra} LIMIT 1`, params)).rowCount > 0;
    });
  }

  async getOrderByIdempotencyKey(clinicId, key) {
    if (!key) return null;
    if (this.mode === 'file') {
      const order = Array.from(this.orders.values()).find(item => item.clinicId === clinicId && item.idempotencyKey === key);
      return order ? { ...this.filePublic(order), _idempotencyFingerprint: order.idempotencyFingerprint || null } : null;
    }
    return withTenant(tenantStore.pool, { clinicId }, async client => {
      const row = (await client.query(`${ORDER_SELECT} WHERE o.clinic_id=$1 AND o.idempotency_key=$2 LIMIT 1`, [clinicId, key])).rows[0];
      if (!row) return null;
      const [order] = await this.rowsToOrders(client, [row]);
      return { ...order, _idempotencyFingerprint: row.idempotency_fingerprint ? String(row.idempotency_fingerprint).trim() : null };
    });
  }

  async createOrder(clinicId, data, actorUserId = null) {
    const idempotencyFingerprint = hashToken(JSON.stringify({
      clinicId, patientName: data.patientName, patientPhone: data.patientPhone, address: data.address,
      crewId: data.crewId || null, priority: data.priority || 'EMERGENCY', lat: data.lat ?? null, lng: data.lng ?? null
    }));
    if (data.idempotencyKey) {
      const existing = await this.getOrderByIdempotencyKey(clinicId, data.idempotencyKey);
      if (existing) {
        if (existing._idempotencyFingerprint && existing._idempotencyFingerprint !== idempotencyFingerprint) throw new StoreError('IDEMPOTENCY_CONFLICT', 'Этот Idempotency-Key уже использован для другого вызова', 409);
        delete existing._idempotencyFingerprint;
        return { ...existing, idempotentReplay: true };
      }
    }
    const clinic = await tenantStore.getClinic(clinicId);
    if (!clinic) throw new StoreError('CLINIC_NOT_FOUND', 'Клиника не найдена', 404);

    const crewId = data.crewId ? String(data.crewId) : null;
    const crew = crewId ? await tenantStore.getCrew(clinicId, crewId) : null;
    if (crewId && !crew) throw new StoreError('CREW_NOT_FOUND', 'Бригада не принадлежит вашей клинике', 400);
    if (crew && !['ON_DUTY', 'ON_CALL'].includes(crew.status)) throw new StoreError('CREW_UNAVAILABLE', 'Бригада сейчас недоступна', 409);
    if (crew && (this.mode === 'file' ? this.fileHasActiveAssignment(clinicId, crew.id) : await this.hasActiveAssignment(clinicId, crew.id))) throw new StoreError('CREW_BUSY', 'У бригады уже есть активный вызов', 409);

    let destinationLoc = null;
    const hasLat = data.lat !== undefined && data.lat !== null && data.lat !== '';
    const hasLng = data.lng !== undefined && data.lng !== null && data.lng !== '';
    if (hasLat !== hasLng) throw new StoreError('INVALID_COORDINATES', 'Широта и долгота должны быть указаны вместе', 400);
    if (hasLat && hasLng) {
      destinationLoc = location({ lat: data.lat, lng: data.lng });
      if (!destinationLoc) throw new StoreError('INVALID_COORDINATES', 'Некорректные координаты пациента', 400);
    } else {
      destinationLoc = await geocodeAddress(data.address, { city: clinic.city });
      if (!destinationLoc) throw new StoreError('GEOCODING_FAILED', 'Не удалось определить адрес. Уточните адрес или укажите точку на карте.', 422);
      destinationLoc = location(destinationLoc);
    }

    const currentLoc = isFreshLocation(crew) ? location(crew.currentLoc) : null;
    const route = currentLoc ? await fetchRealRoadRoute(currentLoc, destinationLoc) : null;
    const rawPatientToken = patientToken();
    const createdAt = nowIso();
    const patientAccessExpiresAt = new Date(Date.now() + PATIENT_TOKEN_TTL_MS).toISOString();
    const order = {
      accessId: accessId(), id: businessId(), clinicId, clinicName: clinic.name, clinicStatus: clinic.status || 'ACTIVE', clinicContactPhone: clinic.contactPhone || '', hospitalOptions: clinic.hospitalOptions || [], clinicHospitals: clinic.hospitalOptions || [], crewId: crew?.id || null,
      assignedCrew: crew || null, carNumber: crewDisplay(crew), patientName: data.patientName, patientPhone: data.patientPhone,
      address: data.address, priority: data.priority || 'EMERGENCY', status: 'ACCEPTED', hospitalName: null,
      destinationLoc, hospitalLocation: null, currentLoc, routePath: route?.path || [], etaMinutes: route?.etaMinutes ?? null,
      distanceKm: route?.distanceKm ?? null, accessInfo: { residenceType: 'apartment', intercom: '', gateCode: '', entrance: '', floor: '', note: '' },
      symptoms: [],
      isSimulating: false, assignedAt: crew ? createdAt : null, locationUpdatedAt: currentLoc ? crew.locationUpdatedAt : null,
      etaUpdatedAt: route ? createdAt : null, createdAt, updatedAt: createdAt, completedAt: null, cancelledAt: null,
      cancelReason: null, idempotencyKey: data.idempotencyKey || null, idempotencyFingerprint, patientTokenHash: hashToken(rawPatientToken), patientAccessExpiresAt, expired: false,
      viewerTokenHash: null, viewerAccessExpiresAt: null,
      auditLogs: [audit('CREATED', `Вызов создан (${orderPriorityLabel(data.priority)})`, { actorUserId, crewId: crew?.id || null })]
    };

    if (this.mode === 'file') {
      if (data.idempotencyKey) {
        const existing = Array.from(this.orders.values()).find(item => item.clinicId === clinicId && item.idempotencyKey === data.idempotencyKey);
        if (existing) {
          if (existing.idempotencyFingerprint && existing.idempotencyFingerprint !== idempotencyFingerprint) {
            throw new StoreError('IDEMPOTENCY_CONFLICT', 'Этот Idempotency-Key уже использован для другого вызова', 409);
          }
          return { ...this.filePublic(existing), idempotentReplay: true };
        }
      }
      if (crew && this.fileHasActiveAssignment(clinicId, crew.id)) throw new StoreError('CREW_BUSY', 'У бригады уже есть активный вызов', 409);
      this.orders.set(order.accessId, order);
      if (crew) await tenantStore.updateCrew(clinicId, crew.id, { status: 'ON_CALL' });
      this.persist();
    } else {
      try {
        await withTenant(tenantStore.pool, { clinicId }, async client => {
          const lockedCrew = crew ? (await client.query('SELECT status FROM crews WHERE clinic_id=$1 AND id=$2 FOR UPDATE', [clinicId, crew.id])).rows[0] : null;
          if (crew && !lockedCrew) throw new StoreError('CREW_NOT_FOUND', 'Бригада не найдена', 404);
          if (crew && !['ON_DUTY', 'ON_CALL'].includes(lockedCrew.status)) throw new StoreError('CREW_UNAVAILABLE', 'Бригада сейчас недоступна', 409);
          await client.query(`INSERT INTO orders (token_hash,access_id,business_id,clinic_id,crew_id,patient_name,patient_phone,address,priority,status,
            destination,current_location,route_path,eta_minutes,distance_km,access_info,symptoms,is_simulating,expires_at,assigned_at,location_updated_at,eta_updated_at,created_at,idempotency_key,idempotency_fingerprint)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACCEPTED',$10,$11,$12,$13,$14,$15,'[]'::jsonb,false,$16,$17,$18,$19,$20,$21,$22)`,
          [order.patientTokenHash, order.accessId, order.id, clinicId, order.crewId, order.patientName, order.patientPhone, order.address, order.priority,
            order.destinationLoc, order.currentLoc, JSON.stringify(order.routePath), order.etaMinutes, order.distanceKm, order.accessInfo,
            order.patientAccessExpiresAt, order.assignedAt, order.locationUpdatedAt, order.etaUpdatedAt, order.createdAt, order.idempotencyKey, order.idempotencyFingerprint]);
          await this.insertAudit(client, clinicId, order.patientTokenHash, actorUserId, order.auditLogs[0]);
          if (crew) await client.query("UPDATE crews SET status='ON_CALL' WHERE clinic_id=$1 AND id=$2", [clinicId, crew.id]);
        });
      } catch (error) {
        if (error.code === '23505' && String(error.constraint || '').includes('idempotency')) {
          const existing = await this.getOrderByIdempotencyKey(clinicId, data.idempotencyKey);
          if (existing) {
            if (existing._idempotencyFingerprint && existing._idempotencyFingerprint !== idempotencyFingerprint) throw new StoreError('IDEMPOTENCY_CONFLICT', 'Этот Idempotency-Key уже использован для другого вызова', 409);
            delete existing._idempotencyFingerprint;
            return { ...existing, idempotentReplay: true };
          }
        }
        if (error.code === '23505' && String(error.constraint || '').includes('one_active_per_crew')) throw new StoreError('CREW_BUSY', 'У бригады уже есть активный вызов', 409);
        throw error;
      }
    }

    const response = this.mode === 'file' ? this.filePublic(order) : await this.getOrderByRef(order.accessId, clinicId);
    return {
      ...response,
      patientAccessToken: rawPatientToken,
      patientAccessPath: `/track#${rawPatientToken}`,
      patientAccessExpiresAt
    };
  }

  async insertAudit(client, clinicId, tokenHashValue, actorUserId, entry) {
    await client.query(`INSERT INTO audit_logs (clinic_id,order_token_hash,actor_user_id,event,message,metadata,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`, [clinicId, tokenHashValue, actorUserId || null, entry.event, entry.text, entry.metadata || {}, entry.timestamp]);
  }

  async rotatePatientAccess(clinicId, reference, actorUserId = null) {
    const rawToken = patientToken();
    const digest = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PATIENT_TOKEN_TTL_MS).toISOString();
    if (this.mode === 'file') {
      const order = this.orders.get(String(reference));
      if (!order || order.clinicId !== clinicId) return null;
      if (!ACTIVE_STATUSES.has(order.status)) throw new StoreError('ORDER_CLOSED', 'Закрытый вызов нельзя опубликовать', 409);
      order.patientTokenHash = digest;
      order.patientAccessExpiresAt = expiresAt;
      order.updatedAt = nowIso();
      order.auditLogs.push(audit('PATIENT_LINK_ROTATED', 'Ссылка пациента обновлена', { actorUserId }));
      this.persist();
    } else {
      await withTenant(tenantStore.pool, { clinicId }, async client => {
        const row = (await client.query('SELECT token_hash,status FROM orders WHERE clinic_id=$1 AND access_id=$2 FOR UPDATE', [clinicId, String(reference)])).rows[0];
        if (!row) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
        if (!ACTIVE_STATUSES.has(row.status)) throw new StoreError('ORDER_CLOSED', 'Закрытый вызов нельзя опубликовать', 409);
        await client.query('UPDATE orders SET token_hash=$1,expires_at=$2 WHERE clinic_id=$3 AND access_id=$4', [digest, expiresAt, clinicId, String(reference)]);
        await client.query('UPDATE audit_logs SET order_token_hash=$1 WHERE order_token_hash=$2', [digest, row.token_hash]);
        await this.insertAudit(client, clinicId, digest, actorUserId, audit('PATIENT_LINK_ROTATED', 'Ссылка пациента обновлена'));
      });
    }
    return { token: rawToken, path: `/track#${rawToken}`, expiresAt, orderId: String(reference) };
  }

  async rotateViewerAccess(clinicId, reference, actorUserId = null) {
    const rawToken = patientToken();
    const digest = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PATIENT_TOKEN_TTL_MS).toISOString();
    if (this.mode === 'file') {
      const order = this.orders.get(String(reference));
      if (!order || order.clinicId !== clinicId) return null;
      if (!ACTIVE_STATUSES.has(order.status)) throw new StoreError('ORDER_CLOSED', 'Закрытый вызов нельзя опубликовать', 409);
      order.viewerTokenHash = digest;
      order.viewerAccessExpiresAt = expiresAt;
      order.updatedAt = nowIso();
      order.auditLogs.push(audit('VIEWER_LINK_ROTATED', 'Ссылка для родственников обновлена', { actorUserId }));
      this.persist();
    } else {
      await withTenant(tenantStore.pool, { clinicId }, async client => {
        const row = (await client.query('SELECT token_hash,status FROM orders WHERE clinic_id=$1 AND access_id=$2 FOR UPDATE', [clinicId, String(reference)])).rows[0];
        if (!row) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
        if (!ACTIVE_STATUSES.has(row.status)) throw new StoreError('ORDER_CLOSED', 'Закрытый вызов нельзя опубликовать', 409);
        await client.query('UPDATE orders SET viewer_token_hash=$1,viewer_expires_at=$2 WHERE clinic_id=$3 AND access_id=$4', [digest, expiresAt, clinicId, String(reference)]);
        await this.insertAudit(client, clinicId, String(row.token_hash).trim(), actorUserId, audit('VIEWER_LINK_ROTATED', 'Ссылка для родственников обновлена'));
      });
    }
    return { token: rawToken, path: `/track#${rawToken}`, expiresAt, scope: 'viewer', orderId: String(reference) };
  }

  async assignOrder(clinicId, reference, crewId, actorUserId = null) {
    const normalizedCrewId = crewId ? String(crewId) : null;
    const crew = normalizedCrewId ? await tenantStore.getCrew(clinicId, normalizedCrewId) : null;
    if (normalizedCrewId && !crew) throw new StoreError('CREW_NOT_FOUND', 'Бригада не найдена', 404);
    if (crew && !['ON_DUTY', 'ON_CALL'].includes(crew.status)) throw new StoreError('CREW_UNAVAILABLE', 'Бригада сейчас недоступна', 409);
    let previousCrewId = null;

    if (this.mode === 'file') {
      const stored = this.orders.get(String(reference));
      if (!stored || stored.clinicId !== clinicId) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
      if (!ACTIVE_STATUSES.has(stored.status)) throw new StoreError('ORDER_CLOSED', 'Назначение закрытого вызова невозможно', 409);
      if (stored.crewId === normalizedCrewId) return { order: this.filePublic(stored), previousCrewId: stored.crewId };
      if (normalizedCrewId && this.fileHasActiveAssignment(clinicId, normalizedCrewId, stored.accessId)) throw new StoreError('CREW_BUSY', 'У бригады уже есть активный вызов', 409);
      previousCrewId = stored.crewId;
      stored.crewId = normalizedCrewId;
      stored.assignedCrew = crew;
      stored.carNumber = crewDisplay(crew);
      stored.assignedAt = crew ? nowIso() : null;
      stored.currentLoc = isFreshLocation(crew) ? location(crew.currentLoc) : null;
      stored.locationUpdatedAt = stored.currentLoc ? crew.locationUpdatedAt : null;
      stored.routePath = [];
      stored.etaMinutes = null;
      stored.distanceKm = null;
      stored.etaUpdatedAt = null;
      stored.updatedAt = nowIso();
      stored.auditLogs.push(audit(crew ? 'CREW_ASSIGNED' : 'CREW_UNASSIGNED', crew ? `Назначена ${crew.name}` : 'Бригада снята с вызова', { actorUserId, previousCrewId, crewId: normalizedCrewId }));
      if (previousCrewId && previousCrewId !== normalizedCrewId) await tenantStore.updateCrew(clinicId, previousCrewId, { status: 'ON_DUTY' });
      if (normalizedCrewId) await tenantStore.updateCrew(clinicId, normalizedCrewId, { status: 'ON_CALL' });
      this.persist();
    } else {
      try {
        await withTenant(tenantStore.pool, { clinicId }, async client => {
          const row = (await client.query('SELECT token_hash,crew_id,status FROM orders WHERE clinic_id=$1 AND access_id=$2 FOR UPDATE', [clinicId, String(reference)])).rows[0];
          if (!row) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
          if (!ACTIVE_STATUSES.has(row.status)) throw new StoreError('ORDER_CLOSED', 'Назначение закрытого вызова невозможно', 409);
          previousCrewId = row.crew_id ? String(row.crew_id) : null;
          if (previousCrewId === normalizedCrewId) return;
          if (normalizedCrewId) {
            const lockedCrew = (await client.query('SELECT status FROM crews WHERE clinic_id=$1 AND id=$2 FOR UPDATE', [clinicId, normalizedCrewId])).rows[0];
            if (!lockedCrew) throw new StoreError('CREW_NOT_FOUND', 'Бригада не найдена', 404);
            if (!['ON_DUTY', 'ON_CALL'].includes(lockedCrew.status)) throw new StoreError('CREW_UNAVAILABLE', 'Бригада сейчас недоступна', 409);
          }
          const currentLoc = isFreshLocation(crew) ? location(crew.currentLoc) : null;
          await client.query(`UPDATE orders SET crew_id=$1,assigned_at=$2,current_location=$3,location_updated_at=$4,
            route_path='[]'::jsonb,eta_minutes=NULL,distance_km=NULL,eta_updated_at=NULL
            WHERE clinic_id=$5 AND access_id=$6`, [normalizedCrewId, crew ? new Date() : null, currentLoc, currentLoc ? crew.locationUpdatedAt : null, clinicId, String(reference)]);
          const entry = audit(crew ? 'CREW_ASSIGNED' : 'CREW_UNASSIGNED', crew ? `Назначена ${crew.name}` : 'Бригада снята с вызова', { previousCrewId, crewId: normalizedCrewId });
          await this.insertAudit(client, clinicId, String(row.token_hash).trim(), actorUserId, entry);
          if (previousCrewId && previousCrewId !== normalizedCrewId) await client.query("UPDATE crews SET status='ON_DUTY' WHERE clinic_id=$1 AND id=$2", [clinicId, previousCrewId]);
          if (normalizedCrewId) await client.query("UPDATE crews SET status='ON_CALL' WHERE clinic_id=$1 AND id=$2", [clinicId, normalizedCrewId]);
        });
      } catch (error) {
        if (error.code === '23505' && String(error.constraint || '').includes('one_active_per_crew')) throw new StoreError('CREW_BUSY', 'У бригады уже есть активный вызов', 409);
        throw error;
      }
    }

    await this.recalculateRoute(clinicId, String(reference));
    return { order: await this.getOrderByRef(reference, clinicId), previousCrewId };
  }

  async cancelOrder(clinicId, reference, reason, actorUserId = null) {
    const cancellationReason = String(reason || '').trim().slice(0, 500);
    let previousCrewId = null;
    let terminalPhotoUrl = null;
    if (this.mode === 'file') {
      const order = this.orders.get(String(reference));
      if (!order || order.clinicId !== clinicId) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
      if (order.status === 'CANCELLED') return { order: this.filePublic(order), previousCrewId: order.crewId };
      if (!ACTIVE_STATUSES.has(order.status)) throw new StoreError('ORDER_CLOSED', 'Вызов уже закрыт', 409);
      previousCrewId = order.crewId;
      terminalPhotoUrl = order.accessInfo?.photoUrl || null;
      if (terminalPhotoUrl) delete order.accessInfo.photoUrl;
      order.status = 'CANCELLED';
      order.cancelledAt = nowIso();
      order.cancelReason = cancellationReason || null;
      order.patientAccessExpiresAt = order.cancelledAt;
      order.expired = true;
      order.isSimulating = false;
      order.updatedAt = order.cancelledAt;
      order.auditLogs.push(audit('CANCELLED', cancellationReason ? `Вызов отменён: ${cancellationReason}` : 'Вызов отменён', { actorUserId }));
      if (previousCrewId) await tenantStore.updateCrew(clinicId, previousCrewId, { status: 'ON_DUTY' });
      this.persist();
    } else {
      await withTenant(tenantStore.pool, { clinicId }, async client => {
        const row = (await client.query('SELECT token_hash,crew_id,status,access_info FROM orders WHERE clinic_id=$1 AND access_id=$2 FOR UPDATE', [clinicId, String(reference)])).rows[0];
        if (!row) throw new StoreError('ORDER_NOT_FOUND', 'Вызов не найден', 404);
        if (row.status === 'CANCELLED') { previousCrewId = row.crew_id ? String(row.crew_id) : null; return; }
        if (!ACTIVE_STATUSES.has(row.status)) throw new StoreError('ORDER_CLOSED', 'Вызов уже закрыт', 409);
        previousCrewId = row.crew_id ? String(row.crew_id) : null;
        terminalPhotoUrl = row.access_info?.photoUrl || null;
        await client.query(`UPDATE orders SET status='CANCELLED',cancelled_at=now(),cancel_reason=$1,expires_at=now(),is_simulating=false,access_info=access_info-'photoUrl' WHERE clinic_id=$2 AND access_id=$3`, [cancellationReason || null, clinicId, String(reference)]);
        await this.insertAudit(client, clinicId, String(row.token_hash).trim(), actorUserId, audit('CANCELLED', cancellationReason ? `Вызов отменён: ${cancellationReason}` : 'Вызов отменён'));
        if (previousCrewId) await client.query("UPDATE crews SET status='ON_DUTY' WHERE clinic_id=$1 AND id=$2", [clinicId, previousCrewId]);
      });
    }
    await safelyRemovePhoto(terminalPhotoUrl, clinicId);
    return { order: await this.getOrderByRef(reference, clinicId), previousCrewId };
  }

  async updateOrderStatus(clinicId, reference, status, hospitalName = null, hospitalLocation = null, actor = {}) {
    const transitions = { ACCEPTED: ['EN_ROUTE'], EN_ROUTE: ['ARRIVED'], ARRIVED: ['HOSPITAL_TRANSPORT', 'COMPLETED'], HOSPITAL_TRANSPORT: ['COMPLETED'], COMPLETED: [], CANCELLED: [] };
    const targetStatus = String(status || '');
    let previousCrewId = null;
    const cleanHospitalName = hospitalName ? String(hospitalName).trim().slice(0, 160) : null;
    const cleanHospitalLocation = hospitalLocation ? location(hospitalLocation) : null;
    let terminalPhotoUrl = null;
    if (hospitalLocation && !cleanHospitalLocation) throw new StoreError('INVALID_COORDINATES', 'Некорректные координаты стационара', 400);
    if (targetStatus === 'HOSPITAL_TRANSPORT' && !cleanHospitalName) throw new StoreError('HOSPITAL_REQUIRED', 'Укажите стационар', 400);
    if (targetStatus === 'HOSPITAL_TRANSPORT' && !cleanHospitalLocation) throw new StoreError('HOSPITAL_LOCATION_REQUIRED', 'Укажите координаты стационара', 400);
    if (targetStatus === 'HOSPITAL_TRANSPORT') {
      const currentOrder = await this.getOrderByRef(reference, clinicId);
      const configuredHospitals = currentOrder?.hospitalOptions || currentOrder?.clinicHospitals || [];
      const matchesConfigured = configuredHospitals.some(option => {
        const optionLocation = location(option.location || option);
        return option.name === cleanHospitalName && optionLocation
          && Math.abs(optionLocation.lat - cleanHospitalLocation.lat) < 0.000001
          && Math.abs(optionLocation.lng - cleanHospitalLocation.lng) < 0.000001;
      });
      if (!configuredHospitals.length) throw new StoreError('HOSPITALS_NOT_CONFIGURED', 'Клиника не настроила список стационаров', 409);
      if (!matchesConfigured) throw new StoreError('HOSPITAL_NOT_CONFIGURED', 'Стационар отсутствует в настройках клиники', 409);
    }

    if (this.mode === 'file') {
      const order = this.orders.get(String(reference));
      if (!order || order.clinicId !== clinicId) return null;
      if (actor.crewId && order.crewId !== String(actor.crewId)) throw new StoreError('DRIVER_ACCESS_DENIED', 'Вызов больше не назначен этой бригаде', 403);
      if (actor.crewId && !ACTIVE_STATUSES.has(order.status)) throw new StoreError('ORDER_CLOSED', 'Вызов уже завершён', 409);
      if (targetStatus === order.status) return this.filePublic(order);
      if (targetStatus !== order.status && !transitions[order.status]?.includes(targetStatus)) throw new StoreError('INVALID_STATUS_TRANSITION', `Переход ${order.status} → ${targetStatus} недопустим`, 409);
      order.status = targetStatus;
      if (cleanHospitalName) order.hospitalName = cleanHospitalName;
      if (targetStatus === 'HOSPITAL_TRANSPORT') order.hospitalLocation = cleanHospitalLocation;
      order.updatedAt = nowIso();
      order.auditLogs.push(audit(targetStatus, statusLabel(targetStatus, cleanHospitalName), actor));
      if (targetStatus === 'COMPLETED') {
        terminalPhotoUrl = order.accessInfo?.photoUrl || null;
        if (terminalPhotoUrl) delete order.accessInfo.photoUrl;
        order.completedAt = nowIso(); order.patientAccessExpiresAt = order.completedAt; order.expired = true; order.isSimulating = false;
        previousCrewId = order.crewId;
        if (previousCrewId) await tenantStore.updateCrew(clinicId, previousCrewId, { status: 'ON_DUTY' });
      }
      this.persist();
    } else {
      let unchanged = false;
      await withTenant(tenantStore.pool, { clinicId }, async client => {
        const row = (await client.query('SELECT token_hash,crew_id,status,access_info FROM orders WHERE clinic_id=$1 AND access_id=$2 FOR UPDATE', [clinicId, String(reference)])).rows[0];
        if (!row) return;
        if (actor.crewId && String(row.crew_id || '') !== String(actor.crewId)) throw new StoreError('DRIVER_ACCESS_DENIED', 'Вызов больше не назначен этой бригаде', 403);
        if (actor.crewId && !ACTIVE_STATUSES.has(row.status)) throw new StoreError('ORDER_CLOSED', 'Вызов уже завершён', 409);
        if (targetStatus === row.status) { unchanged = true; return; }
        if (targetStatus !== row.status && !transitions[row.status]?.includes(targetStatus)) throw new StoreError('INVALID_STATUS_TRANSITION', `Переход ${row.status} → ${targetStatus} недопустим`, 409);
        previousCrewId = targetStatus === 'COMPLETED' && row.crew_id ? String(row.crew_id) : null;
        terminalPhotoUrl = targetStatus === 'COMPLETED' ? row.access_info?.photoUrl || null : null;
        await client.query(`UPDATE orders SET status=$1,hospital_name=COALESCE($2,hospital_name),
          hospital_location=CASE WHEN $1='HOSPITAL_TRANSPORT' THEN $3 ELSE hospital_location END,
          completed_at=CASE WHEN $1='COMPLETED' THEN now() ELSE completed_at END,
          expires_at=CASE WHEN $1='COMPLETED' THEN now() ELSE expires_at END,
          is_simulating=CASE WHEN $1='COMPLETED' THEN false ELSE is_simulating END,
          access_info=CASE WHEN $1='COMPLETED' THEN access_info-'photoUrl' ELSE access_info END
          WHERE clinic_id=$4 AND access_id=$5`, [targetStatus, cleanHospitalName, cleanHospitalLocation, clinicId, String(reference)]);
        await this.insertAudit(client, clinicId, String(row.token_hash).trim(), actor.userId || null, audit(targetStatus, statusLabel(targetStatus, cleanHospitalName), actor));
        if (previousCrewId) await client.query("UPDATE crews SET status='ON_DUTY' WHERE clinic_id=$1 AND id=$2", [clinicId, previousCrewId]);
      });
      if (unchanged) return this.getOrderByRef(reference, clinicId);
    }
    await safelyRemovePhoto(terminalPhotoUrl, clinicId);
    if (targetStatus === 'HOSPITAL_TRANSPORT') await this.recalculateRoute(clinicId, String(reference));
    return this.getOrderByRef(reference, clinicId);
  }

  async recalculateRoute(clinicId, reference) {
    const order = await this.getOrderByRef(reference, clinicId);
    if (!order || !ACTIVE_STATUSES.has(order.status)) return order;
    const target = order.status === 'HOSPITAL_TRANSPORT' ? order.hospitalLocation : order.destinationLoc;
    const sourceLocationUpdatedAt = order.locationUpdatedAt || null;
    const sourceStatus = order.status;
    const route = order.currentLoc && target ? await fetchRealRoadRoute(order.currentLoc, target) : null;
    const updatedAt = nowIso();
    if (this.mode === 'file') {
      const stored = this.orders.get(String(reference));
      if (!stored || stored.status !== sourceStatus || (stored.locationUpdatedAt || null) !== sourceLocationUpdatedAt) return stored ? this.filePublic(stored) : null;
      stored.routePath = route?.path || [];
      stored.etaMinutes = route?.etaMinutes ?? null;
      stored.distanceKm = route?.distanceKm ?? null;
      stored.etaUpdatedAt = route ? updatedAt : null;
      stored.updatedAt = updatedAt;
      this.persist();
      return this.filePublic(stored);
    }
    await withTenant(tenantStore.pool, { clinicId }, client => client.query(`UPDATE orders SET route_path=$1,eta_minutes=$2,distance_km=$3,eta_updated_at=$4
      WHERE clinic_id=$5 AND access_id=$6 AND status=$7 AND location_updated_at IS NOT DISTINCT FROM $8::timestamptz`,
    [JSON.stringify(route?.path || []), route?.etaMinutes ?? null, route?.distanceKm ?? null, route ? updatedAt : null,
      clinicId, String(reference), sourceStatus, sourceLocationUpdatedAt]));
    return this.getOrderByRef(reference, clinicId);
  }

  async updateLocation(clinicId, reference, crewId, lat, lng) {
    const currentLoc = location({ lat, lng });
    if (!currentLoc) throw new StoreError('INVALID_COORDINATES', 'Некорректные координаты', 400);
    const order = await this.getOrderByRef(reference, clinicId);
    if (!order || order.crewId !== String(crewId) || !ACTIVE_STATUSES.has(order.status)) return null;
    const timestamp = nextLocationTimestamp();
    const statusAtUpdate = order.status;
    const target = order.status === 'HOSPITAL_TRANSPORT' ? order.hospitalLocation : order.destinationLoc;
    if (this.mode === 'file') {
      const stored = this.orders.get(order.token);
      if (!stored || stored.crewId !== String(crewId) || !ACTIVE_STATUSES.has(stored.status)) return null;
      if (stored.locationUpdatedAt && new Date(stored.locationUpdatedAt).getTime() >= new Date(timestamp).getTime()) return null;
      stored.currentLoc = currentLoc;
      stored.locationUpdatedAt = timestamp;
      stored.routePath = [];
      stored.etaMinutes = null;
      stored.distanceKm = null;
      stored.etaUpdatedAt = null;
      stored.updatedAt = timestamp;
      await tenantStore.updateCrew(clinicId, crewId, { currentLoc, locationUpdatedAt: timestamp });
      this.persist();
      const route = target ? await fetchRealRoadRoute(currentLoc, target) : null;
      const latest = this.orders.get(order.token);
      if (!latest || latest.status !== statusAtUpdate || latest.locationUpdatedAt !== timestamp
        || latest.currentLoc?.lat !== currentLoc.lat || latest.currentLoc?.lng !== currentLoc.lng) return null;
      latest.routePath = route?.path || [];
      latest.etaMinutes = route?.etaMinutes ?? null;
      latest.distanceKm = route?.distanceKm ?? null;
      latest.etaUpdatedAt = route ? nowIso() : null;
      latest.updatedAt = nowIso();
      this.persist();
      return this.filePublic(latest);
    }
    let didUpdate = false;
    await withTenant(tenantStore.pool, { clinicId }, async client => {
      const result = await client.query(`UPDATE orders SET current_location=$1,location_updated_at=$2,route_path='[]'::jsonb,eta_minutes=NULL,distance_km=NULL,eta_updated_at=NULL
        WHERE clinic_id=$3 AND access_id=$4 AND crew_id=$5 AND status=ANY($6)
          AND (location_updated_at IS NULL OR location_updated_at<$2)`, [currentLoc, timestamp, clinicId, order.token, String(crewId), Array.from(ACTIVE_STATUSES)]);
      if (!result.rowCount) return;
      didUpdate = true;
      await client.query(`UPDATE crews SET current_location=$1,location_updated_at=$2 WHERE clinic_id=$3 AND id=$4
        AND (location_updated_at IS NULL OR location_updated_at<$2)`, [currentLoc, timestamp, clinicId, String(crewId)]);
    });
    if (!didUpdate) return null;
    const route = target ? await fetchRealRoadRoute(currentLoc, target) : null;
    await withTenant(tenantStore.pool, { clinicId }, client => client.query(`UPDATE orders SET route_path=$1,eta_minutes=$2,distance_km=$3,eta_updated_at=$4
      WHERE clinic_id=$5 AND access_id=$6 AND status=$7 AND location_updated_at=$8 AND current_location=$9`,
    [JSON.stringify(route?.path || []), route?.etaMinutes ?? null, route?.distanceKm ?? null, route ? nowIso() : null,
      clinicId, order.token, statusAtUpdate, timestamp, currentLoc]));
    const finalOrder = await this.getOrderByRef(order.token, clinicId);
    return finalOrder && ACTIVE_STATUSES.has(finalOrder.status) ? finalOrder : null;
  }

  async updateAccessInfo(reference, accessData, rawPatientToken) {
    const expectedTokenHash = patientTokenDigest(rawPatientToken);
    const order = await this.getOrderByRef(reference);
    if (!order || order.expired || !ACTIVE_STATUSES.has(order.status)) return null;
    const allowed = ['residenceType', 'intercom', 'gateCode', 'entrance', 'floor', 'note', 'photoUrl'];
    const sanitized = {};
    let savedPhoto = null;
    for (const field of allowed) {
      if (accessData?.[field] === undefined) continue;
      const value = String(accessData[field] ?? '').trim();
      if (field === 'residenceType' && value && !['apartment', 'house'].includes(value)) throw new StoreError('INVALID_RESIDENCE_TYPE', 'Некорректный тип жилья', 400);
      const max = field === 'note' ? 500 : field === 'photoUrl' ? 1_100_000 : 100;
      if (field === 'photoUrl' && value.startsWith('data:')) {
        try { savedPhoto = await saveAccessPhoto(value, photoStorage(order.clinicId)); }
        catch (error) {
          if (error instanceof PhotoError) throw new StoreError(error.code, error.message, error.status);
          throw error;
        }
        sanitized.photoUrl = savedPhoto.url;
        continue;
      }
      if (field === 'photoUrl' && value) {
        // Existing opaque URLs are display state, not writable capabilities.
        // Ignore an unchanged echo and reject attempts to restore/swap a URL.
        if (value === order.accessInfo?.photoUrl) continue;
        throw new StoreError('INVALID_PHOTO_URL', 'Некорректная ссылка на фото', 400);
      }
      sanitized[field] = value.slice(0, max);
    }
    try {
      const patched = await this.patchPatientData(order, 'accessInfo', sanitized,
        audit('ACCESS_UPDATED', 'Пациент уточнил информацию о доступе'), expectedTokenHash);
      const updated = patched?.order;
      if (!updated || !ACTIVE_STATUSES.has(updated.status) || updated.patientAccessExpired) throw new StoreError('ORDER_NOT_ACTIVE', 'Вызов завершён или ссылка пациента истекла', 409);
      if (patched.previousPhotoUrl && patched.previousPhotoUrl !== updated.accessInfo.photoUrl) await safelyRemovePhoto(patched.previousPhotoUrl, order.clinicId);
      return updated;
    } catch (error) {
      if (savedPhoto) await safelyRemovePhoto(savedPhoto.url, order.clinicId);
      throw error;
    }
  }

  async updateSymptoms(reference, symptoms, rawPatientToken) {
    const expectedTokenHash = patientTokenDigest(rawPatientToken);
    const order = await this.getOrderByRef(reference);
    if (!order || order.expired || !ACTIVE_STATUSES.has(order.status)) return null;
    if (!Array.isArray(symptoms) || symptoms.length > 20) throw new StoreError('INVALID_SYMPTOMS', 'Некорректный список симптомов', 400);
    const sanitized = symptoms.map(value => String(value || '').trim().slice(0, 100)).filter(Boolean);
    const patched = await this.patchPatientData(order, 'symptoms', sanitized,
      audit('SYMPTOMS_UPDATED', `Обновлены симптомы (${sanitized.join(', ') || 'не указаны'})`), expectedTokenHash);
    if (!patched?.order || !ACTIVE_STATUSES.has(patched.order.status) || patched.order.patientAccessExpired) throw new StoreError('ORDER_NOT_ACTIVE', 'Вызов завершён или ссылка пациента истекла', 409);
    return patched.order;
  }

  async patchPatientData(order, field, value, entry, expectedTokenHash) {
    if (this.mode === 'file') {
      const stored = this.orders.get(order.token);
      if (!stored || stored.patientTokenHash !== expectedTokenHash || !ACTIVE_STATUSES.has(stored.status)
        || new Date(stored.patientAccessExpiresAt).getTime() <= Date.now()) return null;
      const clinicActive = tenantStore.data?.clinics?.some(clinic => clinic.id === stored.clinicId && clinic.status === 'ACTIVE');
      if (!clinicActive) return null;
      const previousPhotoUrl = field === 'accessInfo' ? stored.accessInfo?.photoUrl || '' : '';
      stored[field] = field === 'accessInfo' ? { ...stored.accessInfo, ...value } : value;
      stored.updatedAt = nowIso(); stored.auditLogs.push(entry); this.persist();
      return { order: this.filePublic(stored), previousPhotoUrl };
    }
    let didUpdate = false;
    let previousPhotoUrl = '';
    await withTenant(tenantStore.pool, { clinicId: order.clinicId }, async client => {
      let row;
      if (field === 'accessInfo') {
        row = (await client.query(`SELECT o.token_hash,o.status,o.expires_at,o.access_info
          FROM orders o JOIN clinics cl ON cl.id=o.clinic_id
          WHERE o.access_id=$1 AND o.token_hash=$2 AND cl.status='ACTIVE' FOR UPDATE OF o`,
        [order.token, expectedTokenHash])).rows[0];
        if (!row || !ACTIVE_STATUSES.has(row.status) || new Date(row.expires_at).getTime() <= Date.now()) return;
        previousPhotoUrl = row.access_info?.photoUrl || '';
        await client.query('UPDATE orders SET access_info=$1 WHERE access_id=$2', [{ ...(row.access_info || {}), ...value }, order.token]);
      } else {
        row = (await client.query(`UPDATE orders SET symptoms=$1
          WHERE access_id=$2 AND token_hash=$3 AND status=ANY($4) AND expires_at>now()
            AND EXISTS (SELECT 1 FROM clinics WHERE clinics.id=orders.clinic_id AND clinics.status='ACTIVE')
          RETURNING token_hash`, [JSON.stringify(value), order.token, expectedTokenHash, Array.from(ACTIVE_STATUSES)])).rows[0];
      }
      if (row) {
        didUpdate = true;
        await this.insertAudit(client, order.clinicId, String(row.token_hash).trim(), null, entry);
      }
    });
    return didUpdate ? { order: await this.getOrderByRef(order.token, order.clinicId), previousPhotoUrl } : null;
  }

  async toggleSimulation(clinicId, reference, isSimulating) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SIMULATION !== 'true') throw new StoreError('SIMULATION_DISABLED', 'Симуляция отключена', 403);
    const enabled = Boolean(isSimulating);
    if (this.mode === 'file') {
      const order = this.orders.get(String(reference));
      if (!order || order.clinicId !== clinicId || !ACTIVE_STATUSES.has(order.status)) return null;
      order.isSimulating = enabled; order.updatedAt = nowIso(); this.persist(); return this.filePublic(order);
    }
    await withTenant(tenantStore.pool, { clinicId }, client => client.query('UPDATE orders SET is_simulating=$1 WHERE clinic_id=$2 AND access_id=$3 AND status=ANY($4)', [enabled, clinicId, String(reference), Array.from(ACTIVE_STATUSES)]));
    return this.getOrderByRef(reference, clinicId);
  }
}

function orderPriorityLabel(priority) {
  return ({ EMERGENCY: 'Экстренный', URGENT: 'Срочный', STANDARD: 'Стандартный' })[priority] || 'Экстренный';
}

function statusLabel(status, hospitalName) {
  return ({ ACCEPTED: 'Бригада приняла вызов', EN_ROUTE: 'Бригада выехала к пациенту', ARRIVED: 'Бригада прибыла по адресу', HOSPITAL_TRANSPORT: `Транспортировка в ${hospitalName || 'стационар'}`, COMPLETED: 'Вызов завершён' })[status] || `Статус изменён на ${status}`;
}

export const orderStore = new OrderStore();
