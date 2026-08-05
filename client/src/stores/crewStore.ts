import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Crew } from '@/types';
import { apiFetch, apiJson, errorMessage, readApiError } from '@/services/api';

export const useCrewStore = defineStore('crew', () => {
  const crews = ref<Crew[]>([]);
  const loading = ref(false);
  const errorMsg = ref('');
  const onDutyCrews = computed(() => crews.value.filter(crew => crew.status === 'ON_DUTY'));
  let stateGeneration = 0;
  let crewRevision = 0;

  async function fetchCrews() {
    const generation = stateGeneration;
    const revision = crewRevision;
    loading.value = true;
    errorMsg.value = '';
    try {
      const response = await apiFetch('/api/crews');
      if (generation !== stateGeneration) return [];
      if (!response.ok) throw await readApiError(response, 'Не удалось загрузить бригады');
      const result = await response.json() as Crew[];
      if (generation !== stateGeneration) return [];
      if (revision !== crewRevision) return crews.value;
      crewRevision += 1;
      crews.value = result;
      return crews.value;
    } catch (error) {
      if (generation === stateGeneration) errorMsg.value = errorMessage(error, 'Не удалось загрузить бригады');
      return [];
    } finally {
      if (generation === stateGeneration) loading.value = false;
    }
  }

  async function addCrew(crew: Partial<Crew>) {
    const generation = stateGeneration;
    const revision = crewRevision;
    const created = await apiJson<Crew>('/api/crews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crew)
    });
    if (generation === stateGeneration && revision === crewRevision) upsertCrew(created);
    return created;
  }

  async function updateCrew(id: string, crew: Partial<Crew>) {
    const generation = stateGeneration;
    const revision = crewRevision;
    const updated = await apiJson<Crew>(`/api/crews/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crew)
    });
    if (generation === stateGeneration && revision === crewRevision) upsertCrew(updated);
    return updated;
  }

  async function deleteCrew(id: string) {
    const generation = stateGeneration;
    const revision = crewRevision;
    const response = await apiFetch(`/api/crews/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw await readApiError(response, 'Не удалось удалить бригаду');
    if (generation === stateGeneration && revision === crewRevision) removeCrew(id);
  }

  function setCrews(newCrews: Crew[]) {
    crewRevision += 1;
    crews.value = [...newCrews];
  }

  function upsertCrew(crew: Crew) {
    crewRevision += 1;
    const index = crews.value.findIndex(item => item.id === crew.id);
    if (index === -1) crews.value.push(crew);
    else crews.value[index] = crew;
  }

  function removeCrew(id: string) {
    crewRevision += 1;
    crews.value = crews.value.filter(crew => crew.id !== id);
  }

  function clear() {
    stateGeneration += 1;
    crewRevision = 0;
    crews.value = [];
    errorMsg.value = '';
    loading.value = false;
  }

  return {
    crews,
    loading,
    errorMsg,
    onDutyCrews,
    fetchCrews,
    addCrew,
    updateCrew,
    deleteCrew,
    setCrews,
    upsertCrew,
    removeCrew,
    clear
  };
});
