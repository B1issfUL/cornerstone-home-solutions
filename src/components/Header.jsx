import { useState } from 'react';
import './Header.css';

const NAV_LINKS = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

/* Simple original crescent mark used as the placeholder logo */
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
      <circle cx="17" cy="17" r="15.5" stroke="var(--purple-light)" strokeWidth="1.5" />
      <path
        d="M22 8.5a10.5 10.5 0 1 0 3 15 8.5 8.5 0 0 1-3-15Z"
        fill="var(--purple)"
      />
      <circle cx="23.5" cy="11" r="1.8" fill="var(--orange)" />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#top" className="brand" onClick={closeMenu}>
          <LogoIcon />
          <span className="brand-name">Crescent Home Solutions</span>
        </a>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`} aria-hidden="true" />
        </button>

        <nav
          id="primary-navigation"
          className={`nav ${menuOpen ? 'nav-open' : ''}`}
          aria-label="Primary"
        >
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="nav-link" onClick={closeMenu}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#address-form" className="btn-primary header-cta" onClick={closeMenu}>
            Get Your Offer
          </a>
        </nav>
      </div>
    </header>
  );
}
