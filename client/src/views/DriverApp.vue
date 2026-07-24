<template>
  <main class="mx-auto min-h-svh w-full max-w-md bg-slate-100 pb-28 text-slate-950">
    <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <div class="flex min-w-0 items-center gap-3"><div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-800 text-white"><Ambulance class="h-5 w-5" /></div><div class="min-w-0"><h1 class="text-sm font-black">Экипаж</h1><p class="truncate text-xs font-bold text-teal-800">{{ activeOrder?.carNumber || 'Вызов не назначен' }}</p></div></div>
      <div class="flex items-center gap-2"><span v-if="activeOrder" class="hidden items-center gap-1.5 text-[10px] font-bold min-[390px]:flex" :class="gpsStateClass"><LocateFixed class="h-3.5 w-3.5" />{{ gpsStateText }}</span><ThemeToggle /><LanguageSwitcher /></div>
    </header>

    <div class="space-y-3 p-3">
      <section v-if="!crewId && !selectedToken" class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><Link2Off class="mx-auto h-9 w-9 text-amber-700" /><h2 class="mt-3 text-base font-black">Бригада не определена</h2><p class="mt-1 text-sm text-amber-900">Откройте постоянную ссылку вашей бригады, например /driver/103.</p></section>
      <section v-else-if="!activeOrder && !orderStore.isConnected" class="rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status"><LoaderCircle class="mx-auto h-8 w-8 animate-spin text-teal-700" /><p class="mt-3 text-sm font-bold">Подключаемся к диспетчерской…</p></section>
      <section v-else-if="!activeOrder" class="rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status"><Ambulance class="mx-auto h-9 w-9 text-teal-700" /><h2 class="mt-3 text-base font-black">Активных вызовов нет</h2><p class="mt-1 text-sm text-slate-500">Экран обновится автоматически, когда диспетчер назначит вызов бригаде №{{ crewId }}.</p></section>

      <template v-else>
        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span class="font-mono text-xs font-black text-teal-800">ВЫЗОВ {{ activeOrder.id }}</span><span class="rounded-md px-2 py-1 text-[10px] font-black" :class="statusBadgeClass">{{ statusText }}</span></div>
          <div class="p-4"><h2 class="text-xl font-black leading-tight">{{ activeOrder.address }}</h2><div class="mt-3 flex items-center justify-between gap-3"><div class="min-w-0"><p class="truncate text-sm font-extrabold">{{ activeOrder.patientName }}</p><p class="mt-0.5 text-xs text-slate-500">{{ activeOrder.patientPhone }}</p></div><a :href="`tel:${activeOrder.patientPhone}`" class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-teal-800" aria-label="Позвонить пациенту"><Phone class="h-5 w-5" /></a></div></div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Текущий статус</p>
          <div class="mt-2 flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-teal-50 text-teal-800"><component :is="currentStatusIcon" class="h-5 w-5" /></span><div><h2 class="text-base font-black">{{ statusText }}</h2><p class="text-xs text-slate-500">Статус видят диспетчер и пациент</p></div></div>
          <div class="mt-4 grid grid-cols-4 gap-1" aria-label="Этапы вызова"><div v-for="(status,index) in flow" :key="status" class="text-center"><div class="h-1.5 rounded-full" :class="currentFlowIndex>=index?'bg-teal-700':'bg-slate-200'"></div><span class="mt-1.5 block text-[9px] font-bold" :class="currentFlowIndex===index?'text-teal-900':'text-slate-400'">{{ shortLabels[status] }}</span></div></div>
          <button v-if="nextStatus" class="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-base font-black text-white active:scale-[0.99]" @click="advanceStatus"><component :is="nextStatus.icon" class="h-5 w-5" />{{ nextStatus.label }}</button>
          <div v-else-if="activeOrder.status==='ARRIVED'" class="mt-4 grid gap-2 min-[360px]:grid-cols-2"><button class="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-teal-800 px-3 text-xs font-black text-white" @click="startTransport"><Hospital class="h-4 w-4" /> Везём в клинику</button><button class="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-800" @click="isCompleteConfirmOpen=true"><ShieldCheck class="h-4 w-4" /> Помощь завершена</button></div>
          <button v-else class="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-800" @click="isCompleteConfirmOpen = true"><ShieldCheck class="h-5 w-5" /> Завершить вызов</button>
          <p v-if="statusMessage" class="mt-3 rounded-lg bg-teal-50 p-2.5 text-center text-xs font-bold text-teal-800" role="status">{{ statusMessage }}</p>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center gap-2"><Info class="h-4 w-4 text-teal-800" /><h2 class="text-sm font-black">Важно от пациента</h2></div>
          <div v-if="hasAccessInfo" class="grid grid-cols-2 gap-2 text-xs"><div v-if="activeOrder.accessInfo.residenceType" class="info-cell"><span>Тип жилья</span><strong>{{ activeOrder.accessInfo.residenceType === 'house' ? 'Частный дом' : 'Квартира' }}</strong></div><div v-if="activeOrder.accessInfo.intercom" class="info-cell"><span>Домофон</span><strong>{{ activeOrder.accessInfo.intercom }}</strong></div><div v-if="activeOrder.accessInfo.gateCode" class="info-cell"><span>Ворота</span><strong>{{ activeOrder.accessInfo.gateCode }}</strong></div><div v-if="activeOrder.accessInfo.entrance" class="info-cell"><span>Подъезд</span><strong>{{ activeOrder.accessInfo.entrance }}</strong></div><div v-if="activeOrder.accessInfo.floor" class="info-cell"><span>Этаж</span><strong>{{ activeOrder.accessInfo.floor }}</strong></div></div>
          <p v-else class="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Пациент пока не передал данные для доступа.</p>
          <p v-if="activeOrder.accessInfo.note" class="break-anywhere mt-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-950"><strong class="block text-[10px] uppercase text-amber-700">Комментарий</strong>{{ activeOrder.accessInfo.note }}</p>
          <div v-if="activeOrder.symptoms?.length" class="min-w-0 mt-3"><p class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Симптомы</p><div class="flex min-w-0 flex-wrap gap-1.5"><span v-for="symptom in activeOrder.symptoms" :key="symptom" class="break-anywhere max-w-full rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-900 ring-1 ring-red-200">{{ symptom }}</span></div></div>
        </section>
      </template>
    </div>

    <div v-if="activeOrder" class="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white/95 p-3 backdrop-blur"><a :href="navigatorUrl" target="_blank" class="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white"><Navigation class="h-5 w-5 text-teal-400" /> Маршрут к пациенту</a></div>

    <div v-if="isCompleteConfirmOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" @click.self="isCompleteConfirmOpen = false"><div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="complete-title"><div class="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-red-700"><ShieldCheck class="h-5 w-5" /></div><h2 id="complete-title" class="mt-4 text-lg font-black">Завершить вызов?</h2><p class="mt-2 text-sm leading-relaxed text-slate-600">Вызов будет закрыт, а передача геопозиции пациенту прекратится. Отменить это действие нельзя.</p><div class="mt-5 grid grid-cols-2 gap-2"><button class="min-h-12 rounded-xl border border-slate-200 text-xs font-bold" @click="isCompleteConfirmOpen = false">Вернуться</button><button class="min-h-12 rounded-xl bg-red-600 text-xs font-black text-white" @click="confirmComplete">Завершить вызов</button></div></div></div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { Ambulance, Building2, CheckCircle2, CircleDot, Hospital, Info, Link2Off, LoaderCircle, LocateFixed, Navigation, Phone, Route, ShieldCheck } from 'lucide-vue-next';
