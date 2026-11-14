import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Calendar, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { VaccineChartBuilder } from "./VaccineChartBuilder";

interface VaccineChartItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  entries: any[];
  created_at?: string;
}

export function VaccineChartPage() {
  const [charts, setCharts] = useState<VaccineChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Builder subview state
  const [isBuilding, setIsBuilding] = useState(false);
  const [chartToEdit, setChartToEdit] = useState<VaccineChartItem | null>(null);

  const fetchCharts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<VaccineChartItem[]>("/settings/immunization/charts");
      setCharts(data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load vaccine charts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharts();
  }, []);

  const handleDeleteChart = async (chart: VaccineChartItem) => {
    if (!confirm(`Are you sure you want to delete vaccine chart "${chart.name}"?`)) return;
    try {
      await api(`/settings/immunization/charts/${chart.id}`, "DELETE");
      fetchCharts();
    } catch (err: any) {
      alert(err?.message || "Failed to delete vaccine chart.");
    }
  };

  if (isBuilding) {
    return (
      <VaccineChartBuilder
        initialChart={chartToEdit}
        onBack={() => {
          setIsBuilding(false);
          setChartToEdit(null);
        }}
        onSuccess={() => {
          setIsBuilding(false);
          setChartToEdit(null);
          fetchCharts();
        }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Header & + New Vaccine Chart Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "#0f172a", fontWeight: 700 }}>
            Immunization Schedules & Vaccine Charts
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Preconfigured scheduling frameworks linking childhood and adult vaccines to age milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setChartToEdit(null);
            setIsBuilding(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            background: "#ea580c",
            color: "#ffffff",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <Plus size={15} /> New Vaccine Chart
        </button>
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

      {/* Vaccine Charts Table */}
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
                Vaccine Chart Name
              </th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#334155", width: 220 }}>
                Scheduled Items
              </th>
              <th style={{ padding: "12px 16px", fontWeight: 600, color: "#334155", textAlign: "right", width: 120 }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>
                  Loading vaccine charts...
                </td>
              </tr>
            ) : charts.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "36px 16px", textAlign: "center", color: "#64748b" }}>
                  No vaccine charts configured. Click <strong>+ New Vaccine Chart</strong> to build one.
                </td>
              </tr>
            ) : (
              charts.map((ch) => (
                <tr key={ch.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{ch.name}</div>
                    {ch.description && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{ch.description}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "#f0fdfa",
                        color: "#0f766e",
                        fontWeight: 600,
                      }}
                    >
                      {ch.entries ? ch.entries.length : 0} scheduled vaccines
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setChartToEdit(ch);
                          setIsBuilding(true);
                        }}
                        title="Edit Chart"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: 4,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteChart(ch)}
                        title="Delete Chart"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          padding: 4,
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                      >
                        <Trash2 size={15} />
                      </button>
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

