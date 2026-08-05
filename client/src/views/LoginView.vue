<template>
  <main class="min-h-svh bg-slate-950 text-white">
    <div class="grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <section class="relative hidden overflow-hidden border-r border-slate-800 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14" aria-labelledby="login-context-title">
        <div class="login-grid pointer-events-none absolute inset-0 opacity-30"></div>
        <div class="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-teal-500/15 blur-3xl"></div>
        <div class="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"></div>

        <button type="button" class="relative flex w-fit min-h-11 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30" @click="router.push('/')">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-teal-400 text-slate-950"><HeartPulse class="h-5 w-5" /></span>
          <span><strong class="block text-sm font-black">MedTracker</strong><span class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Emergency operations</span></span>
        </button>

        <div class="relative max-w-2xl py-12">
          <p class="text-xs font-black uppercase tracking-[0.18em] text-teal-300">{{ content.kicker }}</p>
          <h2 id="login-context-title" class="mt-4 text-balance text-4xl font-black leading-tight tracking-[-0.04em] xl:text-5xl">{{ content.contextTitle }}</h2>
          <p class="mt-5 max-w-xl text-base font-medium leading-7 text-slate-400">{{ content.contextBody }}</p>

          <ol class="mt-10 grid gap-3" :aria-label="content.processLabel">
            <li v-for="(item, index) in content.steps" :key="item.title" class="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 font-mono text-[11px] font-black text-teal-300">0{{ index + 1 }}</span>
              <div><h2 class="text-sm font-black">{{ item.title }}</h2><p class="mt-1 text-xs font-medium leading-5 text-slate-500">{{ item.body }}</p></div>
            </li>
          </ol>
        </div>

        <div class="relative flex items-center gap-3 text-xs font-semibold text-slate-500"><ShieldCheck class="h-4 w-4 text-teal-400" />{{ content.security }}</div>
      </section>

      <section class="flex min-h-svh items-center justify-center bg-[#f5f8fb] p-4 text-slate-950 dark:bg-[#07111f] sm:p-8">
        <div class="w-full max-w-md">
          <div class="mb-8 flex items-center justify-between gap-2 lg:justify-end">
            <button type="button" class="flex min-h-11 items-center gap-2 rounded-xl px-2 text-xs font-black text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 lg:hidden" @click="router.push('/')"><ArrowLeft class="h-4 w-4 text-teal-800" />{{ content.back }}</button>
            <div class="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.09)] sm:p-8">
            <div class="flex items-start gap-4">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-800 text-white shadow-sm"><LogIn class="h-5 w-5" /></span>
              <div><p class="text-xs font-black uppercase tracking-[0.14em] text-teal-800">MedTracker</p><h1 class="mt-1 text-2xl font-black tracking-tight">{{ content.title }}</h1><p class="mt-1 text-sm font-medium text-slate-500">{{ content.subtitle }}</p></div>
            </div>

            <form class="mt-8 space-y-5" @submit.prevent="submit">
              <p v-if="route.query.passwordChanged === '1'" class="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-5 text-emerald-800" role="status"><ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" />{{ content.passwordChanged }}</p>
              <div>
                <label for="login-email" class="mb-2 block text-sm font-black text-slate-800">{{ content.email }}</label>
                <div class="relative"><Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-email" v-model.trim="email" type="email" inputmode="email" autocomplete="email" required :placeholder="content.emailPlaceholder" class="min-h-13 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400" /></div>
              </div>

              <div>
                <label for="login-password" class="mb-2 block text-sm font-black text-slate-800">{{ content.password }}</label>
                <div class="relative"><LockKeyhole class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required class="min-h-13 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm font-medium outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400" /><button type="button" class="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700" :aria-label="showPassword ? content.hidePassword : content.showPassword" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" class="h-4 w-4" /><Eye v-else class="h-4 w-4" /></button></div>
              </div>

              <p v-if="error" ref="errorBox" tabindex="-1" class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-5 text-red-800 focus:outline-none focus:ring-4 focus:ring-red-100" role="alert"><CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />{{ error }}</p>

              <button type="submit" :disabled="loading || !email || !password" class="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 text-sm font-black text-white shadow-sm transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" /><LogIn v-else class="h-4 w-4" />{{ loading ? content.loading : content.submit }}
              </button>
            </form>

            <div class="mt-6 border-t border-slate-200 pt-5">
              <p class="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500"><Info class="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />{{ content.accessHelp }}</p>
            </div>
          </div>

          <p class="mt-5 text-center text-xs font-semibold text-slate-500">{{ content.support }}</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore, type User } from '@/stores/authStore';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import type { Language } from '@/i18n/translations';
