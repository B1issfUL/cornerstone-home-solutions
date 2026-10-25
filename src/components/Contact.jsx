import { useLanguage } from '../i18n/LanguageContext.jsx';
import { CONTACT_EMAIL, PHONE_DISPLAY, PHONE_HREF } from '../lib/contact.js';
import './Contact.css';

export default function Contact() {
  const { t } = useLanguage();

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <div className="contact-card" id="about">
          <span className="eyebrow">{t('contact.eyebrow')}</span>
          <h2 className="section-title">{t('contact.title')}</h2>
          <p className="contact-statement">
            {t('contact.statement')}
          </p>

          <div className="contact-details">
            <div className="contact-item">
              <span className="contact-label">{t('common.phone')}</span>
              <a href={PHONE_HREF} className="contact-value">
                {PHONE_DISPLAY}
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-label">{t('common.email')}</span>
              <a href={`mailto:${CONTACT_EMAIL}`} className="contact-value">
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          <a href="#address-form" className="btn-primary contact-cta">
            {t('common.getYourOffer')}
          </a>
        </div>
      </div>
    </section>
  );
}
