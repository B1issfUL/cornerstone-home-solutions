const LIMITS = {
  propertiesReviewed: 1_000_000,
  estimatedTimelineDays: 3_650,
  estimatedCashOffer: 100_000_000,
  reviewCompletePercent: 100,
};

export function parsePublicStats(fields, fromFirestore = false) {
  const stats = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    const raw = fromFirestore ? fields?.[key]?.integerValue : fields?.[key];
    const value = fromFirestore && typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
    if (!Number.isSafeInteger(value) || value < 0 || value > max) return null;
    stats[key] = value;
  }
  return stats;
}

export async function fetchPublicStats(project, signal) {
  if (!/^[a-z0-9-]+$/.test(project || '')) throw new Error('Missing project');
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/siteSettings/homepageStats`);
  for (const key of Object.keys(LIMITS)) url.searchParams.append('mask.fieldPaths', key);
  const response = await fetch(url, { signal, credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Statistics unavailable');
  const stats = parsePublicStats((await response.json()).fields, true);
  if (!stats) throw new Error('Invalid statistics');
  return stats;
}
