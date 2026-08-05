<template>
  <section class="medical-card overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg">
    <div class="p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-700"><ClipboardCheck class="h-5 w-5" /></div>
          <div><h3 class="text-sm font-black text-slate-900">{{ lang.t('prepareCrewTitle') }}</h3><p class="mt-0.5 text-[11px] font-semibold text-slate-500">{{ lang.t('threeActions') }}</p></div>
        </div>
        <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black" :class="isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'">{{ completedCount }} / {{ checklist.length }}</span>
      </div>

      <div v-if="isReady" class="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <CircleCheckBig class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div><strong class="block text-sm font-extrabold">{{ lang.t('allReady') }}</strong><p class="mt-0.5 text-xs text-emerald-800">{{ lang.t('stayNearby') }}</p></div>
      </div>

      <div class="mt-4 space-y-2">
        <button v-for="item in checklist" :key="item.id" type="button" class="flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.99]" :class="isChecked(item.id) ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'" :aria-pressed="isChecked(item.id)" @click="toggleItem(item.id)">
          <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border shadow-sm" :class="isChecked(item.id) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'"><Check class="h-3.5 w-3.5 stroke-[3]" /></span>
          <span class="min-w-0"><strong class="block text-xs font-extrabold" :class="isChecked(item.id) ? 'text-emerald-950' : 'text-slate-900'">{{ item.title }}</strong><span class="mt-0.5 block text-[11px] leading-snug" :class="isChecked(item.id) ? 'text-emerald-800' : 'text-slate-500'">{{ item.description }}</span></span>
        </button>
      </div>
    </div>

    <div class="border-t border-amber-200 bg-amber-50 px-5 py-4">
      <div class="flex items-start gap-2.5"><AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><strong class="block text-xs font-extrabold text-amber-950">{{ lang.t('whileWaiting') }}</strong><p class="mt-0.5 text-[11px] leading-relaxed text-amber-900">{{ lang.t('whileWaitingDesc') }}</p></div></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { AlertTriangle, Check, CircleCheckBig, ClipboardCheck } from 'lucide-vue-next';
import { useLangStore } from '@/stores/langStore';

const emit = defineEmits<{ (e: 'update:ready', ready: boolean): void }>();

const lang = useLangStore();
const checkedItems = ref(new Set<string>());
const checklist = computed(() => [
  { id: 'access', title: lang.t('checklistAccessTitle'), description: lang.t('checklistAccessDesc') },
  { id: 'medical', title: lang.t('checklistMedicalTitle'), description: lang.t('checklistMedicalDesc') },
  { id: 'route', title: lang.t('checklistRouteTitle'), description: lang.t('checklistRouteDesc') }
]);

const completedCount = computed(() => checkedItems.value.size);
const isReady = computed(() => completedCount.value === checklist.value.length);
const isChecked = (id: string) => checkedItems.value.has(id);
const toggleItem = (id: string) => {
  const next = new Set(checkedItems.value);
  next.has(id) ? next.delete(id) : next.add(id);
  checkedItems.value = next;
  emit('update:ready', next.size === checklist.value.length);
};
</script>
