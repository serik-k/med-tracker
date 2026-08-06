<template>
  <div class="min-h-screen bg-[#f4f7fa] text-slate-950 font-sans selection:bg-emerald-500 selection:text-slate-950 antialiased transition-colors dark:bg-[#07111f] dark:text-slate-100">
    <!-- Header Navigation -->
    <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-[#07111f]/90">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Clinic Context -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Building2 class="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="truncate text-sm font-extrabold text-slate-950 dark:text-white">{{ auth.user?.clinicName }}</h1>
              <span class="hidden px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-md font-mono font-bold uppercase dark:text-emerald-400 sm:inline-flex">
                Fleet Management
              </span>
            </div>
            <p class="truncate text-xs text-slate-500 dark:text-slate-400">Управление автопарком и сменами бригад</p>
          </div>
        </div>

        <!-- Right Quick Actions -->
        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            type="button"
            @click="router.push('/dispatcher')"
            class="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Headphones class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span class="hidden md:inline">Диспетчерская</span>
          </button>

          <button
            type="button"
            @click="logout"
            class="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-950 focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Выйти из системы"
            title="Выйти из системы"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Telematics KPI Scorecards (Senior UX Design) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div class="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm backdrop-blur-xl hover:border-emerald-500/40 transition-all dark:bg-slate-900/80 dark:border-slate-800/90 dark:shadow-xl dark:hover:border-emerald-500/30">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Машин в автопарке</div>
            <div class="text-3xl font-black text-slate-950 dark:text-white mt-1 font-mono">{{ crewStore.crews.length }}</div>
            <div class="text-[11px] text-slate-500 mt-1">Всего зарегистрировано</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Ambulance class="w-6 h-6" />
          </div>
        </div>

        <div class="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm backdrop-blur-xl hover:border-teal-500/40 transition-all dark:bg-slate-900/80 dark:border-slate-800/90 dark:shadow-xl dark:hover:border-teal-500/30">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">На дежурстве</div>
            <div class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {{ crewStore.crews.filter(c => c.status === 'ON_DUTY').length }}
            </div>
            <div class="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1">Готовы к приему вызовов</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CheckCircle2 class="w-6 h-6" />
          </div>
        </div>

        <div class="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm backdrop-blur-xl hover:border-cyan-500/40 transition-all dark:bg-slate-900/80 dark:border-slate-800/90 dark:shadow-xl dark:hover:border-cyan-500/30">
          <div>
            <div class="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Реанимация / Спецсмены</div>
            <div class="text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
              {{ crewStore.crews.filter(c => c.type === 'РЕАНИМАЦИЯ').length }}
            </div>
            <div class="text-[11px] text-cyan-700 dark:text-cyan-400/80 mt-1">Оснащены ИВЛ и мониторами</div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <ShieldAlert class="w-6 h-6" />
          </div>
        </div>
      </div>



      <ClinicTeamCard />

      <p
        v-if="formError && !showModal"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        role="alert"
      >
        {{ formError }}
      </p>

      <!-- Fleet Crew Management Section -->
      <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm backdrop-blur-xl space-y-6 transition-colors dark:bg-slate-900/80 dark:border-slate-800/90 dark:shadow-2xl">
        
        <!-- Header & Search Filter Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800/80">
          <div>
            <h2 class="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
              <Users class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Реестр Бригад и Автомобилей</span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Управление доступным автопарком для диспетчерской службы</p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Search Filter -->
            <label class="relative">
              <span class="sr-only">Поиск экипажа или госномера</span>
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Поиск экипажа или госномера..."
                class="min-h-11 w-44 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 sm:w-64 dark:border-slate-700/80 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400"
              />
            </label>

            <!-- Add Crew Button -->
            <button
              type="button"
              @click="openAddModal"
              class="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-md transition hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-500/30 dark:bg-emerald-400 dark:text-slate-950 dark:shadow-emerald-500/20 dark:hover:bg-emerald-300"
            >
              <Plus class="w-4 h-4" />
              <span>Добавить Бригаду</span>
            </button>
          </div>
        </div>

        <!-- Fleet Crews Cards Grid View (All Screens) -->
        <div v-if="filteredCrews.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="crew in filteredCrews"
            :key="crew.id"
            class="relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm transition-all focus-within:z-30 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
          >
            <div>
              <!-- Card Header: Ambulance icon, Name & License Plate -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-emerald-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400">
                    <Ambulance class="h-5 w-5" />
                  </div>
                  <div>
                    <h3 class="text-base font-black text-slate-950 dark:text-white">{{ crew.name }}</h3>
                    <span class="mt-0.5 inline-block whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-bold tracking-wider text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {{ crew.carPlate }}
                    </span>
                  </div>
                </div>
                <span
                  :class="[
                    'whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider',
                    crew.type === 'РЕАНИМАЦИЯ' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                    crew.type === 'ПЕДИАТРИЧЕСКАЯ' ? 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' :
                    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  ]"
                >
                  {{ crew.type }}
                </span>
              </div>

              <!-- Driver / Doctor -->
              <div class="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs dark:border-slate-800/80">
                <span class="font-semibold text-slate-500 dark:text-slate-400">Водитель / Врач:</span>
                <strong class="font-extrabold text-slate-950 dark:text-white">{{ crew.driverName }}</strong>
              </div>

              <!-- Status CustomSelect -->
              <div class="mt-3">
                <CustomSelect
                  :model-value="crew.status"
                  :disabled="crew.status === 'ON_CALL'"
                  label="Статус экипажа"
                  :options="getCrewStatusSelectOptions(crew)"
                  @update:model-value="val => changeCrewStatus(crew, val as Crew['status'])"
                />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-800/80">
              <button
                type="button"
                class="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                @click="openEditModal(crew)"
              >
                <Pencil class="h-3.5 w-3.5" />
                <span>Изменить</span>
              </button>
              <button
                type="button"
                class="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 focus-visible:ring-4 focus-visible:ring-emerald-500/20 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                @click="openDriverLinkModal(crew)"
              >
                <Link2 class="h-3.5 w-3.5" />
                <span>{{ copiedCrewId === crew.id ? 'Скопировано' : 'Доступ' }}</span>
              </button>
              <button
                type="button"
                class="col-span-2 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-all hover:bg-red-100 focus-visible:ring-4 focus-visible:ring-red-500/20 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
                @click="openDeleteModal(crew)"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Удалить из реестра</span>
              </button>
            </div>
          </article>
        </div>

        <div v-else class="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Search class="mx-auto h-7 w-7 text-slate-400 dark:text-slate-600" />
          <p class="mt-3 font-bold text-slate-500 dark:text-slate-400">Бригады не найдены</p>
        </div>
      </div>
    </main>

    <div v-if="showSettingsModal" class="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm" @click.self="closeSettingsModal" @keydown.esc="closeSettingsModal" @keydown.tab="trapFocus($event, settingsDialog)">
      <form ref="settingsDialog" class="my-6 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title" @submit.prevent="saveClinicSettings">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div><p class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Конфигурация клиники</p><h2 id="settings-dialog-title" class="mt-1 text-xl font-black text-slate-950 dark:text-white">Диспетчер и стационары</h2><p class="mt-2 max-w-xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">Координаты используются только для построения маршрута экипажа при госпитализации.</p></div>
          <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Закрыть настройки" @click="closeSettingsModal"><X class="h-5 w-5" /></button>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-3">
          <label class="text-xs font-black text-slate-700 dark:text-slate-300">Телефон диспетчера<input ref="settingsFirstInput" v-model.trim="settingsForm.contactPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+7 (777) 000-00-00" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
          <label class="text-xs font-black text-slate-700 dark:text-slate-300">Город<input v-model.trim="settingsForm.city" type="text" autocomplete="address-level2" required placeholder="Например, Алматы" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
          <label class="text-xs font-black text-slate-700 dark:text-slate-300">Часовой пояс<input v-model.trim="settingsForm.timezone" type="text" required placeholder="Asia/Almaty" class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
        </div>

        <div class="mt-7 flex items-center justify-between gap-4">
          <div><h3 class="text-sm font-black text-slate-950 dark:text-white">Стационары</h3><p class="mt-1 text-xs font-semibold text-slate-500">Добавьте только утверждённые клиникой точки назначения.</p></div>
          <button type="button" :disabled="settingsForm.hospitalOptions.length >= 50" class="flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800" @click="addHospital"><Plus class="h-4 w-4" />Добавить</button>
        </div>

        <div v-if="!settingsForm.hospitalOptions.length" class="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"><Hospital class="mx-auto h-7 w-7 text-slate-400 dark:text-slate-600" /><p class="mt-3 text-sm font-black text-slate-700 dark:text-slate-300">Стационары пока не настроены</p><p class="mt-1 text-xs text-slate-500">Экипаж увидит понятное предупреждение и свяжется с диспетчером.</p></div>
        <div v-else class="mt-4 max-h-[44svh] space-y-3 overflow-y-auto pr-1">
          <fieldset v-for="(hospital, index) in settingsForm.hospitalOptions" :key="hospital.id || index" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/55">
            <legend class="px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Стационар {{ index + 1 }}</legend>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="text-xs font-black text-slate-700 dark:text-slate-400">Название<input v-model.trim="hospital.name" type="text" required maxlength="120" class="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
              <label class="text-xs font-black text-slate-700 dark:text-slate-400">Адрес <span class="font-normal text-slate-500 dark:text-slate-600">(необязательно)</span><input v-model.trim="hospital.address" type="text" maxlength="240" class="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
              <label class="text-xs font-black text-slate-700 dark:text-slate-400">Широта<input v-model.number="hospital.lat" type="number" required min="-90" max="90" step="0.000001" inputmode="decimal" placeholder="43.238949" class="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
              <label class="text-xs font-black text-slate-700 dark:text-slate-400">Долгота<input v-model.number="hospital.lng" type="number" required min="-180" max="180" step="0.000001" inputmode="decimal" placeholder="76.945465" class="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-400" /></label>
            </div>
            <button type="button" class="mt-3 flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" @click="removeHospital(index)"><Trash2 class="h-4 w-4" />Удалить точку</button>
          </fieldset>
        </div>

        <p v-if="settingsSaveError" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200" role="alert">{{ settingsSaveError }}</p>
        <div class="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end"><button type="button" class="min-h-12 rounded-xl border border-slate-300 bg-white px-5 text-xs font-black text-slate-700 hover:bg-slate-100 dark:border-transparent dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" @click="closeSettingsModal">Отмена</button><button type="submit" :disabled="settingsSaving" class="min-h-12 rounded-xl bg-emerald-600 px-6 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300">{{ settingsSaving ? 'Сохраняем…' : 'Сохранить настройки' }}</button></div>
      </form>
    </div>

    <!-- Modal for Adding New Crew -->
    <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4" @click.self="closeCrewModal" @keydown.esc="closeCrewModal" @keydown.tab="trapFocus($event, crewDialog)">
      <form ref="crewDialog" class="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 transition-colors dark:bg-slate-900 dark:border-slate-800" role="dialog" aria-modal="true" aria-labelledby="crew-dialog-title" @submit.prevent="saveCrew">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div><h3 id="crew-dialog-title" class="text-base font-extrabold text-slate-950 dark:text-white">{{ editingCrew ? 'Редактировать бригаду' : 'Добавить новую бригаду' }}</h3><p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Позывной может быть любым — назначение использует внутренний ID.</p></div>
          <button type="button" @click="closeCrewModal" class="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Закрыть"><X class="h-4 w-4" /></button>
        </div>

        <div class="space-y-3.5 text-xs">
          <div>
            <label for="crew-name" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Позывной экипажа</label>
            <input
              id="crew-name"
              ref="crewNameInput"
              v-model="form.name"
              type="text"
              required
              placeholder="Например: Бригада №104"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-600 dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-emerald-400"
            />
          </div>

          <div>
            <label for="crew-plate" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">Гос. Номер автомобиля</label>
            <input
              id="crew-plate"
              v-model="form.carPlate"
              type="text"
              required
              placeholder="02 KZ 888 MED"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-600 dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-emerald-400 font-mono"
            />
          </div>

          <div>
            <CustomSelect
              v-model="form.type"
              :options="crewTypeOptions"
              label="Тип медицинской бригады"
            />
          </div>

          <div>
            <label for="crew-driver" class="block font-bold text-slate-700 dark:text-slate-300 mb-1">ФИО водителя / старшего врача</label>
            <input
              id="crew-driver"
              v-model="form.driverName"
              type="text"
              required
              placeholder="Мусинов А."
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-600 dark:bg-slate-950 dark:border-slate-700 dark:text-white dark:focus:border-emerald-400"
            />
          </div>

        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <p v-if="formError" class="mr-auto self-center text-xs text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
          <button
            type="button"
            @click="closeCrewModal"
            class="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer dark:border-transparent dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xs shadow-md cursor-pointer dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 dark:shadow-emerald-500/20"
          >
            {{ saving ? 'Сохранение...' : editingCrew ? 'Сохранить изменения' : 'Добавить бригаду' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Delete Crew Confirmation -->
    <div
      v-if="crewToDelete"
      class="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeDeleteModal"
      @keydown.esc="closeDeleteModal"
      @keydown.tab="trapFocus($event, deleteDialog)"
    >
      <div ref="deleteDialog" class="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl transition-colors dark:bg-slate-900 dark:border-slate-800" role="alertdialog" aria-modal="true" aria-labelledby="delete-crew-title" aria-describedby="delete-crew-description">
        <div class="flex items-start justify-between gap-4">
          <div class="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 dark:bg-red-500/10 dark:border-red-500/20">
            <AlertTriangle class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <button
            type="button"
            @click="closeDeleteModal"
            :disabled="deleting"
            class="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 dark:hover:text-white dark:hover:bg-slate-800"
            aria-label="Закрыть"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <h3 id="delete-crew-title" class="mt-5 text-lg font-black text-slate-950 dark:text-white">Удалить бригаду?</h3>
        <p id="delete-crew-description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Бригада <span class="font-bold text-slate-900 dark:text-slate-200">{{ crewToDelete.name }}</span> будет удалена из реестра автопарка.
        </p>
        <p v-if="deleteError" class="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">{{ deleteError }}</p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            @click="closeDeleteModal"
            :disabled="deleting"
            class="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50 dark:border-transparent dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            Отмена
          </button>
          <button
            type="button"
            @click="confirmDeleteCrew"
            :disabled="deleting"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed dark:bg-red-500 dark:hover:bg-red-400 dark:shadow-red-500/20"
          >
            <Trash2 class="w-4 h-4" />
            {{ deleting ? 'Удаление...' : 'Удалить' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Driver access rotation confirmation -->
    <div
      v-if="crewLinkTarget"
      class="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      @click.self="closeDriverLinkModal"
      @keydown.esc="closeDriverLinkModal"
      @keydown.tab="trapFocus($event, linkDialog)"
    >
      <div
        ref="linkDialog"
        class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-colors dark:border-slate-800 dark:bg-slate-900"
        :role="driverLinkValue ? 'dialog' : 'alertdialog'"
        aria-modal="true"
        aria-labelledby="driver-link-title"
        aria-describedby="driver-link-description"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertTriangle v-if="!driverLinkValue" class="h-6 w-6 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            <Link2 v-else class="h-6 w-6 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
          </div>
          <button
            type="button"
            class="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            :disabled="rotatingCrewLink"
            aria-label="Закрыть"
            @click="closeDriverLinkModal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <h3 id="driver-link-title" class="mt-5 text-lg font-black text-slate-950 dark:text-white">
          {{ driverLinkValue ? 'Новая ссылка готова' : 'Обновить доступ водителя?' }}
        </h3>
        <p id="driver-link-description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          <template v-if="driverLinkValue">
            Передайте ссылку водителю <span class="font-bold text-slate-900 dark:text-slate-200">{{ crewLinkTarget.driverName }}</span> по защищённому каналу. После закрытия окна ссылка не сохраняется в интерфейсе.
          </template>
          <template v-else>
            Текущая ссылка бригады <span class="font-bold text-slate-900 dark:text-slate-200">{{ crewLinkTarget.name }}</span> перестанет работать. Открытое приложение водителя будет отключено, а передача геопозиции остановится.
          </template>
        </p>
        <p v-if="!driverLinkValue && crewLinkTarget.status === 'ON_CALL'" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          Бригада сейчас на вызове. Обновляйте доступ только при компрометации ссылки или смене устройства.
        </p>

        <label v-if="driverLinkValue" class="mt-4 block text-xs font-black text-slate-700 dark:text-slate-300">
          Одноразово показанная ссылка
          <input
            ref="driverLinkInput"
            :value="driverLinkValue"
            readonly
            class="mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-emerald-400"
            @focus="($event.target as HTMLInputElement).select()"
          />
        </label>

        <p v-if="driverLinkNotice" class="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs font-bold text-amber-100" role="status">{{ driverLinkNotice }}</p>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="min-h-11 rounded-xl bg-slate-800 px-4 text-xs font-black text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            :disabled="rotatingCrewLink"
            @click="closeDriverLinkModal"
          >
            {{ driverLinkValue ? 'Готово' : 'Отмена' }}
          </button>
          <button
            v-if="!driverLinkValue"
            type="button"
            class="min-h-11 rounded-xl bg-amber-400 px-5 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
            :disabled="rotatingCrewLink"
            @click="confirmDriverLinkRotation"
          >
            {{ rotatingCrewLink ? 'Обновляем…' : 'Отозвать и выпустить новую' }}
          </button>
          <button
            v-else
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-black text-slate-950 hover:bg-emerald-300"
            @click="copyGeneratedDriverLink"
          >
            <Link2 class="h-4 w-4" aria-hidden="true" />Скопировать ещё раз
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCrewStore } from '../stores/crewStore';
import { useAuthStore } from '@/stores/authStore';
import CustomSelect, { type SelectOption } from '../components/ui/CustomSelect.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import type { Crew } from '../types';
import { apiFetch, apiJson, errorMessage } from '@/services/api';
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
  X,
  Pencil,
  Link2,
  Settings2,
  Phone,
  MapPin,
  Clock3,
  Hospital
} from 'lucide-vue-next';

interface HospitalSetting {
  id?: string;
  name: string;
  address: string;
  lat: number | '';
  lng: number | '';
}

interface ClinicSettings {
  id: string;
  name: string;
  legalName: string;
  city: string;
  timezone: string;
  contactPhone: string;
  hospitalOptions: Array<{ id?: string; name: string; address?: string; lat: number; lng: number }>;
  plan: string;
  status: string;
}

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
const crewLinkTarget = ref<Crew | null>(null);
const rotatingCrewLink = ref(false);
const driverLinkError = ref('');
const driverLinkNotice = ref('');
const driverLinkValue = ref('');
const linkDialog = ref<HTMLElement | null>(null);
const driverLinkInput = ref<HTMLInputElement | null>(null);
const editingCrew = ref<Crew | null>(null);
const crewDialog = ref<HTMLElement | null>(null);
const deleteDialog = ref<HTMLElement | null>(null);
const crewNameInput = ref<HTMLInputElement | null>(null);
const clinicSettings = ref<ClinicSettings | null>({
  id: 'medclinic',
  name: 'MedClinic',
  legalName: 'ТОО «MedClinic Emergency»',
  city: 'Алматы',
  timezone: 'Asia/Almaty',
  contactPhone: '+7 (727) 300-01-03',
  plan: 'ENTERPRISE',
  status: 'ACTIVE',
  hospitalOptions: [
    { id: 'hosp-1', name: 'ГКБ №7 (Калкаман)', address: 'мкр. Калкаман, 20', lat: 43.2185, lng: 76.8142 },
    { id: 'hosp-2', name: 'Центральная ГКБ №12', address: 'ул. Джандосова, 6', lat: 43.2351, lng: 76.9094 }
  ]
});
const settingsLoading = ref(false);
const settingsLoadError = ref('');
const showSettingsModal = ref(false);
const settingsSaving = ref(false);
const settingsSaveError = ref('');
const settingsDialog = ref<HTMLElement | null>(null);
const settingsFirstInput = ref<HTMLInputElement | null>(null);
const settingsForm = ref<{ city: string; timezone: string; contactPhone: string; hospitalOptions: HospitalSetting[] }>({ city: '', timezone: '', contactPhone: '', hospitalOptions: [] });
let returnFocusTo: HTMLElement | null = null;
let copiedStateTimer = 0;

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
  void crewStore.fetchCrews();
  void loadClinicSettings();
});

