import React, { useState } from "react";
import { X, Pill, Check, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrRefillModalProps {
  onClose: () => void;
  onSuccess: () => void;
  medicationName?: string;
}

const DEFAULT_MEDS = [
  "Tab. Atorvastatin 20mg (Once daily at bedtime)",
  "Tab. Metoprolol 25mg (Twice daily after meals)",
  "Tab. Clopidogrel 75mg (Once daily after breakfast)",
  "Capsule CoQ10 100mg (Daily antioxidant support)",
  "Tab. Ramipril 2.5mg (Once daily in the morning)",
];

const FACILITIES = [
  "Heal Your Heart Neelankarai - HUH001",
  "Heal Your Heart Royapettah - HUH002",
  "4R Health & Wellness",
  "Heal Your Heart - Manapakkam - HUH003",
  "Heal Your Heart-Madurai - 005",
  "Heal Your Heart-Tirunelveli - 004",
];

export function PhrRefillModal({ onClose, onSuccess, medicationName }: PhrRefillModalProps) {
  const [selectedMed, setSelectedMed] = useState(medicationName || DEFAULT_MEDS[0]);
  const [facility, setFacility] = useState(FACILITIES[0]);
  const [notes, setNotes] = useState("30-day supply refill requested.");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await phrApi("/refills/request", "POST", {
        medication_name: selectedMed,
        preferred_facility: facility,
        delivery_notes: notes,
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit refill request");
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
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
            Request Medication Refill
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
              Refill Request Sent!
            </h3>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Your cardiologist has been notified to review and approve your refill.
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

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Medication to Refill
              </label>
              <select
                value={selectedMed}
                onChange={(e) => setSelectedMed(e.target.value)}
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
                {DEFAULT_MEDS.map((med) => (
                  <option key={med} value={med}>
                    {med}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Dispensing Branch
              </label>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background: "#f8fafc",
                }}
              >
                {FACILITIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Notes / Special Requests
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please courier or prepare for pickup during next EECP session"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

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
              {submitting ? "Sending..." : "Submit Refill Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
