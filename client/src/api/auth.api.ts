import { apiJson, apiFetch } from '../services/api';
import type { User } from '../types';

export const authApi = {
  async login(email: string, password: string): Promise<{ user: User }> {
    return apiJson<{ user: User }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe(): Promise<User> {
    return apiJson<User>('/api/auth/me');
  },

  async logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
