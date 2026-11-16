import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Search, Calendar, AlertCircle } from "lucide-react";
import { api } from "../../api";

interface VaccineSummary {
  id: string;
  name: string;
  route?: string;
  dose?: string;
}

interface ScheduleEntry {
  vaccine_id?: string;
  vaccine_name: string;
  milestone: string;
  doses: number;
  route: string;
}

interface VaccineChartBuilderProps {
  initialChart?: {
    id?: string;
    name: string;
    description?: string;
    entries: ScheduleEntry[];
  } | null;
  onBack: () => void;
  onSuccess: () => void;
}

const COMMON_MILESTONES = [
  "Birth",
  "1 Month",
  "2 Months",
  "4 Months",
  "6 Months",
  "12 Months",
  "15 Months",
  "18 Months",
  "4-6 Years",
  "11-12 Years",
  "16-18 Years",
  "Adult 19-64",
  "Adult 65+",
  "Annual",
  "Every 10 Years",
  "High Risk",
];

export function VaccineChartBuilder({
  initialChart,
  onBack,
  onSuccess,
}: VaccineChartBuilderProps) {
  const [chartName, setChartName] = useState(initialChart?.name || "");
  const [description, setDescription] = useState(initialChart?.description || "");
  const [entries, setEntries] = useState<ScheduleEntry[]>(initialChart?.entries || []);

  // Available vaccines for left panel
  const [availableVaccines, setAvailableVaccines] = useState<VaccineSummary[]>([]);
  const [searchVaccine, setSearchVaccine] = useState("");
  const [loadingVaccines, setLoadingVaccines] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ items: VaccineSummary[] }>("/settings/immunization/vaccines?limit=100");
        setAvailableVaccines(res?.items || []);
      } catch (err: any) {
        console.error("Failed to load vaccines for chart builder:", err);
      } finally {
        setLoadingVaccines(false);
      }
    })();
  }, []);

  const handleAddVaccineToSchedule = (vac: VaccineSummary) => {
    const newEntry: ScheduleEntry = {
      vaccine_id: vac.id,
      vaccine_name: vac.name,
      milestone: "2 Months",
      doses: 1,
      route: vac.route || "Intramuscular (IM)",
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const handleUpdateEntry = (index: number, field: keyof ScheduleEntry, val: any) => {
    setEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartName.trim()) {
      setError("Vaccine Chart Name is required.");
      return;
    }
    if (entries.length === 0) {
      setError("Please add at least one vaccine to the schedule.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api("/settings/immunization/charts", "POST", {
        id: initialChart?.id,
        name: chartName.trim(),
        description: description.trim(),
        entries: entries,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to save vaccine chart.");
    } finally {
      setSaving(false);
    }
  };

  const filteredVaccines = availableVaccines.filter((v) =>
    v.name.toLowerCase().includes(searchVaccine.toLowerCase().trim())
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#475569",
            cursor: "pointer",
          }}
          title="Back to Vaccine Charts"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700 }}>
          {initialChart ? "Edit Vaccine Chart" : "New Vaccine Chart"}
        </h2>
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
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Main Two-Section Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 20,
        }}
      >
        {/* LEFT SECTION: Search & Vaccine Picker */}
        <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 18 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>
              Available Vaccines
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10 }} />
              <input
                type="text"
                placeholder="Search by Vaccine Name"
                value={searchVaccine}
                onChange={(e) => setSearchVaccine(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  fontSize: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div
            style={{
              maxHeight: 460,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {loadingVaccines ? (
              <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>Loading vaccines...</div>
            ) : filteredVaccines.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>No vaccines found.</div>
            ) : (
              filteredVaccines.map((vac) => (
                <div
                  key={vac.id}
                  onClick={() => handleAddVaccineToSchedule(vac)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 4,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12,
                    color: "#0f172a",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                  title="Click to add to schedule"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#0d9488";
                    e.currentTarget.style.background = "#f0fdfa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <span style={{ lineHeight: 1.3 }}>{vac.name}</span>
                  <Plus size={14} color="#0d9488" style={{ flexShrink: 0 }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT SECTION: Chart Name & Schedule-building Workspace */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
              Vaccine Chart Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Vaccine Schedule 0-18 years"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                outline: "none",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Description / Clinical Target
            </label>
            <input
              type="text"
              placeholder="e.g. Standard immunization matrix for high-risk cardiac and adult patients"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "7px 12px",
                fontSize: 12,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                outline: "none",
              }}
            />
          </div>

          {/* Schedule Workspace */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Scheduled Immunizations ({entries.length})
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                Select a vaccine from the left panel to add to schedule
              </span>
            </div>

            {entries.length === 0 ? (
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 6,
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <strong>No Vaccine Schedule Added</strong>
                <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                  Click on any vaccine from the left panel to attach it to an age milestone.
                </p>
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Vaccine</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600, width: 160 }}>Age / Milestone</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600, width: 80 }}>Doses</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600, width: 160 }}>Route</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right", width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>
                          {entry.vaccine_name}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <select
                            value={entry.milestone}
                            onChange={(e) => handleUpdateEntry(idx, "milestone", e.target.value)}
                            style={{ width: "100%", padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          >
                            {COMMON_MILESTONES.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={entry.doses}
                            onChange={(e) => handleUpdateEntry(idx, "doses", parseInt(e.target.value, 10) || 1)}
                            style={{ width: "100%", boxSizing: "border-box", padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <select
                            value={entry.route}
                            onChange={(e) => handleUpdateEntry(idx, "route", e.target.value)}
                            style={{ width: "100%", padding: "4px 6px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          >
                            <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                            <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                            <option value="Intradermal (ID)">Intradermal (ID)</option>
                            <option value="Oral (PO)">Oral (PO)</option>
                            <option value="Intranasal (IN)">Intranasal (IN)</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveEntry(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              padding: 2,
                            }}
                            title="Remove from schedule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 12, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                padding: "8px 20px",
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Chart"}
            </button>

            <button
              type="button"
              onClick={onBack}
              style={{
                padding: "8px 16px",
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

