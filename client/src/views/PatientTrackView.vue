<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-4 max-w-md mx-auto space-y-4 font-sans relative overflow-x-hidden">
    <!-- Ambient Background Glows -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="fixed bottom-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Expired or Invalid Link Screen -->
    <div v-if="orderStore.errorMsg || order?.expired" class="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 space-y-4 relative z-10">
      <div class="p-5 bg-slate-900 text-emerald-400 rounded-3xl border border-slate-800 shadow-2xl">
        <ShieldCheck class="w-14 h-14" />
      </div>
      <h1 class="text-xl font-black text-white">{{ langStore.t('expiredTitle') }}</h1>
      <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
        {{ langStore.t('expiredDesc') }}
      </p>
      <a 
        href="tel:103" 
        class="px-5 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all active:scale-95"
      >
        <PhoneCall class="w-4 h-4" /> {{ langStore.t('callDispatcher') }}
      </a>
    </div>

    <!-- Active Patient Tracking Screen -->
    <template v-else-if="order">
      <!-- Top Brand Header & Language Switcher -->
      <header class="glass-panel px-4 py-3 rounded-2xl flex items-center justify-between border border-slate-800 shadow-xl relative z-10">
        <div class="flex items-center gap-2.5">
          <div class="p-2 bg-gradient-to-br from-rose-600 to-rose-500 text-white rounded-xl shadow-md shadow-rose-950/50">
            <Activity class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              {{ langStore.t('appTitle') }}
            </h1>
            <p class="text-[11px] font-bold text-rose-400">{{ order.carNumber }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Language Switcher -->
          <LanguageSwitcher />

          <!-- Share to Family Button -->
          <button 
            @click="shareWithFamily"
            class="p-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
            :title="langStore.t('shareFamily')"
          >
            <Share2 class="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </header>

      <!-- Stepped Live Call Progress Bar -->
      <div class="glass-panel p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-2 relative z-10">
        <div class="flex justify-between text-[11px] font-bold text-slate-300">
          <span>Этап:</span>
          <span class="text-rose-400 font-extrabold">{{ getStatusText(order.status) }}</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5 pt-1">
          <div 
            v-for="(step, idx) in steps" 
            :key="step.key"
            :class="[
              'h-2 rounded-full transition-all duration-500',
              currentStepIndex >= idx 
                ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-sm shadow-rose-500/50' 
                : 'bg-slate-900 border border-slate-800'
            ]"
            :title="step.label"
          ></div>
        </div>
      </div>

      <!-- Live ETA & Telemetry Card -->
      <div class="glass-panel p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between relative overflow-hidden z-10">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span class="text-xs font-extrabold text-rose-300 uppercase tracking-wide">{{ langStore.t('callStatusEnRoute') }}</span>
          </div>

          <div class="text-3xl font-black text-white flex items-baseline gap-2 tracking-tight">
            <span>~{{ order.etaMinutes || etaMinutes }} {{ langStore.t('mins') }}</span>
            <span class="text-xs font-semibold text-slate-400">({{ order.distanceKm || distanceKm }} {{ langStore.t('km') }})</span>
          </div>
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
            <Navigation class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{{ langStore.t('speedInfo') }}</span>
          </div>
        </div>

        <!-- Car Badge -->
        <div class="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-center space-y-1 shadow-lg">
          <Truck class="w-7 h-7 text-rose-500 mx-auto" />
          <span class="text-[10px] font-black text-slate-300 block tracking-wider">{{ langStore.t('crewBadge') }}</span>
        </div>
      </div>

      <!-- Live OSRM Road Map Component -->
      <div class="h-[330px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative z-10">
        <LiveMap 
          :ambulance-loc="order.currentLoc"
          :destination-loc="order.destinationLoc"
          :route-path="order.routePath"
        />
      </div>

      <!-- Pro-active Sound Alert Pill if close -->
      <div v-if="distanceKm < 0.6 && order.status === 'EN_ROUTE'" class="p-3.5 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center gap-3 text-amber-200 animate-pulse shadow-2xl relative z-10">
        <BellRing class="w-6 h-6 text-amber-400 shrink-0" />
        <div class="text-xs font-semibold">
          <strong class="block text-white font-bold mb-0.5">{{ langStore.t('nearYardWarningTitle') }}</strong>
          {{ langStore.t('nearYardWarningText') }}
        </div>
      </div>

      <!-- Access Details Form -->
      <AccessForm 
        class="relative z-10"
        :initial-access-info="order.accessInfo"
        @update="onUpdateAccess"
      />

      <!-- Symptoms Selector Triage -->
      <SymptomSelector 
        class="relative z-10"
        :initial-symptoms="order.symptoms"
        @update="onUpdateSymptoms"
      />

      <!-- Pre-Arrival Checklist -->
      <PreArrivalChecklist class="relative z-10" />

    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import LiveMap from '@/components/LiveMap.vue';
