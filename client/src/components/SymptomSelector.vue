<template>
  <div class="medical-card p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-lg relative overflow-hidden group">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-sm">
          <Stethoscope class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-black text-slate-900 tracking-tight">Уточните симптомы для врача</h3>
          <p class="text-[11px] font-semibold text-slate-500">Врач увидит информацию в машине до приезда</p>
        </div>
      </div>
    </div>

    <!-- Symptom Pills Grid -->
    <div class="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 md:grid-cols-3">
      <button
        v-for="symptom in availableSymptoms"
        :key="symptom.name"
        @click="toggleSymptom(symptom.name)"
        :class="[
          'p-3 rounded-2xl border text-left transition-all duration-300 flex items-center gap-2.5 cursor-pointer text-xs font-bold select-none relative overflow-hidden',
          selectedSymptoms.includes(symptom.name)
            ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-md scale-[1.02] ring-2 ring-rose-500/20'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-white'
        ]"
      >
        <div :class="[
          'p-1.5 rounded-xl transition-colors',
          selectedSymptoms.includes(symptom.name) ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500'
        ]">
          <component :is="symptom.icon" class="w-3.5 h-3.5" />
        </div>
        <span class="leading-snug">{{ symptom.name }}</span>
      </button>
    </div>

    <!-- Custom Symptom Note Input -->
    <div class="pt-1">
      <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 focus-within:border-rose-500 rounded-2xl px-3.5 py-2.5 transition-all shadow-sm">
        <PlusCircle class="w-4 h-4 text-slate-400 shrink-0" />
        <input 
          v-model="customSymptomText"
          @keydown.enter.prevent="addCustomSymptom"
          type="text" 
          placeholder="Свой симптом (нажмите Enter)..."
          class="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none"
        />
        <button 
          v-if="customSymptomText.trim()"
          type="button"
          @click="addCustomSymptom" 
          class="text-xs font-extrabold text-white px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition-all"
        >
          Добавить
        </button>
      </div>
      <p class="mt-1.5 px-1 text-[10px] font-medium text-slate-400">Опишите другой симптом или важную деталь для врача</p>
    </div>

    <div v-if="customSymptoms.length" class="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-[10px] font-black uppercase tracking-wider text-slate-500">Добавлено вами</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="symptom in customSymptoms" :key="symptom" class="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-white py-1.5 pl-2.5 pr-1.5 text-xs font-bold text-slate-800 shadow-sm ring-1 ring-slate-200">
          <span class="break-words">{{ symptom }}</span>
          <button type="button" class="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" :aria-label="`Удалить симптом: ${symptom}`" @click="removeSymptom(symptom)"><X class="h-3.5 w-3.5" /></button>
        </span>
      </div>
    </div>

    <!-- Active Count Badge -->
    <div v-if="selectedSymptoms.length > 0" class="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 font-bold">
      <span class="flex items-center gap-1">
        Выбрано: <strong class="text-rose-600 font-black px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-200">{{ selectedSymptoms.length }}</strong>
      </span>
      <span class="text-teal-700 flex items-center gap-1.5 font-extrabold text-[11px]">
        <CheckCircle2 class="w-4 h-4 text-teal-600" /> Передается в машину врачу
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

const props = defineProps<{
  initialSymptoms?: string[];
}>();

const emit = defineEmits<{
  (e: 'update', symptoms: string[]): void;
}>();

const selectedSymptoms = ref<string[]>(props.initialSymptoms || []);
const customSymptomText = ref('');

watch(() => props.initialSymptoms, (newVal) => {
  if (newVal) selectedSymptoms.value = [...newVal];
}, { immediate: true });

const availableSymptoms = [
  { name: 'Боль в груди', icon: HeartPulse },
  { name: 'Одышка / Затрудненное дыхание', icon: Wind },
  { name: 'Высокая температура', icon: Thermometer },
  { name: 'Давление / Головная боль', icon: Activity },
  { name: 'Травма / Ушиб', icon: Zap },
  { name: 'Аллергия / Сыпь', icon: Pill },
  { name: 'Тошнота / Живот', icon: AlertCircle }
];

const standardSymptomNames = new Set(availableSymptoms.map(symptom => symptom.name));
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
