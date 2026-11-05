import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { reportError } from '../lib/diagnostics.js';
import { getFirebaseApp, getStatsRef, isFirebaseConfigured, subscribeToStats } from '../lib/firebase.js';
import { DEFAULT_HOME_STATS, normalizeHomepageStats, toWholeNumber } from '../lib/homepageStats.js';
import './AdminDashboard.css';

// UI gate only; Firestore rules (isOwner in firestore.rules) are the real authorization and must match.
const AUTHORIZED_ADMIN_EMAIL = 'chsmadesimple@gmail.com';
const SUCCESS_MESSAGE = 'Stats updated successfully.';
const FAILURE_MESSAGE = 'Could not update stats. Please try again.';
const SIGN_IN_FAILURE_MESSAGE = 'Could not sign in. Please try again.';

function statsToFormValues(stats) {
  const normalizedStats = normalizeHomepageStats(stats);

  return {
    propertiesReviewed: String(normalizedStats.propertiesReviewed),
    estimatedTimelineDays: String(normalizedStats.estimatedTimelineDays),
    estimatedCashOffer: String(normalizedStats.estimatedCashOffer),
    reviewCompletePercent: String(normalizedStats.reviewCompletePercent),
  };
}

function sanitizeIntegerInput(value, maxValue) {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  const wholeNumber = toWholeNumber(digitsOnly);
  return String(typeof maxValue === 'number' ? Math.min(maxValue, wholeNumber) : wholeNumber);
}

