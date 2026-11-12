import React, { useState, useEffect } from "react";
import { Plus, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import { api } from "../../api";
import { ColorPickerPalette } from "./ColorPickerPalette";

export interface EventTypeItem {
  id: string;
  name: string;
  color: string;
}

export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventTypeItem | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#14b8a6");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchEventTypes = async () => {
    try {
      setLoading(true);
      const data = await api<EventTypeItem[]>("/calendar/event-types");
      setEventTypes(data || []);
      localStorage.setItem("hyh_event_types", JSON.stringify(data || []));
    } catch {
      const saved = localStorage.getItem("hyh_event_types");
      if (saved) {
        setEventTypes(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setColor("#14b8a6");
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenEdit = (item: EventTypeItem) => {
    setEditingItem(item);
    setName(item.name);
    setColor(item.color || "#14b8a6");
    setModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: EventTypeItem = {
      id: editingItem ? editingItem.id : "",
      name: name.trim(),
      color,
    };

    try {
      await api("/admin/calendar/event-types", "POST", payload);
      setNotice(editingItem ? "Event type updated" : "New event type added");
      setTimeout(() => setNotice(null), 3000);
      setModalOpen(false);
      fetchEventTypes();
    } catch (err: any) {
      alert("Failed to save event type: " + (err.detail || err.message));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event type?")) return;
    try {
      await api(`/admin/calendar/event-types/${id}`, "DELETE");
      setNotice("Event type deleted");
      setTimeout(() => setNotice(null), 3000);
      setActiveMenuId(null);
      fetchEventTypes();
    } catch (err: any) {
      alert("Failed to delete event type: " + (err.detail || err.message));
    }
  };

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Header bar matching Frame 87 */}
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
          Event Type
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
            <span>Event Type</span>
          </button>
        </div>
      </div>

      {/* Table matching Frame 87 */}
      <div className="charm-settings-table-wrapper" style={{ overflowX: "auto" }}>
        <table className="charm-settings-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ width: "15%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Color
              </th>
              <th style={{ width: "75%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Event Type
              </th>
              <th style={{ width: "10%", textAlign: "center", padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  Loading event types...
                </td>
              </tr>
            ) : eventTypes.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                  No event types configured.
                </td>
              </tr>
            ) : (
              eventTypes.map((item) => (
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

      {/* Modal Dialog matching Frame 90 */}
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
              maxWidth: 440,
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
                {editingItem ? "Update Event Type" : "Add Event Type"}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <label style={{ width: 85, fontSize: 13, color: "#475569", fontWeight: 500 }}>
                    Event Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      fontSize: 13,
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                      outline: "none",
                    }}
                    placeholder="Enter event name"
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <label style={{ width: 85, fontSize: 13, color: "#475569", fontWeight: 500, paddingTop: 4 }}>
                    Event Color
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
                    Update
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
