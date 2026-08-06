<template>
  <div class="min-h-screen bg-slate-100 text-slate-950">
    <header class="border-b border-slate-200 bg-white px-4 py-3 lg:h-16 lg:px-6 lg:py-0">
      <div class="mx-auto flex h-full max-w-[1800px] flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white shadow-sm"><Cross class="h-5 w-5" /></div>
          <div class="min-w-0"><h1 class="truncate text-sm font-extrabold">{{ auth.user?.clinicName || 'Клиника' }} · Диспетчерская</h1><p class="text-xs text-slate-500">Оперативная смена · {{ currentTime }}</p></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold sm:flex" :class="connectionClass"><span class="h-2 w-2 rounded-full" :class="orderStore.isConnected ? 'bg-emerald-500' : 'bg-amber-500'"></span>{{ connectionLabel }}</div>
          <LanguageSwitcher />
          <ThemeToggle />
          <button type="button" class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Сменить пароль" title="Сменить пароль" @click="openPasswordDialog"><KeyRound class="h-4 w-4" /></button>
          <button type="button" class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Выйти из диспетчерской" title="Выйти" @click="logout"><LogOut class="h-4 w-4" /></button>
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" @click="openCreateDialog"><Plus class="h-4 w-4" /> Новый вызов</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1800px] p-3 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:p-4">
      <div v-if="logoutError || orderStore.errorMsg || crewStore.errorMsg" class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900" role="alert"><span>{{ logoutError || orderStore.errorMsg || crewStore.errorMsg }}</span><button type="button" class="min-h-11 rounded-lg bg-white px-3" @click="logoutError ? logout() : refreshData()">{{ logoutError ? 'Повторить выход' : 'Повторить' }}</button></div>

      <section class="mb-3 grid grid-cols-3 gap-2" aria-label="Сводка смены">
        <button type="button" class="ops-stat text-left" :class="activeFilter==='active'?'ring-2 ring-teal-700':''" :aria-pressed="activeFilter==='active'" @click="activeFilter='active'"><span>Активные</span><strong>{{ activeOrders.length }}</strong></button>
        <button type="button" class="ops-stat text-left" :class="activeFilter==='unassigned'?'ring-2 ring-amber-600':''" :aria-pressed="activeFilter==='unassigned'" @click="activeFilter='unassigned'"><span>Без бригады</span><strong :class="unassignedCount ? 'text-amber-700' : ''">{{ unassignedCount }}</strong></button>
        <div class="ops-stat"><span>Свободные бригады</span><strong class="text-teal-700">{{ availableCrews.length }}</strong></div>
      </section>

      <!-- Mobile Tab Switcher (< lg) -->
      <div class="mb-3 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm lg:hidden">
        <button
          type="button"
          class="flex-1 py-2.5 text-xs font-black rounded-lg transition-all"
          :class="mobileTab === 'orders' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          @click="mobileTab = 'orders'"
        >
          📋 Очередь ({{ filteredOrders.length }})
        </button>
        <button
          type="button"
          class="flex-1 py-2.5 text-xs font-black rounded-lg transition-all"
          :class="mobileTab === 'map' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'"
          @click="mobileTab = 'map'"
        >
          🗺️ Карта {{ selectedOrder ? '· Вызов выбрано' : '' }}
        </button>
      </div>

      <div class="grid min-h-[calc(100vh-156px)] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100dvh-10.75rem)] lg:min-h-0 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside :class="[ mobileTab === 'map' ? 'hidden lg:flex' : 'flex' ]" class="min-h-[580px] flex-col overflow-hidden border-b border-slate-200 lg:min-h-0 lg:border-b-0 lg:border-r" aria-label="Очередь вызовов">
          <div class="border-b border-slate-200 p-3">
            <div class="mb-3 flex items-center justify-between"><div><h2 class="text-sm font-extrabold">Очередь вызовов</h2><p class="mt-0.5 text-[11px] text-slate-500">Экстренные вызовы всегда сверху</p></div><span class="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold">{{ filteredOrders.length }}</span></div>
            <label class="relative mb-2 block"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span class="sr-only">Найти вызов</span><input v-model.trim="searchQuery" type="search" placeholder="Пациент, адрес или номер" class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold outline-none focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-400" /></label>
            <div class="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Фильтр вызовов"><button v-for="filter in filters" :key="filter.value" type="button" role="tab" :aria-selected="activeFilter===filter.value" class="whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors" :class="activeFilter===filter.value?'border-teal-600 bg-teal-700 text-white':'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'" @click="activeFilter=filter.value">{{ filter.label }}</button></div>
          </div>

          <div v-if="filteredOrders.length" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <button v-for="order in filteredOrders" :key="order.token" type="button" class="block w-full cursor-pointer border-b border-slate-100 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 dark:border-slate-800" :class="selectedToken===order.token?'bg-teal-50 ring-2 ring-inset ring-teal-700 dark:bg-teal-950/40':'hover:bg-slate-100/70 active:bg-slate-200/50 dark:hover:bg-slate-800/60'" @click="selectOrder(order.token)">
              <div class="mb-2 flex items-start justify-between gap-3"><div class="flex min-w-0 items-center gap-2"><span class="rounded px-1.5 py-1 text-[10px] font-black" :class="priorityClass(order)">{{ priorityLabel(order) }}</span><span class="font-mono text-xs font-extrabold">{{ order.id }}</span><span class="truncate text-xs font-bold text-slate-500">{{ statusText(order.status) }}</span></div><span class="shrink-0 font-mono text-xs font-black" :class="waitMinutes(order)>=10&&!isClosed(order)?'text-red-600':'text-slate-700 dark:text-slate-300'">{{ elapsed(order) }}</span></div>
              <p class="truncate text-sm font-extrabold">{{ order.patientName }}</p><p class="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-600 dark:text-slate-400"><MapPin class="h-3.5 w-3.5 shrink-0" />{{ order.address }}</p>
              <div class="mt-2 flex items-center justify-between gap-2 text-xs"><span class="truncate font-semibold" :class="isUnassigned(order)?'text-amber-700 dark:text-amber-400':'text-slate-600 dark:text-slate-400'">{{ isUnassigned(order)?'Нужно назначить бригаду':order.carNumber }}</span><ChevronRight class="h-4 w-4 shrink-0 text-slate-400" /></div>
            </button>
          </div>
          <div v-else class="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500"><div><CircleCheck class="mx-auto mb-2 h-8 w-8 text-teal-600" /><p class="font-bold">Подходящих вызовов нет</p><p class="mt-1 text-xs">Измените фильтр или поисковый запрос</p></div></div>
        </aside>

        <section :class="[ mobileTab === 'orders' ? 'hidden lg:block' : 'block' ]" class="relative min-h-[650px] bg-slate-200 lg:min-h-0">
          <LiveMap :orders="activeOrders" :focused-token="selectedToken" @select-order="selectOrder" />
          <article v-if="selectedOrder" class="absolute bottom-3 left-3 right-3 z-[500] max-h-[88%] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:left-auto lg:w-[460px]" aria-live="polite">
            <div class="mb-3 flex items-start justify-between gap-3"><div class="min-w-0"><div class="mb-1 flex items-center gap-2"><span class="rounded px-1.5 py-1 text-[10px] font-black" :class="priorityClass(selectedOrder)">{{ priorityLabel(selectedOrder) }}</span><span class="font-mono text-xs font-bold">{{ selectedOrder.id }}</span></div><h3 class="truncate text-base font-extrabold">{{ selectedOrder.patientName }}</h3><a :href="`tel:${selectedOrder.patientPhone}`" class="mt-1 inline-flex text-xs font-semibold text-teal-800 hover:underline dark:text-teal-400">{{ selectedOrder.patientPhone }}</a></div><button type="button" class="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Закрыть карточку" @click="selectedToken=null"><X class="h-4 w-4" /></button></div>

            <dl class="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 border-y border-slate-100 py-3 text-xs dark:border-slate-800"><dt class="text-slate-500 dark:text-slate-400">Адрес</dt><dd class="font-bold">{{ selectedOrder.address }}</dd><dt class="text-slate-500 dark:text-slate-400">Статус</dt><dd class="font-bold">{{ statusText(selectedOrder.status) }}<span v-if="selectedOrder.hospitalName" class="block text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">{{ selectedOrder.hospitalName }}</span></dd><dt class="text-slate-500 dark:text-slate-400">Бригада</dt><dd class="font-bold" :class="isUnassigned(selectedOrder)?'text-amber-700 dark:text-amber-400':''">{{ isUnassigned(selectedOrder)?'Не назначена':selectedOrder.carNumber }}</dd><dt class="text-slate-500 dark:text-slate-400">Создан</dt><dd class="font-mono font-black">{{ formatDateTime(selectedOrder.createdAt) }}</dd><template v-if="selectedOrder.cancelReason"><dt class="text-slate-500 dark:text-slate-400">Причина</dt><dd class="font-semibold text-red-700 dark:text-red-400">{{ selectedOrder.cancelReason }}</dd></template></dl>

            <section v-if="!isClosed(selectedOrder)" class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50" aria-labelledby="assignment-title">
              <div class="mb-2 flex items-center justify-between"><h4 id="assignment-title" class="text-xs font-black">Назначение бригады</h4><span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">Только свободные на дежурстве</span></div>
              <CustomSelect v-model="assignmentCrewId" :options="assignmentSelectOptions" placeholder="Выберите бригаду" />
              <div class="mt-2 flex gap-2"><button type="button" :disabled="assigning||assignmentCrewId===(selectedOrder.crewId||'')" class="min-h-11 w-full rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-md transition hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 dark:bg-emerald-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600" @click="saveAssignment">{{ assigning?'Сохраняем…':selectedOrder.crewId?'Переназначить':'Назначить бригаду' }}</button></div>
            </section>

            <div v-if="selectedOrder.accessInfo?.photoUrl&&!isClosed(selectedOrder)" class="mt-3"><p class="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Фото подъезда</p><a v-if="selectedPhotoUrl" :href="selectedPhotoUrl" target="_blank" rel="noopener"><img :src="selectedPhotoUrl" alt="Фото подъезда, переданное пациентом" class="h-28 w-full rounded-xl border border-slate-200 object-cover" /></a><p v-else-if="selectedPhotoLoading" class="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500" role="status">Загружаем защищённое фото…</p><p v-else-if="selectedPhotoError" class="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900" role="status">Фото временно недоступно.</p></div>

            <div v-if="selectedOrder.symptoms?.length" class="mt-3"><p class="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Симптомы</p><div class="flex flex-wrap gap-1.5"><span v-for="symptom in selectedOrder.symptoms" :key="symptom" class="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-900 ring-1 ring-red-100">{{ symptom }}</span></div></div>

            <div v-if="selectedOrder.auditLogs?.length" class="my-3 border-y border-slate-100 py-3"><p class="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Журнал событий</p><div class="max-h-28 space-y-1 overflow-y-auto text-[11px]"><div v-for="(log,index) in selectedOrder.auditLogs" :key="`${log.timestamp}-${index}`" class="flex items-start gap-2 text-slate-600"><span class="shrink-0 font-mono text-[10px] text-slate-400">{{ formatTime(log.timestamp) }}</span><span class="font-semibold">{{ log.text }}</span></div></div></div>

            <p v-if="actionNotice" class="mb-2 rounded-lg bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800" role="status">{{ actionNotice }}</p><p v-if="actionError" class="mb-2 rounded-lg bg-red-50 p-2.5 text-xs font-bold text-red-700" role="alert">{{ actionError }}</p>
            <div class="grid grid-cols-2 gap-2">
              <template v-if="!isClosed(selectedOrder)">
                <button type="button" :disabled="Boolean(linkPending)" class="ops-action bg-slate-950 text-white disabled:opacity-50" @click="openWhatsApp(selectedOrder)"><MessageSquare class="h-4 w-4" />{{ linkPending==='whatsapp'?'Готовим…':'WhatsApp' }}</button>
                <button type="button" :disabled="Boolean(linkPending)" class="ops-action border border-slate-200 bg-white disabled:opacity-50" @click="copyPatientLink(selectedOrder)"><Copy class="h-4 w-4" />{{ copiedToken===selectedOrder.token?'Скопировано':linkPending==='patient'?'Создаём…':'Ссылка пациенту' }}</button>
                <button v-if="selectedOrder.crewId" type="button" :disabled="Boolean(linkPending)" class="ops-action col-span-2 border border-teal-200 bg-teal-50 text-teal-900 disabled:opacity-50" @click="copyDriverLink(selectedOrder)"><Copy class="h-4 w-4" />{{ copiedCrewId===selectedOrder.crewId?'Ссылка скопирована':linkPending==='driver'?'Копируем…':'Ссылка экипажа' }}</button>
                <button type="button" class="ops-action col-span-2 border border-red-200 bg-red-50 text-red-800" @click="openCancelDialog"><Ban class="h-4 w-4" /> Отменить вызов</button>
              </template>
              <p v-else class="col-span-2 rounded-lg bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">Защищённые ссылки этого вызова больше не действуют.</p>
            </div>
          </article>
        </section>
      </div>
    </main>

    <div v-if="isCreateOpen" class="fixed inset-0 z-[1000] flex justify-end bg-slate-950/45" @click.self="closeCreateDialog"><aside ref="createDialog" tabindex="-1" class="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-call-title" aria-describedby="new-call-desc"><div class="mb-6 flex items-center justify-between"><div><p class="mb-1 text-xs font-bold uppercase tracking-wider text-red-600">Регистрация</p><h2 id="new-call-title" class="text-xl font-black">Новый вызов</h2><p id="new-call-desc" class="mt-1 text-xs text-slate-500">Заполните минимум данных — детали можно уточнить позже</p></div><button type="button" class="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-slate-100" aria-label="Закрыть" @click="closeCreateDialog"><X class="h-5 w-5" /></button></div><form class="space-y-4" @submit.prevent="handleCreateOrder"><CustomInput v-model="newOrderForm.patientName" label="Пациент или контактное лицо" placeholder="ФИО" :icon="User" required /><CustomInput v-model="newOrderForm.patientPhone" label="Телефон" placeholder="+7 (777) 000-00-00" :icon="Phone" type="tel" required /><CustomInput v-model="newOrderForm.address" label="Адрес вызова" placeholder="Улица, дом, квартира" :icon="MapPin" required />

        <CustomSelect v-model="newOrderForm.priority" label="Триаж / приоритет" :options="prioritySelectOptions" /><CustomSelect v-model="newOrderForm.crewId" label="Назначить свободную бригаду" :options="createCrewOptions" :icon="Ambulance" /><p v-if="!availableCrews.length" class="rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Свободных бригад нет. Вызов будет создан без назначения.</p><p v-if="createError" class="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ createError }}</p><button type="submit" :disabled="creating" class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-extrabold text-white disabled:opacity-50 dark:bg-red-600"><Send class="h-4 w-4" />{{ creating?'Создаём вызов…':'Создать вызов' }}</button></form></aside></div>

    <div v-if="isCancelOpen&&selectedOrder" class="fixed inset-0 z-[1100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" @click.self="closeCancelDialog"><div ref="cancelDialog" tabindex="-1" class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" role="alertdialog" aria-modal="true" aria-labelledby="cancel-title" aria-describedby="cancel-desc"><div class="grid h-11 w-11 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"><Ban class="h-5 w-5" /></div><h2 id="cancel-title" class="mt-4 text-lg font-black">Отменить вызов {{ selectedOrder.id }}?</h2><p id="cancel-desc" class="mt-2 text-sm text-slate-600 dark:text-slate-400">Бригада и пациент сразу увидят отмену. Действие попадёт в журнал.</p><label for="cancel-reason" class="mt-4 block text-xs font-bold text-slate-700 dark:text-slate-200">Причина отмены <span class="font-normal text-slate-400 dark:text-slate-500">(необязательно)</span></label><textarea id="cancel-reason" v-model="cancelReason" rows="3" maxlength="300" class="mt-1 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="Например: вызов отменён пациентом"></textarea><p v-if="cancelError" class="mt-2 text-xs font-bold text-red-700 dark:text-red-400" role="alert">{{ cancelError }}</p><div class="mt-5 grid grid-cols-2 gap-2"><button type="button" class="min-h-12 rounded-xl border border-slate-200 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" @click="closeCancelDialog">Вернуться</button><button type="button" :disabled="cancelling" class="min-h-12 rounded-xl bg-red-600 text-xs font-black text-white disabled:opacity-50" @click="confirmCancel">{{ cancelling?'Отменяем…':'Отменить вызов' }}</button></div></div></div>

    <div v-if="isPasswordOpen" class="fixed inset-0 z-[1200] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" @click.self="closePasswordDialog"><form ref="passwordDialog" tabindex="-1" class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" role="dialog" aria-modal="true" aria-labelledby="password-title" aria-describedby="password-desc" @submit.prevent="submitPasswordChange"><div class="grid h-11 w-11 place-items-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-400"><KeyRound class="h-5 w-5" /></div><h2 id="password-title" class="mt-4 text-lg font-black">Сменить пароль</h2><p id="password-desc" class="mt-1 text-sm text-slate-600 dark:text-slate-400">После смены пароля все рабочие сессии завершатся. Потребуется войти снова.</p><div class="mt-4 space-y-3"><label for="current-password" class="block text-xs font-bold text-slate-700 dark:text-slate-200">Текущий пароль</label><input id="current-password" v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" required class="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><label for="new-password" class="block text-xs font-bold text-slate-700 dark:text-slate-200">Новый пароль <span class="font-normal text-slate-400 dark:text-slate-500">(минимум 10 символов)</span></label><input id="new-password" v-model="passwordForm.newPassword" type="password" autocomplete="new-password" minlength="10" required class="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><label for="confirm-password" class="block text-xs font-bold text-slate-700 dark:text-slate-200">Повторите новый пароль</label><input id="confirm-password" v-model="passwordForm.confirmPassword" type="password" autocomplete="new-password" minlength="10" required class="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></div><p v-if="passwordError" class="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">{{ passwordError }}</p><div class="mt-5 grid grid-cols-2 gap-2"><button type="button" :disabled="passwordSaving" class="min-h-12 rounded-xl border border-slate-200 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" @click="closePasswordDialog">Отмена</button><button type="submit" :disabled="passwordSaving" class="min-h-12 rounded-xl bg-teal-800 px-3 text-xs font-black text-white disabled:opacity-50 dark:bg-teal-600">{{ passwordSaving?'Сохраняем…':'Сменить пароль' }}</button></div></form></div>

    <ConfirmModal
      :is-open="confirmModalState.isOpen"
      :title="confirmModalState.title"
      :description="confirmModalState.description"
      :variant="confirmModalState.variant"
      :confirm-text="confirmModalState.confirmText"
      @confirm="handleConfirmModalConfirm"
      @cancel="confirmModalState.isOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useOrderStore } from '@/stores/orderStore';
