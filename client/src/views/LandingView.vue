<template>
  <div class="landing-page min-h-screen bg-[#f8fafc] text-slate-950 font-sans transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
    <a class="skip-link fixed left-4 -top-20 z-[1000] rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-slate-900 shadow-2xl transition-all focus:top-4 dark:bg-slate-800 dark:text-white" href="#main-content">
      {{ text.skip }}
    </a>

    <!-- Header Navigation -->
    <header class="site-header sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-[#07111f]/90">
      <nav class="header-inner mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-2 px-3 sm:gap-6 sm:px-6 lg:px-8" :aria-label="text.navigation">
        <RouterLink class="brand flex min-w-0 items-center gap-2 text-slate-950 transition hover:opacity-90 sm:gap-3 dark:text-white" to="/" :aria-label="text.brandHome">
          <span class="brand-mark grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white shadow-lg shadow-teal-500/20 dark:from-teal-500 dark:to-cyan-400 dark:shadow-teal-400/10">
            <HeartPulse :size="22" stroke-width="2.2" aria-hidden="true" />
          </span>
          <span class="brand-copy">
            <strong class="block text-base font-black tracking-tight leading-none">MedTracker</strong>
            <small class="mt-1 hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 min-[390px]:block dark:text-slate-400">{{ text.brandNote }}</small>
          </span>
        </RouterLink>

        <div class="desktop-nav hidden items-center gap-8 md:flex">
          <a href="#features" class="text-xs font-bold text-slate-600 transition hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400">{{ text.navFeatures }}</a>
          <a href="#how-it-works" class="text-xs font-bold text-slate-600 transition hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400">{{ text.navWorkflow }}</a>
          <a href="#faq" class="text-xs font-bold text-slate-600 transition hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400">{{ text.navFaq }}</a>
        </div>

        <div class="header-actions flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <RouterLink class="login-button inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg dark:bg-teal-600 dark:hover:bg-teal-500" to="/login">
            <LogIn :size="16" aria-hidden="true" />
            <span class="hidden sm:inline">{{ text.login }}</span>
          </RouterLink>
        </div>
      </nav>
    </header>

    <main id="main-content">
      <!-- Hero Section -->
      <section class="hero relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20" aria-labelledby="hero-title">
        <!-- Background Ambient Glows -->
        <div class="pointer-events-none absolute -right-40 -top-20 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/15"></div>
        <div class="pointer-events-none absolute -left-40 top-1/2 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/10"></div>

        <div class="hero-inner mx-auto max-w-7xl">
          <div class="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div class="hero-copy max-w-2xl">
              <p class="eyebrow inline-flex items-center gap-2.5 rounded-full border border-teal-600/20 bg-teal-50/80 px-3.5 py-1.5 text-xs font-extrabold text-teal-800 backdrop-blur dark:border-teal-400/20 dark:bg-teal-950/40 dark:text-teal-300">
                <span class="h-2 w-2 rounded-full bg-teal-600 shadow-[0_0_8px_rgba(13,148,136,0.6)] dark:bg-teal-400" aria-hidden="true"></span>
                {{ text.eyebrow }}
              </p>
              <h1 id="hero-title" class="mt-6 text-balance text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                {{ text.heroTitlePrefix }} <span class="bg-gradient-to-r from-teal-700 to-cyan-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-cyan-300">{{ text.heroAccent }}</span>
              </h1>
              <p class="hero-lead mt-6 text-base font-medium leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {{ text.heroBody }}
              </p>

              <div class="hero-actions mt-8 flex flex-wrap items-center gap-3">
                <RouterLink class="inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-xl bg-teal-700 px-6 text-sm font-extrabold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-800 hover:shadow-xl dark:bg-teal-500 dark:text-slate-950 dark:shadow-teal-400/20 dark:hover:bg-teal-400" to="/login">
                  {{ text.primaryCta }}
                  <ArrowRight :size="18" aria-hidden="true" />
                </RouterLink>
                <a class="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800" href="#how-it-works">
                  {{ text.secondaryCta }}
                </a>
              </div>

              <ul class="hero-points mt-8 flex flex-wrap gap-4 text-xs font-bold text-slate-700 dark:text-slate-300" role="list">
                <li v-for="point in text.heroPoints" :key="point" class="flex items-center gap-2">
                  <span class="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Check :size="13" stroke-width="3" aria-hidden="true" />
                  </span>
                  {{ point }}
                </li>
              </ul>
            </div>

            <!-- Live Ambulance Map Preview Widget -->
            <div class="product-preview relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900" :aria-label="text.previewAria">
              <div class="preview-topbar flex min-h-[60px] items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 dark:border-slate-800 dark:bg-slate-950/80">
                <div class="preview-title flex items-center gap-3">
                  <span class="preview-logo grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950">
                    <Ambulance :size="18" aria-hidden="true" />
                  </span>
                  <div>
                    <strong class="block text-xs font-black leading-none text-slate-950 dark:text-white">{{ text.previewTitle }}</strong>
                    <small class="block mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{{ text.previewSubtitle }}</small>
                  </div>
                </div>
                <span class="live-pill inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true"></span>
                  {{ text.live }}
                </span>
              </div>

              <!-- Map Container Preview -->
              <div class="route-panel p-4">
                <div class="route-heading flex items-center justify-between pb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div>
                    <small class="block text-[10px] text-slate-500 dark:text-slate-400">{{ text.currentRoute }}</small>
                    <strong class="block text-slate-950 dark:text-white">{{ text.crew103 }}</strong>
                  </div>
                  <span class="rounded-lg border border-teal-600/30 bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase text-teal-800 dark:border-teal-400/30 dark:bg-teal-950/60 dark:text-teal-300">{{ text.enRoute }}</span>
                </div>

                <div class="map-canvas relative h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                  <svg viewBox="0 0 520 270" preserveAspectRatio="none" aria-hidden="true" class="h-full w-full">
                    <path class="street stroke-white dark:stroke-slate-900" d="M-20 55 L150 170 L300 90 L540 175" stroke-width="12" fill="none" opacity="0.8" />
                    <path class="street stroke-white dark:stroke-slate-900" d="M40 -20 L205 290" stroke-width="12" fill="none" opacity="0.8" />
                    <path class="street stroke-white dark:stroke-slate-900" d="M250 -20 L350 290" stroke-width="12" fill="none" opacity="0.8" />
                    <path class="street stroke-white dark:stroke-slate-900" d="M-10 220 L540 115" stroke-width="12" fill="none" opacity="0.8" />
                    <path class="route-line stroke-teal-600 dark:stroke-teal-400" d="M46 224 C105 205 115 145 176 154 C249 165 286 92 365 95 C419 96 447 65 484 49" stroke-width="5" stroke-dasharray="8 8" stroke-linecap="round" fill="none" />
                  </svg>

                  <span class="ambulance-pin absolute left-[31%] top-[48%] grid h-10 w-10 place-items-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/40 ring-4 ring-white dark:ring-slate-900">
                    <Ambulance :size="18" aria-hidden="true" />
                  </span>
                  <span class="destination-pin absolute right-[7%] top-[8%] grid h-9 w-9 place-items-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-4 ring-white dark:ring-slate-900">
                    <MapPin :size="17" fill="currentColor" aria-hidden="true" />
                  </span>
                  <div class="eta-card absolute bottom-3 right-3 min-w-[140px] rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                    <small class="block text-[10px] font-bold text-slate-500 dark:text-slate-400">{{ text.eta }}</small>
                    <strong class="mt-0.5 block text-sm font-black text-teal-700 dark:text-cyan-400">8–11 {{ text.minutes }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Key Benefits & Features Grid ("Плюшки") -->
      <section id="features" class="section py-20 transition-colors" aria-labelledby="features-title">
        <div class="section-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="section-heading mx-auto max-w-3xl text-center">
            <p class="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{{ text.featuresKicker }}</p>
            <h2 id="features-title" class="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{{ text.featuresTitle }}</h2>
            <span class="mt-4 block text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ text.featuresBody }}</span>
          </div>

          <div class="feature-grid mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <article v-for="feature in featureItems" :key="feature.title" class="feature-card flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-teal-500/30">
              <div>
                <span class="feature-icon inline-grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                  <component :is="feature.icon" :size="24" aria-hidden="true" />
                </span>
                <h3 class="mt-5 text-base font-black text-slate-950 dark:text-white">{{ feature.title }}</h3>
                <p class="mt-2.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ feature.body }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Simple 3-Step Process -->
      <section id="how-it-works" class="section border-t border-slate-200/80 bg-slate-50/70 py-20 transition-colors dark:border-slate-800/80 dark:bg-slate-950/40" aria-labelledby="workflow-title">
        <div class="section-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div class="section-heading">
              <p class="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{{ text.workflowKicker }}</p>
              <h2 id="workflow-title" class="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{{ text.workflowTitle }}</h2>
              <span class="mt-4 block text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ text.workflowBody }}</span>
            </div>

            <ol class="steps-list space-y-6">
              <li v-for="(step, index) in workflowSteps" :key="step.title" class="relative flex items-start gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900">
                <span class="step-number font-mono text-xs font-extrabold text-teal-600 dark:text-teal-400">0{{ index + 1 }}</span>
                <span class="step-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                  <component :is="step.icon" :size="20" aria-hidden="true" />
                </span>
                <div>
                  <h3 class="text-sm font-black text-slate-950 dark:text-white">{{ step.title }}</h3>
                  <p class="mt-1 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ step.body }}</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <!-- Clear & Simple FAQ -->
      <section id="faq" class="section py-20 transition-colors" aria-labelledby="faq-title">
        <div class="section-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="grid items-start gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div class="section-heading">
              <p class="text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{{ text.faqKicker }}</p>
              <h2 id="faq-title" class="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{{ text.faqTitle }}</h2>
              <span class="mt-4 block text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ text.faqBody }}</span>
            </div>

            <div class="faq-list space-y-4">
              <details v-for="(item, index) in faqItems" :key="item.question" :open="index === 0" class="group rounded-2xl border border-slate-200/90 bg-white p-5 transition-colors dark:border-slate-800 dark:bg-slate-900">
                <summary class="flex cursor-pointer items-center justify-between gap-4 text-sm font-black text-slate-950 select-none dark:text-white">
                  <span>{{ item.question }}</span>
                  <Plus :size="18" class="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p class="mt-3 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{{ item.answer }}</p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <!-- Final Action Banner -->
      <section class="final-cta-wrap px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="cta-title">
        <div class="final-cta mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-gradient-to-r from-teal-800 to-teal-600 p-8 text-white shadow-2xl sm:p-12 md:flex-row md:items-center dark:from-teal-700 dark:to-teal-500">
          <div>
            <p class="text-xs font-black uppercase tracking-widest text-teal-200">{{ text.ctaKicker }}</p>
            <h2 id="cta-title" class="mt-2 text-balance text-3xl font-black tracking-tight text-white sm:text-4xl">{{ text.ctaTitle }}</h2>
            <span class="mt-3 block max-w-2xl text-sm font-medium leading-relaxed text-teal-100">{{ text.ctaBody }}</span>
          </div>
          <RouterLink class="inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-teal-900 shadow-lg transition hover:bg-slate-100" to="/login">
            {{ text.primaryCta }}
            <ArrowRight :size="18" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="site-footer border-t border-slate-200/80 bg-white py-8 transition-colors dark:border-slate-800/80 dark:bg-slate-950">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-3">
          <span class="brand-mark small grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950">
            <HeartPulse :size="16" aria-hidden="true" />
          </span>
          <div>
            <strong class="font-black text-slate-950 dark:text-white">MedTracker</strong>
            <span class="mx-2">•</span>
            <span>{{ text.footer }}</span>
          </div>
        </div>
        <small class="text-[11px] font-bold">© 2026 MedTracker</small>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';
import { RouterLink } from 'vue-router';
import { Ambulance, ArrowRight, Check, ClipboardList, HeartPulse, LogIn, MapPin, MapPinned, PhoneCall, Plus, ShieldCheck, Smartphone } from 'lucide-vue-next';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import type { Language } from '@/i18n/translations';

interface InfoItem { icon: Component; title: string; body: string }

const langStore = useLangStore();

const copy = {
  ru: {
    skip: 'Перейти к содержимому', navigation: 'Навигация', brandHome: 'MedTracker', brandNote: 'отслеживание скорой помощи', login: 'Войти в кабинет',
    navFeatures: 'Возможности', navWorkflow: 'Как работает', navFaq: 'Вопросы',
    eyebrow: 'Сервис отслеживания скорой помощи',
    heroTitlePrefix: 'Отслеживайте скорую помощь',
    heroAccent: 'на карте в реальном времени',
    heroBody: 'Когда к вам или вашим близким едет врач — вы точно знаете, где находится машина, сколько минут осталось до прибытия и можете передать симптомы до прибытия бригады.',
    primaryCta: 'Личный кабинет', secondaryCta: 'Как это работает',
    heroPoints: ['Без установки приложений', 'Точная геопозиция и время прибытия', 'Прямая связь и передача симптомов'],
    previewAria: 'Демонстрация отслеживания машины скорой помощи',
    previewTitle: 'Скорая в пути', previewSubtitle: 'Экипаж №103 · Назначен', live: 'В ПУТИ',
    currentRoute: 'Маршрут бригады', crew103: 'Бригада №103', enRoute: 'Едет к вам', eta: 'Время доезда', minutes: 'мин',
    featuresKicker: 'Всё просто и удобно', featuresTitle: 'Полезные возможности для пациента и клиники', featuresBody: 'Никаких сложных настроек. Только то, что действительно нужно при вызове скорой помощи.',
    workflowKicker: '3 простых шага', workflowTitle: 'Как это работает для пациента', workflowBody: 'От вызова скорой до приезда врачей — вы всегда в курсе происходящего.',
    faqKicker: 'Частые вопросы', faqTitle: 'Всё, что важно знать', faqBody: 'Ответы на самые популярные вопросы о работе сервиса.',
    ctaKicker: 'Будьте спокойны за близких', ctaTitle: 'Всегда знайте, когда приедет помощь', ctaBody: 'Заходите в личный кабинет клиники или отслеживайте статус вашего вызова.', footer: 'сервис прозрачного отслеживания скорой медицинской помощи'
  },
  kk: {
    skip: 'Мазмұнға өту', navigation: 'Навигация', brandHome: 'MedTracker', brandNote: 'жедел жәрдемді бақылау', login: 'Кабинетке кіру',
    navFeatures: 'Мүмкіндіктер', navWorkflow: 'Қалай жұмыс істейді', navFaq: 'Сұрақтар',
    eyebrow: 'Жедел жәрдемді бақылау сервисі',
    heroTitlePrefix: 'Жедел жәрдемді картада',
    heroAccent: 'нақты уақытта бақылаңыз',
    heroBody: 'Дәрігер жолда келе жатқанда — сіз машинаның қайда екенін, келуге қанша минут қалғанын нақты білесіз және симптомдарды алдын ала жібере аласыз.',
    primaryCta: 'Жеке кабинет', secondaryCta: 'Қалай жұмыс істейді',
    heroPoints: ['Қосымша орнату қажет емес', 'Нақты геопозиция және келу уақыты', 'Тікелей байланыс және симптомдарды жіберу'],
    previewAria: 'Жедел жәрдемнің қозғалысын көрсету',
    previewTitle: 'Жедел жәрдем жолда', previewSubtitle: '№103 бригада · Тағайындалды', live: 'ЖОЛДА',
    currentRoute: 'Бригада бағыты', crew103: '№103 бригада', enRoute: 'Сізге келе жатыр', eta: 'Келу уақыты', minutes: 'мин',
    featuresKicker: 'Қарапайым әрі ынғайлы', featuresTitle: 'Пациент пен клиникаға арналған пайдалы мүмкіндіктер', featuresBody: 'Күрделі баптауларсыз. Тек жедел жәрдем шақыруда шынымен қажет нәрселер.',
    workflowKicker: '3 қарапайым қадам', workflowTitle: 'Пациент үшін қалай жұмыс істейді', workflowBody: 'Шақырудан дәрігерлер келгенге дейін — сіз әрдайым хабардарсыз.',
    faqKicker: 'Жиі қойылатын сұрақтар', faqTitle: 'Білу маңызды барлық нәрсе', faqBody: 'Сервис жұмысы туралы ең танымал сұрақтарға жауаптар.',
    ctaKicker: 'Жақындарыңыз үшін аман болыңыз', ctaTitle: 'Көмектің қашан келетінін әрдайым біліңіз', ctaBody: 'Клиниканың жеке кабинетіне кіріңіз немесе шақыру мәртебесін бақылаңыз.', footer: 'жедел медициналық көмекті ашық бақылау сервисі'
  },
  en: {
    skip: 'Skip to content', navigation: 'Navigation', brandHome: 'MedTracker', brandNote: 'ambulance tracking service', login: 'Sign in',
    navFeatures: 'Features', navWorkflow: 'How it works', navFaq: 'FAQ',
    eyebrow: 'Ambulance Live Tracking Service',
    heroTitlePrefix: 'Track your ambulance',
    heroAccent: 'on the map in real time',
    heroBody: 'When help is on the way, know exactly where the ambulance is, estimated arrival time, and send important symptoms to the doctors before they arrive.',
    primaryCta: 'Open Workspace', secondaryCta: 'How it works',
    heroPoints: ['No app installation needed', 'Live GPS location & arrival time', 'Direct call & symptom notes'],
    previewAria: 'Ambulance live tracking preview',
    previewTitle: 'Ambulance En Route', previewSubtitle: 'Crew #103 · Assigned', live: 'EN ROUTE',
    currentRoute: 'Ambulance Route', crew103: 'Crew #103', enRoute: 'Heading to you', eta: 'Arrival Time', minutes: 'min',
    featuresKicker: 'Simple & Intuitive', featuresTitle: 'Essential Features for Patients & Clinics', featuresBody: 'No jargon. Only what truly matters during an ambulance call.',
    workflowKicker: '3 Simple Steps', workflowTitle: 'How It Works for Patients', workflowBody: 'Stay informed from the moment you call until the doctors arrive.',
    faqKicker: 'Frequently Asked Questions', faqTitle: 'Everything You Need to Know', faqBody: 'Clear answers to common questions about our service.',
    ctaKicker: 'Peace of mind for your loved ones', ctaTitle: 'Always Know When Help Will Arrive', ctaBody: 'Sign into the clinic workspace or follow your ambulance in real time.', footer: 'transparent field-care tracking service'
  }
} satisfies Record<Language, Record<string, string | string[]>>;

const text = computed(() => copy[langStore.currentLang]);

const features = {
  ru: [
    ['Карта и время прибытия', 'Смотрите, где находится машина скорой помощи прямо сейчас и через сколько минут она будет у вашего дома.'],
    ['Передача симптомов и деталей', 'Укажите код домофона, этаж и симптомы, чтобы медицинская бригада приехала полностью подготовленной.'],
    ['Без установки приложений', 'Пациенту не нужно ничего скачивать. Карта открывается по обычной ссылке из SMS или WhatsApp в браузере.'],
    ['Экстренная связь и SOS', 'В любой момент можно позвонить в клинику в 1 клик или подать сигнал SOS при ухудшении самочувствия.']
  ],
  kk: [
    ['Карта және келу уақыты', 'Жедел жәрдем машинасының дәл қазір қайда екенін және үйіңізге қанша минутта жететінін бақылаңыз.'],
    ['Симптомдар мен мәліметтерді жіберу', 'Домофон кодын, қабатты және белгілерді енгізіңіз, сонда бригада толық дайындалып келеді.'],
    ['Қосымша орнатусыз', 'Пациентке ештеңе жүктеу қажет емес. Карта SMS немесе WhatsApp сілтемесі арқылы браузерде ашылады.'],
    ['Шұғыл байланыс және SOS', 'Кез келген уақытта клиникаға 1 басу арқылы қоңырау шалуға немесе жағдай нашарласа SOS сигналын жіберуге болады.']
  ],
  en: [
    ['Live Map & Arrival ETA', 'See the live location of the ambulance and exact estimated arrival time on a map.'],
    ['Share Symptoms & Access Info', 'Provide intercom codes, floor numbers, and symptom notes so doctors arrive fully prepared.'],
    ['No App Installation Needed', 'No registration required for patients. Opens instantly from an SMS or WhatsApp link in any browser.'],
    ['Direct Call & Emergency SOS', 'Call dispatch in one tap or press the SOS button if the patient\'s condition deteriorates.']
  ]
} as const;
const featureIcons = [MapPinned, ClipboardList, Smartphone, ShieldCheck];
const featureItems = computed<InfoItem[]>(() => features[langStore.currentLang].map((item, index) => ({ icon: featureIcons[index], title: item[0], body: item[1] })));

const steps = {
  ru: [
    ['Вызвали скорую помощь', 'Вы звоните в клинику — вам приходит удобная SMS-ссылка на отслеживание вашей машины.'],
    ['Смотрите движение на карте', 'Открываете ссылку и видите, где сейчас едет бригада и сколько минут осталось до прибытия.'],
    ['Встречаете врачей', 'Можете дополнить симптомы или код домофона, чтобы врачи сразу поднялись к вам без задержек.']
  ],
  kk: [
    ['Жедел жәрдем шақырдыңыз', 'Клиникаға қоңырау шаласыз — сізге машинаны бақылауға арналған ынғайлы SMS-сілтеме келеді.'],
    ['Картада қозғалысты бақылайсыз', 'Сілтемені ашып, бригаданың қайда келе жатқанын және келуге қанша минут қалғанын көресіз.'],
    ['Дәрігерлерді қарсы аласыз', 'Дәрігерлер кідіріссіз көтерілуі үшін симптомдарды немесе домофон кодын қоса аласыз.']
  ],
  en: [
    ['Call the ambulance', 'After contacting the clinic, you receive a SMS link to track your assigned vehicle.'],
    ['Watch the live map', 'Open the link to see the live ambulance movement and estimated arrival time.'],
    ['Meet the medical team', 'Optionally add intercom codes or symptom updates so the team can reach you without delay.']
  ]
} as const;
const stepIcons = [PhoneCall, Ambulance, Check];
const workflowSteps = computed<InfoItem[]>(() => steps[langStore.currentLang].map((item, index) => ({ icon: stepIcons[index], title: item[0], body: item[1] })));

const faqs = {
  ru: [
    ['Пациенту нужно скачивать приложение?', 'Нет. Ссылка на отслеживание открывается в обычном мобильном браузере на любом телефоне.'],
    ['Как передать код домофона или симптомы?', 'На странице отслеживания есть удобный блок, где можно в 1 клик дополнить адрес и симптомы для врача.'],
    ['Это бесплатно для пациента?', 'Да. Отслеживание и все функции сервиса предоставляются пациентам клиники бесплатно.']
  ],
  kk: [
    ['Пациентке қосымшаны жүктеу керек пе?', 'Жоқ. Бақылау сілтемесі кез келген телефонда әдеттегі мобильді браузерде ашылады.'],
    ['Домофон кодын немесе симптомдарды қалай жіберуге болады?', 'Бақылау бетінде дәрігерге мекенжай мен симптомдарды 1 басу арқылы толықтыруға арналған ынғайлы блок бар.'],
    ['Бұл пациент үшін тегін бе?', 'Иә. Бақылау және сервистің барлық функциялары клиника пациенттеріне тегін ұсынылады.']
  ],
  en: [
    ['Does the patient need to download an app?', 'No. The tracking link opens instantly in any standard mobile browser on any phone.'],
    ['How do I share intercom codes or symptoms?', 'The tracking screen includes a simple form where you can add access details or symptom updates in one tap.'],
    ['Is it free for patients?', 'Yes. Live tracking and all patient features are provided completely free of charge.']
  ]
} as const;
const faqItems = computed(() => faqs[langStore.currentLang].map(item => ({ question: item[0], answer: item[1] })));
</script>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .feature-card,
  .skip-link,
  .live-pill span {
    transition: none;
    animation: none;
  }
}
</style>
