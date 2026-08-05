import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch, apiJson, errorMessage, readApiError } from '@/services/api';
import { useCrewStore } from '@/stores/crewStore';
import { useOrderStore } from '@/stores/orderStore';

export type UserRole = 'platform_admin' | 'clinic_owner' | 'clinic_admin' | 'dispatcher';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  clinicId: string | null;
  clinicName: string | null;
  email: string;
}

const LOGOUT_RETRY_KEY = 'medtracker:logout-retry';

function hasLogoutRetryMarker() {
  try {
    return window.localStorage.getItem(LOGOUT_RETRY_KEY) === '1';
  } catch {
    // The in-memory state below still protects the current page lifecycle.
  }
  return false;
}

function rememberLogoutRetry() {
  try { window.localStorage.setItem(LOGOUT_RETRY_KEY, '1'); } catch {}
}

function forgetLogoutRetry() {
  try { window.localStorage.removeItem(LOGOUT_RETRY_KEY); } catch {}
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);
  const logoutPending = ref(hasLogoutRetryMarker());
  const logoutInFlight = ref(false);
  const logoutError = ref('');
  let handlingUnauthorized = false;
  let authGeneration = 0;
  let logoutRequest: Promise<void> | null = null;

  function resetScopedState() {
    useOrderStore().reset();
    useCrewStore().clear();
  }

  function applyUser(nextUser: User | null) {
    const identityChanged = user.value?.id !== nextUser?.id || user.value?.clinicId !== nextUser?.clinicId;
    if (identityChanged) resetScopedState();
    user.value = nextUser;
  }

  async function login(email: string, password: string) {
    if (logoutPending.value) throw new Error('Сначала подтвердите завершение предыдущей серверной сессии.');
    const generation = ++authGeneration;
    const data = await apiJson<{ user: User }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (generation !== authGeneration) throw new Error('Запрос входа устарел. Повторите попытку.');
    applyUser(data.user);
    initialized.value = true;
    return data.user;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const generation = ++authGeneration;
    await apiJson('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (generation !== authGeneration) return;
    resetScopedState();
    user.value = null;
    initialized.value = true;
  }

  async function restore() {
    if (logoutPending.value) {
      await retryLogout().catch(() => undefined);
      return null;
    }
    if (initialized.value) return user.value;
    const generation = authGeneration;
    try {
      const response = await apiFetch('/api/auth/me');
      const restoredUser = response.ok ? await response.json() as User : null;
      if (generation === authGeneration) applyUser(restoredUser);
    } catch {
      if (generation === authGeneration) applyUser(null);
    } finally {
      if (generation === authGeneration) initialized.value = true;
    }
    return user.value;
  }

  async function performLogout() {
    authGeneration += 1;
    if (!logoutPending.value) rememberLogoutRetry();
    logoutPending.value = true;
    logoutInFlight.value = true;
    logoutError.value = '';
    resetScopedState();
    user.value = null;
    initialized.value = true;
    try {
      const response = await apiFetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) {
        throw await readApiError(response, 'Не удалось завершить серверную сессию. Повторите выход перед тем, как оставить устройство.');
      }
      logoutPending.value = false;
      logoutError.value = '';
      forgetLogoutRetry();
    } catch (error) {
      logoutError.value = errorMessage(error, 'Не удалось завершить серверную сессию. Повторите выход перед тем, как оставить устройство.');
      throw error;
    } finally {
      logoutInFlight.value = false;
    }
  }

  function logout() {
    if (logoutRequest) return logoutRequest;
    logoutRequest = performLogout().finally(() => { logoutRequest = null; });
    return logoutRequest;
  }

  function retryLogout() {
    return logout();
  }

  function handleUnauthorized() {
    if (handlingUnauthorized) return;
    handlingUnauthorized = true;
    authGeneration += 1;
    resetScopedState();
    user.value = null;
    initialized.value = true;
    if (/^\/(dispatcher|admin|platform)(\/|$)/.test(window.location.pathname)) {
      const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.replace(`/login?redirect=${redirect}`);
      return;
    }
    window.setTimeout(() => { handlingUnauthorized = false; }, 500);
  }

  window.addEventListener('medtracker:unauthorized', handleUnauthorized);
  window.addEventListener('online', () => {
    if (logoutPending.value && !logoutInFlight.value) void retryLogout().catch(() => undefined);
  });
  window.addEventListener('storage', event => {
    if (event.key !== LOGOUT_RETRY_KEY) return;
    if (event.newValue === '1') {
      authGeneration += 1;
      logoutPending.value = true;
      logoutError.value = 'В другой вкладке начат выход. Ожидаем подтверждение сервера.';
      resetScopedState();
      user.value = null;
      initialized.value = true;
      if (navigator.onLine && !logoutInFlight.value) void retryLogout().catch(() => undefined);
      return;
    }
    if (event.newValue === null && logoutPending.value) {
      logoutPending.value = false;
      logoutError.value = '';
      if (/^\/(dispatcher|admin|platform)(\/|$)/.test(window.location.pathname)) window.location.replace('/login');
    }
  });

  return { user, initialized, logoutPending, logoutInFlight, logoutError, login, changePassword, restore, logout, retryLogout };
});
