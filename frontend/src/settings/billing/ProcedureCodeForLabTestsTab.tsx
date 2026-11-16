import React, { useState, useEffect } from "react";
import { Search, PlusCircle, Check } from "lucide-react";
import { api } from "../../api";

interface LabMapping {
  id: string;
  test_name: string;
  cpt_desc: string;
  cpt_code: string;
  charge: number;
  lab: string;
}

export function ProcedureCodeForLabTestsTab() {
  const [autoPopulate, setAutoPopulate] = useState(true);
  const [selectedLab, setSelectedLab] = useState("BioChemistry");
  const [searchQuery, setSearchQuery] = useState("");

  const [mappings, setMappings] = useState<LabMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit draft
  const [editDesc, setEditDesc] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCharge, setEditCharge] = useState<number>(0);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const data = await api<LabMapping[]>(`/settings/billing/lab-mappings?lab=${encodeURIComponent(selectedLab)}${q}`);
      setMappings(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to load lab mappings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchMappings, 200);
    return () => clearTimeout(timer);
  }, [selectedLab, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(mappings.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleStartEdit = (m: LabMapping) => {
    setEditingId(m.id);
    setEditDesc(m.cpt_desc);
    setEditCode(m.cpt_code);
    setEditCharge(m.charge);
  };

  const handleSaveRow = async (m: LabMapping) => {
    try {
      await api(`/settings/billing/lab-mappings/${m.id}`, "PUT", {
        cpt_desc: editDesc,
        cpt_code: editCode,
        charge: Number(editCharge),
      });
      setEditingId(null);
      fetchMappings();
    } catch (err) {
      alert("Failed to save lab mapping");
    }
  };

  const handleUnmapSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one test to unmap");
      return;
    }
    if (!confirm(`Unmap procedure codes for ${selectedIds.length} selected tests?`)) return;
    try {
      await api("/settings/billing/lab-mappings/unmap", "POST", { ids: selectedIds });
      fetchMappings();
    } catch (err) {
      alert("Failed to unmap tests");
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      {/* Top Auto-populate Banner */}
      <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 14, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#1e293b", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoPopulate}
            onChange={(e) => setAutoPopulate(e.target.checked)}
          />
          <span>Auto-populate Procedure Codes in Invoice for Lab Tests in Chart Notes</span>
        </label>
        <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 24, marginTop: 2 }}>
          ( This enables automatic filling of Procedure Codes during Invoice generation for Lab Tests ordered )
        </div>
      </div>

      {/* Filter Row: Lab dropdown, Unmap button, Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
            <span style={{ fontWeight: 600 }}>Lab</span>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, minWidth: 160 }}
            >
              <option value="BioChemistry">BioChemistry</option>
              <option value="Hematology">Hematology</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Clinical Pathology">Clinical Pathology</option>
              <option value="all">All Labs</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleUnmapSelected}
            style={{
              padding: "6px 14px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              fontSize: 13,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Unmap Procedure Codes for Lab Tests
          </button>
        </div>

        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search by Test Name or Test Code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 30px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
              <th style={{ width: 36, padding: "10px 12px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={mappings.length > 0 && selectedIds.length === mappings.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, width: "35%" }}>Test [ Code ]</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>
                Procedure Code (CPT)
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>
                  <span style={{ flex: 3 }}>Description</span>
                  <span style={{ width: 80 }}>Code</span>
                  <span style={{ width: 80, textAlign: "right" }}>Charge (Rs.)</span>
                </div>
              </th>
              <th style={{ width: 80, padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  Loading tests...
                </td>
              </tr>
            ) : mappings.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  No tests found for the selected category.
                </td>
              </tr>
            ) : (
              mappings.map((m) => {
                const isEditing = editingId === m.id;
                const isSelected = selectedIds.includes(m.id);
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9", background: isSelected ? "#f8fafc" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(m.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: "#1e293b" }}>
                      {m.test_name}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Procedure Code or Description"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            style={{ flex: 3, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          />
                          <input
                            type="text"
                            placeholder="Code"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            style={{ width: 80, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                          />
                          <input
                            type="number"
                            placeholder="0.00"
                            value={editCharge}
                            onChange={(e) => setEditCharge(parseFloat(e.target.value) || 0)}
                            style={{ width: 80, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#334155" }}>
                          <span style={{ flex: 3, color: m.cpt_desc ? "#1e293b" : "#94a3b8" }}>
                            {m.cpt_desc || "Search by Procedure Code or Description"}
                          </span>
                          <span style={{ width: 80, color: "#475569" }}>{m.cpt_code || "—"}</span>
                          <span style={{ width: 80, textAlign: "right", color: "#0f172a", fontWeight: 500 }}>
                            {m.charge.toFixed(2)}
                          </span>
                          {!m.cpt_code && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(m)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#0d9488", padding: 0 }}
                              title="Map code"
                            >
                              <PlusCircle size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleSaveRow(m)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0d9488",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontWeight: 500,
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          {m.cpt_code ? "Edit" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}