async function loadClinicSettings() {
  settingsLoading.value = true;
  settingsLoadError.value = '';
  try {
    clinicSettings.value = await apiJson<ClinicSettings>('/api/clinic/settings');
  } catch (error) {
    settingsLoadError.value = errorMessage(error, 'Не удалось загрузить настройки клиники');
  } finally {
    settingsLoading.value = false;
  }
}

async function openSettingsModal() {
  if (!clinicSettings.value) return;
  returnFocusTo = document.activeElement as HTMLElement | null;
  settingsForm.value = {
    city: clinicSettings.value.city || '',
    timezone: clinicSettings.value.timezone || '',
    contactPhone: clinicSettings.value.contactPhone || '',
    hospitalOptions: clinicSettings.value.hospitalOptions.map(hospital => ({
      id: hospital.id,
      name: hospital.name,
      address: hospital.address || '',
      lat: hospital.lat,
      lng: hospital.lng
    }))
  };
  settingsSaveError.value = '';
  showSettingsModal.value = true;
  await nextTick();
  settingsFirstInput.value?.focus();
}

function closeSettingsModal() {
  if (settingsSaving.value) return;
  showSettingsModal.value = false;
  settingsSaveError.value = '';
  void nextTick(() => returnFocusTo?.focus());
}

function addHospital() {
  if (settingsForm.value.hospitalOptions.length >= 50) return;
  settingsForm.value.hospitalOptions.push({ name: '', address: '', lat: '', lng: '' });
}

