<template>
  <div class="w-full space-y-1">
    <label v-if="label" class="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
      {{ label }}
    </label>

    <div class="relative flex items-center w-full min-w-0">
      <div v-if="icon" class="absolute left-3 text-slate-400 pointer-events-none">
        <component :is="icon" class="w-4 h-4" />
      </div>

      <input
        :type="type || 'text'"
        :value="modelValue"
        @input="handleInput"
        :placeholder="placeholder"
        :required="required"
        :class="[
          'w-full bg-slate-50 border rounded-xl py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 shadow-xs min-w-0 truncate',
          icon ? 'pl-9' : 'px-3.5',
          modelValue ? 'pr-8' : 'pr-3.5',
          'border-slate-200 focus:border-teal-700 focus:bg-white focus:ring-2 focus:ring-teal-700/15'
        ]"
      />

      <button
        v-if="modelValue"
        type="button"
        @click="$emit('update:modelValue', '')"
        class="absolute right-2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const formatPhoneNumber = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  let raw = digits;
  if (raw.startsWith('7') || raw.startsWith('8')) {
    raw = raw.substring(1);
  }

  let formatted = '+7';
  if (raw.length > 0) {
    formatted += ' (' + raw.substring(0, 3);
  }
  if (raw.length >= 3) {
    formatted += ') ' + raw.substring(3, 6);
  }
  if (raw.length >= 6) {
    formatted += '-' + raw.substring(6, 8);
  }
  if (raw.length >= 8) {
    formatted += '-' + raw.substring(8, 10);
  }
  return formatted;
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  let val = target.value;

  if (props.type === 'tel') {
    val = formatPhoneNumber(val);
    target.value = val;
  }

  emit('update:modelValue', val);
};
</script>
