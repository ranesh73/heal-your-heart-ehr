import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, User, Check, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrAppointmentRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const FACILITIES = [
  { id: "HUH001", name: "Heal Your Heart Neelankarai", code: "HUH001", address: "4/285, East Coast Road, Neelankarai, Chennai - 600115" },
  { id: "HUH002", name: "Heal Your Heart Royapettah", code: "HUH002", address: "135, Lloyds Road, Royapettah, Chennai - 600014" },
  { id: "4RHW", name: "4R Health & Wellness", code: "4RHW", address: "Old No 8, New No 17, 1st Cross Street, TTK Road, Alwarpet, Chennai - 600018" },
  { id: "HUH003", name: "Heal Your Heart Manapakkam", code: "HUH003", address: "DLF Cybercity Mount Poonamallee High Rd, Manapakkam, Chennai - 600125" },
  { id: "005", name: "Heal Your Heart Madurai", code: "005", address: "KK Nagar Main Road, Near Court Complex, Madurai - 625020" },
  { id: "004", name: "Heal Your Heart Tirunelveli", code: "004", address: "North High Ground Road, Palayamkottai, Tirunelveli - 627002" },
];

const PROVIDERS = [
  { id: "prem", name: "Dr. Prem Sekar", role: "Cardiologist & Heart Failure Specialist" },
  { id: "ramasamy", name: "Dr. S. Ramasamy", role: "Non-Invasive Cardiologist & EECP Medical Director" },
  { id: "mohan", name: "Dr. K. Mohan", role: "Consultant Physician" },
  { id: "sivakumar", name: "Dr. Sivakumar", role: "Senior Interventional Cardiologist" },
];

const TIME_SLOTS = [
  "Morning (09:00 AM - 12:00 PM)",
  "Afternoon (01:00 PM - 04:00 PM)",
  "Evening (04:00 PM - 07:00 PM)",
];

export function PhrAppointmentRequestModal({ onClose, onSuccess }: PhrAppointmentRequestModalProps) {
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0].name);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].name);
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [preferredSlot, setPreferredSlot] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState("Routine EECP & Cardiology Follow-up");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await phrApi("/appointments/request", "POST", {
        facility_name: selectedFacility,
        provider_name: selectedProvider,
        preferred_date: preferredDate,
        preferred_time_slot: preferredSlot,
        reason: reason,
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit appointment request");
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "#ffffff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: "20px 24px 30px 24px",
        width: "100%",
        maxWidth: 440,
        maxHeight: "90vh",
        overflowY: "auto",
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
            Request Appointment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}>
              <Check size={28} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              Request Received!
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>
              Your appointment request has been submitted to <strong>{selectedFacility}</strong>. Our front desk will confirm your slot shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Tap to Select Facility */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Facility / Center (Tap to Select)
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e293b",
                  background: "#f8fafc",
                }}
              >
                {FACILITIES.map((f) => (
                  <option key={f.code} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tap to Select Provider */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Doctor / Provider (Tap to Select)
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1e293b",
                  background: "#f8fafc",
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} · {p.role.split("·")[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Preferred Date
              </label>
              <input
                type="date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background: "#f8fafc",
                }}
              />
            </div>

            {/* Time Slot */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Time Preference
              </label>
              <select
                value={preferredSlot}
                onChange={(e) => setPreferredSlot(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background: "#f8fafc",
                }}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Reason for Visit / Symptoms
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest tightness follow-up, scheduled EECP evaluation"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 24,
                padding: "13px 0",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 6,
                boxShadow: "0 3px 10px rgba(37,99,235,0.25)",
              }}
            >
              {submitting ? "Submitting..." : "Done"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
