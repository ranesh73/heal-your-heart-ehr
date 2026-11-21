import React, { useState } from "react";
import { X, User, Phone, MapPin, Mail, Lock, LogOut, ChevronRight, Check, Activity, ShieldCheck } from "lucide-react";
import { phrApi, clearPhrToken } from "./phrApi";

interface PhrProfileModalProps {
  patient: {
    first_name: string;
    last_name?: string;
    mrn?: string;
    gender?: string;
    dob?: string;
    phone?: string;
    email?: string;
    address?: string;
    emergency_contact?: string;
  };
  onClose: () => void;
  onLockApp: () => void;
  onLogout: () => void;
}

export function PhrProfileModal({ patient, onClose, onLockApp, onLogout }: PhrProfileModalProps) {
  const [appleHealthSync, setAppleHealthSync] = useState(true);
  const [analyticsSync, setAnalyticsSync] = useState(true);
  const [showDemographics, setShowDemographics] = useState(false);
  const [phone, setPhone] = useState(patient?.phone || "+91 98400 12345");
  const [address, setAddress] = useState(patient?.address || "No. 42, Beach Road, Neelankarai, Chennai - 600115");
  const [emergencyContact, setEmergencyContact] = useState(patient?.emergency_contact || "S. Sundaram (Father) - +91 98400 98765");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fullName = `${patient?.first_name || "Hariharan"} ${patient?.last_name || "S"}`.trim();
  const initials = `${(patient?.first_name || "H")[0]}${(patient?.last_name || "S")[0]}`.toUpperCase();

  const handleSaveDemographics = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await phrApi("/profile/demographics", "PUT", {
        phone,
        address,
        emergency_contact: emergencyContact,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowDemographics(false);
      }, 1200);
    } catch (e: any) {
      alert(e.message || "Failed to update demographics");
    } finally {
      setSaving(false);
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
        padding: "20px 20px 30px 20px",
        width: "100%",
        maxWidth: 440,
        maxHeight: "90vh",
        overflowY: "auto",
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
            Patient Profile
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

        {/* User Card */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#f8fafc",
          padding: "16px 18px",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "#2563eb",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
          }}>
            {initials}
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {fullName}
            </h3>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Male, 23 Years · MRN: {patient?.mrn || "HYN-MR-000172"}
            </div>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={13} /> Verified Patient Account
            </div>
          </div>
        </div>

        {showDemographics ? (
          /* Demographics Edit View */
          <form onSubmit={handleSaveDemographics} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>My Demographics</span>
              <button
                type="button"
                onClick={() => setShowDemographics(false)}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Back
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Residential Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Emergency Contact
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 20,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                marginTop: 6,
              }}
            >
              {saved ? "Saved Successfully!" : saving ? "Saving..." : "Save Demographics"}
            </button>
          </form>
        ) : (
          /* Profile Menu Sections */
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* My Info */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                My Info
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div
                  onClick={() => setShowDemographics(true)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", background: "#ffffff" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Demographics</span>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
              </div>
            </div>

            {/* Sync Health Record */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Sync Health Record
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Apple Health</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Sync daily steps and resting pulse</div>
                </div>
                <input
                  type="checkbox"
                  checked={appleHealthSync}
                  onChange={(e) => setAppleHealthSync(e.target.checked)}
                  style={{ accentColor: "#2563eb", width: 18, height: 18, cursor: "pointer" }}
                />
              </div>
            </div>

            {/* Other Settings */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Other Settings
              </div>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff" }}>
                <div style={{ paddingRight: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Analytics</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Help Heal Your Heart improve the user experience with anonymous diagnostics
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsSync}
                  onChange={(e) => setAnalyticsSync(e.target.checked)}
                  style={{ accentColor: "#2563eb", width: 18, height: 18, cursor: "pointer" }}
                />
              </div>
            </div>

            {/* Actions: Lock App and Sign Out */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLockApp();
                }}
                style={{
                  width: "100%",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  borderRadius: 20,
                  padding: "12px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Lock size={15} /> Lock App (PIN Screen)
              </button>

              <button
                type="button"
                onClick={() => {
                  clearPhrToken();
                  onLogout();
                }}
                style={{
                  width: "100%",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "none",
                  borderRadius: 20,
                  padding: "12px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
