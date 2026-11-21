import React, { useState } from "react";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PhoneCall,
  ArrowRight,
} from "lucide-react";
import { phrApi, setPhrToken } from "./phrApi";

interface PhrLoginPageProps {
  onSuccess: (patientData?: any) => void;
  onBackToLock?: () => void;
  brandName?: string;
  brandLogo?: string;
}

export function PhrLoginPage({
  onSuccess,
  onBackToLock,
  brandName = "Heal Your Heart PHR",
  brandLogo = "/HYH.png",
}: PhrLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorType, setErrorType] = useState<"inactive" | "invalid_creds" | "generic" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorType("generic");
      setErrorMessage("Please enter your registered Email Address");
      return;
    }
    if (!cleanPassword) {
      setErrorType("generic");
      setErrorMessage("Please enter your 6-digit Patient ID or custom password");
      return;
    }

    setSubmitting(true);
    setErrorType(null);
    setErrorMessage(null);

    try {
      const res = await phrApi("/auth/login", "POST", {
        identifier: cleanEmail,
        password: cleanPassword,
      });

      if (res?.token) {
        setPhrToken(res.token);
      }
      onSuccess(res?.patient);
    } catch (err: any) {
      const msg = String(err?.message || err?.detail || "");
      const status = err?.status || err?.statusCode;
      if (
        status === 403 ||
        msg.toLowerCase().includes("disabled") ||
        msg.toLowerCase().includes("revoked") ||
        msg.toLowerCase().includes("not active")
      ) {
        setErrorType("inactive");
        setErrorMessage(
          "Please ask the Heal Your Heart front desk to enable PHR access for your email address."
        );
      } else if (
        status === 401 ||
        msg.toLowerCase().includes("invalid password") ||
        msg.toLowerCase().includes("401") ||
        msg.toLowerCase().includes("credentials")
      ) {
        setErrorType("invalid_creds");
        setErrorMessage(
          "Invalid email or password. If logging in for the first time, use your 6-digit Patient ID as your password."
        );
      } else {
        setErrorType("generic");
        setErrorMessage(msg || "Unable to sign in. Please check your credentials and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStaffLogin = () => {
    window.location.hash = "#/login";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #F0F9F8, #F5F7FA, #EBF3FA)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 20,
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
          border: "1px solid #f1f5f9",
          padding: "32px 28px",
          boxSizing: "border-box",
        }}
      >
        {/* Back Link if navigated from Lock Screen */}
        {onBackToLock && (
          <button
            type="button"
            onClick={onBackToLock}
            style={{
              background: "none",
              border: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#64748b",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Back to Lock Screen
          </button>
        )}

        {/* Top Clinic Branding Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <img
            src={brandLogo}
            alt="Heal Your Heart Logo"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/HYH.png";
            }}
          />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              margin: "12px 0 4px 0",
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            {brandName}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              margin: 0,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            Your Personal Cardiac & Health Record Portal
          </p>
        </div>

        {/* Error Callout Banner */}
        {errorType && (
          <div
            style={{
              background: errorType === "inactive" ? "#FFFBEB" : "#FEF2F2",
              border: errorType === "inactive" ? "1px solid #FCD34D" : "1px solid #FECACA",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 20,
              color: errorType === "inactive" ? "#92400E" : "#991B1B",
              fontSize: 13,
              lineHeight: 1.45,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AlertCircle
              size={18}
              color={errorType === "inactive" ? "#D97706" : "#DC2626"}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div>
              {errorType === "inactive" && (
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  Portal Access Not Activated Yet
                </div>
              )}
              {errorMessage}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Email Address */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#334155",
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., yourname@gmail.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
              <Mail
                size={18}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                Password
              </label>
              <span
                style={{
                  fontSize: 11,
                  color: "#0d9488",
                  fontWeight: 600,
                  background: "#F0FDFA",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid #CCFBF1",
                }}
              >
                Default: 6-digit Patient ID
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 6-digit Patient ID or password"
                required
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 40px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
              <Lock
                size={18}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="remember_me_phr"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: "#0D9488",
                cursor: "pointer",
              }}
            />
            <label
              htmlFor="remember_me_phr"
              style={{
                fontSize: 13,
                color: "#475569",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Keep me signed in on this device
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: "#0D9488",
              color: "#ffffff",
              border: "none",
              borderRadius: 12,
              padding: "13px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.75 : 1,
              marginTop: 4,
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            {submitting ? "Signing In..." : "Sign In to Heal Your Heart PHR"}
          </button>
        </form>

        {/* Onboarding Quick-Help Accordion */}
        <div
          style={{
            marginTop: 20,
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            overflow: "hidden",
            background: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={() => setFaqOpen(!faqOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HelpCircle size={15} color="#0D9488" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                How to Login for the First Time?
              </span>
            </div>
            {faqOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </button>

          {faqOpen && (
            <div
              style={{
                padding: "0 14px 12px 14px",
                fontSize: 12,
                color: "#475569",
                lineHeight: 1.55,
                borderTop: "1px solid #e2e8f0",
                background: "#ffffff",
              }}
            >
              <ol style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                <li style={{ marginBottom: 6 }}>
                  Ensure your <strong>Email Address</strong> is registered at <strong>Heal Your Heart</strong> and <strong>PHR Access</strong> is enabled by our staff.
                </li>
                <li style={{ marginBottom: 6 }}>
                  Enter your <strong>Registered Email</strong> and your <strong>6-Digit Patient ID</strong> (e.g., <code>000207</code> from <code>HYN-MR-000207</code>) as your initial password.
                </li>
                <li>
                  Once inside, go to <strong>Profile → Change Password</strong> anytime if you wish to set your own custom password.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Demo Fast Login Link */}
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setEmail("hariharan.s@example.com");
              setPassword("000007");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#0d9488",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Fill Demo Credentials: Hariharan S (000007)
          </button>
        </div>
      </div>

      {/* Footer Below Card */}
      <div
        style={{
          marginTop: 20,
          textAlign: "center",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <PhoneCall size={13} color="#0D9488" />
          <span>Need help logging in? Call Heal Your Heart Support: <strong>+91 90030 70065</strong></span>
        </div>
        <div>
          <button
            type="button"
            onClick={handleStaffLogin}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              textDecoration: "underline",
            }}
          >
            Staff EHR Login <ArrowRight size={12} />
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          Heal Your Heart — Vaso-Meditech (EECP Center) · Secure HIPAA/DISHA Compliant
        </div>
      </div>
    </div>
  );
}
