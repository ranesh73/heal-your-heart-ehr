import React, { useState, useEffect } from "react";
import { Plus, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import { api } from "../../api";
import { ColorPickerPalette } from "./ColorPickerPalette";

export interface VisitTypeItem {
  id: string;
  name: string;
  mode: string;
  duration: number;
  color: string;
}

export function VisitTypesPage() {
  const [visitTypes, setVisitTypes] = useState<VisitTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VisitTypeItem | null>(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("In Person");
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState("#166eb8");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchVisitTypes = async () => {
    try {
      setLoading(true);
      const data = await api<VisitTypeItem[]>("/calendar/visit-types");
      setVisitTypes(data || []);
      localStorage.setItem("hyh_visit_types", JSON.stringify(data || []));
      window.dispatchEvent(new Event("hyh_visit_types_updated"));
    } catch {
      const saved = localStorage.getItem("hyh_visit_types");
      if (saved) {
        setVisitTypes(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitTypes();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setMode("In Person");
    setDuration(30);
    setColor("#166eb8");
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenEdit = (item: VisitTypeItem) => {
    setEditingItem(item);
    setName(item.name);
    setMode(item.mode || "In Person");
    setDuration(item.duration ?? 30);
    setColor(item.color || "#166eb8");
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: VisitTypeItem = {
      id: editingItem ? editingItem.id : "",
      name: name.trim(),
      mode,
      duration: Number(duration),
      color,
    };

    try {
      await api("/admin/calendar/visit-types", "POST", payload);
      setNotice(editingItem ? "Visit type updated" : "New visit type added");
      setTimeout(() => setNotice(null), 3000);
      setModalOpen(false);
      fetchVisitTypes();
    } catch (err: any) {
      alert("Failed to save visit type: " + (err.detail || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this visit type?")) return;
    try {
      await api(`/admin/calendar/visit-types/${id}`, "DELETE");
      setNotice("Visit type deleted");
      setTimeout(() => setNotice(null), 3000);
      setActiveMenuId(null);
      fetchVisitTypes();
    } catch (err: any) {
      alert("Failed to delete visit type: " + (err.detail || err.message));
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header bar matching Frame 78 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: 0 }}>
          Visit Types
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {notice && (
            <span
              style={{
                fontSize: 12,
                color: "#059669",
                background: "#ecfdf5",
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #a7f3d0",
              }}
            >
              {notice}
            </span>
          )}
          <button
            type="button"
            className="charm-btn-orange-new"
            onClick={handleOpenAdd}
            style={{
              backgroundColor: "#d97706",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            <span>Visit Type</span>
          </button>
        </div>
      </div>

      {/* Table matching Frame 78 */}
      <div className="charm-settings-table-wrapper" style={{ overflowX: "auto" }}>
        <table className="charm-settings-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ width: "10%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Color
              </th>
              <th style={{ width: "45%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Visit Type
              </th>
              <th style={{ width: "25%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Appointment Mode
              </th>
              <th style={{ width: "12%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Duration
              </th>
              <th style={{ width: "8%", textAlign: "center", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  Loading visit types...
                </td>
              </tr>
            ) : visitTypes.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  No visit types configured.
                </td>
              </tr>
            ) : (
              visitTypes.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        backgroundColor: item.color,
                        borderRadius: 2,
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                      title={item.color}
                    />
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13.5, color: "#334155", fontWeight: 500 }}>
                    {item.name}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#64748b" }}>
                    {item.mode}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569", fontWeight: 500 }}>
                    {item.duration} mins
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 4,
                        color: "#64748b",
                        borderRadius: 4,
                      }}
                      title="Actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === item.id && (
                      <div
                        style={{
                          position: "absolute",
                          right: 16,
                          top: 36,
                          background: "#ffffff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          borderRadius: 4,
                          border: "1px solid #e2e8f0",
                          zIndex: 50,
                          minWidth: 110,
                          textAlign: "left",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: 12.5,
                            color: "#334155",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: 12.5,
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            borderTop: "1px solid #f1f5f9",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialog for Add / Edit Visit Type */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 4,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                paddingBottom: 8,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", margin: 0 }}>
                {editingItem ? "Edit Visit Type" : "Add Visit Type"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#475569", fontWeight: 500, marginBottom: 4 }}>
                    Visit Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                      boxSizing: "border-box",
                    }}
                    placeholder="e.g. Cardiology Consultation"
                  />
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#475569", fontWeight: 500, marginBottom: 4 }}>
                      Appointment Mode
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                        backgroundColor: "#fff",
                      }}
                    >
                      <option value="In Person">In Person</option>
                      <option value="Video Consult">Video Consult</option>
                      <option value="Phone Consult">Phone Consult</option>
                    </select>
                  </div>

                  <div style={{ width: 140 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#475569", fontWeight: 500, marginBottom: 4 }}>
                      Duration (mins)
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={0}
                      step={5}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        border: "1px solid #cbd5e1",
                        borderRadius: 3,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#475569", fontWeight: 500, marginBottom: 8 }}>
                    Color
                  </label>
                  <ColorPickerPalette
                    selectedColor={color}
                    onChange={(c) => setColor(c)}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 10,
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#d97706",
                      color: "#ffffff",
                      border: "none",
                      padding: "7px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    {editingItem ? "Update" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      padding: "7px 18px",
                      fontSize: 13,
                      borderRadius: 3,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
