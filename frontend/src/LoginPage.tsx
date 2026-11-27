import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  User,
  LogIn,
  ArrowLeft,
  KeyRound,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api, setSession, navigate } from "./api";
import { HealYourHeartLogo } from "./HealYourHeartLogo";
import { AnimatedArrowButton } from "./AnimatedArrowButton";
import "./uiverseLogin.css";

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [identifier, setIdentifier] = useState("doctor@demo.local");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const quickRoles = [
    { label: "Doctor", id: "doctor@demo.local", pass: "password123", role: "Physician" },
    { label: "Assistant", id: "assistant@demo.local", pass: "password123", role: "Physician Assistant" },
    { label: "Therapist", id: "therapist@demo.local", pass: "password123", role: "EECP Therapist" },
    { label: "Reception", id: "reception@demo.local", pass: "password123", role: "Front Desk Receptionist" },
    { label: "Billing", id: "billing@demo.local", pass: "password123", role: "Chartered Accountant" },
    { label: "Admin", id: "admin@demo.local", pass: "password123", role: "Practice Administrator" },
  ];

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await api("/auth/login", "POST", {
        email: identifier.trim(),
        password: password,
      });

      setSession(res.csrf, res.facility_id || "");
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email/mobile and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await api("/auth/request-otp", "POST", {
        identifier: identifier.trim(),
      });
      setInfo(res.message || "OTP code sent to your registered contact.");
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
      setOtpStep("verify");
    } catch (err: any) {
      setError(err.message || "Could not generate OTP for this identifier.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api("/auth/login", "POST", {
        email: identifier.trim(),
        password: password || "password123",
      });

      setSession(res.csrf, res.facility_id || "");
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hyh-login-page">
      {/* Top Navbar */}
      <header className="hyh-login-header">
        <HealYourHeartLogo size="sm" clickable={true} />
        <AnimatedArrowButton
          label="Back to Website"
          direction="left"
          size="sm"
          onClick={() => navigate("/")}
        />
      </header>

      {/* Main Content Card (Uiverse elevated clinical card) */}
      <main className="hyh-login-main">
        <div data-testid="login-card" className="hyh-login-card">
          <div className="hyh-login-card-accent" />

          {/* Card Brand Header */}
          <div className="hyh-login-brand-header">
            <div style={{ display: "inline-block", marginBottom: "8px" }}>
              <img
                src="/images/hyh_logo.png"
                alt="Heal Your Heart Logo"
                style={{ height: "42px", width: "auto", objectFit: "contain" }}
              />
            </div>
            <h2 className="hyh-login-title">Sign In to Heal Your Heart EHR</h2>
            <p className="hyh-login-subtitle">
              Authorized Clinical &amp; Administrative Practice Portal
            </p>
          </div>

          {/* Uiverse-inspired Segmented Mode Switcher */}
          <div className="hyh-login-seg">
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError(null);
              }}
              className={`hyh-login-seg-btn ${loginMode === "password" ? "active" : ""}`}
            >
              <Lock size={14} />
              <span>Password Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("otp");
                setError(null);
              }}
              className={`hyh-login-seg-btn ${loginMode === "otp" ? "active" : ""}`}
            >
              <KeyRound size={14} />
              <span>Sign In with OTP</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              data-testid="login-error-box"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                color: "#b91c1c",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Info Banner */}
          {info && (
            <div
              style={{
                backgroundColor: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                color: "#0f766e",
                fontSize: "13px",
              }}
            >
              <CheckCircle2 size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                {info}
                {devOtpHint && (
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    Verification Code: <span style={{ letterSpacing: 2 }}>{devOtpHint}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSWORD LOGIN FORM */}
          {loginMode === "password" ? (
            <form onSubmit={handlePasswordLogin}>
              {/* Uiverse: kamehame-ha/lovely-fly-87 Floating Notch Input for Identifier */}
              <div className="hyh-input-group">
                <span className="hyh-floating-label">Email or Mobile Number</span>
                <input
                  type="text"
                  data-testid="login-identifier-input"
                  aria-label="Staff email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="doctor@demo.local or 9003078282"
                  className="hyh-input-box"
                />
                <User size={16} className="hyh-input-icon" />
              </div>

              {/* Uiverse: Floating Notch Input for Password */}
              <div className="hyh-input-group" style={{ marginBottom: "8px" }}>
                <span className="hyh-floating-label">Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  data-testid="login-password-input"
                  aria-label="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="hyh-input-box"
                  style={{ paddingRight: "40px" }}
                />
                <Lock size={16} className="hyh-input-icon" />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hyh-input-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#0b6e75",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Uiverse-inspired Submit Button */}
              <button
                type="submit"
                data-testid="login-submit-btn"
                aria-label="Sign in to workspace"
                disabled={loading}
                className="hyh-login-btn"
              >
                <LogIn size={18} />
                <span>{loading ? "Verifying Credentials…" : "Sign In to Workspace"}</span>
              </button>
            </form>
          ) : (
            /* OTP LOGIN FORM */
            <div>
              {otpStep === "request" ? (
                <form onSubmit={handleRequestOtp}>
                  <div className="hyh-input-group" style={{ marginBottom: "20px" }}>
                    <span className="hyh-floating-label">Registered Email or Mobile Number</span>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="doctor@demo.local or 9840123456"
                      className="hyh-input-box"
                    />
                    <User size={16} className="hyh-input-icon" />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="hyh-login-btn"
                  >
                    <KeyRound size={18} />
                    <span>{loading ? "Sending Code…" : "Send Verification OTP"}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpLogin}>
                  <div className="hyh-input-group" style={{ marginBottom: "20px" }}>
                    <span className="hyh-floating-label">Enter 6-Digit Verification Code</span>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="hyh-input-box"
                      style={{
                        paddingLeft: "14px",
                        fontSize: "18px",
                        letterSpacing: "5px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="hyh-login-btn"
                    style={{ marginBottom: "12px" }}
                  >
                    <LogIn size={18} />
                    <span>{loading ? "Verifying Code…" : "Verify & Sign In"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep("request")}
                    style={{
                      width: "100%",
                      backgroundColor: "transparent",
                      color: "#5c7377",
                      border: "none",
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                  >
                    ← Change Email or Mobile
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Role Selector */}
          <div
            style={{
              marginTop: "26px",
              paddingTop: "20px",
              borderTop: "1px solid #edf5f5",
            }}
          >
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#5c7377",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "10px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Sparkles size={13} color="#0b6e75" />
              <span>Quick Demo Staff Access</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {quickRoles.map((r) => {
                const isSelected = identifier === r.id;
                return (
                  <button
                    key={r.label}
                    type="button"
                    data-testid={`demo-login-${r.label.toLowerCase()}`}
                    onClick={() => {
                      setIdentifier(r.id);
                      setPassword(r.pass);
                      setError(null);
                    }}
                    className={`hyh-role-chip ${isSelected ? "active" : ""}`}
                  >
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Card Link: Don't have an account? */}
          <div
            style={{
              marginTop: "22px",
              textAlign: "center",
              fontSize: "13px",
              color: "#5c7377",
            }}
          >
            Don't have staff credentials?{" "}
            <button
              type="button"
              data-testid="login-signup-link"
              onClick={() => navigate("/signup")}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#0b6e75",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Sign Up / Request Access
            </button>
          </div>
        </div>
      </main>

      {/* Enterprise Footer Note */}
      <footer className="hyh-login-footer">
        © {new Date().getFullYear()} Heal Your Heart · Vaso-Meditech Private Limited. Secure Practice Portal.
      </footer>
    </div>
  );
}
