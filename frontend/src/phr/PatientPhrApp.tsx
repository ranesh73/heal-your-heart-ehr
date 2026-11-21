import React, { useState, useEffect } from "react";
import {
  Home,
  Activity,
  Plus,
  Bell,
  Megaphone,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Pill,
  Lock,
  X,
} from "lucide-react";
import { phrApi, getPhrToken, clearPhrToken } from "./phrApi";
import { PhrLockScreen } from "./PhrLockScreen";
import { PhrDashboardTab } from "./PhrDashboardTab";
import { PhrMyHealthTab } from "./PhrMyHealthTab";
import { PhrAppointmentRequestModal } from "./PhrAppointmentRequestModal";
import { PhrMessagesModal } from "./PhrMessagesModal";
import { PhrDocumentUploadModal } from "./PhrDocumentUploadModal";
import { PhrRefillModal } from "./PhrRefillModal";
import { PhrClinicalRecordsModal } from "./PhrClinicalRecordsModal";
import { PhrProfileModal } from "./PhrProfileModal";
import { PhrAnnouncementsModal } from "./PhrAnnouncementsModal";
import { PhrUsefulInfoModal } from "./PhrUsefulInfoModal";
import { PhrImagesModal } from "./PhrImagesModal";

interface PatientPhrAppProps {
  path?: string;
}

