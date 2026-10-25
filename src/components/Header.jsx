import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { readStorage, writeStorage } from '../lib/storage.js';
import './Header.css';

const NAV_LINKS = [
  { labelKey: 'nav.solutions', href: '#solutions' },
  { labelKey: 'nav.howItWorks', href: '#how-it-works' },
  { labelKey: 'nav.about', href: '#about' },
  { labelKey: 'nav.contact', href: '#contact' },
];

const THEME_STORAGE_KEY = 'cornerstone-theme';
const THEME_OPTIONS = ['system', 'light', 'dark'];
const LANGUAGE_OPTIONS = ['en', 'es', 'system'];

function getInitialThemePreference() {
  if (typeof window === 'undefined') return 'system';

  const storedTheme = readStorage('localStorage', THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(storedTheme) ? storedTheme : 'system';
}

/* Simple cornerstone mark used as the placeholder logo */
function LogoIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="26" height="26" rx="7" fill="var(--text)" />
      <path
        d="M10 18.5 17 11l7 7.5v7H10v-7Z"
        fill="var(--panel)"
      />
      <path d="M10 25h14" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { languagePreference, setLanguagePreference, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themePreference, setThemePreference] = useState(getInitialThemePreference);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themePreference);
    writeStorage('localStorage', THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  const headerRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  // Close the mobile menu on Escape, a tap outside the header, or when the desktop layout returns.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const desktop = window.matchMedia('(min-width: 1201px)');
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        headerRef.current?.querySelector('.menu-toggle')?.focus();
      }
    };
    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const handleLayoutChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    desktop.addEventListener('change', handleLayoutChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      desktop.removeEventListener('change', handleLayoutChange);
    };
  }, [menuOpen]);

  return (
    <header className="header" ref={headerRef}>
      <div className="container header-inner">
        <a href="#top" className="brand" onClick={closeMenu}>
          <LogoIcon />
          <span className="brand-name">{t('common.brand')}</span>
        </a>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}</span>
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`} aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={`nav ${menuOpen ? 'nav-open' : ''}`}
          aria-label={t('nav.primaryAria')}
        >
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="nav-link" onClick={closeMenu}>
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <label className="header-select-control theme-control" htmlFor="theme-preference">
            <span>{t('theme.label')}</span>
            <select
              id="theme-preference"
              value={themePreference}
              onChange={(event) => setThemePreference(event.target.value)}
              aria-label={t('theme.aria')}
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`theme.options.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="header-select-control language-control" htmlFor="language-preference">
            <span>{t('language.label')}</span>
            <select
              id="language-preference"
              value={languagePreference}
              onChange={(event) => setLanguagePreference(event.target.value)}
              aria-label={t('language.aria')}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`language.options.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <a href="#address-form" className="btn-primary header-cta" onClick={closeMenu}>
            {t('common.getYourOffer')}
          </a>
        </nav>
      </div>
    </header>
  );
}
