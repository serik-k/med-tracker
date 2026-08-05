import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { translations, type Language } from '@/i18n/translations';

export const useLangStore = defineStore('lang', () => {
  const savedLanguage = localStorage.getItem('medtracker_lang');
  const currentLang = ref<Language>(savedLanguage === 'ru' || savedLanguage === 'kk' || savedLanguage === 'en' ? savedLanguage : 'ru');

  function setLanguage(lang: Language) {
    currentLang.value = lang;
  }

  function t(key: string): string {
    const dict = translations[currentLang.value] || translations['ru'];
    return dict[key] || translations['ru'][key] || key;
  }

  watch(currentLang, lang => {
    localStorage.setItem('medtracker_lang', lang);
    document.documentElement.lang = lang;
  }, { immediate: true });

  return {
    currentLang,
    setLanguage,
    t
  };
});
