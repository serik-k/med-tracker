<template>
  <div class="min-h-screen">
    <div :inert="auth.logoutPending" :aria-hidden="auth.logoutPending ? 'true' : undefined">
      <router-view />
    </div>

    <div
      v-if="auth.logoutPending"
      class="fixed inset-0 z-[2000] grid place-items-center bg-slate-950/90 p-4 text-slate-950 backdrop-blur-md"
      @keydown.esc.prevent
      @keydown.tab="trapLogoutFocus"
    >
      <section ref="logoutDialog" tabindex="-1" class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:p-8" role="alertdialog" aria-modal="true" aria-labelledby="logout-pending-title" aria-describedby="logout-pending-description">
        <span class="grid h-14 w-14 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-800"><ShieldAlert class="h-7 w-7" aria-hidden="true" /></span>
        <h1 id="logout-pending-title" class="mt-5 text-xl font-black tracking-tight">{{ logoutCopy.title }}</h1>
        <p id="logout-pending-description" class="mt-2 text-sm font-medium leading-6 text-slate-600">{{ logoutCopy.description }}</p>
        <p v-if="auth.logoutError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800" role="alert">{{ auth.logoutError }}</p>
        <button type="button" :disabled="auth.logoutInFlight" class="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-wait disabled:opacity-60" @click="retryLogout">
          <LoaderCircle v-if="auth.logoutInFlight" class="h-4 w-4 animate-spin" aria-hidden="true" />
          {{ auth.logoutInFlight ? logoutCopy.retrying : logoutCopy.retry }}
        </button>
        <p class="mt-3 text-center text-[11px] font-semibold leading-5 text-slate-500">{{ logoutCopy.safety }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { LoaderCircle, ShieldAlert } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/authStore';
import { useLangStore } from '@/stores/langStore';
import { useThemeStore } from '@/stores/themeStore';

useThemeStore().initTheme();
const auth = useAuthStore();
const lang = useLangStore();
const router = useRouter();
const logoutDialog = ref<HTMLElement | null>(null);
const logoutMessages = {
  ru: { title: 'Выход ещё не подтверждён', description: 'Локальные данные уже скрыты, но сервер не подтвердил закрытие сессии. Не оставляйте устройство, пока выход не завершится.', retry: 'Повторить безопасный выход', retrying: 'Закрываем сессию…', safety: 'Экран останется заблокированным до ответа сервера.' },
  kk: { title: 'Шығу әлі расталмады', description: 'Жергілікті деректер жасырылды, бірақ сервер сессияның жабылғанын растаған жоқ. Шығу аяқталғанша құрылғыны қалдырмаңыз.', retry: 'Қауіпсіз шығуды қайталау', retrying: 'Сессия жабылуда…', safety: 'Сервер жауап бергенше экран бұғаттаулы қалады.' },
  en: { title: 'Sign-out is not confirmed yet', description: 'Local data is already hidden, but the server has not confirmed that the session is closed. Do not leave the device until sign-out completes.', retry: 'Retry secure sign-out', retrying: 'Closing the session…', safety: 'This screen stays locked until the server responds.' }
};
const logoutCopy = computed(() => logoutMessages[lang.currentLang] || logoutMessages.ru);

watch(() => auth.logoutPending, async (pending, wasPending) => {
  if (pending) {
    await nextTick();
    (logoutDialog.value?.querySelector<HTMLElement>('button:not([disabled])') || logoutDialog.value)?.focus();
  } else if (wasPending && !auth.user && /^\/(dispatcher|admin|platform)(\/|$)/.test(window.location.pathname)) {
    await router.replace('/login');
  }
}, { immediate: true });

function trapLogoutFocus(event: KeyboardEvent) {
  const button = logoutDialog.value?.querySelector<HTMLButtonElement>('button:not([disabled])');
  event.preventDefault();
  (button || logoutDialog.value)?.focus();
}

async function retryLogout() {
  try { await auth.retryLogout(); } catch { /* The blocking dialog exposes the retryable error. */ }
}
</script>
