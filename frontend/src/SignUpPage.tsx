import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Building, User, Mail, Phone, Lock, Stethoscope, AlertCircle } from "lucide-react";
import { api, navigate } from "./api";
import { HealYourHeartLogo } from "./HealYourHeartLogo";

export function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [practiceName, setPracticeName] = useState("Heal Your Heart EECP Centre");
  const [specialty, setSpecialty] = useState("Cardiology / EECP Non-Invasive");
  const [requestedRole, setRequestedRole] = useState("Physician");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api("/auth/signup-request", "POST", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        practice_name: practiceName.trim(),
        specialty: specialty.trim(),
        notes: `Requested Role: ${requestedRole}`,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit registration request. Please try again.");
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
          <span>Already have an account? Sign In</span>
        </button>
      </header>

      {/* Main Container */}
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
          data-testid="signup-card"
          style={{
            backgroundColor: "#ffffff",
            width: "100%",
            maxWidth: "600px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0",
            padding: "36px 36px",
          }}
        >
          {submitted ? (
            /* Success State */
            <div data-testid="signup-success-view" style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: "#ccfbf1",
                  color: "#0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px auto",
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "12px" }}>
                Staff Access Request Received
              </h2>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#475569", marginBottom: "24px" }}>
                Thank you, <strong>{firstName} {lastName}</strong>. Your onboarding registration for{" "}
                <strong>{practiceName}</strong> has been forwarded to the practice administrator. 
                You will receive confirmation at <strong>{email}</strong> once your facility permissions are verified and activated.
              </p>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "28px",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "#64748b",
                }}
              >
                <div>• Role Requested: <strong>{requestedRole}</strong></div>
                <div>• Contact Phone: <strong>+91 {phone}</strong></div>
                <div>• Practice Facility: <strong>{practiceName}</strong></div>
              </div>
              <button
                type="button"
                data-testid="signup-back-to-login-btn"
                onClick={() => navigate("/login")}
                style={{
                  backgroundColor: "#0d9488",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 28px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            /* Registration Form */
            <div>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                  Staff Onboarding &amp; Practice Registration
                </h2>
                <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                  Heal Your Heart EHR · Vaso-Meditech Clinical Practice Portal
                </p>
              </div>

              {/* Private Organization Restriction Notice */}
              <div
                style={{
                  backgroundColor: "#f0fdfa",
                  border: "1px solid #99f6e4",
                  borderRadius: "10px",
                  padding: "14px",
                  marginBottom: "24px",
                  fontSize: "13px",
                  color: "#0f766e",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: 10,
                }}
              >
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Organizational Access Notice:</strong> Heal Your Heart EHR is a restricted clinical platform. 
                  Registrations create an onboarding request subject to practice administrator authorization and facility assignment.
                </div>
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

              <form onSubmit={handleSubmit}>
                {/* Name Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      First Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="signup-first-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Arun"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      Last Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="signup-last-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Kumar"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Email & Mobile */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      Work Email <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="email"
                      data-testid="signup-email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="arun@healyourheart.in"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      Mobile Number <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          padding: "10px 10px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        +91
                      </span>
                      <input
                        type="text"
                        data-testid="signup-phone"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9840123456"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "14px",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Practice & Specialty */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      Practice Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      data-testid="signup-practice"
                      required
                      value={practiceName}
                      onChange={(e) => setPracticeName(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Role Requested */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                    Requested Clinical Role <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="Physician">Physician / Cardiologist</option>
                    <option value="Physician Assistant">Physician Assistant</option>
                    <option value="Therapist">EECP Therapist</option>
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Receptionist">Front Desk / Receptionist</option>
                    <option value="Chartered Accountant">Chartered Accountant / Billing</option>
                    <option value="Clinic Administrator">Clinic Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  data-testid="signup-submit-btn"
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
                    boxShadow: "0 2px 4px rgba(13, 148, 136, 0.2)",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Submitting Request…" : "Submit Access Request"}
                </button>
              </form>

              <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#0d9488",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Sign In to EHR
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "16px 24px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
        © {new Date().getFullYear()} Heal Your Heart · Vaso-Meditech Private Limited. All Rights Reserved.
      </footer>
    </div>
  );
}
