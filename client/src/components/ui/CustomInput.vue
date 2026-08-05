<template>
  <div class="w-full space-y-1.5">
    <label v-if="label" :for="inputId" class="block text-xs font-black text-slate-700 dark:text-slate-200">
      {{ label }}<span v-if="required" class="ml-0.5 text-red-600 dark:text-red-400" aria-hidden="true">*</span>
    </label>

    <div class="relative flex min-w-0 items-center">
      <component :is="icon" v-if="icon" class="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <input
        :id="inputId"
        :type="type || 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-describedby="helpText ? `${inputId}-help` : undefined"
        :class="[
          'min-h-11 w-full min-w-0 rounded-xl border bg-white py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400',
          icon ? 'pl-10' : 'pl-3.5',
          modelValue && clearable ? 'pr-10' : 'pr-3.5',
          invalid
            ? 'border-red-500 hover:border-red-600 focus:border-red-600 dark:border-red-500 dark:hover:border-red-400 dark:focus:border-red-400'
            : 'border-slate-300 hover:border-slate-400 focus:border-teal-600 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-teal-400'
        ]"
        @input="handleInput"
      />

      <button
        v-if="modelValue && clearable && !disabled"
        type="button"
        class="absolute right-2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:hover:text-slate-200"
        :aria-label="`Очистить поле ${label || placeholder || ''}`"
        @click="emit('update:modelValue', '')"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    <p v-if="helpText" :id="`${inputId}-help`" class="text-xs font-medium" :class="invalid ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'">{{ helpText }}</p>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: unknown;
  autocomplete?: string;
  inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  disabled?: boolean;
  invalid?: boolean;
  helpText?: string;
  clearable?: boolean;
}>(), { clearable: true, required: false, disabled: false, invalid: false });

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
const inputId = `field-${useId()}`;

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  let raw = digits;
  if (raw.startsWith('7') || raw.startsWith('8')) raw = raw.slice(1);
  let formatted = '+7';
  if (raw.length) formatted += ` (${raw.slice(0, 3)}`;
  if (raw.length >= 3) formatted += `) ${raw.slice(3, 6)}`;
  if (raw.length >= 6) formatted += `-${raw.slice(6, 8)}`;
  if (raw.length >= 8) formatted += `-${raw.slice(8, 10)}`;
  return formatted;
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const value = props.type === 'tel' ? formatPhoneNumber(target.value) : target.value;
  if (target.value !== value) target.value = value;
  emit('update:modelValue', value);
}
</script>
