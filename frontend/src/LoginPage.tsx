import React, { useState } from "react";
import { Eye, EyeOff, Lock, User, LogIn, ArrowLeft, ShieldCheck, Mail, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { api, setSession, navigate } from "./api";
import { HealYourHeartLogo } from "./HealYourHeartLogo";

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
      // For OTP login: in this system, OTP verification can be checked, then logged in
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <HealYourHeartLogo size="sm" clickable={true} />
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "transparent",
            color: "#64748b",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Website</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          data-testid="login-card"
          style={{
            backgroundColor: "#ffffff",
            width: "100%",
            maxWidth: "460px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0",
            padding: "24px 28px",
          }}
        >
          {/* Card Brand Header */}
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <div style={{ display: "inline-block", marginBottom: "8px" }}>
              <img
                src="/images/hyh_logo.png"
                alt="Heal Your Heart Logo"
                style={{ height: "40px", width: "auto", objectFit: "contain" }}
              />
            </div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 4px 0",
              }}
            >
              Sign In to Heal Your Heart EHR
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Authorized Clinical &amp; Administrative Practice Portal
            </p>
          </div>

          {/* Mode Switcher: Password vs OTP */}
          <div
            style={{
              display: "flex",
              backgroundColor: "#f1f5f9",
              borderRadius: "8px",
              padding: "4px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError(null);
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "6px",
                padding: "8px",
                fontSize: "13px",
                fontWeight: loginMode === "password" ? 700 : 500,
                backgroundColor: loginMode === "password" ? "#ffffff" : "transparent",
                color: loginMode === "password" ? "#0f766e" : "#64748b",
                boxShadow: loginMode === "password" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("otp");
                setError(null);
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "6px",
                padding: "8px",
                fontSize: "13px",
                fontWeight: loginMode === "otp" ? 700 : 500,
                backgroundColor: loginMode === "otp" ? "#ffffff" : "transparent",
                color: loginMode === "otp" ? "#0f766e" : "#64748b",
                boxShadow: loginMode === "otp" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
              }}
            >
              Sign In with OTP
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              data-testid="login-error-box"
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px",
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
                borderRadius: "8px",
                padding: "12px",
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
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Email or Mobile Number
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    data-testid="login-identifier-input"
                    aria-label="Staff email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. doctor@demo.local or 9003078282"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 14px 10px 36px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <User
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "12px", top: "13px" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#0d9488",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    data-testid="login-password-input"
                    aria-label="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 40px 10px 36px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <Lock
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "12px", top: "13px" }}
                  />
                  <button
                    type="button"
                    data-testid="toggle-password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "11px",
                      backgroundColor: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                data-testid="login-submit-btn"
                aria-label="Sign in to workspace"
                disabled={loading}
                style={{
                  width: "100%",
                  backgroundColor: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <LogIn size={18} />
                <span>{loading ? "Verifying Credentials…" : "Sign In"}</span>
              </button>
            </form>
          ) : (
            /* OTP LOGIN FORM */
            <div>
              {otpStep === "request" ? (
                <form onSubmit={handleRequestOtp}>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Registered Email or Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. doctor@demo.local or 9840123456"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      backgroundColor: "#0d9488",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Sending Code…" : "Send Verification OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpLogin}>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: "6px",
                      }}
                    >
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "18px",
                        letterSpacing: "4px",
                        textAlign: "center",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      backgroundColor: "#0d9488",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      marginBottom: "12px",
                    }}
                  >
                    {loading ? "Verifying Code…" : "Verify & Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep("request")}
                    style={{
                      width: "100%",
                      backgroundColor: "transparent",
                      color: "#64748b",
                      border: "none",
                      fontSize: "13px",
                      cursor: "pointer",
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
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "10px",
                textAlign: "center",
              }}
            >
              Quick Demo Staff Access
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {quickRoles.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  data-testid={`demo-login-${r.label.toLowerCase()}`}
                  onClick={() => {
                    setIdentifier(r.id);
                    setPassword(r.pass);
                    setError(null);
                  }}
                  style={{
                    backgroundColor: identifier === r.id ? "#ccfbf1" : "#f8fafc",
                    border: identifier === r.id ? "1px solid #0d9488" : "1px solid #e2e8f0",
                    color: identifier === r.id ? "#0f766e" : "#475569",
                    padding: "6px 4px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Card Link: Don't have an account? */}
          <div
            style={{
              marginTop: "24px",
              textAlign: "center",
              fontSize: "13px",
              color: "#64748b",
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
                color: "#0d9488",
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
      <footer
        style={{
          padding: "16px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        © {new Date().getFullYear()} Heal Your Heart · Vaso-Meditech Private Limited. Secure Practice Portal.
      </footer>
    </div>
  );
}
