<template>
  <div class="flex shrink-0 select-none items-center rounded-xl border border-slate-200/90 bg-slate-100 p-0.5 shadow-inner" role="group" :aria-label="groupLabel">
    <button
      v-for="lang in languages"
      :key="lang.code"
      type="button"
      :aria-pressed="langStore.currentLang === lang.code"
      :title="lang.title"
      @click="langStore.setLanguage(lang.code)"
      :class="[
        'flex min-h-9 min-w-9 cursor-pointer select-none items-center justify-center rounded-lg px-2 text-[10px] font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700',
        langStore.currentLang === lang.code
          ? 'bg-teal-600 text-white shadow-sm scale-105'
          : 'text-slate-500 hover:text-slate-900'
      ]"
    >
      <span>{{ lang.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLangStore } from '@/stores/langStore';
import type { Language } from '@/i18n/translations';

const langStore = useLangStore();
const groupLabel = computed(() => ({ ru: 'Язык интерфейса', kk: 'Интерфейс тілі', en: 'Interface language' })[langStore.currentLang]);

const languages: { code: Language; label: string; title: string }[] = [
  { code: 'ru', label: 'RU', title: 'Русский' },
  { code: 'kk', label: 'KZ', title: 'Қазақша' },
  { code: 'en', label: 'EN', title: 'English' }
];
</script>
