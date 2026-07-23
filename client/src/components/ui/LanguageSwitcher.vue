<template>
  <div class="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner">
    <button
      v-for="lang in languages"
      :key="lang.code"
      @click="langStore.setLanguage(lang.code)"
      :class="[
        'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none',
        langStore.currentLang === lang.code
          ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 scale-105'
          : 'text-slate-400 hover:text-slate-200'
      ]"
    >
      <span>{{ lang.flag }}</span>
      <span>{{ lang.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useLangStore } from '@/stores/langStore';
import type { Language } from '@/i18n/translations';

const langStore = useLangStore();

const languages: { code: Language; flag: string; label: string }[] = [
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'kk', flag: '🇰🇿', label: 'KZ' },
  { code: 'en', flag: '🇬🇧', label: 'EN' }
];
</script>