function removeHospital(index: number) {
  settingsForm.value.hospitalOptions.splice(index, 1);
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const elements = Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
  if (!elements.length) return;
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function saveClinicSettings() {
  settingsSaveError.value = '';
  const hospitals = settingsForm.value.hospitalOptions.map(hospital => ({
    ...(hospital.id ? { id: hospital.id } : {}),
    name: hospital.name.trim(),
    ...(hospital.address.trim() ? { address: hospital.address.trim() } : {}),
    lat: Number(hospital.lat),
    lng: Number(hospital.lng)
  }));
  const invalidHospital = hospitals.find(hospital => !hospital.name || !Number.isFinite(hospital.lat) || hospital.lat < -90 || hospital.lat > 90 || !Number.isFinite(hospital.lng) || hospital.lng < -180 || hospital.lng > 180);
  if (invalidHospital) {
    settingsSaveError.value = 'Проверьте название и координаты каждого стационара.';
    return;
  }
  settingsSaving.value = true;
  try {
    clinicSettings.value = await apiJson<ClinicSettings>('/api/clinic/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: settingsForm.value.city.trim(),
        timezone: settingsForm.value.timezone.trim(),
        contactPhone: settingsForm.value.contactPhone.trim(),
        hospitalOptions: hospitals
      })
    });
    showSettingsModal.value = false;
    void nextTick(() => returnFocusTo?.focus());
  } catch (error) {
    settingsSaveError.value = errorMessage(error, 'Не удалось сохранить настройки клиники');
  } finally {
    settingsSaving.value = false;
  }
}

