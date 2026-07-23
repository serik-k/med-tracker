<template>
  <div class="medical-card p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-lg relative overflow-hidden group">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-sm">
          <ClipboardList class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-black text-slate-900 tracking-tight">Подготовка к приходу врача</h3>
          <p class="text-[11px] font-semibold text-slate-500">Памятка для пациента и близких</p>
        </div>
      </div>

      <!-- Completion Badge -->
      <div class="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-700 shadow-inner">
        <span class="text-amber-600 font-black">{{ completedCount }}</span> / {{ checklist.length }}
      </div>
    </div>

    <!-- Gamified Progress Bar -->
    <div class="space-y-1.5">
      <div class="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
        <span>Прогресс готовности:</span>
        <span :class="progressPercent === 100 ? 'text-teal-600 font-black' : 'text-amber-600'">{{ progressPercent }}%</span>
      </div>
      <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
        <div 
          class="h-full bg-gradient-to-r from-amber-500 to-teal-500 rounded-full transition-all duration-500 ease-out shadow-sm"
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
          'flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none',
          item.checked 
            ? 'bg-teal-50/70 border-teal-300 text-teal-900 shadow-sm scale-[0.99]' 
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
        ]"
      >
        <div class="relative mt-0.5 flex items-center justify-center shrink-0">
          <input 
            type="checkbox" 
            v-model="item.checked" 
            class="peer sr-only"
          />
          <div :class="[
            'w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 shadow-sm',
            item.checked ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-300'
          ]">
            <Check v-if="item.checked" class="w-3.5 h-3.5 stroke-[3]" />
          </div>
        </div>

        <div class="text-xs">
          <span :class="[item.checked ? 'line-through text-slate-400 font-semibold' : 'text-slate-900 font-extrabold']">
            {{ item.text }}
          </span>
          <p v-if="item.sub" :class="[item.checked ? 'text-slate-400' : 'text-slate-500', 'text-[11px] font-semibold mt-0.5']">
            {{ item.sub }}
          </p>
        </div>
      </label>
    </div>

    <!-- Caution Warning Box -->
    <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-900 shadow-sm">
      <div class="p-1.5 bg-rose-100 rounded-xl text-rose-600 shrink-0">
        <AlertTriangle class="w-4 h-4" />
      </div>
      <div class="space-y-0.5">
        <strong class="font-black text-rose-950 block">Важно до приезда врача:</strong>
        <p class="text-[11px] font-semibold text-rose-800 leading-relaxed">
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
