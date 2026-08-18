import { apiJson } from '../services/api';
import type { Clinic } from '../types';

export interface CreateClinicPayload {
  name: string;
  legalName: string;
  bin: string;
  city: string;
  contactPhone: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  plan?: string;
  timezone?: string;
}

export interface UpdateClinicPayload {
  name?: string;
  legalName?: string;
  city?: string;
  contactPhone?: string;
  plan?: string;
  status?: string;
  timezone?: string;
  hospitalOptions?: Array<{
    id?: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
  }>;
}

export const platformApi = {
  async getClinics(): Promise<Clinic[]> {
    return apiJson<Clinic[]>('/api/platform/clinics');
  },

  async createClinic(payload: CreateClinicPayload): Promise<Clinic> {
    return apiJson<Clinic>('/api/platform/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateClinic(id: string, payload: UpdateClinicPayload): Promise<Clinic> {
    return apiJson<Clinic>(`/api/platform/clinics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
