<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden bg-[#090d16] p-4 text-slate-100">
    <div class="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[150px]"></div>
    <section class="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-7 shadow-2xl">
      <button class="mb-6 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white" @click="router.push('/')">
        <ArrowLeft class="h-4 w-4 text-emerald-400" /> На главную
      </button>

      <div class="mb-7 text-center">
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
          <Activity class="h-7 w-7" />
        </div>
        <h1 class="text-2xl font-black">Вход в MedTracker</h1>
        <p class="mt-1 text-xs text-slate-400">Кабинет сотрудников медицинских организаций</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-400">Рабочий email</label>
          <input v-model.trim="email" type="email" autocomplete="email" required placeholder="name@clinic.kz" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400" />
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-400">Пароль</label>
          <input v-model="password" type="password" autocomplete="current-password" required class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400" />
        </div>
        <p v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300" role="alert">{{ error }}</p>
        <button :disabled="loading" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-sm font-black text-slate-950 disabled:opacity-60">
          <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />
          <LogIn v-else class="h-4 w-4" />
          {{ loading ? 'Входим…' : 'Войти' }}
        </button>
      </form>

      <p class="mt-6 text-center text-[11px] leading-5 text-slate-500">Доступ выдаёт владелец вашей клиники. Водителям и пациентам регистрация не требуется — они получают защищённую ссылку.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, type User } from '@/stores/authStore';
import { Activity, ArrowLeft, LoaderCircle, LogIn } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

function destination(user: User) {
  if (user.role === 'platform_admin') return '/platform';
  return user.role === 'dispatcher' ? '/dispatcher' : '/admin';
}

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const user = await auth.login(email.value, password.value);
    router.replace(destination(user));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось войти';
  } finally {
    loading.value = false;
  }
}
</script>
