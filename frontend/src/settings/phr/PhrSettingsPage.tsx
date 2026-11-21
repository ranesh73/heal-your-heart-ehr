import React, { useState, useEffect } from "react";
import { api } from "../../api";
import {
  Check,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";

interface PhrSettingsPageProps {
  activeOptionId: string;
  onTabChange?: (tabId: string) => void;
}

const DEFAULT_EXCLUDED_MEMBERS = [
  "Vanitha M",
  "Rabini M",
  "Susan Sekar",
  "Jamuna M",
  "Sarala D",
  "Vijayalakshmi K",
  "Dr. Elakkiya M",
];

const SIX_FACILITIES = [
  {
    code: "HUH001",
    name: "Heal Your Heart Neelankarai - HUH001",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=HUH001",
  },
  {
    code: "HUH002",
    name: "Heal Your Heart Royapettah - HUH002",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=HUH002",
  },
  {
    code: "4R",
    name: "4R Health & Wellness",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=4R",
  },
  {
    code: "HUH003",
    name: "Heal Your Heart - Manapakkam - HUH003",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=HUH003",
  },
  {
    code: "005",
    name: "Heal Your Heart-Madurai - 005",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=005",
  },
  {
    code: "004",
    name: "Heal Your Heart-Tirunelveli - 004",
    url: "https://ehr.healyourheart.in/phr/login?facility_id=004",
  },
];

export function PhrSettingsPage({ activeOptionId, onTabChange }: PhrSettingsPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Settings State
  const [modules, setModules] = useState<Record<string, boolean>>({
    clinical_summary: true,
    visit_summary: true,
    appointments: true,
    billing: true,
    questionnaire: true,
    announcements: true,
    messages: true,
  });

  const [messagingPrefs, setMessagingPrefs] = useState<Record<string, any>>({
    patient_category: "All Patients",
    allow_patient_messages: true,
    restrict_message_count: false,
    max_chars: 500,
    allow_share_documents: true,
    allow_to: "both",
    recipients: "all",
    excluded_member_ids: DEFAULT_EXCLUDED_MEMBERS,
  });

  const [selectedFacilityForSharedData, setSelectedFacilityForSharedData] = useState(
    "Heal Your Heart-Tirunelveli - 004"
  );
  const [sharedDataMembers, setSharedDataMembers] = useState("");

  const [refillPrefs, setRefillPrefs] = useState<Record<string, any>>({
    allow_rx_refill: true,
    allow_supplement_refill: false,
    notify_provider: true,
    other_member_enabled: true,
    other_members: "",
  });

  const [practicePrefs, setPracticePrefs] = useState<Record<string, any>>({
    in_house_care_team_only_booking: false,
  });

  const [sharedClinicalSections, setSharedClinicalSections] = useState<Record<string, boolean>>({
    smoking_status: true,
    procedures: true,
    diagnoses: true,
    medications: true,
    allergies: true,
    vitals: true,
    growth_chart: true,
    vaccines: true,
    implanted_devices: true,
    goals: true,
    health_concerns: true,
    care_team: false,
  });

  const [customAppMenu, setCustomAppMenu] = useState<Record<string, boolean>>({
    appointments: true,
    messages: true,
    document: true,
    questionnaire: true,
    medications: true,
    lab_results: true,
    billing: true,
    visit_summary: true,
    announcements: true,
    useful_info: true,
    about: true,
  });

  const [customAppSubTab, setCustomAppSubTab] = useState<
    "MAIN MENU" | "MAPS" | "ABOUT" | "LOGIN" | "APP DETAILS"
  >("MAIN MENU");

  // Useful Info State
  const [usefulInfoList, setUsefulInfoList] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const [newExcludedMember, setNewExcludedMember] = useState("");

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api<any>("/settings/phr");
      if (data) {
        if (data.modules) setModules((prev) => ({ ...prev, ...data.modules }));
        if (data.messaging_prefs) setMessagingPrefs((prev) => ({ ...prev, ...data.messaging_prefs }));
        if (data.shared_clinical_sections) {
          if (Array.isArray(data.shared_clinical_sections)) {
            const map: Record<string, boolean> = {};
            data.shared_clinical_sections.forEach((k: string) => (map[k.toLowerCase()] = true));
            setSharedClinicalSections((prev) => ({ ...prev, ...map }));
          } else {
            setSharedClinicalSections((prev) => ({ ...prev, ...data.shared_clinical_sections }));
          }
        }
        if (data.refill_prefs) setRefillPrefs((prev) => ({ ...prev, ...data.refill_prefs }));
        if (data.practice_prefs) setPracticePrefs((prev) => ({ ...prev, ...data.practice_prefs }));
        if (data.custom_app_menu) {
          setCustomAppMenu((prev) => ({
            ...prev,
            ...(data.custom_app_menu.menu_items || data.custom_app_menu),
          }));
        }
      }

      const info = await api<any[]>("/settings/phr/useful-info");
      if (info) setUsefulInfoList(info);
    } catch (e: any) {
      console.warn("Using offline PHR settings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/preferences", "PUT", {
        modules,
        messaging_prefs: messagingPrefs,
        refill_prefs: refillPrefs,
        practice_prefs: practicePrefs,
      });
      showToastMsg("Preferences saved successfully!");
    } catch (e: any) {
      alert(e?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const saveShareClinicalData = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/share-clinical-data", "PUT", {
        shared_clinical_sections: sharedClinicalSections,
      });
      showToastMsg("Share Clinical Data settings saved!");
    } catch (e: any) {
      alert(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const saveCustomApp = async () => {
    setSaving(true);
    try {
      await api("/settings/phr/custom-app", "PUT", {
        menu_items: customAppMenu,
        app_name: "Heal Your Heart PHR",
      });
      showToastMsg("Custom App Menu saved successfully!");
    } catch (e: any) {
      alert(e?.message || "Failed to save custom app menu");
    } finally {
      setSaving(false);
    }
  };

  const removeExcludedMember = (name: string) => {
    setMessagingPrefs((prev) => ({
      ...prev,
      excluded_member_ids: (prev.excluded_member_ids || []).filter((x: string) => x !== name),
    }));
  };

  const addExcludedMember = () => {
    if (!newExcludedMember.trim()) return;
    setMessagingPrefs((prev) => ({
      ...prev,
      excluded_member_ids: [...(prev.excluded_member_ids || []), newExcludedMember.trim()],
    }));
    setNewExcludedMember("");
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

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
        Loading Heal Your Heart PHR settings...
      </div>
    );
  }

  // Common Orange Save Button style
  const orangeSaveBtn = (
    <button
      type="button"
      onClick={savePreferences}
      disabled={saving}
      style={{
        background: "#FF9800",
        color: "#FFFFFF",
        border: "none",
        borderRadius: 4,
        padding: "5px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      }}
    >
      {saving ? "Saving..." : "Save"}
    </button>
  );

  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: "16px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#333333",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            backgroundColor: "#16A34A",
            color: "#FFFFFF",
            padding: "10px 18px",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            zIndex: 9999,
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          <Check size={16} /> {toast}
        </div>
      )}

      {/* =========================================================================
          TAB 1: PREFERENCES (Exact match to WhatsApp Image 2026-11-21 at 1.55.48 PM (4).jpeg & media_1795252465054_76dd5977.png)
         ========================================================================= */}
      {activeOptionId === "phr-preferences" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Section 1: PHR Modules */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              PHR Modules
            </h3>
            {/* Yellow Notice Banner */}
            <div
              style={{
                background: "#FCF8E3",
                border: "1px solid #FAEBCC",
                color: "#8A6D3B",
                padding: "10px 14px",
                borderRadius: 4,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              Choose the modules to be shown to your patients in CharmHealth Patient Portal
            </div>

            {/* 2-Column Checkboxes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 30px", maxWidth: 600 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.clinical_summary !== false}
                  onChange={(e) => setModules({ ...modules, clinical_summary: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Clinical Summary
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.visit_summary !== false}
                  onChange={(e) => setModules({ ...modules, visit_summary: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Visit Summary
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.appointments !== false}
                  onChange={(e) => setModules({ ...modules, appointments: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Appointments
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.billing !== false}
                  onChange={(e) => setModules({ ...modules, billing: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Billing
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.questionnaire !== false}
                  onChange={(e) => setModules({ ...modules, questionnaire: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Questionnaire
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.announcements !== false}
                  onChange={(e) => setModules({ ...modules, announcements: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Announcements
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modules.messages !== false}
                  onChange={(e) => setModules({ ...modules, messages: e.target.checked })}
                  style={{ accentColor: "#2563EB" }}
                />
                Messages
              </label>
            </div>

            {orangeSaveBtn}
          </div>

          {/* Section 2: Messages / Documents */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              Messages / Documents
            </h3>
            {/* Yellow Notice Banner */}
            <div
              style={{
                background: "#FCF8E3",
                border: "1px solid #FAEBCC",
                color: "#8A6D3B",
                padding: "10px 14px",
                borderRadius: 4,
                fontSize: 13,
                marginBottom: 16,
                lineHeight: 1.45,
              }}
            >
              Patients can communicate with your practice members and share documents from CharmHealth Patient Portal. You can turn-off this feature or restrict the number of messages sent by patients. By default, this configuration applies to all patients. If required, you can create patient groups using Patient Category field (under Settings &gt; Patient &gt; Categories) and configure different values for each group.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 650 }}>
              {/* Patient Category */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Patient Category</label>
                <select
                  value={messagingPrefs.patient_category || "All Patients"}
                  onChange={(e) => setMessagingPrefs({ ...messagingPrefs, patient_category: e.target.value })}
                  style={{ padding: "5px 10px", borderRadius: 4, border: "1px solid #CCCCCC", fontSize: 13, maxWidth: 220 }}
                >
                  <option value="All Patients">All Patients</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="EECP Patients">EECP Patients</option>
                </select>
              </div>

              {/* Allow patients to send message */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Allow patients to send message from PHR</label>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_patient_messages"
                      checked={messagingPrefs.allow_patient_messages !== false}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_patient_messages: true })}
                    />
                    Yes
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_patient_messages"
                      checked={messagingPrefs.allow_patient_messages === false}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_patient_messages: false })}
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Restrict number of messages */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Restrict number of messages from patient</label>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="restrict_message_count"
                      checked={messagingPrefs.restrict_message_count === true}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, restrict_message_count: true })}
                    />
                    Yes
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="restrict_message_count"
                      checked={messagingPrefs.restrict_message_count !== true}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, restrict_message_count: false })}
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Number of characters allowed */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Number of characters allowed in a patient message</label>
                <input
                  type="number"
                  value={messagingPrefs.max_chars || 500}
                  onChange={(e) => setMessagingPrefs({ ...messagingPrefs, max_chars: parseInt(e.target.value) || 500 })}
                  style={{ width: 120, padding: "5px 8px", borderRadius: 4, border: "1px solid #CCCCCC", fontSize: 13 }}
                />
              </div>

              {/* Allow patients to share documents */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Allow patients to share documents from PHR</label>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_share_documents"
                      checked={messagingPrefs.allow_share_documents !== false}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_share_documents: true })}
                    />
                    Yes
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_share_documents"
                      checked={messagingPrefs.allow_share_documents === false}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_share_documents: false })}
                    />
                    No
                  </label>
                </div>
              </div>
            </div>

            {orangeSaveBtn}
          </div>

          {/* Section 3: Patient Message Preferences */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              Patient Message Preferences
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
              {/* Allow messages to */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Allow messages to</label>
                <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_to"
                      checked={messagingPrefs.allow_to === "groups"}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_to: "groups" })}
                    />
                    Groups Only
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_to"
                      checked={messagingPrefs.allow_to === "members"}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_to: "members" })}
                    />
                    Members Only
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="allow_to"
                      checked={messagingPrefs.allow_to === "both" || !messagingPrefs.allow_to}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, allow_to: "both" })}
                    />
                    Both Groups and Members
                  </label>
                </div>
              </div>

              {/* Message Recipients */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Message Recipients</label>
                <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="recipients"
                      checked={messagingPrefs.recipients === "all" || !messagingPrefs.recipients}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, recipients: "all" })}
                    />
                    All Members
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="recipients"
                      checked={messagingPrefs.recipients === "in_house"}
                      onChange={() => setMessagingPrefs({ ...messagingPrefs, recipients: "in_house" })}
                    />
                    In-house Care Team Members Only
                  </label>
                </div>
              </div>

              {/* Exclude specific members from receiving patient messages */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "flex-start" }}>
                <label style={{ fontSize: 13, color: "#333333", paddingTop: 6 }}>
                  Exclude specific members from receiving patient messages
                </label>
                <div
                  style={{
                    border: "1px solid #CCCCCC",
                    borderRadius: 4,
                    padding: "8px 10px",
                    background: "#FFFFFF",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    minHeight: 46,
                  }}
                >
                  {(messagingPrefs.excluded_member_ids || DEFAULT_EXCLUDED_MEMBERS).map((name: string) => (
                    <span
                      key={name}
                      style={{
                        background: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        borderRadius: 3,
                        padding: "2px 8px",
                        fontSize: 12,
                        color: "#334155",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeExcludedMember(name)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748B",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: 11,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <input
                      type="text"
                      placeholder="Add member..."
                      value={newExcludedMember}
                      onChange={(e) => setNewExcludedMember(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addExcludedMember();
                        }
                      }}
                      style={{
                        border: "none",
                        outline: "none",
                        fontSize: 12,
                        width: 110,
                        padding: "2px 4px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={addExcludedMember}
                      style={{
                        background: "#E2E8F0",
                        border: "none",
                        borderRadius: 3,
                        padding: "2px 6px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {orangeSaveBtn}
          </div>

          {/* Section 4: Patient Shared Data */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              Patient Shared Data
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Facility</label>
                <select
                  value={selectedFacilityForSharedData}
                  onChange={(e) => setSelectedFacilityForSharedData(e.target.value)}
                  style={{ padding: "5px 10px", borderRadius: 4, border: "1px solid #CCCCCC", fontSize: 13, maxWidth: 300 }}
                >
                  {SIX_FACILITIES.map((f) => (
                    <option key={f.code} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>
                  Members to be notified when patients share data from PHR
                </label>
                <input
                  type="text"
                  placeholder="select members"
                  value={sharedDataMembers}
                  onChange={(e) => setSharedDataMembers(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #CCCCCC", fontSize: 13, width: "100%", maxWidth: 380 }}
                />
              </div>
            </div>

            {orangeSaveBtn}
          </div>

          {/* Section 5: Refills */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              Refills
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 }}>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "#333333" }}>Allow patients to request from PHR</label>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={refillPrefs.allow_rx_refill !== false}
                      onChange={(e) => setRefillPrefs({ ...refillPrefs, allow_rx_refill: e.target.checked })}
                    />
                    Rx refill requests
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={refillPrefs.allow_supplement_refill === true}
                      onChange={(e) => setRefillPrefs({ ...refillPrefs, allow_supplement_refill: e.target.checked })}
                    />
                    Supplement refill requests
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", alignItems: "flex-start" }}>
                <label style={{ fontSize: 13, color: "#333333", paddingTop: 4 }}>Send refill notification to</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="notify_provider"
                      checked={refillPrefs.notify_provider !== false}
                      onChange={() => setRefillPrefs({ ...refillPrefs, notify_provider: true })}
                    />
                    Respective Provider
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={refillPrefs.other_member_enabled !== false}
                        onChange={(e) => setRefillPrefs({ ...refillPrefs, other_member_enabled: e.target.checked })}
                      />
                      Other member
                    </label>
                    <input
                      type="text"
                      placeholder="select members"
                      value={refillPrefs.other_members || ""}
                      onChange={(e) => setRefillPrefs({ ...refillPrefs, other_members: e.target.value })}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #CCCCCC", fontSize: 12, width: 180 }}
                    />
                    <span style={{ fontSize: 11, color: "#666666" }}>
                      (ensure member(s) is part of all facilities to handle notifications received across facilities)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {orangeSaveBtn}
          </div>

          {/* Section 6: Practice Preferences */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 10px 0" }}>
              Practice Preferences
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", alignItems: "center", maxWidth: 680 }}>
              <label style={{ fontSize: 13, color: "#333333" }}>
                Show only In-house Care Team members of the patient while booking appointment
              </label>
              <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="in_house_care_team_only_booking"
                    checked={practicePrefs.in_house_care_team_only_booking === true}
                    onChange={() => setPracticePrefs({ in_house_care_team_only_booking: true })}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="in_house_care_team_only_booking"
                    checked={practicePrefs.in_house_care_team_only_booking !== true}
                    onChange={() => setPracticePrefs({ in_house_care_team_only_booking: false })}
                  />
                  No
                </label>
              </div>
            </div>

            {orangeSaveBtn}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SHARE CLINICAL DATA (Exact match to media_1795252465058_db4ff29a.png)
         ========================================================================= */}
      {activeOptionId === "share-clinical-data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 8px 0" }}>
              Share Clinical Data
            </h3>
            <p style={{ fontSize: 13, color: "#555555", margin: "0 0 6px 0", lineHeight: 1.5 }}>
              Meaningful Use requirement mandates providing access to patients or their representatives, to view, download and transmit their health information below.
            </p>
            <p style={{ fontSize: 13, color: "#555555", margin: "0 0 18px 0", lineHeight: 1.5 }}>
              This is a global settings applicable to all patients that have Patient Portal account. You can also share records to specific patients from Patient Dashboard &gt; Share Clinical Data section.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 40px", maxWidth: 600 }}>
            {/* Column 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.smoking_status !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, smoking_status: e.target.checked })}
                />
                Smoking Status
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.procedures !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, procedures: e.target.checked })}
                />
                Procedures
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.diagnoses !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, diagnoses: e.target.checked })}
                />
                Diagnoses
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.medications !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, medications: e.target.checked })}
                />
                Medications
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.allergies !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, allergies: e.target.checked })}
                />
                Allergies
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.vitals !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, vitals: e.target.checked })}
                />
                Vitals
              </label>
            </div>

            {/* Column 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.growth_chart !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, growth_chart: e.target.checked })}
                />
                Growth Chart
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.vaccines !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, vaccines: e.target.checked })}
                />
                Vaccines
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.implanted_devices !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, implanted_devices: e.target.checked })}
                />
                Implanted Devices
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.goals !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, goals: e.target.checked })}
                />
                Goals
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.health_concerns !== false}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, health_concerns: e.target.checked })}
                />
                Health Concerns
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sharedClinicalSections.care_team === true}
                  onChange={(e) => setSharedClinicalSections({ ...sharedClinicalSections, care_team: e.target.checked })}
                />
                Care Team
              </label>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={saveShareClinicalData}
              disabled={saving}
              style={{
                background: "#FF9800",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                padding: "6px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PATIENT PORTAL EMBED (Exact match to media_1795252465066_4acbecd4.png)
         ========================================================================= */}
      {activeOptionId === "patient-portal-embed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 6px 0" }}>
              Patient Portal Embed
            </h3>
            <p style={{ fontSize: 13, color: "#555555", margin: "0 0 14px 0", lineHeight: 1.45 }}>
              Patient Portal Embed feature enables you to embed CharmHealth Patient Portal login URL in your practice website and allows patients to access your practice specific login page.
            </p>
            <div style={{ fontSize: 13, color: "#333333", lineHeight: 1.5, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Options</div>
              <div style={{ marginBottom: 6 }}>
                <strong>1. Patient Portal Embed Code with Button</strong>
                <br />
                <span style={{ color: "#666666" }}>
                  Embed this code snippet, if you do not have a patient portal button/link in your website. This code creates a &apos;Patient Portal&apos; button with link to patient portal login page.
                </span>
              </div>
              <div>
                <strong>2. Patient Portal URL</strong>
                <br />
                <span style={{ color: "#666666" }}>
                  If you already have a patient portal button/link in your website, change the existing URL with this new URL that is specific to your practice.
                </span>
              </div>
            </div>
          </div>

          {/* 6 Facilities Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {SIX_FACILITIES.map((fac) => {
              const snippet = `<div style="font-size:14px; margin:20px 0;"><a href="${fac.url}" target="_blank" class="charm-btn" style="text-decoration:none; background:#00A896; color:#ffffff; padding:10px 18px; border-radius:4px; font-weight:bold;">Patient Portal</a></div>`;

              return (
                <div key={fac.code}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#00838F", marginBottom: 6 }}>
                    Facility: {fac.name}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Left box: Embed Code */}
                    <div style={{ border: "1px solid #B2DFDB", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          background: "#26A69A",
                          color: "#FFFFFF",
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Patient Portal Embed Code with Button
                      </div>
                      <textarea
                        readOnly
                        rows={6}
                        value={snippet}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "none",
                          fontSize: 12,
                          fontFamily: "monospace",
                          boxSizing: "border-box",
                          outline: "none",
                          background: "#FAFAFA",
                          resize: "none",
                        }}
                      />
                    </div>

                    {/* Right box: Portal URL */}
                    <div style={{ border: "1px solid #B2DFDB", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          background: "#26A69A",
                          color: "#FFFFFF",
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        Patient Portal URL
                      </div>
                      <textarea
                        readOnly
                        rows={6}
                        value={fac.url}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "none",
                          fontSize: 12,
                          fontFamily: "monospace",
                          boxSizing: "border-box",
                          outline: "none",
                          background: "#FAFAFA",
                          resize: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CUSTOM APP (Exact match to media_1795252465056_2fbb0e56.png)
         ========================================================================= */}
      {activeOptionId === "custom-app" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Banner with Right Subscription Charges Table */}
          <div
            style={{
              background: "#FFFDF6",
              border: "1px solid #F6ECD5",
              borderRadius: 4,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ flex: 1, fontSize: 13, color: "#444444", lineHeight: 1.5 }}>
              Build your own Practice Branded Patient App. Customize your logo and other branding information on the Mobile App and make it available in AppStores for your patients to download.
            </div>

            {/* Subscription charges box on right */}
            <div
              style={{
                borderLeft: "1px solid #E0D9C8",
                paddingLeft: 20,
                minWidth: 240,
                fontSize: 12,
                color: "#333333",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Annual Subscription Charges</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>1st Year</span>
                <span>: $ 500</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Subsequent Year(s)</span>
                <span>: $ 250</span>
              </div>
              <div style={{ fontSize: 11, color: "#666666", marginTop: 4 }}>
                Unlimited Patient Downloads
              </div>
            </div>
          </div>

          {/* Sub Tabs: MAIN MENU | MAPS | ABOUT | LOGIN | APP DETAILS */}
          <div style={{ display: "flex", gap: 20, borderBottom: "1px solid #E0E0E0", marginTop: 8, paddingBottom: 2 }}>
            {(["MAIN MENU", "MAPS", "ABOUT", "LOGIN", "APP DETAILS"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCustomAppSubTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: customAppSubTab === tab ? "2px solid #FF9800" : "2px solid transparent",
                  color: customAppSubTab === tab ? "#FF9800" : "#666666",
                  fontSize: 13,
                  fontWeight: customAppSubTab === tab ? 700 : 500,
                  padding: "6px 4px",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* MAIN MENU Tab Content */}
          {customAppSubTab === "MAIN MENU" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "#666666", marginBottom: 14 }}>
                Choose the modules to be shown to your patients.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 300 }}>
                {[
                  { key: "appointments", label: "Appointments" },
                  { key: "messages", label: "Messages" },
                  { key: "document", label: "Document" },
                  { key: "questionnaire", label: "Questionnaire" },
                  { key: "medications", label: "Medications" },
                  { key: "lab_results", label: "Lab results" },
                  { key: "billing", label: "Billing" },
                  { key: "visit_summary", label: "Visit summary" },
                  { key: "announcements", label: "Announcements" },
                  { key: "useful_info", label: "Useful Info" },
                  { key: "about", label: "About" },
                ].map((item) => (
                  <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={customAppMenu[item.key] !== false}
                      onChange={(e) => setCustomAppMenu({ ...customAppMenu, [item.key]: e.target.checked })}
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              {/* Bottom Note */}
              <div style={{ fontSize: 12, color: "#555555", marginTop: 24, marginBottom: 16 }}>
                A dummy patient will be created in your account as part of this process. This is required by Apple/Google, as part of their approval process.
              </div>

              {/* Teal Buttons SAVE & SUBMIT */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={saveCustomApp}
                  disabled={saving}
                  style={{
                    background: "#00ACC1",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 3,
                    padding: "7px 24px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveCustomApp();
                    alert("Application submitted for AppStore review packaging!");
                  }}
                  style={{
                    background: "#00ACC1",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 3,
                    padding: "7px 24px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          )}

          {customAppSubTab !== "MAIN MENU" && (
            <div style={{ padding: "30px 10px", color: "#666666", fontSize: 13 }}>
              {customAppSubTab} configurations are auto-managed based on practice license and AppStore provisioning.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: USEFUL INFO (List & CRUD modal)
         ========================================================================= */}
      {activeOptionId === "phr-useful-info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2B3A4A", margin: "0 0 4px 0" }}>
                Useful Info
              </h3>
              <p style={{ fontSize: 13, color: "#666666", margin: 0 }}>
                Information, guidelines, and helplines displayed to patients in the PHR portal under Useful Info.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingItem({
                  title: "",
                  category: "General Info",
                  content_or_url: "",
                  display_order: usefulInfoList.length + 1,
                  is_active: true,
                });
                setShowItemModal(true);
              }}
              style={{
                background: "#FF9800",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} /> + Add New
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {usefulInfoList.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{item.title}</span>
                    <span
                      style={{
                        background: "#E0F2FE",
                        color: "#0369A1",
                        fontSize: 11,
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    {item.content_or_url}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setShowItemModal(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563EB",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUsefulInfoItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#DC2626",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Modal */}
          {showItemModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
              }}
            >
              <form
                onSubmit={saveUsefulInfoItem}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  padding: "24px",
                  width: "100%",
                  maxWidth: 440,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                }}
              >
                <h4 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>
                  {editingItem?.id ? "Edit Useful Info" : "Add Useful Info"}
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem?.title || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Category
                    </label>
                    <select
                      value={editingItem?.category || "General Info"}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    >
                      <option value="General Info">General Info</option>
                      <option value="Emergency Helpline">Emergency Helpline</option>
                      <option value="Counterpulsation Guide">Counterpulsation Guide</option>
                      <option value="Diet & Lifestyle">Diet & Lifestyle</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Content / Helpline / URL
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={editingItem?.content_or_url || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, content_or_url: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: "#FF9800", color: "#FFFFFF", border: "none", borderRadius: 4, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
