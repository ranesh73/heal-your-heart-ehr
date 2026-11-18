import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Lock, KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api, navigate } from "./api";
import { HealYourHeartLogo } from "./HealYourHeartLogo";

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("doctor@demo.local");
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await api("/auth/request-otp", "POST", {
        identifier: identifier.trim(),
      });
      setInfo(res.message || "Verification code sent.");
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp);
      }
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP for this identifier.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await api("/auth/verify-otp-reset", "POST", {
        identifier: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      setInfo(res.message || "Password updated successfully.");
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Verify the code and try again.");
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
      {/* Header */}
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
          onClick={() => navigate("/login")}
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
          <span>Back to Sign In</span>
        </button>
      </header>

      {/* Main Form */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 16px",
        }}
      >
        <div
          data-testid="forgot-password-card"
          style={{
            backgroundColor: "#ffffff",
            width: "100%",
            maxWidth: "460px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0",
            padding: "36px 32px",
          }}
        >
          {step === "request" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    backgroundColor: "#f0fdfa",
                    color: "#0d9488",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px auto",
                  }}
                >
                  <KeyRound size={24} />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
                  Reset Your Password
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                  Enter your registered email address or mobile number to receive a secure 6-digit OTP code.
                </p>
              </div>

              {error && (
                <div
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
                    Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    data-testid="forgot-password-identifier-input"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. doctor@demo.local or 9003078282"
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
                  data-testid="forgot-password-request-otp-btn"
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
                  {loading ? "Sending Code…" : "Send Verification Code"}
                </button>
              </form>
            </div>
          )}

          {step === "verify" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
                  Enter Verification Code
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                  A 6-digit code has been dispatched to <strong>{identifier}</strong>.
                </p>
              </div>

              {devOtp && (
                <div
                  style={{
                    backgroundColor: "#f0fdfa",
                    border: "1px solid #99f6e4",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "#0f766e",
                    textAlign: "center",
                  }}
                >
                  Verification Code: <strong style={{ letterSpacing: 2 }}>{devOtp}</strong>
                </div>
              )}

              {error && (
                <div
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

              <form onSubmit={handleVerifyReset}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    data-testid="forgot-password-otp-input"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
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

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      data-testid="forgot-password-new-pw-input"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 40px 10px 14px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "11px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    data-testid="forgot-password-confirm-pw-input"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
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
                  data-testid="forgot-password-submit-btn"
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
                  {loading ? "Updating Password…" : "Update Password & Continue"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("request")}
                  style={{
                    width: "100%",
                    backgroundColor: "transparent",
                    color: "#64748b",
                    border: "none",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  ← Resend code or change contact
                </button>
              </form>
            </div>
          )}

          {step === "done" && (
            <div data-testid="forgot-password-done-view" style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  backgroundColor: "#ccfbf1",
                  color: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>
                Password Updated Successfully
              </h2>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "24px" }}>
                Your account password has been updated. You can now sign in using your new credentials.
              </p>
              <button
                type="button"
                data-testid="forgot-password-back-login-btn"
                onClick={() => navigate("/login")}
                style={{
                  width: "100%",
                  backgroundColor: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In With New Password
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "16px 24px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
        © {new Date().getFullYear()} Heal Your Heart · Vaso-Meditech Private Limited.
      </footer>
    </div>
  );
}
