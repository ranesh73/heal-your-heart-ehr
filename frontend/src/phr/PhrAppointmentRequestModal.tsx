import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrAppointmentRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const FACILITIES = [
  { id: "HUH001", name: "Heal Your Heart Neelankarai - HUH001" },
  { id: "HUH002", name: "Heal Your Heart Royapettah - HUH002" },
  { id: "4R", name: "4R Health & Wellness" },
  { id: "HUH003", name: "Heal Your Heart - Manapakkam - HUH003" },
  { id: "005", name: "Heal Your Heart-Madurai - 005" },
  { id: "004", name: "Heal Your Heart-Tirunelveli - 004" },
];

const PROVIDERS = [
  { id: "prem", name: "Dr. Prem Sekar" },
  { id: "ramasamy", name: "Dr. S. Ramasamy" },
  { id: "mohan", name: "Dr. K. Mohan" },
  { id: "sivakumar", name: "Dr. Sivakumar" },
];

const TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "02:00 PM - 03:00 PM",
  "04:00 PM - 05:00 PM",
  "06:00 PM - 07:00 PM",
];

export function PhrAppointmentRequestModal({ onClose, onSuccess }: PhrAppointmentRequestModalProps) {
  const [facility, setFacility] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [timeSlot, setTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [reason, setReason] = useState<string>("");

  const [picking, setPicking] = useState<"none" | "facility" | "provider" | "slot">("none");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDone = async () => {
    if (!facility) {
      setError("Please select a facility");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await phrApi("/appointments/request", "POST", {
        facility_name: facility,
        provider_name: provider || "Any Available Cardiologist",
        preferred_date: preferredDate,
        preferred_time_slot: timeSlot,
        reason: reason || "Routine EECP & Cardiology Follow-up",
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || "Failed to submit appointment request");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#F2F2F7",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          width: "100%",
          maxWidth: 480,
          minHeight: "75vh",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
          boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* iOS-Style Navigation Bar (Matching Request appointment header) */}
        <div
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid #E5E5EA",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={picking !== "none" ? () => setPicking("none") : onClose}
            style={{
              background: "none",
              border: "none",
              color: "#007AFF",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: 0,
            }}
          >
            <ChevronLeft size={20} /> Back
          </button>

          <span style={{ fontSize: 17, fontWeight: 600, color: "#000000" }}>
            Request appointment
          </span>

          <button
            type="button"
            onClick={handleDone}
            disabled={submitting || submitted}
            style={{
              background: "none",
              border: "none",
              color: "#007AFF",
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 0,
            }}
          >
            {submitting ? "Sending..." : "Done"}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {error && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#DC2626",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {submitted ? (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#DCFCE7",
                  color: "#16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                <Check size={30} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", margin: "0 0 6px 0" }}>
                Request Sent Successfully!
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                Our team at <strong>{facility}</strong> has received your request and will confirm your appointment shortly.
              </p>
            </div>
          ) : picking === "facility" ? (
            /* Facility Picker List */
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 8, paddingLeft: 4 }}>
                SELECT CLINIC FACILITY
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E5EA" }}>
                {FACILITIES.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setFacility(f.name);
                      setPicking("none");
                      setError(null);
                    }}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < FACILITIES.length - 1 ? "1px solid #E5E5EA" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      background: facility === f.name ? "#EFF6FF" : "#FFFFFF",
                    }}
                  >
                    <span style={{ fontSize: 15, color: "#000000", fontWeight: facility === f.name ? 600 : 400 }}>
                      {f.name}
                    </span>
                    {facility === f.name && <Check size={18} color="#007AFF" />}
                  </div>
                ))}
              </div>
            </div>
          ) : picking === "provider" ? (
            /* Provider Picker List */
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 8, paddingLeft: 4 }}>
                SELECT PROVIDER
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E5EA" }}>
                {PROVIDERS.map((pr, i) => (
                  <div
                    key={pr.id}
                    onClick={() => {
                      setProvider(pr.name);
                      setPicking("none");
                    }}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < PROVIDERS.length - 1 ? "1px solid #E5E5EA" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      background: provider === pr.name ? "#EFF6FF" : "#FFFFFF",
                    }}
                  >
                    <span style={{ fontSize: 15, color: "#000000", fontWeight: provider === pr.name ? 600 : 400 }}>
                      {pr.name}
                    </span>
                    {provider === pr.name && <Check size={18} color="#007AFF" />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Main Form (Exact row style: Facility name | Tap to Select >) */
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E5EA" }}>
                {/* Row 1: Facility name */}
                <div
                  onClick={() => setPicking("facility")}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    borderBottom: "1px solid #E5E5EA",
                  }}
                >
                  <span style={{ fontSize: 16, color: "#000000" }}>Facility name</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: facility ? "#007AFF" : "#8E8E93" }}>
                    <span style={{ fontSize: 15, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {facility || "Tap to Select"}
                    </span>
                    <ChevronRight size={18} color="#C7C7CC" />
                  </div>
                </div>

                {/* Row 2: Provider name */}
                <div
                  onClick={() => setPicking("provider")}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    borderBottom: "1px solid #E5E5EA",
                  }}
                >
                  <span style={{ fontSize: 16, color: "#000000" }}>Provider name</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: provider ? "#007AFF" : "#8E8E93" }}>
                    <span style={{ fontSize: 15 }}>{provider || "Tap to Select"}</span>
                    <ChevronRight size={18} color="#C7C7CC" />
                  </div>
                </div>

                {/* Row 3: Preferred Date */}
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #E5E5EA",
                  }}
                >
                  <span style={{ fontSize: 16, color: "#000000" }}>Preferred Date</span>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    style={{
                      border: "none",
                      background: "none",
                      fontSize: 15,
                      color: "#007AFF",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                {/* Row 4: Time Slot */}
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 16, color: "#000000" }}>Time Slot</span>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    style={{
                      border: "none",
                      background: "none",
                      fontSize: 15,
                      color: "#007AFF",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#64748B",
                    marginBottom: 6,
                    paddingLeft: 4,
                  }}
                >
                  REASON FOR VISIT
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. EECP Counterpulsation Session, Cardiology follow-up, BP check..."
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid #E5E5EA",
                    fontSize: 15,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                  }}
                />
              </div>

              {!facility && (
                <div style={{ textAlign: "center", marginTop: 20, color: "#8E8E93", fontSize: 14 }}>
                  Select a facility to continue
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