export function PatientPhrApp({ path }: PatientPhrAppProps) {
  // Lock state
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "my-health">("dashboard");

  // Portal Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState<number>(3);

  // Modals State
  const [modalAppointment, setModalAppointment] = useState<boolean>(false);
  const [modalMessages, setModalMessages] = useState<boolean>(false);
  const [modalUpload, setModalUpload] = useState<boolean>(false);
  const [modalRefills, setModalRefills] = useState<boolean>(false);
  const [modalClinical, setModalClinical] = useState<boolean>(false);
  const [clinicalInitialSection, setClinicalInitialSection] = useState<string>("Diagnoses");
  const [modalProfile, setModalProfile] = useState<boolean>(false);
  const [modalAnnouncements, setModalAnnouncements] = useState<boolean>(false);
  const [modalUsefulInfo, setModalUsefulInfo] = useState<boolean>(false);
  const [modalImages, setModalImages] = useState<boolean>(false);
  const [quickActionDrawer, setQuickActionDrawer] = useState<boolean>(false);

  // Load Patient and Dashboard Data
  const refreshData = async () => {
    try {
      // 1. Public config
      const conf = await phrApi("/public-config");
      setConfig(conf);

      // 2. Patient Profile
      const meData = await phrApi("/auth/me");
      if (meData?.patient) {
        setPatient(meData.patient);
      }

      // 3. Dashboard Vitals & Upcoming Visits
      const dash = await phrApi("/dashboard");
      if (dash) {
        setVitals(dash.vitals);
        setUpcomingAppointments(dash.upcoming_appointments || []);
      }
    } catch (e: any) {
      console.warn("Using offline / fallback demo patient data:", e);
      // Fallback demo data
      setPatient({
        first_name: "Hariharan",
        last_name: "S",
        mrn: "HYN-MR-000172",
        gender: "Male",
        phone: "+91 98400 12345",
        address: "No. 42, Beach Road, Neelankarai, Chennai - 600115",
        emergency_contact: "S. Sundaram (Father) - +91 98400 98765",
      });
      setVitals({
        weight_kg: 74.0,
        height_cm: 175.0,
        bp_sys: 122,
        bp_dia: 78,
        pulse_bpm: 72,
        bmi: "24.2 Normal",
        observed_at: new Date().toISOString(),
      });
      setUpcomingAppointments([
        {
          id: "appt-demo-1",
          facility_name: "Heal Your Heart Neelankarai - HUH001",
          provider_name: "Dr. Prem Sekar",
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          duration_minutes: 30,
          status: "Confirmed",
          reason: "Cardiology & EECP Consultation",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleLockApp = () => {
    setIsLocked(true);
  };

  const handleLogout = () => {
    clearPhrToken();
    setIsLocked(true);
  };

  const firstName = patient?.first_name || "Hariharan";
  const initials = `${(patient?.first_name || "H")[0]}${(patient?.last_name || "S")[0]}`.toUpperCase();

  // If locked, render official App Lock Screen
  if (isLocked) {
    return (
      <PhrLockScreen
        onUnlock={handleUnlock}
        brandName="Heal Your Heart PHR"
        brandLogo="/images/HYH.png"
      />
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#0f172a",
    }}>
      {/* Mobile Frame Container */}
      <div style={{
        maxWidth: 480,
        minHeight: "100vh",
        margin: "0 auto",
        background: "#ffffff",
        boxShadow: "0 0 25px rgba(0,0,0,0.06)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* PERSISTENT TOP HEADER */}
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Greeting */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>Welcome back,</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Hi {firstName}
              </h1>
            </div>
          </div>

          {/* Right Header Icons: Announcements Megaphone & Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Announcements Megaphone with Red Badge */}
            <button
              onClick={() => {
                setModalAnnouncements(true);
                setUnreadAnnouncementsCount(0);
              }}
              aria-label="Announcements"
              style={{
                position: "relative",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#1e293b",
              }}
            >
              <Megaphone size={19} />
              {unreadAnnouncementsCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: 10,
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #ffffff",
                }}>
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>

            {/* Avatar Initials Circle */}
            <button
              onClick={() => setModalProfile(true)}
              aria-label="Patient Profile"
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 5px rgba(37,99,235,0.2)",
              }}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* MAIN BODY VIEW */}
        <main style={{ flex: 1, padding: "18px 18px 40px 18px", overflowY: "auto" }}>
          {activeTab === "dashboard" ? (
            <PhrDashboardTab
              vitals={vitals}
              upcomingAppointments={upcomingAppointments}
              onOpenBookAppointment={() => setModalAppointment(true)}
              onOpenMessages={() => setModalMessages(true)}
              onOpenUpload={() => setModalUpload(true)}
              onOpenRefills={() => setModalRefills(true)}
              onOpenClinicalRecords={() => {
                setClinicalInitialSection("Vitals");
                setModalClinical(true);
              }}
              onNavigateTab={setActiveTab}
            />
          ) : (
            <PhrMyHealthTab
              onOpenAppointments={() => setModalAppointment(true)}
              onOpenMessages={() => setModalMessages(true)}
              onOpenQuestionnaire={() => {
                setClinicalInitialSection("Goals");
                setModalClinical(true);
              }}
              onOpenReminders={() => setModalAnnouncements(true)}
              onOpenWellness={() => {
                setClinicalInitialSection("Procedures");
                setModalClinical(true);
              }}
              onOpenShareSections={() => {
                setClinicalInitialSection("Diagnoses");
                setModalClinical(true);
              }}
              onOpenBilling={() => alert("Billing & Invoices: Zero balance due for active EECP cycle.")}
              onOpenDocuments={() => setModalUpload(true)}
              onOpenPrescriptions={() => setModalRefills(true)}
              onOpenLabs={() => {
                setClinicalInitialSection("Diagnoses");
                setModalClinical(true);
              }}
              onOpenImages={() => setModalImages(true)}
              onOpenUsefulInfo={() => setModalUsefulInfo(true)}
              onOpenAbout={() => setModalUsefulInfo(true)}
              customMenu={config?.custom_app_menu}
            />
          )}
        </main>

        {/* FLOATING BLUE '+' QUICK-ACTION BUTTON */}
        <button
          onClick={() => setQuickActionDrawer(true)}
          aria-label="Quick Actions"
          style={{
            position: "fixed",
            bottom: 74,
            right: "calc(50% - 215px)",
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(37,99,235,0.45)",
            cursor: "pointer",
            zIndex: 150,
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {/* BOTTOM TAB BAR (DASHBOARD | MY HEALTH) */}
        <nav style={{
          position: "sticky",
          bottom: 0,
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0 10px 0",
          zIndex: 100,
        }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              color: activeTab === "dashboard" ? "#2563eb" : "#94a3b8",
            }}
          >
            <Home size={22} strokeWidth={activeTab === "dashboard" ? 2.5 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === "dashboard" ? 700 : 500 }}>
              Dashboard
            </span>
          </button>

          <button
            onClick={() => setActiveTab("my-health")}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              cursor: "pointer",
              color: activeTab === "my-health" ? "#2563eb" : "#94a3b8",
            }}
          >
            <Activity size={22} strokeWidth={activeTab === "my-health" ? 2.5 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: activeTab === "my-health" ? 700 : 500 }}>
              My Health
            </span>
          </button>
        </nav>

        {/* QUICK ACTION DRAWER */}
        {quickActionDrawer && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "#ffffff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: "20px 20px 30px 20px",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Quick Actions</span>
                <button
                  onClick={() => setQuickActionDrawer(false)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => {
                    setQuickActionDrawer(false);
                    setModalAppointment(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Request Appointment</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Choose center, doctor and slot</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setQuickActionDrawer(false);
                    setModalMessages(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Send Message to Doctor</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Secure two-way clinical communication</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setQuickActionDrawer(false);
                    setModalUpload(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Upload Medical Record</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Upload PDF or image to your chart</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setQuickActionDrawer(false);
                    setModalRefills(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f3e8ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Pill size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Request Medication Refill</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Prescription & supplement reorders</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        {modalAppointment && (
          <PhrAppointmentRequestModal
            onClose={() => setModalAppointment(false)}
            onSuccess={refreshData}
          />
        )}

        {modalMessages && (
          <PhrMessagesModal
            onClose={() => setModalMessages(false)}
            charLimit={config?.messaging_prefs?.char_limit_per_message || 500}
          />
        )}

        {modalUpload && (
          <PhrDocumentUploadModal
            onClose={() => setModalUpload(false)}
            onSuccess={refreshData}
          />
        )}

        {modalRefills && (
          <PhrRefillModal
            onClose={() => setModalRefills(false)}
            onSuccess={refreshData}
          />
        )}

        {modalClinical && (
          <PhrClinicalRecordsModal
            onClose={() => setModalClinical(false)}
            initialSection={clinicalInitialSection}
          />
        )}

        {modalProfile && (
          <PhrProfileModal
            patient={patient}
            onClose={() => setModalProfile(false)}
            onLockApp={handleLockApp}
            onLogout={handleLogout}
          />
        )}

        {modalAnnouncements && (
          <PhrAnnouncementsModal
            onClose={() => setModalAnnouncements(false)}
          />
        )}

        {modalUsefulInfo && (
          <PhrUsefulInfoModal
            onClose={() => setModalUsefulInfo(false)}
          />
        )}

        {modalImages && (
          <PhrImagesModal
            onClose={() => setModalImages(false)}
          />
        )}
      </div>
    </div>
  );
}
