import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Crew } from '../types';
import { apiFetch } from '@/services/api';

export const useCrewStore = defineStore('crew', () => {
  const crews = ref<Crew[]>([]);
  const loading = ref(false);

  async function fetchCrews() {
    try {
      loading.value = true;
      const res = await apiFetch('/api/crews');
      if (res.ok) {
        crews.value = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch crews', e);
    } finally {
      loading.value = false;
    }
  }

  async function addCrew(crew: Partial<Crew>) {
    try {
      const res = await apiFetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crew)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось добавить бригаду');
      const created = data as Crew;
      const idx = crews.value.findIndex(c => c.id === created.id);
      if (idx === -1) crews.value.push(created);
      return created;
    } catch (e) {
      console.error('Failed to add crew', e);
      throw e;
    }
  }

  async function updateCrew(id: string, crew: Partial<Crew>) {
    try {
      const res = await apiFetch(`/api/crews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crew)
      });
      if (res.ok) {
        const updated = await res.json();
        const idx = crews.value.findIndex(c => c.id === id);
        if (idx !== -1) crews.value[idx] = updated;
        return updated;
      }
    } catch (e) {
      console.error('Failed to update crew', e);
    }
  }

  async function deleteCrew(id: string) {
    try {
      const res = await apiFetch(`/api/crews/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось удалить бригаду');
      }
      crews.value = crews.value.filter(c => c.id !== id);
    } catch (e) {
      console.error('Failed to delete crew', e);
      throw e;
    }
  }

  function setCrews(newCrews: Crew[]) {
    crews.value = newCrews;
  }

  return {
    crews,
    loading,
    fetchCrews,
    addCrew,
    updateCrew,
    deleteCrew,
    setCrews
  };
});
