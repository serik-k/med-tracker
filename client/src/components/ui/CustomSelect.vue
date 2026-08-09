<template>
  <div ref="containerRef" class="relative min-w-0 max-w-full space-y-1.5" :class="{ 'z-40': isOpen }">
    <label v-if="label" :for="selectId" class="block text-xs font-black text-slate-700 dark:text-slate-200">{{ label }}</label>
    
    <!-- Select Trigger Button -->
    <div class="relative min-w-0 max-w-full">
      <component :is="icon" v-if="icon" class="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-teal-700 dark:text-teal-400" aria-hidden="true" />
      
      <button
        :id="selectId"
        type="button"
        :disabled="disabled"
        class="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white py-2.5 text-left text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-teal-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400 dark:disabled:bg-slate-800"
        :class="[
          icon ? 'pl-10' : 'pl-3.5',
          'pr-10'
        ]"
        :aria-expanded="isOpen"
        @click="toggleOpen"
        @keydown.escape="close"
      >
        <span v-if="selectedOption" class="block truncate">
          {{ selectedOption.label }}
          <span v-if="selectedOption.sub" class="text-xs font-normal text-slate-500 dark:text-slate-400"> — {{ selectedOption.sub }}</span>
        </span>
        <span v-else class="block truncate text-slate-400 dark:text-slate-500">
          {{ placeholder || 'Выберите…' }}
        </span>
      </button>

      <ChevronDown
        class="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 dark:text-slate-500"
        :class="{ 'rotate-180': isOpen }"
        aria-hidden="true"
      />
    </div>

    <!-- Options Dropdown Menu -->
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        role="listbox"
      >
        <button
          v-if="placeholder"
          type="button"
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
          @click="selectOption('')"
        >
          <span>{{ placeholder }}</span>
        </button>

        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          :disabled="option.disabled"
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition-all disabled:opacity-40"
          :class="[
            modelValue === option.value
              ? 'bg-teal-800 text-white dark:bg-teal-600 dark:text-white'
              : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          ]"
          @click="selectOption(option.value)"
        >
          <div class="min-w-0">
            <span class="block truncate">{{ option.label }}</span>
            <span
              v-if="option.sub"
              class="block truncate text-[10px] font-normal"
              :class="modelValue === option.value ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'"
            >
              {{ option.sub }}
            </span>
          </div>

          <Check v-if="modelValue === option.value" class="h-4 w-4 shrink-0 text-white" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';

export interface SelectOption { value: string; label: string; sub?: string; disabled?: boolean }

const props = withDefaults(defineProps<{
  modelValue: string;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  icon?: unknown;
  disabled?: boolean;
}>(), { disabled: false });

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
const selectId = `select-${useId()}`;

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => props.options.find(opt => opt.value === props.modelValue));

function toggleOpen() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function selectOption(val: string) {
  emit('update:modelValue', val);
  close();
}

function handleClickOutside(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
