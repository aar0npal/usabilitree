// Some browsers (e.g. in-app browsers opened from email apps) throw on any
// localStorage access. Fall back to memory so participants can still take the
// study; only resume-after-reload is lost.
const memory = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key: string) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage is blocked; the memory copy is already gone.
    }
  },
};
