<template>
  <button type="button" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200" :aria-label="themeStore.theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'" :title="themeStore.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'" @click="themeStore.toggleTheme">
    <Sun v-if="themeStore.theme === 'dark'" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </button>
</template>

<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next';
import { useThemeStore } from '@/stores/themeStore';
const themeStore = useThemeStore();
</script>