import AccessForm from '@/components/AccessForm.vue';
import SymptomSelector from '@/components/SymptomSelector.vue';
import PreArrivalChecklist from '@/components/PreArrivalChecklist.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import { 
  Activity, 
  PhoneCall, 
  Truck, 
  Navigation, 
  ShieldCheck, 
  BellRing,
  Share2
} from 'lucide-vue-next';
import type { OrderStatus, AccessInfo } from '@/types';

const route = useRoute();
const orderStore = useOrderStore();
const langStore = useLangStore();

const token = (route.params.token as string) || 'demo-track-123';
const order = computed(() => orderStore.currentOrder);

onMounted(() => {
  orderStore.joinOrderRoom(token);
});

const steps = [
  { key: 'ACCEPTED', label: 'Принят' },
  { key: 'EN_ROUTE', label: 'В пути' },
  { key: 'ARRIVED', label: 'Прибыл' },
  { key: 'HOSPITAL_TRANSPORT', label: 'Госпитализация' }
];

const currentStepIndex = computed(() => {
  if (!order.value) return 0;
  switch (order.value.status) {
    case 'ACCEPTED': return 0;
    case 'EN_ROUTE': return 1;
    case 'ARRIVED': return 2;
    case 'HOSPITAL_TRANSPORT': return 3;
    case 'COMPLETED': return 3;
    default: return 0;
  }
});

const distanceKm = computed(() => {
  if (!order.value) return 2.4;
  const amb = order.value.currentLoc;
  const dest = order.value.destinationLoc;
  if (!amb || !dest) return 2.4;

  const dLat = (dest.lat - amb.lat) * 111;
  const dLng = (dest.lng - amb.lng) * 111 * Math.cos((amb.lat * Math.PI) / 180);
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  return parseFloat(dist.toFixed(1));
});

const etaMinutes = computed(() => {
  const mins = Math.ceil(distanceKm.value * 2.5 + 1);
  return mins < 1 ? 1 : mins;
});

const onUpdateAccess = (accessInfo: Partial<AccessInfo>) => {
  orderStore.updateAccessInfo(token, accessInfo);
};

const onUpdateSymptoms = (symptoms: string[]) => {
  orderStore.updateSymptoms(token, symptoms);
};

const shareWithFamily = () => {
  const url = window.location.href;
  const text = `MedTracker live: ${url}`;
  if (navigator.share) {
    navigator.share({ title: 'MedTracker', text, url });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
};

const getStatusText = (status: OrderStatus) => {
  switch (status) {
    case 'ACCEPTED': return langStore.t('callStatusAccepted');
    case 'EN_ROUTE': return langStore.t('callStatusEnRoute');
    case 'ARRIVED': return langStore.t('callStatusArrived');
    case 'HOSPITAL_TRANSPORT': return langStore.t('callStatusHospitalTransport');
    case 'COMPLETED': return langStore.t('callStatusCompleted');
  }
};
</script>
