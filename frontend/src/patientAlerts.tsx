import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  FileWarning,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";

export type AlertTypeKey =
  | "medical_emergency"
  | "need_report"
  | "patient_status"
  | "contraindication";

export interface AlertCategoryMeta {
  key: AlertTypeKey;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const ALERT_CATEGORIES: Record<AlertTypeKey, AlertCategoryMeta> = {
  medical_emergency: {
    key: "medical_emergency",
    label: "Medical Emergency",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  need_report: {
    key: "need_report",
    label: "Need Report",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  patient_status: {
    key: "patient_status",
    label: "Patient Status",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  contraindication: {
    key: "contraindication",
    label: "Allergy / Contraindication",
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
};

export const ALERT_CATEGORY_LIST: AlertCategoryMeta[] = [
  ALERT_CATEGORIES.medical_emergency,
  ALERT_CATEGORIES.need_report,
  ALERT_CATEGORIES.patient_status,
  ALERT_CATEGORIES.contraindication,
];

export const ALERT_DESCRIPTION_PRESETS: Array<{ text: string; defaultType: AlertTypeKey }> = [
  { text: "Critical Heart Failure", defaultType: "medical_emergency" },
  { text: "Volume overload", defaultType: "medical_emergency" },
  { text: "Unstable Angina", defaultType: "medical_emergency" },
  { text: "Need Report", defaultType: "need_report" },
];

export function getAlertMeta(type?: string): AlertCategoryMeta {
  if (type && type in ALERT_CATEGORIES) {
    return ALERT_CATEGORIES[type as AlertTypeKey];
  }
  return ALERT_CATEGORIES.medical_emergency;
}

function formatAlertDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return value;
  }
}

/* Distinct Category Symbol Icons */
export function AlertSymbolIcon({
  type,
  size = 16,
}: {
  type?: string;
  size?: number;
}) {
  const meta = getAlertMeta(type);
  if (meta.key === "medical_emergency") {
    return (
      <span
        className="pa-symbol-icon"
        title={meta.label}
        style={{ color: meta.color, width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2.5L22.2 20.5H1.8L12 2.5Z"
            fill="#DC2626"
            stroke="#B91C1C"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect x="11" y="9" width="2" height="6" rx="1" fill="#FFFFFF" />
          <circle cx="12" cy="17.6" r="1.2" fill="#FFFFFF" />
        </svg>
      </span>
    );
  }
  if (meta.key === "need_report") {
    return (
      <span
        className="pa-symbol-icon"
        title={meta.label}
        style={{ color: meta.color, width: size, height: size }}
      >
        <FileWarning size={size} strokeWidth={2.2} />
      </span>
    );
  }
  if (meta.key === "patient_status") {
    return (
      <span
        className="pa-symbol-icon"
        title={meta.label}
        style={{ color: meta.color, width: size, height: size }}
      >
        <UserCheck size={size} strokeWidth={2.2} />
      </span>
    );
  }
  return (
    <span
      className="pa-symbol-icon"
      title={meta.label}
      style={{ color: meta.color, width: size, height: size }}
    >
      <ShieldAlert size={size} strokeWidth={2.2} />
    </span>
  );
}

/* ============================================================================
   1. INLINE ALERT ICON + FLOATING POPOVER (Calendar Cards + Patient Header + Rail)
   ============================================================================ */
export function PatientAlertBadgePopover({
  alerts,
  patientId,
  onManageAlerts,
  compact = false,
  align = "left",
}: {
  alerts?: Row[];
  patientId?: string;
  onManageAlerts?: () => void;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (!alerts || alerts.length === 0) return null;

  // Deduplicate distinct category icons for compact badge strip (ordered by severity from backend)
  const uniqueTypes = Array.from(new Set(alerts.map((a) => a.alert_type || "medical_emergency")));

  const handleManage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    setPinned(false);
    if (onManageAlerts) {
      onManageAlerts();
    } else if (patientId) {
      navigate(`/patients/${patientId}?section=Alerts`);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="pa-popover-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`pa-symbol-trigger ${compact ? "compact" : ""}`}
        aria-label={`Patient Alerts (${alerts.length})`}
        title={`${alerts.length} Active Alert${alerts.length === 1 ? "" : "s"} — Click to view`}
        onClick={(e) => {
          e.stopPropagation();
          const next = !pinned;
          setPinned(next);
          setOpen(next);
        }}
      >
        {uniqueTypes.slice(0, compact ? 2 : 4).map((t) => (
          <AlertSymbolIcon key={t} type={t} size={compact ? 14 : 16} />
        ))}
        {alerts.length > 1 && !compact && (
          <span className="pa-symbol-count">{alerts.length}</span>
        )}
      </button>

      {open && (
        <div
          className={`pa-popover-card ${align === "right" ? "align-right" : ""}`}
          role="dialog"
          aria-label="Active Patient Alerts"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pa-popover-header">
            <strong>Alerts</strong>
            <button
              type="button"
              className="pa-popover-close"
              aria-label="Close alerts"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setPinned(false);
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="pa-popover-list">
            {alerts.map((a) => {
              const meta = getAlertMeta(a.alert_type);
              return (
                <div key={a.id} className="pa-popover-item">
                  <AlertSymbolIcon type={a.alert_type} size={15} />
                  <div className="pa-popover-item-body">
                    <div className="pa-popover-item-desc">{a.description}</div>
                    <span
                      className="pa-type-chip-sm"
                      style={{
                        color: meta.color,
                        background: meta.bg,
                        borderColor: meta.border,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {(onManageAlerts || patientId) && (
            <div className="pa-popover-footer">
              <button
                type="button"
                className="pa-manage-link"
                onClick={handleManage}
              >
                Manage Alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. AUTOMATIC "ON-OPEN" PATIENT CHART POPUP MODAL (Manage Alerts + Got it)
   ============================================================================ */
export function PatientChartAlertsPopup({
  alerts,
  onManageAlerts,
  onDismiss,
}: {
  alerts: Row[];
  onManageAlerts: () => void;
  onDismiss: () => void;
}) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="pa-chart-popup-backdrop" role="dialog" aria-modal="true" aria-label="Patient Alerts">
      <div className="pa-chart-popup-card">
        <div className="pa-chart-popup-header">
          <h3>Alerts</h3>
        </div>
        <div className="pa-chart-popup-body">
          {alerts.map((a) => {
            const meta = getAlertMeta(a.alert_type);
            return (
              <div key={a.id} className="pa-chart-popup-row">
                <AlertSymbolIcon type={a.alert_type} size={17} />
                <div className="pa-chart-popup-text">
                  <span className="pa-chart-popup-desc">{a.description}</span>
                  <span
                    className="pa-type-chip-sm"
                    style={{
                      color: meta.color,
                      background: meta.bg,
                      borderColor: meta.border,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pa-chart-popup-footer">
          <button
            type="button"
            className="pa-manage-link"
            onClick={onManageAlerts}
          >
            Manage Alerts
          </button>
          <button
            type="button"
            className="pa-got-it-btn"
            onClick={onDismiss}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. ADD / EDIT ALERT MODAL (Alert Type Selector + Combobox with Presets)
   ============================================================================ */
function AlertFormModal({
  patientId,
  existing,
  onClose,
  onSaved,
}: {
  patientId: string;
  existing?: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useApp();
  const [alertType, setAlertType] = useState<AlertTypeKey>(
    (existing?.alert_type as AlertTypeKey) || "medical_emergency",
  );
  const [description, setDescription] = useState<string>(existing?.description || "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filteredPresets = useMemo(() => {
    const q = description.trim().toLowerCase();
    if (!q) return ALERT_DESCRIPTION_PRESETS;
    return ALERT_DESCRIPTION_PRESETS.filter((p) =>
      p.text.toLowerCase().includes(q),
    );
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Alert description is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (existing?.id) {
        await api(`/alerts/${existing.id}`, "PUT", {
          alert_type: alertType,
          description: description.trim(),
        });
        notify("Patient alert updated.");
      } else {
        await api(`/patients/${patientId}/alerts`, "POST", {
          alert_type: alertType,
          description: description.trim(),
        });
        notify("Patient alert added.");
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div
        className="ct-modal-dialog pa-add-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "Edit Alert" : "Add Alert"}
      >
        <div className="ct-modal-header">
          <h3>{existing ? "Edit Alert" : "Add Alert"}</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="ct-modal-body">
          {error && <div className="ct-error-box">{error}</div>}

          <div className="pa-form-rows">
            {/* Field 1: Alert Type * */}
            <div className="pa-form-row">
              <label htmlFor="pa-alert-type">
                Alert Type <em className="req">*</em>
              </label>
              <div>
                <select
                  id="pa-alert-type"
                  className="pa-select-input"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as AlertTypeKey)}
                >
                  {ALERT_CATEGORY_LIST.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="pa-type-selector-pills">
                  {ALERT_CATEGORY_LIST.map((cat) => {
                    const active = alertType === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className={`pa-type-option-pill ${active ? "active" : ""}`}
                        style={
                          active
                            ? {
                                color: cat.color,
                                background: cat.bg,
                                borderColor: cat.color,
                              }
                            : undefined
                        }
                        onClick={() => setAlertType(cat.key)}
                      >
                        <AlertSymbolIcon type={cat.key} size={14} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Field 2: Alert Description * (Combobox with clinical presets + free text) */}
            <div className="pa-form-row">
              <label htmlFor="pa-alert-desc">
                Alert Description <em className="req">*</em>
              </label>
              <div ref={comboRef} className="pa-combobox-wrap">
                <input
                  id="pa-alert-desc"
                  className="pa-combobox-input"
                  value={description}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDropdownOpen(true);
                  }}
                  placeholder="Select a preset or type custom alert..."
                  autoComplete="off"
                  required
                />
                {dropdownOpen && filteredPresets.length > 0 && (
                  <div className="pa-preset-dropdown" role="listbox">
                    {filteredPresets.map((preset) => (
                      <button
                        key={preset.text}
                        type="button"
                        role="option"
                        className="pa-preset-option"
                        onClick={() => {
                          setDescription(preset.text);
                          if (!existing) setAlertType(preset.defaultType);
                          setDropdownOpen(false);
                        }}
                      >
                        <AlertSymbolIcon type={preset.defaultType} size={14} />
                        <span>{preset.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pa-form-row">
              <span />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button type="submit" className="ct-btn-orange" disabled={saving}>
                  {saving ? "Saving..." : existing ? "Save" : "Add"}
                </button>
                <button type="button" className="ct-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   4. PATIENT ALERTS TAB (Patient Chart -> Alerts)
   ============================================================================ */
export function PatientAlertsTab({
  patientId,
  onAlertsChanged,
}: {
  patientId: string;
  onAlertsChanged?: () => void;
}) {
  const { notify } = useApp();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const alertsQuery = useQuery({
    queryKey: ["patient-alerts", branch, patientId],
    queryFn: () => api<Row[]>(`/patients/${patientId}/alerts`),
    enabled: Boolean(patientId),
  });

  const alerts = alertsQuery.data || [];

  const syncAllViews = () => {
    void qc.invalidateQueries({ queryKey: ["patient-alerts"] });
    void qc.invalidateQueries({ queryKey: ["chart"] });
    void qc.invalidateQueries({ queryKey: ["patients"] });
    void qc.invalidateQueries({ queryKey: ["appointments"] });
    onAlertsChanged?.();
  };

  const handleDelete = async (alertRow: Row) => {
    setDeletingId(alertRow.id);
    try {
      await api(`/alerts/${alertRow.id}`, "DELETE");
      notify("Patient alert deleted.");
      syncAllViews();
    } catch (err: any) {
      notify(err?.message || "Unable to delete alert");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pa-tab-shell">
      {/* Top Header Bar: Left Alerts, Right primary orange + Alert */}
      <div className="pa-tab-header">
        <h2 className="pa-tab-title">Alerts</h2>
        <button
          type="button"
          className="ct-btn-orange"
          onClick={() => {
            setEditing(null);
            setShowAdd(true);
          }}
        >
          <Plus size={15} /> Alert
        </button>
      </div>

      {/* Alerts Data Table */}
      <div className="pa-table-wrap">
        <table className="pa-table">
          <thead>
            <tr>
              <th style={{ width: "54%" }}>Alert</th>
              <th style={{ width: "22%" }}>Added by</th>
              <th style={{ width: "14%" }}>Date</th>
              <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alertsQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="pa-empty-row">
                  Loading alerts...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={4} className="pa-empty-row">
                  No data available
                </td>
              </tr>
            ) : (
              alerts.map((a) => {
                const meta = getAlertMeta(a.alert_type);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="pa-table-alert-cell">
                        <AlertSymbolIcon type={a.alert_type} size={17} />
                        <span
                          className="pa-type-chip"
                          style={{
                            color: meta.color,
                            background: meta.bg,
                            borderColor: meta.border,
                          }}
                        >
                          {meta.label}
                        </span>
                        <span className="pa-table-alert-desc">{a.description}</span>
                      </div>
                    </td>
                    <td>{a.created_by_name || "Staff"}</td>
                    <td>{formatAlertDate(a.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="pa-row-actions">
                        <button
                          type="button"
                          className="pa-action-icon-btn"
                          title="Edit Alert"
                          aria-label="Edit Alert"
                          onClick={() => {
                            setEditing(a);
                            setShowAdd(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="pa-action-icon-btn danger"
                          title="Delete Alert"
                          aria-label="Delete Alert"
                          disabled={deletingId === a.id}
                          onClick={() => void handleDelete(a)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AlertFormModal
          patientId={patientId}
          existing={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            syncAllViews();
          }}
        />
      )}
    </div>
  );
}
