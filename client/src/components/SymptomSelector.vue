<template>
  <div class="medical-card p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-lg relative overflow-hidden group">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
          <Stethoscope class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-black text-slate-900 tracking-tight">{{ lang.t('symptomsTitle') }}</h3>
          <p class="text-[11px] font-semibold text-slate-500">{{ lang.t('symptomsSub') }}</p>
        </div>
      </div>
    </div>

    <!-- Symptom Pills Grid -->
    <div class="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 md:grid-cols-3">
      <button
        v-for="symptom in availableSymptoms"
        :key="symptom.value"
        @click="toggleSymptom(symptom.value)"
        :class="[
          'p-3 rounded-2xl border text-left transition-all duration-300 flex items-center gap-2.5 cursor-pointer text-xs font-bold select-none relative overflow-hidden',
          selectedSymptoms.includes(symptom.value)
            ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 shadow-md scale-[1.02] ring-2 ring-rose-500/20'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        ]"
      >
        <div :class="[
          'p-1.5 rounded-xl transition-colors',
          selectedSymptoms.includes(symptom.value) ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-400'
        ]">
          <component :is="symptom.icon" class="w-3.5 h-3.5" />
        </div>
        <span class="leading-snug">{{ symptom.label }}</span>
      </button>
    </div>

    <!-- Custom Symptom Note Input -->
    <div class="pt-1">
      <div class="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 shadow-sm transition-all focus-within:border-rose-500 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-rose-400">
        <PlusCircle class="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <input 
          v-model="customSymptomText"
          @keydown.enter.prevent="addCustomSymptom"
          type="text" 
          :placeholder="lang.t('customSymptomPlaceholder')"
          maxlength="160"
          class="min-w-0 w-full appearance-none bg-transparent !bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button 
          v-if="customSymptomText.trim()"
          type="button"
          @click="addCustomSymptom" 
          class="rounded-xl bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500"
        >
          {{ lang.t('addBtn') }}
        </button>
      </div>
      <p class="mt-1.5 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">{{ lang.t('customSymptomHelp') }}</p>
    </div>

    <div v-if="customSymptoms.length" class="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <p class="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ lang.t('addedByYou') }}</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="symptom in customSymptoms" :key="symptom" class="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-white py-1.5 pl-2.5 pr-1.5 text-xs font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
          <span class="break-anywhere">{{ symptom }}</span>
          <button type="button" class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-300" :aria-label="lang.t('removeSymptomLabel').replace('{name}',symptom)" @click="removeSymptom(symptom)"><X class="h-3.5 w-3.5" /></button>
        </span>
      </div>
    </div>

    <!-- Active Count Badge -->
    <div v-if="selectedSymptoms.length > 0" class="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 font-bold">
      <span class="flex items-center gap-1">
        {{ lang.t('selectedCount') }}: <strong class="text-rose-600 font-black px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-200">{{ selectedSymptoms.length }}</strong>
      </span>
      <span class="text-teal-700 flex items-center gap-1.5 font-extrabold text-[11px]">
        <CheckCircle2 class="w-4 h-4 text-teal-600" /> {{ lang.t('transmittingToDoctor') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 
  Stethoscope, 
  HeartPulse, 
  Wind, 
  Thermometer, 
  Activity, 
  Zap, 
  Pill, 
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  X
} from 'lucide-vue-next';
import { useLangStore } from '@/stores/langStore';

const props = defineProps<{
  initialSymptoms?: string[];
}>();

const emit = defineEmits<{
  (e: 'update', symptoms: string[]): void;
}>();

const selectedSymptoms = ref<string[]>(props.initialSymptoms || []);
const customSymptomText = ref('');
const lang = useLangStore();

watch(() => props.initialSymptoms, (newVal) => {
  if (newVal) selectedSymptoms.value = [...newVal];
}, { immediate: true });

const standardSymptoms = [
  { value: 'Боль в груди', key: 'symptomChest', icon: HeartPulse },
  { value: 'Одышка / Затрудненное дыхание', key: 'symptomBreath', icon: Wind },
  { value: 'Высокая температура', key: 'symptomFever', icon: Thermometer },
  { value: 'Давление / Головная боль', key: 'symptomPressure', icon: Activity },
  { value: 'Травма / Ушиб', key: 'symptomTrauma', icon: Zap },
  { value: 'Аллергия / Сыпь', key: 'symptomAllergy', icon: Pill },
  { value: 'Тошнота / Живот', key: 'symptomNausea', icon: AlertCircle }
];
const availableSymptoms = computed(() => standardSymptoms.map(symptom => ({ ...symptom, label: lang.t(symptom.key) })));

const standardSymptomNames = new Set(standardSymptoms.map(symptom => symptom.value));
const customSymptoms = computed(() => selectedSymptoms.value.filter(symptom => !standardSymptomNames.has(symptom)));

const toggleSymptom = (name: string) => {
  if (selectedSymptoms.value.includes(name)) {
    selectedSymptoms.value = selectedSymptoms.value.filter(s => s !== name);
  } else {
    selectedSymptoms.value.push(name);
  }
  emit('update', [...selectedSymptoms.value]);
};

const addCustomSymptom = () => {
  const text = customSymptomText.value.trim();
  if (text && !selectedSymptoms.value.includes(text)) {
    selectedSymptoms.value.push(text);
    customSymptomText.value = '';
    emit('update', [...selectedSymptoms.value]);
  }
};

const removeSymptom = (name: string) => {
  selectedSymptoms.value = selectedSymptoms.value.filter(symptom => symptom !== name);
  emit('update', [...selectedSymptoms.value]);
};
</script>
