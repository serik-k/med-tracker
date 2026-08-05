<template>
  <main class="grid min-h-svh place-items-center bg-[#f5f8fb] p-6 text-slate-950">
    <section class="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
      <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-700"><MapPinOff class="h-6 w-6" /></span>
      <p class="mt-6 font-mono text-xs font-black text-teal-800">ERROR 404</p>
      <h1 class="mt-2 text-3xl font-black tracking-tight">Страница не найдена</h1>
      <p class="mt-3 text-sm font-medium leading-6 text-slate-600">Ссылка могла устареть или адрес введён с ошибкой. Вернитесь на главную страницу.</p>
      <RouterLink to="/" class="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-black text-white focus-visible:ring-4 focus-visible:ring-teal-200"><ArrowLeft class="h-4 w-4" />На главную</RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft, MapPinOff } from 'lucide-vue-next';
</script>
