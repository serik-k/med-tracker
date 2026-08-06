<template>
  <main class="min-h-svh bg-[#f4f7fa] text-slate-950 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100 antialiased">
    <div class="grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <!-- Left Context Branding Panel (Adapts to Light & Dark) -->
      <section class="relative hidden overflow-hidden border-r border-slate-200/80 bg-white/70 p-10 lg:flex lg:flex-col lg:justify-between transition-colors dark:border-slate-800/80 dark:bg-slate-900/50 xl:p-14" aria-labelledby="login-context-title">
        <!-- Ambient Glows -->
        <div class="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/15"></div>
        <div class="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/10"></div>

        <button type="button" class="relative flex w-fit min-h-11 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/30 transition hover:opacity-90" @click="router.push('/')">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-md dark:from-teal-500 dark:to-cyan-400 dark:text-slate-950">
            <HeartPulse class="h-5 w-5 stroke-[2.5]" />
          </span>
          <span>
            <strong class="block text-base font-black tracking-tight text-slate-950 dark:text-white leading-none">MedTracker</strong>
            <span class="block mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">Emergency operations</span>
          </span>
        </button>

        <div class="relative max-w-2xl py-12">
          <p class="text-xs font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">{{ content.kicker }}</p>
          <h2 id="login-context-title" class="mt-4 text-balance text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 dark:text-white xl:text-5xl">{{ content.contextTitle }}</h2>
          <p class="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ content.contextBody }}</p>

          <ol class="mt-10 grid gap-3.5" :aria-label="content.processLabel">
            <li v-for="(item, index) in content.steps" :key="item.title" class="flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm backdrop-blur transition-colors dark:border-slate-800/90 dark:bg-slate-900/80">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-teal-600/20 bg-teal-50 font-mono text-[11px] font-black text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/15 dark:text-teal-300">0{{ index + 1 }}</span>
              <div>
                <h3 class="text-sm font-black text-slate-950 dark:text-white">{{ item.title }}</h3>
                <p class="mt-1 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ item.body }}</p>
              </div>
            </li>
          </ol>
        </div>

        <div class="relative flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
          <ShieldCheck class="h-4 w-4 text-teal-600 dark:text-teal-400" />
          {{ content.security }}
        </div>
      </section>

      <!-- Right Login Form Panel -->
      <section class="flex min-h-svh items-center justify-center p-4 sm:p-8">
        <div class="w-full max-w-md">
          <!-- Top Actions Bar (Mobile & Desktop) -->
          <div class="mb-6 flex items-center justify-between gap-3">
            <button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-teal-500/30" @click="router.push('/')">
              <ArrowLeft class="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>{{ content.back }}</span>
            </button>
            <div class="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <!-- Form Card -->
          <div class="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div class="flex items-start gap-4">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-700 text-white shadow-md dark:bg-teal-500 dark:text-slate-950">
                <LogIn class="h-5 w-5" />
              </span>
              <div>
                <p class="text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">MedTracker</p>
                <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">{{ content.title }}</h1>
                <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{{ content.subtitle }}</p>
              </div>
            </div>

            <form class="mt-8 space-y-5" novalidate @submit.prevent="submit">
              <p v-if="route.query.passwordChanged === '1'" class="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-relaxed text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300" role="status">
                <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0" />
                {{ content.passwordChanged }}
              </p>

              <div>
                <label for="login-email" class="mb-2 block text-xs font-black text-slate-800 dark:text-slate-200">{{ content.email }}</label>
                <div class="relative">
                  <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-email"
                    v-model.trim="email"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    :placeholder="content.emailPlaceholder"
                    :class="[
                      'min-h-12 w-full rounded-xl border py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
                      fieldErrors.email
                        ? 'border-red-500 bg-red-50/30 focus:border-red-600 dark:border-red-500 dark:bg-red-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-teal-400'
                    ]"
                    @blur="touchField('email')"
                    @input="clearFieldError('email')"
                  />
                </div>
                <p v-if="fieldErrors.email" class="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400" role="alert">
                  <CircleAlert class="h-3.5 w-3.5 shrink-0" />
                  {{ fieldErrors.email }}
                </p>
              </div>

              <div>
                <label for="login-password" class="mb-2 block text-xs font-black text-slate-800 dark:text-slate-200">{{ content.password }}</label>
                <div class="relative">
                  <LockKeyhole class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    id="login-password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    :class="[
                      'min-h-12 w-full rounded-xl border py-3 pl-10 pr-12 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500',
                      fieldErrors.password
                        ? 'border-red-500 bg-red-50/30 focus:border-red-600 dark:border-red-500 dark:bg-red-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:hover:border-slate-600 dark:focus:border-teal-400'
                    ]"
                    @blur="touchField('password')"
                    @input="clearFieldError('password')"
                  />
                  <button
                    type="button"
                    class="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    :aria-label="showPassword ? content.hidePassword : content.showPassword"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" class="h-4 w-4" />
                    <Eye v-else class="h-4 w-4" />
                  </button>
                </div>
                <p v-if="fieldErrors.password" class="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400" role="alert">
                  <CircleAlert class="h-3.5 w-3.5 shrink-0" />
                  {{ fieldErrors.password }}
                </p>
              </div>

              <p v-if="error" ref="errorBox" tabindex="-1" class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-800 focus:outline-none focus:ring-4 focus:ring-red-100 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
                <CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />
                {{ error }}
              </p>

              <button
                type="submit"
                :disabled="loading || !email || !password"
                class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-extrabold text-white shadow-md transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              >
                <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />
                <LogIn v-else class="h-4 w-4" />
                {{ loading ? content.loading : content.submit }}
              </button>
            </form>

            <div class="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
              <p class="flex items-start gap-2 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
                <Info class="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                {{ content.accessHelp }}
              </p>
            </div>
          </div>

          <p class="mt-5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{{ content.support }}</p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { useAuthStore, type User } from '@/stores/authStore';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
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

