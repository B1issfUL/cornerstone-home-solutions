import { useLanguage } from '../i18n/LanguageContext.jsx';
import { CONTACT_EMAIL } from '../lib/contact.js';
import './Footer.css';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <span className="footer-brand">{t('common.brand')}</span>
          <nav aria-label={t('nav.legalAria')}>
            <ul className="footer-links">
              <li>
                <a href="#privacy-notice" className="footer-link">
                  {t('footer.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="#site-terms" className="footer-link">
                  {t('footer.terms')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <p className="footer-disclaimer">
          {t('footer.disclaimer')}
        </p>

        <div className="footer-legal">
          <section id="privacy-notice" aria-labelledby="privacy-heading" tabIndex={-1}>
            <h2 id="privacy-heading">{t('footer.privacyPolicy')}</h2>
            <p>{t('footer.privacyEmail')}</p>
            <p>{t('footer.privacyStorage')}</p>
            <p>
              {t('footer.privacyContact')}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </section>
          <section id="site-terms" aria-labelledby="terms-heading" tabIndex={-1}>
            <h2 id="terms-heading">{t('footer.terms')}</h2>
            <p>{t('footer.termsText')}</p>
          </section>
        </div>

        <p className="footer-copyright">
          &copy; {year} {t('common.brand')}. {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
