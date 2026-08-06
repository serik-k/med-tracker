<template>
  <main class="mx-auto min-h-svh w-full max-w-md bg-slate-100 pb-28 text-slate-950">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-800 text-white shadow-sm">
            <Ambulance class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <h1 class="truncate text-sm font-black text-slate-900 dark:text-slate-100">{{ lang.t('driverTitle') }}</h1>
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-xs font-bold text-teal-800 dark:text-teal-400">{{ activeOrder?.carNumber || lang.t('driverRoom') }}</p>
              <span v-if="activeOrder" class="inline-flex items-center gap-1 text-[10px] font-bold" :class="gpsStateClass">
                <LocateFixed class="h-3 w-3" />{{ gpsStateText }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>

    <div class="space-y-3 p-3">
      <div v-if="orderStore.connectionState==='reconnecting'||orderStore.connectionState==='offline'" class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900" role="status"><WifiOff class="h-4 w-4 shrink-0" />{{ lang.t('driverReconnect') }}</div>

      <section v-if="!accessToken||orderStore.driverAccessState==='invalid'" class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center" role="alert"><Link2Off class="mx-auto h-10 w-10 text-amber-700" /><h2 class="mt-3 text-base font-black">{{ lang.t('invalidLinkTitle') }}</h2><p class="mt-1 text-sm text-amber-900">{{ lang.t('invalidDriverLinkDesc') }}</p></section>
      <section v-else-if="orderStore.driverAccessState==='loading'||orderStore.connectionState==='connecting'" class="rounded-2xl border border-slate-200 bg-white p-6 text-center" role="status"><LoaderCircle class="mx-auto h-8 w-8 animate-spin text-teal-700" /><p class="mt-3 text-sm font-bold">{{ lang.t('loadingAssignment') }}</p></section>
      <section v-else-if="orderStore.driverAccessState==='error'&&!activeOrder" class="rounded-2xl border border-red-200 bg-red-50 p-6 text-center" role="alert"><WifiOff class="mx-auto h-9 w-9 text-red-700" /><h2 class="mt-3 text-base font-black">{{ lang.t('loadCallFailed') }}</h2><p class="mt-1 text-sm text-red-800">{{ orderStore.errorMsg }}</p><button type="button" class="mt-4 min-h-11 rounded-xl bg-slate-950 px-5 text-xs font-black text-white" @click="reloadAccess">{{ lang.t('retry') }}</button></section>
      <section v-else-if="!activeOrder" class="rounded-2xl border border-slate-200 bg-white p-7 text-center" role="status"><span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Ambulance class="h-7 w-7" /></span><h2 class="mt-4 text-base font-black">{{ lang.t('crewFree') }}</h2><p class="mt-1 text-sm text-slate-500">{{ lang.t('newCallAuto') }}</p><div class="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>{{ lang.t('waitingAssignment') }}</div></section>

      <template v-else>
        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div class="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span class="font-mono text-xs font-black text-teal-800">{{ lang.t('callLabel') }} {{ activeOrder.id }}</span><span class="rounded-md px-2 py-1 text-[10px] font-black" :class="statusBadgeClass">{{ statusText }}</span></div><div class="p-4"><h2 class="text-xl font-black leading-tight">{{ activeOrder.address }}</h2><div class="mt-3 flex items-center justify-between gap-3"><div class="min-w-0"><p class="truncate text-sm font-extrabold">{{ activeOrder.patientName }}</p><p class="mt-0.5 text-xs text-slate-500">{{ activeOrder.patientPhone }}</p></div><a :href="`tel:${activeOrder.patientPhone}`" class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-teal-800" :aria-label="lang.t('callPatient')"><Phone class="h-5 w-5" /></a></div></div></section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="driver-status-title"><div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ lang.t('1clickStatus') }}</p><div class="mt-2 flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-teal-50 text-teal-800"><component :is="currentStatusIcon" class="h-5 w-5" /></span><div><h2 id="driver-status-title" class="text-base font-black">{{ statusText }}</h2><p class="text-xs text-slate-500">{{ lang.t('statusVisible') }}</p></div></div></div><span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold" :class="gpsStateClass">{{ gpsStateText }}</span></div>
          <div class="mt-4 grid grid-cols-4 gap-1" :aria-label="lang.t('callStages')"><div v-for="(status,index) in flow" :key="status" class="text-center"><div class="h-1.5 rounded-full" :class="currentFlowIndex>=index?'bg-teal-700':'bg-slate-200'"></div><span class="mt-1.5 block text-[9px] font-bold" :class="currentFlowIndex===index?'text-teal-900':'text-slate-400'">{{ shortLabel(status) }}</span></div></div>
          <button v-if="nextStatus" type="button" :disabled="statusPending" class="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 text-base font-black text-white shadow-sm disabled:opacity-60" @click="advanceStatus"><LoaderCircle v-if="statusPending" class="h-5 w-5 animate-spin" /><component :is="nextStatus.icon" v-else class="h-5 w-5" />{{ statusPending?lang.t('confirming'):nextStatus.label }}</button>
          <div v-else-if="activeOrder.status==='ARRIVED'" class="mt-4 grid gap-2 min-[360px]:grid-cols-2"><button type="button" :disabled="statusPending" class="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-teal-800 px-3 text-xs font-black text-white disabled:opacity-60" @click="openHospitalDialog"><Hospital class="h-4 w-4" /> {{ lang.t('hospitalTransport') }}</button><button type="button" :disabled="statusPending" class="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-800" @click="openCompleteDialog"><ShieldCheck class="h-4 w-4" /> {{ lang.t('completed') }}</button></div>
          <button v-else type="button" :disabled="statusPending" class="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-800" @click="openCompleteDialog"><ShieldCheck class="h-5 w-5" /> {{ lang.t('completed') }}</button>
          <p v-if="statusMessage" class="mt-3 rounded-lg bg-emerald-50 p-2.5 text-center text-xs font-bold text-emerald-800" role="status">{{ statusMessage }}</p><p v-if="statusError" class="mt-3 rounded-lg bg-red-50 p-2.5 text-center text-xs font-bold text-red-700" role="alert">{{ statusError }}</p>
          <div v-if="gpsState==='error'||gpsState==='offline'" class="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><p class="font-bold">{{ lang.t('gpsNotSending') }}</p><p class="mt-1">{{ lang.t('gpsHelp') }}</p><button type="button" class="mt-2 rounded-lg bg-white px-3 py-2 font-black" @click="restartGps">{{ lang.t('retryGps') }}</button></div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div class="mb-3 flex items-center gap-2"><Info class="h-4 w-4 text-teal-800" /><h2 class="text-sm font-black">{{ lang.t('patientDetailsTitle') }}</h2></div><div v-if="hasAccessInfo" class="grid grid-cols-2 gap-2 text-xs"><div v-if="activeOrder.accessInfo.residenceType" class="info-cell"><span>{{ lang.t('residenceTypeLabel') }}</span><strong>{{ activeOrder.accessInfo.residenceType==='house'?lang.t('houseOption'):lang.t('apartmentOption') }}</strong></div><div v-if="activeOrder.accessInfo.intercom" class="info-cell"><span>{{ lang.t('intercom') }}</span><strong>{{ activeOrder.accessInfo.intercom }}</strong></div><div v-if="activeOrder.accessInfo.gateCode" class="info-cell"><span>{{ lang.t('gateCode') }}</span><strong>{{ activeOrder.accessInfo.gateCode }}</strong></div><div v-if="activeOrder.accessInfo.entrance||activeOrder.accessInfo.floor" class="info-cell"><span>{{ lang.t('entranceFloor') }}</span><strong>{{ [activeOrder.accessInfo.entrance,activeOrder.accessInfo.floor].filter(Boolean).join(' / ') }}</strong></div></div><p v-else class="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">{{ lang.t('noAccessData') }}</p><p v-if="activeOrder.accessInfo.note" class="mt-2 break-words rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-950"><strong class="block text-[10px] uppercase text-amber-700">{{ lang.t('note') }}</strong>{{ activeOrder.accessInfo.note }}</p>
          <div v-if="activeOrder.accessInfo.photoUrl" class="mt-3"><span class="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">{{ lang.t('photoFromPatient') }}</span><a v-if="protectedPhotoUrl" :href="protectedPhotoUrl" target="_blank" rel="noopener" class="block"><img :src="protectedPhotoUrl" :alt="lang.t('photoPreviewAlt')" class="h-40 w-full rounded-xl border border-slate-200 object-cover" /></a><p v-else-if="photoLoading" class="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500" role="status">{{ lang.t('photoLoading') }}</p><p v-else-if="photoLoadError" class="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900" role="status">{{ lang.t('photoUnavailable') }}</p></div>
          <div v-if="activeOrder.symptoms?.length" class="mt-3 min-w-0"><p class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">{{ lang.t('symptoms') }}</p><div class="flex min-w-0 flex-wrap gap-1.5"><span v-for="symptom in activeOrder.symptoms" :key="symptom" class="max-w-full break-words rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-900 ring-1 ring-red-200">{{ symptom }}</span></div></div>
        </section>
      </template>
    </div>

    <div v-if="activeOrder" class="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur"><a :href="navigatorUrl" target="_blank" rel="noopener" class="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white"><Navigation class="h-5 w-5 text-teal-400" />{{ navigationLabel }}</a></div>

    <div v-if="isCompleteConfirmOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" @click.self="closeCompleteDialog"><div ref="completeDialog" tabindex="-1" class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="complete-title" aria-describedby="complete-desc"><div class="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-red-700"><ShieldCheck class="h-5 w-5" /></div><h2 id="complete-title" class="mt-4 text-lg font-black">{{ lang.t('completed') }}?</h2><p id="complete-desc" class="mt-2 text-sm leading-relaxed text-slate-600">{{ lang.t('completeDialogDesc') }}</p><div class="mt-5 grid grid-cols-2 gap-2"><button type="button" class="min-h-12 rounded-xl border border-slate-200 text-xs font-bold" @click="closeCompleteDialog">{{ lang.t('backAction') }}</button><button type="button" :disabled="statusPending" class="min-h-12 rounded-xl bg-red-600 text-xs font-black text-white disabled:opacity-60" @click="confirmComplete">{{ statusPending?lang.t('confirming'):lang.t('completed') }}</button></div></div></div>

    <div v-if="isHospitalSelectOpen" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" @click.self="closeHospitalDialog"><div ref="hospitalDialog" tabindex="-1" class="max-h-[90svh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="hospital-title" aria-describedby="hospital-desc"><div class="flex items-center gap-3"><div class="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-800"><Hospital class="h-5 w-5" /></div><div><h2 id="hospital-title" class="text-base font-black">{{ lang.t('hospitalTransport') }}</h2><p id="hospital-desc" class="text-xs text-slate-500">{{ lang.t('selectHospitalDesc') }}</p></div></div><div v-if="hospitalOptions.length" class="mt-4 space-y-2"><button v-for="hospital in hospitalOptions" :key="hospital.id||hospital.name" type="button" :disabled="statusPending" class="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left text-xs font-bold text-slate-800 transition hover:border-indigo-500 hover:bg-indigo-50 disabled:opacity-60" @click="confirmHospitalTransport(hospital)"><span><strong class="block">{{ hospital.name }}</strong><small v-if="hospital.address" class="mt-0.5 block font-medium text-slate-500">{{ hospital.address }}</small></span><ChevronRight class="h-4 w-4 shrink-0 text-slate-400" /></button></div><p v-else class="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">{{ lang.t('noHospitalsConfigured') }}</p><button type="button" class="mt-3 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600" @click="closeHospitalDialog">{{ lang.t('cancelAction') }}</button></div></div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { AlertTriangle, Ambulance, CheckCircle2, ChevronRight, CircleDot, Globe, Hospital, Info, Link2Off, LoaderCircle, LocateFixed, Navigation, Phone, Route, ShieldCheck, WifiOff, X } from 'lucide-vue-next';
import type { HospitalOption, Location, OrderStatus } from '@/types';
import { errorMessage, fetchAccessPhotoBlob } from '@/services/api';
import { clearPublicAccessSecret, consumePublicAccessSecret } from '@/utils/publicAccess';
import { focusFirstInModal, modalTrigger, restoreModalTrigger, trapModalFocus } from '@/utils/modalFocus';

const route=useRoute(), orderStore=useOrderStore(), lang=useLangStore();
const isCompleteConfirmOpen=ref(false), isHospitalSelectOpen=ref(false), completeDialog=ref<HTMLElement|null>(null), hospitalDialog=ref<HTMLElement|null>(null);
const statusMessage=ref(''), statusError=ref('');
let completeReturnFocus:HTMLElement|null=null, hospitalReturnFocus:HTMLElement|null=null;
const gpsState=ref<'waiting'|'active'|'sending'|'error'|'offline'>('waiting');
const lastGpsSentAt=ref<number|null>(null);
const protectedPhotoUrl=ref(''), photoLoading=ref(false), photoLoadError=ref('');
interface WakeLockSentinelLike { release:()=>Promise<void>; addEventListener?:(type:'release',listener:()=>void)=>void }
let gpsWatchId:number|null=null, gpsSending=false, messageTimer=0, wakeLock:WakeLockSentinelLike|null=null, wakeLockPending=false, photoController:AbortController|null=null;
const accessToken=ref(consumePublicAccessSecret('driver',route.params.accessToken));
const activeOrder=computed(()=>orderStore.currentOrder);
const statusPending=computed(()=>orderStore.isPending('status'));
const flow:OrderStatus[]=['ACCEPTED','EN_ROUTE','ARRIVED','HOSPITAL_TRANSPORT'];
const icons:Record<OrderStatus,unknown>={ACCEPTED:CircleDot,EN_ROUTE:Route,ARRIVED:CheckCircle2,HOSPITAL_TRANSPORT:Hospital,COMPLETED:ShieldCheck,CANCELLED:ShieldCheck};
const statusText=computed(()=>activeOrder.value?statusLabel(activeOrder.value.status):'');
const currentStatusIcon=computed(()=>activeOrder.value?icons[activeOrder.value.status]:CircleDot);
const currentFlowIndex=computed(()=>activeOrder.value?Math.max(0,flow.indexOf(activeOrder.value.status)):0);
const nextStatus=computed(()=>{if(!activeOrder.value)return null;const index=flow.indexOf(activeOrder.value.status);if(index<0||index>=2)return null;const status=flow[index+1];return{status,label:statusLabel(status),icon:icons[status]};});
const statusBadgeClass=computed(()=>activeOrder.value?.status==='EN_ROUTE'||activeOrder.value?.status==='ARRIVED'?'bg-teal-100 text-teal-800':activeOrder.value?.status==='HOSPITAL_TRANSPORT'?'bg-indigo-100 text-indigo-800':'bg-slate-100 text-slate-700');
const navigationTarget=computed(()=>activeOrder.value?.status==='HOSPITAL_TRANSPORT'?activeOrder.value.hospitalLocation:activeOrder.value?.destinationLoc);
const navigationQuery=computed(()=>activeOrder.value?.status==='HOSPITAL_TRANSPORT'?activeOrder.value?.hospitalName:activeOrder.value?.address);
const navigatorUrl=computed(()=>getNavigatorUrl(navigationTarget.value,navigationQuery.value));
const navigationLabel=computed(()=>activeOrder.value?.status==='HOSPITAL_TRANSPORT'?`${lang.t('navButton')} · ${activeOrder.value.hospitalName||lang.t('hospitalTransport')}`:lang.t('navButton'));
const hasAccessInfo=computed(()=>Boolean(activeOrder.value&&Object.entries(activeOrder.value.accessInfo||{}).some(([key,value])=>!['photoUrl','residenceType'].includes(key)&&Boolean(value))));
const gpsStateText=computed(()=>gpsState.value==='active'?lang.t('gpsSent'):gpsState.value==='sending'?lang.t('gpsSending'):gpsState.value==='error'?lang.t('gpsDenied'):gpsState.value==='offline'?lang.t('gpsOffline'):lang.t('gpsWaiting'));
const gpsStateClass=computed(()=>gpsState.value==='active'?'text-emerald-700':gpsState.value==='error'||gpsState.value==='offline'?'text-red-700':'text-slate-500');
const hospitalOptions=computed<HospitalOption[]>(()=>activeOrder.value?.hospitalOptions?.length?activeOrder.value.hospitalOptions:activeOrder.value?.clinicHospitals||[]);

watch(accessToken,token=>{stopGps();void releaseWakeLock();orderStore.reset();if(token)void orderStore.joinCrewRoom(token);},{immediate:true});
watch(()=>orderStore.driverAccessState,state=>{if(state==='invalid'){isCompleteConfirmOpen.value=false;isHospitalSelectOpen.value=false;completeReturnFocus=null;hospitalReturnFocus=null;statusMessage.value='';statusError.value='';stopGps();void releaseWakeLock();clearProtectedPhoto();clearPublicAccessSecret('driver');accessToken.value='';}});
watch([()=>activeOrder.value?.accessInfo?.photoUrl,accessToken],([photoUrl,token])=>void loadProtectedPhoto(photoUrl,token),{immediate:true});
watch(()=>activeOrder.value?.status,status=>{if(status==='EN_ROUTE'||status==='HOSPITAL_TRANSPORT'){startGpsTracking();void acquireWakeLock();}else{stopGps();void releaseWakeLock();}},{immediate:true});
onMounted(()=>{window.addEventListener('keydown',onKeydown);document.addEventListener('visibilitychange',onVisibilityChange);});
onBeforeUnmount(()=>{stopGps();void releaseWakeLock();clearProtectedPhoto();window.clearTimeout(messageTimer);window.removeEventListener('keydown',onKeydown);document.removeEventListener('visibilitychange',onVisibilityChange);orderStore.reset();});

function statusLabel(status:OrderStatus){return status==='ACCEPTED'?lang.t('accepted'):status==='EN_ROUTE'?lang.t('enRoute'):status==='ARRIVED'?lang.t('arrived'):status==='HOSPITAL_TRANSPORT'?lang.t('hospitalTransport'):status==='COMPLETED'?lang.t('completed'):lang.t('cancelledStatus');}
function shortLabel(status:OrderStatus){return status==='ACCEPTED'?lang.t('accepted'):status==='EN_ROUTE'?lang.t('enRoute'):status==='ARRIVED'?lang.t('arrived'):lang.t('hospitalTransport');}
function showMessage(message:string){statusMessage.value=message;window.clearTimeout(messageTimer);messageTimer=window.setTimeout(()=>statusMessage.value='',3500);}
function onKeydown(event:KeyboardEvent){if(event.key==='Tab'){if(isHospitalSelectOpen.value)trapModalFocus(event,hospitalDialog.value);else if(isCompleteConfirmOpen.value)trapModalFocus(event,completeDialog.value);return;}if(event.key!=='Escape')return;if(isHospitalSelectOpen.value)closeHospitalDialog();else if(isCompleteConfirmOpen.value)closeCompleteDialog();}
function isRouteActive(){return activeOrder.value?.status==='EN_ROUTE'||activeOrder.value?.status==='HOSPITAL_TRANSPORT';}
async function acquireWakeLock(){if(!isRouteActive()||document.visibilityState!=='visible'||wakeLock||wakeLockPending)return;const api=(navigator as Navigator&{wakeLock?:{request:(type:'screen')=>Promise<WakeLockSentinelLike>}}).wakeLock;if(!api)return;wakeLockPending=true;try{const lock=await api.request('screen');if(!isRouteActive()||document.visibilityState!=='visible'){await lock.release();return;}wakeLock=lock;lock.addEventListener?.('release',()=>{if(wakeLock===lock)wakeLock=null;});}catch{}finally{wakeLockPending=false;}}
async function releaseWakeLock(){const lock=wakeLock;wakeLock=null;if(!lock)return;try{await lock.release();}catch{}}
function onVisibilityChange(){if(document.visibilityState==='visible')void acquireWakeLock();else void releaseWakeLock();}
function clearProtectedPhoto(){photoController?.abort();photoController=null;if(protectedPhotoUrl.value)URL.revokeObjectURL(protectedPhotoUrl.value);protectedPhotoUrl.value='';photoLoading.value=false;photoLoadError.value='';}
async function loadProtectedPhoto(photoUrl?:string,token?:string){clearProtectedPhoto();if(!photoUrl||!token)return;const controller=new AbortController();photoController=controller;photoLoading.value=true;try{const blob=await fetchAccessPhotoBlob(photoUrl,token,controller.signal);if(controller.signal.aborted||photoController!==controller)return;protectedPhotoUrl.value=URL.createObjectURL(blob);}catch{if(!controller.signal.aborted&&photoController===controller)photoLoadError.value=lang.t('photoUnavailable');}finally{if(photoController===controller){photoController=null;photoLoading.value=false;}}}

function startGpsTracking(){if(gpsWatchId!==null)return;gpsState.value='waiting';if(!('geolocation'in navigator)){gpsState.value='error';return;}gpsWatchId=navigator.geolocation.watchPosition(position=>void transmitPosition(position),()=>{gpsState.value='error';},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});}
async function transmitPosition(position:GeolocationPosition){const order=activeOrder.value;if(!order||!['EN_ROUTE','HOSPITAL_TRANSPORT'].includes(order.status)||gpsSending)return;const now=Date.now();if(lastGpsSentAt.value&&now-lastGpsSentAt.value<5000)return;gpsSending=true;gpsState.value='sending';try{await orderStore.sendLocation(order.token,position.coords.latitude,position.coords.longitude);lastGpsSentAt.value=Date.now();gpsState.value='active';}catch{gpsState.value='offline';}finally{gpsSending=false;}}
function stopGps(){if(gpsWatchId!==null){navigator.geolocation.clearWatch(gpsWatchId);gpsWatchId=null;}gpsSending=false;gpsState.value='waiting';}
function restartGps(){stopGps();startGpsTracking();void acquireWakeLock();}
async function reloadAccess(){if(accessToken.value)await orderStore.joinCrewRoom(accessToken.value);}

