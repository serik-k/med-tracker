import { orderStore } from '../../store.js';

export const patientRoom = orderId => `order_${orderId}`;
export const dispatcherRoom = clinicId => `dispatchers_${clinicId}`;
export const crewRoom = (clinicId, crewId) => `crew_${clinicId}_${crewId}`;

export const publicCreatedOrder = order => {
  const { patientAccessToken, patientAccessPath, ...safe } = order;
  return safe;
};

export const revokeSocket = (socket, scope, reason) => {
  const payload = { scope, reason, revokedAt: new Date().toISOString() };
  socket.emit('access_revoked', payload);
  if (scope === 'staff') socket.emit('session_revoked', payload);
  socket.disconnect(true);
};

export const disconnectPatientSockets = (io, orderId, scope = null, reason = 'ACCESS_REVOKED') => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.patientOrderId === orderId && (!scope || socket.data.patientAccessScope === scope)) {
      revokeSocket(socket, socket.data.patientAccessScope || 'patient', reason);
    }
  }
};

export const attachCrewSockets = (io, clinicId, crewId, order) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId !== clinicId || socket.data.driverCrewId !== String(crewId)) continue;
    socket.join(crewRoom(clinicId, crewId));
    socket.join(patientRoom(order.token));
    socket.emit('crew_order', order);
  }
};

export const detachCrewSockets = (io, clinicId, crewId, orderId, reason) => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.driverClinicId !== clinicId || socket.data.driverCrewId !== String(crewId)) continue;
    socket.leave(patientRoom(orderId));
    socket.emit('crew_order_cleared', { token: orderId, reason });
  }
};

export const broadcastClinicSettings = async (io, clinic) => {
  try {
    io.to(dispatcherRoom(clinic.id)).emit('clinic_settings_updated', clinic);
    const activeOrders = await orderStore.getAllActiveOrders(clinic.id);
    for (const order of activeOrders) io.to(patientRoom(order.token)).emit('order_data', order);
  } catch (error) {
    console.warn('[Realtime] Could not broadcast clinic settings:', error.message);
  }
};

export const broadcastCrews = async (io, clinicId) => {
  try {
    io.to(dispatcherRoom(clinicId)).emit('all_crews', await orderStore.getAllCrews(clinicId));
  } catch (error) {
    console.warn('[Realtime] Could not refresh crews:', error.message);
  }
};
