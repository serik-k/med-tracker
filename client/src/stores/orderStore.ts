import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import type {
  AccessInfo,
  CreatedOrder,
  Crew,
  Location,
  Order,
  OrderPriority,
  OrderStatus,
  PatientAccessLink
} from '@/types';
import { apiFetch, apiJson, errorMessage, readApiError } from '@/services/api';
import { useCrewStore } from '@/stores/crewStore';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';
type AccessState = 'idle' | 'loading' | 'ready' | 'empty' | 'invalid' | 'expired' | 'error';
type RoomIntent = { kind: 'dispatcher' } | { kind: 'crew' } | { kind: 'patient'; token: string };

interface AckEnvelope<T = unknown> {
  ok?: boolean;
  data?: T;
  order?: T;
  orders?: Order[];
  crews?: Crew[];
  error?: string | { code?: string; message?: string };
}

const ACK_TIMEOUT = 8_000;

function normalizeOrder(raw: Order): Order {
  const {
    patientAccessToken: _patientAccessToken,
    patientAccessPath: _patientAccessPath,
    patientAccessExpiresAt: _patientAccessExpiresAt,
    ...safe
  } = raw as Order & Partial<PatientAccessLink>;
  return {
    ...safe,
    crewId: safe.crewId || safe.assignedCrew?.id || null,
    carNumber: safe.carNumber || safe.assignedCrew?.carPlate || safe.assignedCrew?.name || '',
    accessInfo: {
      residenceType: safe.accessInfo?.residenceType,
      intercom: safe.accessInfo?.intercom || '',
      gateCode: safe.accessInfo?.gateCode || '',
      entrance: safe.accessInfo?.entrance || '',
      floor: safe.accessInfo?.floor || '',
      note: safe.accessInfo?.note || '',
      photoUrl: safe.accessInfo?.photoUrl || ''
    },
    symptoms: Array.isArray(safe.symptoms) ? safe.symptoms : [],
    auditLogs: Array.isArray(safe.auditLogs) ? safe.auditLogs : []
  };
}

function ackError(response?: AckEnvelope) {
  if (!response || response.ok !== false) return '';
  return typeof response.error === 'string' ? response.error : response.error?.message || 'Сервер отклонил действие';
}

function orderVersion(order: Partial<Order>) {
  return Math.max(0, ...[order.updatedAt, order.locationUpdatedAt, order.etaUpdatedAt, order.createdAt]
    .map(value => value ? Date.parse(value) : 0)
    .filter(Number.isFinite));
}

function isIncomingCurrent(existing: Partial<Order>, incoming: Partial<Order>) {
  const existingVersion = orderVersion(existing);
  const incomingVersion = orderVersion(incoming);
  return !existingVersion || !incomingVersion || incomingVersion >= existingVersion;
}

