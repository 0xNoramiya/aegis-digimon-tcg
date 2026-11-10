const storageKey = "aegis.field.scroll-arrows";

const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(storageKey) !== "false";
  } catch {
    return true;
  }
}

let shown = read();

function persist(next: boolean) {
  try {
    localStorage.setItem(storageKey, String(next));
  } catch {
    return;
  }
}

export const fieldScrollArrowsPreference = {
  isShown() {
    return shown;
  },
  setShown(next: boolean) {
    if (shown === next) return;
    shown = next;
    persist(next);
    for (const listener of listeners) {
      listener();
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
