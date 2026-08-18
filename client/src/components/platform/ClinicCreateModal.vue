<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '../ui/BaseModal.vue';
import CustomInput from '../ui/CustomInput.vue';
import CustomSelect from '../ui/CustomSelect.vue';
import type { CreateClinicPayload } from '../../api/platform.api';

const props = defineProps<{
  show: boolean;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateClinicPayload): void;
}>();

const form = ref<CreateClinicPayload>({
  name: '',
  legalName: '',
  bin: '',
  city: '',
  contactPhone: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  plan: 'START',
  timezone: 'Asia/Almaty'
});

const plan = ref<'START' | 'PRO' | 'ENTERPRISE'>('START');

watch(() => props.show, (newVal) => {
  if (newVal) {
    form.value = {
      name: '',
      legalName: '',
      bin: '',
      city: '',
      contactPhone: '',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      plan: 'START',
      timezone: 'Asia/Almaty'
    };
    plan.value = 'START';
  }
});

function handleSubmit() {
  emit('submit', { ...form.value, plan: plan.value });
}
</script>

<template>
  <BaseModal :show="show" title="Подключение новой клиники" maxWidth="600px" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="error" class="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-xs font-semibold">
        {{ error }}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomInput v-model="form.name" label="Название клиники" placeholder="МедЦентр Алматы" required />
        <CustomInput v-model="form.legalName" label="Юридическое название (ТОО)" placeholder="ТОО МедЦентр" required />
        <CustomInput v-model="form.bin" label="БИН (12 цифр)" placeholder="123456789012" required />
        <CustomInput v-model="form.city" label="Город" placeholder="Алматы" required />
        <CustomInput v-model="form.contactPhone" label="Телефон" placeholder="+7 701 123 45 67" required />
        <CustomSelect
          v-model="plan"
          label="Тарифный план"
          :options="[
            { value: 'START', label: 'Старт' },
            { value: 'PRO', label: 'Про' },
            { value: 'ENTERPRISE', label: 'Корпоративный' }
          ]"
        />
      </div>

      <div class="pt-3 border-t border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-700 dark:text-slate-300">
        Учётная запись владельца клиники
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomInput v-model="form.ownerName" label="ФИО Владельца" placeholder="Иванов И.И." required />
        <CustomInput v-model="form.ownerEmail" label="Email Владельца" type="email" placeholder="owner@clinic.kz" required />
        <div class="sm:col-span-2">
          <CustomInput v-model="form.ownerPassword" label="Пароль Владельца (мин. 10 символов)" type="password" placeholder="••••••••••••" required />
        </div>
      </div>

      <div class="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
        >
          Отмена
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 disabled:opacity-50"
        >
          {{ loading ? 'Создание...' : 'Подключить клинику' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
