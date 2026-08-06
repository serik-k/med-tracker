<template>
  <main class="min-h-svh w-full bg-slate-100 text-slate-950">
    <div v-if="terminalState" class="mx-auto grid min-h-svh max-w-md place-items-center p-6 text-center"><div><div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-200 text-slate-700"><ShieldCheck class="h-8 w-8" /></div><h1 class="mt-5 text-xl font-black">{{ terminalTitle }}</h1><p class="mt-2 text-sm leading-relaxed text-slate-600">{{ terminalDescription }}</p><a :href="`tel:${contactPhone}`" class="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white"><Phone class="h-4 w-4" />{{ lang.t('callDispatcher') }}</a></div></div>
    <div v-else-if="orderStore.patientAccessState==='error'&&!order" class="mx-auto grid min-h-svh max-w-md place-items-center p-6 text-center" role="alert"><div><WifiOff class="mx-auto h-10 w-10 text-red-700" /><h1 class="mt-4 text-xl font-black">{{ lang.t('serviceOffline') }}</h1><p class="mt-2 text-sm text-slate-600">{{ orderStore.errorMsg }}</p><button type="button" class="mt-5 min-h-12 rounded-xl bg-slate-950 px-6 text-sm font-black text-white" @click="reloadOrder">{{ lang.t('retry') }}</button></div></div>
    <div v-else-if="!order" class="grid min-h-svh place-items-center text-center" role="status"><div><LoaderCircle class="mx-auto h-9 w-9 animate-spin text-teal-700" /><p class="mt-3 text-sm font-bold">{{ lang.t('loadingCrew') }}</p><p class="mt-1 text-xs text-slate-500">{{ lang.t('secureConnection') }}</p></div></div>

    <template v-else>
      <div class="fixed inset-0 z-0"><LiveMap :ambulance-loc="order.currentLoc" :destination-loc="mapDestination" :route-path="order.routePath" :show-fit-bounds-button="false" /></div>
      <header class="fixed inset-x-3 top-3 z-[600] mx-auto max-w-md">
        <div class="flex items-center justify-between rounded-2xl gap-1 border border-slate-200/90 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <div class="flex min-w-0 items-center gap-2.5 pl-1">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-800 text-white shadow-sm">
              <Ambulance class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h1 class="truncate text-xs font-black text-slate-900 dark:text-slate-100">{{ order.carNumber || lang.t('patientTrack') }}</h1>
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              </div>
              <p class="truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">{{ statusText }}</p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div class="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border-x border-t border-slate-200 bg-slate-100 shadow-2xl transition-[height] duration-300 ease-out" :class="isSheetExpanded?'h-[88svh]':'h-[36svh]'">
        <button type="button" class="sticky top-0 z-10 flex min-h-11 shrink-0 flex-col items-center justify-center border-b border-slate-200 bg-white/95 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600" :aria-expanded="isSheetExpanded" aria-controls="patient-details" @click="isSheetExpanded=!isSheetExpanded"><span class="h-1 w-10 rounded-full bg-slate-300"></span><span class="mt-1 text-[10px] font-bold text-slate-500">{{ isSheetExpanded?lang.t('collapse'):lang.t('showDetails') }}</span></button>
        <div id="patient-details" class="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div v-if="orderStore.connectionState==='reconnecting'||orderStore.connectionState==='offline'" class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="status"><WifiOff class="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{{ lang.t('connectionRestoring') }}</strong> {{ lang.t('lastDataRemain') }}</span></div>

          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-live="polite">
            <div class="flex items-center justify-between gap-2"><span class="rounded-md px-2.5 py-1 text-[11px] font-black" :class="statusClass">{{ statusText }}</span><span class="text-[10px] font-bold" :class="gpsIsStale?'text-amber-700':'text-slate-500'">{{ gpsFreshness }}</span></div>
            <div class="mt-5 text-center"><template v-if="showEta"><p class="text-4xl font-black text-teal-900">{{ etaText }}</p><p class="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{{ etaCaption }}</p><p v-if="order.distanceKm" class="mt-1 text-xs text-slate-400">{{ order.distanceKm.toFixed(1) }} {{ lang.t('km') }}</p></template><template v-else><component :is="heroIcon" class="mx-auto h-9 w-9 text-teal-800" /><h2 class="mt-2 text-xl font-black">{{ heroTitle }}</h2><p class="mt-1 text-sm text-slate-500">{{ heroDescription }}</p></template></div>
            <div class="mt-5 grid grid-cols-4 gap-1" :aria-label="lang.t('callStages')"><div v-for="(step,index) in steps" :key="step" class="text-center"><div class="h-1.5 rounded-full" :class="currentStep>=index?'bg-teal-700':'bg-slate-200'"></div><span class="mt-1.5 block text-[9px] font-bold" :class="currentStep>=index?'text-teal-800':'text-slate-400'">{{ step }}</span></div></div>
            <div v-if="gpsIsStale&&showEta" class="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900" role="status"><WifiOff class="h-4 w-4 shrink-0" /><span><strong>{{ lang.t('coordsStale') }}</strong> {{ lang.t('etaCanChange') }}</span></div>
          </section>

          <section v-if="isViewer" class="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900"><p class="font-black">{{ lang.t('viewerModeTitle') }}</p><p class="mt-1">{{ lang.t('viewerModeDesc') }}</p></section>
          <a :href="`tel:${contactPhone}`" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-xs font-black text-white"><Phone class="h-4 w-4" />{{ lang.t('callDispatcher') }}</a>
          <p v-if="actionNotice" class="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800" role="status">{{ actionNotice }}</p><p v-if="actionError" class="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700" role="alert">{{ actionError }}</p>
          <PatientActionAccordions v-if="!isViewer" :order="order" @update-access="onUpdateAccess" @update-symptoms="onUpdateSymptoms" />
        </div>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import PatientActionAccordions from '@/components/PatientActionAccordions.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import LiveMap from '@/components/LiveMap.vue';
