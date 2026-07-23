<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 space-y-6 font-sans relative">
    <!-- Top Header -->
    <header class="medical-card px-6 py-4 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-md">
      <div class="flex items-center gap-3.5">
        <div class="p-3 bg-teal-600 text-white rounded-2xl shadow-md glow-teal">
          <Activity class="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 class="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            {{ langStore.t('appTitle') }} — {{ langStore.t('dispatcherRoom') }}
            <span class="text-xs bg-teal-50 text-teal-800 font-extrabold px-3 py-1 rounded-full border border-teal-200">
              {{ langStore.t('clinicTag') }}
            </span>
          </h1>
          <p class="text-xs font-semibold text-slate-500">г. Алматы • Центр диспетчеризации и мониторинга автопарка</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Language Switcher UI -->
        <LanguageSwitcher />

        <router-link 
          to="/track/demo-track-123" 
          target="_blank"
          class="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-900/20 transition-all active:scale-95"
        >
          <Eye class="w-4 h-4" />
          {{ langStore.t('patientTrack') }}
        </router-link>
      </div>
    </header>

    <!-- Analytical Stats Bar -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
      <div class="medical-card p-4.5 rounded-3xl border border-slate-200/80 flex items-center justify-between shadow-sm medical-card-hover">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-500 font-extrabold block uppercase tracking-wider">{{ langStore.t('activeCalls') }}</span>
          <span class="text-3xl font-black text-slate-900 tracking-tight">{{ activeOrders.length }}</span>
        </div>
        <div class="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200 shadow-sm">
          <Clock class="w-6 h-6" />
        </div>
      </div>

      <div class="medical-card p-4.5 rounded-3xl border border-slate-200/80 flex items-center justify-between shadow-sm medical-card-hover">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-500 font-extrabold block uppercase tracking-wider">{{ langStore.t('avgArrival') }}</span>
          <span class="text-3xl font-black gradient-text-teal tracking-tight">11.4 {{ langStore.t('mins') }}</span>
        </div>
        <div class="p-3.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-200 shadow-sm">
          <Zap class="w-6 h-6" />
        </div>
      </div>

      <div class="medical-card p-4.5 rounded-3xl border border-slate-200/80 flex items-center justify-between shadow-sm medical-card-hover">
        <div class="space-y-0.5">
          <span class="text-xs text-slate-500 font-extrabold block uppercase tracking-wider">{{ langStore.t('onDutyCars') }}</span>
          <span class="text-3xl font-black text-teal-700 tracking-tight">3</span>
        </div>
        <div class="p-3.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-200 shadow-sm">
          <Truck class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- Main Grid: Form + Orders + Map -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
      
      <!-- Left Column: Create Order & List (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <!-- New Order Form -->
        <div class="medical-card p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4 relative z-30">
          <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div class="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <PlusCircle class="w-5 h-5" />
            </div>
            <h2 class="text-sm font-black text-slate-900 tracking-tight">{{ langStore.t('newCallTitle') }}</h2>
          </div>

          <form @submit.prevent="handleCreateOrder" class="space-y-3.5">
            <!-- Patient Name -->
            <CustomInput 
              v-model="newOrderForm.patientName"
              :label="langStore.t('patientNameLabel')"
              :placeholder="langStore.t('patientNamePlaceholder')"
              :icon="User"
              required
            />

            <!-- Phone -->
            <CustomInput 
              v-model="newOrderForm.patientPhone"
              :label="langStore.t('phoneLabel')"
              :placeholder="langStore.t('phonePlaceholder')"
              :icon="Phone"
              type="tel"
              required
            />

            <!-- Address in Almaty -->
            <CustomInput 
              v-model="newOrderForm.address"
              :label="langStore.t('addressLabel')"
              :placeholder="langStore.t('addressPlaceholder')"
              :icon="MapPin"
              required
            />

            <!-- Car Choice -->
            <CustomSelect 
              v-model="newOrderForm.carNumber"
              :label="langStore.t('selectCarLabel')"
              :options="carOptions"
              :icon="Truck"
            />

            <button 
              type="submit" 
              :disabled="loading"
              class="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              <Send class="w-4 h-4" />
              <span>{{ loading ? 'Поиск геокодирования...' : langStore.t('createCallBtn') }}</span>
            </button>
          </form>
        </div>

        <!-- Active Orders List -->
        <div class="medical-card p-5 rounded-3xl border border-slate-200/80 shadow-md space-y-4 relative z-10">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock class="w-4 h-4 text-amber-500" />
              {{ langStore.t('activeCalls') }} ({{ activeOrders.length }})
            </h2>
          </div>

          <div v-if="activeOrders.length === 0" class="text-center py-8 text-xs font-semibold text-slate-400">
            Нет активных вызовов в системе
          </div>

          <div v-else class="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
            <div 
              v-for="order in activeOrders" 
              :key="order.token"
              class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-teal-500/50 transition-all space-y-3 shadow-sm"
            >
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-black text-xs text-slate-900">{{ order.id }}</span>
                    <span 
                      :class="[
                        'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                        getStatusBadgeClass(order.status)
                      ]"
                    >
                      {{ getStatusText(order.status) }}
                    </span>
                  </div>
                  <div class="text-xs font-black text-slate-900 mt-1">{{ order.patientName }} ({{ order.patientPhone }})</div>
                  <div class="text-[11px] font-black text-teal-600 mt-0.5">{{ order.carNumber }}</div>
                  <div class="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin class="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {{ order.address }}
                  </div>
                </div>

                <!-- Simulation Toggle -->
                <button
                  @click="toggleSim(order.token, !order.isSimulating)"
                  :class="[
                    'px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 shadow-sm',
                    order.isSimulating 
                      ? 'bg-teal-50 text-teal-700 border-teal-300 animate-pulse'
                      : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                  ]"
                >
                  <Play class="w-3 h-3" />
                  <span>{{ order.isSimulating ? langStore.t('simActive') : langStore.t('simToggle') }}</span>
                </button>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                <button 
                  @click="openWhatsApp(order)"
                  class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>{{ langStore.t('openWhatsApp') }}</span>
                </button>

                <button 
                  @click="copyTrackLink(order.token)"
                  class="py-2 px-3.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200 shadow-sm active:scale-95"
                >
                  <Copy class="w-3.5 h-3.5 text-slate-500" />
                  <span>{{ copiedToken === order.token ? langStore.t('copied') : langStore.t('copyLink') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Fleet Map (7 cols) -->
      <div class="lg:col-span-7 flex flex-col space-y-4">
        <div class="medical-card p-5 rounded-3xl border border-slate-200/80 shadow-md flex-1 flex flex-col space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Compass class="w-5 h-5 text-teal-600" />
              <h2 class="text-sm font-black text-slate-900">{{ langStore.t('mapTitle') }}</h2>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-500 font-extrabold">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping"></span>
              {{ activeOrders.length }} {{ langStore.t('carsInAir') }} на карте
            </div>
          </div>

          <!-- Map Container -->
          <div class="w-full h-[600px] rounded-2xl overflow-hidden relative border border-slate-200">
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
    case 'ACCEPTED': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'EN_ROUTE': return 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse';
    case 'ARRIVED': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'HOSPITAL_TRANSPORT': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'COMPLETED': return 'bg-slate-100 text-slate-500 border-slate-200';
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
