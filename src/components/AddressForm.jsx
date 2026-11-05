import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { CONTACT_EMAIL } from '../lib/contact.js';
import { readStorage, writeStorage } from '../lib/storage.js';
import './AddressForm.css';

const SUBMISSION_COOLDOWN_MS = 60_000;
const MIN_REVIEW_TIME_MS = 2_000;
const MIN_AUTOCOMPLETE_CHARS = 3;
// Bypassable per-page guard, not a provider quota or spending limit.
const MAX_PLACES_REQUESTS = 30;
let placesRequests = 0;
const ADDRESS_ERROR_INCOMPLETE = 'addressIncomplete';
const ADDRESS_ERROR_UNAVAILABLE = 'addressUnavailable';

const FORM_DEFAULTS = {
  name: '',
  phone: '',
  email: '',
  preferred_contact: 'Phone Call',
  property_details: '',
  contact_consent: false,
  _gotcha: '',
};

let googleMapsPromise;

function EmailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="inline-link">
      {CONTACT_EMAIL}
    </a>
  );
}

function LocationIcon() {
  return (
    <svg
      className="input-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function loadGoogleMaps(apiKey) {
  if (googleMapsPromise) return googleMapsPromise;
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-chs-google-maps]');

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const callbackName = '__chsGoogleMapsLoaded';
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
        libraries: 'places',
        callback: callbackName,
      });
      const timeout = window.setTimeout(() => {
        reject(new Error('Google Maps did not finish loading.'));
      }, 12000);
      const previousAuthFailure = window.gm_authFailure;

      window[callbackName] = () => {
        window.clearTimeout(timeout);
        delete window[callbackName];
        resolve(window.google);
      };
      window.gm_authFailure = () => {
        window.clearTimeout(timeout);
        delete window[callbackName];

        if (previousAuthFailure) {
          previousAuthFailure();
        }

        const error = new Error('Google Maps authentication failed.');
        error.name = 'GoogleMapsAuthFailure';
        error.code = 'gm_authFailure';
        reject(error);
      };

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;
      script.dataset.chsGoogleMaps = 'true';
      script.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeout);
          delete window[callbackName];
          reject(new Error('Google Maps could not load.'));
        },
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function getAddressComponent(components, type, key = 'longText') {
  const component = components.find((item) => item.types?.includes(type));
  return component?.[key] || component?.long_name || component?.short_name || '';
}

function normalizePlace(place) {
  const addressComponents = Array.from(place.addressComponents || place.address_components || []);
  const countryShort = getAddressComponent(addressComponents, 'country', 'shortText');
  const city =
    getAddressComponent(addressComponents, 'locality') ||
    getAddressComponent(addressComponents, 'postal_town') ||
    getAddressComponent(addressComponents, 'sublocality') ||
    getAddressComponent(addressComponents, 'administrative_area_level_2') ||
    getAddressComponent(addressComponents, 'administrative_area_level_3');
  const normalized = {
    formattedAddress: place.formattedAddress || place.formatted_address || '',
    placeId: place.id || place.placeId || place.place_id || '',
    streetNumber: getAddressComponent(addressComponents, 'street_number'),
    streetName: getAddressComponent(addressComponents, 'route'),
    city,
    state: getAddressComponent(addressComponents, 'administrative_area_level_1', 'shortText'),
    zip: getAddressComponent(addressComponents, 'postal_code'),
    country: countryShort,
  };

  normalized.isValid =
    Boolean(normalized.formattedAddress) &&
    Boolean(normalized.placeId) &&
    normalized.country === 'US' &&
    Boolean(normalized.streetNumber) &&
    Boolean(normalized.streetName) &&
    Boolean(normalized.city) &&
    Boolean(normalized.state) &&
    Boolean(normalized.zip);

  return normalized;
}

function getSuggestionText(prediction) {
  return prediction?.text?.text || prediction?.text?.toString?.() || '';
}

function getSuggestionMainText(prediction) {
  return prediction?.mainText?.text || prediction?.mainText?.toString?.() || getSuggestionText(prediction);
}

