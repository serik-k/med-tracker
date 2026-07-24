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

    <fieldset>
      <legend class="mb-2 block text-xs font-extrabold text-slate-700">Тип жилья</legend>
      <div class="grid grid-cols-2 rounded-2xl bg-slate-100 p-1" role="radiogroup" aria-label="Тип жилья">
        <button
          v-for="option in residenceOptions"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="form.residenceType === option.value"
          class="min-h-10 rounded-xl px-3 text-xs font-extrabold transition-all"
          :class="form.residenceType === option.value ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'"
          @click="setResidenceType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </fieldset>

    <!-- Quick Access Inputs Grid -->
    <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      <div v-if="form.residenceType === 'apartment'">
        <label class="block text-xs font-extrabold text-slate-700 mb-1 flex items-center justify-between">
          <span>Код домофона</span>
        </label>
        <input 
          v-model="form.intercom"
          @input="isDirty = true"
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
          @input="isDirty = true"
          type="text" 
          placeholder="Код ворот или номер охраны"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>

      <div v-if="form.residenceType === 'apartment'">
        <label class="block text-xs font-extrabold text-slate-700 mb-1">№ Подъезда</label>
        <input 
          v-model="form.entrance"
          @input="isDirty = true"
          type="text" 
          placeholder="Подъезд"
          class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm"
        />
      </div>

      <div v-if="form.residenceType === 'apartment'">
        <label class="block text-xs font-extrabold text-slate-700 mb-1">Этаж</label>
        <input 
          v-model="form.floor"
          @input="isDirty = true"
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
        @input="isDirty = true"
        rows="2"
        placeholder="Например: Ремонт дороги, заезд со стороны переулка..."
        class="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white rounded-2xl p-3 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-sm"
      ></textarea>
    </div>

    <!-- Photo Upload Simulation -->
    <div>
      <label class="block text-xs font-extrabold text-slate-700 mb-1">Фото арки или подъезда</label>
      <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="handlePhotoUpload" />
      <div 
        @click="fileInput?.click()"
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
          <button type="button" @click.stop="removePhoto" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700 transition-colors hover:bg-red-100" aria-label="Удалить фотографию" title="Удалить фотографию"><Trash2 class="h-4 w-4" /></button>
        </div>
      </div>
    </div>

    <button type="button" :disabled="!isDirty" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500" @click="saveAccessInfo"><CheckCircle2 class="h-4 w-4" />{{ saveMessage || (isDirty ? 'Сохранить и передать бригаде' : 'Данные сохранены') }}</button>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { KeyRound, Camera, CheckCircle2, Trash2 } from 'lucide-vue-next';
import type { AccessInfo } from '@/types';

const props = defineProps<{
  initialAccessInfo?: AccessInfo;
}>();

const emit = defineEmits<{
  (e: 'update', accessInfo: Partial<AccessInfo>): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDirty = ref(false);
const saveMessage = ref('');

const form = reactive<AccessInfo>({
  residenceType: 'apartment',
  intercom: '',
  gateCode: '',
  entrance: '',
  floor: '',
  note: '',
  photoUrl: ''
});

const residenceOptions = [
  { value: 'apartment' as const, label: 'Квартира' },
  { value: 'house' as const, label: 'Частный дом' }
];

const setResidenceType = (type: 'apartment' | 'house') => {
  form.residenceType = type;
  if (type === 'house') {
    form.intercom = '';
    form.entrance = '';
    form.floor = '';
  }
  isDirty.value = true;
};

watch(() => props.initialAccessInfo, (newVal) => {
  if (newVal) {
    Object.assign(form, newVal);
    form.residenceType ||= 'apartment';
  }
}, { immediate: true });

const emitUpdate = () => {
  emit('update', { ...form });
};

const handlePhotoUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    form.photoUrl = String(reader.result || '');
    isDirty.value = true;
  };
  reader.readAsDataURL(file);
};

const removePhoto = () => {
  form.photoUrl = '';
  isDirty.value = true;
};

const saveAccessInfo = () => {
  emitUpdate();
  isDirty.value = false;
  saveMessage.value = 'Передано бригаде';
  window.setTimeout(() => { saveMessage.value = ''; }, 2500);
};
</script>
