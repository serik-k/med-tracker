import { ref } from 'vue';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

export function useNotifications() {
  function addToast(type: Toast['type'], message: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, type, message, duration };
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return {
    toasts,
    notifySuccess: (msg: string) => addToast('success', msg),
    notifyError: (msg: string) => addToast('error', msg),
    notifyWarning: (msg: string) => addToast('warning', msg),
    notifyInfo: (msg: string) => addToast('info', msg),
    removeToast,
  };
}
