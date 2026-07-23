<template>
  <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl relative overflow-hidden group">
    <!-- Subtle Ambient Glow -->
    <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500"></div>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-md">
          <ClipboardList class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-extrabold text-slate-100 tracking-tight">Подготовка к приходу врача</h3>
          <p class="text-[11px] text-slate-400">Памятка для пациента и близких</p>
        </div>
      </div>

      <!-- Completion Badge -->
      <div class="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1.5 shadow-inner">
        <span class="text-amber-400 font-extrabold">{{ completedCount }}</span> / {{ checklist.length }}
      </div>
    </div>

    <!-- Gamified Progress Bar -->
    <div class="space-y-1.5">
      <div class="flex justify-between text-[10px] font-bold text-slate-400">
        <span>Прогресс готовности:</span>
        <span :class="progressPercent === 100 ? 'text-emerald-400 font-extrabold' : 'text-amber-400'">{{ progressPercent }}%</span>
      </div>
      <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div 
          class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-sm"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>

    <!-- Interactive Checklist Items -->
    <div class="space-y-2.5">
      <label 
        v-for="(item, idx) in checklist" 
        :key="idx"
        :class="[
          'flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300 cursor-pointer select-none',
          item.checked 
            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-md shadow-emerald-950/20 scale-[0.99]' 
            : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900/90'
        ]"
      >
        <div class="relative mt-0.5 flex items-center justify-center shrink-0">
          <input 
            type="checkbox" 
            v-model="item.checked" 
            class="peer sr-only"
          />
          <div :class="[
            'w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200',
            item.checked ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30' : 'bg-slate-950 border-slate-700'
          ]">
            <Check v-if="item.checked" class="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>

        <div class="text-xs">
          <span :class="[item.checked ? 'line-through text-slate-400 font-medium' : 'text-slate-100 font-bold']">
            {{ item.text }}
          </span>
          <p v-if="item.sub" :class="[item.checked ? 'text-slate-500' : 'text-slate-400', 'text-[11px] mt-0.5']">
            {{ item.sub }}
          </p>
        </div>
      </label>
    </div>

    <!-- Caution Warning Box -->
    <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs text-rose-200 shadow-lg shadow-rose-950/20">
      <div class="p-1.5 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
        <AlertTriangle class="w-4 h-4" />
      </div>
      <div class="space-y-0.5">
        <strong class="font-extrabold text-rose-100 block">Важно до приезда врача:</strong>
        <p class="text-[11px] text-rose-300/90 leading-relaxed">
          При болях в животе не принимайте сильные обезболивающие (чтобы не смазать симптомы), и не давайте воду/еду.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ClipboardList, AlertTriangle, Check } from 'lucide-vue-next';

const checklist = ref([
  { text: 'Приоткрыть входную дверь и проверить лифт', sub: 'Это сэкономит драгоценные секунды бригаде', checked: false },
  { text: 'Подготовить документы пациента', sub: 'Паспорт или полис/карту клиники', checked: false },
  { text: 'Убрать домашних животных в другую комнату', sub: 'Собаки и кошки могут реагировать на незнакомцев', checked: false },
  { text: 'Собрать принимаемые лекарства', sub: 'Покажите врачу, какие препараты принимались сегодня', checked: false }
]);

const completedCount = computed(() => checklist.value.filter(i => i.checked).length);
const progressPercent = computed(() => Math.round((completedCount.value / checklist.value.length) * 100));
</script>
