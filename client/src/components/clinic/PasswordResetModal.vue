<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '../ui/BaseModal.vue';
import CustomInput from '../ui/CustomInput.vue';
import type { User } from '../../types';

const props = defineProps<{
  show: boolean;
  user: User | null;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', password: string): void;
}>();

const password = ref('');

watch(() => props.show, (newVal) => {
  if (newVal) password.value = '';
});

function handleSubmit() {
  if (password.value) {
    emit('submit', password.value);
  }
}
</script>

<template>
  <BaseModal :show="show" title="Сброс пароля сотрудника" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Укажите новый пароль для сотрудника <strong class="text-slate-900 dark:text-white">{{ user?.name || user?.email }}</strong>.
      </p>

      <div v-if="error" class="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-xs font-semibold">
        {{ error }}
      </div>

      <CustomInput
        v-model="password"
        label="Новый пароль (мин. 10 символов)"
        type="password"
        placeholder="••••••••••••"
        required
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
          :disabled="loading || password.length < 10"
          class="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-500 disabled:opacity-50"
        >
          {{ loading ? 'Сброс...' : 'Сбросить пароль' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
