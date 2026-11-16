import React, { useState, useEffect } from "react";
import { Search, Plus, MoreHorizontal, ArrowUpDown, Check, X, Edit, Trash2, SlidersHorizontal } from "lucide-react";
import { api, money } from "../../api";
import { Modal } from "../../ui";

interface ProcedureCode {
  id: string;
  name: string;
  description: string;
  code: string;
  sac_code: string;
  charge: number;
  discount: string;
  is_lab_code: boolean;
  category: string;
  place_of_service: string;
  modifiers: string[];
  additional_details: string;
  active: boolean;
}

export function ProcedureCodesTab() {
  const [viewMode, setViewMode] = useState<"list" | "group">("list");
  const [procedures, setProcedures] = useState<ProcedureCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProcedureCode | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    sac_code: "999312",
    charge: 0,
    category: "Consultation",
    is_lab_code: false,
    place_of_service: "11 - Office",
    modifiers: "",
    additional_details: "-",
  });

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const data = await api<ProcedureCode[]>(`/settings/billing/procedure-codes${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`);
      setProcedures(data || []);
    } catch (err) {
      console.error("Failed to load procedure codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProcedures, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      description: "",
      sac_code: "999312",
      charge: 0,
      category: "Consultation",
      is_lab_code: false,
      place_of_service: "11 - Office",
      modifiers: "",
      additional_details: "-",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProcedureCode) => {
    setEditingItem(p);
    setFormData({
      code: p.code,
      description: p.description,
      sac_code: p.sac_code || "",
      charge: p.charge,
      category: p.category,
      is_lab_code: p.is_lab_code,
      place_of_service: p.place_of_service || "11 - Office",
      modifiers: (p.modifiers || []).join(", "),
      additional_details: p.additional_details || "-",
    });
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this procedure code?")) return;
    try {
      await api(`/settings/billing/procedure-codes/${id}`, "DELETE");
      setProcedures((prev) => prev.filter((p) => p.id !== id));
      setActiveMenuId(null);
    } catch (err) {
      alert("Failed to delete procedure code");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.description) {
      alert("Code and Description are mandatory");
      return;
    }

    try {
      const payload = {
        code: formData.code,
        description: formData.description,
        sac_code: formData.sac_code,
        charge: Number(formData.charge),
        category: formData.category,
        is_lab_code: formData.is_lab_code,
        place_of_service: formData.place_of_service,
        modifiers: formData.modifiers ? formData.modifiers.split(",").map((s) => s.trim()) : [],
        additional_details: formData.additional_details,
      };

      if (editingItem) {
        await api(`/settings/billing/procedure-codes/${editingItem.id}`, "PUT", payload);
      } else {
        await api("/settings/billing/procedure-codes", "POST", payload);
      }
      setModalOpen(false);
      fetchProcedures();
    } catch (err: any) {
      alert(err.message || "Failed to save procedure code");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(procedures.map((p) => p.id));
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

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Sub-bar: List View / Group View tabs on left, Search and + Procedure Code on right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 0 16px 0",
        }}
      >
        <div style={{ display: "flex", gap: 0, border: "1px solid #cbd5e1", borderRadius: 4, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: viewMode === "list" ? 600 : 400,
              background: viewMode === "list" ? "#e2e8f0" : "#ffffff",
              color: "#1e293b",
              border: "none",
              borderRight: "1px solid #cbd5e1",
              cursor: "pointer",
            }}
          >
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("group")}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: viewMode === "group" ? 600 : 400,
              background: viewMode === "group" ? "#e2e8f0" : "#ffffff",
              color: "#1e293b",
              border: "none",
              cursor: "pointer",
            }}
          >
            Group View
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search box */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Procedure Code or Description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* + Procedure Code Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              padding: "7px 16px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Plus size={15} />
            Procedure Code
          </button>

          {/* More actions button */}
          <button
            type="button"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
              color: "#475569",
            }}
            title="More Options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Procedure Codes Table */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
              <th style={{ width: 36, padding: "10px 12px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={procedures.length > 0 && selectedIds.length === procedures.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span>Description</span>
                  <ArrowUpDown size={12} color="#94a3b8" />
                </div>
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Code</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>SAC Code</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Charge</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center" }}>Discount</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "center" }}>Is Lab Code</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Category</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Additional Details</th>
              <th style={{ width: 44, padding: "10px 12px", textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  Loading procedure codes...
                </td>
              </tr>
            ) : procedures.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#64748b" }}>
                  No procedure codes found matching your criteria.
                </td>
              </tr>
            ) : (
              procedures.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isSelected ? "#f8fafc" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: "#1e293b" }}>
                      {p.description}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#334155" }}>{p.code}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{p.sac_code || "—"}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#0f172a", fontWeight: 500 }}>
                      {p.charge.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b" }}>
                      {p.discount || "-"}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: p.is_lab_code ? "#eff6ff" : "#f1f5f9",
                          color: p.is_lab_code ? "#2563eb" : "#475569",
                        }}
                      >
                        {p.is_lab_code ? "Yes" : "No"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#334155" }}>{p.category}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{p.additional_details || "-"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", position: "relative" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === p.id ? null : p.id);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {activeMenuId === p.id && (
                        <div
                          style={{
                            position: "absolute",
                            right: 8,
                            top: 36,
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            zIndex: 40,
                            minWidth: 140,
                            textAlign: "left",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 14px",
                              background: "none",
                              border: "none",
                              fontSize: 13,
                              color: "#334155",
                              cursor: "pointer",
                            }}
                          >
                            <Edit size={14} color="#0f766e" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 14px",
                              background: "none",
                              border: "none",
                              fontSize: 13,
                              color: "#dc2626",
                              cursor: "pointer",
                              borderTop: "1px solid #f1f5f9",
                            }}
                          >
                            <Trash2 size={14} color="#dc2626" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: "right", padding: "10px 4px", fontSize: 13, color: "#64748b", fontWeight: 500 }}>
        Total Count - {procedures.length}
      </div>

      {/* Add / Edit Procedure Code Modal */}
      {modalOpen && (
        <Modal
          title={editingItem ? "Edit Procedure Code" : "Add Procedure Code"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit} style={{ padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Procedure Code (CPT) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 99213"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  SAC Code (GST)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 999312"
                  value={formData.sac_code}
                  onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Visiting Doctor Consultation"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Charge (₹ INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.charge}
                  onChange={(e) => setFormData({ ...formData, charge: parseFloat(e.target.value) || 0 })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                >
                  <option value="Consultation">Consultation</option>
                  <option value="Treatment">Treatment</option>
                  <option value="Emergency">Emergency</option>
                  <option value="HUH-O">HUH-O</option>
                  <option value="HUH-D">HUH-D</option>
                  <option value="HUH Labs">HUH Labs</option>
                  <option value="Surgical">Surgical</option>
                  <option value="Home Care">Home Care</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Place of Service
                </label>
                <select
                  value={formData.place_of_service}
                  onChange={(e) => setFormData({ ...formData, place_of_service: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                >
                  <option value="11 - Office">11 - Office</option>
                  <option value="12 - Home">12 - Home</option>
                  <option value="21 - Inpatient Hospital">21 - Inpatient Hospital</option>
                  <option value="22 - Outpatient Hospital">22 - Outpatient Hospital</option>
                  <option value="23 - Emergency Room">23 - Emergency Room</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Modifiers (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25, 59"
                  value={formData.modifiers}
                  onChange={(e) => setFormData({ ...formData, modifiers: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.is_lab_code}
                  onChange={(e) => setFormData({ ...formData, is_lab_code: e.target.checked })}
                />
                Is Lab Code (Available for Diagnostic Orders)
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ padding: "7px 16px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: "7px 20px", borderRadius: 4, border: "none", background: "#f59e0b", color: "#ffffff", fontWeight: 600, cursor: "pointer" }}
              >
                {editingItem ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

