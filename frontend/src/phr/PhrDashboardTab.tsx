import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Scale,
  Ruler,
  Heart,
  ChevronRight,
  ShieldCheck,
  X,
  Sparkles,
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
  onOpenProfilePassword?: () => void;
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
  onOpenProfilePassword,
  onNavigateTab,
}: PhrDashboardTabProps) {
  const [showFirstLoginBanner, setShowFirstLoginBanner] = useState<boolean>(true);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 90 }}>
      {/* First-Login Dismissible Security Banner */}
      {showFirstLoginBanner && (
        <div
          style={{
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <ShieldCheck size={18} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.4 }}>
              <span>You are signed in with your default 6-digit Patient ID. </span>
              {onOpenProfilePassword && (
                <button
                  type="button"
                  onClick={onOpenProfilePassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#B45309",
                    fontWeight: 700,
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: "0 4px",
                  }}
                >
                  [Change Password]
                </button>
              )}
              <span>or </span>
              <button
                type="button"
                onClick={() => setShowFirstLoginBanner(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#B45309",
                  fontWeight: 600,
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                [Keep Using ID]
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFirstLoginBanner(false)}
            style={{
              background: "none",
              border: "none",
              color: "#92400E",
              cursor: "pointer",
              padding: 2,
            }}
            aria-label="Dismiss banner"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3 VITALS SUMMARY CARDS (Exact match to WhatsApp Image 2026-11-21 at 1.55.48 PM.jpeg) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {/* Card 1: Weight (Mint Tint #D7EFEA) */}
        <div
          onClick={onOpenClinicalRecords}
          style={{
            background: "#D7EFEA",
            borderRadius: 14,
            padding: "16px 10px 14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            minHeight: 110,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#14B8A6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            <Scale size={18} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937", marginBottom: 4 }}>
            Weight
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
            {vitals?.weight_kg ? `${vitals.weight_kg} kg` : "-"}
          </span>
        </div>

        {/* Card 2: Height (Peach Tint #FBEAE1) */}
        <div
          onClick={onOpenClinicalRecords}
          style={{
            background: "#FBEAE1",
            borderRadius: 14,
            padding: "16px 10px 14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            minHeight: 110,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#F97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            <Ruler size={18} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1F2937", marginBottom: 4 }}>
            Height
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
            {vitals?.height_cm ? `${vitals.height_cm} cm` : "-"}
          </span>
        </div>

        {/* Card 3: Blood Pressure (Rose Tint #FCEAEF) */}
        <div
          onClick={onOpenClinicalRecords}
          style={{
            background: "#FCEAEF",
            borderRadius: 14,
            padding: "16px 10px 14px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            minHeight: 110,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#F43F5E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              marginBottom: 8,
            }}
          >
            <Heart size={18} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#1F2937", marginBottom: 4, textAlign: "center" }}>
            Blood Pressure
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
            {vitals?.bp_sys && vitals?.bp_dia ? `${vitals.bp_sys}/${vitals.bp_dia}` : "-"}
          </span>
        </div>
      </div>

      {/* UPCOMING APPOINTMENTS SECTION */}
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#111827",
            margin: "8px 0 12px 2px",
          }}
        >
          Upcoming Appointments
        </h2>

        {nextAppt ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #F1F5F9",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 12,
                    background: "#EFF6FF",
                    color: "#2563EB",
                  }}
                >
                  {nextAppt.status || "Confirmed"}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: "8px 0 2px 0" }}>
                  {nextAppt.reason || "Cardiology & EECP Session"}
                </h3>
                <div style={{ fontSize: 13, color: "#64748B" }}>
                  With {nextAppt.provider_name || "Dr. Prem Sekar"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#334155", margin: "14px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={16} color="#3B82F6" />
                <span>{formatDate(nextAppt.scheduled_at)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="#3B82F6" />
                <span>{formatTime(nextAppt.scheduled_at)} ({nextAppt.duration_minutes || 30} mins)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} color="#3B82F6" />
                <span>{nextAppt.facility_name}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenBookAppointment}
              style={{
                width: "100%",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Request Follow-up / Reschedule
            </button>
          </div>
        ) : (
          /* Empty state matching exact calendar graphic & "Book Now" in screenshot */
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #F1F5F9",
              padding: "40px 20px 36px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {/* Calendar with Sparkles Graphic */}
            <div style={{ position: "relative", marginBottom: 18 }}>
              {/* Little sparkle dots */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: -10,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#34D399",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  right: -12,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#C084FC",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -14,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#F472B6",
                }}
              />

              {/* Vector Calendar icon box */}
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  background: "#FFFFFF",
                  border: "2px solid #E2E8F0",
                  overflow: "hidden",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header blue bar */}
                <div
                  style={{
                    height: 18,
                    background: "#3B82F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-around",
                    padding: "0 8px",
                  }}
                >
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFFFFF" }} />
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFFFFF" }} />
                </div>
                {/* Calendar grid cells */}
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 3,
                    padding: "5px 6px",
                    background: "#F8FAFC",
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      style={{
                        background: i % 2 === 0 ? "#3B82F6" : "#93C5FD",
                        borderRadius: 3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#1E293B",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              No upcoming appointments
            </div>

            <button
              type="button"
              onClick={onOpenBookAppointment}
              style={{
                background: "#3B82F6",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                padding: "9px 26px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563EB")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3B82F6")}
            >
              Book Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
