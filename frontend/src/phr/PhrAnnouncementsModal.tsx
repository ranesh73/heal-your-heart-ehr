import React, { useState, useEffect } from "react";
import { X, Megaphone, Calendar, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrAnnouncementsModalProps {
  onClose: () => void;
}

export function PhrAnnouncementsModal({ onClose }: PhrAnnouncementsModalProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await phrApi("/announcements");
        if (res?.announcements) {
          setAnnouncements(res.announcements);
        }
      } catch (e) {
        console.error("Failed to load announcements", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Megaphone size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Practice Announcements
              </h2>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Heal Your Heart · Vaso-Meditech Clinic Updates
              </div>
            </div>
          </div>
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
              Loading clinic announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#64748b", fontSize: 13 }}>
              No active announcements at this time.
            </div>
          ) : (
            announcements.map((a, idx) => (
              <div
                key={a.id || idx}
                style={{
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    {a.title}
                  </h3>
                  <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "Nov 20"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {a.body}
                </p>
                <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 600, marginTop: 8 }}>
                  Heal Your Heart Medical Team
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
