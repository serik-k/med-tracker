<template>
  <div class="medical-card p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-lg relative overflow-hidden group">
    <div class="flex items-center gap-2.5">
      <div class="p-2.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100 shadow-sm">
        <KeyRound class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900 tracking-tight">Уточнение доступа для водителя скорой</h3>
        <p class="text-[11px] font-semibold text-slate-500">Поможет врачам сразу найти правильный подъезд</p>
      </div>
    </div>

    <!-- Quick Access Inputs Grid -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-extrabold text-slate-700 mb-1 flex items-center justify-between">
          <span>Код домофона</span>
        </label>
        <input 
          v-model="form.intercom"
          @input="emitUpdate"
          type="text" 
          placeholder="Например: 45К1234"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>

      <div>
        <label class="block text-xs font-extrabold text-slate-700 mb-1 flex items-center justify-between">
          <span>Шлагбаум / Ворота</span>
        </label>
        <input 
          v-model="form.gateCode"
          @input="emitUpdate"
          type="text" 
          placeholder="Код ворот или номер охраны"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>

      <div>
        <label class="block text-xs font-extrabold text-slate-700 mb-1">№ Подъезда</label>
        <input 
          v-model="form.entrance"
          @input="emitUpdate"
          type="text" 
          placeholder="Подъезд"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>

      <div>
        <label class="block text-xs font-extrabold text-slate-700 mb-1">Этаж</label>
        <input 
          v-model="form.floor"
          @input="emitUpdate"
          type="text" 
          placeholder="Этаж"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>
    </div>

    <!-- Extra Note for Driver -->
    <div>
      <label class="block text-xs font-extrabold text-slate-700 mb-1">Подсказка проезда во двор</label>
      <textarea
        v-model="form.note"
        @input="emitUpdate"
        rows="2"
        placeholder="Например: Ремонт дороги, заезд со стороны переулка..."
        class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl p-3 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-sm"
      ></textarea>
    </div>

    <!-- Photo Upload Simulation -->
    <div>
      <label class="block text-xs font-extrabold text-slate-700 mb-1">Фото арки или подъезда</label>
      <div 
        @click="simulatePhotoUpload"
        class="border-2 border-dashed border-slate-200 hover:border-teal-600 rounded-2xl p-3.5 text-center cursor-pointer transition-all bg-slate-50 hover:bg-teal-50/50 group"
      >
        <div v-if="!form.photoUrl" class="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 group-hover:text-teal-700">
          <Camera class="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
          <span>Нажмите, чтобы прикрепить фото арки/подъезда</span>
        </div>
        <div v-else class="flex items-center justify-between text-xs text-teal-700 font-extrabold">
          <div class="flex items-center gap-2">
            <img :src="form.photoUrl" class="w-10 h-10 object-cover rounded-xl border border-teal-200 shadow-sm" />
            <span class="flex items-center gap-1.5 text-teal-800">
              <CheckCircle2 class="w-4 h-4 text-teal-600" /> Фото прикреплено для водителя
            </span>
          </div>
          <button @click.stop="removePhoto" class="text-xs text-rose-600 hover:underline px-2.5 py-1 bg-rose-50 rounded-lg">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { KeyRound, Camera, CheckCircle2 } from 'lucide-vue-next';
import type { AccessInfo } from '@/types';

const props = defineProps<{
  initialAccessInfo?: AccessInfo;
}>();

const emit = defineEmits<{
  (e: 'update', accessInfo: Partial<AccessInfo>): void;
}>();

const form = reactive<AccessInfo>({
  intercom: '',
  gateCode: '',
  entrance: '',
  floor: '',
  note: '',
  photoUrl: ''
});

watch(() => props.initialAccessInfo, (newVal) => {
  if (newVal) {
    Object.assign(form, newVal);
  }
}, { immediate: true });

const emitUpdate = () => {
  emit('update', { ...form });
};

const simulatePhotoUpload = () => {
  form.photoUrl = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&q=80';
  emitUpdate();
};

const removePhoto = () => {
  form.photoUrl = '';
  emitUpdate();
};
</script>
