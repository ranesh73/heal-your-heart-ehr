import React, { useState, useEffect } from "react";
import { FileText, AlertCircle, Calendar } from "lucide-react";
import { api } from "../../api";

interface VISRecord {
  id: string;
  name: string;
  published_date: string;
  code?: string;
}

export function VaccineVISPage() {
  const [visList, setVisList] = useState<VISRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<VISRecord[]>("/settings/immunization/vis");
        setVisList(data || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load VIS statements.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Description */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#0f172a", fontWeight: 700 }}>
          Vaccine Information Statements (VIS)
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Official information sheets explaining the benefits and risks of vaccines to recipients and their guardians.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* VIS Table */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#334155" }}>
                VIS Name
              </th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#334155", width: 220 }}>
                Published Date
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>
                  Loading Vaccine Information Statements...
                </td>
              </tr>
            ) : visList.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>
                  No VIS records available.
                </td>
              </tr>
            ) : (
              visList.map((vis) => (
                <tr key={vis.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FileText size={16} color="#0d9488" style={{ flexShrink: 0 }} />
                      <span>{vis.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={14} color="#94a3b8" />
                      <span>{vis.published_date}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

