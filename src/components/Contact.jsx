import { useLanguage } from '../i18n/LanguageContext.jsx';
import { CONTACT_EMAIL } from '../lib/contact.js';
import './Contact.css';
import RevealWords from './RevealWords.jsx';

export default function Contact() {
  const { t } = useLanguage();

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <div className="contact-card" id="about" data-reveal>
          <div className="contact-copy">
            <span className="eyebrow">{t('contact.eyebrow')}</span>
            <h2 className="section-title"><RevealWords>{t('contact.title')}</RevealWords></h2>
            <p className="contact-statement">{t('contact.statement')}</p>
          </div>

          <div className="contact-actions">
            <div className="contact-details">
              <div className="contact-item">
                <span className="contact-label">{t('common.email')}</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="contact-value">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <a href="#address-form" className="btn-primary contact-cta">{t('common.getYourOffer')}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
