<template>
  <div class="min-h-screen bg-slate-100 text-slate-950">
    <header class="border-b border-slate-200 bg-white px-4 py-3 lg:h-16 lg:px-6 lg:py-0">
      <div class="mx-auto flex h-full max-w-[1800px] flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-lg bg-red-600 text-white"><Cross class="h-5 w-5" /></div><div><h1 class="text-sm font-extrabold">MedTracker · Диспетчерская</h1><p class="text-xs text-slate-500">Алматы · оперативная смена</p></div></div>
        <div class="flex items-center gap-2">
          <div class="hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold sm:flex" :class="orderStore.isConnected ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-red-200 bg-red-50 text-red-800'"><span class="h-2 w-2 rounded-full" :class="orderStore.isConnected ? 'bg-teal-600' : 'bg-red-500'"></span>{{ orderStore.isConnected ? 'Связь стабильна' : 'Нет связи' }}</div>
          <LanguageSwitcher /><button class="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-extrabold text-white hover:bg-red-700" @click="isCreateOpen = true"><Plus class="h-4 w-4" /> Новый вызов</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1800px] p-3 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:p-4">
      <section class="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div class="ops-stat"><span>Активные</span><strong>{{ activeOrders.length }}</strong></div>
        <div class="ops-stat"><span>Без бригады</span><strong :class="unassignedCount ? 'text-red-600' : ''">{{ unassignedCount }}</strong></div>
        <div class="ops-stat"><span>В пути</span><strong>{{ enRouteCount }}</strong></div>
        <div class="ops-stat"><span>Свободные бригады</span><strong class="text-teal-700">{{ availableCrews }}</strong></div>
      </section>

      <div class="grid min-h-[calc(100vh-156px)] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100dvh-10.75rem)] lg:min-h-0 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside class="flex min-h-[560px] flex-col overflow-hidden border-b border-slate-200 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div class="border-b border-slate-200 p-3"><div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-extrabold">Очередь вызовов</h2><span class="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold">{{ filteredOrders.length }}</span></div>
            <div class="flex gap-1 overflow-x-auto" role="tablist" aria-label="Фильтр вызовов"><button v-for="filter in filters" :key="filter.value" class="whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold" :class="activeFilter === filter.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="activeFilter = filter.value">{{ filter.label }}</button></div>
          </div>
          <div v-if="filteredOrders.length" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <button v-for="order in filteredOrders" :key="order.token" class="block w-full border-b border-slate-100 p-3 text-left" :class="selectedToken === order.token ? 'bg-teal-50 ring-2 ring-inset ring-teal-700' : 'hover:bg-slate-50'" @click="selectedToken = order.token">
              <div class="mb-2 flex items-start justify-between gap-3"><div class="flex min-w-0 items-center gap-2"><span class="rounded px-1.5 py-1 text-[10px] font-black" :class="priorityClass(order)">{{ priorityLabel(order) }}</span><span class="font-mono text-xs font-extrabold">{{ order.id }}</span><span class="truncate text-xs font-bold text-slate-500">{{ statusText(order.status) }}</span></div><span class="shrink-0 font-mono text-xs font-black" :class="waitMinutes(order) >= 10 ? 'text-red-600' : 'text-slate-700'">{{ elapsed(order) }}</span></div>
              <p class="truncate text-sm font-extrabold">{{ order.patientName }}</p><p class="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-600"><MapPin class="h-3.5 w-3.5 shrink-0" />{{ order.address }}</p>
              <div class="mt-2 flex items-center justify-between gap-2 text-xs"><span class="truncate font-semibold" :class="isUnassigned(order) ? 'text-red-700' : 'text-slate-600'">{{ isUnassigned(order) ? 'Бригада не назначена' : order.carNumber }}</span><ChevronRight class="h-4 w-4 shrink-0 text-slate-400" /></div>
            </button>
          </div>
          <div v-else class="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500"><div><CircleCheck class="mx-auto mb-2 h-8 w-8 text-teal-600" /><p class="font-bold">В этой очереди вызовов нет</p></div></div>
        </aside>

        <section class="relative min-h-[620px] bg-slate-200 lg:min-h-0">
          <LiveMap :orders="activeOrders" :focused-token="selectedToken" @select-order="selectedToken = $event" />
          <article v-if="selectedOrder" class="absolute bottom-3 left-3 right-3 z-[500] rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur lg:left-auto lg:w-[420px]">
            <div class="mb-3 flex items-start justify-between gap-3"><div class="min-w-0"><div class="mb-1 flex items-center gap-2"><span class="rounded px-1.5 py-1 text-[10px] font-black" :class="priorityClass(selectedOrder)">{{ priorityLabel(selectedOrder) }}</span><span class="font-mono text-xs font-bold">{{ selectedOrder.id }}</span></div><h3 class="truncate text-base font-extrabold">{{ selectedOrder.patientName }}</h3><p class="mt-1 text-xs text-slate-600">{{ selectedOrder.patientPhone }}</p></div><button class="rounded-md p-2 hover:bg-slate-100" aria-label="Закрыть" @click="selectedToken = null"><X class="h-4 w-4" /></button></div>
            <dl class="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 border-y border-slate-100 py-3 text-xs"><dt class="text-slate-500">Адрес</dt><dd class="font-bold">{{ selectedOrder.address }}</dd><dt class="text-slate-500">Статус</dt><dd class="font-bold">{{ statusText(selectedOrder.status) }}</dd><dt class="text-slate-500">Бригада</dt><dd class="font-bold" :class="isUnassigned(selectedOrder) ? 'text-red-700' : ''">{{ isUnassigned(selectedOrder) ? 'Не назначена' : selectedOrder.carNumber }}</dd><dt class="text-slate-500">Ожидание</dt><dd class="font-mono font-black">{{ elapsed(selectedOrder) }}</dd></dl>
            <div class="mt-3 grid grid-cols-2 gap-2"><button class="ops-action bg-slate-900 text-white" @click="openWhatsApp(selectedOrder)"><MessageSquare class="h-4 w-4" /> WhatsApp</button><button class="ops-action border border-slate-200" @click="copyTrackLink(selectedOrder.token)"><Copy class="h-4 w-4" />{{ copiedToken === selectedOrder.token ? 'Скопировано' : 'Ссылка пациенту' }}</button><button v-if="getCrewId(selectedOrder.carNumber)" class="ops-action col-span-2 border border-teal-200 bg-teal-50 text-teal-900" @click="copyDriverLink(selectedOrder)"><Copy class="h-4 w-4" />{{ copiedCrewId===getCrewId(selectedOrder.carNumber)?'Ссылка скопирована':`Ссылка экипажа №${getCrewId(selectedOrder.carNumber)}` }}</button><button class="ops-action col-span-2 border border-slate-200" @click="orderStore.toggleSimulation(selectedOrder.token, !selectedOrder.isSimulating)"><Play class="h-4 w-4" />{{ selectedOrder.isSimulating ? 'Остановить демо-движение' : 'Запустить демо-движение' }}</button></div>
          </article>
        </section>
      </div>
    </main>

    <div v-if="isCreateOpen" class="fixed inset-0 z-[1000] flex justify-end bg-slate-950/40" @click.self="isCreateOpen = false"><aside class="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-call-title">
      <div class="mb-6 flex items-center justify-between"><div><p class="mb-1 text-xs font-bold uppercase tracking-wider text-red-600">Регистрация</p><h2 id="new-call-title" class="text-xl font-black">Новый вызов</h2></div><button class="rounded-lg p-2 hover:bg-slate-100" aria-label="Закрыть" @click="isCreateOpen = false"><X class="h-5 w-5" /></button></div>
      <form class="space-y-4" @submit.prevent="handleCreateOrder"><CustomInput v-model="newOrderForm.patientName" label="Пациент или контактное лицо" placeholder="ФИО" :icon="User" required /><CustomInput v-model="newOrderForm.patientPhone" label="Телефон" placeholder="+7 (777) 000-00-00" :icon="Phone" type="tel" required /><CustomInput v-model="newOrderForm.address" label="Адрес вызова" placeholder="Улица, дом, квартира" :icon="MapPin" required /><CustomSelect v-model="newOrderForm.carNumber" label="Назначить бригаду" :options="carOptions" :icon="Ambulance" /><p v-if="createError" class="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700" role="alert">{{ createError }}</p><button type="submit" :disabled="loading" class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-extrabold text-white disabled:opacity-50"><Send class="h-4 w-4" />{{ loading ? 'Создаём вызов…' : 'Создать и передать бригаде' }}</button></form>
    </aside></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useOrderStore } from '@/stores/orderStore';
