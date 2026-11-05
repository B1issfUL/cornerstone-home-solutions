import './StatisticsPanel.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function StatisticsPanel() {
  const { t } = useLanguage();

  return (
    <aside className="stats-panel fx-card" aria-labelledby="process-summary-title">
      <div className="stats-header">
        <h2 id="process-summary-title" className="stats-title">{t('howItWorks.title')}</h2>
      </div>
      <ol className="stats-grid">
        {t('howItWorks.steps').map((step, index) => (
          <li key={step.title} className="stat-card">
            <span className="stat-value" aria-hidden="true">{index + 1}</span>
            <span className="stat-label">{step.title}</span>
          </li>
        ))}
      </ol>
      <div className="stats-divider" aria-hidden="true" />
      <a className="option-tag" href="#how-it-works">{t('howItWorks.title')}</a>
    </aside>
  );
}
