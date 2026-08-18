<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}>(), {
  variant: 'neutral',
  size: 'md'
});

const variantClass = computed(() => `badge-${props.variant}`);
const sizeClass = computed(() => `badge-${props.size}`);
</script>

<template>
  <span class="base-badge" :class="[variantClass, sizeClass]">
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 500;
  border-radius: 9999px;
  line-height: 1;
  white-space: nowrap;
}

.badge-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.badge-md {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.badge-success {
  background-color: #dcfce7;
  color: #15803d;
}

.badge-warning {
  background-color: #fef9c3;
  color: #a16207;
}

.badge-danger {
  background-color: #fee2e2;
  color: #b91c1c;
}

.badge-info {
  background-color: #e0f2fe;
  color: #0369a1;
}

.badge-neutral {
  background-color: #f1f5f9;
  color: #475569;
}
</style>
