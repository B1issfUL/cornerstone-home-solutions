// Web Storage can throw (blocked cookies, private modes); fall back to in-memory behaviour.
// Callers store only preferences and a non-sensitive submission timestamp.
const fallback = { localStorage: new Map(), sessionStorage: new Map() };

export function readStorage(storageName, key) {
  try {
    return window[storageName].getItem(key);
  } catch {
    return fallback[storageName]?.get(key) ?? null;
  }
}

export function writeStorage(storageName, key, value) {
  fallback[storageName]?.set(key, String(value));
  try {
    window[storageName].setItem(key, value);
  } catch {
    // Keep the preference or cooldown for this visit, even when storage is blocked.
  }
}
