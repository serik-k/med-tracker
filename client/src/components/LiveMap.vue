<template>
  <div class="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
    <!-- Map Container -->
    <div ref="mapContainer" class="w-full h-full min-h-[300px] z-0"></div>

    <!-- Map Floating Controls & Info Overlay -->
    <div class="absolute top-3 left-3 z-10 flex gap-2">
      <button 
        @click="recenterMap"
        class="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-slate-200 p-2.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
      >
        <Navigation class="w-4 h-4 text-rose-400" />
        Центрировать на Скорой
      </button>
    </div>

    <!-- Live Status Pill Overlay -->
    <div class="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-center pointer-events-none">
      <div class="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-xl flex items-center gap-2 pointer-events-auto">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        <span class="text-xs font-bold text-slate-200">OSRM Road GPS Track</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { Navigation } from 'lucide-vue-next';
import type { Location } from '@/types';

const props = defineProps<{
  ambulanceLoc?: Location;
  destinationLoc?: Location;
  routePath?: Location[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let ambulanceMarker: L.Marker | null = null;
let destinationMarker: L.Marker | null = null;
let polyline: L.Polyline | null = null;

const createAmbulanceIcon = () => {
  return L.divIcon({
    className: 'pulse-ambulance-icon',
    html: `
      <div class="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl text-white transform transition-transform duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
          <path d="M7 9v4"/>
          <path d="M5 11h4"/>
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    className: 'destination-pin-icon',
    html: `
      <div class="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
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

  const defaultCenter: L.LatLngTuple = props.ambulanceLoc 
    ? [props.ambulanceLoc.lat, props.ambulanceLoc.lng] 
    : [43.238949, 76.945465]; // Almaty, Kazakhstan center

  map = L.map(mapContainer.value, {
    zoomControl: false
  }).setView(defaultCenter, 14);

  // Dark Styled OpenStreetMap Tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  updateMarkers();
});

const updateMarkers = () => {
  if (!map) return;

  const ambPos = props.ambulanceLoc;
  const destPos = props.destinationLoc;

  // Ambulance Marker
  if (ambPos) {
    const latLng: L.LatLngTuple = [ambPos.lat, ambPos.lng];
    if (!ambulanceMarker) {
      ambulanceMarker = L.marker(latLng, { icon: createAmbulanceIcon() })
        .addTo(map)
        .bindPopup('<b>Скорая Помощь MedTracker</b><br>Алматы, В пути');
    } else {
      ambulanceMarker.setLatLng(latLng);
    }
  }

  // Destination Marker
  if (destPos) {
    const destLatLng: L.LatLngTuple = [destPos.lat, destPos.lng];
    if (!destinationMarker) {
      destinationMarker = L.marker(destLatLng, { icon: createDestinationIcon() })
        .addTo(map)
        .bindPopup('<b>Точка вызова</b><br>Адрес пациента');
    } else {
      destinationMarker.setLatLng(destLatLng);
    }
  }

  // Real OSRM Road Polyline or linear path
  let points: L.LatLngTuple[] = [];
  if (props.routePath && props.routePath.length > 0) {
    points = props.routePath.map(p => [p.lat, p.lng]);
  } else if (ambPos && destPos) {
    points = [[ambPos.lat, ambPos.lng], [destPos.lat, destPos.lng]];
  }

  if (points.length > 0) {
    if (!polyline) {
      polyline = L.polyline(points, {
        color: '#f43f5e',
        weight: 5,
        opacity: 0.85
      }).addTo(map);
    } else {
      polyline.setLatLngs(points);
    }
  }
};

const recenterMap = () => {
  if (!map || !props.ambulanceLoc) return;
  map.flyTo([props.ambulanceLoc.lat, props.ambulanceLoc.lng], 15, {
    duration: 1
  });
};

watch(
  () => [props.ambulanceLoc, props.destinationLoc, props.routePath],
  () => {
    updateMarkers();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (map) {
    map.remove();
  }
});
</script>
