import { useState } from 'react';
import './AddressForm.css';

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

export default function AddressForm() {
  const [address, setAddress] = useState('');
  // status: 'idle' | 'error' | 'success'
  const [status, setStatus] = useState('idle');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = address.trim();

    if (trimmed.length < 5) {
      setStatus('error');
      return;
    }

    // The address is intentionally not sent or stored anywhere.
    setStatus('success');
    setAddress('');
  };

  return (
    <div className="address-form-wrap" id="address-form">
      <form className="address-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="property-address" className="visually-hidden">
          Property address
        </label>
        <div className="input-shell">
          <LocationIcon />
          <input
            id="property-address"
            name="property-address"
            type="text"
            className="address-input"
            placeholder="Enter your property address"
            autoComplete="street-address"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
            aria-invalid={status === 'error'}
            aria-describedby="form-feedback privacy-note"
          />
        </div>
        <button type="submit" className="btn-primary form-submit">
          Get My Offer
        </button>
      </form>

      {/* Announced to assistive tech when validation or success messages appear */}
      <div id="form-feedback" role="status" aria-live="polite" className="form-feedback">
        {status === 'error' && (
          <p className="feedback-error">Please enter a valid property address.</p>
        )}
        {status === 'success' && (
          <p className="feedback-success">
            Thank you. We received your address and will reach out soon.
          </p>
        )}
      </div>

      <p id="privacy-note" className="privacy-note">
        Your information will only be used to contact you about your property.
      </p>
    </div>
  );
}
