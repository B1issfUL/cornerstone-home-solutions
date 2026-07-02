.address-form-wrap {
  scroll-margin-top: 96px;
}

.address-form {
  display: flex;
  gap: 12px;
  background-color: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  padding: 10px;
  box-shadow: var(--shadow);
}

.input-shell {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding-left: 12px;
}

.input-icon {
  color: var(--purple-light);
  flex-shrink: 0;
}

.address-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  padding: 12px 4px;
  font-size: 1rem;
  color: var(--text);
}

.address-input::placeholder {
  color: var(--text-muted);
}

.address-input:focus {
  outline: none;
}

/* Move visible focus to the shell so the icon and field read as one control */
.address-form:focus-within {
  border-color: var(--orange);
}

.form-submit {
  flex-shrink: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.form-feedback {
  min-height: 0;
  margin-top: 10px;
}

.feedback-error {
  color: #fca5a5;
  font-size: 0.92rem;
  font-weight: 500;
}

.feedback-success {
  color: var(--purple-light);
  font-size: 0.95rem;
  font-weight: 500;
  background-color: rgba(124, 58, 237, 0.12);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
}

.privacy-note {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

@media (max-width: 560px) {
  .address-form {
    flex-direction: column;
    padding: 12px;
  }

  .input-shell {
    padding-left: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px 10px;
  }

  .form-submit {
    width: 100%;
  }
}
