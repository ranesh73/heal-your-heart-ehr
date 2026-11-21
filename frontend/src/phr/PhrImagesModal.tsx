import React, { useState, useEffect } from "react";
import { X, ImageIcon, FileText, Download, ExternalLink, Calendar } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrImagesModalProps {
  onClose: () => void;
}

export function PhrImagesModal({ onClose }: PhrImagesModalProps) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await phrApi("/images");
        if (res?.images) {
          setImages(res.images);
        }
      } catch (e) {
        console.error("Failed to load imaging records", e);
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
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Imaging & Radiology Reports
              </h2>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                ECG, 2D Echo, SphygmoCor & Angiogram Records
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

        {/* PDF Preview Modal if open */}
        {selectedPdfUrl ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Document Preview</span>
              <button
                onClick={() => setSelectedPdfUrl(null)}
                style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Close Preview
              </button>
            </div>
            <iframe
              src={selectedPdfUrl}
              title="Imaging PDF Preview"
              style={{ flex: 1, width: "100%", border: "1px solid #cbd5e1", borderRadius: 8 }}
            />
          </div>
        ) : (
          /* List of Images */
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
                Loading imaging reports...
              </div>
            ) : images.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "#64748b", fontSize: 13 }}>
                No imaging reports found for your chart.
              </div>
            ) : (
              images.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    background: "#f8fafc",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {item.test_name || "ECG : Resting (12-Lead)"}
                    </div>
                    <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                      {item.status || "Completed"}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                    Ordered by: <strong>{item.ordering_doctor || "Dr. Prem Sekar"}</strong>
                  </div>

                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={12} /> {item.result_at ? new Date(item.result_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Nov 20, 2026"}
                  </div>

                  {item.download_url && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => setSelectedPdfUrl(item.download_url)}
                        style={{
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <FileText size={13} /> View Inline PDF
                      </button>
                      <a
                        href={item.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          border: "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={13} /> Download
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
