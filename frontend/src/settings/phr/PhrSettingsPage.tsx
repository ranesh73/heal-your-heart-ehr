import React, { useState, useEffect } from "react";
import { api } from "../../api";
import {
  Shield,
  Smartphone,
  Share2,
  Code2,
  Info,
  Check,
  Save,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Building,
  UserCheck,
  FileText,
  AlertCircle,
  Clock,
  Phone,
  Link as LinkIcon,
  HelpCircle,
  Lock,
} from "lucide-react";

interface PhrSettingsPageProps {
  activeOptionId: string;
  onTabChange?: (tabId: string) => void;
}

export function PhrSettingsPage({ activeOptionId, onTabChange }: PhrSettingsPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<{
    modules: Record<string, boolean>;
    messaging_prefs: Record<string, any>;
    shared_clinical_sections: string[];
    refill_prefs: Record<string, any>;
    practice_prefs: Record<string, any>;
    custom_app_menu: Record<string, any>;
    facilities: any[];
    staff_members: any[];
  }>({
    modules: {},
    messaging_prefs: {},
    shared_clinical_sections: [],
    refill_prefs: {},
    practice_prefs: {},
    custom_app_menu: {},
    facilities: [],
    staff_members: [],
  });

  // Useful Info state
  const [usefulInfoList, setUsefulInfoList] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "" });
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);

  // Custom App Sub-tab
  const [customAppSubTab, setCustomAppSubTab] = useState<"MAIN MENU" | "MAPS" | "ABOUT" | "LOGIN" | "APP DETAILS">("MAIN MENU");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await api<any>("/settings/phr");
      if (data) {
        setSettings(data);
      }
      const info = await api<any[]>("/settings/phr/useful-info");
      if (info) setUsefulInfoList(info);

      const ann = await api<any[]>("/settings/phr/announcements");
      if (ann) setAnnouncements(ann);
    } catch (e: any) {
      console.error("Failed to load PHR settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/preferences", "PUT", {
        modules: settings.modules,
        messaging_prefs: settings.messaging_prefs,
        refill_prefs: settings.refill_prefs,
        practice_prefs: settings.practice_prefs,
      });
      showToastMsg("PHR preferences saved successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const saveShareClinicalData = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/share-clinical-data", "PUT", {
        shared_clinical_sections: settings.shared_clinical_sections,
      });
      showToastMsg("Shared clinical sections updated successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to save clinical sections");
    } finally {
      setSaving(false);
    }
  };

  const saveCustomApp = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/custom-app", "PUT", {
        custom_app_menu: settings.custom_app_menu,
      });
      showToastMsg("Custom app menu saved successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to save custom app menu");
    } finally {
      setSaving(false);
    }
  };

  const saveUsefulInfoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.content_or_url) return;
    try {
      if (editingItem.id) {
        await api(`/settings/phr/useful-info/${editingItem.id}`, "PUT", editingItem);
      } else {
        await api("/settings/phr/useful-info", "POST", editingItem);
      }
      setShowItemModal(false);
      setEditingItem(null);
      const updated = await api<any[]>("/settings/phr/useful-info");
      setUsefulInfoList(updated);
      showToastMsg("Useful info saved!");
    } catch (err: any) {
      alert(err.message || "Failed to save item");
    }
  };

  const deleteUsefulInfoItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await api(`/settings/phr/useful-info/${id}`, "DELETE");
      setUsefulInfoList(usefulInfoList.filter((x) => x.id !== id));
      showToastMsg("Item deleted");
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Loading Heal Your Heart PHR settings...
      </div>
    );
  }

  return (
    <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          backgroundColor: "#16a34a",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 9999,
          fontWeight: 500,
          fontSize: 13,
        }}>
          <Check size={16} /> {toast}
        </div>
      )}

      {/* Header Banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/images/HYH.png"
            alt="Heal Your Heart"
            style={{ height: 42, objectFit: "contain" }}
            onError={(e) => {
              // fallback
              (e.currentTarget as HTMLImageElement).src = "/HYH.png";
            }}
          />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Heal Your Heart PHR Portal & App Configuration
            </h2>
            <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "#64748b" }}>
              Vaso-Meditech (EECP Center) · Patient Portal & Branded Mobile Experience
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="/#/phr"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> Open Patient PHR Portal
          </a>
        </div>
      </div>

      {/* TAB 1: PREFERENCES */}
      {activeOptionId === "phr-preferences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Section A: PHR Feature Modules */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              PHR Feature Modules
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
              Enable or disable patient self-service features in the Heal Your Heart patient portal.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { key: "appointments", label: "Appointments Booking & Status", desc: "Allows patients to view and request appointments" },
                { key: "messages", label: "Secure Doctor Messaging", desc: "Direct 2-way patient-provider communications" },
                { key: "questionnaires", label: "Intake Questionnaires", desc: "Patient EECP pre-assessment questionnaires" },
                { key: "reminders", label: "Automated Reminders", desc: "Recall, follow-up and appointment notices" },
                { key: "wellness", label: "Cardiac Rehab & Wellness", desc: "EECP exercise and lifestyle goals" },
                { key: "share_sections", label: "Clinical Chart Sharing", desc: "Access to lab reports, vitals and diagnoses" },
                { key: "billing", label: "Billing, Invoices & Receipts", desc: "View invoices, fee receipts and balances" },
                { key: "documents", label: "Documents & Records Upload", desc: "Patient chart PDFs and phone report uploads" },
                { key: "prescriptions", label: "Prescriptions & Refill Requests", desc: "View medications and request refills" },
                { key: "labs", label: "Diagnostic Labs Results", desc: "View blood work, lipid profiles and biomarkers" },
                { key: "images", label: "Images (ECG, 2D Echo, SphygmoCor)", desc: "Inline PDF preview of cardiovascular imaging" },
                { key: "useful_info", label: "Useful Clinic Info & Helplines", desc: "Emergency contacts and practice guidelines" },
              ].map((m) => {
                const checked = settings.modules[m.key] !== false;
                return (
                  <label
                    key={m.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 6,
                      border: checked ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                      background: checked ? "#f8faff" : "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          modules: { ...settings.modules, [m.key]: e.target.checked },
                        })
                      }
                      style={{ marginTop: 3, accentColor: "#2563eb", width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9" }} />

          {/* Section B: Messaging & Document Rules */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Messages & Document Rules
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px 0" }}>
                Upload thresholds and communication rules.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.messaging_prefs.allow_patient_uploads !== false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        messaging_prefs: { ...settings.messaging_prefs, allow_patient_uploads: e.target.checked },
                      })
                    }
                    style={{ accentColor: "#2563eb", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>
                    Allow patients to upload medical records & PDFs from phone
                  </span>
                </label>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Max upload file size:</span>
                  <select
                    value={settings.messaging_prefs.max_upload_size_mb || 25}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        messaging_prefs: { ...settings.messaging_prefs, max_upload_size_mb: parseInt(e.target.value) },
                      })
                    }
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  >
                    <option value={5}>5 MB</option>
                    <option value={10}>10 MB</option>
                    <option value={25}>25 MB (Recommended)</option>
                    <option value={50}>50 MB</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#475569" }}>Character limit per patient message:</span>
                  <input
                    type="number"
                    value={settings.messaging_prefs.char_limit_per_message || 500}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        messaging_prefs: { ...settings.messaging_prefs, char_limit_per_message: parseInt(e.target.value) || 500 },
                      })
                    }
                    style={{ width: 90, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Section C: Refill Preferences */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Prescription & Refill Requests
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px 0" }}>
                Allow patients to request repeat prescriptions online.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.refill_prefs.allow_refill_requests !== false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        refill_prefs: { ...settings.refill_prefs, allow_refill_requests: e.target.checked },
                      })
                    }
                    style={{ accentColor: "#2563eb", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>
                    Enable &apos;Request Refill&apos; button on active medications
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.refill_prefs.notify_prescribing_doctor !== false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        refill_prefs: { ...settings.refill_prefs, notify_prescribing_doctor: e.target.checked },
                      })
                    }
                    style={{ accentColor: "#2563eb", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>
                    Notify prescribing cardiologist immediately via task
                  </span>
                </label>

                <div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Refill Notification Email:</span>
                  <input
                    type="email"
                    value={settings.refill_prefs.refill_notification_email || "pharmacy@healyourheart.in"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        refill_prefs: { ...settings.refill_prefs, refill_notification_email: e.target.value },
                      })
                    }
                    style={{ width: "100%", marginTop: 4, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9" }} />

          {/* Section D: Practice & App Lock Preferences */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              App Security & Portal Behavior
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px 0" }}>
              Configure PIN lock and patient profile editing.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.practice_prefs.require_app_lock_pin !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      practice_prefs: { ...settings.practice_prefs, require_app_lock_pin: e.target.checked },
                    })
                  }
                  style={{ marginTop: 2, accentColor: "#2563eb", width: 16, height: 16 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    Enforce 4-Digit PIN App Lock Screen
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Renders &quot;Heal Your Heart PHR Locked&quot; screen requiring PIN or biometric authorization before viewing medical data.
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.practice_prefs.allow_profile_demographics_edit !== false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      practice_prefs: { ...settings.practice_prefs, allow_profile_demographics_edit: e.target.checked },
                    })
                  }
                  style={{ marginTop: 2, accentColor: "#2563eb", width: 16, height: 16 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    Allow Demographics Profile Updates
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Allows patient to request edits to contact phone, address, and emergency contact details.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={savePreferences}
              disabled={saving}
              style={{
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                padding: "10px 22px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Save size={15} /> {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SHARE CLINICAL DATA */}
      {activeOptionId === "share-clinical-data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Share Clinical Data
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
              Select which clinical chart sections from the EHR are shared with patients in their PHR portal under <strong>Share Sections</strong>.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { id: "Diagnoses", label: "Diagnoses & Problem List", desc: "ICD-10 codes, angina classification, and chronic conditions" },
              { id: "Medications", label: "Medications & Prescriptions", desc: "Active cardiovascular Rx, supplements and dosage instructions" },
              { id: "Allergies", label: "Allergies & Adverse Reactions", desc: "Drug, food, and environmental hypersensitivities" },
              { id: "Vitals", label: "Vitals & Biometrics", desc: "Blood Pressure, Weight, Height, BMI and Pulse records" },
              { id: "Procedures", label: "Procedures & EECP History", desc: "EECP counterpulsation sessions, angioplasty, and interventions" },
              { id: "Vaccines", label: "Vaccines & Immunizations", desc: "Pneumococcal, influenza, and hepatitis records" },
              { id: "Implanted Devices", label: "Implanted Devices", desc: "Stents, pacemakers, ICDs, and graft records" },
              { id: "Goals", label: "Goals & Care Plan", desc: "Target BP, target LDL, target weight, and EECP milestones" },
              { id: "Health Concerns", label: "Health Concerns", desc: "Patient symptoms, shortness of breath, and fatigue logs" },
              { id: "Smoking Status", label: "Smoking & Lifestyle Status", desc: "Tobacco history, cessation advice, and physical activity" },
              { id: "Consultation Notes (Signed Only)", label: "Consultation Notes (Signed Only)", desc: "Completed and digitally signed cardiologist SOAP notes" },
              { id: "EECP Session Summary", label: "EECP Session Summary", desc: "Completed cuff pressure, augmentation ratio, and duration logs" },
            ].map((item) => {
              const isChecked = settings.shared_clinical_sections.includes(item.id);
              return (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 6,
                    border: isChecked ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                    background: isChecked ? "#f0f7ff" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings({
                          ...settings,
                          shared_clinical_sections: [...settings.shared_clinical_sections, item.id],
                        });
                      } else {
                        setSettings({
                          ...settings,
                          shared_clinical_sections: settings.shared_clinical_sections.filter((x) => x !== item.id),
                        });
                      }
                    }}
                    style={{ marginTop: 3, accentColor: "#2563eb", width: 16, height: 16 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={saveShareClinicalData}
              disabled={saving}
              style={{
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Save size={15} /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: PATIENT PORTAL EMBED */}
      {activeOptionId === "patient-portal-embed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Patient Portal Embed
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
              Embed our official <strong>Heal Your Heart PHR</strong> on your practice website or share direct portal links with patients.
            </p>
          </div>

          {/* Direct URL */}
          <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Direct Heal Your Heart PHR Portal URL:
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                readOnly
                value={`${window.location.origin}/#/phr`}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#ffffff", fontFamily: "monospace" }}
              />
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/#/phr`, "direct-url")}
                style={{
                  background: copiedCode === "direct-url" ? "#16a34a" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {copiedCode === "direct-url" ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode === "direct-url" ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>

          {/* HTML Iframe Embed Code */}
          <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Website Embed HTML (Responsive Iframe):
            </div>
            <textarea
              readOnly
              rows={3}
              value={`<iframe src="${window.location.origin}/#/phr" width="100%" height="820" frameborder="0" style="border:none; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);" title="Heal Your Heart PHR"></iframe>`}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, background: "#ffffff", fontFamily: "monospace" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/#/phr" width="100%" height="820" frameborder="0" style="border:none; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);" title="Heal Your Heart PHR"></iframe>`, "iframe-code")}
                style={{
                  background: copiedCode === "iframe-code" ? "#16a34a" : "#475569",
                  color: "#ffffff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {copiedCode === "iframe-code" ? <Check size={14} /> : <Copy size={14} />}
                {copiedCode === "iframe-code" ? "Copied!" : "Copy Snippet"}
              </button>
            </div>
          </div>

          {/* Facility Specific Links for all 6 branches */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
              Facility Specific Portal Links (All 6 Centers):
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
              {settings.facilities.map((fac) => (
                <div
                  key={fac.code}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "14px 16px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{fac.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b", margin: "3px 0 8px 0" }}>{fac.address}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: 4 }}>
                      {fac.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/#/phr?facility=${fac.code}`, fac.code)}
                      style={{
                        background: copiedCode === fac.code ? "#16a34a" : "#f1f5f9",
                        color: copiedCode === fac.code ? "#ffffff" : "#334155",
                        border: "1px solid #cbd5e1",
                        padding: "5px 12px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {copiedCode === fac.code ? <Check size={12} /> : <Copy size={12} />}
                      {copiedCode === fac.code ? "Copied" : "Copy Branch Link"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOM APP */}
      {activeOptionId === "custom-app" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Custom App Configuration
            </h3>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>
              Customize the Heal Your Heart branded mobile application menu and details.
            </p>
          </div>

          {/* Sub-tabs: MAIN MENU | MAPS | ABOUT | LOGIN | APP DETAILS */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", paddingBottom: 2 }}>
            {(["MAIN MENU", "MAPS", "ABOUT", "LOGIN", "APP DETAILS"] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => setCustomAppSubTab(sub)}
                style={{
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  borderBottom: customAppSubTab === sub ? "2px solid #2563eb" : "2px solid transparent",
                  background: "transparent",
                  color: customAppSubTab === sub ? "#2563eb" : "#64748b",
                  cursor: "pointer",
                }}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* SUB-TAB: MAIN MENU */}
          {customAppSubTab === "MAIN MENU" && (
            <div>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Toggle which items appear inside the patient mobile application menu.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "appointments", label: "Appointments" },
                  { key: "messages", label: "Messages" },
                  { key: "questionnaire", label: "Questionnaire" },
                  { key: "reminders", label: "Reminders" },
                  { key: "wellness", label: "Wellness" },
                  { key: "share_sections", label: "Share Sections (Clinical)" },
                  { key: "invoices", label: "Invoices" },
                  { key: "receipts", label: "Receipts" },
                  { key: "documents", label: "Documents" },
                  { key: "prescriptions", label: "Prescriptions" },
                  { key: "labs", label: "Labs" },
                  { key: "images", label: "Images" },
                  { key: "useful_info", label: "Useful Info" },
                  { key: "about", label: "About" },
                ].map((item) => {
                  const isEnabled = settings.custom_app_menu[item.key] !== false;
                  return (
                    <label
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        background: isEnabled ? "#ffffff" : "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            custom_app_menu: {
                              ...settings.custom_app_menu,
                              [item.key]: e.target.checked,
                            },
                          })
                        }
                        style={{ accentColor: "#2563eb", width: 16, height: 16 }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB: MAPS */}
          {customAppSubTab === "MAPS" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Clinic Navigation & Google Maps</div>
              <p style={{ fontSize: 12, color: "#64748b" }}>
                All 6 Heal Your Heart centers will display direct Google Maps navigation links on patient appointment cards.
              </p>
              {settings.facilities.map((fac) => (
                <div key={fac.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fac.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{fac.address} · {fac.phone}</div>
                  </div>
                  <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 600 }}>Enabled</span>
                </div>
              ))}
            </div>
          )}

          {/* SUB-TAB: ABOUT */}
          {customAppSubTab === "ABOUT" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>About Heal Your Heart</div>
              <textarea
                rows={5}
                defaultValue="Heal Your Heart is a unit of Vaso-Meditech, dedicated to providing advanced Non-Invasive EECP (Enhanced External Counterpulsation) therapy and cardiovascular wellness. Headquartered in Chennai with branches across Tamil Nadu, our expert team helps patients treat refractory angina, heart failure, and promote natural collateral circulation."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
              />
            </div>
          )}

          {/* SUB-TAB: LOGIN */}
          {customAppSubTab === "LOGIN" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Patient Login & Lock Screen Customization</div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#2563eb", width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: "#334155" }}>Allow TouchID / FaceID biometric quick unlock</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#2563eb", width: 16, height: 16 }} />
                <span style={{ fontSize: 13, color: "#334155" }}>Remember patient PIN on verified mobile device</span>
              </label>
            </div>
          )}

          {/* SUB-TAB: APP DETAILS */}
          {customAppSubTab === "APP DETAILS" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  App Name
                </label>
                <input
                  type="text"
                  defaultValue="Heal Your Heart PHR"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  App Subtitle
                </label>
                <input
                  type="text"
                  defaultValue="Vaso-Meditech (EECP Center)"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Support Email
                </label>
                <input
                  type="text"
                  defaultValue="support@healyourheart.in"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Emergency Helpline
                </label>
                <input
                  type="text"
                  defaultValue="+91 90030 70065"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={saveCustomApp}
              disabled={saving}
              style={{
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                padding: "10px 24px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Save size={15} /> {saving ? "Saving..." : "SAVE"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: USEFUL INFO */}
      {activeOptionId === "useful-info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Useful Info & Practice Resources
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                Emergency contacts, clinic hours, policies, and heart health resources shown in the PHR.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingItem({
                  title: "",
                  category: "Contact",
                  content_or_url: "",
                  display_order: usefulInfoList.length + 1,
                  is_active: true,
                });
                setShowItemModal(true);
              }}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> + Add New Resource
            </button>
          </div>

          {/* Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: "10px 14px", width: 50 }}>#</th>
                  <th style={{ padding: "10px 14px" }}>Title</th>
                  <th style={{ padding: "10px 14px" }}>Category</th>
                  <th style={{ padding: "10px 14px" }}>Content / Phone / Link</th>
                  <th style={{ padding: "10px 14px", width: 80 }}>Status</th>
                  <th style={{ padding: "10px 14px", width: 100, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usefulInfoList.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{item.display_order || idx + 1}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b" }}>{item.title}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: item.category === "Contact" ? "#dcfce7" : item.category === "Policy" ? "#fef3c7" : "#e0e7ff",
                        color: item.category === "Contact" ? "#15803d" : item.category === "Policy" ? "#b45309" : "#4338ca",
                        fontWeight: 600,
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.content_or_url}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, color: item.is_active ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
                        {item.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowItemModal(true);
                        }}
                        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", marginRight: 8 }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteUsefulInfoItem(item.id)}
                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Useful Info Add / Edit */}
      {showItemModal && editingItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{ background: "#ffffff", borderRadius: 8, padding: 24, width: "100%", maxWidth: 520, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px 0", color: "#0f172a" }}>
              {editingItem.id ? "Edit Resource" : "Add New Resource"}
            </h3>
            <form onSubmit={saveUsefulInfoItem} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Title
                </label>
                <input
                  required
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="e.g., 24/7 Cardiac Emergency Helpline"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  <option value="Contact">Contact / Helpline</option>
                  <option value="Policy">Clinic Policy / Hours</option>
                  <option value="Link">Health Guide / Website Link</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Content / Telephone Number / URL
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingItem.content_or_url}
                  onChange={(e) => setEditingItem({ ...editingItem, content_or_url: e.target.value })}
                  placeholder="e.g., +91 90030 70065 or https://healyourheart.in/eecp-guide"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingItem.is_active}
                    onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                    style={{ accentColor: "#2563eb", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "#334155" }}>Active & Visible in PHR</span>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Order:</span>
                  <input
                    type="number"
                    value={editingItem.display_order || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, display_order: parseInt(e.target.value) || 1 })}
                    style={{ width: 60, padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#2563eb", color: "#ffffff", border: "none", padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
