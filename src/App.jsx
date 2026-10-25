import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Benefits from './components/Benefits.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import SceneBoundary from './components/SceneBoundary.jsx';
import useInteractiveEffects from './hooks/useInteractiveEffects.js';

const ChromeEnvironment = lazy(() => import('./components/ChromeEnvironment.jsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'));

// Static stand-in: chrome.css paints the crystal photo on it until (or instead of) the WebGL scene.
const scenePlaceholder = <div className="chrome-environment" aria-hidden="true" />;

// Start the WebGL scene once the page is idle so it never competes with the lead form for the
// main thread. Data-saver visitors keep the static crystal photo.
function useDeferredScene() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (navigator.connection?.saveData) return undefined;

    const start = () => setEnabled(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(start, 200);
    return () => window.clearTimeout(id);
  }, []);

  return enabled;
}

function getCurrentRoute() {
  if (typeof window === 'undefined') return 'home';

  const hashRoute = window.location.hash.replace(/^#/, '');
  const directAdminPath = window.location.pathname.replace(/\/$/, '').endsWith('/admin');

  return hashRoute === '/admin' || directAdminPath ? 'admin' : 'home';
}

export default function App() {
  const [route, setRoute] = useState(getCurrentRoute);
  const sceneEnabled = useDeferredScene();
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
      <Header />
      {route === 'admin' ? (
        <SceneBoundary
          scope="admin.load"
          fallback={
            <main className="section">
              <div className="container">
                <p role="alert">The admin dashboard could not load. Please reload to try again.</p>
                <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            </main>
          }
        >
          <Suspense fallback={null}><AdminDashboard /></Suspense>
        </SceneBoundary>
      ) : (
        <main className="public-site">
          <SceneBoundary>
            {sceneEnabled ? (
              <Suspense fallback={scenePlaceholder}><ChromeEnvironment /></Suspense>
            ) : scenePlaceholder}
          </SceneBoundary>
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