import LiveMap from '@/components/LiveMap.vue';
import CustomInput from '@/components/ui/CustomInput.vue';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import { Ambulance, ChevronRight, CircleCheck, Copy, Cross, MapPin, MessageSquare, Phone, Play, Plus, Send, User, X } from 'lucide-vue-next';
import type { Order, OrderStatus } from '@/types';

type Filter = 'active' | 'en_route' | 'completed';
const orderStore = useOrderStore(); const loading = ref(false); const createError = ref(''); const copiedToken = ref<string | null>(null); const copiedCrewId = ref<string | null>(null); const selectedToken = ref<string | null>(null); const isCreateOpen = ref(false); const activeFilter = ref<Filter>('active'); const now = ref(Date.now()); let clockId = 0;
const allOrders = computed(() => orderStore.activeOrders); const activeOrders = computed(() => allOrders.value.filter(o => !o.expired && o.status !== 'COMPLETED')); const selectedOrder = computed(() => allOrders.value.find(o => o.token === selectedToken.value) || null); const isUnassigned = (o: Order) => !o.carNumber?.trim();
const unassignedCount = computed(() => activeOrders.value.filter(isUnassigned).length); const enRouteCount = computed(() => activeOrders.value.filter(o => o.status === 'EN_ROUTE').length); const availableCrews = computed(() => Math.max(0, 3 - new Set(activeOrders.value.map(o => o.carNumber).filter(Boolean)).size));
const filters: { value: Filter; label: string }[] = [{ value: 'active', label: 'Активные' }, { value: 'en_route', label: 'В пути' }, { value: 'completed', label: 'Завершённые' }];
const filteredOrders = computed(() => allOrders.value.filter(o => activeFilter.value === 'active' ? !o.expired && o.status !== 'COMPLETED' : activeFilter.value === 'en_route' ? !o.expired && o.status === 'EN_ROUTE' : o.expired || o.status === 'COMPLETED').sort((a,b) => Number(isUnassigned(b))-Number(isUnassigned(a)) || +new Date(a.createdAt)-+new Date(b.createdAt)));
const carOptions: SelectOption[] = [{ value: '', label: 'Оставить без назначения' }, { value: 'Скорая №103 (02 KZ 777 ABC)', label: '№103 · реанимация · 02 KZ 777 ABC' }, { value: 'Скорая №101 (02 KZ 111 MED)', label: '№101 · линейная · 02 KZ 111 MED' }, { value: 'Скорая №105 (02 KZ 555 VIP)', label: '№105 · педиатрическая · 02 KZ 555 VIP' }];
const newOrderForm = reactive({ patientName: '', patientPhone: '', address: '', carNumber: '' });
onMounted(() => { orderStore.joinDispatcherRoom(); clockId = window.setInterval(() => now.value = Date.now(), 30000); }); onBeforeUnmount(() => clearInterval(clockId));
const waitMinutes = (o: Order) => Math.max(0, Math.floor((now.value - +new Date(o.createdAt)) / 60000) || 0); const elapsed = (o: Order) => { const m=waitMinutes(o); return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; };
const priorityLabel = (o: Order) => isUnassigned(o) && waitMinutes(o)>=10 ? 'P1' : isUnassigned(o) ? 'P2' : 'P3'; const priorityClass = (o: Order) => priorityLabel(o)==='P1' ? 'bg-red-100 text-red-800' : priorityLabel(o)==='P2' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700';
const statusText = (s: OrderStatus) => ({ ACCEPTED:'Принят', EN_ROUTE:'В пути', ARRIVED:'На месте', HOSPITAL_TRANSPORT:'В клинику', COMPLETED:'Завершён' })[s];
async function handleCreateOrder(){ loading.value=true; createError.value=''; try { const created=await orderStore.createOrder(newOrderForm); Object.assign(newOrderForm,{patientName:'',patientPhone:'',address:'',carNumber:''}); selectedToken.value=created.token; isCreateOpen.value=false; } catch { createError.value='Не удалось создать вызов. Проверьте соединение и повторите.'; } finally { loading.value=false; } }
const trackUrl=(t:string)=>`${window.location.origin}/track/${t}`; const openWhatsApp=(o:Order)=>window.open(`https://wa.me/${o.patientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`Здравствуйте, ${o.patientName}. Ваша бригада: ${o.carNumber || 'назначается'}. Отслеживание: ${trackUrl(o.token)}`)}`,'_blank'); async function copyTrackLink(t:string){ await navigator.clipboard.writeText(trackUrl(t)); copiedToken.value=t; setTimeout(()=>copiedToken.value=null,2000); }
const getCrewId=(carNumber:string)=>carNumber?.match(/№\s*(\d+)/)?.[1]||carNumber?.match(/\b(\d{3})\b/)?.[1]||'';
const copyText=async(text:string)=>{try{await navigator.clipboard.writeText(text);}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}};
const copyDriverLink=async(o:Order)=>{const crewId=getCrewId(o.carNumber);if(!crewId)return;await copyText(`${window.location.origin}/driver/${crewId}`);copiedCrewId.value=crewId;setTimeout(()=>copiedCrewId.value=null,2000);};
</script>

<style scoped>
.ops-stat { display:flex; min-height:4rem; align-items:center; justify-content:space-between; border:1px solid #e2e8f0; border-radius:.5rem; background:#fff; padding:.75rem 1rem; box-shadow:0 1px 2px rgb(15 23 42 / .05); }
.ops-stat span { color:#64748b; font-size:11px; font-weight:700; letter-spacing:.025em; text-transform:uppercase; }
.ops-stat strong { font-family:ui-monospace,monospace; font-size:1.5rem; font-weight:900; }
.ops-action { display:flex; min-height:2.5rem; align-items:center; justify-content:center; gap:.5rem; border-radius:.5rem; padding:.5rem .75rem; font-size:.75rem; font-weight:800; }
</style>
