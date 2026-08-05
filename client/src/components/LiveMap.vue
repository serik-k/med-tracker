<template>
  <div class="relative h-full min-h-[300px] w-full overflow-hidden">
    <div ref="mapContainer" class="z-0 h-full min-h-[300px] w-full" :aria-label="lang.t('mapAria')"></div>
    <div v-if="showFitBoundsButton" class="absolute z-10" :class="fitBoundsClass">
      <button type="button" class="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 p-2.5 text-xs font-bold text-slate-200 shadow-lg backdrop-blur-md transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" @click="fitAllBounds">
        <Navigation class="h-4 w-4 text-teal-400" />
        {{ lang.t('showFullRoute') }}
      </button>
      <p v-if="!hasBaseMap" class="mt-2 max-w-56 rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 text-[11px] font-bold text-amber-950 shadow-lg" role="status">{{ lang.t('privateMapFallback') }}</p>
    </div>
    <div class="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-start">
      <div class="pointer-events-auto flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 shadow-xl backdrop-blur-md">
        <span class="relative flex h-3 w-3" aria-hidden="true"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-40"></span><span class="relative inline-flex h-3 w-3 rounded-full bg-teal-500"></span></span>
        <span class="text-xs font-bold text-slate-100">{{ liveLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import { Navigation } from 'lucide-vue-next';
import type { Location, Order } from '@/types';
import { useLangStore } from '@/stores/langStore';

const props = withDefaults(defineProps<{
  ambulanceLoc?: Location | null;
  destinationLoc?: Location | null;
  routePath?: Location[];
  orders?: Order[];
  focusedToken?: string | null;
  showFitBoundsButton?: boolean;
  fitBoundsClass?: string;
}>(), {
  showFitBoundsButton: true,
  fitBoundsClass: 'top-3 left-3'
});

const emit = defineEmits<{ (event: 'select-order', token: string): void }>();
const lang = useLangStore();
const mapContainer = ref<HTMLElement | null>(null);
const configuredTileUrl = String(import.meta.env.VITE_TILE_BASE_URL || '').trim();
const configuredTileAttribution = String(import.meta.env.VITE_TILE_ATTRIBUTION || '').trim();
const tileUrl = import.meta.env.PROD ? '/api/map-tiles/{z}/{x}/{y}.png' : configuredTileUrl || 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const hasBaseMap = ref(true);
let map: L.Map | null = null;
const ambulanceMarkers = new Map<string, L.Marker>();
const destinationMarkers = new Map<string, L.Marker>();
const routeLines = new Map<string, L.Polyline>();

const displayOrders = computed<Partial<Order>[]>(() => {
  if (props.orders?.length) return props.orders;
  if (!props.ambulanceLoc && !props.destinationLoc) return [];
  return [{
    token: 'single-order',
    carNumber: lang.t('ambulanceGeneric'),
    currentLoc: props.ambulanceLoc,
    destinationLoc: props.destinationLoc,
    routePath: props.routePath
  }];
});

const liveLabel = computed(() => displayOrders.value.length > 1
  ? lang.t('mapCrewsCount').replace('{count}', String(displayOrders.value.length))
  : lang.t('mapLiveLocation'));

function targetOf(order: Partial<Order>) {
  return order.status === 'HOSPITAL_TRANSPORT'
    ? order.hospitalLocation
    : order.destinationLoc;
}

function ambulanceIcon(label = lang.t('ambulanceGeneric')) {
  const root = document.createElement('div');
  root.className = 'relative';
  const badge = document.createElement('div');
  badge.className = 'flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-teal-700 text-white shadow-xl';
  // SVG below is static application markup; all variable text is assigned through textContent.
  badge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M7 9v4"/><path d="M5 11h4"/></svg>';
  const caption = document.createElement('div');
  caption.className = 'absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-slate-700 bg-slate-900/90 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-md';
  caption.textContent = label;
  root.append(badge, caption);
  return L.divIcon({ className: 'pulse-ambulance-icon', html: root, iconSize: [48, 48], iconAnchor: [24, 24] });
}

function destinationIcon(isHospital = false) {
  const root = document.createElement('div');
  root.className = `flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${isHospital ? 'bg-indigo-700' : 'bg-red-600'}`;
  root.innerHTML = isHospital
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  return L.divIcon({ className: 'destination-pin-icon', html: root, iconSize: [36, 36], iconAnchor: [18, 36] });
}

function popup(title: string, lines: string[]) {
  const container = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = title;
  container.appendChild(heading);
  lines.filter(Boolean).forEach(line => {
    container.append(document.createElement('br'), document.createTextNode(line));
  });
  return container;
}

function ambulancePopup(order: Partial<Order>) {
  return popup(order.carNumber || lang.t('ambulanceGeneric'), [
    order.patientName ? `${lang.t('patientPrefix')}: ${order.patientName}` : lang.t('activeCallLabel'),
    order.address ? `${lang.t('addressPrefix')}: ${order.address}` : ''
  ]);
}

function targetPopup(order: Partial<Order>) {
  const hospital = order.status === 'HOSPITAL_TRANSPORT' && Boolean(order.hospitalLocation);
  return popup(hospital ? order.hospitalName || lang.t('hospitalGeneric') : `${lang.t('callPoint')} ${order.id || ''}`, [
    hospital ? lang.t('hospitalRoute') : order.patientName || '',
    hospital ? '' : order.address || ''
  ]);
}

function updateMarkers() {
  if (!map) return;
  const activeMap = map;
  const wasEmpty = ambulanceMarkers.size === 0 && destinationMarkers.size === 0;
  const activeKeys = new Set<string>();
  displayOrders.value.forEach((order, index) => {
    const key = order.token || `order-${index}`;
    activeKeys.add(key);
    const ambulance = order.currentLoc;
    const destination = targetOf(order);
    const hospital = order.status === 'HOSPITAL_TRANSPORT' && Boolean(order.hospitalLocation);

    if (ambulance) {
      const point: L.LatLngTuple = [ambulance.lat, ambulance.lng];
      let marker = ambulanceMarkers.get(key);
      if (!marker) {
        marker = L.marker(point, { icon: ambulanceIcon(order.carNumber) }).addTo(activeMap).bindPopup(ambulancePopup(order));
        marker.on('click', () => order.token && order.token !== 'single-order' && emit('select-order', order.token));
        ambulanceMarkers.set(key, marker);
      } else {
        marker.setLatLng(point).setIcon(ambulanceIcon(order.carNumber)).setPopupContent(ambulancePopup(order));
      }
    }

    if (destination) {
      const point: L.LatLngTuple = [destination.lat, destination.lng];
      let marker = destinationMarkers.get(key);
      if (!marker) {
        marker = L.marker(point, { icon: destinationIcon(hospital) }).addTo(activeMap).bindPopup(targetPopup(order));
        marker.on('click', () => order.token && order.token !== 'single-order' && emit('select-order', order.token));
        destinationMarkers.set(key, marker);
      } else {
        marker.setLatLng(point).setIcon(destinationIcon(hospital)).setPopupContent(targetPopup(order));
      }
    }

    const points: L.LatLngTuple[] = order.routePath?.length
      ? order.routePath.map(point => [point.lat, point.lng])
      : ambulance && destination ? [[ambulance.lat, ambulance.lng], [destination.lat, destination.lng]] : [];
    if (points.length) {
      let line = routeLines.get(key);
      if (!line) {
        line = L.polyline(points, { color: hospital ? '#4338ca' : index % 2 ? '#d97706' : '#0f766e', weight: 5, opacity: 0.85 }).addTo(activeMap);
        routeLines.set(key, line);
      } else line.setLatLngs(points);
    }
  });

  const cleanup = <T extends L.Layer>(collection: Map<string, T>) => collection.forEach((layer, key) => {
    if (!activeKeys.has(key)) {
      map?.removeLayer(layer);
      collection.delete(key);
    }
  });
  cleanup(ambulanceMarkers);
  cleanup(destinationMarkers);
  cleanup(routeLines);
  if (wasEmpty && displayOrders.value.length) fitAllBounds();
}

function orderBounds(order: Partial<Order>) {
  const bounds: L.LatLngTuple[] = [];
  if (order.currentLoc) bounds.push([order.currentLoc.lat, order.currentLoc.lng]);
  const destination = targetOf(order);
  if (destination) bounds.push([destination.lat, destination.lng]);
  return bounds;
}

function fitBounds(bounds: L.LatLngTuple[]) {
  if (!map || !bounds.length) return;
  if (bounds.length === 1) map.setView(bounds[0], 15);
  else map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15 });
}

function fitAllBounds() {
  fitBounds(displayOrders.value.flatMap(orderBounds));
}

onMounted(() => {
  if (!mapContainer.value) return;
  map = L.map(mapContainer.value, { zoomControl: false }).setView([48.0196, 66.9237], 5);
  if (tileUrl) {
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: configuredTileAttribution || (import.meta.env.DEV && !configuredTileUrl ? '&copy; OpenStreetMap &copy; CARTO' : '')
    });
    tileLayer.on('tileload', () => { hasBaseMap.value = true; });
    tileLayer.on('tileerror', () => { hasBaseMap.value = false; });
    tileLayer.addTo(map);
  }
  L.control.zoom({ position: 'topright' }).addTo(map);
  updateMarkers();
  fitAllBounds();
});

watch(() => [props.orders, props.ambulanceLoc, props.destinationLoc, props.routePath], updateMarkers, { deep: true });
watch(() => lang.currentLang, updateMarkers);
watch(() => props.focusedToken, token => {
  if (!token) return;
  const order = displayOrders.value.find(item => item.token === token);
  if (order) fitBounds(orderBounds(order));
});
onBeforeUnmount(() => { map?.remove(); map = null; });
</script>