const fieldErrors = ref<{ email?: string; password?: string }>({});

const messages = {
  ru: {
    kicker: 'Личный кабинет клиники',
    contextTitle: 'Безопасный доступ к выездной смене',
    contextBody: 'Войдите под своей рабочей учётной записью. Система автоматически откроет диспетчерскую или панель управления клиники.',
    processLabel: 'Рабочий процесс',
    steps: [
      { title: 'Рабочая учётная запись', body: 'Вход предназначен для сотрудников и медицинских диспетчеров клиники.' },
      { title: 'Автоматический доступ', body: 'После авторизации система сразу откроет нужный рабочий режим.' },
      { title: 'Защита данных', body: 'Ваша сессия защищена шифрованием. Пациенты заходят по временным SMS-ссылкам.' }
    ],
    security: 'Сессия хранится в защищённой HttpOnly cookie',
    back: 'На главную',
    language: 'Язык интерфейса',
    title: 'Вход для сотрудников',
    subtitle: 'Используйте рабочую учётную запись',
    email: 'Рабочий email',
    emailPlaceholder: 'name@clinic.kz',
    password: 'Пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    loading: 'Проверяем доступ…',
    submit: 'Войти в систему',
    loginError: 'Не удалось войти. Проверьте email и пароль.',
    passwordChanged: 'Пароль изменён. Войдите с новым паролем.',
    accessHelp: 'Аккаунт создаёт администратор клиники. Пациенты и выездные бригады заходят по прямой ссылке.',
    support: 'Нет доступа? Обратитесь к администратору своей клиники.',
    validation: {
      emailRequired: 'Укажите рабочий email',
      invalidEmail: 'Введите корректный email (например, name@clinic.kz)',
      passwordRequired: 'Укажите пароль',
      passwordTooShort: 'Пароль должен содержать минимум 6 символов'
    }
  },
  kk: {
    kicker: 'Клиниканың жеке кабинеті',
    contextTitle: 'Жедел ауысымға қауіпсіз кіру',
    contextBody: 'Жұмыс тіркелгіңізбен кіріңіз. Жүйе автоматты түрде диспетчерлік орталықты немесе басқару панелін ашады.',
    processLabel: 'Жұмыс процесі',
    steps: [
      { title: 'Жұмыс тіркелгісі', body: 'Кіру клиника қызметкерлері мен медициналық диспетчерлерге арналған.' },
      { title: 'Автоматты қолжетімділік', body: 'Авторизациядан кейін жүйе бірден қажетті жұмыс режимін ашады.' },
      { title: 'Деректерді қорғау', body: 'Сессия шифрлаумен қорғалған. Пациенттер уақытша SMS-сілтемелер арқылы кіреді.' }
    ],
    security: 'Сессия қорғалған HttpOnly cookie ішінде сақталады',
    back: 'Басты бетке',
    language: 'Интерфейс тілі',
    title: 'Қызметкерлерге кіру',
    subtitle: 'Жұмыс тіркелгіңізді пайдаланыңыз',
    email: 'Жұмыс email',
    emailPlaceholder: 'name@clinic.kz',
    password: 'Құпиясөз',
    showPassword: 'Құпиясөзді көрсету',
    hidePassword: 'Құпиясөзді жасыру',
    loading: 'Қолжетімділік тексерілуде…',
    submit: 'Жүйеге кіру',
    loginError: 'Кіру мүмкін болмады. Email мен құпиясөзді тексеріңіз.',
    passwordChanged: 'Құпиясөз өзгертілді. Жаңа құпиясөзбен кіріңіз.',
    accessHelp: 'Аккаунтты клиника әкімшісі жасайды. Пациенттер мен бригадалар тікелей сілтеме арқылы кіреді.',
    support: 'Қолжетімділік жоқ па? Клиникаңыздың әкімшісіне хабарласыңыз.',
    validation: {
      emailRequired: 'Жұмыс email енгізіңіз',
      invalidEmail: 'Дұрыс email енгізіңіз (мысалы, name@clinic.kz)',
      passwordRequired: 'Құпиясөзді енгізіңіз',
      passwordTooShort: 'Құпиясөз кемінде 6 таңбадан тұруы керек'
    }
  },
  en: {
    kicker: 'Clinic Staff Workspace',
    contextTitle: 'Secure Operations Access',
    contextBody: 'Sign in with your organization account. The system automatically opens the dispatch console or management dashboard.',
    processLabel: 'Staff workflow',
    steps: [
      { title: 'Staff Account', body: 'Sign-in is intended for authorized clinic staff and medical dispatchers.' },
      { title: 'Automatic Role Access', body: 'After authentication, your designated workspace opens immediately.' },
      { title: 'Protected Data', body: 'Your session is encrypted. Patients and crews access via temporary links.' }
    ],
    security: 'Session stored in secure HttpOnly cookie',
    back: 'Back to home',
    language: 'Interface language',
    title: 'Staff sign in',
    subtitle: 'Use your organization account',
    email: 'Work email',
    emailPlaceholder: 'name@clinic.kz',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    loading: 'Verifying access…',
    submit: 'Sign in',
    loginError: 'Unable to sign in. Please check your credentials.',
    passwordChanged: 'Password changed. Please sign in with your new password.',
    accessHelp: 'Accounts are created by a clinic administrator. Patients and field crews use direct links.',
    support: 'Cannot access your account? Contact your clinic administrator.',
    validation: {
      emailRequired: 'Please enter your work email',
      invalidEmail: 'Please enter a valid email address (e.g. name@clinic.kz)',
      passwordRequired: 'Please enter your password',
      passwordTooShort: 'Password must be at least 6 characters'
    }
  }
};

