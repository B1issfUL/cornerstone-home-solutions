// Web Storage can throw (blocked cookies, private modes); fall back to in-memory behaviour.
export function readStorage(storageName, key) {
  try {
    return window[storageName].getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(storageName, key, value) {
  try {
    window[storageName].setItem(key, value);
  } catch {
    // Preference is kept in memory for this visit.
  }
}