const filteredCrews = computed(() => {
  if (!searchQuery.value.trim()) return crewStore.crews;
  const q = searchQuery.value.toLowerCase();
  return crewStore.crews.filter(
    c => c.name.toLowerCase().includes(q) || c.carPlate.toLowerCase().includes(q) || c.driverName.toLowerCase().includes(q)
  );
});

async function openAddModal() {
  returnFocusTo = document.activeElement as HTMLElement | null;
  const nextNum = Math.floor(104 + crewStore.crews.length);
  form.value = {
    name: `Бригада №${nextNum}`,
    carPlate: '',
    type: 'ЛИНЕЙНАЯ',
    driverName: ''
  };
  formError.value = '';
  editingCrew.value = null;
  showModal.value = true;
  await nextTick();
  crewNameInput.value?.focus();
}

async function openEditModal(crew: Crew) {
  returnFocusTo = document.activeElement as HTMLElement | null;
  editingCrew.value = crew;
  form.value = { name: crew.name, carPlate: crew.carPlate, type: crew.type, driverName: crew.driverName };
  formError.value = '';
  showModal.value = true;
  await nextTick();
  crewNameInput.value?.focus();
}

function closeCrewModal() {
  if (saving.value) return;
  showModal.value = false;
  editingCrew.value = null;
  void nextTick(() => returnFocusTo?.focus());
}

