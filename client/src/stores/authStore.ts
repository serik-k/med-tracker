import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/services/api';

export type UserRole = 'platform_admin' | 'clinic_owner' | 'clinic_admin' | 'dispatcher';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  clinicId: string | null;
  clinicName: string | null;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось войти');
    user.value = data.user;
    initialized.value = true;
    return data.user as User;
  }

  async function restore() {
    if (initialized.value) return user.value;
    const res = await apiFetch('/api/auth/me');
    if (res.ok) user.value = await res.json();
    initialized.value = true;
    return user.value;
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    user.value = null;
  }

  return {
    user,
    initialized,
    login,
    restore,
    logout
  };
});