export const useOrderStore = defineStore('orders', () => {
  const socket = ref<Socket | null>(null);
  const activeOrders = ref<Order[]>([]);
  const currentOrder = ref<Order | null>(null);
  const connectionState = ref<ConnectionState>('idle');
  const errorMsg = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const lastLocationUpdate = ref<number | null>(null);
  const driverAccessState = ref<AccessState>('idle');
  const patientAccessState = ref<AccessState>('idle');
  const pendingActions = ref<Set<string>>(new Set());
  const isConnected = computed(() => connectionState.value === 'connected');
  let socketAuthKey = '';
  let roomIntent: RoomIntent | null = null;
  let stateGeneration = 0;
  let orderRevision = 0;

  function setPending(key: string, pending: boolean) {
    const next = new Set(pendingActions.value);
    pending ? next.add(key) : next.delete(key);
    pendingActions.value = next;
  }

  function isPending(key: string) {
    return pendingActions.value.has(key);
  }

  function orderFromResponse<T>(response: AckEnvelope<T> | T): T | undefined {
    const envelope = response as AckEnvelope<T>;
    return envelope?.order ?? envelope?.data ?? (response as T);
  }

  function upsertOrder(raw: Order) {
    orderRevision += 1;
    const order = normalizeOrder(raw);
    const index = activeOrders.value.findIndex(item => item.token === order.token);
    if (index === -1) activeOrders.value.push(order);
    else if (isIncomingCurrent(activeOrders.value[index], order)) activeOrders.value[index] = order;
    if (currentOrder.value?.token === order.token && isIncomingCurrent(currentOrder.value, order)) currentOrder.value = order;
    return index === -1 ? order : activeOrders.value[index];
  }

  function patchOrder(token: string, patch: Partial<Order>) {
    orderRevision += 1;
    const index = activeOrders.value.findIndex(item => item.token === token);
    if (index !== -1 && isIncomingCurrent(activeOrders.value[index], patch)) activeOrders.value[index] = normalizeOrder({ ...activeOrders.value[index], ...patch });
    if (currentOrder.value?.token === token && isIncomingCurrent(currentOrder.value, patch)) currentOrder.value = normalizeOrder({ ...currentOrder.value, ...patch });
  }

  function setCurrentOrder(raw: Order | null) {
    const normalized = raw ? normalizeOrder(raw) : null;
    if (!normalized || !currentOrder.value || currentOrder.value.token !== normalized.token || isIncomingCurrent(currentOrder.value, normalized)) currentOrder.value = normalized;
    const timestamp = currentOrder.value?.locationUpdatedAt ? Date.parse(currentOrder.value.locationUpdatedAt) : NaN;
    lastLocationUpdate.value = Number.isFinite(timestamp) ? timestamp : null;
  }

  function socketCommand<T = unknown>(event: string, payload: Record<string, unknown> = {}) {
    return new Promise<AckEnvelope<T>>((resolve, reject) => {
      const client = socket.value;
      if (!client?.connected) {
        reject(new Error('Нет связи с диспетчерской. Дождитесь восстановления соединения.'));
        return;
      }
      client.timeout(ACK_TIMEOUT).emit(event, payload, (timeoutError: Error | null, response: AckEnvelope<T>) => {
        if (timeoutError) {
          reject(new Error('Сервер не подтвердил действие. Повторите попытку.'));
          return;
        }
        const message = ackError(response);
        if (message) reject(new Error(message));
        else resolve(response || { ok: true });
      });
    });
  }

  async function rejoinRoom() {
    if (!roomIntent || !socket.value?.connected) return;
    const generation = stateGeneration;
    try {
      if (roomIntent.kind === 'dispatcher') {
        const response = await socketCommand('join_dispatcher');
        if (generation !== stateGeneration) return;
        if (response.orders) {
          orderRevision += 1;
          activeOrders.value = response.orders.map(normalizeOrder);
        }
        if (response.crews) useCrewStore().setCrews(response.crews);
      } else if (roomIntent.kind === 'crew') {
        const response = await socketCommand<Order>('join_crew');
        if (generation !== stateGeneration) return;
        const order = orderFromResponse(response);
        if (order && typeof order === 'object' && 'token' in order) {
          setCurrentOrder(order as Order);
          driverAccessState.value = 'ready';
        }
      } else {
        const response = await socketCommand<Order>('join_order', { token: roomIntent.token });
        if (generation !== stateGeneration) return;
        const order = orderFromResponse(response);
        if (order && typeof order === 'object' && 'token' in order) setCurrentOrder(order as Order);
      }
      if (generation !== stateGeneration) return;
      errorMsg.value = null;
    } catch (error) {
      if (generation !== stateGeneration || !roomIntent) return;
      const message = errorMessage(error, 'Не удалось восстановить realtime-сессию');
      if (roomIntent.kind === 'crew' && driverAccessState.value !== 'empty') driverAccessState.value = 'error';
      if (roomIntent.kind === 'patient') patientAccessState.value = 'error';
      errorMsg.value = message;
    }
  }

  function revokeClientAccess(client: Socket, scope?: string, reason = 'ACCESS_REVOKED') {
    if (socket.value !== client) return;
    const intent = roomIntent;
    const accessScope = scope || (intent?.kind === 'crew' ? 'driver' : intent?.kind === 'patient' ? 'patient' : 'staff');

    stateGeneration += 1;
    client.removeAllListeners();
    client.io.removeAllListeners();
    client.disconnect();
    socket.value = null;
    socketAuthKey = '';
    roomIntent = null;
    connectionState.value = 'idle';
    activeOrders.value = [];
    setCurrentOrder(null);
    pendingActions.value = new Set();
    actionError.value = null;

    if (accessScope === 'staff') {
      errorMsg.value = 'Сессия завершена. Войдите снова.';
      useCrewStore().clear();
      window.dispatchEvent(new CustomEvent('medtracker:unauthorized', { detail: { reason } }));
      return;
    }
    if (accessScope === 'driver') {
      driverAccessState.value = 'invalid';
      errorMsg.value = 'Доступ бригады отозван или истёк. Откройте новую защищённую ссылку.';
      return;
    }
    patientAccessState.value = reason.includes('EXPIRED') ? 'expired' : 'invalid';
    errorMsg.value = reason.includes('EXPIRED') ? 'Ссылка больше не действует.' : 'Доступ к вызову отозван.';
  }

  function installSocketHandlers(client: Socket) {
    client.on('connect', () => {
      connectionState.value = 'connected';
      actionError.value = null;
      void rejoinRoom();
    });
    client.io.on('reconnect_attempt', () => { connectionState.value = 'reconnecting'; });
    client.on('disconnect', reason => {
      if (reason === 'io server disconnect') {
        revokeClientAccess(client);
        return;
      }
      connectionState.value = reason === 'io client disconnect' ? 'idle' : 'reconnecting';
    });
    client.on('connect_error', () => { connectionState.value = 'offline'; });
    client.on('access_revoked', (payload?: { scope?: string; reason?: string }) => revokeClientAccess(client, payload?.scope, payload?.reason));
    client.on('session_revoked', (payload?: { reason?: string }) => revokeClientAccess(client, 'staff', payload?.reason));

    client.on('all_orders', (orders: Order[]) => { orderRevision += 1; activeOrders.value = orders.map(normalizeOrder); });
    client.on('all_crews', (crews: Crew[]) => { useCrewStore().setCrews(crews); });
    client.on('crew_added', (crew: Crew) => useCrewStore().upsertCrew(crew));
    client.on('crew_updated', (crew: Crew) => useCrewStore().upsertCrew(crew));
    client.on('crew_deleted', (id: string) => useCrewStore().removeCrew(id));

    client.on('order_data', (order: Order) => {
      setCurrentOrder(order);
      if (roomIntent?.kind === 'patient') patientAccessState.value = 'ready';
    });
    client.on('crew_order', (order: Order) => {
      setCurrentOrder(order);
      driverAccessState.value = 'ready';
      roomIntent = { kind: 'crew' };
      void socketCommand('join_order', { token: order.token }).catch(() => undefined);
    });
    client.on('crew_order_cleared', ({ token }: { token: string }) => {
      if (currentOrder.value?.token === token) setCurrentOrder(null);
      driverAccessState.value = 'empty';
    });
    client.on('order_created', (order: Order) => upsertOrder(order));
    const replaceOrder = (payload: Order | { order: Order }) => upsertOrder('order' in payload ? payload.order : payload);
    client.on('order_updated', replaceOrder);
    client.on('order_assigned', replaceOrder);
    client.on('assignment_updated', replaceOrder);
    client.on('order_cancelled', (payload: Order | { order: Order; token?: string }) => {
      if ('order' in payload) upsertOrder(payload.order);
      else upsertOrder(payload as Order);
      if (roomIntent?.kind === 'crew' && currentOrder.value?.status === 'CANCELLED') {
        setCurrentOrder(null);
        driverAccessState.value = 'empty';
      }
    });

    client.on('location_updated', (payload: { token: string; currentLoc: Location; routePath?: Location[]; etaMinutes?: number; distanceKm?: number; locationUpdatedAt?: string; etaUpdatedAt?: string; updatedAt?: string }) => {
      patchOrder(payload.token, payload);
      if (currentOrder.value?.token === payload.token) {
        const timestamp = payload.locationUpdatedAt ? Date.parse(payload.locationUpdatedAt) : Date.now();
        lastLocationUpdate.value = Number.isFinite(timestamp) ? timestamp : Date.now();
      }
    });
    client.on('status_updated', (payload: { token: string } & Partial<Order>) => patchOrder(payload.token, payload));
    client.on('access_updated', (payload: { token: string; accessInfo: AccessInfo; auditLogs?: Order['auditLogs']; updatedAt?: string }) => patchOrder(payload.token, payload));
    client.on('symptoms_updated', (payload: { token: string; symptoms: string[]; auditLogs?: Order['auditLogs']; updatedAt?: string }) => patchOrder(payload.token, payload));
    client.on('simulation_toggled', (payload: { token: string; isSimulating: boolean }) => patchOrder(payload.token, payload));
  }

  function initSocket(auth: Record<string, string> = {}) {
    const authKey = JSON.stringify(auth);
    if (socket.value && socketAuthKey === authKey) {
      if (!socket.value.connected) socket.value.connect();
      else void rejoinRoom();
      return socket.value;
    }
    disconnectSocket(false);
    socketAuthKey = authKey;
    connectionState.value = 'connecting';
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    const client = io(serverUrl, {
      withCredentials: true,
      auth,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 8_000,
      timeout: 10_000
    });
    socket.value = client;
    installSocketHandlers(client);
    return client;
  }

  function disconnectSocket(clearIntent = true) {
    const client = socket.value;
    if (client) {
      client.removeAllListeners();
      client.io.removeAllListeners();
      client.disconnect();
    }
    socket.value = null;
    socketAuthKey = '';
    connectionState.value = 'idle';
    if (clearIntent) roomIntent = null;
  }

  async function joinDispatcherRoom() {
    const generation = stateGeneration;
    const revision = orderRevision;
    roomIntent = { kind: 'dispatcher' };
    initSocket();
    try {
      const orders = await apiJson<Order[]>('/api/orders');
      if (generation !== stateGeneration) return;
      if (revision !== orderRevision) return;
      const archived = activeOrders.value.filter(order => order.expired || order.status === 'COMPLETED' || order.status === 'CANCELLED');
      orderRevision += 1;
      activeOrders.value = [...archived, ...orders.map(normalizeOrder)];
    } catch (error) {
      if (generation === stateGeneration) errorMsg.value = errorMessage(error, 'Не удалось загрузить вызовы');
    }
  }

  async function joinCrewRoom(accessToken: string) {
    const generation = stateGeneration;
    setCurrentOrder(null);
    errorMsg.value = null;
    driverAccessState.value = 'loading';
    roomIntent = { kind: 'crew' };
    initSocket({ driverToken: accessToken });
    try {
      const response = await apiFetch('/api/public/driver-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken })
      });
      if (generation !== stateGeneration) return null;
      if (response.status === 204) {
        driverAccessState.value = 'empty';
        return null;
      }
      if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 410) {
        driverAccessState.value = 'invalid';
        throw await readApiError(response, 'Ссылка бригады недействительна или отозвана');
      }
      if (!response.ok) throw await readApiError(response, 'Не удалось загрузить вызов');
      const order = normalizeOrder(await response.json() as Order);
      setCurrentOrder(order);
      driverAccessState.value = 'ready';
      if (socket.value?.connected) await rejoinRoom();
      return order;
    } catch (error) {
      if (generation !== stateGeneration) return null;
      errorMsg.value = errorMessage(error, 'Не удалось загрузить вызов');
      if (driverAccessState.value !== 'invalid') driverAccessState.value = 'error';
      return null;
    }
  }

  async function joinOrderRoom(patientSecret: string) {
    const generation = stateGeneration;
    setCurrentOrder(null);
    errorMsg.value = null;
    patientAccessState.value = 'loading';
    roomIntent = null;
    disconnectSocket(false);
    try {
      const response = await apiFetch('/api/public/order-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: patientSecret })
      });
      if (generation !== stateGeneration) return null;
      if (response.status === 410) {
        patientAccessState.value = 'expired';
        throw await readApiError(response, 'Ссылка больше не действует');
      }
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        patientAccessState.value = 'invalid';
        throw await readApiError(response, 'Ссылка недействительна или отозвана');
      }
      if (!response.ok) throw await readApiError(response, 'Не удалось загрузить вызов');
      const order = normalizeOrder(await response.json() as Order);
      setCurrentOrder(order);
      patientAccessState.value = 'ready';
      roomIntent = { kind: 'patient', token: order.token };
      initSocket({ patientToken: patientSecret });
      return order;
    } catch (error) {
      if (generation !== stateGeneration) return null;
      errorMsg.value = errorMessage(error, 'Не удалось загрузить вызов');
      if (!['invalid', 'expired'].includes(patientAccessState.value)) patientAccessState.value = 'error';
      return null;
    }
  }

  async function createOrder(payload: { patientPhone: string; patientName: string; address: string; crewId?: string | null; priority?: OrderPriority; lat?: number; lng?: number }, idempotencyKey?: string) {
    const generation = stateGeneration;
    const revision = orderRevision;
    const created = await apiJson<CreatedOrder>('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: JSON.stringify(payload)
    });
    if (generation === stateGeneration && revision === orderRevision) upsertOrder(created);
    return created;
  }

  async function assignOrder(token: string, crewId: string | null) {
    const generation = stateGeneration;
    const revision = orderRevision;
    const response = await apiJson<Order | { order: Order }>(`/api/orders/${encodeURIComponent(token)}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewId })
    });
    const order = 'order' in response ? response.order : response;
    return generation === stateGeneration && revision === orderRevision ? upsertOrder(order) : order;
  }

  async function cancelOrder(token: string, reason?: string) {
    const generation = stateGeneration;
    const revision = orderRevision;
    const response = await apiJson<Order | { order: Order }>(`/api/orders/${encodeURIComponent(token)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason?.trim() || undefined })
    });
    const order = 'order' in response ? response.order : response;
    return generation === stateGeneration && revision === orderRevision ? upsertOrder(order) : order;
  }

  async function createPatientAccessLink(token: string): Promise<PatientAccessLink> {
    const response = await apiJson<PatientAccessLink & { token?: string; path?: string; expiresAt?: string }>(`/api/orders/${encodeURIComponent(token)}/patient-access-link`, { method: 'POST' });
    return {
      patientAccessToken: response.patientAccessToken || response.token || '',
      patientAccessPath: response.patientAccessPath || response.path || '',
      patientAccessExpiresAt: response.patientAccessExpiresAt || response.expiresAt
    };
  }

  async function createViewerAccessLink(token: string) {
    return apiJson<{ token: string; path: string; expiresAt?: string; scope: 'viewer'; orderId: string }>(`/api/orders/${encodeURIComponent(token)}/viewer-access-link`, { method: 'POST' });
  }

  async function getCrewAccessLink(crewId: string) {
    return apiJson<{ token: string; path: string; expiresAt?: string }>(`/api/crews/${encodeURIComponent(crewId)}/access-link`, { method: 'POST' });
  }

  async function runSocketAction<T>(key: string, event: string, payload: Record<string, unknown>) {
    const generation = stateGeneration;
    setPending(key, true);
    actionError.value = null;
    try {
      const response = await socketCommand<T>(event, payload);
      if (generation !== stateGeneration) throw new Error('Сессия изменилась до подтверждения действия');
      return response;
    } catch (error) {
      if (generation === stateGeneration) actionError.value = errorMessage(error);
      throw error;
    } finally {
      if (generation === stateGeneration) setPending(key, false);
    }
  }

  async function sendLocation(token: string, lat: number, lng: number) {
    const revision = orderRevision;
    const response = await runSocketAction<Order>('location', 'update_location', { token, lat, lng });
    const order = orderFromResponse(response);
    if (revision === orderRevision && order && typeof order === 'object' && 'token' in order) upsertOrder(order as Order);
    return response;
  }

  async function updateStatus(token: string, status: OrderStatus, hospitalName?: string, hospitalLocation?: Location) {
    const revision = orderRevision;
    const response = await runSocketAction<Order>('status', 'update_status', { token, status, hospitalName, hospitalLocation });
    const order = orderFromResponse(response);
    if (revision === orderRevision && order && typeof order === 'object' && 'token' in order) upsertOrder(order as Order);
    else if (revision === orderRevision) patchOrder(token, { status, hospitalName, hospitalLocation, expired: status === 'COMPLETED' || status === 'CANCELLED' });
    return response;
  }

  async function updateAccessInfo(token: string, accessInfo: Partial<AccessInfo>) {
    const revision = orderRevision;
    const response = await runSocketAction<Order>('access', 'update_access', { token, accessInfo });
    const order = orderFromResponse(response);
    if (revision === orderRevision && order && typeof order === 'object' && 'token' in order) upsertOrder(order as Order);
    return response;
  }

  async function updateSymptoms(token: string, symptoms: string[]) {
    const revision = orderRevision;
    const response = await runSocketAction<Order>('symptoms', 'update_symptoms', { token, symptoms });
    const order = orderFromResponse(response);
    if (revision === orderRevision && order && typeof order === 'object' && 'token' in order) upsertOrder(order as Order);
    return response;
  }

  async function toggleSimulation(token: string, isSimulating: boolean) {
    const revision = orderRevision;
    const response = await runSocketAction<Order>('simulation', 'toggle_simulation', { token, isSimulating });
    if (revision === orderRevision) patchOrder(token, { isSimulating });
    return response;
  }

  function reset() {
    stateGeneration += 1;
    orderRevision = 0;
    disconnectSocket();
    activeOrders.value = [];
    setCurrentOrder(null);
    errorMsg.value = null;
    actionError.value = null;
    driverAccessState.value = 'idle';
    patientAccessState.value = 'idle';
    pendingActions.value = new Set();
  }

  return {
    socket,
    activeOrders,
    currentOrder,
    isConnected,
    connectionState,
    errorMsg,
    actionError,
    lastLocationUpdate,
    driverAccessState,
    patientAccessState,
    pendingActions,
    isPending,
    initSocket,
    disconnectSocket,
    reset,
    joinDispatcherRoom,
    joinCrewRoom,
    joinOrderRoom,
    createOrder,
    assignOrder,
    cancelOrder,
    createPatientAccessLink,
    createViewerAccessLink,
    getCrewAccessLink,
    sendLocation,
    updateStatus,
    updateAccessInfo,
    updateSymptoms,
    toggleSimulation
  };
});
