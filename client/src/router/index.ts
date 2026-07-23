import { createRouter, createWebHistory } from 'vue-router';
import DispatcherDashboard from '@/views/DispatcherDashboard.vue';
import DriverApp from '@/views/DriverApp.vue';
import PatientTrackView from '@/views/PatientTrackView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dispatcher'
    },
    {
      path: '/dispatcher',
      name: 'dispatcher',
      component: DispatcherDashboard
    },
    {
      path: '/driver',
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
