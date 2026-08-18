import { apiJson, apiFetch } from '../services/api';
import type { Clinic, User } from '../types';

export interface CreateClinicUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'dispatcher' | 'clinic_admin';
}

export interface UpdateClinicUserPayload {
  name?: string;
  role?: 'dispatcher' | 'clinic_admin';
  status?: 'INVITED' | 'ACTIVE' | 'DISABLED';
}

export const clinicApi = {
  async getSettings(): Promise<Clinic> {
    return apiJson<Clinic>('/api/clinic/settings');
  },

  async updateSettings(payload: Partial<Clinic>): Promise<Clinic> {
    return apiJson<Clinic>('/api/clinic/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getUsers(): Promise<User[]> {
    return apiJson<User[]>('/api/clinic/users');
  },

  async createUser(payload: CreateClinicUserPayload): Promise<User> {
    return apiJson<User>('/api/clinic/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: UpdateClinicUserPayload): Promise<User> {
    return apiJson<User>(`/api/clinic/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: string): Promise<void> {
    await apiFetch(`/api/clinic/users/${id}`, { method: 'DELETE' });
  },

  async resetUserPassword(id: string, password: string): Promise<void> {
    await apiFetch(`/api/clinic/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  },
};
