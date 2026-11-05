import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../lib/storage.js';
import { fetchPublicStats, parsePublicStats } from '../lib/publicStats.js';

const REFRESH_MS = 5 * 60_000;
const MAX_CACHE_AGE = 24 * 60 * 60_000;
const PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const CACHE_KEY = `chs-public-stats-v1:${PROJECT}`;
let memory;
let inFlight;
let lastAttempt = -Infinity;

function cached() {
  let saved;
  try { saved = JSON.parse(readStorage('localStorage', CACHE_KEY)); } catch { /* Invalid cache. */ }
  const stats = parsePublicStats(saved?.stats);
  const disk = stats && Number.isFinite(saved.at) && saved.at <= Date.now()
    ? { stats, at: saved.at } : null;
  const newest = disk && (!memory || disk.at > memory.at) ? disk : memory;
  return newest && Date.now() - newest.at < MAX_CACHE_AGE ? newest : null;
}

async function refresh() {
  const current = cached();
  if (current && Date.now() - current.at < REFRESH_MS) return current;
  if (inFlight) return inFlight;
  if (performance.now() - lastAttempt < REFRESH_MS) return null;
  lastAttempt = performance.now();
  inFlight = fetchPublicStats(PROJECT, AbortSignal.timeout(8000)).then((stats) => {
    memory = { stats, at: Date.now() };
    writeStorage('localStorage', CACHE_KEY, JSON.stringify(memory));
    return memory;
  }).catch(() => null).finally(() => { inFlight = null; });
  return inFlight;
}

export default function useHomepageStats() {
  const [state, setState] = useState(() => ({ stats: cached()?.stats ?? null, status: 'loading' }));
  useEffect(() => {
    let active = true;
    const update = async () => {
      if (document.visibilityState !== 'visible') return;
      const result = navigator.onLine ? await refresh() : null;
      if (active) setState({
        stats: (result ?? cached())?.stats ?? null,
        status: result ? 'ready' : 'unavailable',
      });
    };
    const receiveCache = (event) => {
      if (event.key === CACHE_KEY) void update();
    };
    void update();
    const timer = window.setInterval(update, REFRESH_MS);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    window.addEventListener('storage', receiveCache);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
      window.removeEventListener('storage', receiveCache);
    };
  }, []);
  return state;
}
