const STORAGE_KEY = "etiketten-app:v1";

export interface PersistedState<T> {
  value: T;
}

export function loadState<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState<T>;
    return parsed.value;
  } catch {
    return null;
  }
}

export function saveState<T>(value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value }));
  } catch {
    // localStorage kann voll oder deaktiviert sein - Persistenz ist ein reines Komfortfeature.
  }
}
