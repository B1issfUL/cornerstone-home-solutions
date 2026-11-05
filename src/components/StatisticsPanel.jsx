import { useEffect, useRef, useState } from 'react';
import './StatisticsPanel.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import useHomepageStats from '../hooks/useHomepageStats.js';
import { DEFAULT_HOME_STATS, formatHomepageStats } from '../lib/homepageStats.js';

function useCounter(target, panel) {
  const [entered, setEntered] = useState(false);
  const [shown, setShown] = useState(null);
  const previous = useRef(null);
  useEffect(() => {
    if (!window.IntersectionObserver) { setEntered(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setEntered(true);
      observer.disconnect();
    });
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [panel]);
  useEffect(() => {
    if (!entered || !target) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const start = performance.now();
    const from = previous.current ?? DEFAULT_HOME_STATS;
    let frame;
    const finish = () => {
      cancelAnimationFrame(frame);
      previous.current = target;
      setShown(target);
    };
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 650);
      const ease = 1 - (1 - progress) ** 3;
      const next = Object.fromEntries(Object.keys(target).map((key) =>
        [key, Math.round(from[key] + (target[key] - from[key]) * ease)]));
      previous.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (motion.matches || navigator.connection?.saveData) finish();
    else frame = requestAnimationFrame(tick);
    const stop = () => { if (motion.matches) finish(); };
    motion.addEventListener('change', stop);
    return () => {
      motion.removeEventListener('change', stop);
      cancelAnimationFrame(frame);
    };
  }, [entered, target]);
  return shown ?? target;
}

export default function StatisticsPanel() {
  const { t, language } = useLanguage();
  const { stats, status } = useHomepageStats();
  const panel = useRef(null);
  const shown = useCounter(stats, panel);
  const labels = t('stats.metrics');
  const locale = language === 'es' ? 'es-US' : 'en-US';
  const final = formatHomepageStats(stats ?? DEFAULT_HOME_STATS, labels, locale);
  const visible = shown ? formatHomepageStats(shown, labels, locale) : null;

  return (
    <aside ref={panel} className="stats-panel fx-card" aria-labelledby="public-stats-title">
      <div className="stats-header">
        <h2 id="public-stats-title" className="stats-title">{t('stats.title')}</h2>
      </div>
      <dl className="stats-grid">
        {final.map((metric, index) => (
          <div key={index} className="stat-card">
            <dt className="stat-label">{metric.label}</dt>
            <dd>
              <span className="stat-value" aria-hidden="true">{stats ? visible?.[index].value : '\u2014'}</span>
              <span className="stats-sr-only">{stats ? metric.value : t('stats.unavailable')}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="stats-placeholder-note" role="status">
        {status === 'loading' && !stats ? t('stats.loading') :
          status === 'unavailable' ? t(stats ? 'stats.cached' : 'stats.unavailable') : ''}
      </p>
    </aside>
  );
}
