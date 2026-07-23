<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6 font-sans relative">
    <!-- Ambient Background Glows -->
    <div class="fixed top-0 right-1/4 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="fixed bottom-0 left-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Top Header -->
    <header class="glass-panel px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 shadow-2xl relative z-10">
      <div class="flex items-center gap-3.5">
        <div class="p-3 bg-gradient-to-tr from-rose-600 to-rose-500 text-white rounded-2xl shadow-lg shadow-rose-950/50">
          <Activity class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 class="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
            {{ langStore.t('appTitle') }} — {{ langStore.t('dispatcherRoom') }}
            <span class="text-xs bg-rose-500/20 text-rose-300 font-bold px-2.5 py-0.5 rounded-full border border-rose-500/30">
              {{ langStore.t('clinicTag') }}
            </span>
          </h1>
          <p class="text-xs text-slate-400">Алматы • Оперативный мониторинг автопарка на единой карте</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Language Switcher UI -->
        <LanguageSwitcher />

        <router-link 
          to="/track/demo-track-123" 
          target="_blank"
          class="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all active:scale-95"
        >
          <Eye class="w-4 h-4" />
          {{ langStore.t('patientTrack') }}
        </router-link>
      </div>
    </header>

    <!-- Analytical Stats Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
      <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-400 font-semibold block">{{ langStore.t('activeCalls') }}</span>
          <span class="text-2xl font-black text-white">{{ activeOrders.length }}</span>
        </div>
        <div class="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
          <Clock class="w-5 h-5" />
        </div>
      </div>

      <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-400 font-semibold block">{{ langStore.t('avgArrival') }}</span>
          <span class="text-2xl font-black text-emerald-400">11.4 {{ langStore.t('mins') }}</span>
        </div>
        <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Zap class="w-5 h-5" />
        </div>
      </div>

      <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-400 font-semibold block">{{ langStore.t('onDutyCars') }}</span>
          <span class="text-2xl font-black text-rose-400">3</span>
        </div>
        <div class="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
          <Truck class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Main Grid: Form + Orders + Map -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
      
      <!-- Left Column: Create Order & List (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- New Order Form -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 relative z-30">
          <div class="flex items-center gap-2 border-b border-slate-800 pb-3">
            <PlusCircle class="w-5 h-5 text-rose-500" />
            <h2 class="text-sm font-bold text-white">{{ langStore.t('newCallTitle') }}</h2>
          </div>

          <form @submit.prevent="handleCreateOrder" class="space-y-3.5">
            <!-- Custom Input: Patient Name -->
            <CustomInput 
              v-model="newOrderForm.patientName"
              :label="langStore.t('patientNameLabel')"
              :placeholder="langStore.t('patientNamePlaceholder')"
              :icon="User"
              required
            />

            <!-- Custom Input: Phone -->
            <CustomInput 
              v-model="newOrderForm.patientPhone"
              :label="langStore.t('phoneLabel')"
              :placeholder="langStore.t('phonePlaceholder')"
              :icon="Phone"
              type="tel"
              required
            />

            <!-- Custom Input: Address in Almaty -->
            <CustomInput 
              v-model="newOrderForm.address"
              :label="langStore.t('addressLabel')"
              :placeholder="langStore.t('addressPlaceholder')"
              :icon="MapPin"
              required
            />

            <!-- Custom Select: Car Choice -->
            <CustomSelect 
              v-model="newOrderForm.carNumber"
              :label="langStore.t('selectCarLabel')"
              :options="carOptions"
              :icon="Truck"
            />

            <button 
              type="submit" 
              :disabled="loading"
              class="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              <Send class="w-4 h-4" />
              <span>{{ loading ? 'Поиск геокодирования...' : langStore.t('createCallBtn') }}</span>
            </button>
          </form>
        </div>

        <!-- Active Orders List -->
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 relative z-10">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 class="text-sm font-bold text-white flex items-center gap-2">
              <Clock class="w-4 h-4 text-amber-400" />
              {{ langStore.t('activeCalls') }} ({{ activeOrders.length }})
            </h2>
          </div>

          <div v-if="activeOrders.length === 0" class="text-center py-8 text-xs text-slate-500">
            Нет активных вызовов в системе
          </div>

          <div v-else class="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
            <div 
              v-for="order in activeOrders" 
              :key="order.token"
              class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
            >
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-black text-xs text-white">{{ order.id }}</span>
                    <span 
                      :class="[
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                        getStatusBadgeClass(order.status)
                      ]"
                    >
                      {{ getStatusText(order.status) }}
                    </span>
                  </div>
                  <div class="text-xs font-bold text-slate-100 mt-1">{{ order.patientName }} ({{ order.patientPhone }})</div>
                  <div class="text-[11px] font-bold text-rose-400 mt-0.5">{{ order.carNumber }}</div>
                  <div class="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin class="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    {{ order.address }}
                  </div>
                </div>

                <!-- Simulation Toggle -->
                <button
                  @click="toggleSim(order.token, !order.isSimulating)"
                  :class="[
                    'px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-sm',
                    order.isSimulating 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  ]"
                >
                  <Play class="w-3 h-3" />
                  <span>{{ order.isSimulating ? langStore.t('simActive') : langStore.t('simToggle') }}</span>
                </button>
              </div>

              <!-- Action buttons: WhatsApp & Copy Link -->
              <div class="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button 
                  @click="openWhatsApp(order)"
                  class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition-all active:scale-95"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>{{ langStore.t('openWhatsApp') }}</span>
                </button>

                <button 
                  @click="copyTrackLink(order.token)"
                  class="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-700 active:scale-95"
                >
                  <Copy class="w-3.5 h-3.5 text-slate-400" />
                  <span>{{ copiedToken === order.token ? langStore.t('copied') : langStore.t('copyLink') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Clinic Map (7 cols) - NOW RENDERS ALL ACTIVE AMBULANCES ON THE MAP SIMULTANEOUSLY! -->
      <div class="lg:col-span-7 flex flex-col space-y-4">
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Compass class="w-5 h-5 text-rose-500" />
              <h2 class="text-sm font-bold text-white">{{ langStore.t('mapTitle') }}</h2>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              {{ activeOrders.length }} {{ langStore.t('carsInAir') }} на карте
            </div>
          </div>

          <!-- Map Container passing ALL active orders to LiveMap -->
          <div class="w-full h-[580px] rounded-xl overflow-hidden relative border border-slate-800">
            <LiveMap :orders="activeOrders" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import LiveMap from '@/components/LiveMap.vue';
import CustomInput from '@/components/ui/CustomInput.vue';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import { 
  Activity, 
  Eye, 
  PlusCircle, 
  Clock, 
  Send, 
  MessageSquare, 
  Copy, 
  MapPin, 
  Play, 
  Compass,
  Zap,
  Truck,
  User,
  Phone
} from 'lucide-vue-next';
import type { Order, OrderStatus } from '@/types';

const orderStore = useOrderStore();
const langStore = useLangStore();
const loading = ref(false);
const copiedToken = ref<string | null>(null);

const activeOrders = computed(() => orderStore.activeOrders);

const carOptions: SelectOption[] = [
  { value: 'Скорая №103 (02 KZ 777 ABC)', label: 'Скорая №103 (02 KZ 777 ABC) — Реанимация' },
  { value: 'Скорая №101 (02 KZ 111 MED)', label: 'Скорая №101 (02 KZ 111 MED) — Бригада 1' },
  { value: 'Скорая №105 (02 KZ 555 VIP)', label: 'Скорая №105 (02 KZ 555 VIP) — Педиатрическая' }
];

const newOrderForm = reactive({
  patientName: '',
  patientPhone: '',
  address: '',
  carNumber: 'Скорая №103 (02 KZ 777 ABC)'
});

onMounted(() => {
  orderStore.joinDispatcherRoom();
});

const handleCreateOrder = async () => {
  loading.value = true;
  try {
    const created = await orderStore.createOrder(newOrderForm);
    newOrderForm.patientName = '';
    newOrderForm.patientPhone = '';
    newOrderForm.address = '';
  } catch (err) {
    alert('Ошибка при создании вызова');
  } finally {
    loading.value = false;
  }
};

const getTrackUrl = (token: string) => {
  return `${window.location.origin}/track/${token}`;
};

const openWhatsApp = (order: Order) => {
  const link = getTrackUrl(order.token);
  const text = `Здравствуйте, ${order.patientName}! К вам выехала ${order.carNumber}. Вы можете отслеживать её движение на карте в реальном времени по ссылке: ${link}`;
  const encodedText = encodeURIComponent(text);
  const cleanPhone = order.patientPhone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
};

const copyTrackLink = (token: string) => {
  const link = getTrackUrl(token);
  navigator.clipboard.writeText(link);
  copiedToken.value = token;
  setTimeout(() => {
    copiedToken.value = null;
  }, 2000);
};

const toggleSim = (token: string, state: boolean) => {
  orderStore.toggleSimulation(token, state);
};

const getStatusBadgeClass = (status: OrderStatus) => {
  switch (status) {
    case 'ACCEPTED': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'EN_ROUTE': return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    case 'ARRIVED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'HOSPITAL_TRANSPORT': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    case 'COMPLETED': return 'bg-slate-700 text-slate-400 border-slate-600';
  }
};

const getStatusText = (status: OrderStatus) => {
  switch (status) {
    case 'ACCEPTED': return langStore.t('callStatusAccepted');
    case 'EN_ROUTE': return langStore.t('enRoute');
    case 'ARRIVED': return langStore.t('arrived');
    case 'HOSPITAL_TRANSPORT': return langStore.t('hospitalTransport');
    case 'COMPLETED': return langStore.t('callStatusCompleted');
  }
};
</script>