import { z } from 'zod';

const crewSchema = z.object({
  name: z.string().min(2, 'Укажите наименование бригады (например: Бригада №104)'),
  carPlate: z.string().min(2, 'Укажите госномер автомобиля'),
  driverName: z.string().min(2, 'Укажите ФИО ответственного водителя'),
  type: z.enum(['ЛИНЕЙНАЯ', 'РЕАНИМАЦИОННАЯ', 'ПЕДИАТРИЧЕСКАЯ'])
});

async function saveCrew() {
  formError.value = '';
  const result = crewSchema.safeParse({
    name: form.value.name.trim(),
    carPlate: form.value.carPlate.trim(),
    driverName: form.value.driverName.trim(),
    type: form.value.type
  });
  if (!result.success) {
    formError.value = result.error.issues[0]?.message || 'Заполните все обязательные поля';
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      carPlate: form.value.carPlate.trim(),
      type: form.value.type,
      driverName: form.value.driverName.trim(),
      ...(!editingCrew.value ? { status: 'ON_DUTY' as const } : {})
    };
    if (editingCrew.value) await crewStore.updateCrew(editingCrew.value.id, payload);
    else await crewStore.addCrew(payload);
    showModal.value = false;
    editingCrew.value = null;
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Не удалось сохранить бригаду';
  } finally {
    saving.value = false;
  }
}

