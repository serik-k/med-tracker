<template>
  <div class="landing-page">
    <a class="skip-link" href="#main-content">{{ text.skip }}</a>

    <header class="site-header">
      <nav class="header-inner" :aria-label="text.navigation">
        <RouterLink class="brand" to="/" :aria-label="text.brandHome">
          <span class="brand-mark"><HeartPulse :size="21" stroke-width="2.2" aria-hidden="true" /></span>
          <span class="brand-copy"><strong>MedTracker</strong><small>{{ text.brandNote }}</small></span>
        </RouterLink>

        <div class="desktop-nav">
          <a href="#product">{{ text.navProduct }}</a>
          <a href="#workflow">{{ text.navWorkflow }}</a>
          <a href="#roles">{{ text.navRoles }}</a>
          <a href="#safety">{{ text.navSafety }}</a>
        </div>

        <div class="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <RouterLink class="login-button" to="/login"><LogIn :size="17" aria-hidden="true" /><span>{{ text.login }}</span></RouterLink>
        </div>
      </nav>
    </header>

    <main id="main-content">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-inner">
          <div class="hero-copy">
            <p class="eyebrow"><span aria-hidden="true"></span>{{ text.eyebrow }}</p>
            <h1 id="hero-title">{{ text.heroTitle }} <span>{{ text.heroAccent }}</span></h1>
            <p class="hero-lead">{{ text.heroBody }}</p>

            <div class="hero-actions">
              <RouterLink class="button button-primary" to="/login">{{ text.primaryCta }}<ArrowRight :size="18" aria-hidden="true" /></RouterLink>
              <a class="button button-secondary" href="#workflow">{{ text.secondaryCta }}</a>
              <button v-if="installPrompt" type="button" class="button button-quiet" @click="installApp"><Download :size="17" aria-hidden="true" />{{ text.installApp }}</button>
            </div>

            <ul class="hero-points" role="list">
              <li v-for="point in text.heroPoints" :key="point"><span><Check :size="14" stroke-width="3" aria-hidden="true" /></span>{{ point }}</li>
            </ul>
          </div>

          <div class="product-preview" :aria-label="text.previewAria">
            <div class="preview-topbar">
              <div class="preview-title"><span class="preview-logo"><HeartPulse :size="17" aria-hidden="true" /></span><div><strong>{{ text.previewTitle }}</strong><small>{{ text.previewSubtitle }}</small></div></div>
              <span class="live-pill"><span></span>{{ text.live }}</span>
            </div>

            <div class="preview-stats">
              <div><small>{{ text.activeCalls }}</small><strong>3</strong></div>
              <div><small>{{ text.freeCrews }}</small><strong>5</strong></div>
              <div><small>{{ text.averageEta }}</small><strong>12 <em>{{ text.minutes }}</em></strong></div>
            </div>

            <div class="preview-workspace">
              <div class="preview-queue">
                <div class="queue-heading"><strong>{{ text.queue }}</strong><span>3</span></div>
                <article class="call-item urgent"><div class="call-meta"><strong>MT-2408</strong><span>P1</span></div><p>{{ text.demoAddress1 }}</p><small>{{ text.crew103 }} · {{ text.enRoute }}</small></article>
                <article class="call-item"><div class="call-meta"><strong>MT-2407</strong><span>P2</span></div><p>{{ text.demoAddress2 }}</p><small>{{ text.assignmentPending }}</small></article>
                <article class="call-item"><div class="call-meta"><strong>MT-2406</strong><span>P3</span></div><p>{{ text.demoAddress3 }}</p><small>{{ text.crew101 }} · {{ text.accepted }}</small></article>
              </div>

              <div class="route-panel">
                <div class="route-heading"><div><small>{{ text.currentRoute }}</small><strong>{{ text.crew103 }}</strong></div><span>{{ text.enRoute }}</span></div>
                <div class="map-canvas">
                  <svg viewBox="0 0 520 270" preserveAspectRatio="none" aria-hidden="true">
                    <path class="street" d="M-20 55 L150 170 L300 90 L540 175" />
                    <path class="street" d="M40 -20 L205 290" />
                    <path class="street" d="M250 -20 L350 290" />
                    <path class="street" d="M-10 220 L540 115" />
                    <path class="route-shadow" d="M46 224 C105 205 115 145 176 154 C249 165 286 92 365 95 C419 96 447 65 484 49" />
                    <path class="route-line" d="M46 224 C105 205 115 145 176 154 C249 165 286 92 365 95 C419 96 447 65 484 49" />
                  </svg>
                  <span class="ambulance-pin"><Ambulance :size="18" aria-hidden="true" /></span>
                  <span class="destination-pin"><MapPin :size="17" fill="currentColor" aria-hidden="true" /></span>
                  <div class="eta-card"><small>{{ text.eta }}</small><strong>8–11 {{ text.minutes }}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="proof-strip" :aria-label="text.proofAria">
          <div v-for="item in proofItems" :key="item.title"><component :is="item.icon" :size="21" aria-hidden="true" /><span><strong>{{ item.title }}</strong><small>{{ item.body }}</small></span></div>
        </div>
      </section>

      <section id="product" class="section product-section" aria-labelledby="product-title">
        <div class="section-inner">
          <div class="section-heading centered"><p>{{ text.productKicker }}</p><h2 id="product-title">{{ text.productTitle }}</h2><span>{{ text.productBody }}</span></div>
          <div class="feature-grid">
            <article v-for="feature in featureItems" :key="feature.title" class="feature-card">
              <span class="feature-icon"><component :is="feature.icon" :size="22" aria-hidden="true" /></span>
              <h3>{{ feature.title }}</h3><p>{{ feature.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="workflow" class="section workflow-section" aria-labelledby="workflow-title">
        <div class="section-inner workflow-layout">
          <div class="section-heading"><p>{{ text.workflowKicker }}</p><h2 id="workflow-title">{{ text.workflowTitle }}</h2><span>{{ text.workflowBody }}</span></div>
          <ol class="steps-list">
            <li v-for="(step, index) in workflowSteps" :key="step.title">
              <span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="step-icon"><component :is="step.icon" :size="21" aria-hidden="true" /></span>
              <div><h3>{{ step.title }}</h3><p>{{ step.body }}</p></div>
            </li>
          </ol>
        </div>
      </section>

      <section id="roles" class="section roles-section" aria-labelledby="roles-title">
        <div class="section-inner">
          <div class="section-heading centered"><p>{{ text.rolesKicker }}</p><h2 id="roles-title">{{ text.rolesTitle }}</h2><span>{{ text.rolesBody }}</span></div>
          <div class="role-grid">
            <article v-for="role in roleItems" :key="role.title" class="role-card">
              <div class="role-card-head"><span><component :is="role.icon" :size="23" aria-hidden="true" /></span><small>{{ role.tag }}</small></div>
              <h3>{{ role.title }}</h3><p>{{ role.body }}</p>
              <ul role="list"><li v-for="point in role.points" :key="point"><Check :size="15" stroke-width="2.7" aria-hidden="true" />{{ point }}</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section id="safety" class="section safety-section" aria-labelledby="safety-title">
        <div class="section-inner safety-card">
          <div class="safety-copy"><p>{{ text.safetyKicker }}</p><h2 id="safety-title">{{ text.safetyTitle }}</h2><span>{{ text.safetyBody }}</span><small>{{ text.safetyNote }}</small></div>
          <div class="safety-list">
            <div v-for="item in safetyItems" :key="item.title"><span><component :is="item.icon" :size="20" aria-hidden="true" /></span><div><strong>{{ item.title }}</strong><p>{{ item.body }}</p></div></div>
          </div>
        </div>
      </section>

      <section class="section faq-section" aria-labelledby="faq-title">
        <div class="section-inner faq-layout">
          <div class="section-heading"><p>{{ text.faqKicker }}</p><h2 id="faq-title">{{ text.faqTitle }}</h2><span>{{ text.faqBody }}</span></div>
          <div class="faq-list">
            <details v-for="(item, index) in faqItems" :key="item.question" :open="index === 0"><summary>{{ item.question }}<Plus :size="19" aria-hidden="true" /></summary><p>{{ item.answer }}</p></details>
          </div>
        </div>
      </section>

      <section class="final-cta" aria-labelledby="cta-title">
        <div><p>{{ text.ctaKicker }}</p><h2 id="cta-title">{{ text.ctaTitle }}</h2><span>{{ text.ctaBody }}</span></div>
        <RouterLink class="button button-white" to="/login">{{ text.primaryCta }}<ArrowRight :size="18" aria-hidden="true" /></RouterLink>
      </section>
    </main>

    <footer class="site-footer"><div><span class="brand-mark small"><HeartPulse :size="17" aria-hidden="true" /></span><strong>MedTracker</strong><p>{{ text.footer }}</p></div><small>© 2026 MedTracker</small></footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue';
import { RouterLink } from 'vue-router';
import { Activity, Ambulance, ArrowRight, BellRing, Check, ClipboardCheck, Clock3, Download, HeartPulse, KeyRound, Layers3, LogIn, MapPin, MapPinned, PhoneCall, Plus, Radio, Route, ShieldCheck, Smartphone, UsersRound } from 'lucide-vue-next';
import { useLangStore } from '@/stores/langStore';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import type { Language } from '@/i18n/translations';

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }
interface InfoItem { icon: Component; title: string; body: string }
interface RoleItem extends InfoItem { tag: string; points: string[] }

const langStore = useLangStore();
const installPrompt = ref<BeforeInstallPromptEvent | null>(null);
const languages: { code: Language; label: string }[] = [{ code: 'ru', label: 'RU' }, { code: 'kk', label: 'KZ' }, { code: 'en', label: 'EN' }];

const copy = {
  ru: {
    skip:'Перейти к содержимому', navigation:'Навигация по странице', language:'Язык интерфейса', brandHome:'MedTracker — главная', previewAria:'Демонстрация диспетчерского интерфейса', proofAria:'Ключевые свойства продукта', brandNote:'выездная помощь', login:'Войти', navProduct:'Возможности', navWorkflow:'Как работает', navRoles:'Для кого', navSafety:'Безопасность',
    eyebrow:'Платформа для частной скорой помощи', heroTitle:'Вызов, бригада и пациент —', heroAccent:'в одном рабочем контуре', heroBody:'Диспетчер видит очередь и свободные бригады, экипаж получает только актуальный вызов, а пациент — понятный статус и время прибытия.', primaryCta:'Открыть рабочий кабинет', secondaryCta:'Посмотреть процесс', installApp:'Установить', heroPoints:['Без установки для пациента','Статусы и GPS в реальном времени','Данные разделены по клиникам'],
    previewTitle:'Диспетчерская MedClinic', previewSubtitle:'Оперативная смена · сегодня', live:'НА СВЯЗИ', activeCalls:'Активные вызовы', freeCrews:'Свободные бригады', averageEta:'Средний ETA', minutes:'мин', queue:'Очередь вызовов', demoAddress1:'ул. Центральная, 42', demoAddress2:'ул. Парковая, 18', demoAddress3:'квартал Северный', crew103:'Бригада №103', crew101:'Бригада №101', enRoute:'в пути', accepted:'приняла', assignmentPending:'Ожидает назначения', currentRoute:'Активный маршрут', eta:'До прибытия',
    productKicker:'Всё важное — на первом уровне', productTitle:'Меньше переключений. Больше контроля над сменой.', productBody:'Система собирает назначение, маршрут, связь и историю вызова в одном понятном сценарии.',
    workflowKicker:'Сквозной процесс', workflowTitle:'От звонка до завершения — четыре ясных этапа', workflowBody:'Каждый следующий шаг подтверждается сервером и сразу появляется у тех, кому он нужен.',
    rolesKicker:'Три рабочих режима', rolesTitle:'Интерфейс под задачу, а не один экран для всех', rolesBody:'Диспетчер, бригада и пациент видят разный объём информации и разные действия.',
    safetyKicker:'Контроль доступа', safetyTitle:'Чувствительные данные не должны жить дольше рабочего сценария', safetyBody:'Доступ ограничивается ролью, клиникой и сроком действия ссылки. Критичные действия оставляют понятный статус и запись в истории.', safetyNote:'MedTracker — операционный инструмент и не заменяет государственную экстренную службу, МИС или медицинские регламенты клиники.',
    faqKicker:'Коротко о главном', faqTitle:'Что важно знать до пилота', faqBody:'Без маркетинговых обещаний — только границы продукта и реальный рабочий сценарий.',
    ctaKicker:'Готовы к пилоту?', ctaTitle:'Соберите прозрачную выездную смену', ctaBody:'Настройте клинику, сотрудников и бригады, затем проверьте полный сценарий на тестовом вызове.', footer:'операционная платформа выездной медицинской помощи'
  },
  kk: {
    skip:'Мазмұнға өту', navigation:'Бет навигациясы', language:'Интерфейс тілі', brandHome:'MedTracker — басты бет', previewAria:'Диспетчер интерфейсінің көрсетілімі', proofAria:'Өнімнің негізгі қасиеттері', brandNote:'көшпелі көмек', login:'Кіру', navProduct:'Мүмкіндіктер', navWorkflow:'Қалай жұмыс істейді', navRoles:'Кімге арналған', navSafety:'Қауіпсіздік',
    eyebrow:'Жекеменшік жедел жәрдем платформасы', heroTitle:'Шақыру, бригада және пациент —', heroAccent:'бір жұмыс ортасында', heroBody:'Диспетчер кезек пен бос бригадаларды көреді, экипаж тек өзекті шақыруды алады, ал пациент мәртебе мен келу уақытын түсінікті түрде бақылайды.', primaryCta:'Жұмыс кабинетіне кіру', secondaryCta:'Процесті көру', installApp:'Орнату', heroPoints:['Пациентке орнату қажет емес','Нақты уақыттағы мәртебе және GPS','Клиникалар бойынша деректер бөлінген'],
    previewTitle:'MedClinic диспетчерлік орталығы', previewSubtitle:'Жедел ауысым · бүгін', live:'БАЙЛАНЫСТА', activeCalls:'Белсенді шақырулар', freeCrews:'Бос бригадалар', averageEta:'Орташа ETA', minutes:'мин', queue:'Шақырулар кезегі', demoAddress1:'Орталық көшесі, 42', demoAddress2:'Саябақ көшесі, 18', demoAddress3:'Солтүстік квартал', crew103:'№103 бригада', crew101:'№101 бригада', enRoute:'жолда', accepted:'қабылдады', assignmentPending:'Тағайындауды күтуде', currentRoute:'Белсенді бағыт', eta:'Келуге дейін',
    productKicker:'Маңыздысы бірден көрінеді', productTitle:'Аз ауысу. Ауысымды көбірек бақылау.', productBody:'Жүйе тағайындауды, бағытты, байланысты және шақыру тарихын бір түсінікті сценарийге жинайды.',
    workflowKicker:'Толық процесс', workflowTitle:'Қоңыраудан аяқтауға дейін төрт анық кезең', workflowBody:'Әр келесі қадам сервермен расталып, қажет қатысушыларға бірден көрінеді.',
    rolesKicker:'Үш жұмыс режимі', rolesTitle:'Барлығына бір экран емес, әр міндетке өз интерфейсі', rolesBody:'Диспетчер, бригада және пациент әртүрлі ақпарат пен әрекеттерді көреді.',
    safetyKicker:'Қолжетімділікті бақылау', safetyTitle:'Сезімтал деректер жұмыс сценарийінен ұзақ сақталмауы тиіс', safetyBody:'Қолжетімділік рөлмен, клиникамен және сілтеме мерзімімен шектеледі. Маңызды әрекеттердің күйі мен тарихы көрінеді.', safetyNote:'MedTracker — операциялық құрал; ол мемлекеттік жедел қызметті, МАЖ-ды немесе клиниканың медициналық регламенттерін алмастырмайды.',
    faqKicker:'Ең маңыздысы', faqTitle:'Пилотқа дейін нені білу керек', faqBody:'Маркетингтік уәделерсіз — өнім шекарасы мен нақты жұмыс сценарийі.',
    ctaKicker:'Пилотқа дайынсыз ба?', ctaTitle:'Көшпелі ауысымды ашық басқарыңыз', ctaBody:'Клиниканы, қызметкерлерді және бригадаларды баптап, толық сценарийді тест шақыруында тексеріңіз.', footer:'көшпелі медициналық көмектің операциялық платформасы'
  },
  en: {
    skip:'Skip to content', navigation:'Page navigation', language:'Interface language', brandHome:'MedTracker home', previewAria:'Dispatch interface preview', proofAria:'Key product properties', brandNote:'field care', login:'Sign in', navProduct:'Capabilities', navWorkflow:'How it works', navRoles:'Who it is for', navSafety:'Security',
    eyebrow:'Operations platform for private ambulance services', heroTitle:'The call, crew and patient —', heroAccent:'one shared operational picture', heroBody:'Dispatch sees the queue and available crews, the field team receives only its current call, and the patient gets a clear status and arrival estimate.', primaryCta:'Open the workspace', secondaryCta:'See the workflow', installApp:'Install', heroPoints:['No patient installation','Live status and GPS','Clinic-level data boundaries'],
    previewTitle:'MedClinic dispatch', previewSubtitle:'Operations shift · today', live:'CONNECTED', activeCalls:'Active calls', freeCrews:'Available crews', averageEta:'Average ETA', minutes:'min', queue:'Call queue', demoAddress1:'42 Central Street', demoAddress2:'18 Park Street', demoAddress3:'North district', crew103:'Crew 103', crew101:'Crew 101', enRoute:'en route', accepted:'accepted', assignmentPending:'Awaiting assignment', currentRoute:'Active route', eta:'Arrival estimate',
    productKicker:'Important information first', productTitle:'Fewer context switches. Better control of the shift.', productBody:'Assignment, route, communication and call history stay in one understandable workflow.',
    workflowKicker:'End-to-end workflow', workflowTitle:'Four clear stages from intake to completion', workflowBody:'Each next step is acknowledged by the server and appears immediately for the people who need it.',
    rolesKicker:'Three focused modes', rolesTitle:'An interface for each job, not one screen for everyone', rolesBody:'Dispatch, field crews and patients see different information and different actions.',
    safetyKicker:'Access control', safetyTitle:'Sensitive data should not outlive the operational need', safetyBody:'Access is constrained by role, clinic and link lifetime. Critical actions expose their state and remain in the event history.', safetyNote:'MedTracker is an operations tool. It does not replace public emergency services, a clinical information system or the clinic’s medical procedures.',
    faqKicker:'The essentials', faqTitle:'What to know before a pilot', faqBody:'No inflated promises—only the product boundaries and the real working flow.',
    ctaKicker:'Ready for a pilot?', ctaTitle:'Create a transparent field-care shift', ctaBody:'Configure the clinic, staff and crews, then validate the full flow with a test call.', footer:'field-care operations platform'
  }
} satisfies Record<Language, Record<string, string | string[]>>;

const text = computed(() => copy[langStore.currentLang]);

const proof = {
  ru:[['Один источник статуса','Без ручного уточнения в чатах'],['Временный доступ','Отзыв ссылок и сессий'],['Честная свежесть GPS','Видно, когда координаты устарели'],['История действий','Контекст вызова не теряется']],
  kk:[['Бір мәртебе көзі','Чатта қолмен нақтылау жоқ'],['Уақытша қолжетімділік','Сілтемелер мен сессияларды қайтару'],['GPS жаңалығы анық','Координат ескірсе көрінеді'],['Әрекеттер тарихы','Шақыру контексті сақталады']],
  en:[['One status source','No manual chat reconciliation'],['Temporary access','Links and sessions can be revoked'],['Honest GPS freshness','Stale coordinates are visible'],['Action history','Call context stays intact']]
} as const;
const proofIcons = [Radio, KeyRound, Clock3, Activity];
const proofItems = computed<InfoItem[]>(() => proof[langStore.currentLang].map((item,index)=>({icon:proofIcons[index],title:item[0],body:item[1]})));

const features = {
  ru:[['Очередь и приоритет','Критичные, ожидающие и назначенные вызовы видны в одной очереди.'],['Бригады и назначения','Доступность экипажа проверяется до отправки вызова.'],['GPS, маршрут и ETA','Координаты всегда сопровождаются временем последнего обновления.'],['SOS с подтверждением','Сигнал остаётся заметным, пока диспетчер его не примет.'],['Связь с пациентом','Статус, контакт клиники и необходимые действия доступны по временной ссылке.'],['Администрирование','Организации, сотрудники, автопарк и доступ управляются отдельно.']],
  kk:[['Кезек және басымдық','Маңызды, күтіп тұрған және тағайындалған шақырулар бір кезекте.'],['Бригадалар мен тағайындау','Шақыру жіберілгенге дейін экипаж қолжетімділігі тексеріледі.'],['GPS, бағыт және ETA','Координаттар соңғы жаңарту уақытымен бірге көрсетіледі.'],['Расталатын SOS','Диспетчер қабылдағанша сигнал көрініп тұрады.'],['Пациентпен байланыс','Мәртебе, клиника контактісі және әрекеттер уақытша сілтемеде.'],['Әкімшілендіру','Ұйымдар, қызметкерлер, автопарк және қолжетімділік бөлек басқарылады.']],
  en:[['Queue and priority','Critical, waiting and assigned calls stay in one ordered queue.'],['Crews and assignment','Crew availability is checked before a call is dispatched.'],['GPS, route and ETA','Coordinates always include the time of their last accepted update.'],['Acknowledged SOS','An alert stays visible until dispatch explicitly accepts it.'],['Patient communication','Status, clinic contact and useful actions are available through a temporary link.'],['Administration','Organisations, staff, fleet and access are managed independently.']]
} as const;
const featureIcons = [Layers3, UsersRound, MapPinned, BellRing, Smartphone, ShieldCheck];
const featureItems = computed<InfoItem[]>(() => features[langStore.currentLang].map((item,index)=>({icon:featureIcons[index],title:item[0],body:item[1]})));

const steps = {
  ru:[['Принять вызов','Диспетчер фиксирует контакт, адрес, приоритет и подтверждённую точку.'],['Назначить бригаду','Система показывает доступные экипажи и не допускает двойного назначения.'],['Сопровождать маршрут','Статус, GPS, ETA, доступ к подъезду и SOS обновляются в одном контексте.'],['Завершить безопасно','Вызов уходит в историю, временный доступ и рабочее фото отзываются.']],
  kk:[['Шақыруды қабылдау','Диспетчер контактіні, мекенжайды, басымдықты және расталған нүктені енгізеді.'],['Бригаданы тағайындау','Жүйе бос экипаждарды көрсетіп, қосарланған тағайындауға жол бермейді.'],['Бағытты сүйемелдеу','Мәртебе, GPS, ETA, кіреберіс және SOS бір контексте жаңарады.'],['Қауіпсіз аяқтау','Шақыру тарихқа өтеді, уақытша қолжетімділік пен жұмыс фотосы қайтарылады.']],
  en:[['Capture the call','Dispatch records the contact, address, priority and a confirmed point.'],['Assign a crew','Available teams are visible and double assignment is prevented.'],['Follow the route','Status, GPS, ETA, access details and SOS update in one context.'],['Close access safely','The call moves to history while temporary access and the working photo are revoked.']]
} as const;
const stepIcons = [PhoneCall, Ambulance, Route, ClipboardCheck];
const workflowSteps = computed<InfoItem[]>(() => steps[langStore.currentLang].map((item,index)=>({icon:stepIcons[index],title:item[0],body:item[1]})));

const roles = {
  ru:[['Диспетчер','Рабочее место смены','Очередь, карта и карточка вызова помогают принять решение без переходов между окнами.',['Приоритеты и неназначенные вызовы','Свободные и занятые бригады','SOS и история событий']],['Выездная бригада','Мобильный режим','Крупные действия, актуальный адрес, навигация и только допустимый следующий статус.',['Один назначенный вызов','GPS и состояние связи','Доступ, симптомы и стационар']],['Пациент','Без регистрации','Спокойный мобильный экран со статусом бригады, ориентиром времени и контактом клиники.',['Открывается по ссылке','Показывает свежесть GPS','Позволяет уточнить доступ и отправить SOS']]],
  kk:[['Диспетчер','Ауысым жұмыс орны','Кезек, карта және шақыру карточкасы терезелер арасында ауыспай шешім қабылдауға көмектеседі.',['Басымдықтар және бос шақырулар','Бос және бос емес бригадалар','SOS және оқиғалар тарихы']],['Көшпелі бригада','Мобильді режим','Ірі әрекеттер, өзекті мекенжай, навигация және тек рұқсат етілген келесі мәртебе.',['Бір тағайындалған шақыру','GPS және байланыс күйі','Кіру, белгілер және стационар']],['Пациент','Тіркеусіз','Бригада мәртебесі, уақыт бағасы және клиника контактісі бар түсінікті экран.',['Сілтеме арқылы ашылады','GPS жаңалығын көрсетеді','Кіруді нақтылап, SOS жібереді']]],
  en:[['Dispatch','Shift workspace','Queue, map and call context support decisions without moving between disconnected tools.',['Priority and unassigned calls','Available and busy crews','SOS and event history']],['Field crew','Mobile mode','Large actions, the current address, navigation and only the next valid status.',['One assigned call','GPS and connection state','Access, symptoms and hospital']],['Patient','No registration','A calm mobile screen with crew status, time guidance and the clinic contact.',['Opens from a link','Shows GPS freshness','Updates access details and sends SOS']]]
} as const;
const roleIcons = [Radio, Ambulance, HeartPulse];
const roleItems = computed<RoleItem[]>(() => roles[langStore.currentLang].map((item,index)=>({icon:roleIcons[index],title:item[0],tag:item[1],body:item[2],points:[...item[3]]})));

const safety = {
  ru:[['Разделение клиник','Сотрудник получает данные только своей организации.'],['Короткоживущие ссылки','Секреты можно ротировать, а доступ отзывается без ожидания.'],['Защищённые фото','Фото загружается авторизованным POST и не остаётся секретом в URL.'],['Проверяемые действия','Статусы, ошибки и подтверждения сервера видны пользователю.']],
  kk:[['Клиникаларды бөлу','Қызметкер тек өз ұйымының деректерін алады.'],['Уақытша сілтемелер','Құпияларды ауыстырып, қолжетімділікті дереу қайтаруға болады.'],['Қорғалған фотолар','Фото авторизацияланған POST арқылы жүктеледі және URL ішінде қалмайды.'],['Тексерілетін әрекеттер','Мәртебе, қате және сервер растауы пайдаланушыға көрінеді.']],
  en:[['Clinic boundaries','Staff receive data only from their own organisation.'],['Short-lived links','Secrets can be rotated and access is revoked immediately.'],['Protected photos','Images load through an authorised POST and do not expose a bearer URL.'],['Observable actions','Status, failure and server acknowledgement are visible to the user.']]
} as const;
const safetyIcons = [UsersRound, KeyRound, ShieldCheck, Activity];
const safetyItems = computed<InfoItem[]>(() => safety[langStore.currentLang].map((item,index)=>({icon:safetyIcons[index],title:item[0],body:item[1]})));

const faqs = {
  ru:[['Пациенту нужно приложение?','Нет. Он открывает временную ссылку в обычном мобильном браузере.'],['Что будет при плохой связи?','Интерфейс показывает состояние соединения и свежесть GPS. Критичные действия считаются выполненными только после ответа сервера.'],['Можно использовать нескольким клиникам?','Да. Организации, сотрудники, бригады и вызовы разделяются на сервере.'],['Это замена МИС или 103?','Нет. MedTracker сопровождает операционный процесс частной выездной помощи и требует отдельной интеграции с внутренними системами.']],
  kk:[['Пациентке қосымша керек пе?','Жоқ. Ол уақытша сілтемені кәдімгі мобильді браузерде ашады.'],['Байланыс нашар болса не болады?','Интерфейс байланыс күйі мен GPS жаңалығын көрсетеді. Маңызды әрекет сервер жауап бергенде ғана орындалды деп саналады.'],['Бірнеше клиника қолдана ала ма?','Иә. Ұйымдар, қызметкерлер, бригадалар және шақырулар серверде бөлінеді.'],['Бұл МАЖ немесе 103 орнына ма?','Жоқ. MedTracker жекеменшік көшпелі көмектің операциялық процесін сүйемелдейді және ішкі жүйелермен бөлек интеграцияны қажет етеді.']],
  en:[['Does the patient need an app?','No. A temporary link opens in a normal mobile browser.'],['What happens on a poor connection?','The interface shows connection state and GPS freshness. Critical actions count as complete only after the server responds.'],['Can several clinics share a deployment?','Yes. Organisations, staff, crews and calls are separated on the server.'],['Does it replace a clinical system or public emergency service?','No. MedTracker supports private field-care operations and requires a separate integration with internal clinical systems.']]
} as const;
const faqItems = computed(() => faqs[langStore.currentLang].map(item=>({question:item[0],answer:item[1]})));

function changeMobileLanguage(event: Event) { langStore.setLanguage((event.target as HTMLSelectElement).value as Language); }
function captureInstallPrompt(event: Event) { event.preventDefault(); installPrompt.value = event as BeforeInstallPromptEvent; }
async function installApp() { const prompt=installPrompt.value; if(!prompt)return; await prompt.prompt(); await prompt.userChoice; installPrompt.value=null; }
function clearInstallPrompt() { installPrompt.value=null; }
onMounted(()=>{window.addEventListener('beforeinstallprompt',captureInstallPrompt);window.addEventListener('appinstalled',clearInstallPrompt);});
onBeforeUnmount(()=>{window.removeEventListener('beforeinstallprompt',captureInstallPrompt);window.removeEventListener('appinstalled',clearInstallPrompt);});
</script>

<style scoped>
.landing-page{--ink:#10233d;--muted:#5c6f86;--line:#dce5ef;--blue:#175cd3;--blue-dark:#123e82;--blue-soft:#eaf2ff;--red:#d92d20;min-width:320px;min-height:100vh;background:#f7f9fc;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.skip-link{position:fixed;left:16px;top:-70px;z-index:1000;border-radius:10px;background:#fff;padding:12px 16px;color:var(--ink);font-size:14px;font-weight:800;box-shadow:0 8px 30px #10233d26;transition:top .15s}.skip-link:focus{top:16px}.site-header{position:sticky;top:0;z-index:100;border-bottom:1px solid var(--line);background:rgb(255 255 255/.96);backdrop-filter:blur(14px)}.header-inner{display:flex;min-height:72px;max-width:1220px;margin:0 auto;padding:0 24px;align-items:center;justify-content:space-between;gap:24px}.brand{display:flex;min-height:44px;align-items:center;gap:11px;color:var(--ink);text-decoration:none}.brand-mark{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:12px;background:var(--blue);color:#fff;box-shadow:0 5px 12px #175cd326}.brand-mark.small{width:34px;height:34px;border-radius:10px}.brand-copy strong{display:block;font-size:15px;font-weight:900;letter-spacing:-.02em}.brand-copy small{display:block;margin-top:2px;color:#718198;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.desktop-nav{display:flex;align-items:center;gap:28px}.desktop-nav a{color:#50637a;font-size:13px;font-weight:750;text-decoration:none}.desktop-nav a:hover{color:var(--blue)}.header-actions{display:flex;align-items:center;gap:10px}.language-buttons{display:flex;padding:3px;border:1px solid var(--line);border-radius:11px;background:#f5f7fa}.language-buttons button{min-width:38px;min-height:34px;border:0;border-radius:8px;background:transparent;color:#65768b;font-size:10px;font-weight:900;cursor:pointer}.language-buttons button.active{background:#fff;color:var(--blue);box-shadow:0 1px 4px #10233d14}.language-select-wrap{display:none}.language-select-wrap select{min-height:44px;border:1px solid var(--line);border-radius:10px;background:#fff;padding:0 8px;color:var(--ink);font-size:11px;font-weight:900}.login-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border-radius:11px;background:var(--ink);padding:0 17px;color:#fff;font-size:12px;font-weight:850;text-decoration:none}.login-button:hover{background:#1d3859}.hero{position:relative;overflow:hidden;padding:82px 24px 32px;background:radial-gradient(circle at 83% 18%,#dbeafe 0,transparent 31%),linear-gradient(180deg,#fff 0,#f7f9fc 100%)}.hero::after{position:absolute;right:-180px;top:115px;width:430px;height:430px;border:1px solid #d9e7f8;border-radius:50%;content:"";pointer-events:none}.hero-inner{position:relative;z-index:1;display:grid;max-width:1220px;margin:0 auto;grid-template-columns:minmax(0,1fr) minmax(500px,.92fr);align-items:center;gap:72px}.hero-copy{max-width:650px}.eyebrow{display:inline-flex;align-items:center;gap:9px;margin:0;color:var(--blue);font-size:12px;font-weight:850}.eyebrow span{width:8px;height:8px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 5px #dbeafe}.hero h1{max-width:690px;margin:24px 0 0;color:var(--ink);font-size:clamp(42px,4.3vw,66px);font-weight:900;letter-spacing:-.052em;line-height:1.02;text-wrap:balance}.hero h1 span{color:var(--blue)}.hero-lead{max-width:620px;margin:24px 0 0;color:var(--muted);font-size:18px;font-weight:520;line-height:1.68}.hero-actions{display:flex;margin-top:32px;flex-wrap:wrap;gap:10px}.button{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:9px;border:1px solid transparent;border-radius:12px;padding:0 20px;font-size:13px;font-weight:850;text-decoration:none;cursor:pointer}.button-primary{background:var(--blue);color:#fff;box-shadow:0 8px 20px #175cd329}.button-primary:hover{background:#134cae}.button-secondary{border-color:#bdcad9;background:#fff;color:var(--ink)}.button-secondary:hover{border-color:#8da2b8}.button-quiet{border-color:#cbd8e7;background:var(--blue-soft);color:var(--blue)}.hero-points{display:flex;margin:30px 0 0;padding:0;flex-wrap:wrap;gap:18px 26px;list-style:none}.hero-points li{display:flex;align-items:center;gap:8px;color:#465c75;font-size:12px;font-weight:750}.hero-points li span{display:grid;width:21px;height:21px;place-items:center;border-radius:50%;background:#e7f7f1;color:#087a5b}.product-preview{position:relative;z-index:2;overflow:hidden;border:1px solid #cfdbe8;border-radius:22px;background:#fff;box-shadow:0 28px 70px #10233d21,0 3px 10px #10233d0f}.preview-topbar{display:flex;min-height:68px;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e9f1;padding:0 18px}.preview-title{display:flex;align-items:center;gap:10px}.preview-logo{display:grid;width:34px;height:34px;place-items:center;border-radius:10px;background:var(--blue);color:#fff}.preview-title strong{display:block;color:var(--ink);font-size:12px;font-weight:900}.preview-title small{display:block;margin-top:2px;color:#78899d;font-size:9px;font-weight:650}.live-pill{display:flex;align-items:center;gap:6px;border-radius:999px;background:#e7f7f1;padding:7px 9px;color:#087a5b;font-size:8px;font-weight:900}.live-pill span{width:6px;height:6px;border-radius:50%;background:#12a477}.preview-stats{display:grid;border-bottom:1px solid #e2e9f1;background:#f9fbfd;grid-template-columns:repeat(3,1fr)}.preview-stats div{padding:13px 16px}.preview-stats div+div{border-left:1px solid #e2e9f1}.preview-stats small{display:block;color:#75869b;font-size:8px;font-weight:750}.preview-stats strong{display:block;margin-top:3px;color:var(--ink);font-size:18px;font-weight:900}.preview-stats em{font-size:8px;font-style:normal}.preview-workspace{display:grid;min-height:348px;grid-template-columns:185px 1fr}.preview-queue{border-right:1px solid #e2e9f1;background:#fbfcfe;padding:14px}.queue-heading{display:flex;align-items:center;justify-content:space-between;color:#687b91;font-size:8px;font-weight:900;text-transform:uppercase}.queue-heading span{display:grid;width:19px;height:19px;place-items:center;border-radius:6px;background:#e7edf4;color:var(--ink)}.call-item{margin-top:9px;border:1px solid #dce5ef;border-radius:10px;background:#fff;padding:10px}.call-item.urgent{border-color:#f1b5b0;background:#fff5f4}.call-meta{display:flex;align-items:center;justify-content:space-between}.call-meta strong{font-family:ui-monospace,monospace;font-size:8px}.call-meta span{border-radius:5px;background:#e9eff6;padding:3px 5px;color:#566a82;font-size:7px;font-weight:900}.urgent .call-meta span{background:var(--red);color:#fff}.call-item p{margin:8px 0 0;color:var(--ink);font-size:9px;font-weight:850}.call-item small{display:block;margin-top:4px;color:#76879b;font-size:7px;font-weight:650}.route-panel{padding:14px;background:#fff}.route-heading{display:flex;align-items:flex-start;justify-content:space-between;padding:0 3px 11px}.route-heading small{display:block;color:#7b8ca0;font-size:8px;font-weight:750}.route-heading strong{display:block;margin-top:2px;font-size:11px}.route-heading>span{border-radius:7px;background:var(--blue-soft);padding:5px 7px;color:var(--blue);font-size:7px;font-weight:900}.map-canvas{position:relative;height:278px;overflow:hidden;border:1px solid #d7e2ee;border-radius:13px;background-color:#edf3f8;background-image:linear-gradient(30deg,transparent 47%,#d9e4ed 48%,#d9e4ed 51%,transparent 52%),linear-gradient(120deg,transparent 47%,#dce6ef 48%,#dce6ef 51%,transparent 52%);background-size:92px 80px}.map-canvas svg{position:absolute;inset:0;width:100%;height:100%}.street{fill:none;stroke:#fff;stroke-width:12;opacity:.88}.route-shadow{fill:none;stroke:#fff;stroke-linecap:round;stroke-width:13}.route-line{fill:none;stroke:var(--blue);stroke-dasharray:8 8;stroke-linecap:round;stroke-width:5}.ambulance-pin,.destination-pin{position:absolute;display:grid;place-items:center;border:4px solid #fff;border-radius:50%;box-shadow:0 5px 16px #10233d30}.ambulance-pin{left:31%;top:48%;width:43px;height:43px;background:var(--blue);color:#fff}.destination-pin{right:7%;top:8%;width:39px;height:39px;background:var(--red);color:#fff}.eta-card{position:absolute;right:10px;bottom:10px;min-width:132px;border:1px solid #d8e2ec;border-radius:10px;background:rgb(255 255 255/.96);padding:9px 11px;box-shadow:0 6px 15px #10233d1f}.eta-card small{display:block;color:#718399;font-size:7px;font-weight:750}.eta-card strong{display:block;margin-top:2px;color:var(--ink);font-size:11px}.proof-strip{position:relative;z-index:2;display:grid;max-width:1220px;margin:76px auto 0;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 8px 25px #10233d0a;grid-template-columns:repeat(4,1fr)}.proof-strip>div{display:flex;min-height:98px;align-items:center;gap:13px;padding:18px 20px;color:var(--blue)}.proof-strip>div+div{border-left:1px solid var(--line)}.proof-strip strong{display:block;color:var(--ink);font-size:12px;font-weight:850}.proof-strip small{display:block;margin-top:4px;color:#6d7f94;font-size:10px;font-weight:600;line-height:1.45}.section{padding:104px 24px}.section-inner{max-width:1160px;margin:0 auto}.product-section,.roles-section,.faq-section{background:#fff}.workflow-section{background:#f3f6fa}.section-heading{max-width:500px}.section-heading.centered{max-width:720px;margin:0 auto;text-align:center}.section-heading>p,.safety-copy>p,.final-cta p{margin:0;color:var(--blue);font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.section-heading h2,.safety-copy h2{margin:13px 0 0;color:var(--ink);font-size:clamp(31px,3.2vw,46px);font-weight:900;letter-spacing:-.04em;line-height:1.08;text-wrap:balance}.section-heading>span,.safety-copy>span{display:block;margin-top:17px;color:var(--muted);font-size:16px;font-weight:520;line-height:1.65}.feature-grid{display:grid;margin-top:52px;gap:16px;grid-template-columns:repeat(3,1fr)}.feature-card{min-height:220px;border:1px solid var(--line);border-radius:18px;background:#fff;padding:25px;transition:transform .2s,border-color .2s,box-shadow .2s}.feature-card:hover{transform:translateY(-2px);border-color:#aec4e0;box-shadow:0 14px 34px #10233d0d}.feature-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:12px;background:var(--blue-soft);color:var(--blue)}.feature-card h3{margin:24px 0 0;font-size:16px;font-weight:850}.feature-card p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.65}.workflow-layout{display:grid;grid-template-columns:.85fr 1.15fr;gap:90px}.steps-list{margin:0;padding:0;list-style:none}.steps-list li{display:grid;position:relative;grid-template-columns:35px 44px 1fr;align-items:start;gap:14px;padding:0 0 30px}.steps-list li:not(:last-child)::after{position:absolute;left:56px;top:49px;bottom:5px;width:1px;background:#cad7e5;content:""}.step-number{padding-top:13px;color:#8a9aae;font-family:ui-monospace,monospace;font-size:10px;font-weight:800}.step-icon{display:grid;width:44px;height:44px;z-index:1;place-items:center;border:1px solid #c8d9ee;border-radius:12px;background:#fff;color:var(--blue)}.steps-list h3{margin:2px 0 0;font-size:16px;font-weight:850}.steps-list p{margin:7px 0 0;color:var(--muted);font-size:13px;line-height:1.6}.role-grid{display:grid;margin-top:52px;gap:18px;grid-template-columns:repeat(3,1fr)}.role-card{border:1px solid var(--line);border-radius:20px;background:#fff;padding:26px}.role-card:nth-child(2){border-color:#b8ceea;box-shadow:0 15px 38px #175cd30d}.role-card-head{display:flex;align-items:center;justify-content:space-between}.role-card-head>span{display:grid;width:46px;height:46px;place-items:center;border-radius:13px;background:var(--blue-soft);color:var(--blue)}.role-card-head small{border-radius:999px;background:#f1f4f8;padding:6px 9px;color:#66798f;font-size:8px;font-weight:900;text-transform:uppercase}.role-card h3{margin:26px 0 0;font-size:21px;font-weight:900;letter-spacing:-.025em}.role-card>p{min-height:63px;margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.6}.role-card ul{margin:24px 0 0;padding:20px 0 0;border-top:1px solid var(--line);list-style:none}.role-card li{display:flex;align-items:flex-start;gap:9px;color:#40556e;font-size:12px;font-weight:700;line-height:1.5}.role-card li+li{margin-top:10px}.role-card li svg{margin-top:2px;flex:none;color:#087a5b}.safety-section{background:#f7f9fc}.safety-card{display:grid;overflow:hidden;border-radius:26px;background:#102a4c;box-shadow:0 22px 55px #10233d1c;grid-template-columns:.86fr 1.14fr}.safety-copy{padding:58px}.safety-copy>p{color:#84b5ff}.safety-copy h2{color:#fff}.safety-copy>span{color:#bed0e5}.safety-copy>small{display:block;margin-top:26px;border-left:2px solid #5f97e8;padding-left:14px;color:#93a9c0;font-size:11px;line-height:1.6}.safety-list{display:grid;padding:32px;background:#15365f;grid-template-columns:repeat(2,1fr);gap:1px}.safety-list>div{display:flex;gap:13px;padding:24px}.safety-list>div>span{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:11px;background:#214878;color:#9ec6ff}.safety-list strong{display:block;color:#fff;font-size:13px;font-weight:850}.safety-list p{margin:6px 0 0;color:#abc0d7;font-size:11px;line-height:1.55}.faq-layout{display:grid;grid-template-columns:.72fr 1.28fr;gap:90px}.faq-list details{border-bottom:1px solid var(--line)}.faq-list details:first-child{border-top:1px solid var(--line)}.faq-list summary{display:flex;min-height:68px;align-items:center;justify-content:space-between;gap:18px;color:var(--ink);font-size:14px;font-weight:850;cursor:pointer;list-style:none}.faq-list summary::-webkit-details-marker{display:none}.faq-list summary svg{flex:none;transition:transform .2s}.faq-list details[open] summary svg{transform:rotate(45deg)}.faq-list details p{margin:-4px 45px 22px 0;color:var(--muted);font-size:13px;line-height:1.65}.final-cta{display:flex;max-width:1160px;margin:0 auto 90px;align-items:center;justify-content:space-between;gap:40px;border-radius:24px;background:var(--blue);padding:48px 52px;color:#fff;box-shadow:0 22px 48px #175cd329}.final-cta p{color:#c7ddff}.final-cta h2{max-width:650px;margin:10px 0 0;font-size:clamp(29px,3vw,43px);font-weight:900;letter-spacing:-.04em;line-height:1.1}.final-cta>div>span{display:block;max-width:650px;margin-top:12px;color:#d9e8ff;font-size:14px;line-height:1.6}.button-white{flex:none;background:#fff;color:var(--blue)}.button-white:hover{background:#edf4ff}.site-footer{display:flex;min-height:110px;max-width:1160px;margin:0 auto;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding:24px 0}.site-footer>div{display:grid;grid-template-columns:34px auto;align-items:center;gap:0 10px}.site-footer strong{font-size:14px;font-weight:900}.site-footer p{grid-column:2;margin:2px 0 0;color:#77889c;font-size:10px}.site-footer>small{color:#8494a7;font-size:10px}

/* Dark Mode Overrides for Landing Page */
:global(html.dark) .landing-page {
  --ink: #f1f5f9;
  --muted: #94a3b8;
  --line: #1e293b;
  --blue: #38bdf8;
  --blue-dark: #0284c7;
  --blue-soft: #0c2a4a;
  --red: #f87171;
  background: #07111f;
  color: var(--ink);
}
:global(html.dark) .site-header {
  background: rgba(7, 17, 31, 0.94);
  border-bottom-color: var(--line);
}
:global(html.dark) .desktop-nav a {
  color: #94a3b8;
}
:global(html.dark) .desktop-nav a:hover {
  color: var(--blue);
}
:global(html.dark) .login-button {
  background: #1e293b;
  color: #f1f5f9;
}
:global(html.dark) .login-button:hover {
  background: #334155;
}
:global(html.dark) .hero {
  background: radial-gradient(circle at 83% 18%, #0f2744 0%, transparent 35%), linear-gradient(180deg, #07111f 0%, #0b172a 100%);
}
:global(html.dark) .hero::after {
  border-color: #1e293b;
}
:global(html.dark) .button-secondary {
  border-color: #334155;
  background: #0f172a;
  color: #f1f5f9;
}
:global(html.dark) .button-secondary:hover {
  border-color: #475569;
  background: #1e293b;
}
:global(html.dark) .button-quiet {
  border-color: #1e293b;
  background: #0c2a4a;
  color: #38bdf8;
}
:global(html.dark) .hero-points li {
  color: #94a3b8;
}
:global(html.dark) .hero-points li span {
  background: #064e3b;
  color: #6ee7b7;
}
:global(html.dark) .product-preview,
:global(html.dark) .feature-card,
:global(html.dark) .role-card,
:global(html.dark) .proof-strip {
  background: #0f172a;
  border-color: #1e293b;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
:global(html.dark) .preview-topbar,
:global(html.dark) .preview-stats,
:global(html.dark) .preview-queue {
  border-color: #1e293b;
  background: #0b1324;
}
:global(html.dark) .preview-stats div + div {
  border-left-color: #1e293b;
}
:global(html.dark) .call-item {
  border-color: #1e293b;
  background: #0f172a;
}
:global(html.dark) .route-panel {
  background: #0f172a;
}
:global(html.dark) .map-canvas {
  background-color: #0b1324;
  background-image: linear-gradient(30deg, transparent 47%, #1a273b 48%, #1a273b 51%, transparent 52%), linear-gradient(120deg, transparent 47%, #1a273b 48%, #1a273b 51%, transparent 52%);
}
:global(html.dark) .eta-card {
  border-color: #1e293b;
  background: rgba(15, 23, 42, 0.96);
  color: #f1f5f9;
}
:global(html.dark) .product-section,
:global(html.dark) .roles-section,
:global(html.dark) .faq-section {
  background: #07111f;
}
:global(html.dark) .workflow-section,
:global(html.dark) .safety-section {
  background: #091426;
}
:global(html.dark) .steps-list li:not(:last-child)::after {
  background: #1e293b;
}
:global(html.dark) .step-icon {
  border-color: #1e293b;
  background: #0f172a;
  color: #38bdf8;
}
:global(html.dark) .role-card ul {
  border-top-color: #1e293b;
}
:global(html.dark) .role-card li {
  color: #cbd5e1;
}
:global(html.dark) .faq-list details {
  border-bottom-color: #1e293b;
}
:global(html.dark) .faq-list summary {
  color: #f1f5f9;
}
:global(html.dark) .site-footer {
  border-top-color: #1e293b;
}
@media(max-width:1050px){.desktop-nav{display:none}.hero-inner{grid-template-columns:1fr;gap:54px}.hero-copy{max-width:760px}.product-preview{max-width:720px}.proof-strip{grid-template-columns:repeat(2,1fr)}.proof-strip>div:nth-child(3){border-left:0;border-top:1px solid var(--line)}.proof-strip>div:nth-child(4){border-top:1px solid var(--line)}.workflow-layout,.faq-layout{grid-template-columns:1fr;gap:48px}.role-grid{grid-template-columns:1fr}.role-card>p{min-height:0}.safety-card{grid-template-columns:1fr}.feature-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:680px){.header-inner{min-height:64px;padding:0 14px;gap:10px}.brand-copy small{display:none}.language-buttons{display:none}.language-select-wrap{display:block}.login-button{width:44px;padding:0}.login-button span{display:none}.hero{padding:54px 16px 24px}.hero::after{display:none}.hero h1{font-size:42px}.hero-lead{font-size:16px}.hero-actions{flex-direction:column}.button{width:100%}.hero-points{display:grid;gap:11px}.product-preview{border-radius:16px}.preview-stats div{padding:11px}.preview-workspace{min-height:auto;grid-template-columns:1fr}.preview-queue{display:none}.route-panel{padding:10px}.map-canvas{height:270px}.proof-strip{margin-top:44px;grid-template-columns:1fr}.proof-strip>div{min-height:84px}.proof-strip>div+div,.proof-strip>div:nth-child(3),.proof-strip>div:nth-child(4){border-top:1px solid var(--line);border-left:0}.section{padding:76px 16px}.feature-grid{margin-top:36px;grid-template-columns:1fr}.feature-card{min-height:0}.workflow-layout{gap:38px}.steps-list li{grid-template-columns:28px 40px 1fr;gap:10px}.step-icon{width:40px;height:40px}.steps-list li:not(:last-child)::after{left:47px}.role-grid{margin-top:36px}.safety-copy{padding:34px 25px}.safety-list{padding:12px;grid-template-columns:1fr}.safety-list>div{padding:18px 14px}.faq-layout{gap:36px}.final-cta{margin:0 16px 60px;align-items:flex-start;flex-direction:column;padding:34px 24px}.final-cta .button{width:100%}.site-footer{margin:0 16px;align-items:flex-start;flex-direction:column;gap:22px;padding:28px 0}.site-footer>small{padding-left:44px}}
@media(max-width:390px){.brand-copy strong{font-size:14px}.hero h1{font-size:37px}.preview-title small{display:none}.preview-stats small{min-height:22px}.map-canvas{height:240px}}
@media(prefers-reduced-motion:reduce){.feature-card,.faq-list summary svg,.skip-link{transition:none}}
</style>
