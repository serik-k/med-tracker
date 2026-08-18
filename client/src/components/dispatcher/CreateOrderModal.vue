<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '../ui/BaseModal.vue';
import CustomInput from '../ui/CustomInput.vue';
import CustomSelect from '../ui/CustomSelect.vue';
import type { Crew } from '../../types';
import type { CreateOrderPayload } from '../../api/order.api';

const props = defineProps<{
  show: boolean;
  crews: Crew[];
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: CreateOrderPayload): void;
}>();

const patientName = ref('');
const patientPhone = ref('');
const address = ref('');
const priority = ref<'EMERGENCY' | 'URGENT' | 'STANDARD'>('EMERGENCY');
const selectedCrewId = ref('');

watch(() => props.show, (newVal) => {
  if (newVal) {
    patientName.value = '';
    patientPhone.value = '';
    address.value = '';
    priority.value = 'EMERGENCY';
    selectedCrewId.value = '';
  }
});

function handleSubmit() {
  emit('submit', {
    patientName: patientName.value,
    patientPhone: patientPhone.value,
    address: address.value,
    priority: priority.value,
    crewId: selectedCrewId.value || null
  });
}
</script>

<template>
  <BaseModal :show="show" title="Создание нового экстренного вызова" maxWidth="550px" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="error" class="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-xs font-semibold">
        {{ error }}
      </div>

      <CustomInput
        v-model="patientName"
        label="ФИО или Имя Пациента"
        placeholder="Петров Александр В."
        required
      />

      <CustomInput
        v-model="patientPhone"
        label="Контактный Телефон"
        placeholder="+7 707 123 45 67"
        required
      />

      <CustomInput
        v-model="address"
        label="Адрес Вызова"
        placeholder="ул. Абая 150, кв. 42"
        required
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomSelect
          v-model="priority"
          label="Приоритет"
          :options="[
            { value: 'EMERGENCY', label: '🔴 Экстренный (Экстренный выезд)' },
            { value: 'URGENT', label: '🟡 Неотложный' },
            { value: 'STANDARD', label: '🟢 Плановый' }
          ]"
        />

        <CustomSelect
          v-model="selectedCrewId"
          label="Назначить Бригаду"
          :options="[
            { value: '', label: '— Назначить позже —' },
            ...crews.map(c => ({
              value: c.id,
              label: `${c.name} (${c.carPlate}) - ${c.status === 'ON_DUTY' ? 'Свободна' : c.status}`
            }))
          ]"
        />
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
          class="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-500 disabled:opacity-50"
        >
          {{ loading ? 'Создание...' : 'Создать вызов' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
