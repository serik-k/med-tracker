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
      }
    });

    socket.value.on('status_updated', ({ token, status, expired }: { token: string; status: OrderStatus; expired: boolean }) => {
      const foundInList = activeOrders.value.find(o => o.token === token);
      if (foundInList) {
        foundInList.status = status;
        foundInList.expired = expired;
      }
      if (currentOrder.value && currentOrder.value.token === token) {
        currentOrder.value.status = status;
        currentOrder.value.expired = expired;
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
  }

  // Dispatcher actions
  function joinDispatcherRoom() {
    initSocket();
    socket.value?.emit('join_dispatcher');
  }

  async function createOrder(payload: { patientPhone: string; patientName: string; address: string; carNumber?: string; lat?: number; lng?: number }) {
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

  function updateStatus(token: string, status: OrderStatus) {
    socket.value?.emit('update_status', { token, status });
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
    initSocket,
    joinDispatcherRoom,
    createOrder,
    joinOrderRoom,
    sendLocation,
    updateStatus,
    updateAccessInfo,
    updateSymptoms,
    toggleSimulation
  };
});
