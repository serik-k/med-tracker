import { createRouter, createWebHistory } from 'vue-router';
import LandingView from '@/views/LandingView.vue';
import LoginView from '@/views/LoginView.vue';
import ClinicAdminDashboard from '@/views/ClinicAdminDashboard.vue';
import DispatcherDashboard from '@/views/DispatcherDashboard.vue';
import DriverApp from '@/views/DriverApp.vue';
import PatientTrackView from '@/views/PatientTrackView.vue';

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
      component: ClinicAdminDashboard
    },
    {
      path: '/dispatcher',
      name: 'dispatcher',
      component: DispatcherDashboard
    },
    {
      path: '/driver/:crewId?',
      name: 'driver',
      component: DriverApp
    },
    {
      path: '/track/:token',
      name: 'patient-track',
      component: PatientTrackView
    }
  ]
});

export default router;

