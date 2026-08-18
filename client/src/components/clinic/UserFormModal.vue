<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '../ui/BaseModal.vue';
import CustomInput from '../ui/CustomInput.vue';
import CustomSelect from '../ui/CustomSelect.vue';
import type { User } from '../../types';

const props = defineProps<{
  show: boolean;
  user?: User | null;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { name: string; email?: string; password?: string; role: 'dispatcher' | 'clinic_admin'; status?: 'ACTIVE' | 'DISABLED' }): void;
}>();

const name = ref('');
const email = ref('');
const password = ref('');
const role = ref<'dispatcher' | 'clinic_admin'>('dispatcher');
const status = ref<'ACTIVE' | 'DISABLED'>('ACTIVE');

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.user) {
      name.value = props.user.name || '';
      email.value = props.user.email || '';
      role.value = (props.user.role === 'clinic_admin' ? 'clinic_admin' : 'dispatcher');
      status.value = (props.user.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE');
      password.value = '';
    } else {
      name.value = '';
      email.value = '';
      password.value = '';
      role.value = 'dispatcher';
      status.value = 'ACTIVE';
    }
  }
}, { immediate: true });

function handleSubmit() {
  if (props.user) {
    emit('submit', {
      name: name.value,
      role: role.value,
      status: status.value
    });
  } else {
    emit('submit', {
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value
    });
  }
}
</script>

<template>
  <BaseModal :show="show" :title="user ? 'Редактировать сотрудника' : 'Добавить нового сотрудника'" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div v-if="error" class="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-xs font-semibold">
        {{ error }}
      </div>

      <CustomInput
        v-model="name"
        label="ФИО сотрудника"
        placeholder="Иванов Иван Иванович"
        required
      />

      <CustomInput
        v-if="!user"
        v-model="email"
        label="Email (Логин)"
        type="email"
        placeholder="dispatcher@clinic.kz"
        required
      />

      <CustomInput
        v-if="!user"
        v-model="password"
        label="Временный пароль (мин. 10 символов)"
        type="password"
        placeholder="••••••••••••"
        required
      />

      <CustomSelect
        v-model="role"
        label="Роль сотрудника"
        :options="[
          { value: 'dispatcher', label: 'Диспетчер' },
          { value: 'clinic_admin', label: 'Администратор клиники' }
        ]"
      />

      <CustomSelect
        v-if="user"
        v-model="status"
        label="Статус учётной записи"
        :options="[
          { value: 'ACTIVE', label: 'Активен' },
          { value: 'DISABLED', label: 'Отключён' }
        ]"
      />

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
          {{ loading ? 'Сохранение...' : (user ? 'Сохранить' : 'Создать') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
