<template>
  <div class="medical-card p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-lg relative overflow-hidden group">
    <div class="flex items-center gap-2.5">
      <div class="p-2.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100 shadow-sm">
        <KeyRound class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900 tracking-tight">{{ lang.t('accessFormTitle') }}</h3>
        <p class="text-[11px] font-semibold text-slate-500">{{ lang.t('accessFormSub') }}</p>
      </div>
    </div>

    <fieldset>
      <legend class="mb-2 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{{ lang.t('residenceTypeLabel') }}</legend>
      <div class="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" :aria-label="lang.t('residenceTypeLabel')">
        <button
          v-for="option in residenceOptions"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="form.residenceType === option.value"
          class="min-h-11 rounded-xl px-3 text-xs font-extrabold transition-all"
          :class="form.residenceType === option.value ? 'bg-white text-teal-800 shadow-sm dark:bg-slate-900 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'"
          @click="setResidenceType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </fieldset>

    <!-- Quick Access Inputs Grid -->
    <div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
      <div v-if="form.residenceType === 'apartment'">
        <label :for="`${formId}-intercom`" class="mb-1 flex items-center justify-between block text-xs font-extrabold text-slate-700 dark:text-slate-200">
          <span>{{ lang.t('intercomLabel') }}</span>
        </label>
        <input 
          :id="`${formId}-intercom`"
          v-model="form.intercom"
          @input="isDirty = true"
          type="text" 
          :placeholder="lang.t('intercomPlaceholder')"
          class="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-sm focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-950"
        />
      </div>

      <div>
        <label :for="`${formId}-gate`" class="mb-1 flex items-center justify-between block text-xs font-extrabold text-slate-700 dark:text-slate-200">
          <span>{{ lang.t('gateLabel') }}</span>
        </label>
        <input 
          :id="`${formId}-gate`"
          v-model="form.gateCode"
          @input="isDirty = true"
          type="text" 
          :placeholder="lang.t('gatePlaceholder')"
          class="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-sm focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-950"
        />
      </div>

      <div v-if="form.residenceType === 'apartment'">
        <label :for="`${formId}-entrance`" class="mb-1 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{{ lang.t('entranceLabel') }}</label>
        <input 
          :id="`${formId}-entrance`"
          v-model="form.entrance"
          @input="isDirty = true"
          type="text" 
          :placeholder="lang.t('entrancePlaceholder')"
          class="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-sm focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-950"
        />
      </div>

      <div v-if="form.residenceType === 'apartment'">
        <label :for="`${formId}-floor`" class="mb-1 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{{ lang.t('floorLabel') }}</label>
        <input 
          :id="`${formId}-floor`"
          v-model="form.floor"
          @input="isDirty = true"
          type="text" 
          :placeholder="lang.t('floorPlaceholder')"
          class="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-sm focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-950"
        />
      </div>
    </div>

    <!-- Extra Note for Driver -->
    <div>
      <label :for="`${formId}-note`" class="mb-1 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{{ lang.t('accessNoteLabel') }}</label>
      <textarea
        :id="`${formId}-note`"
        v-model="form.note"
        @input="isDirty = true"
        rows="2"
        :placeholder="lang.t('accessNotePlaceholder')"
        class="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-sm focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-slate-950"
      ></textarea>
    </div>

    <!-- Photo Upload Simulation -->
    <div>
      <label :for="`${formId}-photo`" class="mb-1 block text-xs font-extrabold text-slate-700 dark:text-slate-200">{{ lang.t('photoLabel') }}</label>
      <input :id="`${formId}-photo`" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="handlePhotoUpload" />
      <button
        v-if="!form.photoUrl"
        type="button"
        class="group w-full cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3.5 text-center transition-all hover:border-teal-600 hover:bg-teal-50/50 focus-visible:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-400 dark:hover:bg-slate-800"
        :aria-describedby="`${formId}-photo-hint`"
        @click="fileInput?.click()"
      >
        <span class="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 group-hover:text-teal-700 dark:text-slate-400 dark:group-hover:text-teal-300">
          <Camera class="h-4 w-4 text-teal-600 transition-transform group-hover:scale-110 dark:text-teal-400" />
          <span>{{ lang.t('photoPlaceholder') }}</span>
        </span>
      </button>
      <div v-else class="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-2.5 text-xs font-extrabold dark:border-teal-800/80 dark:bg-teal-950/70">
        <div class="flex min-w-0 items-center gap-2.5">
          <img v-if="isLocalPhotoPreview" :src="form.photoUrl" :alt="lang.t('photoPreviewAlt')" class="h-10 w-10 rounded-xl border border-teal-200/80 object-cover shadow-sm dark:border-teal-800" />
          <span v-else class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-200 bg-white text-teal-700 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-400"><Camera class="h-4 w-4" /></span>
          <div class="flex min-w-0 items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span class="truncate font-black text-teal-950 dark:text-teal-100">{{ lang.t('photoAttached') }}</span>
          </div>
        </div>
        <button type="button" @click="removePhoto" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-200 bg-red-100/80 text-red-700 transition-colors hover:bg-red-200 dark:border-red-800/80 dark:bg-red-950/80 dark:text-red-300 dark:hover:bg-red-900" :aria-label="lang.t('removePhotoLabel')" :title="lang.t('removePhotoLabel')">
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
      <p :id="`${formId}-photo-hint`" class="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">{{ lang.t('photoHint') }}</p>
      <p v-if="photoError" class="mt-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300" role="alert">{{ photoError }}</p>
    </div>

    <p v-if="saveError" class="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700" role="alert">{{ saveError }}</p>
    <button type="button" :disabled="!isDirty || isSaving" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500" @click="saveAccessInfo"><CheckCircle2 class="h-4 w-4" />{{ isSaving ? lang.t('accessSending') : saveMessage || (isDirty ? lang.t('accessSave') : lang.t('accessSaved')) }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import { KeyRound, Camera, CheckCircle2, Trash2 } from 'lucide-vue-next';
