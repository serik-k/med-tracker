import { defineStore } from 'pinia';
import { ref } from 'vue';

export type Theme = 'light' | 'dark';
const preferredTheme = (): Theme => {
  const saved = localStorage.getItem('medtracker-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(preferredTheme());
  const applyTheme = () => {
    document.documentElement.classList.toggle('dark', theme.value === 'dark');
    document.documentElement.style.colorScheme = theme.value;
  };
  const initTheme = () => applyTheme();
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    localStorage.setItem('medtracker-theme', theme.value);
    applyTheme();
  };
  return { theme, initTheme, toggleTheme };
});
