<template>
  <section class="space-y-2.5" aria-label="Подготовка к приезду бригады">
    <div class="px-1 pb-1"><p class="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Что можно сделать сейчас</p><h2 class="mt-1 text-base font-black">Помогите бригаде быстрее добраться</h2></div>
    <article v-for="item in items" :key="item.key" class="overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors" :class="isOpen(item.key)?'border-teal-300':'border-slate-200'">
      <button type="button" class="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left" :aria-expanded="isOpen(item.key)" @click="toggle(item.key)">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="isOpen(item.key)?'bg-teal-700 text-white':'bg-teal-50 text-teal-800'"><component :is="item.icon" class="h-5 w-5" /></span>
        <span class="min-w-0 flex-1"><strong class="block text-sm font-black">{{ item.title }}</strong><span class="mt-0.5 block truncate text-[11px] font-semibold" :class="item.done?'text-teal-700':'text-slate-500'">{{ item.caption }}</span></span>
        <span v-if="item.done" class="hidden shrink-0 items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-black text-teal-800 min-[380px]:flex"><CircleCheck class="h-3.5 w-3.5" /> Готово</span>
        <ChevronDown class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200" :class="isOpen(item.key)?'rotate-180 text-teal-700':''" />
      </button>
      <div class="accordion-grid" :class="isOpen(item.key)?'is-open':''"><div class="min-h-0 overflow-hidden"><div class="border-t border-slate-100 bg-slate-50/70">
        <AccessForm v-if="item.key==='access'" :initial-access-info="order.accessInfo" @update="$emit('update-access',$event)" />
        <SymptomSelector v-else-if="item.key==='symptoms'" :initial-symptoms="order.symptoms" @update="$emit('update-symptoms',$event)" />
        <PreArrivalChecklist v-else @update:ready="readyDone=$event" />
      </div></div></div>
    </article>
  </section>
</template>
<script setup lang="ts">
import { computed,ref } from 'vue'; import { ChevronDown,CircleCheck,ClipboardCheck,KeyRound,Stethoscope } from 'lucide-vue-next'; import AccessForm from '@/components/AccessForm.vue'; import SymptomSelector from '@/components/SymptomSelector.vue'; import PreArrivalChecklist from '@/components/PreArrivalChecklist.vue'; import type { AccessInfo,Order } from '@/types';
const props=defineProps<{order:Order}>(); defineEmits<{(e:'update-access',value:Partial<AccessInfo>):void;(e:'update-symptoms',value:string[]):void}>(); const opened=ref(new Set<string>()); const readyDone=ref(false); const hasAccess=computed(()=>Object.entries(props.order.accessInfo||{}).some(([key,value])=>key!=='residenceType'&&Boolean(value))); const items=computed(()=>[{key:'access',title:'Как попасть к пациенту',caption:hasAccess.value?'Данные доступа переданы бригаде':'Выберите квартиру или частный дом и добавьте ориентиры',done:hasAccess.value,icon:KeyRound},{key:'symptoms',title:'Симптомы для врача',caption:props.order.symptoms?.length?`Передано симптомов: ${props.order.symptoms.length}`:'Сообщите важные симптомы заранее',done:Boolean(props.order.symptoms?.length),icon:Stethoscope},{key:'ready',title:'Подготовиться к приезду',caption:readyDone.value?'Все пункты выполнены':'Короткая памятка для пациента и близких',done:readyDone.value,icon:ClipboardCheck}]); const isOpen=(key:string)=>opened.value.has(key); function toggle(key:string){const next=new Set(opened.value);next.has(key)?next.delete(key):next.add(key);opened.value=next;}
</script>
<style scoped>.accordion-grid{display:grid;grid-template-rows:0fr;transition:grid-template-rows .25s ease}.accordion-grid.is-open{grid-template-rows:1fr}:deep(.medical-card){margin:0;border:0;border-radius:0;box-shadow:none;background:transparent}</style>