import type { AccessInfo } from '@/types';
import { useOrderStore } from '@/stores/orderStore';
import { useLangStore } from '@/stores/langStore';

const props = defineProps<{
  initialAccessInfo?: AccessInfo;
}>();

const emit = defineEmits<{
  (e: 'update', accessInfo: Partial<AccessInfo>): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const formId = `access-${useId()}`;
const isDirty = ref(false);
const saveMessage = ref('');
const saveError = ref('');
const photoError = ref('');
const submitted = ref(false);
const orderStore = useOrderStore();
const lang = useLangStore();
const isSaving = computed(() => orderStore.isPending('access'));
const isLocalPhotoPreview = computed(() => /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(form.photoUrl || '') && (form.photoUrl?.length || 0) < 1_100_000);
const MAX_PHOTO_BYTES = 750 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const form = reactive<AccessInfo>({
  residenceType: 'apartment',
  intercom: '',
  gateCode: '',
  entrance: '',
  floor: '',
  note: '',
  photoUrl: ''
});

const residenceOptions = computed(() => [
  { value: 'apartment' as const, label: lang.t('apartmentOption') },
  { value: 'house' as const, label: lang.t('houseOption') }
]);

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
  if (newVal && !isDirty.value) {
    Object.assign(form, newVal);
    form.residenceType ||= 'apartment';
  }
}, { immediate: true });

watch(isSaving, (saving, wasSaving) => {
  if (!wasSaving || saving || !submitted.value) return;
  submitted.value = false;
  if (orderStore.actionError) {
    saveError.value = orderStore.actionError;
    return;
  }
  if (props.initialAccessInfo) Object.assign(form, props.initialAccessInfo);
  isDirty.value = false;
  saveMessage.value = lang.t('accessSent');
  window.setTimeout(() => { saveMessage.value = ''; }, 2500);
});

const emitUpdate = () => {
  emit('update', { ...form });
};

const handlePhotoUpload = (event: Event) => {
  photoError.value = '';
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    photoError.value = lang.t('invalidPhotoType');
    (event.target as HTMLInputElement).value = '';
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    photoError.value = lang.t('photoTooLarge');
    (event.target as HTMLInputElement).value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.photoUrl = String(reader.result || '');
    isDirty.value = true;
  };
  reader.readAsDataURL(file);
};

const removePhoto = () => {
  form.photoUrl = '';
  if (fileInput.value) fileInput.value.value = '';
  photoError.value = '';
  isDirty.value = true;
};

const saveAccessInfo = () => {
  saveError.value = '';
  submitted.value = true;
  emitUpdate();
};
</script>
