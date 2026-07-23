<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto space-y-4 font-sans relative overflow-x-hidden">
    <!-- Ambient Glow -->
    <div class="fixed top-0 left-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Header -->
    <header class="glass-panel px-4 py-3.5 rounded-2xl flex items-center justify-between border border-slate-800 shadow-xl relative z-10">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-gradient-to-br from-rose-600 to-rose-500 text-white rounded-xl shadow-md shadow-rose-950/50">
          <Truck class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-sm font-black text-white tracking-tight">{{ langStore.t('driverTitle') }}</h1>
          <p class="text-[11px] font-semibold text-rose-300">Бригада №103 (02 KZ 777 ABC)</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <LanguageSwitcher />
      </div>
    </header>

    <!-- Active Call Info Card -->
    <div v-if="order" class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3.5 shadow-xl relative z-10">
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <span class="text-xs font-black text-rose-400 tracking-wider">ВЫЗОВ {{ order.id }}</span>
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {{ getStatusText(order.status) }}
        </span>
      </div>

      <div class="space-y-0.5">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Науқас / Пациент</div>
        <div class="text-base font-extrabold text-white">{{ order.patientName }} ({{ order.patientPhone }})</div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Адрес вызова</div>
        <div class="text-xs font-bold text-rose-200 flex items-start gap-1.5">
          <MapPin class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span class="leading-relaxed">{{ order.address }}</span>
        </div>
      </div>

      <!-- Quick Launch Navigator Button -->
      <a 
        :href="getNavigatorUrl(order.destinationLoc)"
        target="_blank"
        class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 cursor-pointer transition-all active:scale-95 border border-indigo-400/30"
      >
        <Navigation class="w-4 h-4" />
        <span>{{ langStore.t('navButton') }}</span>
      </a>
    </div>

    <!-- Status Change Action Buttons Grid -->
    <div v-if="order" class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl relative z-10">
      <h2 class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">{{ langStore.t('1clickStatus') }}</h2>

      <div class="grid grid-cols-2 gap-2.5">
        <button 
          @click="setStatus('ACCEPTED')"
          :class="[
            'p-3.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center active:scale-95 shadow-md',
            order.status === 'ACCEPTED' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-950/50' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('accepted') }}
        </button>

        <button 
          @click="setStatus('EN_ROUTE')"
          :class="[
            'p-3.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center active:scale-95 shadow-md',
            order.status === 'EN_ROUTE' ? 'bg-rose-600 text-white border-rose-400 shadow-rose-950/50 animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('enRoute') }}
        </button>

        <button 
          @click="setStatus('ARRIVED')"
          :class="[
            'p-3.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center active:scale-95 shadow-md',
            order.status === 'ARRIVED' ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/50' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('arrived') }}
        </button>

        <button 
          @click="setStatus('HOSPITAL_TRANSPORT')"
          :class="[
            'p-3.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer text-center active:scale-95 shadow-md',
            order.status === 'HOSPITAL_TRANSPORT' ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-950/50' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('hospitalTransport') }}
        </button>
      </div>

      <!-- Complete Call & End Tracking Button -->
      <button 
        @click="setStatus('COMPLETED')"
        class="w-full py-3.5 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-700/60 text-slate-300 hover:text-emerald-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
      >
        <ShieldCheck class="w-4.5 h-4.5 text-emerald-500" />
        <span>{{ langStore.t('completed') }}</span>
      </button>
    </div>

    <!-- Live Access Details from Patient -->
    <div v-if="order" class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3.5 shadow-xl relative z-10">
      <div class="flex items-center gap-2 text-indigo-400 border-b border-slate-800 pb-2.5">
        <KeyRound class="w-4.5 h-4.5" />
        <h2 class="text-xs font-extrabold text-white uppercase tracking-wider">{{ langStore.t('patientDetailsTitle') }}</h2>
      </div>

      <!-- Symptoms -->
      <div v-if="order.symptoms.length > 0" class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400">{{ langStore.t('symptoms') }}:</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="symptom in order.symptoms" :key="symptom" class="text-xs bg-rose-500/20 text-rose-200 px-2.5 py-1 rounded-lg border border-rose-500/30 font-bold">
            {{ symptom }}
          </span>
        </div>
      </div>

      <!-- Access items -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-semibold">{{ langStore.t('intercom') }}</span>
          <strong class="text-indigo-300 text-xs font-extrabold">{{ order.accessInfo.intercom || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-semibold">{{ langStore.t('gateCode') }}</span>
          <strong class="text-indigo-300 text-xs font-extrabold">{{ order.accessInfo.gateCode || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-semibold">{{ langStore.t('entranceFloor') }}</span>
          <strong class="text-slate-200 text-xs font-extrabold">{{ order.accessInfo.entrance || '?' }} / {{ order.accessInfo.floor || '?' }}</strong>
        </div>

        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-semibold">{{ langStore.t('note') }}</span>
          <strong class="text-slate-300 text-[11px] font-bold block truncate">{{ order.accessInfo.note || langStore.t('noNote') }}</strong>
        </div>
      </div>

      <!-- Photo preview if uploaded -->
      <div v-if="order.accessInfo.photoUrl" class="pt-2 border-t border-slate-800">
        <span class="text-[11px] text-slate-400 block mb-1 font-bold">{{ langStore.t('photoFromPatient') }}</span>
        <img :src="order.accessInfo.photoUrl" class="w-full h-40 object-cover rounded-xl border border-slate-700 shadow-lg" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import { Truck, MapPin, KeyRound, ShieldCheck, Navigation } from 'lucide-vue-next';
import type { OrderStatus, Location } from '@/types';

const orderStore = useOrderStore();
const langStore = useLangStore();
const demoToken = 'demo-track-123';

const order = computed(() => orderStore.currentOrder);

onMounted(() => {
  orderStore.joinOrderRoom(demoToken);
  startGpsTracking();
});

const startGpsTracking = () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (pos) => {
        if (order.value && order.value.status === 'EN_ROUTE') {
          orderStore.sendLocation(demoToken, pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => console.log('Geolocation error:', err),
      { enableHighAccuracy: true }
    );
  }
};

const setStatus = (status: OrderStatus) => {
  orderStore.updateStatus(demoToken, status);
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
