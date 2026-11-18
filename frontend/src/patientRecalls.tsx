import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Eye, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, branch, Row } from "./api";
import { useApp } from "./context";

function formatRecallDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
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

function computePreviewDueDate(
  direction: "after" | "before",
  value: number,
  unit: "days" | "weeks" | "months",
): string {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const signed = direction === "after" ? value : -value;
  if (unit === "days") {
    d.setDate(d.getDate() + signed);
  } else if (unit === "weeks") {
    d.setDate(d.getDate() + signed * 7);
  } else {
    const origDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + signed);
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(origDay, maxDay));
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ============================================================================
   1. ADD / EDIT RECALL MODAL (Exact ChARM Layout)
   ============================================================================ */
function AddOrEditRecallModal({
  patientId,
  recall,
  recallTypes,
  preferences,
  providers,
  defaultProviderId,
  onClose,
  onSaved,
}: {
  patientId: string;
  recall?: Row | null;
  recallTypes: Row[];
  preferences?: Row;
  providers: Row[];
  defaultProviderId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useApp();
  const isEdit = Boolean(recall);

  const defaultTypeId =
    recall?.recall_type_id ||
    recallTypes.find((t) => t.name.toLowerCase() === "reassessment visit")?.id ||
    recallTypes[0]?.id ||
    "";

  const [typeId, setTypeId] = useState(defaultTypeId);
  const [notes, setNotes] = useState(recall?.notes || "");
  const [dateDirection, setDateDirection] = useState<"after" | "before">("after");
  const [intervalValue, setIntervalValue] = useState<string>(isEdit ? "" : "3");
  const [intervalUnit, setIntervalUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [directDueDate, setDirectDueDate] = useState<string>(recall?.due_date || "");
  const [useDirectDate, setUseDirectDate] = useState<boolean>(isEdit);
  const [providerId, setProviderId] = useState(
    recall?.provider_id || defaultProviderId || providers[0]?.id || "",
  );

  const initialAutoEnabled = isEdit
    ? Boolean(recall?.auto_reminder_enabled)
    : Boolean(preferences?.default_email_enabled || preferences?.default_sms_enabled || true);
  const initialEmailEnabled = isEdit
    ? recall?.email_reminder_days != null
    : Boolean(preferences?.default_email_enabled ?? true);
  const initialSmsEnabled = isEdit
    ? recall?.sms_reminder_days != null
    : Boolean(preferences?.default_sms_enabled ?? true);

  const [autoReminder, setAutoReminder] = useState(initialAutoEnabled);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [emailDays, setEmailDays] = useState<number>(
    recall?.email_reminder_days ?? preferences?.email_days_before ?? 3,
  );
  const [smsEnabled, setSmsEnabled] = useState(initialSmsEnabled);
  const [smsDays, setSmsDays] = useState<number>(
    recall?.sms_reminder_days ?? preferences?.sms_days_before ?? 3,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const computedDateIso = useMemo(() => {
    if (useDirectDate && directDueDate) return directDueDate;
    const num = Number(intervalValue);
    if (!Number.isFinite(num) || intervalValue === "") return "";
    return computePreviewDueDate(dateDirection, Math.max(0, Math.floor(num)), intervalUnit);
  }, [useDirectDate, directDueDate, dateDirection, intervalValue, intervalUnit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId) {
      setError("Please select a recall type.");
      return;
    }
    if (!notes.trim()) {
      setError("Please enter recall notes.");
      return;
    }
    if (!computedDateIso) {
      setError("Please enter a due date interval or pick an exact date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit && recall) {
        await api(`/recalls/${recall.id}`, "PATCH", {
          recall_type_id: typeId,
          notes: notes.trim(),
          due_date: computedDateIso,
          provider_id: providerId,
          auto_reminder_enabled: autoReminder,
          email_reminder_days: autoReminder && emailEnabled ? Number(emailDays) : null,
          sms_reminder_days: autoReminder && smsEnabled ? Number(smsDays) : null,
          clear_email_reminder: !(autoReminder && emailEnabled),
          clear_sms_reminder: !(autoReminder && smsEnabled),
        });
        notify("Recall updated successfully.");
      } else {
        await api(`/patients/${patientId}/recalls`, "POST", {
          recall_type_id: typeId,
          notes: notes.trim(),
          due_date: computedDateIso,
          date_direction: dateDirection,
          interval_value: intervalValue ? Number(intervalValue) : 0,
          interval_unit: intervalUnit,
          provider_id: providerId,
          auto_reminder_enabled: autoReminder,
          email_enabled: autoReminder && emailEnabled,
          email_reminder_days: autoReminder && emailEnabled ? Number(emailDays) : null,
          sms_enabled: autoReminder && smsEnabled,
          sms_reminder_days: autoReminder && smsEnabled ? Number(smsDays) : null,
        });
        notify("Patient recall added.");
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
      <div className="ct-modal-dialog ct-modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <h3>{isEdit ? "Edit Recall" : "Add Recall"}</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="ct-modal-body">
          {error && <div className="ct-error-box">{error}</div>}
          <div className="pr-modal-form">
            {/* Type * */}
            <div className="pr-form-row">
              <label>
                Type <em className="req">*</em>
              </label>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
                {recallTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes * with red helper text */}
            <div className="pr-form-row">
              <div className="pr-label-col">
                <label>
                  Notes <em className="req">*</em>
                </label>
                <div className="pr-red-helper">
                  ** Shared with patient if reminder is enabled
                </div>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter recall instructions or follow-up details..."
                required
              />
            </div>

            {/* Due Date * */}
            <div className="pr-form-row">
              <label>
                Due Date <em className="req">*</em>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {!useDirectDate ? (
                  <div className="pr-due-composite">
                    <select
                      value={dateDirection}
                      onChange={(e) => setDateDirection(e.target.value as "after" | "before")}
                    >
                      <option value="after">after</option>
                      <option value="before">before</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={3650}
                      value={intervalValue}
                      onChange={(e) => setIntervalValue(e.target.value)}
                      placeholder="3"
                    />
                    <select
                      value={intervalUnit}
                      onChange={(e) =>
                        setIntervalUnit(e.target.value as "days" | "weeks" | "months")
                      }
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </div>
                ) : (
                  <input
                    type="date"
                    value={directDueDate}
                    onChange={(e) => setDirectDueDate(e.target.value)}
                    required
                  />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5 }}>
                  <span style={{ color: "#475569" }}>
                    {computedDateIso ? `Computed Date: ${formatRecallDate(computedDateIso)}` : "Enter interval"}
                  </span>
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: 11.5 }}
                    onClick={() => {
                      if (!useDirectDate && computedDateIso) {
                        setDirectDueDate(computedDateIso);
                      }
                      setUseDirectDate((prev) => !prev);
                    }}
                  >
                    {useDirectDate ? "Use interval (after/before)" : "Pick exact date"}
                  </button>
                </div>
              </div>
            </div>

            {/* Provider * */}
            <div className="pr-form-row">
              <label>
                Provider <em className="req">*</em>
              </label>
              <select value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Send Auto Reminders to Patient */}
            <div className="pr-form-row">
              <label>Send Auto Reminders to Patient</label>
              <div style={{ paddingTop: 5 }}>
                <input
                  type="checkbox"
                  checked={autoReminder}
                  onChange={(e) => setAutoReminder(e.target.checked)}
                />
              </div>
            </div>

            {/* Email Reminder */}
            <div className="pr-form-row">
              <label style={{ color: autoReminder ? "#334155" : "#94a3b8" }}>Email</label>
              <div className="pr-reminder-inline">
                <input
                  type="checkbox"
                  disabled={!autoReminder}
                  checked={autoReminder && emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                />
                <span>before</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  disabled={!autoReminder || !emailEnabled}
                  value={emailDays}
                  onChange={(e) => setEmailDays(Number(e.target.value))}
                  className="pr-days-input"
                />
                <span>days</span>
              </div>
            </div>

            {/* Text Reminder */}
            <div className="pr-form-row">
              <label style={{ color: autoReminder ? "#334155" : "#94a3b8" }}>Text</label>
              <div className="pr-reminder-inline">
                <input
                  type="checkbox"
                  disabled={!autoReminder}
                  checked={autoReminder && smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                />
                <span>before</span>
                <input
                  type="number"
                  min={0}
                  max={365}
                  disabled={!autoReminder || !smsEnabled}
                  value={smsDays}
                  onChange={(e) => setSmsDays(Number(e.target.value))}
                  className="pr-days-input"
                />
                <span>days</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pr-form-footer">
              <button type="submit" className="ct-btn-orange" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Save" : "Add"}
              </button>
              <button type="button" className="ct-btn-cancel" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================================
   2. FOLLOW UP TEMPLATES MODAL (Exact ChARM Layout)
   ============================================================================ */
interface TemplateRowDraft {
  checked: boolean;
  recall_type_name: string;
  notes: string;
  date_direction: "after" | "before";
  interval_value: number;
  interval_unit: "days" | "weeks" | "months";
  email_enabled: boolean;
  email_days_before: number;
  sms_enabled: boolean;
  sms_days_before: number;
}

function FollowUpTemplatesModal({
  patientId,
  templates,
  recallTypes,
  defaultProviderId,
  onClose,
  onApplied,
  onTemplateSaved,
}: {
  patientId: string;
  templates: Row[];
  recallTypes: Row[];
  defaultProviderId: string;
  onClose: () => void;
  onApplied: () => void;
  onTemplateSaved: () => void;
}) {
  const { notify } = useApp();
  const practiceTemplates = templates.filter((t) => t.category === "PRACTICE");
  const myTemplates = templates.filter((t) => t.category === "MY");

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    practiceTemplates[0]?.id || myTemplates[0]?.id || "",
  );
  const [rows, setRows] = useState<TemplateRowDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [error, setError] = useState("");

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    if (!activeTemplate) return;
    const mapped: TemplateRowDraft[] = (activeTemplate.items || []).map((it: Row) => ({
      checked: true,
      recall_type_name: it.recall_type_name || recallTypes[0]?.name || "Reassessment visit",
      notes: it.notes || "",
      date_direction: it.date_direction === "before" ? "before" : "after",
      interval_value: Number(it.interval_value ?? 3),
      interval_unit: (it.interval_unit || "months") as "days" | "weeks" | "months",
      email_enabled: Boolean(it.email_enabled ?? true),
      email_days_before: Number(it.email_days_before ?? 3),
      sms_enabled: Boolean(it.sms_enabled ?? true),
      sms_days_before: Number(it.sms_days_before ?? 3),
    }));
    setRows(mapped);
  }, [activeTemplate, recallTypes]);

  const updateRow = (idx: number, patch: Partial<TemplateRowDraft>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const allChecked = rows.length > 0 && rows.every((r) => r.checked);

  const handleApply = async () => {
    const selected = rows.filter((r) => r.checked);
    if (!selected.length) {
      setError("Select at least one follow-up row to add.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(`/patients/${patientId}/recalls`, "POST", {
        items: selected.map((r) => ({
          recall_type_name: r.recall_type_name,
          notes: r.notes.trim(),
          date_direction: r.date_direction,
          interval_value: Number(r.interval_value) || 0,
          interval_unit: r.interval_unit,
          provider_id: defaultProviderId,
          auto_reminder_enabled: r.email_enabled || r.sms_enabled,
          email_enabled: r.email_enabled,
          email_reminder_days: r.email_enabled ? Number(r.email_days_before) : null,
          sms_enabled: r.sms_enabled,
          sms_reminder_days: r.sms_enabled ? Number(r.sms_days_before) : null,
        })),
      });
      notify(`Added ${selected.length} recall${selected.length === 1 ? "" : "s"} from template.`);
      onApplied();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsMyTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError("Enter a name for your custom template.");
      return;
    }
    if (!rows.length) return;
    setSaving(true);
    setError("");
    try {
      const created = await api<Row>("/recall-templates", "POST", {
        category: "MY",
        name: newTemplateName.trim(),
        items: rows.map(({ checked: _c, ...rest }) => rest),
      });
      setNewTemplateName("");
      setShowNewForm(false);
      setSelectedTemplateId(created.id);
      notify(`Saved custom template "${created.name}".`);
      onTemplateSaved();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div className="ct-modal-dialog pr-templates-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <h3>Follow up Templates</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="pr-templates-body">
          {/* Left Sidebar */}
          <aside className="pr-templates-sidebar">
            <div className="pr-templates-group-title">PRACTICE TEMPLATES</div>
            <div className="pr-templates-group-list">
              {practiceTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pr-template-nav-item ${selectedTemplateId === t.id ? "active" : ""}`}
                  onClick={() => setSelectedTemplateId(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="pr-templates-group-title" style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0" }}>
              <span>MY TEMPLATES</span>
              <button
                type="button"
                className="text-link"
                style={{ fontSize: 11, fontWeight: 600 }}
                onClick={() => setShowNewForm((prev) => !prev)}
              >
                + Save
              </button>
            </div>
            <div className="pr-templates-group-list">
              {myTemplates.length === 0 ? (
                <div style={{ padding: "8px 12px", fontSize: 11.5, color: "#94a3b8" }}>
                  No custom templates yet
                </div>
              ) : (
                myTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pr-template-nav-item ${selectedTemplateId === t.id ? "active" : ""}`}
                    onClick={() => setSelectedTemplateId(t.id)}
                  >
                    {t.name}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Right Template Items Table */}
          <div className="pr-templates-main">
            {error && <div className="ct-error-box">{error}</div>}

            {showNewForm && (
              <div className="pr-save-template-bar">
                <input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="New My Template name (e.g. 6-Month Post-EECP)"
                />
                <button
                  type="button"
                  className="ct-btn-orange"
                  onClick={() => void handleSaveAsMyTemplate()}
                  disabled={saving}
                >
                  Save Template
                </button>
                <button
                  type="button"
                  className="ct-btn-cancel"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="pr-templates-table-wrap">
              <table className="pr-templates-table">
                <thead>
                  <tr>
                    <th style={{ width: 32, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={(e) =>
                          setRows((prev) => prev.map((r) => ({ ...r, checked: e.target.checked })))
                        }
                      />
                    </th>
                    <th style={{ width: 170 }}>Type</th>
                    <th style={{ width: 245 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span>Notes</span>
                        <span className="pr-red-helper">
                          ** Shared with patient if reminder is enabled
                        </span>
                      </div>
                    </th>
                    <th style={{ width: 205 }}>Date</th>
                    <th style={{ width: 190 }}>Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 12 }}>
                        <input
                          type="checkbox"
                          checked={r.checked}
                          onChange={(e) => updateRow(idx, { checked: e.target.checked })}
                        />
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <select
                          value={r.recall_type_name}
                          onChange={(e) => updateRow(idx, { recall_type_name: e.target.value })}
                          className="pr-tmpl-input"
                        >
                          {recallTypes.map((rt) => (
                            <option key={rt.id} value={rt.name}>
                              {rt.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <textarea
                          rows={3}
                          value={r.notes}
                          onChange={(e) => updateRow(idx, { notes: e.target.value })}
                          className="pr-tmpl-textarea"
                        />
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <div className="pr-tmpl-date-row">
                          <select
                            value={r.date_direction}
                            onChange={(e) =>
                              updateRow(idx, {
                                date_direction: e.target.value as "after" | "before",
                              })
                            }
                          >
                            <option value="after">after</option>
                            <option value="before">before</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            max={3650}
                            value={r.interval_value}
                            onChange={(e) =>
                              updateRow(idx, { interval_value: Number(e.target.value) })
                            }
                            style={{ width: 46 }}
                          />
                          <select
                            value={r.interval_unit}
                            onChange={(e) =>
                              updateRow(idx, {
                                interval_unit: e.target.value as "days" | "weeks" | "months",
                              })
                            }
                          >
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                            <option value="months">months</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <div className="pr-tmpl-reminder-col">
                          <label>
                            <span>Email</span>
                            <input
                              type="checkbox"
                              checked={r.email_enabled}
                              onChange={(e) =>
                                updateRow(idx, { email_enabled: e.target.checked })
                              }
                            />
                            <span>before</span>
                            <input
                              type="number"
                              min={0}
                              max={365}
                              disabled={!r.email_enabled}
                              value={r.email_days_before}
                              onChange={(e) =>
                                updateRow(idx, { email_days_before: Number(e.target.value) })
                              }
                              className="pr-days-input-sm"
                            />
                            <span>days</span>
                          </label>
                          <label>
                            <span>Text</span>
                            <input
                              type="checkbox"
                              checked={r.sms_enabled}
                              onChange={(e) => updateRow(idx, { sms_enabled: e.target.checked })}
                            />
                            <span>before</span>
                            <input
                              type="number"
                              min={0}
                              max={365}
                              disabled={!r.sms_enabled}
                              value={r.sms_days_before}
                              onChange={(e) =>
                                updateRow(idx, { sms_days_before: Number(e.target.value) })
                              }
                              className="pr-days-input-sm"
                            />
                            <span>days</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pr-templates-footer">
              <button
                type="button"
                className="ct-btn-secondary"
                style={{ marginRight: "auto" }}
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      checked: true,
                      recall_type_name: recallTypes[0]?.name || "Reassessment visit",
                      notes: "",
                      date_direction: "after",
                      interval_value: 3,
                      interval_unit: "months",
                      email_enabled: true,
                      email_days_before: 3,
                      sms_enabled: true,
                      sms_days_before: 3,
                    },
                  ])
                }
              >
                <Plus size={13} /> Add Row
              </button>
              <button
                type="button"
                className="ct-btn-orange"
                disabled={saving}
                onClick={() => void handleApply()}
              >
                {saving ? "Adding..." : "Add"}
              </button>
              <button type="button" className="ct-btn-cancel" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. VIEW RECALL DETAILS MODAL
   ============================================================================ */
function ViewRecallModal({ recall, onClose }: { recall: Row; onClose: () => void }) {
  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div className="ct-modal-dialog ct-modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-header">
          <h3>Recall Details</h3>
          <button type="button" className="ct-icon-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="ct-modal-body">
          <div className="pr-view-grid">
            <div><strong>Type:</strong> {recall.recall_type_name}</div>
            <div><strong>Status:</strong> {recall.status_name}</div>
            <div><strong>Due Date:</strong> {formatRecallDate(recall.due_date)}</div>
            <div><strong>Created on:</strong> {formatRecallDate(recall.created_at)}</div>
            <div><strong>Provider:</strong> {recall.provider_name}</div>
            <div><strong>Visit Date:</strong> {formatRecallDate(recall.visit_date)}</div>
            <div><strong>Auto Reminder:</strong> {recall.auto_reminder_label}</div>
            {recall.auto_reminder_enabled && (
              <div>
                <strong>Reminder Schedule:</strong>{" "}
                {[
                  recall.email_reminder_days != null ? `Email (${recall.email_reminder_days}d before)` : "",
                  recall.sms_reminder_days != null ? `Text (${recall.sms_reminder_days}d before)` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <strong style={{ display: "block", marginBottom: 4, fontSize: 12.5 }}>Notes</strong>
            <div className="pr-view-notes">{recall.notes || "—"}</div>
          </div>
          <div className="pr-form-footer" style={{ marginTop: 18 }}>
            <button type="button" className="ct-btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. MAIN PATIENT RECALLS SECTION (Patient Chart -> Recalls)
   ============================================================================ */
export function PatientRecallsView({
  patientId,
  defaultProviderId,
}: {
  patientId: string;
  defaultProviderId?: string;
}) {
  const { staff, user, notify } = useApp();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_DEFAULT");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [viewingRecall, setViewingRecall] = useState<Row | null>(null);
  const [editingRecall, setEditingRecall] = useState<Row | null>(null);

  const typesQuery = useQuery({
    queryKey: ["settings-recall-types"],
    queryFn: () => api<Row[]>("/settings/recall-types"),
  });

  const statusesQuery = useQuery({
    queryKey: ["settings-recall-statuses"],
    queryFn: () => api<Row[]>("/settings/recall-statuses"),
  });

  const prefsQuery = useQuery({
    queryKey: ["settings-recall-preferences"],
    queryFn: () => api<Row>("/settings/recall-preferences"),
  });

  const templatesQuery = useQuery({
    queryKey: ["recall-templates"],
    queryFn: () => api<Row[]>("/recall-templates"),
  });

  const recallTypes = typesQuery.data || [];
  const recallStatuses = statusesQuery.data || [];
  const preferences = prefsQuery.data;
  const templates = templatesQuery.data || [];

  const pendingStatusId = useMemo(
    () => recallStatuses.find((s) => s.name.toLowerCase() === "pending")?.id || "",
    [recallStatuses],
  );

  // Resolve default Status dropdown to Pending once statuses load
  const effectiveStatusFilter =
    statusFilter === "PENDING_DEFAULT" ? pendingStatusId || "All" : statusFilter;

  const recallsQuery = useQuery({
    queryKey: ["patient-recalls", branch, patientId, typeFilter, effectiveStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (typeFilter && typeFilter !== "All") params.set("type_id", typeFilter);
      if (effectiveStatusFilter && effectiveStatusFilter !== "All") {
        params.set("status_id", effectiveStatusFilter);
      }
      const qs = params.toString();
      return api<Row[]>(`/patients/${patientId}/recalls${qs ? `?${qs}` : ""}`);
    },
    enabled: Boolean(patientId) && (statusFilter !== "PENDING_DEFAULT" || !statusesQuery.isLoading),
  });

  const recalls = recallsQuery.data || [];

  const providers = useMemo(() => {
    const docs = staff.filter((s) => s.role === "doctor");
    return docs.length > 0 ? docs : staff;
  }, [staff]);

  const resolvedDefaultProvider =
    defaultProviderId ||
    providers.find((p) => p.id === user.id)?.id ||
    providers[0]?.id ||
    user.id;

  const invalidateRecalls = () => {
    void qc.invalidateQueries({ queryKey: ["patient-recalls", branch, patientId] });
  };

  const handleInlinePatch = async (recallId: string, patch: Record<string, any>, successMsg: string) => {
    try {
      await api(`/recalls/${recallId}`, "PATCH", patch);
      invalidateRecalls();
      notify(successMsg);
    } catch (err: any) {
      notify(err?.message || "Unable to update recall");
    }
  };

  const handleDelete = async (recall: Row) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete recall "${recall.recall_type_name}" due ${formatRecallDate(recall.due_date)}?`)) {
      return;
    }
    try {
      await api(`/recalls/${recall.id}`, "DELETE");
      setSelectedIds((prev) => prev.filter((id) => id !== recall.id));
      invalidateRecalls();
      notify("Recall deleted.");
    } catch (err: any) {
      notify(err?.message || "Unable to delete recall");
    }
  };

  const allSelected = recalls.length > 0 && recalls.every((r) => selectedIds.includes(r.id));

  return (
    <div className="pr-module-shell" onClick={() => openMenuId && setOpenMenuId(null)}>
      {/* Top Header Bar */}
      <div className="pr-header-bar">
        <h2 className="pr-title">Recalls</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="pr-btn-templates"
            onClick={() => setShowTemplatesModal(true)}
          >
            Templates
          </button>
          <button
            type="button"
            className="ct-btn-orange"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} /> Recall
          </button>
        </div>
      </div>

      {/* Filter Bar (Type + Status defaulting to Pending) */}
      <div className="pr-filter-bar">
        <div className="ct-filter-group" style={{ minWidth: 180 }}>
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All</option>
            {recallTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ct-filter-group" style={{ minWidth: 180 }}>
          <label>Status</label>
          <select
            value={effectiveStatusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            {recallStatuses.map((rs) => (
              <option key={rs.id} value={rs.id}>
                {rs.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recalls Data Table */}
      <div className="ct-table-wrap">
        <table className="ct-table pr-recalls-table">
          <thead>
            <tr>
              <th style={{ width: 34, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? recalls.map((r) => r.id) : [])
                  }
                  aria-label="Select all recalls"
                />
              </th>
              <th style={{ width: "16%" }}>Type</th>
              <th style={{ width: "22%" }}>Notes</th>
              <th style={{ width: "11%" }}>Due Date</th>
              <th style={{ width: "10%" }}>Created on</th>
              <th style={{ width: "13%" }}>Provider</th>
              <th style={{ width: "10%" }}>Visit Date</th>
              <th style={{ width: "9%" }}>Auto Reminder</th>
              <th style={{ width: "11%" }}>Status</th>
              <th style={{ width: 42 }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {recallsQuery.isLoading ? (
              <tr>
                <td colSpan={10} className="ct-empty-cell">
                  Loading recalls...
                </td>
              </tr>
            ) : recalls.length === 0 ? (
              <tr>
                <td colSpan={10} className="ct-empty-cell">
                  No recalls found for the selected filter. Click <strong>+ Recall</strong> or <strong>Templates</strong> to schedule a patient recall.
                </td>
              </tr>
            ) : (
              recalls.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>

                  {/* Type (inline dropdown) */}
                  <td>
                    <select
                      className="pr-inline-select"
                      value={r.recall_type_id}
                      onChange={(e) =>
                        void handleInlinePatch(
                          r.id,
                          { recall_type_id: e.target.value },
                          "Recall type updated.",
                        )
                      }
                    >
                      {recallTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Notes */}
                  <td>
                    <div className="pr-notes-cell">{r.notes || "—"}</div>
                  </td>

                  {/* Due Date (inline date picker trigger) */}
                  <td>
                    {editingDateId === r.id ? (
                      <input
                        type="date"
                        autoFocus
                        className="pr-inline-date-input"
                        defaultValue={r.due_date || ""}
                        onBlur={() => setEditingDateId(null)}
                        onChange={(e) => {
                          if (e.target.value) {
                            void handleInlinePatch(
                              r.id,
                              { due_date: e.target.value },
                              "Recall due date updated.",
                            );
                          }
                          setEditingDateId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="pr-inline-date-btn"
                        title="Click to change due date"
                        onClick={() => setEditingDateId(r.id)}
                      >
                        <span>{formatRecallDate(r.due_date)}</span>
                        <span className="pr-caret">▾</span>
                      </button>
                    )}
                  </td>

                  {/* Created on */}
                  <td style={{ whiteSpace: "nowrap" }}>{formatRecallDate(r.created_at)}</td>

                  {/* Provider (inline dropdown) */}
                  <td>
                    <select
                      className="pr-inline-select"
                      value={r.provider_id}
                      onChange={(e) =>
                        void handleInlinePatch(
                          r.id,
                          { provider_id: e.target.value },
                          "Recall provider updated.",
                        )
                      }
                    >
                      {providers.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Visit Date */}
                  <td style={{ whiteSpace: "nowrap" }}>{formatRecallDate(r.visit_date)}</td>

                  {/* Auto Reminder */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className={r.auto_reminder_enabled ? "pr-reminder-on" : "pr-reminder-off"}>
                      {r.auto_reminder_enabled ? "Enabled" : "Not Enabled"}
                    </span>
                  </td>

                  {/* Status (inline dropdown) */}
                  <td>
                    <select
                      className="pr-inline-select"
                      value={r.status_id}
                      onChange={(e) =>
                        void handleInlinePatch(
                          r.id,
                          { status_id: e.target.value },
                          "Recall status updated.",
                        )
                      }
                    >
                      {recallStatuses.map((rs) => (
                        <option key={rs.id} value={rs.id}>
                          {rs.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 3-Dot Row Action Menu */}
                  <td style={{ textAlign: "center", position: "relative" }}>
                    <button
                      type="button"
                      className="ct-more-btn"
                      aria-label="Recall actions"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === r.id ? null : r.id);
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {openMenuId === r.id && (
                      <div className="ct-row-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setViewingRecall(r);
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setEditingRecall(r);
                          }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            void handleInlinePatch(
                              r.id,
                              { mark_completed: true },
                              "Recall marked as Completed.",
                            );
                          }}
                        >
                          <Check size={12} /> Mark as Completed
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => void handleDelete(r)}
                        >
                          <Trash2 size={12} /> Delete
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

      {/* Modals */}
      {(showAddModal || editingRecall) && (
        <AddOrEditRecallModal
          patientId={patientId}
          recall={editingRecall}
          recallTypes={recallTypes}
          preferences={preferences}
          providers={providers}
          defaultProviderId={resolvedDefaultProvider}
          onClose={() => {
            setShowAddModal(false);
            setEditingRecall(null);
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditingRecall(null);
            invalidateRecalls();
          }}
        />
      )}

      {showTemplatesModal && (
        <FollowUpTemplatesModal
          patientId={patientId}
          templates={templates}
          recallTypes={recallTypes}
          defaultProviderId={resolvedDefaultProvider}
          onClose={() => setShowTemplatesModal(false)}
          onApplied={() => {
            setShowTemplatesModal(false);
            invalidateRecalls();
          }}
          onTemplateSaved={() => {
            void qc.invalidateQueries({ queryKey: ["recall-templates"] });
          }}
        />
      )}

      {viewingRecall && (
        <ViewRecallModal recall={viewingRecall} onClose={() => setViewingRecall(null)} />
      )}
    </div>
  );
}
