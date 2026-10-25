import AddressForm from './AddressForm.jsx';
import StatisticsPanel from './StatisticsPanel.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import './Hero.css';
import RevealWords from './RevealWords.jsx';

export default function Hero() {
  const { t } = useLanguage();
  const heroBenefits = t('hero.benefits');

  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">{t('hero.eyebrow')}</span>
          <h1 className="hero-headline">
            <RevealWords>{t('hero.titlePrefix')}</RevealWords>{' '}<span className="hero-highlight"><RevealWords>{t('hero.titleHighlight')}</RevealWords></span>
            <br />
            <RevealWords>{t('hero.titleSuffix')}</RevealWords>
          </h1>
          <p className="hero-paragraph">
            {t('hero.paragraph')}
          </p>

          <div className="hero-intake fx-card fx-card--flat">
            <AddressForm />
            <ul className="hero-benefits" aria-label={t('hero.benefitsAria')}>
            {heroBenefits.map((benefit) => (
              <li key={benefit} className="hero-benefit">
                <span className="benefit-dot" aria-hidden="true" />
                {benefit}
              </li>
            ))}
            </ul>
          </div>
        </div>

        <StatisticsPanel />
      </div>
      <a className="hero-scroll" href="#how-it-works" aria-label={t('nav.howItWorks')}>
        <span aria-hidden="true" />
      </a>
    </section>
  );
}
