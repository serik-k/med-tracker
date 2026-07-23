<template>
  <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl relative overflow-hidden group">
    <!-- Ambient Glow -->
    <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/20 transition-all duration-500"></div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-2.5 bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-md">
          <Stethoscope class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-extrabold text-slate-100 tracking-tight">Уточните симптомы для врача</h3>
          <p class="text-[11px] text-slate-400">Врач увидит информацию в машине до приезда</p>
        </div>
      </div>
    </div>

    <!-- Symptom Pills Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      <button
        v-for="symptom in availableSymptoms"
        :key="symptom.name"
        @click="toggleSymptom(symptom.name)"
        :class="[
          'p-3 rounded-xl border text-left transition-all duration-300 flex items-center gap-2.5 cursor-pointer text-xs font-semibold select-none relative overflow-hidden',
          selectedSymptoms.includes(symptom.name)
            ? 'bg-gradient-to-r from-rose-500/25 to-rose-600/15 border-rose-500 text-rose-100 shadow-lg shadow-rose-950/50 scale-[1.02] ring-1 ring-rose-500/50'
            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900'
        ]"
      >
        <div :class="[
          'p-1.5 rounded-lg transition-colors',
          selectedSymptoms.includes(symptom.name) ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
        ]">
          <component :is="symptom.icon" class="w-3.5 h-3.5" />
        </div>
        <span class="leading-snug">{{ symptom.name }}</span>
      </button>
    </div>

    <!-- Custom Symptom Note Input -->
    <div class="pt-1">
      <div class="flex items-center gap-2 bg-slate-900/80 border border-slate-800 focus-within:border-rose-500/80 rounded-xl px-3 py-2 transition-all">
        <PlusCircle class="w-4 h-4 text-slate-500 shrink-0" />
        <input 
          v-model="customSymptomText"
          @keydown.enter.prevent="addCustomSymptom"
          type="text" 
          placeholder="Свой симптом (нажмите Enter, чтобы добавить)..."
          class="w-full bg-transparent text-xs text-slate-100 placeholder-slate-600 outline-none"
        />
        <button 
          v-if="customSymptomText.trim()"
          @click="addCustomSymptom" 
          class="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-0.5 bg-rose-500/20 rounded-md border border-rose-500/30 transition-all"
        >
          Добавить
        </button>
      </div>
    </div>

    <!-- Active Count Badge -->
    <div v-if="selectedSymptoms.length > 0" class="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
      <span class="flex items-center gap-1">
        Выбрано: <strong class="text-rose-400 font-extrabold px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">{{ selectedSymptoms.length }}</strong>
      </span>
      <span class="text-emerald-400 flex items-center gap-1.5 font-bold text-[11px] animate-pulse">
        <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Передается в машину врачу
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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
  PlusCircle
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
</script>
