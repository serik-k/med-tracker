<template>
  <div class="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
    <!-- Background Glows -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[160px] rounded-full pointer-events-none"></div>

    <div class="w-full max-w-lg bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative z-10">
      
      <!-- Back Navigation -->
      <button
        @click="router.push('/')"
        class="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft class="w-4 h-4 text-emerald-400" />
        <span>Вернуться на главную</span>
      </button>

      <!-- Brand Header -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-3">
          <Activity class="w-7 h-7 text-slate-950 stroke-[2.5]" />
        </div>
        <h1 class="text-2xl font-black tracking-tight text-white">Вход в MedTracker</h1>
        <p class="text-xs text-slate-400 mt-1">Выберите вашу роль для доступа к рабочей панели клиники</p>
      </div>

      <!-- Role Tabs Selection -->
      <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
        <button
          v-for="roleItem in roles"
          :key="roleItem.id"
          @click="selectedRole = roleItem.id"
          :class="[
            'py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer',
            selectedRole === roleItem.id
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200'
          ]"
        >
          <component :is="roleItem.icon" class="w-4 h-4" />
          <span>{{ roleItem.title }}</span>
        </button>
      </div>

      <!-- Selected Role Summary Banner -->
      <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 flex items-center gap-4">
        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', activeRoleMeta.bg]">
          <component :is="activeRoleMeta.icon" :class="['w-5 h-5', activeRoleMeta.textColor]" />
        </div>
        <div>
          <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Текущий доступ:</div>
          <div class="text-sm font-black text-white">{{ activeRoleMeta.name }}</div>
          <div class="text-[11px] text-slate-400">{{ activeRoleMeta.desc }}</div>
        </div>
      </div>

      <!-- Driver Specific Input -->
      <div v-if="selectedRole === 'driver'" class="mb-6 space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1.5">Номер экипажа / машины</label>
          <input
            v-model="driverCrewId"
            type="text"
            placeholder="Например: 103"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400 font-mono"
          />
        </div>
        <div class="flex items-center gap-2 text-[11px] text-slate-400">
          <span>Быстрый выбор:</span>
          <button @click="driverCrewId = '101'" class="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:text-white font-mono">№101</button>
          <button @click="driverCrewId = '102'" class="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:text-white font-mono">№102</button>
          <button @click="driverCrewId = '103'" class="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-800 hover:text-white font-mono">№103</button>
        </div>
      </div>

      <!-- Enter System Button -->
      <button
        @click="handleLogin"
        class="w-full py-4 px-4 rounded-2xl font-black bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 transition-all shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2 text-sm"
      >
        <span>Войти в рабочую панель</span>
        <LogIn class="w-4 h-4" />
      </button>

      <!-- Footer Info -->
      <div class="mt-6 text-center text-[11px] text-slate-500">
        Личный кабинет доступен только авторизованным сотрудникам клиники.
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, type UserRole } from '../stores/authStore';
import { Activity, ArrowLeft, Building2, Headphones, Ambulance, LogIn } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

type ActiveRole = 'admin' | 'dispatcher' | 'driver';

const selectedRole = ref<ActiveRole>('dispatcher');
const driverCrewId = ref('103');

const roles = [
  { id: 'dispatcher' as ActiveRole, title: 'Диспетчер', icon: Headphones },
  { id: 'admin' as ActiveRole, title: 'Админка', icon: Building2 },
  { id: 'driver' as ActiveRole, title: 'Водитель', icon: Ambulance }
];

const activeRoleMeta = computed(() => {
  if (selectedRole.value === 'admin') {
    return {
      name: 'Администратор Клиники',
      desc: 'Управление автопарком, вызовами и реестром бригад',
      icon: Building2,
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      textColor: 'text-emerald-400'
    };
  }
  if (selectedRole.value === 'driver') {
    return {
      name: `Водитель Экипажа №${driverCrewId.value || '103'}`,
      desc: 'Мобильный PWA-интерфейс, 1-click статусы и навигация',
      icon: Ambulance,
      bg: 'bg-cyan-500/10 border-cyan-500/30',
      textColor: 'text-cyan-400'
    };
  }
  return {
    name: 'Диспетчер Оперативной Смены',
    desc: 'Генерация вызовов, WhatsApp интеграция, живая карта',
    icon: Headphones,
    bg: 'bg-teal-500/10 border-teal-500/30',
    textColor: 'text-teal-400'
  };
});

function handleLogin() {
  if (!selectedRole.value) return;
  authStore.login(selectedRole.value, undefined, driverCrewId.value);

  if (selectedRole.value === 'admin') {
    router.push('/admin');
  } else if (selectedRole.value === 'dispatcher') {
    router.push('/dispatcher');
  } else if (selectedRole.value === 'driver') {
    router.push(`/driver/${driverCrewId.value || '103'}`);
  }
}
</script>
