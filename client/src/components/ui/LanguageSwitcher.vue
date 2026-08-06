<template>
  <div ref="rootRef" class="relative inline-block text-left select-none">
    <!-- Trigger Button (Globe Icon + Current Language Badge) -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      :aria-expanded="isOpen"
      aria-label="Сменить язык / Change language"
      class="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-100/90 px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-800 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Globe class="h-4 w-4 text-teal-600 dark:text-teal-400" />
      <span class="font-mono text-xs font-bold uppercase">{{ currentLabel }}</span>
    </button>

    <!-- Popover Card containing Language Options -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-11 z-[100] min-w-[180px] rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div class="mb-2.5 flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
          <span>{{ groupLabel }}</span>
          <button
            type="button"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            @click="isOpen = false"
            aria-label="Закрыть"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="flex shrink-0 select-none items-center rounded-xl border border-slate-200/90 bg-slate-100 p-0.5 shadow-inner dark:border-slate-800 dark:bg-slate-950" role="group" :aria-label="groupLabel">
          <button
            v-for="lang in languages"
            :key="lang.code"
            type="button"
            :aria-pressed="langStore.currentLang === lang.code"
            :title="lang.title"
            @click="selectLang(lang.code)"
            :class="[
              'flex min-h-8 flex-1 cursor-pointer select-none items-center justify-center rounded-lg px-2 text-[10px] font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700',
              langStore.currentLang === lang.code
                ? 'bg-teal-600 text-white shadow-sm scale-105 dark:bg-teal-500 dark:text-slate-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            ]"
          >
            <span>{{ lang.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { Globe, X } from 'lucide-vue-next';
import { useLangStore } from '@/stores/langStore';
import type { Language } from '@/i18n/translations';

const langStore = useLangStore();
const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const currentLabel = computed(() => {
  const code = langStore.currentLang;
  return code === 'kk' ? 'KZ' : code.toUpperCase();
});

const groupLabel = computed(() => ({
  ru: 'Язык интерфейса',
  kk: 'Интерфейс тілі',
  en: 'Interface language'
})[langStore.currentLang]);

const languages: { code: Language; label: string; title: string }[] = [
  { code: 'ru', label: 'RU', title: 'Русский' },
  { code: 'kk', label: 'KZ', title: 'Қазақша' },
  { code: 'en', label: 'EN', title: 'English' }
];

function selectLang(code: Language) {
  langStore.setLanguage(code);
  isOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>
