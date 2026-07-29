<template>
  <div class="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 antialiased">
    <!-- Top Bar -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-[#0b0f19]/85 border-b border-slate-800/60">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo -->
        <div class="flex items-center gap-3 cursor-pointer select-none" @click="router.push('/')">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity class="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span class="text-xl font-extrabold tracking-tight text-white">MedTracker</span>
        </div>

        <!-- Language & Actions -->
        <div class="flex items-center gap-3">
          <!-- Language Selector -->
          <div class="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              v-for="lang in ['ru', 'kk', 'en']"
              :key="lang"
              @click="langStore.setLanguage(lang as any)"
              :class="[
                'px-2.5 py-1 rounded-lg transition-all uppercase',
                langStore.currentLang === lang ? 'bg-emerald-500 text-slate-950 shadow-sm font-black' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              {{ lang }}
            </button>
          </div>

          <button
            @click="router.push('/login')"
            class="flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <LogIn class="w-3.5 h-3.5" />
            <span>Вход в систему</span>
          </button>
        </div>

      </div>
    </header>

    <!-- Hero Section: Ultra-focused, concise copywriting -->
    <section class="pt-16 pb-20 md:pt-24 md:pb-28 relative">
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div class="max-w-5xl mx-auto px-4 text-center space-y-6 relative z-10">
        
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Система отслеживания скорой помощи для клиник</span>
        </div>

        <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
          Пациент видит скорую на карте <br class="hidden sm:inline" />
          <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            прямо из сообщения WhatsApp
          </span>
        </h1>

        <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Без скачивания приложений. Диспетчер отправляет сгораемую ссылку, а пациент спокойно отслеживает прибытие врача в реальном времени.
        </p>

        <!-- Direct Actions -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            @click="router.push('/login')"
            class="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 text-sm font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer"
          >
            <Building2 class="w-5 h-5" />
            <span>Кабинет Клиники</span>
            <ArrowRight class="w-4 h-4" />
          </button>

          <button
            @click="router.push('/dispatcher')"
            class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all cursor-pointer"
          >
            <Monitor class="w-5 h-5 text-emerald-400" />
            <span>Диспетчерская</span>
          </button>
        </div>

      </div>
    </section>

    <!-- How It Works: 3 Simple Steps -->
    <section class="py-16 bg-slate-900/40 border-y border-slate-800/60">
      <div class="max-w-6xl mx-auto px-4">
        
        <div class="text-center max-w-xl mx-auto mb-12">
          <h2 class="text-2xl font-black text-white">Как это работает?</h2>
          <p class="text-xs text-slate-400 mt-1">Простой процесс из 3 шагов для клиники и пациента</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- Step 1 -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 relative space-y-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              01
            </div>
            <h3 class="text-base font-bold text-white">1. Диспетчер создает вызов</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Оператор вбивает адрес вызова и выбирает свободную бригаду скорой помощи.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 relative space-y-3">
            <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono font-bold text-xs flex items-center justify-center">
              02
            </div>
            <h3 class="text-base font-bold text-white">2. Ссылка в WhatsApp</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Пациент мгновенно получает ссылку на отслеживание без скачивания приложений.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 relative space-y-3">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center">
              03
            </div>
            <h3 class="text-base font-bold text-white">3. Трекинг и Сгорание</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Пациент видит движение машины на карте. После приезда ссылка автоматически сгорает.
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- Interactive Screen Previews (3 Clean Tabs) -->
    <section class="py-16">
      <div class="max-w-5xl mx-auto px-4">
        
        <div class="text-center mb-8">
          <h2 class="text-2xl font-black text-white">Интерфейсы системы</h2>
          <p class="text-xs text-slate-400 mt-1">Кликните, чтобы посмотреть каждый рабочий кабинет</p>
        </div>

        <!-- Tabs -->
        <div class="flex justify-center gap-2 mb-6">
          <button
            v-for="t in tabs"
            :key="t.id"
            @click="activeTab = t.id as any"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTab === t.id ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            ]"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- Showcase Box -->
        <div class="rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
          
          <div v-if="activeTab === 'dispatcher'" class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="text-sm font-bold text-white">Пульт Диспетчера Смены</h3>
                <p class="text-xs text-slate-400">Генерация ссылок, карта автопарка, триаж вызовов</p>
              </div>
              <button @click="router.push('/dispatcher')" class="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400">
                Открыть Диспетчерскую
              </button>
            </div>
            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-white">Вызов #7701 • Алексей М.</span>
                <div class="text-slate-400 text-[11px] mt-0.5">пр. Аль-Фараби, 77 • Бригада №103</div>
              </div>
              <span class="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold">В пути</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'driver'" class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="text-sm font-bold text-white">Интерфейс Водителя Скорой</h3>
                <p class="text-xs text-slate-400">Переключение статусов в 1 клик и прокладка маршрута</p>
              </div>
              <button @click="router.push('/login')" class="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400">
                Получить ссылку у диспетчера
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs text-center font-bold">
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">1. В пути к пациенту</div>
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">2. Прибыл на место</div>
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="text-sm font-bold text-white">Кабинет Клиники и Автопарк</h3>
                <p class="text-xs text-slate-400">Управление машинами, дежурными бригадами и водителями</p>
              </div>
              <button @click="router.push('/admin')" class="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400">
                Открыть Реестр Автопарка
              </button>
            </div>
            <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
              <span>Реестр автопарка (Бригады №101, №102, №103)</span>
              <span class="px-2 py-1 rounded bg-teal-500/10 text-teal-400 font-bold">Активны</span>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- Key Metrics for Business -->
    <section class="py-12 bg-slate-900/40 border-t border-slate-800/60">
      <div class="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-4 text-center">
        <div class="p-4">
          <div class="text-3xl font-black text-emerald-400">-70%</div>
          <div class="text-xs text-slate-400 mt-1">Повторных звонков диспетчеру</div>
        </div>
        <div class="p-4">
          <div class="text-3xl font-black text-white">0 мин</div>
          <div class="text-xs text-slate-400 mt-1">Установки приложений пациентом</div>
        </div>
        <div class="p-4">
          <div class="text-3xl font-black text-cyan-400">100%</div>
          <div class="text-xs text-slate-400 mt-1">Сгорание ссылок (Безопасность)</div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
      <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>© 2026 MedTracker • Система трекинга скорой помощи</div>
        <div class="flex items-center gap-4 font-semibold">
          <button @click="router.push('/login')" class="hover:text-slate-300">Кабинет Клиники</button>
          <button @click="router.push('/dispatcher')" class="hover:text-slate-300">Диспетчерская</button>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLangStore } from '../stores/langStore';
import { Activity, LogIn, Building2, ArrowRight, Monitor } from 'lucide-vue-next';

const router = useRouter();
const langStore = useLangStore();

const activeTab = ref<'dispatcher' | 'driver' | 'admin'>('dispatcher');

const tabs = [
  { id: 'dispatcher', label: 'Диспетчерская' },
  { id: 'driver', label: 'Водитель скорой' },
  { id: 'admin', label: 'Кабинет клиники' }
];
</script>
