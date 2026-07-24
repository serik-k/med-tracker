import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { orderStore } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// REST Endpoints
app.get('/api/orders', (req, res) => {
  res.json(orderStore.getAllActiveOrders());
});

app.post('/api/orders', async (req, res) => {
  const order = await orderStore.createOrder(req.body);
  io.emit('order_created', order);
  res.status(201).json(order);
});

app.get('/api/orders/:token', (req, res) => {
  const order = orderStore.getOrderByToken(req.params.token);
  if (!order) {
    return res.status(404).json({ error: 'Ссылка устарела или вызов не найден' });
  }
  if (order.expired) {
    return res.status(410).json({ error: 'Ссылка сгорела. Вызов был завершен.' });
  }
  res.json(order);
});

// Socket.io Real-Time Handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join_dispatcher', () => {
    socket.join('dispatcher_room');
    socket.emit('all_orders', orderStore.getAllDispatcherOrders());
  });

  socket.on('join_order', (token) => {
    socket.join(`order_${token}`);
    const order = orderStore.getOrderByToken(token);
    if (order) {
      socket.emit('order_data', order);
    }
  });

  socket.on('update_location', ({ token, lat, lng }) => {
    const updated = orderStore.updateLocation(token, lat, lng);
    if (updated) {
      io.to(`order_${token}`).to('dispatcher_room').emit('location_updated', {
        token,
        currentLoc: updated.currentLoc
      });
    }
  });

  socket.on('update_status', ({ token, status }) => {
    const updated = orderStore.updateOrderStatus(token, status);
    if (updated) {
      io.to(`order_${token}`).to('dispatcher_room').emit('status_updated', {
        token,
        status: updated.status,
        expired: updated.expired,
        completedAt: updated.completedAt || null
      });
    }
  });

  socket.on('update_access', ({ token, accessInfo }) => {
    const updated = orderStore.updateAccessInfo(token, accessInfo);
    if (updated) {
      io.to(`order_${token}`).to('dispatcher_room').emit('access_updated', {
        token,
        accessInfo: updated.accessInfo
      });
    }
  });

  socket.on('update_symptoms', ({ token, symptoms }) => {
    const updated = orderStore.updateSymptoms(token, symptoms);
    if (updated) {
      io.to(`order_${token}`).to('dispatcher_room').emit('symptoms_updated', {
        token,
        symptoms: updated.symptoms
      });
    }
  });

  socket.on('toggle_simulation', ({ token, isSimulating }) => {
    const updated = orderStore.toggleSimulation(token, isSimulating);
    if (updated) {
      io.to(`order_${token}`).to('dispatcher_room').emit('simulation_toggled', {
        token,
        isSimulating: updated.isSimulating
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Simulation Loop for active simulation orders
setInterval(() => {
  const activeOrders = orderStore.getAllActiveOrders();
  activeOrders.forEach(order => {
    if (order.isSimulating && order.status === 'EN_ROUTE' && !order.expired) {
      // Step location slightly towards destination
      const dest = order.destinationLoc;
      const curr = order.currentLoc;

      const dLat = dest.lat - curr.lat;
      const dLng = dest.lng - curr.lng;

      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      if (distance > 0.0005) {
        // Move 5% closer each tick
        const newLat = curr.lat + dLat * 0.05 + (Math.random() - 0.5) * 0.0001;
        const newLng = curr.lng + dLng * 0.05 + (Math.random() - 0.5) * 0.0001;
        orderStore.updateLocation(order.token, newLat, newLng);

        io.to(`order_${order.token}`).to('dispatcher_room').emit('location_updated', {
          token: order.token,
          currentLoc: { lat: newLat, lng: newLng }
        });
      } else {
        // Arrived at destination in simulation!
        orderStore.updateOrderStatus(order.token, 'ARRIVED');
        io.to(`order_${order.token}`).to('dispatcher_room').emit('status_updated', {
          token: order.token,
          status: 'ARRIVED',
          expired: false
        });
      }
    }
  });
}, 2500);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Ambulance Tracker Backend Server running on http://localhost:${PORT}`);
});