import { useCrewStore } from '@/stores/crewStore';
import { useAuthStore } from '@/stores/authStore';
import LiveMap from '@/components/LiveMap.vue';
import CustomInput from '@/components/ui/CustomInput.vue';
import CustomSelect, { type SelectOption } from '@/components/ui/CustomSelect.vue';
import ConfirmModal from '@/components/ui/ConfirmModal.vue';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { AlertTriangle, Ambulance, BadgeCheck, Ban, ChevronRight, CircleCheck, Copy, Cross, KeyRound, LogOut, MapPin, MessageSquare, Phone, Play, Plus, Search, Send, User, Users, X } from 'lucide-vue-next';
import type { CreatedOrder, Crew, Order, OrderPriority, OrderStatus } from '@/types';
import { ApiError, errorMessage, fetchAccessPhotoBlob } from '@/services/api';
import { focusFirstInModal, modalTrigger, restoreModalTrigger, trapModalFocus } from '@/utils/modalFocus';

type Filter = 'active' | 'unassigned' | 'en_route' | 'completed';
const orderStore=useOrderStore(), crewStore=useCrewStore(), auth=useAuthStore(), router=useRouter();
const selectedToken=ref<string|null>(null), activeFilter=ref<Filter>('active'), searchQuery=ref(''), assignmentCrewId=ref('');
const isCreateOpen=ref(false), createDialog=ref<HTMLElement|null>(null), coordinateLatInput=ref<HTMLInputElement|null>(null), creating=ref(false), createError=ref(''), showCoordinates=ref(false);
const isCancelOpen=ref(false), cancelDialog=ref<HTMLElement|null>(null), cancelReason=ref(''), cancelError=ref(''), cancelling=ref(false);
const isPasswordOpen=ref(false), passwordDialog=ref<HTMLElement|null>(null), passwordSaving=ref(false), passwordError=ref('');
const passwordForm=reactive({currentPassword:'',newPassword:'',confirmPassword:''});

