import { apiJson } from '../services/api';
import type { Order } from '../types';

export interface CreateOrderPayload {
  patientName: string;
  patientPhone: string;
  address: string;
  priority?: 'EMERGENCY' | 'URGENT' | 'STANDARD';
  crewId?: string | null;
  lat?: number;
  lng?: number;
}

export interface AccessLinkResult {
  patientAccessToken?: string;
  patientAccessPath?: string;
  viewerAccessToken?: string;
  viewerAccessPath?: string;
}

export const orderApi = {
  async getOrders(): Promise<Order[]> {
    return apiJson<Order[]>('/api/orders');
  },

  async createOrder(payload: CreateOrderPayload, idempotencyKey?: string): Promise<Order> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiJson<Order>('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async assignOrder(token: string, crewId: string | null): Promise<Order> {
    return apiJson<Order>(`/api/orders/${token}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crewId }),
    });
  },

  async cancelOrder(token: string, reason?: string): Promise<Order> {
    return apiJson<Order>(`/api/orders/${token}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },

  async rotatePatientLink(token: string): Promise<AccessLinkResult> {
    return apiJson<AccessLinkResult>(`/api/orders/${token}/patient-access-link`, {
      method: 'POST',
    });
  },

  async rotateViewerLink(token: string): Promise<AccessLinkResult> {
    return apiJson<AccessLinkResult>(`/api/orders/${token}/viewer-access-link`, {
      method: 'POST',
    });
  },

  async getPublicOrderAccess(token: string): Promise<Order> {
    return apiJson<Order>('/api/public/order-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  },
};
