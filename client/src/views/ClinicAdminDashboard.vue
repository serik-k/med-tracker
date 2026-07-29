<template>
  <div class="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 antialiased">
    <!-- Header Navigation -->
    <header class="sticky top-0 z-40 bg-[#090d16]/90 border-b border-slate-800/80 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Clinic Context -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Building2 class="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-extrabold text-white">{{ auth.user?.clinicName }}</h1>
              <span class="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono font-bold uppercase">
                Fleet Management
              </span>
            </div>
            <p class="text-xs text-slate-400">Управление автопарком и сминами бригад</p>
          </div>
        </div>

        <!-- Right Quick Actions -->
        <div class="flex items-center gap-3">
          <button
            @click="router.push('/dispatcher')"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition-all cursor-pointer"
          >
            <Headphones class="w-4 h-4 text-emerald-400" />
            <span>Диспетчерская</span>
          </button>

          <button
            @click="logout"
            class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Главная страница"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Telematics KPI Scorecards (Senior UX Design) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between shadow-xl backdrop-blur-xl hover:border-emerald-500/30 transition-all">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Машин в автопарке</div>
            <div class="text-3xl font-black text-white mt-1 font-mono">{{ crewStore.crews.length }}</div>
            <div class="text-[11px] text-slate-500 mt-1">Всего зарегистрировано</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Ambulance class="w-6 h-6" />
          </div>
        </div>

        <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between shadow-xl backdrop-blur-xl hover:border-teal-500/30 transition-all">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">На дежурстве</div>
            <div class="text-3xl font-black text-emerald-400 mt-1 font-mono">
              {{ crewStore.crews.filter(c => c.status === 'ON_DUTY').length }}
            </div>
            <div class="text-[11px] text-emerald-400/80 mt-1">Готовы к приему вызовов</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 class="w-6 h-6" />
          </div>
        </div>

        <div class="p-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between shadow-xl backdrop-blur-xl hover:border-cyan-500/30 transition-all">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Реанимация / Спецсмены</div>
            <div class="text-3xl font-black text-cyan-400 mt-1 font-mono">
              {{ crewStore.crews.filter(c => c.type === 'РЕАНИМАЦИЯ').length }}
            </div>
            <div class="text-[11px] text-cyan-400/80 mt-1">Оснащены ИВЛ и мониторами</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShieldAlert class="w-6 h-6" />
          </div>
        </div>
      </div>

      <ClinicTeamCard />

      <!-- Fleet Crew Management Section -->
      <div class="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
        
        <!-- Header & Search Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <h2 class="text-lg font-black text-white flex items-center gap-2">
              <Users class="w-5 h-5 text-emerald-400" />
              <span>Реестр Бригад и Автомобилей</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Управление доступным автопарком для диспетчерской службы</p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Search Filter -->
            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Поиск экипажа или госномера..."
                class="pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-emerald-400 w-48 sm:w-64"
              />
            </div>

            <!-- Add Crew Button -->
            <button
              @click="openAddModal"
              class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
            >
              <Plus class="w-4 h-4" />
              <span>Добавить Бригаду</span>
            </button>
          </div>
        </div>

        <!-- Crews Data Table -->
        <div class="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-950/90 text-slate-400 uppercase font-mono font-bold border-b border-slate-800/80 text-[11px]">
              <tr>
                <th class="p-4">Позывной Экипажа</th>
                <th class="p-4">Гос. Номер</th>
                <th class="p-4">Тип Медицинской Смены</th>
                <th class="p-4">Водитель / Врач</th>
                <th class="p-4">Статус</th>
                <th class="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 bg-slate-900/40">
              <tr v-for="crew in filteredCrews" :key="crew.id" class="hover:bg-slate-800/50 transition-colors">
                <td class="p-4 font-extrabold text-white flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 shrink-0">
                    <Ambulance class="w-4 h-4" />
                  </div>
                  <span>{{ crew.name }}</span>
                </td>

                <td class="p-4 font-mono text-slate-200">
                  <span class="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-xs">
                    {{ crew.carPlate }}
                  </span>
                </td>

                <td class="p-4">
                  <span
                    :class="[
                      'px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider',
                      crew.type === 'РЕАНИМАЦИЯ' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      crew.type === 'ПЕДИАТРИЧЕСКАЯ' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    ]"
                  >
                    {{ crew.type }}
                  </span>
                </td>

                <td class="p-4 text-slate-200 font-semibold">{{ crew.driverName }}</td>

                <td class="p-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>На дежурстве</span>
                  </span>
                </td>

                <td class="p-4 text-right space-x-2">
                  <button
                    @click="copyDriverLink(crew.id)"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all text-[11px] font-bold cursor-pointer"
                  >
                    {{ copiedCrewId === crew.id ? 'Ссылка скопирована' : 'Ссылка водителю' }}
                  </button>
                  <button
                    @click="openDeleteModal(crew)"
                    class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                    title="Удалить из реестра"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Modal for Adding New Crew -->
    <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 class="text-base font-extrabold text-white">Добавить новую бригаду</h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-white font-bold">✕</button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-400 mb-1">Позывной экипажа</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Например: Бригада №104"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">Гос. Номер автомобиля</label>
            <input
              v-model="form.carPlate"
              type="text"
              placeholder="02 KZ 888 MED"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-400 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">Тип медицинской бригады</label>
            <CustomSelect
              v-model="form.type"
              :options="crewTypeOptions"
              theme="dark"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-400 mb-1">ФИО Водителя / Старшего врача</label>
            <input
              v-model="form.driverName"
              type="text"
              placeholder="Мусинов А."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-400"
            />
          </div>

        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-slate-800">
          <p v-if="formError" class="mr-auto self-center text-xs text-red-400">{{ formError }}</p>
          <button
            @click="showModal = false"
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
          >
            Отмена
          </button>
          <button
            @click="saveCrew"
            :disabled="saving"
            class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {{ saving ? 'Сохранение...' : 'Сохранить бригаду' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Crew Confirmation -->
    <div
      v-if="crewToDelete"
      class="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
      @click.self="closeDeleteModal"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div class="flex items-start justify-between gap-4">
          <div class="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-6 h-6 text-red-400" />
          </div>
          <button
            @click="closeDeleteModal"
            :disabled="deleting"
            class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <h3 class="mt-5 text-lg font-black text-white">Удалить бригаду?</h3>
        <p class="mt-2 text-sm leading-6 text-slate-400">
          Бригада <span class="font-bold text-slate-200">{{ crewToDelete.name }}</span> будет удалена из реестра автопарка.
        </p>
        <p v-if="deleteError" class="mt-3 text-xs text-red-400">{{ deleteError }}</p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="closeDeleteModal"
            :disabled="deleting"
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            @click="confirmDeleteCrew"
            :disabled="deleting"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 class="w-4 h-4" />
            {{ deleting ? 'Удаление...' : 'Удалить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCrewStore } from '../stores/crewStore';
import { useAuthStore } from '@/stores/authStore';
import CustomSelect, { type SelectOption } from '../components/ui/CustomSelect.vue';
import type { Crew } from '../types';
import { apiFetch } from '@/services/api';
import ClinicTeamCard from '@/components/ClinicTeamCard.vue';
import {
  Building2,
  Headphones,
  LogOut,
  Ambulance,
  CheckCircle2,
  ShieldAlert,
  Users,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  X
} from 'lucide-vue-next';

const router = useRouter();
const crewStore = useCrewStore();
const auth = useAuthStore();

const showModal = ref(false);
const searchQuery = ref('');
const formError = ref('');
const saving = ref(false);
const crewToDelete = ref<Crew | null>(null);
const deleting = ref(false);
const deleteError = ref('');
const copiedCrewId = ref('');

const crewTypeOptions: SelectOption[] = [
  { value: 'ЛИНЕЙНАЯ', label: 'ЛИНЕЙНАЯ (Стандарт)' },
  { value: 'РЕАНИМАЦИЯ', label: 'РЕАНИМАЦИЯ (ИВЛ / ОРИТ)' },
  { value: 'ПЕДИАТРИЧЕСКАЯ', label: 'ПЕДИАТРИЧЕСКАЯ' }
];

const form = ref({
  name: '',
  carPlate: '',
  type: 'ЛИНЕЙНАЯ',
  driverName: ''
});

onMounted(() => {
  crewStore.fetchCrews();
});

const filteredCrews = computed(() => {
  if (!searchQuery.value.trim()) return crewStore.crews;
  const q = searchQuery.value.toLowerCase();
  return crewStore.crews.filter(
    c => c.name.toLowerCase().includes(q) || c.carPlate.toLowerCase().includes(q) || c.driverName.toLowerCase().includes(q)
  );
});

function openAddModal() {
  const nextNum = Math.floor(104 + crewStore.crews.length);
  form.value = {
    name: `Бригада №${nextNum}`,
    carPlate: `02 KZ ${nextNum} MED`,
    type: 'ЛИНЕЙНАЯ',
    driverName: 'Касымов Р.'
  };
  formError.value = '';
  showModal.value = true;
}

async function saveCrew() {
  formError.value = '';
  if (Object.values(form.value).some(value => !value.trim())) {
    formError.value = 'Заполните все поля';
    return;
  }
  saving.value = true;
  try {
    await crewStore.addCrew({
      name: form.value.name.trim(),
      carPlate: form.value.carPlate.trim(),
      type: form.value.type,
      driverName: form.value.driverName.trim(),
      status: 'ON_DUTY'
    });
    showModal.value = false;
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Не удалось сохранить бригаду';
  } finally {
    saving.value = false;
  }
}

function openDeleteModal(crew: Crew) {
  crewToDelete.value = crew;
  deleteError.value = '';
}

function closeDeleteModal() {
  if (deleting.value) return;
  crewToDelete.value = null;
  deleteError.value = '';
}

async function confirmDeleteCrew() {
  if (!crewToDelete.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await crewStore.deleteCrew(crewToDelete.value.id);
    crewToDelete.value = null;
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Не удалось удалить бригаду';
  } finally {
    deleting.value = false;
  }
}

async function copyDriverLink(crewId: string) {
  const res = await apiFetch(`/api/crews/${crewId}/access-link`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) return alert(data.error || 'Не удалось создать ссылку');
  await navigator.clipboard.writeText(`${location.origin}${data.path}`);
  copiedCrewId.value = crewId;
  window.setTimeout(() => { copiedCrewId.value = ''; }, 2500);
}

async function logout() {
  await auth.logout();
  router.replace('/login');
}
</script>