import { Ambulance, CheckCircle2, ChevronDown, Globe, Hospital, LoaderCircle, MapPinCheck, Phone, ShieldCheck, WifiOff, X } from 'lucide-vue-next';
import type { AccessInfo, OrderStatus } from '@/types';
import { errorMessage } from '@/services/api';
import { clearPublicAccessSecret, consumePublicAccessSecret } from '@/utils/publicAccess';

const route=useRoute(), orderStore=useOrderStore(), lang=useLangStore();
const isSheetExpanded=ref(false), now=ref(Date.now());
const actionNotice=ref(''), actionError=ref('');
let timer=0, noticeTimer=0, symptomsTimer=0;
const patientSecret=ref(consumePublicAccessSecret('patient',route.params.token));
const order=computed(()=>orderStore.currentOrder);
const isViewer=computed(()=>order.value?.patientAccessScope==='viewer');
const contactPhone=computed(()=>order.value?.clinicContactPhone?.trim()||'103');
const terminalState=computed(()=>!patientSecret.value||orderStore.patientAccessState==='invalid'||orderStore.patientAccessState==='expired'||Boolean(order.value?.expired)||order.value?.status==='COMPLETED'||order.value?.status==='CANCELLED');
const terminalTitle=computed(()=>order.value?.status==='CANCELLED'?lang.t('trackingCancelled'):lang.t('expiredTitle'));
const terminalDescription=computed(()=>order.value?.status==='CANCELLED'?(order.value.cancelReason||lang.t('cancelledDesc')):orderStore.errorMsg||lang.t('expiredDesc'));
const mapDestination=computed(()=>order.value?.status==='HOSPITAL_TRANSPORT'?order.value.hospitalLocation:order.value?.destinationLoc);
const showEta=computed(()=>order.value?.status==='EN_ROUTE'||order.value?.status==='HOSPITAL_TRANSPORT');
const etaText=computed(()=>order.value?.etaMinutes?`≈ ${Math.max(1,Math.round(order.value.etaMinutes))} ${lang.t('mins')}`:lang.t('etaPending'));
const etaCaption=computed(()=>order.value?.status==='HOSPITAL_TRANSPORT'?`${lang.t('toHospital')} ${order.value.hospitalName||lang.t('hospitalGeneric')}`:lang.t('etaArrivalCaption'));
const age=computed(()=>{const source=order.value?.locationUpdatedAt;const timestamp=source?Date.parse(source):orderStore.lastLocationUpdate;return timestamp?Math.max(0,Math.floor((now.value-timestamp)/1000)):null;});
const gpsIsStale=computed(()=>age.value===null||age.value>75);
const gpsFreshness=computed(()=>age.value===null?lang.t('gpsPending'):age.value<10?lang.t('gpsNow'):age.value<60?lang.t('gpsSecondsAgo').replace('{count}',String(age.value)):lang.t('gpsMinutesAgo').replace('{count}',String(Math.floor(age.value/60))));
const steps=computed(()=>[lang.t('callStatusAccepted'),lang.t('enRoute'),lang.t('arrived'),lang.t('hospitalTransport')]);
const currentStep=computed(()=>order.value?Math.min(3,Math.max(0,['ACCEPTED','EN_ROUTE','ARRIVED','HOSPITAL_TRANSPORT','COMPLETED'].indexOf(order.value.status))):0);
const statusText=computed(()=>order.value?statusLabel(order.value.status):'');
const statusClass=computed(()=>order.value?.status==='EN_ROUTE'||order.value?.status==='ARRIVED'?'bg-teal-100 text-teal-800':order.value?.status==='HOSPITAL_TRANSPORT'?'bg-indigo-100 text-indigo-800':'bg-slate-100 text-slate-700');
const heroTitle=computed(()=>order.value?.status==='ARRIVED'?lang.t('callStatusArrived'):order.value?.status==='HOSPITAL_TRANSPORT'?lang.t('callStatusHospitalTransport'):lang.t('callStatusAccepted'));
const heroDescription=computed(()=>order.value?.status==='ARRIVED'?lang.t('openEntrance'):order.value?.status==='HOSPITAL_TRANSPORT'?lang.t('hospitalTracking'):lang.t('crewPreparing'));
const heroIcon=computed(()=>order.value?.status==='ARRIVED'?MapPinCheck:order.value?.status==='HOSPITAL_TRANSPORT'?Hospital:CheckCircle2);