import { ArrowLeft, CircleAlert, Eye, EyeOff, HeartPulse, Info, LoaderCircle, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const langStore = useLangStore();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const showPassword = ref(false);
const errorBox = ref<HTMLElement | null>(null);
const languages: { code: Language; label: string }[] = [{ code: 'ru', label: 'RU' }, { code: 'kk', label: 'KZ' }, { code: 'en', label: 'EN' }];

const messages = {
  ru: { kicker: 'Защищённый рабочий контур', contextTitle: 'Оперативная смена начинается с ясного контекста', contextBody: 'Войдите с аккаунтом клиники. Роль и организация определяются на сервере — после входа откроется нужный рабочий режим.', processLabel: 'Рабочий процесс', steps: [{ title: 'Проверьте организацию', body: 'Название клиники отображается в шапке рабочего кабинета.' }, { title: 'Откройте свою роль', body: 'Диспетчер, администратор и оператор платформы получают разные действия.' }, { title: 'Завершайте смену выходом', body: 'Выход закрывает HTTP-сессию, realtime-соединение и локальное состояние.' }], security: 'Сессия хранится в защищённой HttpOnly cookie', back: 'На главную', language: 'Язык интерфейса', title: 'Вход для сотрудников', subtitle: 'Используйте рабочую учётную запись', email: 'Рабочий email', emailPlaceholder: 'name@clinic.kz', password: 'Пароль', showPassword: 'Показать пароль', hidePassword: 'Скрыть пароль', loading: 'Проверяем доступ…', submit: 'Войти в систему', loginError: 'Не удалось войти', passwordChanged: 'Пароль изменён, все прежние сессии закрыты. Войдите с новым паролем.', accessHelp: 'Аккаунт создаёт владелец или администратор клиники. Пациенты и выездные бригады входят по временной ссылке.', support: 'Нет доступа? Обратитесь к администратору своей организации.' },
  kk: { kicker: 'Қорғалған жұмыс ортасы', contextTitle: 'Жедел ауысым анық контекстен басталады', contextBody: 'Клиника аккаунтымен кіріңіз. Рөл мен ұйым серверде анықталады, содан кейін тиісті жұмыс режимі ашылады.', processLabel: 'Жұмыс процесі', steps: [{ title: 'Ұйымды тексеріңіз', body: 'Клиника атауы жұмыс кабинетінің жоғарғы бөлігінде көрсетіледі.' }, { title: 'Өз рөліңізді ашыңыз', body: 'Диспетчер, әкімші және платформа операторы әртүрлі әрекеттер алады.' }, { title: 'Ауысымды шығумен аяқтаңыз', body: 'Шығу сессияны, realtime байланысын және жергілікті күйді жабады.' }], security: 'Сессия қорғалған HttpOnly cookie ішінде сақталады', back: 'Басты бетке', language: 'Интерфейс тілі', title: 'Қызметкерлерге кіру', subtitle: 'Жұмыс тіркелгіңізді пайдаланыңыз', email: 'Жұмыс email', emailPlaceholder: 'name@clinic.kz', password: 'Құпиясөз', showPassword: 'Құпиясөзді көрсету', hidePassword: 'Құпиясөзді жасыру', loading: 'Қолжетімділік тексерілуде…', submit: 'Жүйеге кіру', loginError: 'Жүйеге кіру мүмкін болмады', passwordChanged: 'Құпиясөз өзгертілді, бұрынғы сессиялар жабылды. Жаңа құпиясөзбен кіріңіз.', accessHelp: 'Аккаунтты клиника иесі немесе әкімші жасайды. Пациенттер мен бригадалар уақытша сілтеме арқылы кіреді.', support: 'Қолжетімділік жоқ па? Ұйымыңыздың әкімшісіне хабарласыңыз.' },
  en: { kicker: 'Controlled staff workspace', contextTitle: 'Every operations shift starts with clear context', contextBody: 'Sign in with your clinic account. Your role and organisation are resolved on the server, then the correct workspace opens.', processLabel: 'Staff workflow', steps: [{ title: 'Confirm the organisation', body: 'The clinic name appears in the workspace header.' }, { title: 'Open the right role', body: 'Dispatch, clinic administration and platform operations have distinct actions.' }, { title: 'End the shift by signing out', body: 'Sign-out closes the HTTP session, realtime connection and local state.' }], security: 'The session is held in a protected HttpOnly cookie', back: 'Back to home', language: 'Interface language', title: 'Staff sign in', subtitle: 'Use your organisation account', email: 'Work email', emailPlaceholder: 'name@clinic.kz', password: 'Password', showPassword: 'Show password', hidePassword: 'Hide password', loading: 'Checking access…', submit: 'Sign in', loginError: 'Unable to sign in', passwordChanged: 'Password changed and previous sessions closed. Sign in with the new password.', accessHelp: 'Accounts are created by a clinic owner or administrator. Patients and field crews use temporary links.', support: 'Cannot access your account? Contact your organisation administrator.' }
};
const content = computed(() => messages[langStore.currentLang] || messages.ru);

function destination(user: User) {
  if (user.role === 'platform_admin') return '/platform';
  return user.role === 'dispatcher' ? '/dispatcher' : '/admin';
}

async function submit() {
  if (!email.value || !password.value || loading.value) return;
  error.value = '';
  loading.value = true;
  try {
    const user = await auth.login(email.value, password.value);
    const redirect = typeof route.query.redirect === 'string' && /^\/(?!\/)/.test(route.query.redirect) ? route.query.redirect : destination(user);
    await router.replace(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : content.value.loginError;
    await nextTick();
    errorBox.value?.focus();
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-grid { background-image: linear-gradient(to right, rgb(148 163 184 / .12) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / .12) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom right, black, transparent 90%); }
@media (prefers-reduced-motion: reduce) { .animate-spin { animation-duration: 1.5s; } }
</style>
