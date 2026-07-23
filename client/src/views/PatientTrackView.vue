<template>
  <div class="relative w-full min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden select-none">
    
    <!-- Expired or Invalid Link Screen -->
    <div v-if="orderStore.errorMsg || order?.expired" class="min-h-screen flex flex-col items-center justify-center text-center p-6 space-y-5 relative z-30 max-w-md mx-auto">
      <div class="p-6 bg-white text-teal-800 rounded-3xl border border-slate-200 shadow-xl">
        <ShieldCheck class="w-16 h-16 animate-bounce" />
      </div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ langStore.t('expiredTitle') }}</h1>
      <p class="text-xs font-medium text-slate-600 max-w-xs leading-relaxed">
        {{ langStore.t('expiredDesc') }}
      </p>
      <a 
        href="tel:103" 
        class="w-full max-w-xs py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
      >
        <PhoneCall class="w-4 h-4" /> {{ langStore.t('callDispatcher') }}
      </a>
    </div>

    <!-- Active 2026 Live Tracking Screen -->
    <template v-else-if="order">
      <!-- Full Screen Background Map Canvas -->
      <div class="fixed inset-0 z-0">
        <LiveMap 
          :ambulance-loc="order.currentLoc"
          :destination-loc="order.destinationLoc"
          :route-path="order.routePath"
        />
      </div>

      <!-- Top Floating Navigation Island Pill (Safe Area & Zero Overflow) -->
      <div class="fixed top-3 left-3 right-3 z-20 max-w-md mx-auto">
        <header class="floating-island px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/90 shadow-lg">
          <div class="flex items-center gap-2.5 min-w-0 truncate">
            <div class="p-1.5 bg-teal-800 text-white rounded-xl shadow-xs shrink-0">
              <Activity class="w-4 h-4 animate-pulse" />
            </div>
            <div class="min-w-0 truncate">
              <h1 class="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1 truncate">
                <span class="truncate">{{ langStore.t('appTitle') }}</span>
                <span class="text-[9px] bg-teal-50 text-teal-800 font-bold px-1.5 py-0.2 rounded-full border border-teal-200 shrink-0">LIVE</span>
              </h1>
              <p class="text-[11px] font-bold text-slate-600 truncate">{{ order.carNumber }}</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <LanguageSwitcher />
            <button 
              @click="shareWithFamily"
              class="p-1.5 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-medium transition-all active:scale-95 shadow-xs"
              :title="langStore.t('shareFamily')"
            >
              <Share2 class="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>
        </header>
      </div>

      <!-- Bottom Activity Sheet Drawer -->
      <div 
        :class="[
          'fixed inset-x-0 bottom-0 z-20 max-w-md mx-auto transition-all duration-300 ease-out flex flex-col',
          isExpanded ? 'h-[88vh]' : 'h-[36vh] sm:h-[40vh]'
        ]"
      >
        <div class="floating-island h-full rounded-t-[32px] border-t border-x border-slate-200/90 shadow-2xl flex flex-col overflow-hidden bg-white/95 backdrop-blur-2xl">
          
          <!-- Drawer Drag Handle & Toggle Button -->
          <div 
            @click="isExpanded = !isExpanded"
            class="pt-3 pb-2 px-4 flex flex-col items-center justify-center cursor-pointer select-none hover:bg-slate-50 transition-colors border-b border-slate-100 shrink-0"
          >
            <div class="w-10 h-1 bg-slate-300 rounded-full mb-1"></div>
            <div class="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span>{{ isExpanded ? 'Свернуть карту' : 'Развернуть детали вызова' }}</span>
              <ChevronUp :class="['w-4 h-4 transition-transform duration-300', isExpanded ? 'rotate-180 text-slate-700' : 'text-slate-400']" />
            </div>
          </div>

          <!-- Drawer Bento Content Area -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            
            <!-- Hero ETA Bento Widget -->
            <div class="bento-card p-4 border border-slate-200/90 space-y-3 shadow-xs">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 shadow-xs truncate">
                  <span class="relative flex h-2 w-2 shrink-0">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-600 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-teal-700"></span>
                  </span>
                  <span class="text-[10px] font-bold uppercase tracking-wide truncate">{{ getStatusText(order.status) }}</span>
                </div>

                <a 
                  href="tel:+77778887766" 
                  class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <PhoneCall class="w-3.5 h-3.5" />
                  <span>{{ langStore.t('callOperator') }}</span>
                </a>
              </div>

              <!-- Hero ETA Display -->
              <div class="flex items-center justify-between pt-1">
                <div class="space-y-0.5 min-w-0 truncate">
                  <div class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 flex items-baseline gap-1.5 flex-wrap">
                    <span class="text-teal-800 font-mono">~{{ order.etaMinutes || etaMinutes }}</span>
                    <span class="text-xs font-bold text-slate-500 uppercase">{{ langStore.t('mins') }}</span>
                    <span class="text-xs font-semibold text-slate-400">({{ order.distanceKm || distanceKm }} {{ langStore.t('km') }})</span>
                  </div>
                  <div class="text-[11px] font-medium text-slate-500 flex items-center gap-1 truncate">
                    <Navigation class="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span class="truncate">{{ langStore.t('speedInfo') }}</span>
                  </div>
                </div>

                <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-center shadow-xs shrink-0">
                  <Truck class="w-6 h-6 text-slate-700 mx-auto" />
                  <span class="text-[9px] font-bold text-slate-600 block tracking-wider mt-0.5">{{ langStore.t('crewBadge') }}</span>
                </div>
              </div>

              <!-- Timeline Stepper -->
              <div class="space-y-1 pt-2 border-t border-slate-100">
                <div class="grid grid-cols-4 gap-1.5">
                  <div 
                    v-for="(step, idx) in steps" 
                    :key="step.key"
                    :class="[
                      'h-1.5 rounded-full transition-all duration-500',
                      currentStepIndex >= idx 
                        ? 'bg-teal-800 shadow-xs' 
                        : 'bg-slate-200'
                    ]"
                  ></div>
                </div>
                <div class="flex justify-between text-[9px] font-bold text-slate-500 px-0.5">
                  <span>Принят</span>
                  <span>В пути</span>
                  <span>Прибыл</span>
                  <span>Клиника</span>
                </div>
              </div>
            </div>

            <!-- Sound Alert Pill if close -->
            <div v-if="distanceKm < 0.6 && order.status === 'EN_ROUTE'" class="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 shadow-xs animate-pulse">
              <div class="p-2 bg-amber-200/60 rounded-xl text-amber-800 shrink-0">
                <BellRing class="w-5 h-5" />
              </div>
              <div class="text-xs font-medium">
                <strong class="block text-slate-900 font-bold mb-0.5">{{ langStore.t('nearYardWarningTitle') }}</strong>
                {{ langStore.t('nearYardWarningText') }}
              </div>
            </div>

            <!-- Access Details Bento -->
            <AccessForm 
              :initial-access-info="order.accessInfo"
              @update="onUpdateAccess"
            />

            <!-- Symptoms Selector Bento -->
            <SymptomSelector 
              :initial-symptoms="order.symptoms"
              @update="onUpdateSymptoms"
            />

            <!-- Pre-Arrival Checklist Bento -->
            <PreArrivalChecklist />

          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
  Share2,
  ChevronUp
} from 'lucide-vue-next';
import type { OrderStatus, AccessInfo } from '@/types';

const route = useRoute();
const orderStore = useOrderStore();
const langStore = useLangStore();

const isExpanded = ref(false);

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
