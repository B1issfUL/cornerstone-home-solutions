import { useEffect, useState } from 'react';
import { reportError } from '../lib/diagnostics.js';
import { DEFAULT_HOME_STATS, normalizeHomepageStats } from '../lib/homepageStats.js';

export default function useHomepageStats() {
  const [stats, setStats] = useState(DEFAULT_HOME_STATS);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    const fallBack = (nextStatus) => {
      setStats(DEFAULT_HOME_STATS);
      setStatus(nextStatus);
    };

    import('../lib/firebase.js')
      .then(({ subscribeToStats }) => {
        if (cancelled) return;
        unsubscribe = subscribeToStats(
          (snapshot) => {
            if (!snapshot.exists()) {
              fallBack('fallback');
              return;
            }
            setStats(normalizeHomepageStats(snapshot.data()));
            setStatus('ready');
          },
          (error) => {
            reportError('stats.read', error);
            fallBack('error');
          },
        );
        if (!unsubscribe) fallBack('fallback');
      })
      .catch((error) => {
        reportError('stats.load', error);
        if (!cancelled) fallBack('error');
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return { stats, status };
}
