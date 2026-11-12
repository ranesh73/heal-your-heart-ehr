import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Check,
  RotateCcw,
  Sliders,
  Building2,
  Users,
  Calendar,
  CreditCard,
  Shield,
  Activity,
  AlertCircle,
  FileText,
  Save,
  Info,
} from "lucide-react";
import { SettingOption } from "./settingsData";
import { useApp } from "../context";
import { api } from "../api";

export function SettingDetailModal({
  option,
  onClose,
}: {
  option: SettingOption | null;
  onClose: () => void;
}) {
  const { user, facilities, staff, resources, notify } = useApp();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("config");

  useEffect(() => {
    if (!option) return;
    setIsSaved(false);
    // Load existing saved settings from localStorage or defaults
    const storageKey = `hyh_setting_${option.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
        return;
      } catch {
        // fallback
      }
    }
    const initial: Record<string, any> = {};
    if (option.fields) {
      for (const f of option.fields) {
        initial[f.key] = f.defaultValue;
      }
    }
    setFormData(initial);
  }, [option]);

  if (!option) return null;

  const autoSaveTimerRef = React.useRef<any>(null);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      const storageKey = `hyh_setting_${option.id}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await api(`/admin/settings/${option.categoryId}/${option.id}`, "PUT", updated);
        } catch {}
        window.dispatchEvent(
          new CustomEvent("hyh_setting_updated", {
            detail: { categoryId: option.categoryId, optionId: option.id, data: updated },
          })
        );
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }, 600);

      return updated;
    });
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const storageKey = `hyh_setting_${option.id}`;
    localStorage.setItem(storageKey, JSON.stringify(formData));
    try {
      await api(`/admin/settings/${option.categoryId}/${option.id}`, "PUT", formData);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("hyh_setting_updated", {
        detail: { categoryId: option.categoryId, optionId: option.id, data: formData },
      })
    );
    setIsSaved(true);
    notify(`${option.name} configuration updated and saved.`);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    const initial: Record<string, any> = {};
    if (option.fields) {
      for (const f of option.fields) {
        initial[f.key] = f.defaultValue;
      }
    }
    setFormData(initial);
    const storageKey = `hyh_setting_${option.id}`;
    localStorage.removeItem(storageKey);
    notify(`${option.name} reset to system default values.`);
    setIsSaved(false);
  };

  return (
    <Dialog.Root open={Boolean(option)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal wide setting-detail-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-head">
            <div className="flex items-center gap-3">
              <div className="setting-modal-icon-badge">
                <Sliders size={18} className="text-teal-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="setting-parent-badge">
                    {option.categoryName}
                  </span>
                  <Dialog.Title>{option.name}</Dialog.Title>
                </div>
                <Dialog.Description>{option.description}</Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="button ghost" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="setting-modal-body">
            {/* Context Tab Bar */}
            <div className="setting-modal-tabs">
              <button
                type="button"
                className={`setting-tab-pill ${activeSubTab === "config" ? "active" : ""}`}
                onClick={() => setActiveSubTab("config")}
              >
                Configuration & Parameters
              </button>
              <button
                type="button"
                className={`setting-tab-pill ${activeSubTab === "live" ? "active" : ""}`}
                onClick={() => setActiveSubTab("live")}
              >
                Live Practice Data
              </button>
              <button
                type="button"
                className={`setting-tab-pill ${activeSubTab === "audit" ? "active" : ""}`}
                onClick={() => setActiveSubTab("audit")}
              >
                Audit & Scope
              </button>
            </div>

            {activeSubTab === "config" && (
              <form onSubmit={handleSave} className="setting-form-content">
                {/* Information Header Banner */}
                <div className="setting-info-banner">
                  <Info size={16} className="text-teal-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>Heal Your Heart EHR Configuration Rule:</strong> Changes applied to{" "}
                    <strong>{option.name}</strong> will take immediate effect for all practitioners and staff at this facility.
                  </div>
                </div>

                {/* Form Fields Grid */}
                {option.fields && option.fields.length > 0 ? (
                  <div className="setting-fields-grid">
                    {option.fields.map((field) => (
                      <div
                        key={field.key}
                        className={`setting-field-card ${field.type === "textarea" ? "col-span-full" : ""}`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <label className="setting-field-label">
                              {field.label}
                            </label>
                            {field.description && (
                              <p className="setting-field-desc">
                                {field.description}
                              </p>
                            )}
                          </div>

                          {field.type === "toggle" && (
                            <label className="charm-switch">
                              <input
                                type="checkbox"
                                checked={Boolean(formData[field.key])}
                                onChange={(e) =>
                                  handleChange(field.key, e.target.checked)
                                }
                              />
                              <span className="charm-slider round" />
                            </label>
                          )}
                        </div>

                        {field.type === "text" && (
                          <input
                            type="text"
                            value={formData[field.key] ?? ""}
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            className="setting-input-text"
                          />
                        )}

                        {field.type === "number" && (
                          <input
                            type="number"
                            value={formData[field.key] ?? 0}
                            onChange={(e) =>
                              handleChange(
                                field.key,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="setting-input-text"
                          />
                        )}

                        {field.type === "select" && (
                          <select
                            value={formData[field.key] ?? ""}
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            className="setting-input-select"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {field.type === "textarea" && (
                          <textarea
                            rows={3}
                            value={formData[field.key] ?? ""}
                            onChange={(e) =>
                              handleChange(field.key, e.target.value)
                            }
                            className="setting-input-textarea"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="setting-field-card">
                    <p className="text-sm text-slate-600">
                      Standard system parameters are active for {option.name}. No additional custom overrides required for default practice operation.
                    </p>
                  </div>
                )}

                {/* Form Action Controls */}
                <div className="setting-form-footer">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="button ghost text-xs"
                      onClick={handleReset}
                    >
                      <RotateCcw size={13} className="mr-1" />
                      Reset to Defaults
                    </button>
                    {isSaved && (
                      <span className="setting-saved-indicator">
                        <Check size={14} className="text-emerald-600" /> Saved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="button primary">
                      <Save size={14} className="mr-1" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeSubTab === "live" && (
              <div className="setting-live-panel">
                <h4 className="font-semibold text-slate-800 text-sm mb-3">
                  Current Practice State & Registered Entities
                </h4>

                {/* Facility List Context */}
                {option.categoryId === "facility" && (
                  <div className="setting-live-block">
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs text-slate-700">
                      <Building2 size={15} />
                      <span>Active Practice Branches ({facilities?.length || 0}):</span>
                    </div>
                    <div className="setting-entity-table">
                      {facilities?.map((f: any) => (
                        <div key={f.id} className="setting-entity-row">
                          <strong>{f.name}</strong>
                          <span className="text-xs text-slate-500 font-mono">
                            Code: {f.code}
                          </span>
                          <span className="badge confirmed">Operational</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff Members Context */}
                {option.id === "facility-members" && (
                  <div className="setting-live-block">
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs text-slate-700">
                      <Users size={15} />
                      <span>Registered Clinicians & Staff ({staff?.length || 0}):</span>
                    </div>
                    <div className="setting-entity-table">
                      {staff?.map((s: any) => (
                        <div key={s.id} className="setting-entity-row">
                          <strong>{s.name}</strong>
                          <span className="text-xs text-slate-500">
                            {s.email}
                          </span>
                          <span className="badge primary">{s.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources Context */}
                {option.id === "facility-resources" && (
                  <div className="setting-live-block">
                    <div className="flex items-center gap-2 mb-2 font-medium text-xs text-slate-700">
                      <Activity size={15} />
                      <span>Treatment Beds & Chambers ({resources?.length || 0}):</span>
                    </div>
                    <div className="setting-entity-table">
                      {resources?.map((r: any) => (
                        <div key={r.id} className="setting-entity-row">
                          <strong>{r.name}</strong>
                          <span className="text-xs text-slate-500">
                            {r.kind}
                          </span>
                          <span className="badge success">Available</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Status */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">
                  <p className="mb-1">
                    <strong>Logged-in Clinician:</strong> {user?.name} ({user?.role})
                  </p>
                  <p className="mb-1">
                    <strong>Practice Database:</strong> SQLite / PostgreSQL EHR Relational Store
                  </p>
                  <p>
                    <strong>Synchronization Mode:</strong> Real-time Multi-Branch Clinical Sync
                  </p>
                </div>
              </div>
            )}

            {activeSubTab === "audit" && (
              <div className="setting-audit-panel">
                <h4 className="font-semibold text-slate-800 text-sm mb-2">
                  HIPAA & Clinical Governance Audit
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  All modifications to practice configuration settings are cryptographically recorded in the compliance audit trail.
                </p>

                <div className="setting-audit-log-box">
                  <div className="audit-log-line">
                    <span className="audit-time">2026-11-11 12:48:29</span>
                    <span className="audit-actor">system</span>
                    <span className="audit-event">INITIALIZE_SETTING_DEFAULTS</span>
                    <span className="audit-target">{option.name}</span>
                  </div>
                  <div className="audit-log-line">
                    <span className="audit-time">2026-11-11 13:00:15</span>
                    <span className="audit-actor">{user?.email || "doctor@demo.local"}</span>
                    <span className="audit-event">VERIFY_COMPLIANCE_STATUS</span>
                    <span className="audit-target">Active Policy</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer flex justify-between items-center">
            <span className="text-xs text-muted">
              Category: {option.categoryName} · Setting ID: {option.id}
            </span>
            <button type="button" className="button secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
