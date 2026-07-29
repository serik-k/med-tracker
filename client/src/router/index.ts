import { createRouter, createWebHistory } from 'vue-router';
import LandingView from '@/views/LandingView.vue';
import LoginView from '@/views/LoginView.vue';
import ClinicAdminDashboard from '@/views/ClinicAdminDashboard.vue';
import DispatcherDashboard from '@/views/DispatcherDashboard.vue';
import DriverApp from '@/views/DriverApp.vue';
import PatientTrackView from '@/views/PatientTrackView.vue';
import PlatformAdminDashboard from '@/views/PlatformAdminDashboard.vue';
import { useAuthStore } from '@/stores/authStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/admin',
      name: 'admin',
      component: ClinicAdminDashboard,
      meta: { roles: ['clinic_owner', 'clinic_admin'] }
    },
    {
      path: '/dispatcher',
      name: 'dispatcher',
      component: DispatcherDashboard,
      meta: { roles: ['clinic_owner', 'clinic_admin', 'dispatcher'] }
    },
    {
      path: '/driver-access/:accessToken',
      name: 'driver',
      component: DriverApp
    },
    {
      path: '/track/:token',
      name: 'patient-track',
      component: PatientTrackView
    },
    {
      path: '/platform',
      name: 'platform',
      component: PlatformAdminDashboard,
      meta: { roles: ['platform_admin'] }
    }
  ]
});

router.beforeEach(async to => {
  const roles = to.meta.roles as string[] | undefined;
  if (!roles) return true;
  const auth = useAuthStore();
  await auth.restore();
  if (!auth.user) return { name: 'login', query: { redirect: to.fullPath } };
  if (!roles.includes(auth.user.role)) return auth.user.role === 'platform_admin' ? '/platform' : '/dispatcher';
  return true;
});

export default router;
