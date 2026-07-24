<template>
  <div class="relative w-full h-full min-h-[300px] overflow-hidden">
    <!-- Map Container -->
    <div ref="mapContainer" class="w-full h-full min-h-[300px] z-0"></div>

    <!-- Map Floating Controls -->
    <div class="absolute top-3 left-3 z-10 flex gap-2">
      <button 
        @click="fitAllBounds"
        class="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-slate-200 p-2.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
      >
        <Navigation class="w-4 h-4 text-teal-400" />
        Показать все машины в Алматы
      </button>
    </div>

    <!-- Live Status Pill Overlay -->
    <div class="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-center pointer-events-none">
      <div class="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-2 pointer-events-auto">
        <span class="relative flex h-3 w-3">
          <span class="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-40"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-teal-600"></span>
        </span>
        <span class="text-xs font-bold text-slate-200">
          {{ displayOrders.length > 1 ? `Мониторинг флота (${displayOrders.length} машин)` : 'GPS Live Трекинг' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import L from 'leaflet';
import { Navigation } from 'lucide-vue-next';
import type { Location, Order } from '@/types';

const props = defineProps<{
  ambulanceLoc?: Location;
  destinationLoc?: Location;
  routePath?: Location[];
  orders?: Order[];
  focusedToken?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-order', token: string): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;

// Map markers & layer collections
let ambulanceMarkersMap = new Map<string, L.Marker>();
let destinationMarkersMap = new Map<string, L.Marker>();
let polylinesMap = new Map<string, L.Polyline>();

const displayOrders = computed<Partial<Order>[]>(() => {
  if (props.orders && props.orders.length > 0) {
    return props.orders;
  }
  if (props.ambulanceLoc && props.destinationLoc) {
    return [{
      token: 'single-order',
      carNumber: 'Скорая №103',
      currentLoc: props.ambulanceLoc,
      destinationLoc: props.destinationLoc,
      routePath: props.routePath
    }];
  }
  return [];
});

const createAmbulanceIcon = (label: string = 'Скорая') => {
  return L.divIcon({
    className: 'pulse-ambulance-icon',
    html: `
      <div class="relative group">
        <div class="w-12 h-12 bg-teal-700 rounded-full flex items-center justify-center border-2 border-white shadow-xl text-white transform transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
            <path d="M7 9v4"/>
            <path d="M5 11h4"/>
          </svg>
        </div>
        <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[10px] font-extrabold text-white px-2 py-0.5 rounded border border-slate-700 shadow-md pointer-events-none">
          ${label}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

const createDestinationIcon = (orderId: string = '') => {
  return L.divIcon({
    className: 'destination-pin-icon',
    html: `
      <div class="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36]
  });
};

onMounted(() => {
  if (!mapContainer.value) return;

  const defaultCenter: L.LatLngTuple = [43.238949, 76.945465]; // Almaty center

  map = L.map(mapContainer.value, {
    zoomControl: false
  }).setView(defaultCenter, 13);

  // Dark Styled OpenStreetMap Tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  updateMarkers();
  fitAllBounds();
});

const updateMarkers = () => {
  if (!map) return;

  const activeKeys = new Set<string>();

  displayOrders.value.forEach((order, idx) => {
    const key = order.token || `order-${idx}`;
    activeKeys.add(key);

    const ambPos = order.currentLoc;
    const destPos = order.destinationLoc;

    // 1. Ambulance Marker
    if (ambPos) {
      const ambLatLng: L.LatLngTuple = [ambPos.lat, ambPos.lng];
      let ambMarker = ambulanceMarkersMap.get(key);
      if (!ambMarker) {
        ambMarker = L.marker(ambLatLng, { icon: createAmbulanceIcon(order.carNumber || 'Скорая') })
          .addTo(map!)
          .bindPopup(`<b>${order.carNumber || 'Скорая'}</b><br>Пациент: ${order.patientName || 'Вызов'}<br>Адрес: ${order.address || ''}`);
        ambulanceMarkersMap.set(key, ambMarker);
        ambMarker.on('click', () => order.token && emit('select-order', order.token));
      } else {
        ambMarker.setLatLng(ambLatLng);
      }
    }

    // 2. Destination Marker
    if (destPos) {
      const destLatLng: L.LatLngTuple = [destPos.lat, destPos.lng];
      let destMarker = destinationMarkersMap.get(key);
      if (!destMarker) {
        destMarker = L.marker(destLatLng, { icon: createDestinationIcon(order.id) })
          .addTo(map!)
          .bindPopup(`<b>Точка вызова ${order.id || ''}</b><br>${order.patientName || ''}<br>${order.address || ''}`);
        destinationMarkersMap.set(key, destMarker);
        destMarker.on('click', () => order.token && emit('select-order', order.token));
      } else {
        destMarker.setLatLng(destLatLng);
      }
    }

    // 3. Route Polyline
    let points: L.LatLngTuple[] = [];
    if (order.routePath && order.routePath.length > 0) {
      points = order.routePath.map(p => [p.lat, p.lng]);
    } else if (ambPos && destPos) {
      points = [[ambPos.lat, ambPos.lng], [destPos.lat, destPos.lng]];
    }

    if (points.length > 0) {
      let poly = polylinesMap.get(key);
      const color = idx % 2 === 0 ? '#0f766e' : '#d97706';
      if (!poly) {
        poly = L.polyline(points, {
          color: color,
          weight: 5,
          opacity: 0.85
        }).addTo(map!);
        polylinesMap.set(key, poly);
      } else {
        poly.setLatLngs(points);
      }
    }
  });

  // Cleanup removed orders
  ambulanceMarkersMap.forEach((marker, key) => {
    if (!activeKeys.has(key)) {
      map?.removeLayer(marker);
      ambulanceMarkersMap.delete(key);
    }
  });
  destinationMarkersMap.forEach((marker, key) => {
    if (!activeKeys.has(key)) {
      map?.removeLayer(marker);
      destinationMarkersMap.delete(key);
    }
  });
  polylinesMap.forEach((poly, key) => {
    if (!activeKeys.has(key)) {
      map?.removeLayer(poly);
      polylinesMap.delete(key);
    }
  });
};

const fitAllBounds = () => {
  if (!map) return;
  const bounds: L.LatLngTuple[] = [];

  displayOrders.value.forEach(order => {
    if (order.currentLoc) bounds.push([order.currentLoc.lat, order.currentLoc.lng]);
    if (order.destinationLoc) bounds.push([order.destinationLoc.lat, order.destinationLoc.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
};

watch(
  () => [props.orders, props.ambulanceLoc, props.destinationLoc, props.routePath],
  () => {
    updateMarkers();
  },
  { deep: true }
);

watch(() => props.focusedToken, token => {
  if (!map || !token) return;
  const order = displayOrders.value.find(item => item.token === token);
  if (!order) return;
  const bounds: L.LatLngTuple[] = [];
  if (order.currentLoc) bounds.push([order.currentLoc.lat, order.currentLoc.lng]);
  if (order.destinationLoc) bounds.push([order.destinationLoc.lat, order.destinationLoc.lng]);
  if (bounds.length === 1) map.setView(bounds[0], 15);
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});
</script>
