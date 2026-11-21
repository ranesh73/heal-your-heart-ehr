import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from "lucide-react";
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
  brandLogo = "/images/HYH.png",
}: PhrLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your Email Address or Patient ID");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password or 6-digit Patient ID");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await phrApi("/auth/login", "POST", {
        identifier: email.trim(),
        password: password.trim(),
      });

      if (res?.token) {
        setPhrToken(res.token);
      }
      onSuccess(res?.patient);
    } catch (err: any) {
      const errMsg = err?.message || err?.detail || "Invalid login credentials. Please try again.";
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)",
          padding: "32px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Back Link if invoked from Lock Screen */}
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
            }}
          >
            <ArrowLeft size={16} /> Back to Lock Screen
          </button>
        )}

        {/* Center Clinic Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <img
            src={brandLogo}
            alt="Heal Your Heart"
            style={{ height: 64, maxWidth: "85%", objectFit: "contain" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/HYH.png";
            }}
          />
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              margin: "12px 0 4px 0",
              textAlign: "center",
            }}
          >
            {brandName}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: 0,
              textAlign: "center",
            }}
          >
            Patient Portal & Mobile Health Record
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
              color: "#B91C1C",
              fontSize: 13,
              lineHeight: 1.4,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              Email Address / Patient ID
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. patient@example.com or HYN-MR-000207"
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
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
              Password (or 6-Digit ID)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password or 6-digit Patient ID"
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 40px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <KeyRound
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
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "13px 0",
              fontSize: 15,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              marginTop: 6,
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              transition: "background 0.15s ease",
            }}
          >
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Helpful instructions for first-time login */}
        <div
          style={{
            marginTop: 22,
            padding: "12px 14px",
            background: "#F0FDF4",
            border: "1px solid #DCFCE7",
            borderRadius: 8,
            fontSize: 12,
            color: "#166534",
            lineHeight: 1.45,
          }}
        >
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <ShieldCheck size={14} color="#16a34a" /> First Time Logging In?
          </div>
          Your temporary password is your <strong>6-digit Patient ID</strong> (e.g. <code>000207</code>) assigned by the clinic. You can change your password anytime after logging in.
        </div>

        {/* Demo Fast Login Button */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setEmail("hariharan.s@example.com");
              setPassword("000007");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Fill Demo Credentials (Hariharan S)
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
        Heal Your Heart — Vaso-Meditech (EECP Center) · Secure HIPAA-Compliant Portal
      </div>
    </div>
  );
}
