import { useEffect, useRef, useState } from 'react';
import './StatisticsPanel.css';
import useHomepageStats from '../hooks/useHomepageStats.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { formatHomepageStats } from '../lib/homepageStats.js';

const TICK_MS = 900;

// Number ticker (ported from Magic UI): eases the displayed Firebase values to each new snapshot.
function useTickingStats(stats) {
  const [shown, setShown] = useState(stats);
  const shownRef = useRef(stats);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = stats;
      setShown(stats);
      return undefined;
    }
    const from = shownRef.current;
    const start = performance.now();
    let frame = 0;
    const step = (now) => {
      const progress = Math.min((now - start) / TICK_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = Object.fromEntries(
        Object.keys(stats).map((key) => [key, Math.round(from[key] + (stats[key] - from[key]) * eased)]),
      );
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [stats]);

  return shown;
}

export default function StatisticsPanel() {
  const { t } = useLanguage();
  const { stats, status } = useHomepageStats();
  const shownStats = useTickingStats(stats);
  const formattedStats = formatHomepageStats(shownStats, t('stats.metrics'));
  const purchaseOptions = t('stats.purchaseOptions');

  return (
    <aside className="stats-panel fx-card" aria-label={t('stats.aria')}>
      <div className="stats-header">
        <h2 className="stats-title">{t('stats.title')}</h2>
        <span className="stats-status">
          <span className="status-dot" aria-hidden="true" />
          {status === 'loading' ? t('stats.syncing') : t('stats.ready')}
        </span>
      </div>

      <div className="stats-grid">
        {formattedStats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {status !== 'ready' && status !== 'loading' && (
        <p className="stats-placeholder-note">{t('stats.placeholderNote')}</p>
      )}

      <div className="stats-divider" role="presentation" />

      <h3 className="options-title">{t('stats.purchaseMethod')}</h3>
      <ul className="options-list">
        {purchaseOptions.map((option) => (
          <li key={option} className="option-tag">
            {option}
          </li>
        ))}
      </ul>
    </aside>
  );
}
