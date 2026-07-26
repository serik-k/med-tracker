import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import type { Order, OrderStatus, AccessInfo } from '@/types';

export const useOrderStore = defineStore('orders', () => {
  const socket = ref<Socket | null>(null);
  const activeOrders = ref<Order[]>([]);
  const currentOrder = ref<Order | null>(null);
  const isConnected = ref(false);
  const errorMsg = ref<string | null>(null);
  const lastLocationUpdate = ref<number | null>(null);
  const joinedCrewId = ref<string | null>(null);

  // Initialize socket connection
  function initSocket() {
    if (socket.value) return;

    // Use current origin or local dev backend server
    const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
    socket.value = io(serverUrl, {
      reconnectionAttempts: 5
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      errorMsg.value = null;
      console.log('[Socket] Connected to server');
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
      console.log('[Socket] Disconnected from server');
    });

    socket.value.on('all_orders', (orders: Order[]) => {
      activeOrders.value = orders;
    });

    socket.value.on('order_data', (order: Order) => {
      currentOrder.value = order;
      errorMsg.value = order.expired ? 'Вызов уже завершён.' : null;
      lastLocationUpdate.value = Date.now();
    });

    socket.value.on('crew_order', (order: Order) => {
      currentOrder.value = order;
      lastLocationUpdate.value = Date.now();
      socket.value?.emit('join_order', order.token);
    });

    socket.value.on('crew_order_cleared', ({ token }: { token: string }) => {
      if (currentOrder.value?.token === token) currentOrder.value = null;
    });

    socket.value.on('order_created', (order: Order) => {
      activeOrders.value.push(order);
    });

    socket.value.on('location_updated', ({ token, currentLoc }: { token: string; currentLoc: { lat: number; lng: number } }) => {
      // Update in activeOrders list
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.currentLoc = currentLoc;
      }
      // Update in currentOrder if viewing single track
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.currentLoc = currentLoc;
        lastLocationUpdate.value = Date.now();
      }
    });

    socket.value.on('status_updated', ({ token, status, expired, completedAt }: { token: string; status: OrderStatus; expired: boolean; completedAt?: string }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.status = status;
        foundInList.expired = expired;
        foundInList.completedAt = completedAt;
      }
      if (currentOrder.value && currentOrder.value.token === token) {
        if (status === 'COMPLETED' && joinedCrewId.value) {
          currentOrder.value = null;
        } else {
          currentOrder.value.status = status;
          currentOrder.value.expired = expired;
          currentOrder.value.completedAt = completedAt;
        }
      }
    });

    socket.value.on('access_updated', ({ token, accessInfo }: { token: string; accessInfo: AccessInfo }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.accessInfo = accessInfo;
      }
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.accessInfo = accessInfo;
      }
    });

    socket.value.on('symptoms_updated', ({ token, symptoms }: { token: string; symptoms: string[] }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.symptoms = symptoms;
      }
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.symptoms = symptoms;
      }
    });

    socket.value.on('simulation_toggled', ({ token, isSimulating }: { token: string; isSimulating: boolean }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) foundInList.isSimulating = isSimulating;
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.isSimulating = isSimulating;
      }
    });

    socket.value.on('sos_triggered', ({ token, sosAlert, sosTime }: { token: string; sosAlert: boolean; sosTime: string }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.sosAlert = sosAlert;
        foundInList.sosTime = sosTime;
      }
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.sosAlert = sosAlert;
        currentOrder.value.sosTime = sosTime;
      }
    });
  }

  // Dispatcher actions
  function joinDispatcherRoom() {
    initSocket();
    joinedCrewId.value = null;
    socket.value?.emit('join_dispatcher');
  }

  function joinCrewRoom(crewId: string) {
    initSocket();
    joinedCrewId.value = crewId;
    const join = () => socket.value?.emit('join_crew', crewId);
    if (socket.value?.connected) join();
    else socket.value?.once('connect', join);

    fetch(`/api/crews/${encodeURIComponent(crewId)}/active-order`)
      .then(res => res.status === 204 ? null : res.ok ? res.json() : Promise.reject(new Error('Failed to load crew order')))
      .then((order: Order | null) => {
        if (!order) {
          currentOrder.value = null;
          return;
        }
        currentOrder.value = order;
        lastLocationUpdate.value = Date.now();
        socket.value?.emit('join_order', order.token);
      })
      .catch(err => console.error('[Crew] Failed to load active order:', err));
  }

  async function createOrder(payload: { patientPhone: string; patientName: string; address: string; carNumber?: string; priority?: string; lat?: number; lng?: number }) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create order');
      const newOrder: Order = await res.json();
      return newOrder;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  }

  // Patient / Driver actions
  function joinOrderRoom(token: string) {
    initSocket();
    joinedCrewId.value = null;
    errorMsg.value = null;
    currentOrder.value = null;
    socket.value?.emit('join_order', token);
    
    // Fetch initial state via REST API to ensure immediate load
    fetch(`/api/orders/${token}`)
      .then(res => {
        if (res.status === 410) {
          errorMsg.value = 'Ссылка сгорела! Вызов уже завершен.';
          return null;
        }
        if (!res.ok) {
          errorMsg.value = 'Ссылка недействительна или не найдена.';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) currentOrder.value = data;
      })
      .catch(err => {
        console.error(err);
        errorMsg.value = 'Ошибка загрузки данных вызова';
      });
  }

  function sendLocation(token: string, lat: number, lng: number) {
    socket.value?.emit('update_location', { token, lat, lng });
  }

  function updateStatus(token: string, status: OrderStatus, hospitalName?: string) {
    socket.value?.emit('update_status', { token, status, hospitalName });
  }

  function triggerSos(token: string, note?: string) {
    socket.value?.emit('trigger_sos', { token, note });
  }

  function updateAccessInfo(token: string, accessInfo: Partial<AccessInfo>) {
    socket.value?.emit('update_access', { token, accessInfo });
  }

  function updateSymptoms(token: string, symptoms: string[]) {
    socket.value?.emit('update_symptoms', { token, symptoms });
  }

  function toggleSimulation(token: string, isSimulating: boolean) {
    socket.value?.emit('toggle_simulation', { token, isSimulating });
  }

  return {
    socket,
    activeOrders,
    currentOrder,
    isConnected,
    errorMsg,
    lastLocationUpdate,
    joinedCrewId,
    initSocket,
    joinDispatcherRoom,
    joinCrewRoom,
    createOrder,
    joinOrderRoom,
    sendLocation,
    updateStatus,
    triggerSos,
    updateAccessInfo,
    updateSymptoms,
    toggleSimulation
  };
});
