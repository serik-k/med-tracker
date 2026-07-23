import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { translations, type Language } from '@/i18n/translations';

export const useLangStore = defineStore('lang', () => {
  const currentLang = ref<Language>((localStorage.getItem('medtracker_lang') as Language) || 'ru');

  function setLanguage(lang: Language) {
    currentLang.value = lang;
    localStorage.setItem('medtracker_lang', lang);
  }

  function t(key: string): string {
    const dict = translations[currentLang.value] || translations['ru'];
    return dict[key] || translations['ru'][key] || key;
  }

  return {
    currentLang,
    setLanguage,
    t
  };
});
