import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash && !['driver', 'patient-track'].includes(String(to.name))) return { el: to.hash, top: 88, behavior: 'smooth' };
    return { top: 0 };
  },
  routes: [
    { path: '/', name: 'landing', component: () => import('@/views/LandingView.vue'), meta: { title: 'MedTracker — оперативная платформа' } },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: 'Вход — MedTracker' } },
    { path: '/admin', name: 'admin', component: () => import('@/views/ClinicAdminDashboard.vue'), meta: { roles: ['clinic_owner', 'clinic_admin'], title: 'Управление клиникой — MedTracker' } },
    { path: '/dispatcher', name: 'dispatcher', component: () => import('@/views/DispatcherDashboard.vue'), meta: { roles: ['clinic_owner', 'clinic_admin', 'dispatcher'], title: 'Диспетчерская — MedTracker' } },
    { path: '/driver-access/:accessToken?', name: 'driver', component: () => import('@/views/DriverApp.vue'), meta: { title: 'Интерфейс бригады — MedTracker' } },
    { path: '/track/:token?', name: 'patient-track', component: () => import('@/views/PatientTrackView.vue'), meta: { title: 'Статус бригады — MedTracker' } },
    { path: '/platform', name: 'platform', component: () => import('@/views/PlatformAdminDashboard.vue'), meta: { roles: ['platform_admin'], title: 'Платформа — MedTracker' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'Страница не найдена — MedTracker' } }
  ]
});

router.beforeEach(async to => {
  const roles = to.meta.roles as string[] | undefined;
  const auth = useAuthStore();

  if (to.name === 'login') {
    await auth.restore().catch(() => null);
    if (auth.user) return auth.user.role === 'platform_admin' ? '/platform' : auth.user.role === 'dispatcher' ? '/dispatcher' : '/admin';
    return true;
  }

  if (!roles) return true;
  await auth.restore().catch(() => null);
  if (!auth.user) return { name: 'login', query: { redirect: to.fullPath } };
  if (!roles.includes(auth.user.role)) return auth.user.role === 'platform_admin' ? '/platform' : auth.user.role === 'dispatcher' ? '/dispatcher' : '/admin';
  return true;
});

router.afterEach(to => {
  document.title = String(to.meta.title || 'MedTracker');
});

export default router;
