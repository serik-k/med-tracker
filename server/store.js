import { geocodeAlmatyAddress } from './services/geocoding.js';
import { fetchRealRoadRoute } from './services/routing.js';
import { loadSavedOrders, saveOrdersToFile } from './db/fileStore.js';

class OrderStore {
  constructor() {
    this.orders = loadSavedOrders();
    if (this.orders.size === 0) {
      this.initDemoData();
    }
  }

  async initDemoData() {
    const demoToken = 'demo-track-123';
    const startLoc = { lat: 43.2380, lng: 76.9420 };
    const destLoc = { lat: 43.2241, lng: 76.9532 };
    const realRoute = await fetchRealRoadRoute(startLoc, destLoc);

    const demoOrder = {
      id: 'ORD-7701',
      token: demoToken,
      patientPhone: '+7 (777) 888-77-66',
      patientName: 'Алексей Мусинов',
      address: 'г. Алматы, пр. Аль-Фараби, д. 77/7, кв. 45',
      destinationLoc: destLoc,
      carNumber: 'Скорая №103 (02 KZ 777 ABC)',
      status: 'EN_ROUTE',
      currentLoc: startLoc,
      routePath: realRoute.path,
      distanceKm: realRoute.distanceKm,
      etaMinutes: realRoute.etaMinutes,
      accessInfo: {
        intercom: '45К1234',
        gateCode: 'Звонить охране ЖК (кнопка 2)',
        entrance: '3',
        floor: '5',
        note: 'Въезд с переулка Достык, шлагбаум открывается автоматикой.'
      },
      symptoms: ['Боль в груди', 'Одышка'],
      isSimulating: true,
      createdAt: new Date().toISOString(),
      expired: false
    };

    this.orders.set(demoToken, demoOrder);
    this.persist();
  }

  async createOrder(data) {
    const token = 'trk_' + Math.random().toString(36).substring(2, 10);
    const id = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
    
    // Real geocoding for Almaty address if coordinates not provided
    let destLoc = { lat: data.lat || 43.2389, lng: data.lng || 76.9454 };
    if (data.address && (!data.lat || !data.lng)) {
      const geoResult = await geocodeAlmatyAddress(data.address);
      if (geoResult) {
        destLoc = { lat: geoResult.lat, lng: geoResult.lng };
      }
    }

    const startLoc = {
      lat: destLoc.lat - 0.012 + (Math.random() * 0.004),
      lng: destLoc.lng - 0.012 + (Math.random() * 0.004)
    };

    // Calculate real road route via OSRM
    const realRoute = await fetchRealRoadRoute(startLoc, destLoc);
    
    const newOrder = {
      id,
      token,
      patientPhone: data.patientPhone || '',
      patientName: data.patientName || 'Пациент',
      address: data.address || 'г. Алматы, Медеуский район',
      destinationLoc: destLoc,
      carNumber: data.carNumber || 'Скорая №103 (02 KZ 777 ABC)',
      status: 'ACCEPTED',
      currentLoc: startLoc,
      routePath: realRoute.path,
      distanceKm: realRoute.distanceKm,
      etaMinutes: realRoute.etaMinutes,
      accessInfo: { intercom: '', gateCode: '', entrance: '', floor: '', note: '' },
      symptoms: [],
      isSimulating: false,
      createdAt: new Date().toISOString(),
      expired: false
    };

    this.orders.set(token, newOrder);
    this.persist();
    return newOrder;
  }

  getOrderByToken(token) {
    return this.orders.get(token);
  }

  getAllActiveOrders() {
    return Array.from(this.orders.values()).filter(o => !o.expired);
  }

  getAllDispatcherOrders() {
    return Array.from(this.orders.values());
  }

  updateOrderStatus(token, status) {
    const order = this.orders.get(token);
    if (!order) return null;

    order.status = status;
    if (status === 'COMPLETED') {
      order.expired = true;
      order.completedAt = new Date().toISOString();
    }
    this.persist();
    return order;
  }

  updateLocation(token, lat, lng) {
    const order = this.orders.get(token);
    if (!order || order.expired) return null;

    order.currentLoc = { lat: parseFloat(lat), lng: parseFloat(lng) };
    this.persist();
    return order;
  }

  updateAccessInfo(token, accessData) {
    const order = this.orders.get(token);
    if (!order || order.expired) return null;

    order.accessInfo = { ...order.accessInfo, ...accessData };
    this.persist();
    return order;
  }

  updateSymptoms(token, symptoms) {
    const order = this.orders.get(token);
    if (!order || order.expired) return null;

    order.symptoms = symptoms;
    this.persist();
    return order;
  }

  toggleSimulation(token, isSimulating) {
    const order = this.orders.get(token);
    if (!order) return null;
    order.isSimulating = isSimulating;
    this.persist();
    return order;
  }

  persist() {
    saveOrdersToFile(this.orders);
  }
}

export const orderStore = new OrderStore();
