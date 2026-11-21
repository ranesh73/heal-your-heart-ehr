import React, { useState, useEffect } from "react";
import { X, Info, Phone, ShieldAlert, BookOpen, ExternalLink, Clock } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrUsefulInfoModalProps {
  onClose: () => void;
}

export function PhrUsefulInfoModal({ onClose }: PhrUsefulInfoModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await phrApi("/useful-info");
        if (res?.items) {
          setItems(res.items);
        }
      } catch (e) {
        console.error("Failed to load useful info", e);
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
              <Info size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Useful Info & Resources
              </h2>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Emergency Helplines & EECP Guidelines
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
              Loading practice resources...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#64748b", fontSize: 13 }}>
              No practice info published yet.
            </div>
          ) : (
            items.map((item, idx) => {
              const isContact = item.category === "Contact";
              const isPolicy = item.category === "Policy";
              const isUrl = item.content_or_url?.startsWith("http");

              return (
                <div
                  key={item.id || idx}
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {isContact ? (
                      <Phone size={14} color="#16a34a" />
                    ) : isPolicy ? (
                      <Clock size={14} color="#d97706" />
                    ) : (
                      <BookOpen size={14} color="#2563eb" />
                    )}
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                      {item.title}
                    </h3>
                  </div>

                  {isUrl ? (
                    <a
                      href={item.content_or_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: "#2563eb",
                        fontWeight: 600,
                        textDecoration: "none",
                        marginTop: 4,
                      }}
                    >
                      {item.content_or_url} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: "4px 0 0 0" }}>
                      {item.content_or_url}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
