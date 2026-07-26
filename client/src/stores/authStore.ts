import { defineStore } from 'pinia';
import { ref } from 'vue';

export type UserRole = 'admin' | 'dispatcher' | 'driver' | null;

export interface User {
  id: string;
  name: string;
  role: UserRole;
  crewId?: string;
  clinicName: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>({
    id: 'u1',
    name: 'Администратор Клиники',
    role: 'dispatcher',
    clinicName: 'MedClinic Almaty'
  });

  function login(role: UserRole, name?: string, crewId?: string) {
    user.value = {
      id: 'u_' + Math.random().toString(36).substring(2, 6),
      name: name || (role === 'admin' ? 'Главный Врач' : role === 'dispatcher' ? 'Диспетчер Смены' : `Водитель №${crewId || '103'}`),
      role,
      crewId,
      clinicName: 'MedClinic Almaty'
    };
  }

  function logout() {
    user.value = null;
  }

  return {
    user,
    login,
    logout
  };
});
