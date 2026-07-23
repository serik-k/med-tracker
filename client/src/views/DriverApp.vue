<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto space-y-4 font-sans relative overflow-x-hidden">
    <!-- Ambient Glow -->
    <div class="fixed top-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Header -->
    <header class="medical-card px-4 py-3.5 rounded-3xl flex items-center justify-between border border-white/10 shadow-2xl relative z-10">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-500 text-white rounded-2xl shadow-md glow-emerald">
          <Truck class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-sm font-black text-white tracking-tight">{{ langStore.t('driverTitle') }}</h1>
          <p class="text-[11px] font-extrabold text-emerald-400">{{ activeOrder?.carNumber || 'Бригада скорой' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <LanguageSwitcher />
      </div>
    </header>

    <!-- Active Call / Car Selector -->
    <div class="medical-card p-3.5 rounded-3xl border border-white/10 space-y-2 relative z-30 shadow-xl">
      <CustomSelect 
        v-model="selectedToken"
        label="Выбрать активный вызов / Машину:"
        :options="driverOrderOptions"
        :icon="Truck"
      />
    </div>

    <!-- Active Call Info Card -->
    <div v-if="activeOrder" class="medical-card p-5 rounded-3xl border border-white/10 space-y-4 shadow-2xl relative z-10">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <span class="text-xs font-black text-emerald-400 tracking-wider">ВЫЗОВ {{ activeOrder.id }}</span>
        <span class="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          {{ getStatusText(activeOrder.status) }}
        </span>
      </div>

      <div class="space-y-0.5">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Науқас / Пациент</div>
        <div class="text-lg font-black text-white tracking-tight">{{ activeOrder.patientName }} ({{ activeOrder.patientPhone }})</div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Адрес вызова</div>
        <div class="text-xs font-bold text-emerald-200 flex items-start gap-1.5">
          <MapPin class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span class="leading-relaxed">{{ activeOrder.address }}</span>
        </div>
      </div>

      <!-- Quick Launch Navigator Button -->
      <a 
        :href="getNavigatorUrl(activeOrder.destinationLoc)"
        target="_blank"
        class="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/50 cursor-pointer transition-all active:scale-95 border border-indigo-400/30"
      >
        <Navigation class="w-4 h-4" />
        <span>{{ langStore.t('navButton') }}</span>
      </a>
    </div>

    <!-- Status Change Action Buttons Grid -->
    <div v-if="activeOrder" class="medical-card p-5 rounded-3xl border border-white/10 space-y-3.5 shadow-2xl relative z-10">
      <h2 class="text-xs font-extrabold text-slate-300 uppercase tracking-wider">{{ langStore.t('1clickStatus') }}</h2>

      <div class="grid grid-cols-2 gap-3">
        <button 
          @click="setStatus('ACCEPTED')"
          :class="[
            'p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-md',
            activeOrder.status === 'ACCEPTED' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-950/50 scale-[1.02]' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('accepted') }}
        </button>

        <button 
          @click="setStatus('EN_ROUTE')"
          :class="[
            'p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-md',
            activeOrder.status === 'EN_ROUTE' ? 'bg-rose-600 text-white border-rose-400 shadow-rose-950/50 animate-pulse scale-[1.02]' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('enRoute') }}
        </button>

        <button 
          @click="setStatus('ARRIVED')"
          :class="[
            'p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-md',
            activeOrder.status === 'ARRIVED' ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/50 scale-[1.02]' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('arrived') }}
        </button>

        <button 
          @click="setStatus('HOSPITAL_TRANSPORT')"
          :class="[
            'p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center active:scale-95 shadow-md',
            activeOrder.status === 'HOSPITAL_TRANSPORT' ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-950/50 scale-[1.02]' : 'bg-slate-900 border-slate-800 text-slate-400'
          ]"
        >
          {{ langStore.t('hospitalTransport') }}
        </button>
      </div>

      <!-- Complete Call & End Tracking Button -->
      <button 
        @click="setStatus('COMPLETED')"
        class="w-full py-4 bg-slate-900 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-700/60 text-slate-300 hover:text-emerald-300 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
      >
        <ShieldCheck class="w-5 h-5 text-emerald-400" />
        <span>{{ langStore.t('completed') }}</span>
      </button>
    </div>

    <!-- Live Access Details from Patient -->
    <div v-if="activeOrder" class="medical-card p-5 rounded-3xl border border-white/10 space-y-3.5 shadow-2xl relative z-10">
      <div class="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-3">
        <KeyRound class="w-5 h-5" />
        <h2 class="text-xs font-black text-white uppercase tracking-wider">{{ langStore.t('patientDetailsTitle') }}</h2>
      </div>

      <!-- Symptoms -->
      <div v-if="activeOrder.symptoms.length > 0" class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400">{{ langStore.t('symptoms') }}:</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="symptom in activeOrder.symptoms" :key="symptom" class="text-xs bg-rose-500/20 text-rose-200 px-3 py-1 rounded-xl border border-rose-500/30 font-extrabold">
            {{ symptom }}
          </span>
        </div>
      </div>

      <!-- Access items -->
      <div class="grid grid-cols-2 gap-2.5 text-xs">
        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-bold uppercase">{{ langStore.t('intercom') }}</span>
          <strong class="text-emerald-300 text-xs font-black">{{ activeOrder.accessInfo.intercom || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-bold uppercase">{{ langStore.t('gateCode') }}</span>
          <strong class="text-emerald-300 text-xs font-black">{{ activeOrder.accessInfo.gateCode || langStore.t('notSpecified') }}</strong>
        </div>

        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-bold uppercase">{{ langStore.t('entranceFloor') }}</span>
          <strong class="text-slate-200 text-xs font-black">{{ activeOrder.accessInfo.entrance || '?' }} / {{ activeOrder.accessInfo.floor || '?' }}</strong>
        </div>

        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span class="text-slate-400 text-[10px] block font-bold uppercase">{{ langStore.t('note') }}</span>
          <strong class="text-slate-300 text-[11px] font-bold block truncate">{{ activeOrder.accessInfo.note || langStore.t('noNote') }}</strong>
        </div>
      </div>

      <!-- Photo preview if uploaded -->
      <div v-if="activeOrder.accessInfo.photoUrl" class="pt-2 border-t border-slate-800">
        <span class="text-[11px] text-slate-400 block mb-1.5 font-bold">{{ langStore.t('photoFromPatient') }}</span>
        <img :src="activeOrder.accessInfo.photoUrl" class="w-full h-44 object-cover rounded-2xl border border-slate-700 shadow-xl" />
      </div>
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
