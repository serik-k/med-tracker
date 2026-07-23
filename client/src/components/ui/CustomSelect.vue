<template>
  <div class="relative w-full" ref="selectRef">
    <label v-if="label" class="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
      <span>{{ label }}</span>
    </label>

    <!-- Trigger Box -->
    <div
      @click="isOpen = !isOpen"
      :class="[
        'w-full bg-slate-900 border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-inner select-none',
        isOpen ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-rose-950/40' : 'border-slate-800 hover:border-slate-700'
      ]"
    >
      <div class="flex items-center gap-2.5 truncate">
        <component :is="icon" v-if="icon" class="w-4 h-4 text-rose-500 shrink-0" />
        <span class="truncate">{{ selectedOption?.label || placeholder }}</span>
      </div>
      <ChevronDown :class="['w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200', isOpen ? 'rotate-180 text-rose-400' : '']" />
    </div>

    <!-- Dropdown Menu -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-800/60"
      >
        <div
          v-for="opt in options"
          :key="opt.value"
          @click="select(opt.value)"
          :class="[
            'px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors',
            modelValue === opt.value
              ? 'bg-rose-500/20 text-rose-200 border-l-4 border-rose-500 font-bold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          ]"
        >
          <div class="flex items-center gap-2">
            <span>{{ opt.label }}</span>
          </div>
          <Check v-if="modelValue === opt.value" class="w-4 h-4 text-rose-400 shrink-0" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

const props = defineProps<{
  modelValue: string;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  icon?: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue));

const select = (val: string) => {
  emit('update:modelValue', val);
  isOpen.value = false;
};

const handleClickOutside = (e: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
