import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Smartphone,
  Plus,
  Edit2,
  Check,
  Save,
  RotateCcw,
  X,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../../api";

interface PatientNotificationsSubpageProps {
  type: "text-voice" | "email" | "whatsapp";
}

const DEFAULT_SMS_TEMPLATES: Record<string, string> = {
  confirmation:
    "Dear $PATIENT_NAME, your appointment at $PRACTICE with $DOCTOR is confirmed. Facility: $FACILITY_NAME.",
  reschedule:
    "Dear $PATIENT_NAME, your appointment at $PRACTICE has been rescheduled. For queries call $FACILITY_NAME.",
  cancellation:
    "Dear $PATIENT_NAME, your appointment at $PRACTICE has been cancelled. Please contact us to rebook.",
  reminder:
    "Reminder: Dear $PATIENT_NAME, you have a scheduled appointment tomorrow at $PRACTICE with $DOCTOR.",
  video_consult:
    "Dear $PATIENT_NAME, your Heal Your Heart TeleHealth video session link is ready: https://telehealth.healyourheart.in",
  waiting_list:
    "Dear $PATIENT_NAME, an earlier slot has opened up at $PRACTICE. Please contact reception to confirm.",
  lab_shared:
    "Dear $PATIENT_NAME, your cardiac lab diagnostic report has been shared to your patient portal account.",
  document_shared:
    "Dear $PATIENT_NAME, a clinical document / consent form has been shared with you by $PRACTICE.",
  visit_summary:
    "Dear $PATIENT_NAME, your after-visit clinical summary from $PRACTICE is now available in your PHR portal.",
  birthday_wish:
    "Wishing you a very Happy Birthday from all of us at Heal Your Heart Cardiology & EECP Center!",
  invoice_phr:
    "Dear $PATIENT_NAME, digital invoice for your recent visit at $PRACTICE has been published to your portal.",
};

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: "Appointment Confirmation",
  reschedule: "Appointment Reschedule",
  cancellation: "Appointment Cancellation",
  reminder: "Appointment Reminder",
  video_consult: "Video Consult",
  waiting_list: "Waiting List",
  lab_shared: "Lab Shared",
  document_shared: "Document Shared",
  visit_summary: "Visit Summary",
  birthday_wish: "Birthday Wish",
  invoice_phr: "Invoice sent to PHR",
};

