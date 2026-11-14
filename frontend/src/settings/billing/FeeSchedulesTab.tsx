import React, { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, GripVertical, Edit, Trash2 } from "lucide-react";
import { api } from "../../api";
import { AddFeeSchedulePage } from "./AddFeeSchedulePage";

interface FeeScheduleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  is_default: boolean;
  procedures_count: number;
  products_count: number;
  schedule_type: string;
  active: boolean;
}

export function FeeSchedulesTab() {
  const [schedules, setSchedules] = useState<FeeScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Settings section state
  const [enableFeeSchedules, setEnableFeeSchedules] = useState(true);
  const [defaultSchedule, setDefaultSchedule] = useState("Master Fee Schedule");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Subpage navigation: "list" or "add"
  const [viewState, setViewState] = useState<"list" | "add">("list");
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const fetchFeeSchedules = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        api<FeeScheduleItem[]>("/settings/billing/fee-schedules"),
        api<any>("/settings/billing/fee-schedules-settings").catch(() => null),
      ]);
      setSchedules(list || []);
      if (s) {
        setEnableFeeSchedules(s.enable_fee_schedules ?? true);
        setDefaultSchedule(s.default_fee_schedule || "Master Fee Schedule");
      }
    } catch (err) {
      console.error("Failed to load fee schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeSchedules();
  }, []);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api("/settings/billing/fee-schedules-settings", "PUT", {
        enable_fee_schedules: enableFeeSchedules,
        default_fee_schedule: defaultSchedule,
      });
      alert("Fee schedule settings saved successfully");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert("Default Fee Schedule cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete this fee schedule?")) return;
    try {
      await api(`/settings/billing/fee-schedules/${id}`, "DELETE");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setActiveMenuId(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete fee schedule");
    }
  };

  if (viewState === "add") {
    return (
      <AddFeeSchedulePage
        scheduleId={editingScheduleId}
        onBack={() => {
          setEditingScheduleId(null);
          setViewState("list");
        }}
        onSaved={fetchFeeSchedules}
      />
    );
  }

  const filtered = schedules.filter(
    (s) => !searchQuery.trim() || s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      {/* 1. Informational text */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "14px 18px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          &apos;Fee Schedules&apos; enables practices to provide differential charges to Procedures. Fee schedule can be created with procedures for which differential charge is required. If any procedure is not added in the &apos;Fee Schedule&apos;, then its charge will be taken from &apos;Master Fee Schedule&apos;. Master Fee Schedule is a pre-defined Fee Schedule with all the Procedures defined in &apos;Procedure Codes&apos; section along with the charges. All the Fee Schedules created will be available for selection while generating Invoice. Charge of procedures will be taken from the selected Fee Schedule in the Invoice. Fee Schedules can be created specific to Provider or Payer based on the practice needs.
        </p>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          Practice can now map fee schedules to one or more Providers or Patient Categories. This helps the Practice to automatically select these Fee Schedules when Invoice/Chart Note is created by the mapped Provider or Invoice/Chart Note is created for the mapped Patient.
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          Practice can reorder the fee schedules so that when there is more than one fee schedule to chose when Invoice/Chart Note is created, the most preferred one will be selected.
        </p>
      </div>

      {/* 2. Fee Schedule Settings Box */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "16px 20px", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
          Fee Schedule Settings
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, alignItems: "center", marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
            Enable &apos;Fee Schedules&apos; for the practice
          </label>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="enableFeeSchedules"
                checked={enableFeeSchedules}
                onChange={() => setEnableFeeSchedules(true)}
              />
              Yes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="enableFeeSchedules"
                checked={!enableFeeSchedules}
                onChange={() => setEnableFeeSchedules(false)}
              />
              No
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, alignItems: "start", marginBottom: 18 }}>
          <div style={{ textAlign: "right" }}>
            <label style={{ fontSize: 13, color: "#334155" }}>Choose default Fee Schedule</label>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              (While generating invoice, this &apos;Fee Schedule&apos; will be selected automatically)
            </div>
          </div>
          <div>
            <select
              value={defaultSchedule}
              onChange={(e) => setDefaultSchedule(e.target.value)}
              style={{ width: "100%", maxWidth: 260, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
            >
              <option value="Master Fee Schedule">Master Fee Schedule</option>
              {schedules
                .filter((s) => s.name !== "Master Fee Schedule")
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div style={{ marginLeft: 254 }}>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            style={{
              padding: "7px 22px",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {settingsSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* 3. Fee Schedules List */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 4, padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
            Fee Schedules List
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", minWidth: 240 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by Fee Schedule Name"
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

            <button
              type="button"
              onClick={() => {
                setEditingScheduleId(null);
                setViewState("add");
              }}
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
              }}
            >
              <Plus size={15} />
              Fee Schedule
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Fee Schedule Name</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>Number of Procedures Associated</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600 }}>Number of Products Associated</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Fee Schedule Description</th>
                <th style={{ width: 44, padding: "10px 12px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                    Loading fee schedules...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                    No fee schedules found.
                  </td>
                </tr>
              ) : (
                filtered.map((fs) => (
                  <tr key={fs.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <GripVertical size={14} color="#94a3b8" style={{ cursor: "grab" }} />
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{fs.name}</span>
                        {fs.is_default && (
                          <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: 3, fontWeight: 500 }}>
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "#0f172a" }}>
                      {fs.procedures_count}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "#0f172a" }}>
                      {fs.products_count}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#475569", maxWidth: 360, lineHeight: 1.4 }}>
                      {fs.description || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === fs.id ? null : fs.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {activeMenuId === fs.id && (
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
                            minWidth: 120,
                            textAlign: "left",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScheduleId(fs.id);
                              setViewState("add");
                              setActiveMenuId(null);
                            }}
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
                          {!fs.is_default && (
                            <button
                              type="button"
                              onClick={() => handleDelete(fs.id, fs.is_default)}
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
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, textAlign: "right", fontSize: 12, color: "#64748b" }}>
          Total Count - {filtered.length}
        </div>
      </div>
    </div>
  );
}

