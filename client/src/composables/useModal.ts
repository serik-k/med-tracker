import { ref } from 'vue';

export function useModal<T = any>() {
  const isOpen = ref(false);
  const data = ref<T | null>(null);

  function open(modalData?: T) {
    if (modalData !== undefined) {
      data.value = modalData;
    }
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    data.value = null;
  }

  return {
    isOpen,
    data,
    open,
    close,
  };
}
