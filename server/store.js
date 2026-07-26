import { geocodeAlmatyAddress } from './services/geocoding.js';
import { fetchRealRoadRoute } from './services/routing.js';
import { loadSavedOrders, saveOrdersToFile } from './db/fileStore.js';

class OrderStore {
  constructor() {
    this.orders = loadSavedOrders();
    let repaired = false;
    this.orders.forEach(order => {
      if (order.status !== 'COMPLETED' && order.expired) {
        order.expired = false;
        delete order.completedAt;
        repaired = true;
      }
      if (order.status === 'COMPLETED' && !order.expired) {
        order.expired = true;
        order.completedAt ||= new Date().toISOString();
        repaired = true;
      }
    });

    this.crews = [
      { id: '101', name: 'Бригада №101', carPlate: '01 KZ 101 MED', type: 'РЕАНИМАЦИЯ', driverName: 'Алмасов К.', status: 'ON_DUTY', pin: '101' },
      { id: '102', name: 'Бригада №102', carPlate: '02 KZ 102 MED', type: 'ПЕДИАТРИЧЕСКАЯ', driverName: 'Иванов С.', status: 'ON_DUTY', pin: '102' },
      { id: '103', name: 'Бригада №103', carPlate: '02 KZ 777 ABC', type: 'ЛИНЕЙНАЯ', driverName: 'Нурланов Б.', status: 'ON_DUTY', pin: '103' }
    ];

    if (repaired) this.persist();
  }

  getAllCrews() {
    return this.crews;
  }

  addCrew(crewData) {
    const newCrew = {
      id: String(crewData.id || Math.floor(100 + Math.random() * 900)),
      name: crewData.name || `Бригада №${Math.floor(100 + Math.random() * 900)}`,
      carPlate: crewData.carPlate || '02 KZ 000 MED',
      type: crewData.type || 'ЛИНЕЙНАЯ',
      driverName: crewData.driverName || 'Водитель',
      status: crewData.status || 'ON_DUTY',
      pin: crewData.pin || '123'
    };
    this.crews.push(newCrew);
    return newCrew;
  }

  updateCrew(id, crewData) {
    const index = this.crews.findIndex(c => c.id === String(id));
    if (index !== -1) {
      this.crews[index] = { ...this.crews[index], ...crewData };
      return this.crews[index];
    }
    return null;
  }

  deleteCrew(id) {
    this.crews = this.crews.filter(c => c.id !== String(id));
    return true;
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
      carNumber: 'Бригада №103 (02 KZ 777 ABC)',
      priority: 'EMERGENCY',
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
      expired: false,
      auditLogs: [
        { timestamp: new Date(Date.now() - 300000).toISOString(), event: 'CREATED', text: 'Вызов создан диспетчером' },
        { timestamp: new Date(Date.now() - 240000).toISOString(), event: 'EN_ROUTE', text: 'Бригада №103 выехала по маршруту' }
      ]
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
      carNumber: data.carNumber || 'Бригада №103 (02 KZ 777 ABC)',
      priority: data.priority || 'EMERGENCY',
      status: 'ACCEPTED',
      currentLoc: startLoc,
      routePath: realRoute.path,
      distanceKm: realRoute.distanceKm,
      etaMinutes: realRoute.etaMinutes,
      accessInfo: { residenceType: 'apartment', intercom: '', gateCode: '', entrance: '', floor: '', note: '' },
      symptoms: [],
      isSimulating: false,
      createdAt: new Date().toISOString(),
      expired: false,
      auditLogs: [
        { timestamp: new Date().toISOString(), event: 'CREATED', text: `Вызов создан (${data.priority || 'Экстренный'})` }
      ]
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

  updateOrderStatus(token, status, hospitalName = null) {
    const order = this.orders.get(token);
    if (!order) return null;
    if (order.expired && order.status === 'COMPLETED' && status !== 'COMPLETED') return null;

    order.status = status;
    if (hospitalName) order.hospitalName = hospitalName;

    const logTextMap = {
      ACCEPTED: 'Бригада приняла вызов',
      EN_ROUTE: 'Скорая помощь выехала к пациенту',
      ARRIVED: 'Бригада прибыла по адресу',
      HOSPITAL_TRANSPORT: `Госпитализация в ${hospitalName || 'стационар'}`,
      COMPLETED: 'Вызов успешно завершен'
    };

    order.auditLogs = order.auditLogs || [];
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      event: status,
      text: logTextMap[status] || `Статус изменен на ${status}`
    });

    if (status === 'COMPLETED') {
      order.expired = true;
      order.completedAt = new Date().toISOString();
    } else {
      order.expired = false;
      delete order.completedAt;
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
    order.auditLogs = order.auditLogs || [];
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      event: 'ACCESS_UPDATED',
      text: 'Пациент уточнил информацию о доступе'
    });
    this.persist();
    return order;
  }

  updateSymptoms(token, symptoms) {
    const order = this.orders.get(token);
    if (!order || order.expired) return null;

    order.symptoms = symptoms;
    order.auditLogs = order.auditLogs || [];
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      event: 'SYMPTOMS_UPDATED',
      text: `Обновлены симптомы (${symptoms.join(', ')})`
    });
    this.persist();
    return order;
  }

  addSosAlert(token, note = '') {
    const order = this.orders.get(token);
    if (!order || order.expired) return null;

    order.sosAlert = true;
    order.sosTime = new Date().toISOString();
    order.auditLogs = order.auditLogs || [];
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      event: 'SOS_ALERT',
      text: '🚨 ВНИМАНИЕ: Пациент нажал SOS (Состояние ухудшилось!)'
    });
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