import type { Location, OrderStatus } from '@/types';

const route=useRoute(); const orderStore=useOrderStore(); const crewId=String(route.params.crewId||'').replace(/\D/g,''); const selectedToken=ref<string>((route.query.token as string)||''); const isCompleteConfirmOpen=ref(false); const statusMessage=ref(''); const gpsState=ref<'waiting'|'active'|'error'>('waiting'); let gpsWatchId:number|null=null;
const activeOrder=computed(()=>crewId?orderStore.currentOrder:(orderStore.currentOrder?.token===selectedToken.value?orderStore.currentOrder:null));
const flow:OrderStatus[]=['ACCEPTED','EN_ROUTE','ARRIVED','HOSPITAL_TRANSPORT'];
const shortLabels:Partial<Record<OrderStatus,string>>={ACCEPTED:'Принят',EN_ROUTE:'В пути',ARRIVED:'Прибыл',HOSPITAL_TRANSPORT:'В клинику'};
const labels:Record<OrderStatus,string>={ACCEPTED:'Вызов принят',EN_ROUTE:'В пути к пациенту',ARRIVED:'На месте',HOSPITAL_TRANSPORT:'Транспортировка в клинику',COMPLETED:'Вызов завершён'};
const icons:Record<OrderStatus,any>={ACCEPTED:CircleDot,EN_ROUTE:Route,ARRIVED:CheckCircle2,HOSPITAL_TRANSPORT:Hospital,COMPLETED:ShieldCheck};
const statusText=computed(()=>activeOrder.value?labels[activeOrder.value.status]:''); const currentStatusIcon=computed(()=>activeOrder.value?icons[activeOrder.value.status]:CircleDot);
const currentFlowIndex=computed(()=>activeOrder.value?Math.max(0,flow.indexOf(activeOrder.value.status)):0);
const nextStatus=computed(()=>{if(!activeOrder.value)return null; const index=flow.indexOf(activeOrder.value.status); if(index<0||index>=2)return null; const status=flow[index+1]; return {status,label:({EN_ROUTE:'Начать движение',ARRIVED:'Я прибыл на место'} as Partial<Record<OrderStatus,string>>)[status]!,icon:icons[status]};});
const statusBadgeClass=computed(()=>activeOrder.value?.status==='EN_ROUTE'||activeOrder.value?.status==='ARRIVED'?'bg-teal-100 text-teal-800':'bg-slate-100 text-slate-700');
const navigatorUrl=computed(()=>getNavigatorUrl(activeOrder.value?.destinationLoc)); const hasAccessInfo=computed(()=>!!activeOrder.value&&Object.entries(activeOrder.value.accessInfo).some(([key,value])=>!['photoUrl','residenceType'].includes(key)&&!!value));
const gpsStateText=computed(()=>gpsState.value==='active'?'GPS активен':gpsState.value==='error'?'Ошибка GPS':'GPS…'); const gpsStateClass=computed(()=>gpsState.value==='active'?'text-teal-700':gpsState.value==='error'?'text-red-700':'text-slate-500');
onMounted(()=>{if(crewId)orderStore.joinCrewRoom(crewId);else if(selectedToken.value)orderStore.joinOrderRoom(selectedToken.value);}); onBeforeUnmount(stopGps);
watch(activeOrder,(order)=>{if(order)startGpsTracking();else stopGps();},{immediate:true});
function startGpsTracking(){if(gpsWatchId!==null)return;gpsState.value='waiting';if(!('geolocation' in navigator)){gpsState.value='error';return;} gpsWatchId=navigator.geolocation.watchPosition(pos=>{gpsState.value='active';if(activeOrder.value?.status==='EN_ROUTE')orderStore.sendLocation(activeOrder.value.token,pos.coords.latitude,pos.coords.longitude);},()=>gpsState.value='error',{enableHighAccuracy:true});}
function stopGps(){if(gpsWatchId!==null){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null;}gpsState.value='waiting';}
function advanceStatus(){if(!nextStatus.value||!activeOrder.value)return;orderStore.updateStatus(activeOrder.value.token,nextStatus.value.status);statusMessage.value=`Статус обновлён: ${nextStatus.value.label}`;setTimeout(()=>statusMessage.value='',3000);}
function startTransport(){if(!activeOrder.value)return;orderStore.updateStatus(activeOrder.value.token,'HOSPITAL_TRANSPORT');statusMessage.value='Статус обновлён: транспортировка в клинику';setTimeout(()=>statusMessage.value='',3000);}
function confirmComplete(){if(!activeOrder.value)return;orderStore.updateStatus(activeOrder.value.token,'COMPLETED');isCompleteConfirmOpen.value=false;statusMessage.value='Вызов завершён';stopGps();}
function getNavigatorUrl(loc?:Location){return loc?`https://yandex.ru/maps/?rtext=~${loc.lat},${loc.lng}`:'https://yandex.ru/maps/';}
</script>

<style scoped>.info-cell{min-width:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:.75rem;background:#f8fafc;padding:.625rem}.info-cell span{display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b}.info-cell strong{display:block;min-width:0;margin-top:.125rem;overflow-wrap:anywhere;word-break:break-word;font-size:.875rem;font-weight:900;color:#0f172a}</style>