export default function AdminDashboard() {
  const auth = useMemo(() => {
    const app = getFirebaseApp();
    return app ? getAuth(app) : null;
  }, []);
  const configured = isFirebaseConfigured();
  const [authReady, setAuthReady] = useState(!configured);
  const [user, setUser] = useState(null);
  const [formValues, setFormValues] = useState(() => statsToFormValues(DEFAULT_HOME_STATS));
  const dirty = useRef(false);
  const saving = useRef(false);
  const signingIn = useRef(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statsStatus, setStatsStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const statsReady = statsStatus === 'ready';

  const authorized = Boolean(
    user?.emailVerified && user.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL,
  );
  const statsRef = useMemo(() => getStatsRef(), []);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setMessage((current) => current === SIGN_IN_FAILURE_MESSAGE ? '' : current);
      }
    });
  }, [auth]);

  useEffect(() => {
    if (!authorized) {
      setStatsStatus('loading');
      return undefined;
    }

    return subscribeToStats(
      (snapshot) => {
        setStatsStatus('ready');
        if (dirty.current) return;

        const nextStats = snapshot.exists() ? normalizeHomepageStats(snapshot.data()) : DEFAULT_HOME_STATS;
        setFormValues(statsToFormValues(nextStats));
      },
      (error) => {
        reportError('admin.read', error);
        setStatsStatus('error');
      },
    ) ?? undefined;
  }, [authorized]);

  const handleSignIn = async () => {
    if (!auth || signingIn.current) return;
    signingIn.current = true;
    setIsSigningIn(true);

    setMessage('');

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      reportError('admin.signIn', error);
      setMessage(SIGN_IN_FAILURE_MESSAGE);
    } finally {
      signingIn.current = false;
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;

    try {
      await signOut(auth);
    } catch (error) {
      reportError('admin.signOut', error);
    }
    setMessage('');
    dirty.current = false;
    setFormValues(statsToFormValues(DEFAULT_HOME_STATS));
  };

  const handleFieldChange = (event) => {
    const { name, value, max } = event.target;
    const maxValue = max ? Number(max) : undefined;

    setFormValues((current) => ({
      ...current,
      [name]: sanitizeIntegerInput(value, maxValue),
    }));
    setMessage('');
    dirty.current = true;
  };

  const saveStats = async (nextStats) => {
    if (!statsRef || !authorized || !user?.email || !statsReady || saving.current) return;
    saving.current = true;

    setIsSaving(true);
    setMessage('');

    try {
      await setDoc(
        statsRef,
        {
          ...nextStats,
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        },
        { merge: true },
      );
      setFormValues(statsToFormValues(nextStats));
      dirty.current = false;
      setMessage(SUCCESS_MESSAGE);
    } catch (error) {
      reportError('admin.save', error);
      setMessage(FAILURE_MESSAGE);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveStats(normalizeHomepageStats(formValues));
  };

  const handleReset = () => {
    saveStats(DEFAULT_HOME_STATS);
  };

  return (
    <main className="admin-page" id="main-content" tabIndex={-1}>
      <section className="admin-shell" aria-labelledby="admin-title">
        <div className="admin-header">
          <span className="eyebrow">Private Dashboard</span>
          <h1 id="admin-title">Cornerstone Admin</h1>
          <p>Manage internal property review statistics</p>
        </div>

        {!configured && (
          <div className="admin-panel" role="status">
            <p className="admin-message error">
              Firebase is not configured yet. Add the Firebase environment variables to enable this
              dashboard.
            </p>
          </div>
        )}

        {configured && !authReady && (
          <div className="admin-panel" role="status">
            <p className="admin-message">Checking sign-in status...</p>
          </div>
        )}

        {configured && authReady && !user && (
          <div className="admin-panel">
            <p className="admin-copy">
              Sign in with Google to access the private admin dashboard.
            </p>
            <button type="button" className="btn-primary" onClick={handleSignIn} disabled={isSigningIn}>
              Sign In With Google
            </button>
            {message && (
              <p className="admin-message error" aria-live="polite">
                {message}
              </p>
            )}
          </div>
        )}

        {configured && authReady && user && !authorized && (
          <div className="admin-panel">
            <p className="admin-message error" role="alert">
              You are not authorized to access this dashboard.
            </p>
            <button type="button" className="admin-secondary-button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}

        {configured && authReady && user && authorized && (
          <form className="admin-panel admin-form" onSubmit={handleSubmit}>
            <div className="admin-account-row">
              <span>Signed in as {user.email}</span>
              <button type="button" className="admin-secondary-button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>

            <label className="admin-field" htmlFor="propertiesReviewed">
              <span>Properties Reviewed</span>
              <input
                id="propertiesReviewed"
                name="propertiesReviewed"
                disabled={isSaving || !statsReady}
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="1"
                value={formValues.propertiesReviewed}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="estimatedTimelineDays">
              <span>Estimated Timeline Days</span>
              <input
                id="estimatedTimelineDays"
                name="estimatedTimelineDays"
                disabled={isSaving || !statsReady}
                type="number"
                inputMode="numeric"
                min="0"
                max="3650"
                step="1"
                value={formValues.estimatedTimelineDays}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="estimatedCashOffer">
              <span>Estimated Cash Offer</span>
              <input
                id="estimatedCashOffer"
                name="estimatedCashOffer"
                disabled={isSaving || !statsReady}
                type="number"
                inputMode="numeric"
                min="0"
                max="100000000"
                step="1"
                value={formValues.estimatedCashOffer}
                onChange={handleFieldChange}
              />
            </label>

            <label className="admin-field" htmlFor="reviewCompletePercent">
              <span>Review Complete Percent</span>
              <input
                id="reviewCompletePercent"
                name="reviewCompletePercent"
                disabled={isSaving || !statsReady}
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="1"
                value={formValues.reviewCompletePercent}
                onChange={handleFieldChange}
              />
            </label>

            {!statsReady && (
              <p className={`admin-message ${statsStatus === 'error' ? 'error' : ''}`} role="status">
                {statsStatus === 'error'
                  ? 'Could not load stats. Reload before making changes.'
                  : 'Loading current stats...'}
              </p>
            )}

            {message && (
              <p
                className={`admin-message ${message === SUCCESS_MESSAGE ? 'success' : 'error'}`}
                aria-live="polite"
              >
                {message}
              </p>
            )}

            <div className="admin-actions">
              <button type="submit" className="btn-primary" disabled={isSaving || !statsReady}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={handleReset}
                disabled={isSaving || !statsReady}
              >
                Reset to Zero
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
