<template>
  <div class="flex items-center p-0.5 bg-slate-100 border border-slate-200/90 rounded-xl shadow-inner shrink-0 select-none">
    <button
      v-for="lang in languages"
      :key="lang.code"
      @click="langStore.setLanguage(lang.code)"
      :class="[
        'px-2 py-1 rounded-lg text-[10px] font-black transition-all duration-200 cursor-pointer flex items-center justify-center select-none uppercase tracking-wider',
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
import { useLangStore } from '@/stores/langStore';
import type { Language } from '@/i18n/translations';

const langStore = useLangStore();

const languages: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KZ' },
  { code: 'en', label: 'EN' }
];
</script>