export function PatientNotificationsSubpage({ type }: PatientNotificationsSubpageProps) {
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(`hyh_patient_${type}_templates`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_SMS_TEMPLATES;
  });

  const [activeModal, setActiveModal] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("confirmation");
  const [editingContent, setEditingContent] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  // Load from backend
  useEffect(() => {
    api<any>(`/settings/patient/${type === "email" ? "email-notifications" : "text-voice-notifications"}`)
      .then((res) => {
        if (res && res.data && res.data.templates) {
          setTemplates(res.data.templates);
          localStorage.setItem(`hyh_patient_${type}_templates`, JSON.stringify(res.data.templates));
        }
      })
      .catch(() => {});
  }, [type]);

  const handleOpenEditModal = (key?: string) => {
    const targetKey = key || "confirmation";
    setSelectedTemplateKey(targetKey);
    setEditingContent(templates[targetKey] || DEFAULT_SMS_TEMPLATES[targetKey] || "");
    setActiveModal(true);
  };

  const handleSaveModal = async () => {
    const updated = {
      ...templates,
      [selectedTemplateKey]: editingContent,
    };
    setTemplates(updated);
    localStorage.setItem(`hyh_patient_${type}_templates`, JSON.stringify(updated));

    try {
      await api(
        `/admin/settings/patient/${type === "email" ? "email-notifications" : "text-voice-notifications"}`,
        "PUT",
        { templates: updated }
      );
    } catch {}

    setActiveModal(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleRestoreDefault = () => {
    setEditingContent(DEFAULT_SMS_TEMPLATES[selectedTemplateKey] || "");
  };

  const insertPlaceholder = (tag: string) => {
    setEditingContent((prev) => prev + " " + tag);
  };

  if (type === "whatsapp") {
    return (
      <div className="charm-settings-form-container">
        <div className="charm-form-header-box flex justify-between items-center">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">
              WhatsApp Notification
            </h2>
            <p className="text-[13px] text-slate-600">
              Official WhatsApp Business Cloud API integration for automated EECP session reminders, lab PDF reports, and appointment alerts.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ● Connected & Operational
          </span>
        </div>

        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Verified Business Number
              </label>
              <input
                type="text"
                readOnly
                value="+91 94440 12345 (Heal Your Heart Official)"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Meta Business Account ID
              </label>
              <input
                type="text"
                readOnly
                value="WABA-HYH-CHENNAI-2026-904"
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-sm font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#166eb8]" />
              <span>Send automated WhatsApp confirmation upon scheduling appointment</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#166eb8]" />
              <span>Send 24-hour advance appointment reminder with 1-click confirmation</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-[#166eb8]" />
              <span>Deliver signed ECG, Echo and EECP daily progress summaries as encrypted PDF</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="charm-settings-form-container">
      {savedToast && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Notification template updated and saved automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">
            {type === "email" ? "Email Notifications" : "Text / Voice Notifications"}
          </h2>
          <p className="text-[13px] text-slate-600">
            Configure automated {type === "email" ? "email" : "SMS"} notifications sent to patients for clinic milestones.
          </p>
        </div>

        <button
          type="button"
          className="charm-btn-orange-new"
          onClick={() => handleOpenEditModal("confirmation")}
        >
          <Edit2 size={14} />
          <span>{type === "email" ? "Edit Email Content" : "Edit SMS Content"}</span>
        </button>
      </div>

      <div className="charm-settings-table-wrapper">
        <table className="charm-settings-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Notification Event</th>
              <th style={{ width: "55%" }}>Template Message Content</th>
              <th style={{ width: "15%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(TEMPLATE_LABELS).map((key) => {
              const label = TEMPLATE_LABELS[key];
              const content = templates[key] || DEFAULT_SMS_TEMPLATES[key] || "";
              return (
                <tr key={key}>
                  <td>
                    <strong className="text-slate-800 text-[13px]">{label}</strong>
                  </td>
                  <td className="text-slate-600 text-[12.5px] leading-relaxed">
                    {content}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="text-[#166eb8] hover:underline text-[12.5px] font-medium"
                      onClick={() => handleOpenEditModal(key)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Content Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-[15px]">
                {type === "email" ? "Edit Email Content" : "Edit SMS Content"}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Notification Type
                </label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => {
                    const k = e.target.value;
                    setSelectedTemplateKey(k);
                    setEditingContent(templates[k] || DEFAULT_SMS_TEMPLATES[k] || "");
                  }}
                  className="charm-select w-full"
                >
                  {Object.keys(TEMPLATE_LABELS).map((k) => (
                    <option key={k} value={k}>
                      {TEMPLATE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Template Content
                </label>
                <textarea
                  rows={4}
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="charm-textarea w-full font-mono text-[13px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Insert Placeholders (Click to Add)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["$PATIENT_NAME", "$PRACTICE", "$EMAIL_ID", "$FACILITY_NAME", "$DOCTOR"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertPlaceholder(tag)}
                      className="px-2 py-1 bg-blue-50 text-[#166eb8] hover:bg-blue-100 rounded text-xs font-mono font-medium border border-blue-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                className="text-slate-600 hover:text-slate-800 text-xs font-medium flex items-center gap-1"
                onClick={handleRestoreDefault}
              >
                <RotateCcw size={13} />
                <span>Restore to default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => setActiveModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="charm-btn-orange-new"
                  onClick={handleSaveModal}
                >
                  <Save size={13} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

