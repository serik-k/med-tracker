<template>
  <div class="min-h-svh bg-[#f4f7fa] text-slate-950 transition-colors dark:bg-[#07111f] dark:text-slate-100">
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-900/95">
      <div class="mx-auto flex min-h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-teal-300 shadow-sm dark:bg-slate-800">
            <Building2 class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <h1 class="truncate text-sm font-black text-slate-950 dark:text-slate-100">MedTracker Platform</h1>
            <p class="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Супер-Администратор Платформы</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            ref="passwordTrigger"
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-teal-500/30"
            @click="openPasswordDialog"
          >
            <KeyRound class="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span class="hidden md:inline">Сменить пароль</span>
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-teal-500/30"
            @click="logout"
          >
            <LogOut class="h-4 w-4" />
            <span class="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
      <!-- Top Banner -->
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800/90 dark:bg-slate-900/80 dark:shadow-2xl sm:p-8">
        <div class="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div class="max-w-3xl">
            <p class="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">Platform Control Center</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Медицинские организации</h2>
            <p class="mt-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">Централизованный реестр клиник. Управление статусом доступа, контактами и учетными записями владельцев.</p>
          </div>
          <button
            ref="createTrigger"
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
            @click="openCreate"
          >
            <Plus class="h-4 w-4" />
            Добавить клинику
          </button>
        </div>
        <dl class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-950/60">
            <dt class="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Всего клиник</dt>
            <dd class="mt-2 text-3xl font-black text-slate-950 dark:text-white">{{ clinics.length }}</dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-950/60">
            <dt class="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Активные</dt>
            <dd class="mt-2 text-3xl font-black text-teal-700 dark:text-teal-400">{{ activeCount }}</dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-950/60">
            <dt class="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Приостановлены / Пробный</dt>
            <dd class="mt-2 text-3xl font-black" :class="attentionCount ? 'text-amber-600 dark:text-amber-400' : 'text-slate-950 dark:text-white'">{{ attentionCount }}</dd>
          </div>
        </dl>
      </section>

      <!-- Registry Section -->
      <section class="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900" aria-labelledby="clinic-list-title">
        <div class="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="clinic-list-title" class="text-lg font-black text-slate-950 dark:text-slate-100">Реестр подключённых организаций</h2>
            <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Контроль доступа к платформе в реальном времени</p>
          </div>
          <label class="relative block w-full sm:max-w-sm">
            <span class="sr-only">Поиск организаций</span>
            <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              v-model.trim="query"
              type="search"
              placeholder="Поиск по названию, БИН или городу..."
              class="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-teal-400"
            />
          </label>
        </div>

        <div v-if="loading" class="grid min-h-64 place-items-center" role="status">
          <div class="text-center">
            <LoaderCircle class="mx-auto h-7 w-7 animate-spin text-teal-700 dark:text-teal-400" />
            <p class="mt-3 text-sm font-bold text-slate-600 dark:text-slate-400">Загружаем список организаций…</p>
          </div>
        </div>
        <div v-else-if="loadError" class="m-5 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">
          <div class="flex gap-2">
            <CircleAlert class="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 class="font-black">Не удалось загрузить данные</h3>
              <p class="mt-1 text-sm font-medium">{{ loadError }}</p>
            </div>
          </div>
          <button type="button" class="min-h-10 rounded-lg bg-red-700 px-4 text-xs font-black text-white dark:bg-red-600" @click="load">Повторить</button>
        </div>
        <div v-else-if="!filteredClinics.length" class="grid min-h-64 place-items-center p-6 text-center">
          <div>
            <SearchX class="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
            <h3 class="mt-3 font-black text-slate-950 dark:text-slate-100">Организации не найдены</h3>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Измените запрос или добавьте новую клинику.</p>
          </div>
        </div>

        <div v-else class="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="clinic in filteredClinics" :key="clinic.id" class="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-within:z-30 hover:z-20 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700">
            <div class="flex items-start justify-between gap-3">
              <span class="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                <Hospital class="h-5 w-5" />
              </span>
              <span class="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase" :class="statusClass(clinic.status)">
                {{ statusLabel(clinic.status) }}
              </span>
            </div>
            <h3 class="mt-5 truncate text-lg font-black tracking-tight text-slate-950 dark:text-slate-100">{{ clinic.name }}</h3>
            <p class="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{{ clinic.legalName }}</p>
            
            <div class="mt-4">
              <CustomSelect v-model="clinic.status" label="Статус организации" :options="statusSelectOptions" />
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <div>
                <dt class="font-semibold text-slate-500 dark:text-slate-400">БИН</dt>
                <dd class="mt-1 font-mono font-black text-slate-950 dark:text-slate-100">{{ clinic.bin }}</dd>
              </div>
              <div>
                <dt class="font-semibold text-slate-500 dark:text-slate-400">Город</dt>
                <dd class="mt-1 font-black text-slate-950 dark:text-slate-100">{{ clinic.city }}</dd>
              </div>
            </dl>

            <label class="mt-4 block text-[11px] font-black text-slate-700 dark:text-slate-300">
              Контактный телефон диспетчера
              <input
                v-model.trim="clinic.contactPhone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                required
                class="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400"
              />
            </label>

            <p v-if="rowErrors[clinic.id]" class="mt-3 text-xs font-bold text-red-700 dark:text-red-400" role="alert">{{ rowErrors[clinic.id] }}</p>
            
            <button
              type="button"
              :disabled="updatingId === clinic.id"
              class="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-600/30 bg-teal-50 px-4 text-xs font-black text-teal-800 transition-all hover:bg-teal-100 focus-visible:ring-4 focus-visible:ring-teal-500/20 disabled:opacity-60 dark:border-teal-500/30 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
              @click="requestSaveClinic(clinic)"
            >
              <LoaderCircle v-if="updatingId === clinic.id" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              {{ updatingId === clinic.id ? 'Сохраняем…' : 'Сохранить изменения' }}
            </button>
          </article>
        </div>
      </section>
    </main>

    <!-- Create Clinic Modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" @click.self="closeCreate" @keydown.esc="closeCreate" @keydown.tab="trapFocus">
      <form ref="createDialog" class="my-6 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="create-clinic-title" @submit.prevent="createClinic">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">Новая организация</p>
            <h2 id="create-clinic-title" class="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">Клиника и аккаунт владельца</h2>
            <p class="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Владелец получит права управления клиников и начальные ключи доступа.</p>
          </div>
          <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-teal-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Закрыть" @click="closeCreate"><X class="h-5 w-5" /></button>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label v-for="(field, index) in fields" :key="field.key" :class="field.wide ? 'sm:col-span-2' : ''" class="text-xs font-black text-slate-700 dark:text-slate-300">
            {{ field.label }}
            <input :ref="index === 0 ? setFirstInput : undefined" v-model.trim="form[field.key]" :type="field.type || 'text'" :inputmode="field.inputmode" :autocomplete="field.autocomplete" required :minlength="field.key === 'ownerPassword' ? 10 : undefined" :placeholder="field.placeholder" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none transition-all hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-teal-400" />
          </label>
        </div>
        <p v-if="error" class="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert"><CircleAlert class="mt-0.5 h-4 w-4 shrink-0" />{{ error }}</p>
        <div class="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="min-h-12 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeCreate">Отмена</button>
          <button type="submit" :disabled="saving" class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-sm font-black text-white transition-colors hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"><LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" /><Plus v-else class="h-4 w-4" />{{ saving ? 'Создаём…' : 'Создать организацию' }}</button>
        </div>
      </form>
    </div>

    <!-- Change Operator Password Modal -->
    <div v-if="showPasswordDialog" class="fixed inset-0 z-[55] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" @click.self="closePasswordDialog" @keydown.esc="closePasswordDialog" @keydown.tab="trapPasswordFocus">
      <form ref="passwordDialog" class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="platform-password-title" aria-describedby="platform-password-description" @submit.prevent="changePassword">
        <div class="flex items-start justify-between gap-4">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"><KeyRound class="h-6 w-6" /></span>
          <button type="button" :disabled="passwordSaving" class="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Закрыть" @click="closePasswordDialog"><X class="h-5 w-5" /></button>
        </div>
        <h2 id="platform-password-title" class="mt-5 text-xl font-black text-slate-950 dark:text-slate-100">Сменить пароль оператора</h2>
        <p id="platform-password-description" class="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">После сохранения потребуется повторно войти с новым паролем.</p>
        <div class="mt-5 space-y-4">
          <label class="block text-xs font-black text-slate-700 dark:text-slate-300">Текущий пароль<input ref="passwordFirstInput" v-model="passwordForm.current" type="password" autocomplete="current-password" required class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400" /></label>
          <label class="block text-xs font-black text-slate-700 dark:text-slate-300">Новый пароль<input v-model="passwordForm.next" type="password" autocomplete="new-password" required minlength="10" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400" /><span class="mt-1.5 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Минимум 10 символов.</span></label>
          <label class="block text-xs font-black text-slate-700 dark:text-slate-300">Повторите новый пароль<input v-model="passwordForm.confirm" type="password" autocomplete="new-password" required minlength="10" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium outline-none hover:border-slate-300 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-teal-400" /></label>
        </div>
        <p v-if="passwordError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ passwordError }}</p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" :disabled="passwordSaving" class="min-h-11 rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-700 transition-colors disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closePasswordDialog">Отмена</button>
          <button type="submit" :disabled="passwordSaving" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-xs font-black text-white transition-colors disabled:cursor-wait disabled:opacity-60 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"><LoaderCircle v-if="passwordSaving" class="h-4 w-4 animate-spin" />{{ passwordSaving ? 'Обновляем…' : 'Сменить и выйти' }}</button>
        </div>
      </form>
    </div>

    <!-- Confirm Suspend/Archive Modal -->
    <div v-if="pendingStatusClinic" class="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" @click.self="closeStatusConfirm" @keydown.esc="closeStatusConfirm" @keydown.tab="trapStatusFocus">
      <div ref="statusConfirmDialog" class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" role="alertdialog" aria-modal="true" aria-labelledby="status-confirm-title" aria-describedby="status-confirm-description">
        <div class="flex items-start justify-between gap-4">
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"><CircleAlert class="h-6 w-6" /></span>
          <button type="button" :disabled="Boolean(updatingId)" class="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Закрыть" @click="closeStatusConfirm"><X class="h-5 w-5" /></button>
        </div>
        <h2 id="status-confirm-title" class="mt-5 text-xl font-black text-slate-950 dark:text-slate-100">{{ pendingStatusClinic.status === 'ARCHIVED' ? 'Перевести организацию в архив?' : 'Приостановить организацию?' }}</h2>
        <p id="status-confirm-description" class="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">Сотрудники <strong class="text-slate-900 dark:text-slate-100">{{ pendingStatusClinic.name }}</strong> потеряют доступ к рабочим кабинетам.</p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" :disabled="Boolean(updatingId)" class="min-h-11 rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeStatusConfirm">Отмена</button>
          <button type="button" :disabled="Boolean(updatingId)" class="min-h-11 rounded-xl bg-red-700 px-5 text-xs font-black text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500" @click="confirmStatusSave">{{ updatingId ? 'Применяем…' : 'Отключить доступ' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { z } from 'zod';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import { Building2, CircleAlert, Hospital, KeyRound, LoaderCircle, LogOut, Plus, Save, Search, SearchX, X } from 'lucide-vue-next';

type ClinicStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
type ClinicPlan = 'START' | 'PRO' | 'ENTERPRISE';
interface Clinic { id:string; name:string; legalName:string; bin:string; city:string; contactPhone:string; plan?:ClinicPlan; status:ClinicStatus }
type FormKey = 'name'|'legalName'|'bin'|'city'|'contactPhone'|'ownerName'|'ownerEmail'|'ownerPassword'|'ownerPasswordConfirm';

const statusSelectOptions: SelectOption[] = [
  { value: 'TRIAL', label: 'Пробный' },
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'SUSPENDED', label: 'Приостановлена' },
  { value: 'ARCHIVED', label: 'Архив' }
];

const router = useRouter();
const auth = useAuthStore();
const clinics = ref<Clinic[]>([]);
const loading = ref(true);
const loadError = ref('');
const query = ref('');
const showCreate = ref(false);
const saving = ref(false);
const error = ref('');
const updatingId = ref('');
const rowErrors = reactive<Record<string,string>>({});
const savedStatuses = reactive<Record<string,ClinicStatus>>({});
const firstInput = ref<HTMLInputElement | null>(null);
const createTrigger = ref<HTMLButtonElement | null>(null);
const createDialog = ref<HTMLElement | null>(null);
const passwordTrigger = ref<HTMLButtonElement | null>(null);
const showPasswordDialog = ref(false);
const passwordDialog = ref<HTMLElement | null>(null);
const passwordFirstInput = ref<HTMLInputElement | null>(null);
const passwordSaving = ref(false);
const passwordError = ref('');
const passwordForm = reactive({ current:'', next:'', confirm:'' });
const pendingStatusClinic = ref<Clinic | null>(null);
const statusConfirmDialog = ref<HTMLElement | null>(null);
let statusReturnFocus: HTMLElement | null = null;
const form = reactive<Record<FormKey,string>>({ name:'', legalName:'', bin:'', city:'', contactPhone:'', ownerName:'', ownerEmail:'', ownerPassword:'', ownerPasswordConfirm:'' });
const fields:{key:FormKey;label:string;placeholder?:string;type?:string;wide?:boolean;inputmode?:'numeric'|'tel'|'email';autocomplete?:string}[] = [
  { key:'name', label:'Название', placeholder:'Sana Clinic', autocomplete:'organization' }, { key:'legalName', label:'Юридическое название', placeholder:'ТОО «Sana Clinic»' },
  { key:'bin', label:'БИН', placeholder:'12 цифр', inputmode:'numeric' }, { key:'city', label:'Город', autocomplete:'address-level2' },
  { key:'contactPhone', label:'Контактный телефон', inputmode:'tel', autocomplete:'tel' }, { key:'ownerName', label:'ФИО владельца', autocomplete:'name' },
  { key:'ownerEmail', label:'Email владельца', type:'email', inputmode:'email', autocomplete:'email' }, { key:'ownerPassword', label:'Начальный пароль', type:'password', autocomplete:'new-password' },
  { key:'ownerPasswordConfirm', label:'Повторите пароль', type:'password', autocomplete:'new-password' }
];

const filteredClinics = computed(() => { const term=query.value.toLowerCase(); return !term ? clinics.value : clinics.value.filter(item => [item.name,item.legalName,item.bin,item.city].some(value => value.toLowerCase().includes(term))); });
const activeCount = computed(() => clinics.value.filter(item => item.status === 'ACTIVE').length);
const attentionCount = computed(() => clinics.value.filter(item => item.status === 'SUSPENDED' || item.status === 'TRIAL').length);

async function load() {
  loading.value=true; loadError.value='';
  try { const res=await apiFetch('/api/platform/clinics'); const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Ошибка сервера'); clinics.value=data; for (const clinic of clinics.value) savedStatuses[clinic.id]=clinic.status; }
  catch(err){ loadError.value=err instanceof Error?err.message:'Проверьте соединение'; }
  finally { loading.value=false; }
}
function setFirstInput(element: unknown){ firstInput.value=element as HTMLInputElement | null; }
function trapFocus(event:KeyboardEvent){const container=createDialog.value;if(!container)return;const elements=Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'));if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
async function openCreate(){ error.value=''; showCreate.value=true; await nextTick(); firstInput.value?.focus(); }
function closeCreate(){ if(!saving.value) { showCreate.value=false; error.value=''; Object.assign(form,{name:'',legalName:'',bin:'',city:'',contactPhone:'',ownerName:'',ownerEmail:'',ownerPassword:'',ownerPasswordConfirm:''}); void nextTick(() => createTrigger.value?.focus()); } }
async function openPasswordDialog(){passwordError.value='';Object.assign(passwordForm,{current:'',next:'',confirm:''});showPasswordDialog.value=true;await nextTick();passwordFirstInput.value?.focus();}
function closePasswordDialog(){if(passwordSaving.value)return;showPasswordDialog.value=false;passwordError.value='';Object.assign(passwordForm,{current:'',next:'',confirm:''});void nextTick(()=>passwordTrigger.value?.focus());}
function trapPasswordFocus(event:KeyboardEvent){const container=passwordDialog.value;if(!container)return;const elements=Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'));if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}

const createClinicSchema = z.object({
  name: z.string().min(2, 'Укажите название организации'),
  legalName: z.string().min(2, 'Укажите юридическое название'),
  bin: z.string().min(12, 'БИН должен содержать 12 цифр'),
  city: z.string().min(2, 'Укажите город'),
  contactPhone: z.string().min(6, 'Укажите контактный телефон'),
  ownerName: z.string().min(2, 'Укажите ФИО владельца'),
  ownerEmail: z.string().min(1, 'Укажите email владельца').email('Введите корректный email (например, name@clinic.kz)'),
  ownerPassword: z.string().min(10, 'Пароль должен быть не менее 10 символов'),
  ownerPasswordConfirm: z.string().min(10, 'Подтверждение пароля должно быть не менее 10 символов')
}).refine(data => data.ownerPassword === data.ownerPasswordConfirm, {
  message: 'Пароли владельца не совпадают',
  path: ['ownerPasswordConfirm']
});

const changePasswordSchema = z.object({
  current: z.string().min(1, 'Укажите текущий пароль'),
  next: z.string().min(10, 'Новый пароль должен быть не менее 10 символов'),
  confirm: z.string().min(10, 'Подтверждение пароля должно быть не менее 10 символов')
}).refine(data => data.next === data.confirm, {
  message: 'Новые пароли не совпадают',
  path: ['confirm']
});

async function changePassword(){
  passwordError.value='';
  const result = changePasswordSchema.safeParse(passwordForm);
  if (!result.success) {
    passwordError.value = result.error.issues[0]?.message || 'Ошибка заполнения формы';
    return;
  }
  if (passwordForm.current === passwordForm.next) {
    passwordError.value = 'Новый пароль должен отличаться от текущего';
    return;
  }
  passwordSaving.value=true;
  try{
    await auth.changePassword(passwordForm.current,passwordForm.next);
    showPasswordDialog.value=false;
    Object.assign(passwordForm,{current:'',next:'',confirm:''});
    await router.replace({path:'/login',query:{passwordChanged:'1'}});
  }catch(err){
    passwordError.value=err instanceof Error?err.message:'Не удалось сменить пароль';
  }finally{
    passwordSaving.value=false;
  }
}

async function createClinic(){
  error.value='';
  const result = createClinicSchema.safeParse(form);
  if (!result.success) {
    error.value = result.error.issues[0]?.message || 'Ошибка заполнения формы';
    return;
  }
  saving.value=true;
  try{
    const payload={name:form.name,legalName:form.legalName,bin:form.bin,city:form.city,contactPhone:form.contactPhone,ownerName:form.ownerName,ownerEmail:form.ownerEmail,ownerPassword:form.ownerPassword};
    const res=await apiFetch('/api/platform/clinics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error || 'Не удалось создать организацию');
    clinics.value.push(data.clinic);
    savedStatuses[data.clinic.id]=data.clinic.status;
    showCreate.value=false;
    Object.assign(form,{name:'',legalName:'',bin:'',city:'',contactPhone:'',ownerName:'',ownerEmail:'',ownerPassword:'',ownerPasswordConfirm:''});
    void nextTick(() => createTrigger.value?.focus());
  }catch(err){
    error.value=err instanceof Error?err.message:'Не удалось создать организацию';
  }finally{
    saving.value=false;
  }
}

async function requestSaveClinic(clinic:Clinic){
  const isNewlyRestricted=(clinic.status==='SUSPENDED'||clinic.status==='ARCHIVED')&&savedStatuses[clinic.id]!==clinic.status;
  if(!isNewlyRestricted){await saveClinic(clinic);return;}
  statusReturnFocus=document.activeElement as HTMLElement|null;
  pendingStatusClinic.value=clinic;
  await nextTick();
  statusConfirmDialog.value?.querySelector<HTMLElement>('button')?.focus();
}

function trapStatusFocus(event:KeyboardEvent){const container=statusConfirmDialog.value;if(!container)return;const elements=Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'));if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
function closeStatusConfirm(){if(updatingId.value)return;pendingStatusClinic.value=null;void nextTick(()=>statusReturnFocus?.focus());}
async function confirmStatusSave(){const clinic=pendingStatusClinic.value;if(!clinic)return;await saveClinic(clinic);pendingStatusClinic.value=null;void nextTick(()=>statusReturnFocus?.focus());}

async function saveClinic(clinic:Clinic){
  updatingId.value=clinic.id;rowErrors[clinic.id]='';
  try{
    const res=await apiFetch(`/api/platform/clinics/${encodeURIComponent(clinic.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:'ENTERPRISE',status:clinic.status,contactPhone:clinic.contactPhone})});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error || 'Изменение отклонено');
    Object.assign(clinic,data);
    savedStatuses[clinic.id]=clinic.status;
  }catch(err){
    rowErrors[clinic.id]=err instanceof Error?err.message:'Не удалось сохранить';
    await load();
  }finally{
    updatingId.value='';
  }
}

const statusLabel=(status:ClinicStatus)=>({TRIAL:'Пробный',ACTIVE:'Активна',SUSPENDED:'Приостановлена',ARCHIVED:'Архив'}[status]);
const statusClass=(status:ClinicStatus)=>({TRIAL:'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',ACTIVE:'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300',SUSPENDED:'border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',ARCHIVED:'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}[status]);
async function logout(){try{await auth.logout();await router.replace('/login');}catch{/* App.vue keeps workspace blocked until logout succeeds */}}
onMounted(load);
</script>
