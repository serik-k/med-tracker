<template>
  <div class="w-full space-y-1">
    <label v-if="label" class="block text-xs font-extrabold text-slate-700">
      {{ label }}
    </label>

    <div class="relative flex items-center">
      <div v-if="icon" class="absolute left-3 text-slate-400 pointer-events-none">
        <component :is="icon" class="w-4 h-4" />
      </div>

      <input
        :type="type || 'text'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :required="required"
        :class="[
          'w-full bg-slate-50 border rounded-2xl py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 shadow-sm',
          icon ? 'pl-9' : 'px-3.5',
          modelValue ? 'pr-8' : 'pr-3.5',
          'border-slate-200 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-500/20'
        ]"
      />

      <button
        v-if="modelValue"
        type="button"
        @click="$emit('update:modelValue', '')"
        class="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  modelValue: string;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: any;
}>();

defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();
</script>
