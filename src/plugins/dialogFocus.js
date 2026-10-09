const selectors = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
export default {
  mounted(element, binding) {
    const previous = document.activeElement;
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.tabIndex = -1;
    const keydown = event => {
      if (event.key === 'Escape') {event.stopPropagation(); binding.value?.();}
      if (event.key !== 'Tab') return;
      const items = [...element.querySelectorAll(selectors)].filter(item => item.getClientRects().length);
      if (!items.length) {event.preventDefault(); element.focus(); return;}
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    element.addEventListener('keydown', keydown);
    element._dialogCleanup = () => {element.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus();};
    queueMicrotask(() => {if (element.isConnected) (element.querySelector(selectors) || element).focus();});
  },
  unmounted(element) {element._dialogCleanup?.();},
};
