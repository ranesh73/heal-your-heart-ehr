import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserSession } from '../../types';
import { api } from '../../services/api';

interface LoginProps {
  onLoginSuccess: (user: UserSession) => void;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: (identifier?: string) => void;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MOBILE_PATTERN = /^\+?[0-9][0-9\s-]{8,16}$/;

/** Step 1 accepts either form of identifier, so both are validated here. */
function isValidIdentifier(value: string): boolean {
  if (EMAIL_PATTERN.test(value)) return true;
  return MOBILE_PATTERN.test(value) && value.replace(/\D/g, '').length >= 10;
}

/**
 * Two-step account sign-in: identifier first, then password.
 *
 * Deliberately says nothing about doctors, physicians or medical roles: the
 * clinic asked for a plain account login that any staff member can use. The
 * step change is local state, not a route change, so nothing reloads between
 * the two panels.
 */
export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onNavigateToSignup,
  onNavigateToForgotPassword
}) => {
  const [step, setStep] = useState<'identifier' | 'password'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  // Landing on the password panel should put the caret where the user is
  // about to type, exactly as a single continuous form would.
  useEffect(() => {
    if (step === 'password') passwordRef.current?.focus();
  }, [step]);

  const handleNext = (e: React.FormEvent) => {
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
    setStep('password');
  };

  const handleChangeIdentifier = () => {
    setStep('identifier');
    setPassword('');
    setShowPassword(false);
    setErrors({});
    setFormError('');
    setNotice('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setNotice('');

    if (!password) {
      setErrors({ password: 'Enter your password.' });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const res = await api.login(identifier, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setFormError('Those credentials were not recognised.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to sign in right now.');
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

        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">to access charmhealth</p>

        {formError && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {notice && (
          <div className="auth-alert info" role="status">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        )}

        {step === 'identifier' ? (
          <form onSubmit={handleNext} noValidate>
            <div className="auth-field">
              <label className="visually-hidden" htmlFor="login-identifier">
                Email address or mobile number
              </label>
              <input
                id="login-identifier"
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
                aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
              />
              {errors.identifier && (
                <p className="auth-field-error" id="login-identifier-error">
                  {errors.identifier}
                </p>
              )}
            </div>

            <button type="submit" className="auth-submit">
              Next
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} noValidate>
            {/* The identifier stays visible so the user can confirm which
                account they are signing into, and step back if it is wrong. */}
            <div className="auth-identity-box">
              <span className="auth-identity-value" title={identifier}>
                {identifier}
              </span>
              <button type="button" className="auth-link" onClick={handleChangeIdentifier}>
                Change
              </button>
            </div>

            <div className="auth-field">
              <label className="visually-hidden" htmlFor="login-password">
                Password
              </label>
              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({});
                  }}
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
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
              {errors.password && (
                <p className="auth-field-error" id="login-password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="auth-links-row spread">
              <button
                type="button"
                className="auth-link"
                onClick={() =>
                  setNotice(
                    `A one-time passcode would be emailed to ${identifier}. Email OTP is not enabled in this prototype - sign in with your password.`
                  )
                }
              >
                Sign in using email OTP
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => onNavigateToForgotPassword(identifier)}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button type="button" className="auth-link" onClick={onNavigateToSignup}>
            Create Account
          </button>
        </p>
      </div>

      <p className="auth-footer">© 2026 MedicalMine Inc. All rights reserved.</p>
    </div>
  );
};