const content = computed(() => messages[langStore.currentLang] || messages.ru);

const loginSchema = computed(() => {
  const v = content.value.validation;
  return z.object({
    email: z.string().min(1, v.emailRequired).email(v.invalidEmail),
    password: z.string().min(1, v.passwordRequired).min(6, v.passwordTooShort)
  });
});

function touchField(field: 'email' | 'password') {
  const result = loginSchema.value.safeParse({ email: email.value, password: password.value });
  if (result.success) {
    fieldErrors.value[field] = undefined;
  } else {
    const formatted = result.error.format();
    fieldErrors.value[field] = formatted[field]?._errors[0];
  }
}

function clearFieldError(field: 'email' | 'password') {
  if (fieldErrors.value[field]) {
    touchField(field);
  }
}

function validateForm(): boolean {
  const result = loginSchema.value.safeParse({ email: email.value, password: password.value });
  if (!result.success) {
    const formatted = result.error.format();
    fieldErrors.value = {
      email: formatted.email?._errors[0],
      password: formatted.password?._errors[0]
    };
    return false;
  }
  fieldErrors.value = {};
  return true;
}

function destination(user: User) {
  if (user.role === 'platform_admin') return '/platform';
  return user.role === 'dispatcher' ? '/dispatcher' : '/admin';
}

async function submit() {
  if (!validateForm() || loading.value) return;
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
@media (prefers-reduced-motion: reduce) {
  .animate-spin { animation-duration: 1.5s; }
}
</style>
