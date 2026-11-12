import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { UserSession } from '../../types';
import { api } from '../../services/api';

interface SignupProps {
  onSignupSuccess: (user: UserSession) => void;
  onNavigateToLogin: () => void;
}

type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword', string>>;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Generic account creation.
 *
 * Five fields only, as specified by the clinic: no registration number, no
 * licence, no specialty, no hospital, nothing that marks the account as a
 * clinician's. Roles are granted by an administrator afterwards.
 */
export const Signup: React.FC<SignupProps> = ({ onSignupSuccess, onNavigateToLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';

    if (!email.trim()) next.email = 'Email ID is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';

    if (!password) next.password = 'Password is required.';
    else if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password && password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.signup({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        password
      });
      if (res.success && res.user) {
        onSignupSuccess(res.user);
      } else {
        setFormError('Could not create the account. Please try again.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  };

  /** Clearing a field's error as soon as it is edited keeps the form calm. */
  const clearError = (field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <div className="auth-brand">
          <img src="/charm_logo.jpg" alt="charmhealth" />
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">It only takes a moment</p>

        {formError && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="signup-first-name">First Name</label>
              <input
                id="signup-first-name"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError('firstName');
                }}
                aria-invalid={errors.firstName ? 'true' : undefined}
                aria-describedby={errors.firstName ? 'signup-first-name-error' : undefined}
              />
              {errors.firstName && (
                <p className="auth-field-error" id="signup-first-name-error">{errors.firstName}</p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="signup-last-name">Last Name</label>
              <input
                id="signup-last-name"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError('lastName');
                }}
                aria-invalid={errors.lastName ? 'true' : undefined}
                aria-describedby={errors.lastName ? 'signup-last-name-error' : undefined}
              />
              {errors.lastName && (
                <p className="auth-field-error" id="signup-last-name-error">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email ID</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError('email');
              }}
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
            />
            {errors.email && (
              <p className="auth-field-error" id="signup-email-error">{errors.email}</p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">New Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
              }}
              aria-invalid={errors.password ? 'true' : undefined}
              aria-describedby={errors.password ? 'signup-password-error' : 'signup-password-hint'}
            />
            {errors.password ? (
              <p className="auth-field-error" id="signup-password-error">{errors.password}</p>
            ) : (
              <p className="auth-hint" id="signup-password-hint">
                At least {MIN_PASSWORD_LENGTH} characters.
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError('confirmPassword');
              }}
              aria-invalid={errors.confirmPassword ? 'true' : undefined}
              aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
            />
            {errors.confirmPassword && (
              <p className="auth-field-error" id="signup-confirm-error">{errors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onNavigateToLogin}>
            Login
          </button>
        </p>
      </div>

      <p className="auth-footer">© 2026 MedicalMine Inc. All rights reserved.</p>
    </div>
  );
};
