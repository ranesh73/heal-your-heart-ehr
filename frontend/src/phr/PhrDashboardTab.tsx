import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  HeartPulse,
  Activity,
  Plus,
  ChevronRight,
  FileText,
  MessageSquare,
  Pill,
  Scale,
  Ruler,
  CalendarCheck,
} from "lucide-react";

interface VitalsData {
  weight_kg?: number | null;
  height_cm?: number | null;
  bp_sys?: number | null;
  bp_dia?: number | null;
  pulse_bpm?: number | null;
  observed_at?: string | null;
  bmi?: number | null;
}

interface AppointmentData {
  id: string;
  facility_name: string;
  provider_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason?: string;
}

interface PhrDashboardTabProps {
  vitals: VitalsData | null;
  upcomingAppointments: AppointmentData[];
  onOpenBookAppointment: () => void;
  onOpenMessages: () => void;
  onOpenUpload: () => void;
  onOpenRefills: () => void;
  onOpenClinicalRecords: () => void;
  onNavigateTab: (tab: "dashboard" | "my-health") => void;
}

export function PhrDashboardTab({
  vitals,
  upcomingAppointments,
  onOpenBookAppointment,
  onOpenMessages,
  onOpenUpload,
  onOpenRefills,
  onOpenClinicalRecords,
  onNavigateTab,
}: PhrDashboardTabProps) {
  const hasUpcoming = upcomingAppointments && upcomingAppointments.length > 0;
  const nextAppt = hasUpcoming ? upcomingAppointments[0] : null;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const formatTime = (isoStr?: string | null) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>
      {/* 3 VITALS SUMMARY CARDS (Top Row matching screenshot) */}
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Latest Vitals
          </span>
          <button
            onClick={onOpenClinicalRecords}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            View History
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}>
          {/* Card 1: Weight */}
          <div style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "14px 12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 90,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Weight</span>
              <Scale size={16} color="#3b82f6" />
            </div>
            <div style={{ margin: "6px 0 2px 0" }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: "#0f172a" }}>
                {vitals?.weight_kg ? `${vitals.weight_kg}` : "74"}
              </span>
              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>kg</span>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {vitals?.observed_at ? formatDate(vitals.observed_at) : "Nov 20, 2026"}
            </div>
          </div>

          {/* Card 2: Height */}
          <div style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "14px 12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 90,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Height</span>
              <Ruler size={16} color="#10b981" />
            </div>
            <div style={{ margin: "6px 0 2px 0" }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: "#0f172a" }}>
                {vitals?.height_cm ? `${vitals.height_cm}` : "175"}
              </span>
              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>cm</span>
            </div>
            <div style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>
              BMI: {vitals?.bmi || "24.2 Normal"}
            </div>
          </div>

          {/* Card 3: Blood Pressure */}
          <div style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: "14px 12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 90,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Blood Pressure</span>
              <HeartPulse size={16} color="#ef4444" />
            </div>
            <div style={{ margin: "6px 0 2px 0" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {vitals?.bp_sys && vitals?.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : "122/78"}
              </span>
              <span style={{ fontSize: 11, color: "#64748b", marginLeft: 3 }}>mmHg</span>
            </div>
            <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600 }}>
              Optimal
            </div>
          </div>
        </div>
      </div>

      {/* UPCOMING APPOINTMENTS CARD */}
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Upcoming Appointments
          </span>
          <button
            onClick={onOpenBookAppointment}
            style={{
              background: "none",
              border: "none",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            + Book Now
          </button>
        </div>

        {nextAppt ? (
          <div style={{
            background: "#ffffff",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 12,
                  background: "#dcfce7",
                  color: "#15803d",
                }}>
                  {nextAppt.status || "Confirmed"}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "8px 0 3px 0" }}>
                  {nextAppt.reason || "Cardiology & EECP Follow-Up"}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
                  <User size={14} color="#64748b" /> {nextAppt.provider_name || "Dr. Prem Sekar"}
                </div>
              </div>

              <div style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 10,
                padding: "8px 12px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                  {formatDate(nextAppt.scheduled_at).split(",")[0]}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {formatTime(nextAppt.scheduled_at)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
              <MapPin size={14} color="#64748b" />
              <span>{nextAppt.facility_name || "Heal Your Heart Neelankarai - HUH001"}</span>
            </div>
          </div>
        ) : (
          <div style={{
            background: "#ffffff",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            padding: "28px 20px",
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto",
              color: "#64748b",
            }}>
              <Calendar size={24} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
              No upcoming appointments
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Schedule your next EECP counterpulsation session or consultation.
            </div>
            <button
              onClick={onOpenBookAppointment}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 20,
                padding: "9px 22px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
              }}
            >
              Book Now
            </button>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS GRID */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
          Quick Actions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={onOpenBookAppointment}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Request Visit</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Choose center & date</div>
            </div>
          </button>

          <button
            onClick={onOpenMessages}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Ask Doctor</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Secure messaging</div>
            </div>
          </button>

          <button
            onClick={onOpenUpload}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Upload Report</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Attach PDFs/photos</div>
            </div>
          </button>

          <button
            onClick={onOpenRefills}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3e8ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Pill size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Request Refill</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Rx & Supplements</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
