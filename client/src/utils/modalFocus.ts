const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function focusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
}

export function focusFirstInModal(container: HTMLElement | null) {
  if (!container) return;
  (focusableElements(container)[0] || container).focus();
}

export function trapModalFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (event.key !== 'Tab' || !container) return false;
  const elements = focusableElements(container);
  if (!elements.length) {
    event.preventDefault();
    container.focus();
    return true;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault();
    first.focus();
  }
  return true;
}

export function modalTrigger(event?: Event) {
  if (event?.currentTarget instanceof HTMLElement) return event.currentTarget;
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export function restoreModalTrigger(trigger: HTMLElement | null) {
  if (trigger?.isConnected) trigger.focus();
}
