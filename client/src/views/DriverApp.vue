<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 p-2.5 sm:p-4 max-w-md mx-auto space-y-3 font-sans relative pb-24 select-none overflow-x-hidden">
    <!-- Header (Zero Overflow Fit) -->
    <header class="medical-card px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/80 shadow-md overflow-hidden">
      <div class="flex items-center gap-2 min-w-0 truncate">
        <div class="p-1.5 bg-teal-600 text-white rounded-xl shadow-xs glow-teal shrink-0">
          <Truck class="w-4.5 h-4.5" />
        </div>
        <div class="min-w-0 truncate">
          <h1 class="text-xs font-black text-slate-900 tracking-tight truncate">{{ langStore.t('driverTitle') }}</h1>
          <p class="text-[10px] font-black text-teal-600 truncate">{{ activeOrder?.carNumber || 'Бригада скорой' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <LanguageSwitcher />
      </div>
    </header>

    <!-- Active Call / Car Selector -->
    <div class="medical-card p-3 rounded-2xl border border-slate-200/80 space-y-1.5 relative z-30 shadow-md">
      <CustomSelect 
        v-model="selectedToken"
        label="Выбрать активный вызов / Машину:"
        :options="driverOrderOptions"
        :icon="Truck"
      />
    </div>

    <!-- Active Call Info Card -->
    <div v-if="activeOrder" class="medical-card p-4 rounded-2xl border border-slate-200/80 space-y-3 shadow-md relative z-10">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
        <span class="text-xs font-black text-teal-700 tracking-wider shrink-0">ВЫЗОВ {{ activeOrder.id }}</span>
        <span class="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 truncate">
          {{ getStatusText(activeOrder.status) }}
        </span>
      </div>

      <div class="space-y-0.5">
        <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Науқас / Пациент</div>
        <div class="text-base font-black text-slate-900 tracking-tight truncate">{{ activeOrder.patientName }} ({{ activeOrder.patientPhone }})</div>
      </div>

      <div class="space-y-0.5">
        <div class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Адрес вызова</div>
        <div class="text-xs font-bold text-slate-800 flex items-start gap-1.5">
          <MapPin class="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <span class="leading-relaxed">{{ activeOrder.address }}</span>
        </div>
      </div>
    </div>

    <!-- Mobile-First Touch Status Buttons Grid (Big 52px Touch Targets) -->
    <div v-if="activeOrder" class="medical-card p-4 rounded-2xl border border-slate-200/80 space-y-3 shadow-md relative z-10">
      <h2 class="text-[10px] font-black text-slate-500 uppercase tracking-wider">{{ langStore.t('1clickStatus') }}</h2>

      <div class="grid grid-cols-2 gap-2">
        <button 
          @click="setStatus('ACCEPTED')"
          :class="[
            'py-3.5 px-2 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-xs min-h-[50px] flex items-center justify-center',
            activeOrder.status === 'ACCEPTED' ? 'bg-amber-500 text-white border-amber-400 shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
          ]"
        >
          {{ langStore.t('accepted') }}
        </button>

        <button 
          @click="setStatus('EN_ROUTE')"
          :class="[
            'py-3.5 px-2 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-xs min-h-[50px] flex items-center justify-center',
            activeOrder.status === 'EN_ROUTE' ? 'bg-rose-600 text-white border-rose-500 shadow-md animate-pulse scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
          ]"
        >
          {{ langStore.t('enRoute') }}
        </button>

        <button 
          @click="setStatus('ARRIVED')"
          :class="[
            'py-3.5 px-2 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-xs min-h-[50px] flex items-center justify-center',
            activeOrder.status === 'ARRIVED' ? 'bg-teal-600 text-white border-teal-500 shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
          ]"
        >
          {{ langStore.t('arrived') }}
        </button>

        <button 
          @click="setStatus('HOSPITAL_TRANSPORT')"
          :class="[
            'py-3.5 px-2 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-xs min-h-[50px] flex items-center justify-center',
            activeOrder.status === 'HOSPITAL_TRANSPORT' ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
          ]"
        >
          {{ langStore.t('hospitalTransport') }}
        </button>
      </div>

      <!-- Complete Call Button -->
      <button 
        @click="setStatus('COMPLETED')"
        class="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
      >
        <ShieldCheck class="w-5 h-5 text-emerald-400" />
        <span>{{ langStore.t('completed') }}</span>
      </button>
    </div>

    <!-- Live Access Details from Patient -->
    <div v-if="activeOrder" class="medical-card p-4 rounded-2xl border border-slate-200/80 space-y-3 shadow-md relative z-10">
      <div class="flex items-center gap-2 text-teal-700 border-b border-slate-100 pb-2.5">
        <KeyRound class="w-4.5 h-4.5 text-teal-600" />
        <h2 class="text-xs font-black text-slate-900 uppercase tracking-wider">{{ langStore.t('patientDetailsTitle') }}</h2>
      </div>

      <!-- Symptoms -->
      <div v-if="activeOrder.symptoms.length > 0" class="space-y-1">
        <div class="text-[10px] font-bold text-slate-400">{{ langStore.t('symptoms') }}:</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="symptom in activeOrder.symptoms" :key="symptom" class="text-xs bg-rose-50 text-rose-800 px-2.5 py-0.5 rounded-lg border border-rose-200 font-black">
            {{ symptom }}
          </span>
        </div>
      </div>

      <!-- Access items -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span class="text-slate-500 text-[9px] block font-extrabold uppercase">{{ langStore.t('intercom') }}</span>
          <strong class="text-teal-800 text-xs font-black">{{ activeOrder.accessInfo.intercom || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span class="text-slate-500 text-[9px] block font-extrabold uppercase">{{ langStore.t('gateCode') }}</span>
          <strong class="text-teal-800 text-xs font-black">{{ activeOrder.accessInfo.gateCode || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span class="text-slate-500 text-[9px] block font-extrabold uppercase">{{ langStore.t('entranceFloor') }}</span>
          <strong class="text-slate-900 text-xs font-black">{{ activeOrder.accessInfo.entrance || '?' }} / {{ activeOrder.accessInfo.floor || '?' }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <span class="text-slate-500 text-[9px] block font-extrabold uppercase">{{ langStore.t('note') }}</span>
          <strong class="text-slate-700 text-[10px] font-bold block truncate">{{ activeOrder.accessInfo.note || langStore.t('noNote') }}</strong>
        </div>
      </div>

      <!-- Photo preview if uploaded -->
      <div v-if="activeOrder.accessInfo.photoUrl" class="pt-2 border-t border-slate-100">
        <span class="text-[10px] text-slate-500 block mb-1 font-bold">{{ langStore.t('photoFromPatient') }}</span>
        <img :src="activeOrder.accessInfo.photoUrl" class="w-full h-36 object-cover rounded-xl border border-slate-200 shadow-md" />
      </div>
    </div>

    <!-- Sticky Bottom Navigator Bar for Driver -->
    <div v-if="activeOrder" class="fixed bottom-2.5 left-2.5 right-2.5 z-30 max-w-md mx-auto">
      <a 
        :href="getNavigatorUrl(activeOrder.destinationLoc)"
        target="_blank"
        class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/20 cursor-pointer transition-all active:scale-95 border border-indigo-400/30 backdrop-blur-xl"
      >
        <Navigation class="w-4 h-4" />
        <span>{{ langStore.t('navButton') }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import { Truck, MapPin, KeyRound, ShieldCheck, Navigation } from 'lucide-vue-next';
import type { OrderStatus, Location } from '@/types';

const route = useRoute();
const router = useRouter();
const orderStore = useOrderStore();
const langStore = useLangStore();

const selectedToken = ref<string>((route.query.token as string) || 'demo-track-123');

onMounted(() => {
  orderStore.joinDispatcherRoom();
  if (selectedToken.value) {
    orderStore.joinOrderRoom(selectedToken.value);
  }
  startGpsTracking();
});

const driverOrderOptions = computed<SelectOption[]>(() => {
  if (orderStore.activeOrders.length === 0) {
    return [{ value: 'demo-track-123', label: 'Скорая №103 (ORD-7701) — Демо' }];
  }
  return orderStore.activeOrders.map(o => ({
    value: o.token,
    label: `${o.carNumber} — ${o.patientName} (${o.id})`
  }));
});

watch(selectedToken, (newToken) => {
  if (newToken) {
    orderStore.joinOrderRoom(newToken);
    router.replace({ query: { token: newToken } });
  }
});

const activeOrder = computed(() => {
  return orderStore.currentOrder || orderStore.activeOrders.find(o => o.token === selectedToken.value);
});

const startGpsTracking = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (pos) => {
        if (activeOrder.value && activeOrder.value.status === 'EN_ROUTE') {
          orderStore.sendLocation(selectedToken.value, pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => console.log('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
  }
};

const setStatus = (status: OrderStatus) => {
  orderStore.updateStatus(selectedToken.value, status);
};

const getNavigatorUrl = (loc?: Location) => {
  if (!loc) return 'https://yandex.ru/maps/';
  return `https://yandex.ru/maps/?rtext=~${loc.lat},${loc.lng}`;
};

const getStatusText = (status: OrderStatus) => {
  switch (status) {
    case 'ACCEPTED': return langStore.t('accepted');
    case 'EN_ROUTE': return langStore.t('enRoute');
    case 'ARRIVED': return langStore.t('arrived');
    case 'HOSPITAL_TRANSPORT': return langStore.t('hospitalTransport');
    case 'COMPLETED': return langStore.t('completed');
  }
};
</script>