const confirmModalState = reactive<{
  isOpen: boolean;
  title: string;
  description: string;
  variant: 'warning' | 'danger' | 'primary';
  confirmText: string;
  onConfirm: (() => Promise<void> | void) | null;
}>({
  isOpen: false,
  title: '',
  description: '',
  variant: 'warning',
  confirmText: 'Да, продолжить',
  onConfirm: null,
});

function triggerConfirmModal(config: { title: string; description: string; variant?: 'warning' | 'danger' | 'primary'; confirmText?: string; onConfirm: () => Promise<void> | void }) {
  confirmModalState.title = config.title;
  confirmModalState.description = config.description;
  confirmModalState.variant = config.variant || 'warning';
  confirmModalState.confirmText = config.confirmText || 'Да, продолжить';
  confirmModalState.onConfirm = config.onConfirm;
  confirmModalState.isOpen = true;
}

function handleConfirmModalConfirm() {
  const action = confirmModalState.onConfirm;
  confirmModalState.isOpen = false;
  confirmModalState.onConfirm = null;
  if (action) void action();
}

const prioritySelectOptions: SelectOption[] = [
  { value: 'EMERGENCY', label: '🔴 P1 · Угроза жизни' },
  { value: 'URGENT', label: '🟡 P2 · Неотложный' },
  { value: 'STANDARD', label: '🟢 P3 · Медицинская транспортировка' }
];
const assigning=ref(false), actionNotice=ref(''), actionError=ref(''), copiedToken=ref<string|null>(null), copiedViewerToken=ref<string|null>(null), copiedCrewId=ref<string|null>(null);
const linkPending=ref<'patient'|'viewer'|'driver'|'whatsapp'|null>(null);
const logoutError=ref('');
const selectedPhotoUrl=ref(''), selectedPhotoLoading=ref(false), selectedPhotoError=ref('');
const patientPaths=ref(new Map<string,string>()), now=ref(Date.now());
const simulationAvailable=window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1';
let clockId=0, noticeTimer=0, createIdempotencyKey='';
let createReturnFocus:HTMLElement|null=null, cancelReturnFocus:HTMLElement|null=null, passwordReturnFocus:HTMLElement|null=null;
let selectedPhotoController:AbortController|null=null;

