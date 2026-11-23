import React, { useState } from "react";
import {
  Heart,
  Activity,
  Shield,
  Users,
  Calendar,
  ClipboardList,
  FlaskConical,
  Pill,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  MapPin,
  Building,
  ChevronRight,
  Clock,
  Layers,
  Award,
  FileCheck,
  Stethoscope,
  LogIn,
  UserPlus,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { HealYourHeartLogo } from "./HealYourHeartLogo";
import { HeroRibbonBackground } from "./HeroRibbonBackground";
import { navigate, api, setSession } from "./api";

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState("doctor@demo.local");
  const [staffPassword, setStaffPassword] = useState("password123");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const r = await api("/auth/login", "POST", { email: staffEmail, password: staffPassword });
      setSession(r.csrf, r.facility_id || "");
      window.dispatchEvent(new CustomEvent("hyh_auth_change"));
      navigate("/home");
    } catch (err: any) {
      setLoginError(err?.message || "Sign in failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const roleProfiles = [
    {
      role: "Cardiologists & Physicians",
      description: "Full clinical access to patient histories, SOAP encounter notes, lab evaluations, e-prescriptions, and EECP progress reviews.",
      features: ["Custom cardiac templates", "Real-time vitals & ECG review", "Multi-analyte lab trend charts", "E-Prescription & drug interactions"],
      color: "#0d9488",
    },
    {
      role: "EECP Therapists & Technicians",
      description: "Dedicated interfaces for managing treatment courses, cuff pressures, session durations, and patient pre/post treatment observations.",
      features: ["35-Session course checklists", "Diastolic augmentation logs", "Adverse event monitoring", "Daily tolerance ratings"],
      color: "#ea580c",
    },
    {
      role: "Front Desk & Receptionists",
      description: "Fast patient registration, appointment booking by doctor and EECP bed, waiting room queue management, and SMS confirmations.",
      features: ["Instant duplicate detection", "Resource & room calendar", "Appointment lifecycle tracking", "Multi-facility search"],
      color: "#0284c7",
    },
    {
      role: "Diagnostic & Lab Technicians",
      description: "Specimen collection tracking, batch results entry, reference range alarms, and digital sign-off workflows.",
      features: ["Order barcode & specimen labels", "Multi-parameter result entry", "Out-of-range critical alerts", "Lab test catalog management"],
      color: "#7c3aed",
    },
    {
      role: "Practice Administrators & Accounts",
      description: "Granular staff role management, facility configuration, SAC code billing, payment installments, and immutable audit logs.",
      features: ["13 Pre-configured clinical roles", "Soft-delete staff deactivation", "SAC 999312 GST invoices", "Comprehensive audit trails"],
      color: "#059669",
    },
  ];

  return (
    <div className="hyh-landing-container" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1e293b", backgroundColor: "#ffffff" }}>
      <style>{`
        @keyframes heroFadeSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes heroDoctorReveal {
          0% {
            opacity: 0;
            transform: translateY(26px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .hyh-animate-hero-brand {
          animation: heroFadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
        }
        .hyh-animate-hero-text {
          animation: heroFadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both;
        }
        .hyh-animate-hero-buttons {
          animation: heroFadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.36s both;
        }
        .hyh-animate-hero-doctor {
          animation: heroDoctorReveal 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hyh-animate-hero-brand,
          .hyh-animate-hero-text,
          .hyh-animate-hero-buttons,
          .hyh-animate-hero-doctor {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        .hyh-header {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 18px 24px 18px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          position: relative;
          z-index: 10;
          background: transparent;
        }
        .hyh-nav-left {
          display: flex;
          align-items: center;
        }
        .hyh-nav-center {
          display: flex;
          align-items: center;
          margin-left: auto;
          margin-right: 20px;
        }
        .hyh-nav-right {
          display: flex;
          align-items: center;
        }
        .hyh-desktop-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .hyh-desktop-nav a {
          text-decoration: none;
          color: #475569;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: -0.01em;
          transition: color 0.18s ease;
          white-space: nowrap;
          line-height: 1;
          display: inline-flex;
          align-items: center;
        }
        .hyh-desktop-nav a:hover {
          color: #0d9488;
        }
        .hyh-mobile-toggle-btn {
          display: none;
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 1100px) {
          .hyh-header {
            padding: 14px 18px !important;
          }
          .hyh-nav-center {
            margin-right: 8px !important;
          }
          .hyh-desktop-nav {
            gap: 18px !important;
          }
          .hyh-desktop-nav a {
            font-size: 13px !important;
          }
        }
        @media (max-width: 860px) {
          .hyh-desktop-nav {
            display: none !important;
          }
          .hyh-mobile-toggle-btn {
            display: flex !important;
          }
        }
        @media (max-width: 960px) {
          .hyh-hero-two-column-container {
            flex-direction: column !important;
            gap: 36px !important;
            padding: 24px 20px 40px !important;
            text-align: left !important;
          }
          .hyh-hero-left-column {
            max-width: 100% !important;
            width: 100% !important;
            align-items: flex-start !important;
            text-align: left !important;
          }
          .hyh-hero-right-column {
            max-width: 440px !important;
            width: 100% !important;
          }
          .hyh-hero-doctor-img {
            max-width: 380px !important;
            max-height: 440px !important;
          }
        }
        @media (max-width: 640px) {
          .hyh-header {
            padding: 12px 16px !important;
          }
          .hyh-header .hyh-logo-lockup img {
            height: 30px !important;
          }
          .hyh-header .hyh-logo-lockup span {
            font-size: 15px !important;
          }
          .hyh-hero-two-column-container {
            padding: 18px 16px 32px !important;
            gap: 24px !important;
          }
          .hyh-hero-doctor-img {
            max-width: 300px !important;
            max-height: 350px !important;
          }
          .hyh-hero-logo-img {
            max-width: 280px !important;
          }
        }
      `}</style>
      {/* =========================================================================
          CRITICAL FIRST VIEWPORT: LOGO & AUTHENTICATION BUTTONS
          Visible immediately on load without requiring any scrolling!
          ========================================================================= */}
      <section
        id="first-viewport"
        data-testid="first-viewport"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 80%)",
          borderBottom: "1px solid #e2e8f0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated Curved Ribbon Background (Vector Inspired by Reference Image 2) */}
        <HeroRibbonBackground />

        {/* Header / Navigation Bar: Balanced Layout with Branding Shifted Left, Links Shifted Right */}
        <header className="hyh-header">
          {/* Left: Branding Group (Emblem + Heal Your Heart EHR wordmark) */}
          <div className="hyh-nav-left" data-testid="nav-left-branding">
            <HealYourHeartLogo size="nav" clickable={true} />
          </div>

          {/* Centre: Navigation Links */}
          <div className="hyh-nav-center" data-testid="nav-center-links">
            <nav className="hyh-desktop-nav" aria-label="Main Navigation">
              <a href="#about" data-testid="nav-link-about">About Us</a>
              <a href="#angiogenesis" data-testid="nav-link-angiogenesis">EECP Mechanism</a>
              <a href="#treatment" data-testid="nav-link-treatment">EECP Therapy</a>
              <a href="#platform" data-testid="nav-link-platform">Platform</a>
              <a href="#roles" data-testid="nav-link-roles">Clinical Roles</a>
              <a href="#contact" data-testid="nav-link-contact">Contact Us</a>
            </nav>
          </div>

          {/* Right: Clean anchor & Mobile Toggle (No Access EHR Button) */}
          <div className="hyh-nav-right" data-testid="nav-right-actions">
            <button
              type="button"
              className="hyh-mobile-toggle-btn"
              data-testid="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            data-testid="mobile-nav-menu"
            style={{
              position: "relative",
              zIndex: 20,
              backgroundColor: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#334155", fontWeight: 600, fontSize: "15px" }}
            >
              About Us
            </a>
            <a
              href="#angiogenesis"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#334155", fontWeight: 600, fontSize: "15px" }}
            >
              EECP Mechanism
            </a>
            <a
              href="#treatment"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#334155", fontWeight: 600, fontSize: "15px" }}
            >
              EECP Therapy
            </a>
            <a
              href="#platform"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#334155", fontWeight: 600, fontSize: "15px" }}
            >
              Platform
            </a>
            <a
              href="#roles"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#334155", fontWeight: 600, fontSize: "15px" }}
            >
              Clinical Roles
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: "none", color: "#0d9488", fontWeight: 700, fontSize: "15px" }}
            >
              Contact Us
            </a>
          </div>
        )}

        {/* Two-Column First Viewport Hero Content Container */}
        <div
          data-testid="hero-viewport-container"
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            width: "100%",
            overflow: "hidden",
          }}
        >
          {/* Centered Responsive Content Container (Above Ribbon Background) */}
          <div
            className="hyh-hero-two-column-container"
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "1300px",
              width: "100%",
              margin: "0 auto",
              padding: "24px 24px 44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "48px",
              boxSizing: "border-box",
            }}
          >
            {/* Left Column: ~54% width, Left-Aligned */}
            <div
              className="hyh-hero-left-column"
              data-testid="hero-left-column"
              style={{
                flex: "1 1 54%",
                maxWidth: "600px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                boxSizing: "border-box",
              }}
            >
              {/* Complete Original Heal Your Heart Artwork with Integrated EHR Wordmark (Enlarged by ~10%) */}
              <div
                data-testid="first-viewport-logo-container"
                className="hyh-animate-hero-brand"
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  position: "relative",
                  maxWidth: "100%",
                  marginBottom: "20px",
                }}
              >
                <img
                  src="/images/hyh_logo_ehr.png"
                  alt="Heal Your Heart EHR"
                  data-testid="hero-original-logo"
                  className="hyh-hero-logo-img"
                  style={{
                    width: "100%",
                    maxWidth: "485px",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
                {/* Accessible product designation element for screen readers & Playwright */}
                <span
                  data-testid="first-viewport-wordmark"
                  style={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    padding: 0,
                    margin: "-1px",
                    overflow: "hidden",
                    clip: "rect(0, 0, 0, 0)",
                    whiteSpace: "nowrap",
                    borderWidth: 0,
                  }}
                >
                  Heal Your Heart EHR
                </span>
              </div>

              {/* Supporting Clinical Text */}
              <p
                data-testid="hero-supporting-text"
                className="hyh-animate-hero-text"
                style={{
                  fontSize: "16px",
                  lineHeight: "1.65",
                  color: "#334155",
                  margin: "0 0 28px 0",
                  fontWeight: 500,
                  maxWidth: "530px",
                  textAlign: "left",
                }}
              >
                Specialized Electronic Health Record and non-invasive cardiovascular care management platform. Seamlessly unifying patient charting, diagnostic telemetry, and EECP counterpulsation protocols across our clinical network.
              </p>

              {/* Authentication Buttons (Horizontally Aligned, Moderately Larger, Shifted Right) */}
              <div
                data-testid="first-viewport-auth-buttons"
                className="hyh-animate-hero-buttons"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "18px",
                  flexWrap: "wrap",
                  marginLeft: "10px",
                }}
              >
                <button
                  type="button"
                  data-testid="first-viewport-signin-btn"
                  onClick={() => navigate("/login")}
                  style={{
                    backgroundColor: "#0d9488",
                    color: "#ffffff",
                    border: "2px solid #0d9488",
                    borderRadius: "9px",
                    padding: "14px 40px",
                    fontWeight: 700,
                    fontSize: "16px",
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(13, 148, 136, 0.24)",
                    transition: "all 0.2s ease",
                    minWidth: "155px",
                    height: "52px",
                    boxSizing: "border-box",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Sign In
                </button>

                <button
                  type="button"
                  data-testid="first-viewport-signup-btn"
                  onClick={() => navigate("/signup")}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0d9488",
                    border: "2px solid #0d9488",
                    borderRadius: "9px",
                    padding: "14px 40px",
                    fontWeight: 700,
                    fontSize: "16px",
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.2s ease",
                    minWidth: "155px",
                    height: "52px",
                    boxSizing: "border-box",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Right Column: ~44% width, Approved Transparent Doctor Photograph */}
            <div
              className="hyh-hero-right-column hyh-animate-hero-doctor"
              data-testid="hero-right-column"
              style={{
                flex: "1 1 44%",
                maxWidth: "480px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                boxSizing: "border-box",
                position: "relative",
                zIndex: 2,
              }}
            >
              <img
                src="/images/doctor_hero.png"
                alt="Dr. S. Ramasamy - Heal Your Heart EHR"
                data-testid="hero-doctor-photo"
                className="hyh-hero-doctor-img"
                style={{
                  width: "100%",
                  maxWidth: "440px",
                  maxHeight: "500px",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  filter: "drop-shadow(0 14px 28px rgba(13, 148, 136, 0.12))",
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom spacer for balanced viewport */}
        <div style={{ height: "32px" }} />
      </section>

      {/* =========================================================================
          SECTION 2: ABOUT HEAL YOUR HEART & MEDICAL LEADERSHIP
          Using Photograph: leadership_clean.jpg
          ========================================================================= */}
      <section
        id="about"
        style={{
          padding: "80px 24px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Visual Column: Leadership Photo */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)",
                border: "4px solid #ffffff",
                maxWidth: "520px",
              }}
            >
              <img
                src="/images/leadership_clean.jpg"
                alt="Heal Your Heart Medical Leadership - 30 EECP Treatment Centres"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>

          {/* Narrative Column */}
          <div>
            <span
              style={{
                backgroundColor: "#ffedd5",
                color: "#c2410c",
                padding: "4px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Our Organisation
            </span>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: "#0f172a",
                marginTop: "12px",
                marginBottom: "16px",
                lineHeight: 1.25,
              }}
            >
              Pioneering Non-Invasive Cardiovascular Medicine
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "16px" }}>
              <strong>Heal Your Heart</strong> is the specialized clinical healthcare division of{" "}
              <strong>Vaso-Meditech Private Limited</strong>, headquartered in Chennai, India.
              As India's pre-eminent pioneer in <strong>Enhanced External Counterpulsation (EECP)</strong>,
              Heal Your Heart has treated thousands of patients suffering from refractory angina, coronary artery disease,
              and congestive heart failure.
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "24px" }}>
              To uphold clinical accuracy, regulatory compliance, and multi-facility synchronization,
              the <strong>Heal Your Heart EHR</strong> platform was engineered from the ground up to support the complex,
              longitudinal data models unique to counterpulsation protocols and cardiology practices.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={18} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>30+ Treatment Centres</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Multi-branch unified patient records</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={18} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Non-Surgical Focus</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Diastolic augmentation protocols</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={18} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Physician Led</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Evidence-based cardiology guidelines</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle2 size={18} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Seamless Continuity</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>From initial visit to 35-session discharge</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: EDUCATIONAL VISUAL – COLLATERAL CIRCULATION & ANGIOGENESIS
          Using Visual: angiogenesis_clean.jpg
          ========================================================================= */}
      <section
        id="angiogenesis"
        style={{
          padding: "80px 24px",
          backgroundColor: "#fdf8f6",
          borderTop: "1px solid #fed7aa",
          borderBottom: "1px solid #fed7aa",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Visual Column: Angiogenesis Diagram */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                maxWidth: "540px",
              }}
            >
              <img
                src="/images/angiogenesis_clean.jpg"
                alt="Before EECP Treatment vs After EECP Treatment - Multiple Natural Bypass (Angiogenesis)"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* Narrative Column */}
          <div>
            <span
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: "4px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Physiological Mechanism
            </span>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: "#0f172a",
                marginTop: "12px",
                marginBottom: "16px",
                lineHeight: 1.25,
              }}
            >
              Multiple Natural Bypass Through Angiogenesis
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "16px" }}>
              How does EECP restore heart muscle vitality without surgery?
              The increased retrograde blood flow and pulsatile shear stress created during EECP trigger
              endothelial cells to release <strong>Vascular Endothelial Growth Factor (VEGF)</strong> and
              <strong>Nitric Oxide (NO)</strong>.
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "20px" }}>
              This biological signal recruits dormant micro-vessels and stimulates new collateral blood channels around
              blocked coronary arteries — functioning as a <strong>natural biological bypass</strong> that replenishes ischemic
              regions of the myocardium.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Increased Endothelial Shear Stress</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Pulsatile diastolic augmentation stimulates vessel walls</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Growth Factor Expression (VEGF, bFGF)</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Signals activation of dormant collateral networks</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", fontWeight: 700, fontSize: "12px", flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Long-Term Symptom Relief</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Reduced angina episodes and improved exercise tolerance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: EECP TREATMENT – NON-INVASIVE CARDIAC CARE
          Using Photograph: eecp_treatment_clean.jpg
          ========================================================================= */}
      <section
        id="treatment"
        style={{
          padding: "80px 24px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Narrative Column */}
          <div>
            <span
              style={{
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                padding: "4px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Treatment Technology
            </span>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: "#0f172a",
                marginTop: "12px",
                marginBottom: "16px",
                lineHeight: 1.25,
              }}
            >
              Heart Treatment Without Surgery · EECP Therapy
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "16px" }}>
              <strong>Enhanced External Counterpulsation (EECP)</strong> is a US FDA-cleared, non-invasive outpatient therapy
              for patients with angina, coronary blockages, and ischemic heart disease who are not candidates for or wish to avoid
              coronary artery bypass grafting (CABG) or angioplasty (stents).
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", marginBottom: "20px" }}>
              During treatment, high-pressure pneumatic cuffs are wrapped around the patient's calves, lower thighs, and upper thighs.
              Synchronized precisely with the patient's cardiac cycle (ECG R-wave), the cuffs inflate sequentially in early diastole to push
              oxygenated blood back toward the heart, increasing coronary perfusion and decreasing cardiac workload in systole.
            </p>

            <div
              style={{
                backgroundColor: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: "12px",
                padding: "16px",
                fontSize: "14px",
                color: "#0f766e",
                lineHeight: 1.6,
              }}
            >
              <strong>Standard Protocol:</strong> 35 one-hour sessions administered 5 to 6 days per week over 7 weeks.
              Every session's cuff pressures, pre- and post-session vitals, and functional symptoms are monitored and stored in Heal Your Heart EHR.
            </div>
          </div>

          {/* Visual Column: Clinical Treatment Photo */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)",
                border: "4px solid #ffffff",
                maxWidth: "500px",
              }}
            >
              <img
                src="/images/eecp_treatment_clean.jpg"
                alt="Heart Treatment Without Surgery - EECP Treatment in Action"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: EHR PLATFORM FEATURES GRID
          ========================================================================= */}
      <section
        id="platform"
        style={{
          padding: "80px 24px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <span
            style={{
              backgroundColor: "#ccfbf1",
              color: "#0f766e",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Core Modules
          </span>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "12px",
              marginBottom: "12px",
            }}
          >
            Built for High-Precision Cardiology Practice Management
          </h2>
          <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "700px", margin: "0 auto" }}>
            Every module in Heal Your Heart EHR is deeply integrated, ensuring data entered in one department flows smoothly across the entire care team.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Card 1 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d9488", marginBottom: "16px" }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Patient Demographics &amp; MRN</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Centralized patient registration with instant duplicate checks, branch assignments, QRDA I clinical import, and CSV batch onboarding.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c", marginBottom: "16px" }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Bed &amp; Resource Scheduling</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Granular calendar for doctor consultations and individual EECP treatment beds (e.g. EECP Room 01 to 13) with conflict prevention.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", marginBottom: "16px" }}>
              <ClipboardList size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Clinical SOAP Documentation</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Subjective, Objective, Assessment, and Plan notes with cardiology templates, pulse wave velocity tracking, and digital clinician signature.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", marginBottom: "16px" }}>
              <FlaskConical size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Diagnostic Lab Ingestion</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Dedicated lab order creation, specimen labelling, multi-parameter lab result import, and instant longitudinal trend plots.
            </p>
          </div>

          {/* Card 5 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#fdf2f8", display: "flex", alignItems: "center", justifyContent: "center", color: "#db2777", marginBottom: "16px" }}>
              <Pill size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>E-Prescriptions &amp; Drugs</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Comprehensive cardiac pharmacotherapy records, dosage guidelines, refill tracking, and clinical consumable dispensing.
            </p>
          </div>

          {/* Card 6 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626", marginBottom: "16px" }}>
              <Heart size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>35-Session EECP Tracker</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Specialized counterpulsation logbook recording session numbers, applied cuff pressures, patient tolerance, and weekly cardiologist reviews.
            </p>
          </div>

          {/* Card 7 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", marginBottom: "16px" }}>
              <Building size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Inventory &amp; Supplies</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Track EECP patient treatment kits, cuffs, bladder sets, disposable electrodes, and emergency medical stock across facilities.
            </p>
          </div>

          {/* Card 8 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", marginBottom: "16px" }}>
              <FileCheck size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>Billing &amp; SAC Invoicing</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              Indian SAC 999312 compliant healthcare invoicing, EECP 35-session package billing, installment payments, and official receipts.
            </p>
          </div>

          {/* Card 9 */}
          <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", marginBottom: "16px" }}>
              <Shield size={22} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>RBAC &amp; Audit Trail</h3>
            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
              13 predefined staff roles, strict least-privilege view enforcement, session timeouts, and immutable audit logs for every clinical action.
            </p>
          </div>
        </div>
      </section>



      {/* =========================================================================
          SECTION 8: WORKFLOWS BUILT FOR HEALTHCARE PROFESSIONALS
          ========================================================================= */}
      <section
        id="roles"
        style={{
          padding: "80px 24px",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <span
            style={{
              backgroundColor: "#fef3c7",
              color: "#b45309",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Clinical Perspectives
          </span>
          <h2
            style={{
              fontSize: "32px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "12px",
              marginBottom: "12px",
            }}
          >
            Tailored Experiences for Every Care Team Member
          </h2>
          <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "680px", margin: "0 auto" }}>
            Least-privilege role boundaries protect patient confidentiality while giving every specialist exactly the tools they need.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {roleProfiles.map((p, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#ffffff",
                padding: "28px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                borderTop: `4px solid ${p.color}`,
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.03)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>{p.role}</h3>
              <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6, marginBottom: "20px" }}>{p.description}</p>
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  Key Capabilities:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {p.features.map((feat, fidx) => (
                    <div key={fidx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569" }}>
                      <CheckCircle2 size={14} color={p.color} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: SECURITY, PRIVACY & COMPLIANCE
          ========================================================================= */}
      <section
        id="security"
        style={{
          padding: "80px 24px",
          backgroundColor: "#0f172a",
          color: "#ffffff",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span
              style={{
                backgroundColor: "rgba(13, 148, 136, 0.2)",
                color: "#2dd4bf",
                padding: "4px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Security &amp; Data Protection
            </span>
            <h2
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: "#ffffff",
                marginTop: "12px",
                marginBottom: "12px",
              }}
            >
              Clinical Governance &amp; Regulatory Protection
            </h2>
            <p style={{ fontSize: "16px", color: "#94a3b8", maxWidth: "680px", margin: "0 auto" }}>
              Designed to satisfy the highest standards of healthcare privacy, confidentiality, and technical safety.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "28px",
            }}
          >
            <div style={{ backgroundColor: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
              <Lock size={26} color="#2dd4bf" style={{ marginBottom: "16px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Role-Based Access Control</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
                13 distinct clinical and administrative roles. Users can only read and modify data necessary for their clinical duty.
              </p>
            </div>

            <div style={{ backgroundColor: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
              <FileCheck size={26} color="#2dd4bf" style={{ marginBottom: "16px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>Immutable Audit Trail</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
                Every clinical record creation, chart sign-off, amendment, and deactivation is logged with user ID, timestamp, and entity reference.
              </p>
            </div>

            <div style={{ backgroundColor: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
              <Shield size={26} color="#2dd4bf" style={{ marginBottom: "16px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "10px" }}>OTP-Verified Credential Reset</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: 1.6 }}>
                Short-lived, single-use 6-digit OTP verification codes via registered email or SMS prevent unauthorized account takeovers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: FINAL CALL TO ACTION
          ========================================================================= */}
      <section
        style={{
          padding: "80px 24px",
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 38px)",
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: "16px",
            }}
          >
            Advancing Cardiac Care Through Connected Healthcare Technology
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "#ccfbf1",
              lineHeight: 1.7,
              marginBottom: "36px",
            }}
          >
            Access the official Heal Your Heart EHR platform. Authorized clinical staff can sign in directly,
            or request new practice onboarding credentials.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                backgroundColor: "#ffffff",
                color: "#0f766e",
                border: "none",
                borderRadius: "10px",
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
              }}
            >
              <LogIn size={20} />
              <span>Sign In to Your Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/signup")}
              style={{
                backgroundColor: "transparent",
                color: "#ffffff",
                border: "2px solid #ffffff",
                borderRadius: "10px",
                padding: "13px 28px",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <UserPlus size={20} />
              <span>Request Staff Access</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: ENTERPRISE FOOTER
          ========================================================================= */}
      <footer
        id="contact"
        style={{
          backgroundColor: "#020617",
          color: "#94a3b8",
          padding: "64px 24px 32px",
          borderTop: "1px solid #1e293b",
          fontSize: "13px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "40px",
            marginBottom: "48px",
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#2dd4bf" }}>Heal Your</span>
                <span style={{ color: "#f87171" }}>Heart</span>
                <span style={{ backgroundColor: "#2dd4bf", color: "#0f172a", padding: "1px 6px", borderRadius: 4, fontSize: "14px" }}>
                  EHR
                </span>
              </div>
            </div>
            <p style={{ lineHeight: 1.6, color: "#64748b", marginBottom: "16px" }}>
              Vasomeditech (EECP Center) · A unit of Vaso-Meditech Private Limited.
              Pioneering non-invasive cardiovascular and counterpulsation care across India.
            </p>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Registered Office: Chennai, Tamil Nadu, India.
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>Quick Access</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a href="#about" style={{ color: "#94a3b8", textDecoration: "none" }}>About Heal Your Heart</a>
              <a href="#treatment" style={{ color: "#94a3b8", textDecoration: "none" }}>EECP Counterpulsation Therapy</a>
              <a href="#angiogenesis" style={{ color: "#94a3b8", textDecoration: "none" }}>Collateral Angiogenesis Visual</a>
              <a href="#platform" style={{ color: "#94a3b8", textDecoration: "none" }}>EHR Platform Modules</a>
              <a href="#roles" style={{ color: "#94a3b8", textDecoration: "none" }}>Clinical Role Perspectives</a>
            </div>
          </div>

          {/* Clinical Support & Contact */}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>Practice Locations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", color: "#94a3b8" }}>
              <div>• Neelankarai Central Facility (Chennai)</div>
              <div>• Royapettah Branch (Chennai)</div>
              <div>• Manapakkam Branch (Chennai)</div>
              <div>• Tirunelveli Diagnostic Center</div>
              <div>• Madurai Regional Center</div>
              <div style={{ fontSize: "12px", color: "#2dd4bf", marginTop: 4 }}>+ 25 additional centres across India</div>
            </div>
          </div>

          {/* Security & Access */}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>Staff Portal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  backgroundColor: "#1e293b",
                  color: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <LogIn size={14} color="#2dd4bf" />
                <span>Clinical Staff Login</span>
              </button>

              {/* Quick Staff Sign-In form */}
              <form onSubmit={handleStaffLogin} style={{ marginTop: "4px" }}>
                <div style={{ marginBottom: "6px" }}>
                  <label htmlFor="landing-staff-email" style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
                    Staff email
                  </label>
                  <input
                    id="landing-staff-email"
                    aria-label="Staff email"
                    type="email"
                    autoComplete="username"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="doctor@demo.local"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #334155",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label htmlFor="landing-staff-password" style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
                    Password
                  </label>
                  <input
                    id="landing-staff-password"
                    aria-label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="password123"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #334155",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>
                {loginError && (
                  <div style={{ color: "#f87171", fontSize: "11px", marginBottom: "6px" }}>
                    {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  aria-label="Sign in to workspace"
                  disabled={loggingIn}
                  style={{
                    width: "100%",
                    backgroundColor: "#0d9488",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: loggingIn ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <LogIn size={13} />
                  <span>Sign in to workspace</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  border: "none",
                  padding: "4px 0",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Reset Password with OTP →
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Disclaimer & Copyright */}
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            borderTop: "1px solid #1e293b",
            paddingTop: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            textAlign: "center",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <div>
            <strong>Medical Notice:</strong> Heal Your Heart EHR is a clinical electronic health record platform for healthcare providers.
            For acute cardiac emergencies, severe chest pain, or sudden shortness of breath, please immediately call 108 or report to the nearest hospital casualty department.
          </div>
          <div>
            © {new Date().getFullYear()} Heal Your Heart · Vaso-Meditech Private Limited. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