function getSuggestionSecondaryText(prediction) {
  return prediction?.secondaryText?.text || prediction?.secondaryText?.toString?.() || '';
}

function getDigits(value) {
  return value.replace(/\D/g, '');
}

function isValidPhone(value) {
  const trimmed = value.trim();
  const digits = getDigits(trimmed);
  return (
    digits.length >= 10 &&
    digits.length <= 15 &&
    !/[A-Za-z]/.test(trimmed) &&
    /^[+()\-\s.\d]+$/.test(trimmed)
  );
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
}

function LeadModal(props) {
  const { t } = useLanguage();
  const {
    verifiedAddress,
    initialPhone,
    initialEmail,
    onClose,
    onChangeAddress,
    onSuccess,
    formspreeFormId,
  } = props;

  const [fields, setFields] = useState({
    ...FORM_DEFAULTS,
    phone: initialPhone,
    email: initialEmail,
  });
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionRef = useRef(false);
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const fieldRefs = {
    name: firstInputRef,
    phone: useRef(null),
    email: useRef(null),
    preferred_contact: useRef(null),
    contact_consent: useRef(null),
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setReviewReady(true), MIN_REVIEW_TIME_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!submissionRef.current) onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFieldChange = (event) => {
    const { name, type, value, checked } = event.target;

    setFields((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitMessage('');
  };

  const validateLead = () => {
    const nextErrors = {};

    if (!verifiedAddress?.isValid) {
      nextErrors.property_address = t('form.errors.addressIncomplete');
    }

    if (fields.name.trim().length < 2) {
      nextErrors.name = t('form.modal.validation.name');
    }

    if (!isValidPhone(fields.phone)) {
      nextErrors.phone = t('form.errors.phoneInvalid');
    }

    if (!isValidEmail(fields.email)) {
      nextErrors.email = t('form.errors.emailInvalid');
    }

    if (!fields.preferred_contact) {
      nextErrors.preferred_contact = t('form.modal.validation.preferredContact');
    }

    if (!fields.contact_consent) {
      nextErrors.contact_consent = t('form.modal.validation.consent');
    }

    return nextErrors;
  };

  const focusFirstLeadError = (nextErrors) => {
    const firstErrorField = [
      'name',
      'phone',
      'email',
      'preferred_contact',
      'contact_consent',
    ].find((field) => nextErrors[field]);

    if (firstErrorField) {
      fieldRefs[firstErrorField]?.current?.focus();
    }
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();

    if (submissionRef.current) return;

    const nextErrors = validateLead();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstLeadError(nextErrors);
      return;
    }

    if (!reviewReady) {
      setSubmitMessage('reviewWait');
      return;
    }

    const now = Date.now();
    const lastSubmission = Number(readStorage('sessionStorage', 'chs_last_submission_at') || 0);

    if (lastSubmission && now - lastSubmission < SUBMISSION_COOLDOWN_MS) {
      setSubmitMessage('cooldown');
      return;
    }

    if (!formspreeFormId || fields._gotcha) {
      setSubmitMessage('send_failed');
      return;
    }

    const payload = new FormData(event.currentTarget);
    submissionRef.current = true;
    setSubmitting(true);
    setSubmitMessage('');
    try {
      const response = await fetch(`https://formspree.io/f/${encodeURIComponent(formspreeFormId)}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok || (await response.json())?.ok !== true) {
        throw new Error('Submission failed');
      }
      writeStorage('sessionStorage', 'chs_last_submission_at', String(Date.now()));
      onSuccess();
    } catch {
      setSubmitMessage('send_failed');
    } finally {
      submissionRef.current = false;
      setSubmitting(false);
    }
  };

  const submitDisabled = submitting || !reviewReady || !formspreeFormId;

  return (
    <div className="lead-modal-backdrop" role="presentation">
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        ref={modalRef}
      >
        <div className="lead-modal-header">
          <div>
            <span className="lead-modal-kicker">{t('form.modal.nextStep')}</span>
            <h2 id="lead-modal-title">{t('form.modal.title')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={submitting} aria-label={t('form.modal.closeForm')}>
            x
          </button>
        </div>

        <form className="lead-details-form" onSubmit={handleLeadSubmit} noValidate>
          <input type="hidden" name="subject" value={t('form.subject')} />
          <input type="hidden" name="property_address" value={verifiedAddress.formattedAddress} />
          <input type="hidden" name="google_place_id" value={verifiedAddress.placeId} />
          <input type="hidden" name="address_street_number" value={verifiedAddress.streetNumber} />
          <input type="hidden" name="address_route" value={verifiedAddress.streetName} />
          <input type="hidden" name="address_city" value={verifiedAddress.city} />
          <input type="hidden" name="address_state" value={verifiedAddress.state} />
          <input type="hidden" name="address_postal_code" value={verifiedAddress.zip} />
          <input type="hidden" name="address_country" value={verifiedAddress.country} />

          <label className="lead-field">
            <span>{t('form.propertyAddress')}</span>
            <input
              type="text"
              value={verifiedAddress.formattedAddress}
              readOnly
              aria-describedby="property-address-review-note"
            />
          </label>
          <p id="property-address-review-note" className="field-note">
            {t('form.modal.reviewAddressNote')}
          </p>
          <button type="button" className="text-button" onClick={onChangeAddress} disabled={submitting}>
            {t('form.modal.changeAddress')}
          </button>

          <label className="lead-field" htmlFor="lead-name">
            <span>{t('form.modal.fullName')}</span>
            <input
              id="lead-name"
              ref={firstInputRef}
              name="name"
              type="text"
              required
              autoComplete="name"
              value={fields.name}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'lead-name-error' : undefined}
            />
          </label>
          {errors.name && (
            <p className="feedback-error" id="lead-name-error">
              {errors.name}
            </p>
          )}

          <label className="lead-field" htmlFor="lead-phone">
            <span>{t('form.phoneNumber')}</span>
            <input
              id="lead-phone"
              ref={fieldRefs.phone}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={fields.phone}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
            />
          </label>
          {errors.phone && (
            <p className="feedback-error" id="lead-phone-error">
              {errors.phone}
            </p>
          )}

          <label className="lead-field" htmlFor="lead-email">
            <span>{t('form.emailAddress')}</span>
            <input
              id="lead-email"
              ref={fieldRefs.email}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={fields.email}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'lead-email-error' : undefined}
            />
          </label>
          {errors.email && (
            <p className="feedback-error" id="lead-email-error">
              {errors.email}
            </p>
          )}

          <label className="lead-field" htmlFor="preferred-contact">
            <span>{t('form.modal.preferredContactMethod')}</span>
            <select
              id="preferred-contact"
              ref={fieldRefs.preferred_contact}
              name="preferred_contact"
              required
              value={fields.preferred_contact}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.preferred_contact)}
              aria-describedby={errors.preferred_contact ? 'preferred-contact-error' : undefined}
            >
              <option value="Phone Call">{t('form.modal.contactOptions.phoneCall')}</option>
              <option value="Text Message">{t('form.modal.contactOptions.textMessage')}</option>
              <option value="Email">{t('form.modal.contactOptions.email')}</option>
            </select>
          </label>
          {errors.preferred_contact && (
            <p className="feedback-error" id="preferred-contact-error">
              {errors.preferred_contact}
            </p>
          )}

          <label className="lead-field" htmlFor="property-details">
            <span>{t('form.modal.propertyDetails')}</span>
            <textarea
              id="property-details"
              name="property_details"
              placeholder={t('form.modal.propertyDetailsPlaceholder')}
              value={fields.property_details}
              onChange={handleFieldChange}
              rows="4"
            />
          </label>

          <input
            type="text"
            name="_gotcha"
            tabIndex="-1"
            autoComplete="off"
            className="honeypot-field"
            value={fields._gotcha}
            onChange={handleFieldChange}
          />

          <label className="consent-field" htmlFor="contact-consent">
            <input
              id="contact-consent"
              ref={fieldRefs.contact_consent}
              name="contact_consent"
              type="checkbox"
              required
              checked={fields.contact_consent}
              onChange={handleFieldChange}
              aria-invalid={Boolean(errors.contact_consent)}
              aria-describedby={errors.contact_consent ? 'contact-consent-error' : undefined}
            />
            <span>
              {t('form.modal.consent')}
            </span>
          </label>
          {errors.contact_consent && (
            <p className="feedback-error" id="contact-consent-error">
              {errors.contact_consent}
            </p>
          )}

          {!formspreeFormId && (
            <p className="feedback-error">
              {t('form.modal.notConfigured')}
              {' '}<EmailLink />.
            </p>
          )}

          {submitMessage && (
            <p className="feedback-error" aria-live="polite">
              {submitMessage === 'send_failed' ? (
                <>
                  {t('form.modal.sendFailedPrefix')}{' '}
                  <EmailLink />
                  .
                </>
              ) : (
                t(`form.modal.messages.${submitMessage}`)
              )}
            </p>
          )}

          <button
            type="submit"
            className={`btn-primary modal-submit${submitting ? ' is-sending' : ''}`}
            disabled={submitDisabled}
            aria-disabled={submitDisabled ? 'true' : 'false'}
          >
            {submitting ? t('form.modal.sending') : t('form.modal.submitInformation')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddressForm() {
  const { t } = useLanguage();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const formspreeFormId = import.meta.env.VITE_FORMSPREE_FORM_ID;
  const [mapsRequested, setMapsRequested] = useState(false);
  const [mapsStatus, setMapsStatus] = useState(googleMapsApiKey ? 'idle' : 'error');
  const [searchActive, setSearchActive] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [verifiedAddress, setVerifiedAddress] = useState(null);
  const [addressTouched, setAddressTouched] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressSelecting, setAddressSelecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState({ phone: false, email: false });
  const [startAttempted, setStartAttempted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessageVisible, setSuccessMessageVisible] = useState(false);
  const addressInputRef = useRef(null);
  const placesLibraryRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const suggestionTimerRef = useRef(null);
  const suggestionRequestIdRef = useRef(0);
  const selectionRequestIdRef = useRef(0);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const getOfferButtonRef = useRef(null);

  const phoneValid = useMemo(() => isValidPhone(phone), [phone]);
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const addressValid = Boolean(verifiedAddress?.isValid);
  const canContinue = mapsStatus === 'ready' && addressValid && phoneValid && emailValid;
  useEffect(() => {
    if (!googleMapsApiKey || !mapsRequested) return;
    let cancelled = false;
    setMapsStatus('loading');

    loadGoogleMaps(googleMapsApiKey)
      .then((google) => google.maps.importLibrary('places'))
      .then((placesLibrary) => {
        if (cancelled) return;
        placesLibraryRef.current = placesLibrary;
        setMapsStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setMapsStatus('error');
      });

    return () => {
      cancelled = true;
      selectionRequestIdRef.current += 1;
    };
  }, [googleMapsApiKey, mapsRequested]);

  const phoneError =
    (touched.phone || startAttempted) && !phoneValid
      ? t('form.errors.phoneInvalid')
      : '';
  const emailError =
    (touched.email || startAttempted) && !emailValid ? t('form.errors.emailInvalid') : '';

  const addressSearchUnavailable = addressError === ADDRESS_ERROR_UNAVAILABLE || mapsStatus === 'error';
  const displayedAddressError = mapsStatus === 'loading' || addressSelecting ? '' :
    addressSearchUnavailable && (addressTouched || startAttempted || addressText.trim())
      ? ADDRESS_ERROR_UNAVAILABLE
      : addressError ||
        ((addressTouched || startAttempted) && !addressValid ? ADDRESS_ERROR_INCOMPLETE : '');
  const addressDescribedBy = [
    displayedAddressError ? 'address-error' : '',
    mapsStatus === 'loading' ? 'address-status' : '',
    addressSelecting ? 'address-verifying' : '',
    'privacy-note',
  ]
    .filter(Boolean)
    .join(' ');

  const resetSessionToken = () => {
    const PlacesSessionToken = placesLibraryRef.current?.AutocompleteSessionToken;

    if (PlacesSessionToken) {
      sessionTokenRef.current = new PlacesSessionToken();
    }
  };

  const clearAddressSuggestions = () => {
    setAddressSuggestions([]);
    setSuggestionsOpen(false);
    setHighlightedSuggestionIndex(-1);
  };

  const cancelSuggestions = () => {
    window.clearTimeout(suggestionTimerRef.current);
    suggestionRequestIdRef.current += 1;
  };

  useEffect(() => {
    const query = addressText.trim();
    const placesLibrary = placesLibraryRef.current;
    if (!searchActive || addressValid || addressSelecting || query.length < MIN_AUTOCOMPLETE_CHARS ||
        mapsStatus !== 'ready' || !placesLibrary) return;
    const requestId = ++suggestionRequestIdRef.current;

    suggestionTimerRef.current = window.setTimeout(async () => {
      if (placesRequests >= MAX_PLACES_REQUESTS - 1) {
        setAddressError(ADDRESS_ERROR_UNAVAILABLE);
        return;
      }
      placesRequests += 1;
      try {
        if (!sessionTokenRef.current) {
          resetSessionToken();
        }

        const { suggestions } =
          await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['us'],
            language: 'en-US',
            region: 'us',
            sessionToken: sessionTokenRef.current,
          });

        if (suggestionRequestIdRef.current !== requestId) return;

        const nextSuggestions = suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter(Boolean)
          .slice(0, 5)
          .map((prediction, index) => ({
            id: `${prediction.placeId || prediction.id || index}-${index}`,
            prediction,
            text: getSuggestionText(prediction),
            mainText: getSuggestionMainText(prediction),
            secondaryText: getSuggestionSecondaryText(prediction),
          }));

        setAddressSuggestions(nextSuggestions);
        setSuggestionsOpen(nextSuggestions.length > 0);
        setHighlightedSuggestionIndex(-1);
      } catch {
        if (suggestionRequestIdRef.current !== requestId) return;

        clearAddressSuggestions();
        setAddressError(ADDRESS_ERROR_UNAVAILABLE);
      }
    }, 250);
    return cancelSuggestions;
  }, [addressText, addressValid, addressSelecting, mapsStatus, searchActive]);

  const handleSuggestionSelect = async (suggestion) => {
    if (!suggestion?.prediction) return;

    cancelSuggestions();
    setSearchActive(false);
    clearAddressSuggestions();
    if (placesRequests >= MAX_PLACES_REQUESTS) {
      setAddressError(ADDRESS_ERROR_UNAVAILABLE);
      return;
    }
    placesRequests += 1;
    const requestId = ++selectionRequestIdRef.current;
    setAddressSelecting(true);
    setAddressError('');

    try {
      const place = suggestion.prediction.toPlace();

      await place.fetchFields({
        fields: ['id', 'formattedAddress', 'addressComponents'],
      });
      if (selectionRequestIdRef.current !== requestId) return;

      const normalizedPlace = normalizePlace(place || {});

      if (!normalizedPlace.isValid) {
        setVerifiedAddress(null);
        setAddressTouched(true);
        setAddressError(ADDRESS_ERROR_INCOMPLETE);
        return;
      }

      setVerifiedAddress(normalizedPlace);
      setAddressText(normalizedPlace.formattedAddress);
      setAddressTouched(true);
      setSuccessMessageVisible(false);
    } catch {
      if (selectionRequestIdRef.current !== requestId) return;
      setVerifiedAddress(null);
      setAddressTouched(true);
      setAddressError(ADDRESS_ERROR_UNAVAILABLE);
    } finally {
      if (selectionRequestIdRef.current === requestId) {
        sessionTokenRef.current = null;
        setAddressSelecting(false);
      }
    }
  };

  const focusFirstInvalidField = () => {
    if (!addressValid) {
      addressInputRef.current?.focus();
      return;
    }

    if (!phoneValid) {
      phoneRef.current?.focus();
      return;
    }

    if (!emailValid) {
      emailRef.current?.focus();
    }
  };

  const handleAddressChange = (event) => {
    const nextValue = event.target.value;
    cancelSuggestions();
    if (addressSelecting) sessionTokenRef.current = null;
    selectionRequestIdRef.current += 1;
    setAddressSelecting(false);
    clearAddressSuggestions();
    setMapsRequested(true);
    setSearchActive(true);
    setAddressText(nextValue);
    setSuccessMessageVisible(false);
    setAddressError('');
    setAddressTouched(false);

    if (verifiedAddress) {
      setVerifiedAddress(null);
    }

  };

  const handleAddressBlur = () => {
    cancelSuggestions();
    clearAddressSuggestions();
    setSearchActive(false);
    setAddressTouched(true);
  };

  const handleAddressKeyDown = (event) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape' && searchActive) {
      event.preventDefault();
      cancelSuggestions();
      clearAddressSuggestions();
      setSearchActive(false);
      return;
    }
    if (event.key === 'ArrowDown' && !searchActive && !addressValid && !addressSelecting) {
      event.preventDefault();
      setSearchActive(true);
      return;
    }
    if (!suggestionsOpen || addressSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((current) =>
        current >= addressSuggestions.length - 1 ? 0 : current + 1,
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((current) =>
        current <= 0 ? addressSuggestions.length - 1 : current - 1,
      );
    }

    if (event.key === 'Enter' && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(addressSuggestions[highlightedSuggestionIndex]);
    }

  };

  const handleStartSubmit = (event) => {
    event.preventDefault();
    setStartAttempted(true);
    setSuccessMessageVisible(false);

    if (!canContinue) {
      focusFirstInvalidField();
      return;
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    window.setTimeout(() => getOfferButtonRef.current?.focus(), 0);
  };

  const handleChangeAddress = () => {
    setModalOpen(false);
    window.setTimeout(() => addressInputRef.current?.focus(), 0);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setSuccessMessageVisible(true);
    setAddressText('');
    setVerifiedAddress(null);
    setAddressTouched(false);
    setAddressError('');
    clearAddressSuggestions();
    setPhone('');
    setEmail('');
    setTouched({ phone: false, email: false });
    setStartAttempted(false);
    window.setTimeout(() => getOfferButtonRef.current?.focus(), 0);
  };

  return (
    <div className="address-form-wrap" id="address-form">
      <form className="address-form lead-intake-form" onSubmit={handleStartSubmit} noValidate>
        <div className="lead-intake-grid">
          <div className="lead-field lead-address-field">
            <label htmlFor="property-address">{t('form.propertyAddress')}</label>
            <div className="address-field-wrap">
              <div
                className={`input-shell places-shell ${displayedAddressError ? 'input-shell-error' : ''}`}
              >
                <LocationIcon />
                <input
                  id="property-address"
                  ref={addressInputRef}
                  className="address-input"
                  name="property_address"
                  type="text"
                  role="combobox"
                  required
                  value={addressText}
                  autoComplete="street-address"
                  placeholder={t('form.addressPlaceholder')}
                  onBlur={handleAddressBlur}
                  onChange={handleAddressChange}
                  onFocus={() => {
                    setMapsRequested(true);
                    setSearchActive(true);
                  }}
                  onKeyDown={handleAddressKeyDown}
                  aria-autocomplete="list"
                  aria-controls={addressSuggestions.length > 0 ? 'address-suggestions' : undefined}
                  aria-expanded={suggestionsOpen && addressSuggestions.length > 0 ? 'true' : 'false'}
                  aria-activedescendant={
                    suggestionsOpen && highlightedSuggestionIndex >= 0
                      ? `address-suggestion-${highlightedSuggestionIndex}`
                      : undefined
                  }
                  aria-invalid={Boolean(displayedAddressError)}
                  aria-describedby={addressDescribedBy}
                />
              </div>
              {suggestionsOpen && addressSuggestions.length > 0 && (
                <div className="address-suggestions">
                  <div id="address-suggestions" role="listbox" aria-label={t('form.addressSuggestions')}>
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      id={`address-suggestion-${index}`}
                      type="button"
                      tabIndex={-1}
                      className={`address-suggestion-item ${
                        highlightedSuggestionIndex === index ? 'is-active' : ''
                      }`}
                      role="option"
                      aria-selected={highlightedSuggestionIndex === index ? 'true' : 'false'}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <span className="address-suggestion-main">{suggestion.mainText}</span>
                      {suggestion.secondaryText && (
                        <span className="address-suggestion-secondary">
                          {suggestion.secondaryText}
                        </span>
                      )}
                    </button>
                  ))}
                  </div>
                  <div className="address-attribution" translate="no">Google Maps</div>
                </div>
              )}
            </div>
            {mapsStatus === 'loading' && (
              <p className="field-note address-status" id="address-status" role="status">
                {t('form.addressLoading')}
              </p>
            )}
            {addressSelecting && (
              <p className="field-note address-status" id="address-verifying" role="status">
                {t('form.addressVerifying')}
              </p>
            )}
            {displayedAddressError && (
              <p className="feedback-error" id="address-error">
                {addressSearchUnavailable ? (
                  <>
                    {t('form.errors.addressUnavailablePrefix')}{' '}
                    <EmailLink />
                    .
                  </>
                ) : (
                  t(`form.errors.${displayedAddressError}`)
                )}
              </p>
            )}
            {addressTouched && addressValid && (
              <p className="feedback-success compact">{t('form.addressVerified')}</p>
            )}
          </div>

          <label className="lead-field" htmlFor="phone">
            <span>{t('form.phoneNumber')}</span>
            <input
              id="phone"
              ref={phoneRef}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
              onChange={(event) => {
                setPhone(event.target.value);
                setSuccessMessageVisible(false);
              }}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? 'phone-error privacy-note' : 'privacy-note'}
            />
            {phoneError && (
              <p className="feedback-error" id="phone-error">
                {phoneError}
              </p>
            )}
          </label>

          <label className="lead-field" htmlFor="email">
            <span>{t('form.emailAddress')}</span>
            <input
              id="email"
              ref={emailRef}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              onChange={(event) => {
                setEmail(event.target.value);
                setSuccessMessageVisible(false);
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-error privacy-note' : 'privacy-note'}
            />
            {emailError && (
              <p className="feedback-error" id="email-error">
                {emailError}
              </p>
            )}
          </label>
        </div>

        <p id="privacy-note" className="privacy-note">
          {t('form.privacyNote')}{' '}
          <a className="inline-link" href="#privacy-notice">{t('footer.privacyPolicy')}</a>
        </p>

        <button
          ref={getOfferButtonRef}
          type="submit"
          className="btn-primary form-submit"
          disabled={!canContinue}
          aria-disabled={!canContinue ? 'true' : 'false'}
        >
          {t('form.getMyOffer')}
        </button>
      </form>

      <div id="form-feedback" role="status" aria-live="polite" className="form-feedback">
        {successMessageVisible && (
          <div className="feedback-success">
            <p>
              <svg className="feedback-check" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('form.successMessage')}
            </p>
          </div>
        )}
      </div>

      {modalOpen && verifiedAddress && createPortal(
          <LeadModal
            formspreeFormId={formspreeFormId}
            verifiedAddress={verifiedAddress}
            initialPhone={phone}
            initialEmail={email}
            onClose={closeModal}
            onChangeAddress={handleChangeAddress}
            onSuccess={handleSuccess}
          />,
        document.body,
      )}
    </div>
  );
}
