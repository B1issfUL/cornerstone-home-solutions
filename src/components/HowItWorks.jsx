import { useLanguage } from '../i18n/LanguageContext.jsx';
import './HowItWorks.css';
import RevealWords from './RevealWords.jsx';

export default function HowItWorks() {
  const { t } = useLanguage();
  const steps = t('howItWorks.steps');

  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container" data-reveal>
        <div className="section-intro">
        <span className="eyebrow">{t('howItWorks.eyebrow')}</span>
        <h2 className="section-title"><RevealWords>{t('howItWorks.title')}</RevealWords></h2>
        <p className="section-subtitle">
          {t('howItWorks.subtitle')}
        </p>
        </div>

        <ol className="steps-grid" data-reveal>
          {steps.map((step, index) => (
            <li key={step.title} className="step-card fx-card">
              <span className="step-track" aria-hidden="true" />
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
