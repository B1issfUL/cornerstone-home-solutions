import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Benefits from './components/Benefits.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import SceneBoundary from './components/SceneBoundary.jsx';
import useInteractiveEffects from './hooks/useInteractiveEffects.js';
import { useLanguage } from './i18n/LanguageContext.jsx';

const ChromeEnvironment = lazy(() => import('./components/ChromeEnvironment.jsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'));

// Static stand-in: chrome.css paints the crystal photo on it until (or instead of) the WebGL scene.
const scenePlaceholder = <div className="chrome-environment" aria-hidden="true" />;

// Start the WebGL scene once the page is idle so it never competes with the lead form for the
// main thread. Data-saver visitors keep the static crystal photo.
function useDeferredScene(route) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (route !== 'home') return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    let cancel = () => {};
    const schedule = () => {
      cancel();
      if (motion.matches || connection?.saveData) {
        setEnabled(false);
        return;
      }
      const start = () => setEnabled(true);
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(start, { timeout: 2000 });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(start, 200);
        cancel = () => window.clearTimeout(id);
      }
    };
    schedule();
    motion.addEventListener('change', schedule);
    connection?.addEventListener?.('change', schedule);
    return () => {
      cancel();
      motion.removeEventListener('change', schedule);
      connection?.removeEventListener?.('change', schedule);
    };
  }, [route]);

  return enabled;
}

function getCurrentRoute() {
  if (typeof window === 'undefined') return 'home';

  const hashRoute = window.location.hash.replace(/^#/, '');
  const directAdminPath = window.location.pathname.replace(/\/$/, '').endsWith('/admin');

  return hashRoute === '/admin' || directAdminPath ? 'admin' : 'home';
}

export default function App() {
  const { language } = useLanguage();
  const [route, setRoute] = useState(getCurrentRoute);
  const sceneEnabled = useDeferredScene(route);
  useInteractiveEffects(route);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getCurrentRoute());

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>
        {language === 'es' ? 'Saltar al contenido' : 'Skip to content'}
      </a>
      <Header />
      {route === 'admin' ? (
        <SceneBoundary
          scope="admin.load"
          fallback={
            <main id="main-content" tabIndex={-1} className="section">
              <div className="container">
                <p role="alert">The admin dashboard could not load. Please reload to try again.</p>
                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            </main>
          }
        >
          <Suspense fallback={<main id="main-content" tabIndex={-1} aria-busy="true" />}>
            <AdminDashboard />
          </Suspense>
        </SceneBoundary>
      ) : (
        <main id="main-content" tabIndex={-1} className="public-site">
          <SceneBoundary>
            {sceneEnabled ? (
              <Suspense fallback={scenePlaceholder}><ChromeEnvironment /></Suspense>
            ) : scenePlaceholder}
          </SceneBoundary>
          <div className="flow-atmosphere" aria-hidden="true"><div className="flow-screen" /><div className="flow-light" /></div>
          <Hero />
          <HowItWorks />
          <Benefits />
          <Contact />
        </main>
      )}
      <Footer />
    </>
  );
}
