<template>
  <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700" :aria-label="toggleLabel" :aria-pressed="themeStore.theme === 'dark'" :title="toggleLabel" @click="themeStore.toggleTheme">
    <Sun v-if="themeStore.theme === 'dark'" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { useThemeStore } from '@/stores/themeStore';
import { useLangStore } from '@/stores/langStore';
const themeStore = useThemeStore();
const langStore = useLangStore();
const labels = {
  ru: { light: 'Включить светлую тему', dark: 'Включить тёмную тему' },
  kk: { light: 'Жарық тақырыпты қосу', dark: 'Қараңғы тақырыпты қосу' },
  en: { light: 'Switch to light theme', dark: 'Switch to dark theme' }
};
const toggleLabel = computed(() => labels[langStore.currentLang][themeStore.theme === 'dark' ? 'light' : 'dark']);
</script>