async function advanceStatus(){if(!nextStatus.value||!activeOrder.value)return;statusError.value='';try{await orderStore.updateStatus(activeOrder.value.token,nextStatus.value.status);showMessage(`${nextStatus.value.label}: ${lang.t('statusConfirmed')}`);}catch(error){statusError.value=errorMessage(error,lang.t('loadCallFailed'));}}
function openHospitalDialog(event?:Event){hospitalReturnFocus=modalTrigger(event);isHospitalSelectOpen.value=true;void nextTick(()=>focusFirstInModal(hospitalDialog.value));}
function closeHospitalDialog(){if(!statusPending.value){isHospitalSelectOpen.value=false;const trigger=hospitalReturnFocus;hospitalReturnFocus=null;void nextTick(()=>restoreModalTrigger(trigger));}}
async function confirmHospitalTransport(hospital:HospitalOption){if(!activeOrder.value)return;statusError.value='';try{await orderStore.updateStatus(activeOrder.value.token,'HOSPITAL_TRANSPORT',hospital.name,hospital.location);closeHospitalDialog();showMessage(`${lang.t('hospitalTransport')}: ${hospital.name}`);}catch(error){statusError.value=errorMessage(error,lang.t('loadCallFailed'));}}
function openCompleteDialog(event?:Event){completeReturnFocus=modalTrigger(event);isCompleteConfirmOpen.value=true;void nextTick(()=>focusFirstInModal(completeDialog.value));}
function closeCompleteDialog(){if(!statusPending.value){isCompleteConfirmOpen.value=false;const trigger=completeReturnFocus;completeReturnFocus=null;void nextTick(()=>restoreModalTrigger(trigger));}}
async function confirmComplete(){if(!activeOrder.value)return;statusError.value='';try{await orderStore.updateStatus(activeOrder.value.token,'COMPLETED');closeCompleteDialog();stopGps();showMessage(lang.t('callStatusCompleted'));}catch(error){statusError.value=errorMessage(error,lang.t('loadCallFailed'));}}
function getNavigatorUrl(location?:Location|null,query=''){if(location)return `https://yandex.ru/maps/?rtext=~${location.lat},${location.lng}`;const text=query.trim();return text?`https://yandex.ru/maps/?text=${encodeURIComponent(text)}`:'https://yandex.ru/maps/';}
</script>

<style scoped>.info-cell{min-width:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:.75rem;background:#f8fafc;padding:.625rem}.info-cell span{display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b}.info-cell strong{display:block;min-width:0;margin-top:.125rem;overflow-wrap:anywhere;font-size:.875rem;font-weight:900;color:#0f172a}</style>