const allOrders=computed(()=>orderStore.activeOrders);
const isClosed=(order:Order)=>order.expired||order.status==='COMPLETED'||order.status==='CANCELLED';
const activeOrders=computed(()=>allOrders.value.filter(order=>!isClosed(order)));
const selectedOrder=computed(()=>allOrders.value.find(order=>order.token===selectedToken.value)||null);
const isUnassigned=(order:Order)=>!order.crewId;
const unassignedCount=computed(()=>activeOrders.value.filter(isUnassigned).length);
const busyCrewIds=computed(()=>new Set(activeOrders.value.map(order=>order.crewId).filter((id):id is string=>Boolean(id))));
const availableCrews=computed(()=>crewStore.crews.filter(crew=>crew.status==='ON_DUTY'&&!busyCrewIds.value.has(crew.id)));
const selectedBusyCrewIds=computed(()=>new Set(activeOrders.value.filter(order=>order.token!==selectedOrder.value?.token).map(order=>order.crewId).filter((id):id is string=>Boolean(id))));
const assignmentOptions=computed(()=>crewStore.crews.map(crew=>{const busy=selectedBusyCrewIds.value.has(crew.id), unavailable=crew.status!=='ON_DUTY'&&crew.id!==selectedOrder.value?.crewId;return{crew,disabled:busy||unavailable,label:`${crew.name} · ${crew.carPlate}${busy?' · занята':unavailable?` · ${crewStatus(crew.status)}`:''}`};}));
const assignmentSelectOptions=computed<SelectOption[]>(()=>{
  const options: SelectOption[] = [];
  if (!selectedOrder.value?.crewId) {
    options.push({ value: '', label: 'Без назначения' });
  }
  options.push(...assignmentOptions.value.map(opt => ({ value: opt.crew.id, label: opt.label, disabled: opt.disabled })));
  return options;
});
const filters:{value:Filter;label:string}[]=[{value:'active',label:'Активные'},{value:'unassigned',label:'Без бригады'},{value:'en_route',label:'В пути'},{value:'completed',label:'Архив'}];
const priorityRank:Record<OrderPriority,number>={EMERGENCY:0,URGENT:1,STANDARD:2};
const filteredOrders=computed(()=>allOrders.value.filter(order=>{const query=searchQuery.value.toLocaleLowerCase();const matches=!query||[order.id,order.patientName,order.address,order.patientPhone,order.carNumber].some(value=>String(value||'').toLocaleLowerCase().includes(query));if(!matches)return false;if(activeFilter.value==='completed')return isClosed(order);if(isClosed(order))return false;if(activeFilter.value==='unassigned')return isUnassigned(order);if(activeFilter.value==='en_route')return order.status==='EN_ROUTE'||order.status==='HOSPITAL_TRANSPORT';return true;}).sort((a,b)=>(priorityRank[a.priority||'STANDARD']-priorityRank[b.priority||'STANDARD'])||Number(isUnassigned(b))-Number(isUnassigned(a))||+new Date(a.createdAt)-+new Date(b.createdAt)));
const createCrewOptions=computed<SelectOption[]>(()=>[{value:'',label:'Оставить без назначения'},...availableCrews.value.map(crew=>({value:crew.id,label:`${crew.name} · ${crew.type}`,sub:crew.carPlate}))]);
const newOrderForm=reactive({patientName:'',patientPhone:'',address:'',lat:'',lng:'',crewId:'',priority:'EMERGENCY' as OrderPriority});
const currentTime=computed(()=>new Date(now.value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
const connectionLabel=computed(()=>({connected:'Связь стабильна',connecting:'Подключение…',reconnecting:'Восстанавливаем связь…',offline:'Нет связи',idle:'Нет связи'}[orderStore.connectionState]));
const connectionClass=computed(()=>orderStore.isConnected?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-amber-200 bg-amber-50 text-amber-900');

onMounted(()=>{void refreshData();clockId=window.setInterval(()=>now.value=Date.now(),1000);window.addEventListener('keydown',onKeydown);});
onBeforeUnmount(()=>{clearSelectedPhoto();window.clearInterval(clockId);window.clearTimeout(noticeTimer);window.removeEventListener('keydown',onKeydown);});
watch(selectedOrder,order=>assignmentCrewId.value=order?.crewId||'',{immediate:true});
watch(filteredOrders,orders=>{if(selectedToken.value&&!orders.some(order=>order.token===selectedToken.value))selectedToken.value=orders[0]?.token||null;});
watch([()=>auth.user?.id,()=>auth.logoutPending],([userId,logoutPending])=>{if(!userId||logoutPending)clearLocalSensitiveState();});
watch([()=>selectedOrder.value?.accessInfo?.photoUrl,()=>selectedOrder.value?.status],()=>void loadSelectedPhoto(),{immediate:true});

const mobileTab = ref<'orders' | 'map'>('orders');

async function refreshData(){await Promise.all([orderStore.joinDispatcherRoom(),crewStore.fetchCrews()]);}
function selectOrder(token:string){selectedToken.value=token;actionError.value='';actionNotice.value='';mobileTab.value='map';}
function waitMinutes(order:Order){return Math.max(0,Math.floor((now.value-new Date(order.createdAt).getTime())/60000)||0);}
function elapsed(order:Order){const end=isClosed(order)?new Date(order.completedAt||order.cancelledAt||order.updatedAt||now.value).getTime():now.value;const minutes=Math.max(0,Math.floor((end-new Date(order.createdAt).getTime())/60000)||0);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function formatTime(value:string){return new Date(value).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function formatDateTime(value:string){return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function formatRelative(value:string){const seconds=Math.max(0,Math.floor((now.value-new Date(value).getTime())/1000));return seconds<10?'только что':seconds<60?`${seconds} сек назад`:`${Math.floor(seconds/60)} мин назад`;}
function priorityLabel(order:Order){return order.priority==='EMERGENCY'?'P1':order.priority==='URGENT'?'P2':'P3';}
function priorityClass(order:Order){return order.priority==='EMERGENCY'?'bg-red-100 text-red-800':order.priority==='URGENT'?'bg-amber-100 text-amber-900':'bg-slate-100 text-slate-700';}
function statusText(status:OrderStatus){return({ACCEPTED:'Принят',EN_ROUTE:'В пути',ARRIVED:'На месте',HOSPITAL_TRANSPORT:'В стационар',COMPLETED:'Завершён',CANCELLED:'Отменён'} as Record<OrderStatus,string>)[status];}
function crewStatus(status:Crew['status']){return({ON_DUTY:'на дежурстве',ON_CALL:'на вызове',BREAK:'перерыв',OFF_DUTY:'не на смене'} as Record<Crew['status'],string>)[status];}

function setNotice(message:string){actionNotice.value=message;window.clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>actionNotice.value='',3500);}
function clearLocalSensitiveState(){clearSelectedPhoto();patientPaths.value=new Map();selectedToken.value=null;searchQuery.value='';assignmentCrewId.value='';cancelReason.value='';createError.value='';cancelError.value='';passwordError.value='';actionNotice.value='';actionError.value='';linkPending.value=null;isCreateOpen.value=false;isCancelOpen.value=false;isPasswordOpen.value=false;showCoordinates.value=false;createReturnFocus=null;cancelReturnFocus=null;passwordReturnFocus=null;Object.assign(newOrderForm,{patientName:'',patientPhone:'',address:'',lat:'',lng:'',crewId:'',priority:'EMERGENCY'});Object.assign(passwordForm,{currentPassword:'',newPassword:'',confirmPassword:''});}
function clearSelectedPhoto(){selectedPhotoController?.abort();selectedPhotoController=null;if(selectedPhotoUrl.value)URL.revokeObjectURL(selectedPhotoUrl.value);selectedPhotoUrl.value='';selectedPhotoLoading.value=false;selectedPhotoError.value='';}
async function loadSelectedPhoto(){clearSelectedPhoto();const selected=selectedOrder.value,photoUrl=selected?.accessInfo?.photoUrl;if(!selected||!photoUrl||isClosed(selected))return;const controller=new AbortController();selectedPhotoController=controller;selectedPhotoLoading.value=true;try{const blob=await fetchAccessPhotoBlob(photoUrl,undefined,controller.signal);if(controller.signal.aborted||selectedPhotoController!==controller)return;selectedPhotoUrl.value=URL.createObjectURL(blob);}catch{if(!controller.signal.aborted&&selectedPhotoController===controller)selectedPhotoError.value='Фото временно недоступно';}finally{if(selectedPhotoController===controller){selectedPhotoController=null;selectedPhotoLoading.value=false;}}}
function newRequestKey(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():`call-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function openCreateDialog(event?:Event){createReturnFocus=modalTrigger(event);createIdempotencyKey=newRequestKey();isCreateOpen.value=true;createError.value='';void nextTick(()=>focusFirstInModal(createDialog.value));}
function finishCreateDialog(){isCreateOpen.value=false;createIdempotencyKey='';const trigger=createReturnFocus;createReturnFocus=null;void nextTick(()=>restoreModalTrigger(trigger));}
function closeCreateDialog(){if(!creating.value)finishCreateDialog();}
function openCancelDialog(event?:Event){cancelReturnFocus=modalTrigger(event);isCancelOpen.value=true;cancelReason.value='';cancelError.value='';void nextTick(()=>focusFirstInModal(cancelDialog.value));}
function finishCancelDialog(){isCancelOpen.value=false;const trigger=cancelReturnFocus;cancelReturnFocus=null;void nextTick(()=>restoreModalTrigger(trigger));}
function closeCancelDialog(){if(!cancelling.value)finishCancelDialog();}
function openPasswordDialog(event?:Event){passwordReturnFocus=modalTrigger(event);passwordError.value='';Object.assign(passwordForm,{currentPassword:'',newPassword:'',confirmPassword:''});isPasswordOpen.value=true;void nextTick(()=>focusFirstInModal(passwordDialog.value));}
function finishPasswordDialog(){isPasswordOpen.value=false;Object.assign(passwordForm,{currentPassword:'',newPassword:'',confirmPassword:''});const trigger=passwordReturnFocus;passwordReturnFocus=null;void nextTick(()=>restoreModalTrigger(trigger));}
function closePasswordDialog(){if(!passwordSaving.value)finishPasswordDialog();}
function onKeydown(event:KeyboardEvent){if(event.key==='Tab'){if(isPasswordOpen.value)trapModalFocus(event,passwordDialog.value);else if(isCancelOpen.value)trapModalFocus(event,cancelDialog.value);else if(isCreateOpen.value)trapModalFocus(event,createDialog.value);return;}if(event.key!=='Escape')return;if(isPasswordOpen.value)closePasswordDialog();else if(isCancelOpen.value)closeCancelDialog();else if(isCreateOpen.value)closeCreateDialog();}

import { z } from 'zod';

const createOrderSchema = z.object({
  patientName: z.string().min(2, 'Укажите ФИО пациента или контактное лицо'),
  patientPhone: z.string().min(6, 'Укажите корректный контактный номер телефона'),
  address: z.string().min(3, 'Укажите подробный адрес вызова')
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Укажите текущий пароль'),
  newPassword: z.string().min(10, 'Новый пароль должен содержать минимум 10 символов'),
  confirmPassword: z.string().min(10, 'Подтверждение пароля должно содержать минимум 10 символов')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Новые пароли не совпадают',
  path: ['confirmPassword']
});

async function submitPasswordChange(){
  passwordError.value='';
  const result = passwordChangeSchema.safeParse(passwordForm);
  if (!result.success) {
    passwordError.value = result.error.issues[0]?.message || 'Ошибка заполнения формы';
    return;
  }
  passwordSaving.value=true;
  try{
    await auth.changePassword(passwordForm.currentPassword,passwordForm.newPassword);
    Object.assign(passwordForm,{currentPassword:'',newPassword:'',confirmPassword:''});
    isPasswordOpen.value=false;
    await router.replace({path:'/login',query:{passwordChanged:'1'}});
  }catch(error){
    passwordError.value=errorMessage(error,'Не удалось сменить пароль');
  }finally{
    passwordSaving.value=false;
  }
}

async function handleCreateOrder(){
  createError.value='';
  const result = createOrderSchema.safeParse(newOrderForm);
  if (!result.success) {
    createError.value = result.error.issues[0]?.message || 'Ошибка заполнения формы';
    return;
  }
  creating.value=true;
  createIdempotencyKey||=newRequestKey();
  try{
    const created=await orderStore.createOrder({patientName:newOrderForm.patientName,patientPhone:newOrderForm.patientPhone,address:newOrderForm.address,crewId:newOrderForm.crewId||null,priority:newOrderForm.priority},createIdempotencyKey);
    rememberPatientPath(created);
    Object.assign(newOrderForm,{patientName:'',patientPhone:'',address:'',lat:'',lng:'',crewId:'',priority:'EMERGENCY'});
    showCoordinates.value=false;
    selectedToken.value=created.token;
    finishCreateDialog();
    setNotice(created.crewId?'Вызов создан и передан бригаде':'Вызов создан без назначения');
  }catch(error){
    createError.value=errorMessage(error,'Не удалось создать вызов');
  }finally{
    creating.value=false;
  }
}
function rememberPatientPath(created:CreatedOrder){if(created.patientAccessPath){const next=new Map(patientPaths.value);next.set(created.token,created.patientAccessPath);patientPaths.value=next;}}
async function executeSaveAssignment(){if(!selectedOrder.value||!assignmentCrewId.value)return;const hadCrew=Boolean(selectedOrder.value.crewId);assigning.value=true;actionError.value='';try{await orderStore.assignOrder(selectedOrder.value.token,assignmentCrewId.value);setNotice(hadCrew?'Вызов переназначен на новую бригаду':'Бригада назначена на вызов');}catch(error){actionError.value=errorMessage(error,'Не удалось изменить назначение');assignmentCrewId.value=selectedOrder.value.crewId||'';}finally{assigning.value=false;}}

function saveAssignment(){
  if(!selectedOrder.value||!assignmentCrewId.value)return;
  if(assignmentCrewId.value === selectedOrder.value.crewId)return;

  const isEnRoute = ['EN_ROUTE','ARRIVED','HOSPITAL_TRANSPORT'].includes(selectedOrder.value.status);
  if(isEnRoute){
    const currentCrew = selectedOrder.value.carNumber || 'текущий экипаж';
    const statusText = selectedOrder.value.status === 'EN_ROUTE' ? 'уже выехал к пациенту' : selectedOrder.value.status === 'ARRIVED' ? 'уже прибыл на место' : 'госпитализирует пациента';
    triggerConfirmModal({
      title: 'Передать активный вызов другой бригаде?',
      description: `Экипаж ${currentCrew} ${statusText}. Передача вызова отозовёт маршрут у текущего экипажа и передаст вызов новой бригаде. Вы уверены?`,
      variant: 'warning',
      confirmText: 'Передать вызов',
      onConfirm: () => executeSaveAssignment()
    });
  } else {
    void executeSaveAssignment();
  }
}
async function confirmCancel(){if(!selectedOrder.value)return;cancelling.value=true;cancelError.value='';try{await orderStore.cancelOrder(selectedOrder.value.token,cancelReason.value);finishCancelDialog();setNotice('Вызов отменён, бригада уведомлена');}catch(error){cancelError.value=errorMessage(error,'Не удалось отменить вызов');}finally{cancelling.value=false;}}

async function patientPath(order:Order){const cached=patientPaths.value.get(order.token);if(cached)return cached;const access=await orderStore.createPatientAccessLink(order.token);if(!access.patientAccessPath)throw new Error('Сервер не вернул ссылку пациента');const next=new Map(patientPaths.value);next.set(order.token,access.patientAccessPath);patientPaths.value=next;return access.patientAccessPath;}
function hasPatientPath(order:Order){return patientPaths.value.has(order.token);}
async function copyText(text:string){try{await navigator.clipboard.writeText(text);}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}}

async function copyPatientLink(order:Order){
  linkPending.value='patient';
  actionError.value='';
  try{
    const path=await patientPath(order);
    await copyText(`${window.location.origin}${path}`);
    copiedToken.value=order.token;
    window.setTimeout(()=>copiedToken.value=null,2200);
  }catch(error){
    actionError.value=errorMessage(error,'Не удалось скопировать ссылку пациента');
  }finally{
    linkPending.value=null;
  }
}

function copyViewerLink(order:Order){
  linkPending.value='viewer';actionError.value='';
  orderStore.createViewerAccessLink(order.token).then(access=>{
    return copyText(`${window.location.origin}${access.path}`);
  }).then(()=>{
    copiedViewerToken.value=order.token;
    window.setTimeout(()=>copiedViewerToken.value=null,2200);
  }).catch(error=>{
    actionError.value=errorMessage(error,'Не удалось создать ссылку для близких');
  }).finally(()=>{
    linkPending.value=null;
  });
}

async function openWhatsApp(order:Order){
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;linkPending.value='whatsapp';actionError.value='';
  try{
    const path=await patientPath(order);
    const text=`Здравствуйте, ${order.patientName}. ${order.carNumber?`К вам направлена ${order.carNumber}.`:'Бригада назначается.'} Отслеживание вызова: ${window.location.origin}${path}`;
    const url=`https://wa.me/${order.patientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`;
    if(popup)popup.location.href=url;else window.open(url,'_blank','noopener');
  }catch(error){
    popup?.close();
    actionError.value=errorMessage(error,'Не удалось подготовить сообщение');
  }finally{
    linkPending.value=null;
  }
}

async function copyDriverLink(order:Order){
  if(!order.crewId)return;
  linkPending.value='driver';actionError.value='';
  try{
    const access=await orderStore.getCrewAccessLink(order.crewId);
    await copyText(`${window.location.origin}${access.path}`);
    copiedCrewId.value=order.crewId;
    window.setTimeout(()=>copiedCrewId.value=null,2200);
  }catch(error){
    actionError.value=errorMessage(error,'Не удалось скопировать ссылку экипажа');
  }finally{
    linkPending.value=null;
  }
}
async function toggleSimulation(order:Order){actionError.value='';try{await orderStore.toggleSimulation(order.token,!order.isSimulating);setNotice(order.isSimulating?'Демо-движение остановлено':'Демо-движение запущено');}catch(error){actionError.value=errorMessage(error,'Демо-режим недоступен');}}
async function logout(){logoutError.value='';try{await auth.logout();await router.replace('/login');}catch(error){logoutError.value=errorMessage(error,'Не удалось завершить серверную сессию. Повторите выход перед тем, как оставить устройство.');}}
</script>

<style scoped>
.ops-stat{display:flex;min-height:4rem;align-items:center;justify-content:space-between;border:1px solid #e2e8f0;border-radius:.75rem;background:#fff;padding:.75rem 1rem;box-shadow:0 1px 2px rgb(15 23 42/.05);cursor:pointer;user-select:none;transition:all 0.15s cubic-bezier(0.16, 1, 0.3, 1)}
.ops-stat:hover{border-color:#cbd5e1;transform:translateY(-1px);box-shadow:0 4px 12px -2px rgb(15 23 42/.08)}
.ops-stat:active{transform:translateY(0)}
.ops-stat span{color:#64748b;font-size:11px;font-weight:700;letter-spacing:.025em;text-transform:uppercase}
.ops-stat strong{font-family:ui-monospace,monospace;font-size:1.5rem;font-weight:900}
.ops-action{display:flex;min-height:2.75rem;align-items:center;justify-content:center;gap:.5rem;border-radius:.65rem;padding:.5rem .75rem;font-size:.75rem;font-weight:800;cursor:pointer;user-select:none;transition:all 0.15s cubic-bezier(0.16, 1, 0.3, 1)}
.ops-action:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px -2px rgb(15 23 42/.12);filter:brightness(.96)}
.ops-action:active:not(:disabled){transform:translateY(0);filter:brightness(.92)}
.ops-action:disabled{cursor:not-allowed !important;opacity:.5}
</style>
