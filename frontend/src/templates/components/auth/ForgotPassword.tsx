import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../services/api';

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
  /** Carried over from the sign-in screen so the user does not retype it. */
  initialIdentifier?: string;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MOBILE_PATTERN = /^\+?[0-9][0-9\s-]{8,16}$/;
const MIN_PASSWORD_LENGTH = 6;

function isValidIdentifier(value: string): boolean {
  if (EMAIL_PATTERN.test(value)) return true;
  return MOBILE_PATTERN.test(value) && value.replace(/\D/g, '').length >= 10;
}

/**
 * Password recovery in two steps: identify the account, then set a new
 * password. The server answers identically whether or not the address is
 * registered, so neither step reveals who holds an account.
 */
export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onNavigateToLogin,
  initialIdentifier = ''
}) => {
  const [step, setStep] = useState<'identifier' | 'reset' | 'done'>('identifier');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrors({ identifier: 'Enter your email address or mobile number.' });
      return;
    }
    if (!isValidIdentifier(trimmed)) {
      setErrors({ identifier: 'Enter a valid email address or mobile number.' });
      return;
    }
    setErrors({});
    setIdentifier(trimmed);

    setLoading(true);
    try {
      await api.forgotPassword(trimmed);
      setStep('reset');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not start password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const next: typeof errors = {};
    if (!password) next.password = 'A new password is required.';
    else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your new password.';
    else if (password && password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await api.resetPassword(identifier, password, confirmPassword);
      setDoneMessage(res.message || 'Your password has been reset. You can sign in with it now.');
      setStep('done');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/charm_logo.jpg" alt="charmhealth" />
        </div>

        <h1 className="auth-title">
          {step === 'identifier' ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="auth-subtitle">
          {step === 'identifier'
            ? 'Enter the email address or mobile number for your account.'
            : step === 'reset'
              ? 'Choose a new password for your account.'
              : 'to access charmhealth'}
        </p>

        {formError && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {step === 'identifier' && (
          <form onSubmit={handleContinue} noValidate>
            <div className="auth-field">
              <label className="visually-hidden" htmlFor="forgot-identifier">
                Email address or mobile number
              </label>
              <input
                id="forgot-identifier"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="Email address or mobile number"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors({});
                }}
                aria-invalid={errors.identifier ? 'true' : undefined}
                aria-describedby={errors.identifier ? 'forgot-identifier-error' : undefined}
              />
              {errors.identifier && (
                <p className="auth-field-error" id="forgot-identifier-error">
                  {errors.identifier}
                </p>
              )}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} noValidate>
            <div className="auth-identity-box">
              <span className="auth-identity-value" title={identifier}>
                {identifier}
              </span>
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setStep('identifier');
                  setPassword('');
                  setConfirmPassword('');
                  setErrors({});
                }}
              >
                Change
              </button>
            </div>

            <div className="auth-field">
              <label htmlFor="reset-password">New Password</label>
              <div className="auth-password-wrap">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'reset-password-error' : 'reset-password-hint'}
                />
                <button
                  type="button"
                  className="auth-reveal-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? (
                <p className="auth-field-error" id="reset-password-error">{errors.password}</p>
              ) : (
                <p className="auth-hint" id="reset-password-hint">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="reset-confirm-password">Confirm Password</label>
              <input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((p) => ({ ...p, confirmPassword: undefined }));
                  }
                }}
                aria-invalid={errors.confirmPassword ? 'true' : undefined}
                aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
              />
              {errors.confirmPassword && (
                <p className="auth-field-error" id="reset-confirm-error">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <>
            <div className="auth-alert success" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{doneMessage}</span>
            </div>
            <button type="button" className="auth-submit" onClick={onNavigateToLogin}>
              Sign in
            </button>
          </>
        )}

        <p className="auth-switch">
          <button type="button" className="auth-link" onClick={onNavigateToLogin}>
            <ArrowLeft size={12} aria-hidden="true" /> Back to Sign in
          </button>
        </p>
      </div>

      <p className="auth-footer">© 2026 MedicalMine Inc. All rights reserved.</p>
    </div>
  );
};
