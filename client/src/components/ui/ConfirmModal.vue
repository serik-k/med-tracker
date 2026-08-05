<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1200] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      @click.self="handleCancel"
      @keydown.esc="handleCancel"
      @keydown.tab="handleTab"
    >
      <div
        ref="dialogRef"
        tabindex="-1"
        class="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descId"
      >
        <div class="flex items-start gap-4">
          <div
            class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            :class="iconBgClass"
          >
            <component :is="resolvedIcon" class="h-6 w-6" :class="iconTextClass" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 :id="titleId" class="text-base font-black leading-snug text-slate-900 dark:text-slate-100">
              {{ title }}
            </h3>
            <p v-if="description" :id="descId" class="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {{ description }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            :disabled="loading"
            class="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            @click="handleCancel"
          >
            {{ cancelText || 'Отмена' }}
          </button>
          <button
            type="button"
            :disabled="loading"
            class="min-h-11 rounded-xl px-5 text-xs font-black text-white shadow-md transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            :class="confirmBtnClass"
            @click="handleConfirm"
          >
            <span v-if="loading" class="flex items-center gap-1.5">
              <LoaderCircle class="h-4 w-4 animate-spin" />
              <span>Подождите…</span>
            </span>
            <span v-else>{{ confirmText || 'Подтвердить' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import { AlertTriangle, HelpCircle, Info, LoaderCircle, ShieldAlert } from 'lucide-vue-next';
import { focusFirstInModal, modalTrigger, restoreModalTrigger, trapModalFocus } from '@/utils/modalFocus';

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  loading?: boolean;
  icon?: unknown;
}>(), {
  variant: 'primary',
  loading: false
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'update:isOpen', value: boolean): void;
}>();

const titleId = `confirm-modal-title-${useId()}`;
const descId = `confirm-modal-desc-${useId()}`;
const dialogRef = ref<HTMLElement | null>(null);
let triggerEl: HTMLElement | null = null;

const resolvedIcon = computed(() => {
  if (props.icon) return props.icon;
  if (props.variant === 'danger') return ShieldAlert;
  if (props.variant === 'warning') return AlertTriangle;
  if (props.variant === 'info') return Info;
  return HelpCircle;
});

const iconBgClass = computed(() => {
  if (props.variant === 'danger') return 'bg-red-100 dark:bg-red-950/60';
  if (props.variant === 'warning') return 'bg-amber-100 dark:bg-amber-950/60';
  if (props.variant === 'info') return 'bg-sky-100 dark:bg-sky-950/60';
  return 'bg-teal-100 dark:bg-teal-950/60';
});

const iconTextClass = computed(() => {
  if (props.variant === 'danger') return 'text-red-600 dark:text-red-400';
  if (props.variant === 'warning') return 'text-amber-600 dark:text-amber-400';
  if (props.variant === 'info') return 'text-sky-600 dark:text-sky-400';
  return 'text-teal-700 dark:text-teal-400';
});

const confirmBtnClass = computed(() => {
  if (props.variant === 'danger') return 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500';
  if (props.variant === 'warning') return 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500';
  return 'bg-teal-700 hover:bg-teal-800 focus-visible:ring-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500';
});

watch(() => props.isOpen, (open) => {
  if (open) {
    triggerEl = modalTrigger();
    void nextTick(() => focusFirstInModal(dialogRef.value));
  } else {
    const prev = triggerEl;
    triggerEl = null;
    void nextTick(() => restoreModalTrigger(prev));
  }
});

function handleTab(event: KeyboardEvent) {
  trapModalFocus(event, dialogRef.value);
}

function handleCancel() {
  if (props.loading) return;
  emit('cancel');
  emit('update:isOpen', false);
}

function handleConfirm() {
  if (props.loading) return;
  emit('confirm');
}
</script>
