<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore';
useThemeStore().initTheme();
</script>
