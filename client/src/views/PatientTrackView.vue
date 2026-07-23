<template>
  <div class="relative w-full min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
    <!-- Expired or Invalid Link Screen -->
    <div v-if="orderStore.errorMsg || order?.expired" class="min-h-screen flex flex-col items-center justify-center text-center p-6 space-y-5 relative z-30 max-w-md mx-auto">
      <div class="p-6 bg-white text-teal-600 rounded-3xl border border-slate-200 shadow-xl">
        <ShieldCheck class="w-16 h-16 animate-bounce" />
      </div>
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">{{ langStore.t('expiredTitle') }}</h1>
      <p class="text-xs font-semibold text-slate-500 max-w-xs leading-relaxed">
        {{ langStore.t('expiredDesc') }}
      </p>
      <a 
        href="tel:103" 
        class="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-900/20 transition-all active:scale-95"
      >
        <PhoneCall class="w-4 h-4" /> {{ langStore.t('callDispatcher') }}
      </a>
    </div>

    <!-- Active Live Activity Patient Screen (Full Map + Floating Crisp HUD) -->
    <template v-else-if="order">
      <!-- Full Bleed Map Background -->
      <div class="fixed inset-0 z-0">
        <LiveMap 
          :ambulance-loc="order.currentLoc"
          :destination-loc="order.destinationLoc"
          :route-path="order.routePath"
        />
      </div>

      <!-- Top Floating Navigation Pill -->
      <div class="fixed top-4 left-4 right-4 z-20 max-w-md mx-auto">
        <header class="medical-card px-4 py-3 rounded-3xl flex items-center justify-between border border-slate-200/80 shadow-xl">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-teal-600 text-white rounded-2xl shadow-md glow-teal">
              <Activity class="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 class="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                {{ langStore.t('appTitle') }}
                <span class="text-[9px] bg-teal-50 text-teal-700 font-black px-2 py-0.5 rounded-full border border-teal-200">LIVE</span>
              </h1>
              <p class="text-[11px] font-black text-teal-600">{{ order.carNumber }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <LanguageSwitcher />
            <button 
              @click="shareWithFamily"
              class="p-2 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
              :title="langStore.t('shareFamily')"
            >
              <Share2 class="w-4 h-4 text-teal-600" />
            </button>
          </div>
        </header>
      </div>

      <!-- Bottom Dynamic Floating Activity Drawer Sheet -->
      <div class="relative z-10 pt-[55vh] pb-8 px-4 max-w-md mx-auto space-y-4">
        
        <!-- Hero ETA Live Activity Card -->
        <div class="medical-card p-5 rounded-3xl border border-slate-200/80 shadow-xl space-y-4">
          
          <!-- Call Status Header Pill -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600"></span>
              </span>
              <span class="text-xs font-black uppercase tracking-wide">{{ getStatusText(order.status) }}</span>
            </div>

            <!-- Emergency Phone Call button -->
            <a 
              href="tel:+77778887766" 
              class="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <PhoneCall class="w-3.5 h-3.5 text-rose-600" />
              <span>{{ langStore.t('callOperator') }}</span>
            </a>
          </div>

          <!-- Hero ETA Numbers -->
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="text-4xl font-black tracking-tight flex items-baseline gap-2">
                <span class="gradient-text-teal">~{{ order.etaMinutes || etaMinutes }}</span>
                <span class="text-sm font-black text-slate-500 uppercase">{{ langStore.t('mins') }}</span>
                <span class="text-xs font-bold text-slate-400">({{ order.distanceKm || distanceKm }} {{ langStore.t('km') }})</span>
              </div>
              <div class="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Navigation class="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span>{{ langStore.t('speedInfo') }}</span>
              </div>
            </div>

            <!-- Car Badge Box -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center shadow-inner">
              <Truck class="w-7 h-7 text-teal-600 mx-auto" />
              <span class="text-[10px] font-black text-slate-700 block tracking-wider mt-1">{{ langStore.t('crewBadge') }}</span>
            </div>
          </div>

          <!-- Timeline Stepper -->
          <div class="space-y-1.5 pt-2 border-t border-slate-100">
            <div class="grid grid-cols-4 gap-2">
              <div 
                v-for="(step, idx) in steps" 
                :key="step.key"
                :class="[
                  'h-2 rounded-full transition-all duration-500',
                  currentStepIndex >= idx 
                    ? 'bg-teal-600 shadow-sm' 
                    : 'bg-slate-100 border border-slate-200'
                ]"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] font-extrabold text-slate-500 px-0.5">
              <span>Принят</span>
              <span>В пути</span>
              <span>Прибыл</span>
              <span>Клиника</span>
            </div>
          </div>
        </div>

        <!-- Pro-active Sound Alert Pill if close -->
        <div v-if="distanceKm < 0.6 && order.status === 'EN_ROUTE'" class="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-3.5 text-amber-900 shadow-lg animate-pulse">
          <div class="p-2 bg-amber-200/60 rounded-2xl text-amber-800 shrink-0">
            <BellRing class="w-6 h-6" />
          </div>
          <div class="text-xs font-semibold">
            <strong class="block text-slate-900 font-extrabold mb-0.5">{{ langStore.t('nearYardWarningTitle') }}</strong>
            {{ langStore.t('nearYardWarningText') }}
          </div>
        </div>

        <!-- Access Details Form -->
        <AccessForm 
          :initial-access-info="order.accessInfo"
          @update="onUpdateAccess"
        />

        <!-- Symptoms Selector Triage -->
        <SymptomSelector 
          :initial-symptoms="order.symptoms"
          @update="onUpdateSymptoms"
        />

        <!-- Pre-Arrival Checklist -->
        <PreArrivalChecklist />

      </div>
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