function crewStatusLabel(status: Crew['status']) {
  switch (status) {
    case 'ON_DUTY': return 'На дежурстве';
    case 'BREAK': return 'Перерыв';
    case 'ON_CALL': return 'На вызове';
    case 'OFF_DUTY': return 'Не на смене';
    default: return status;
  }
}

function getCrewStatusSelectOptions(crew: Crew): SelectOption[] {
  const opts: SelectOption[] = [
    { value: 'ON_DUTY', label: 'На дежурстве' },
    { value: 'BREAK', label: 'Перерыв' },
    { value: 'OFF_DUTY', label: 'Не на смене' }
  ];
  if (crew.status === 'ON_CALL') {
    opts.unshift({ value: 'ON_CALL', label: 'На вызове · управляется диспетчером', disabled: true });
  }
  return opts;
}

async function changeCrewStatus(crew: Crew, status: Crew['status']) {
  const previous = crew.status;
  crew.status = status;
  try { await crewStore.updateCrew(crew.id, { status }); }
  catch { crew.status = previous; formError.value = 'Не удалось изменить статус бригады'; }
}

async function openDeleteModal(crew: Crew) {
  returnFocusTo = document.activeElement as HTMLElement | null;
  crewToDelete.value = crew;
  deleteError.value = '';
  await nextTick();
  deleteDialog.value?.querySelector<HTMLElement>('button')?.focus();
}