watch(patientSecret,secret=>{if(secret){orderStore.reset();void orderStore.joinOrderRoom(secret);}else orderStore.disconnectSocket();},{immediate:true});
watch([()=>orderStore.patientAccessState,()=>order.value?.status,()=>order.value?.expired],([accessState,status,expired])=>{if(accessState==='invalid'||accessState==='expired'||expired||status==='COMPLETED'||status==='CANCELLED'){actionNotice.value='';actionError.value='';clearPublicAccessSecret('patient');patientSecret.value='';}});
timer=window.setInterval(()=>now.value=Date.now(),10000);
onBeforeUnmount(()=>{window.clearInterval(timer);window.clearTimeout(noticeTimer);window.clearTimeout(symptomsTimer);orderStore.reset();});

function statusLabel(status:OrderStatus){return status==='ACCEPTED'?lang.t('callStatusAccepted'):status==='EN_ROUTE'?lang.t('callStatusEnRoute'):status==='ARRIVED'?lang.t('callStatusArrived'):status==='HOSPITAL_TRANSPORT'?lang.t('callStatusHospitalTransport'):status==='COMPLETED'?lang.t('callStatusCompleted'):lang.t('trackingCancelled');}
function showNotice(message:string){actionNotice.value=message;actionError.value='';window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>actionNotice.value='',3500);}
async function onUpdateAccess(value:Partial<AccessInfo>){if(!order.value||isViewer.value)return;actionError.value='';try{await orderStore.updateAccessInfo(order.value.token,value);showNotice(lang.t('accessDelivered'));}catch(error){actionError.value=errorMessage(error,lang.t('accessFailed'));}}
function onUpdateSymptoms(value:string[]){window.clearTimeout(symptomsTimer);symptomsTimer=window.setTimeout(()=>void saveSymptoms(value),350);}
async function saveSymptoms(value:string[]){if(!order.value||isViewer.value)return;actionError.value='';try{await orderStore.updateSymptoms(order.value.token,value);showNotice(lang.t('symptomsDelivered'));}catch(error){actionError.value=errorMessage(error,lang.t('symptomsFailed'));}}
async function reloadOrder(){if(patientSecret.value)await orderStore.joinOrderRoom(patientSecret.value);}
</script>

<style scoped>@media(min-width:768px){header{max-width:42rem}main>div.fixed.inset-x-0.bottom-0{max-width:42rem}}</style>
