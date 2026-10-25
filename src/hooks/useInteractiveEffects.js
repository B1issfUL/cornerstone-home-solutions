import { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { pointer } from '../lib/pointer.js';

export default function useInteractiveEffects(route) {
  const { language } = useLanguage();

  useEffect(() => {
    if (route !== 'home') return undefined;
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 860px)');
    const connection = navigator.connection;
    let disposed = false;
    let cleanup;
    let generation = 0;
    let introPlayed = false;

    const configure = () => {
      const current = ++generation;
      cleanup?.();
      cleanup = undefined;
      pointer.x = pointer.y = 0;
      root.classList.remove('fx', 'flow-ready');
      root.classList.toggle('fx-lite', Boolean(connection?.saveData));
      if (reduced.matches || connection?.saveData || !('IntersectionObserver' in window)) return;
      import('../lib/fluidMotion.js').then(({ mountFluidMotion }) => {
        if (!disposed && current === generation) {
          cleanup = mountFluidMotion({ intro: !introPlayed });
          introPlayed = true;
        }
      }).catch(() => {
        // Motion is decorative; failed downloads must never hide content or the form.
        if (!disposed && current === generation) root.classList.remove('fx', 'flow-ready');
      });
    };
    configure();
    reduced.addEventListener('change', configure);
    compact.addEventListener('change', configure);
    connection?.addEventListener?.('change', configure);
    return () => {
      disposed = true;
      generation++;
      cleanup?.();
      reduced.removeEventListener('change', configure);
      compact.removeEventListener('change', configure);
      connection?.removeEventListener?.('change', configure);
      root.classList.remove('fx', 'flow-ready', 'fx-lite');
      pointer.x = pointer.y = 0;
    };
  }, [route, language]);
}