function closeDeleteModal() {
  if (deleting.value) return;
  crewToDelete.value = null;
  deleteError.value = '';
  void nextTick(() => returnFocusTo?.focus());
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

async function openDriverLinkModal(crew: Crew) {
  returnFocusTo = document.activeElement as HTMLElement | null;
  crewLinkTarget.value = crew;
  driverLinkError.value = '';
  driverLinkNotice.value = '';
  driverLinkValue.value = '';
  await nextTick();
  linkDialog.value?.querySelector<HTMLElement>('button')?.focus();
}

function closeDriverLinkModal() {
  if (rotatingCrewLink.value) return;
  crewLinkTarget.value = null;
  driverLinkError.value = '';
  driverLinkNotice.value = '';
  driverLinkValue.value = '';
  void nextTick(() => returnFocusTo?.focus());
}

async function copyGeneratedDriverLink() {
  if (!driverLinkValue.value) return;
  driverLinkNotice.value = '';
  try {
    await navigator.clipboard.writeText(driverLinkValue.value);
    copiedCrewId.value = crewLinkTarget.value?.id || '';
    window.clearTimeout(copiedStateTimer);
    copiedStateTimer = window.setTimeout(() => { copiedCrewId.value = ''; }, 2500);
  } catch {
    driverLinkInput.value?.focus();
    driverLinkInput.value?.select();
    driverLinkNotice.value = 'Автокопирование недоступно. Ссылка выделена — скопируйте её вручную.';
  }
}

async function confirmDriverLinkRotation() {
  if (!crewLinkTarget.value) return;
  rotatingCrewLink.value = true;
  driverLinkError.value = '';
  driverLinkNotice.value = '';
  try {
    const res = await apiFetch(`/api/crews/${crewLinkTarget.value.id}/access-link`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось обновить доступ');
    driverLinkValue.value = `${location.origin}${data.path}`;
    await nextTick();
    await copyGeneratedDriverLink();
  } catch (error) {
    driverLinkError.value = error instanceof Error ? error.message : 'Не удалось обновить доступ';
  } finally {
    rotatingCrewLink.value = false;
  }
}

async function logout() {
  try {
    await auth.logout();
    await router.replace('/login');
  } catch {
    // App.vue keeps the workspace blocked until server sign-out succeeds.
  }
}
</script>
