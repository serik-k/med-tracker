import { apiJson, apiFetch } from '../services/api';
import type { Crew } from '../types';

export interface CreateCrewPayload {
  name: string;
  carPlate: string;
  type: string;
  driverName: string;
  status?: string;
}

export interface AccessLinkResponse {
  token: string;
  path: string;
  expiresAt: string;
}

export const crewApi = {
  async getCrews(): Promise<Crew[]> {
    return apiJson<Crew[]>('/api/crews');
  },

  async createCrew(payload: CreateCrewPayload): Promise<Crew> {
    return apiJson<Crew>('/api/crews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateCrew(id: string, payload: Partial<CreateCrewPayload>): Promise<Crew> {
    return apiJson<Crew>(`/api/crews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteCrew(id: string): Promise<void> {
    await apiFetch(`/api/crews/${id}`, { method: 'DELETE' });
  },

  async rotateAccessLink(id: string): Promise<AccessLinkResponse> {
    return apiJson<AccessLinkResponse>(`/api/crews/${id}/access-link`, {
      method: 'POST',
    });
  },
};
