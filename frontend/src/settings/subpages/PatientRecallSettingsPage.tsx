import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { api, navigate, Row } from "../../api";
import { useApp } from "../../context";

const DEFAULT_SMS_CONTENT =
  "Reminder from $PRACTICE to schedule for $NOTES. Please ignore, if already scheduled";

const DAY_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 14, 15, 21, 30];

export function PatientRecallSettingsPage({
  activeOptionId,
}: {
  activeOptionId: string;
}) {
  const { notify } = useApp();
  const qc = useQueryClient();

  // --- Shared Name Modal for Add/Edit Recall Type or Recall Status ---
  const [nameModal, setNameModal] = useState<{
    kind: "type" | "status";
    mode: "add" | "edit";
    id?: string;
    name: string;
  } | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // --- Queries ---
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

  // --- Preferences Form State ---
  const [defaultEmail, setDefaultEmail] = useState(true);
  const [defaultSms, setDefaultSms] = useState(true);
  const [emailDays, setEmailDays] = useState(3);
  const [smsDays, setSmsDays] = useState(3);
  const [smsTemplateText, setSmsTemplateText] = useState(DEFAULT_SMS_CONTENT);
  const [markCompleteOnSend, setMarkCompleteOnSend] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!prefsQuery.data) return;
    setDefaultEmail(Boolean(prefsQuery.data.default_email_enabled));
    setDefaultSms(Boolean(prefsQuery.data.default_sms_enabled));
    setEmailDays(Number(prefsQuery.data.email_days_before ?? 3));
    setSmsDays(Number(prefsQuery.data.sms_days_before ?? 3));
    setSmsTemplateText(prefsQuery.data.sms_template_text || DEFAULT_SMS_CONTENT);
    setMarkCompleteOnSend(Boolean(prefsQuery.data.mark_complete_on_send ?? true));
  }, [prefsQuery.data]);

  const handleSaveNameModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameModal || !nameModal.name.trim()) return;
    setModalSaving(true);
    setModalError("");
    try {
      const base =
        nameModal.kind === "type" ? "/settings/recall-types" : "/settings/recall-statuses";
      if (nameModal.mode === "add") {
        await api(base, "POST", { name: nameModal.name.trim() });
        notify(
          nameModal.kind === "type"
            ? "Recall type added."
            : "Recall status added.",
        );
      } else {
        await api(`${base}/${nameModal.id}`, "PUT", { name: nameModal.name.trim() });
        notify(
          nameModal.kind === "type"
            ? "Recall type updated."
            : "Recall status updated.",
        );
      }
      setNameModal(null);
      void qc.invalidateQueries({
        queryKey:
          nameModal.kind === "type"
            ? ["settings-recall-types"]
            : ["settings-recall-statuses"],
      });
    } catch (err: any) {
      setModalError(err?.message || String(err));
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteType = async (item: Row) => {
    if (!window.confirm(`Delete recall type "${item.name}"?`)) return;
    try {
      await api(`/settings/recall-types/${item.id}`, "DELETE");
      void qc.invalidateQueries({ queryKey: ["settings-recall-types"] });
      notify("Recall type deleted.");
    } catch (err: any) {
      notify(err?.message || "Unable to delete recall type");
    }
  };

  const handleDeleteStatus = async (item: Row) => {
    if (!window.confirm(`Delete recall status "${item.name}"?`)) return;
    try {
      await api(`/settings/recall-statuses/${item.id}`, "DELETE");
      void qc.invalidateQueries({ queryKey: ["settings-recall-statuses"] });
      notify("Recall status deleted.");
    } catch (err: any) {
      notify(err?.message || "Unable to delete recall status");
    }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api("/settings/recall-preferences", "PUT", {
        default_email_enabled: defaultEmail,
        default_sms_enabled: defaultSms,
        email_days_before: Number(emailDays),
        sms_days_before: Number(smsDays),
        sms_template_text: smsTemplateText.trim() || DEFAULT_SMS_CONTENT,
        mark_complete_on_send: markCompleteOnSend,
      });
      void qc.invalidateQueries({ queryKey: ["settings-recall-preferences"] });
      notify("Recall preferences saved.");
    } catch (err: any) {
      notify(err?.message || "Unable to save recall preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const activeTab = activeOptionId || "recall-types";

  return (
    <div className="pr-settings-wrap">
      {/* TAB 1: RECALL TYPES */}
      {activeTab === "recall-types" && (
        <div>
          <div className="pr-settings-action-bar">
            <button
              type="button"
              className="ct-btn-orange"
              onClick={() => {
                setModalError("");
                setNameModal({ kind: "type", mode: "add", name: "" });
              }}
            >
              <Plus size={15} /> Recall Type
            </button>
          </div>
          <table className="pr-settings-list-table">
            <thead>
              <tr>
                <th>Recall Type</th>
                <th style={{ width: 90, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {typesQuery.isLoading ? (
                <tr>
                  <td colSpan={2} className="ct-empty-cell">Loading recall types...</td>
                </tr>
              ) : (typesQuery.data || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="pr-settings-row-icons">
                      <button
                        type="button"
                        className="pr-icon-action"
                        title="Edit Recall Type"
                        onClick={() => {
                          setModalError("");
                          setNameModal({
                            kind: "type",
                            mode: "edit",
                            id: item.id,
                            name: item.name,
                          });
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="pr-icon-action danger"
                        title="Delete Recall Type"
                        onClick={() => void handleDeleteType(item)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: RECALL STATUS */}
      {activeTab === "recall-status" && (
        <div>
          <div className="pr-settings-action-bar">
            <button
              type="button"
              className="ct-btn-orange"
              onClick={() => {
                setModalError("");
                setNameModal({ kind: "status", mode: "add", name: "" });
              }}
            >
              <Plus size={15} /> Recall Status
            </button>
          </div>
          <table className="pr-settings-list-table">
            <thead>
              <tr>
                <th>Recall Status</th>
                <th style={{ width: 220, textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {statusesQuery.isLoading ? (
                <tr>
                  <td colSpan={2} className="ct-empty-cell">Loading recall statuses...</td>
                </tr>
              ) : (statusesQuery.data || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td style={{ textAlign: "right" }}>
                    {item.is_system_default ? (
                      <span className="pr-default-status-note">
                        Default status cannot be edited
                      </span>
                    ) : (
                      <div className="pr-settings-row-icons">
                        <button
                          type="button"
                          className="pr-icon-action"
                          title="Edit Recall Status"
                          onClick={() => {
                            setModalError("");
                            setNameModal({
                              kind: "status",
                              mode: "edit",
                              id: item.id,
                              name: item.name,
                            });
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="pr-icon-action danger"
                          title="Delete Recall Status"
                          onClick={() => void handleDeleteStatus(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: RECALL PREFERENCES */}
      {activeTab === "recall-preferences" && (
        <div className="pr-prefs-container">
          <table className="pr-prefs-table">
            <thead>
              <tr>
                <th style={{ width: "24%" }} />
                <th style={{ width: "38%" }}>Email</th>
                <th style={{ width: "38%" }}>Text</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Default Reminder option */}
              <tr>
                <td className="pr-prefs-label">Default Reminder option</td>
                <td>
                  <input
                    type="checkbox"
                    checked={defaultEmail}
                    onChange={(e) => setDefaultEmail(e.target.checked)}
                    aria-label="Default Email Reminder"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={defaultSms}
                    onChange={(e) => setDefaultSms(e.target.checked)}
                    aria-label="Default Text Reminder"
                  />
                </td>
              </tr>

              {/* Row 2: Recall Reminder Date */}
              <tr>
                <td className="pr-prefs-label">Recall Reminder Date</td>
                <td>
                  <div className="pr-prefs-days-row">
                    <select
                      value={emailDays}
                      onChange={(e) => setEmailDays(Number(e.target.value))}
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <span>day(s) before due date</span>
                  </div>
                </td>
                <td>
                  <div className="pr-prefs-days-row">
                    <select
                      value={smsDays}
                      onChange={(e) => setSmsDays(Number(e.target.value))}
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <span>day(s) before due date</span>
                  </div>
                </td>
              </tr>

              {/* Row 3: Reminder Content */}
              <tr>
                <td className="pr-prefs-label" style={{ verticalAlign: "top" }}>
                  Reminder Content
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <span>
                    Use 'Recall Reminder' template under{" "}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => navigate("/settings/templates/email-templates")}
                    >
                      Email Templates
                    </button>{" "}
                    section
                  </span>
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <div className="pr-sms-content-wrap">
                    <textarea
                      rows={4}
                      value={smsTemplateText}
                      onChange={(e) => setSmsTemplateText(e.target.value)}
                    />
                    <button
                      type="button"
                      className="pr-restore-btn"
                      onClick={() => setSmsTemplateText(DEFAULT_SMS_CONTENT)}
                    >
                      <RotateCcw size={13} /> Restore to default
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Below Table: Mark Recall Status as complete when reminder sent */}
          <div className="pr-prefs-radio-row">
            <span>Mark Recall Status as complete when reminder sent</span>
            <label className="pr-radio-opt">
              <input
                type="radio"
                name="markCompleteOnSend"
                checked={markCompleteOnSend === true}
                onChange={() => setMarkCompleteOnSend(true)}
              />
              <span>Yes</span>
            </label>
            <label className="pr-radio-opt">
              <input
                type="radio"
                name="markCompleteOnSend"
                checked={markCompleteOnSend === false}
                onChange={() => setMarkCompleteOnSend(false)}
              />
              <span>No</span>
            </label>
          </div>

          <div className="pr-prefs-footer">
            <button
              type="button"
              className="ct-btn-orange"
              disabled={savingPrefs}
              onClick={() => void handleSavePrefs()}
            >
              {savingPrefs ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal for Recall Type or Recall Status */}
      {nameModal && (
        <div className="ct-modal-backdrop" onClick={() => setNameModal(null)}>
          <div className="ct-modal-dialog ct-modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="ct-modal-header">
              <h3>
                {nameModal.mode === "add" ? "Add" : "Edit"}{" "}
                {nameModal.kind === "type" ? "Recall Type" : "Recall Status"}
              </h3>
              <button
                type="button"
                className="ct-icon-close"
                onClick={() => setNameModal(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSaveNameModal(e)} className="ct-modal-body">
              {modalError && <div className="ct-error-box">{modalError}</div>}
              <label className="ct-field">
                <span>
                  {nameModal.kind === "type" ? "Recall Type Name" : "Recall Status Name"}{" "}
                  <em className="req">*</em>
                </span>
                <input
                  autoFocus
                  value={nameModal.name}
                  onChange={(e) =>
                    setNameModal({ ...nameModal, name: e.target.value })
                  }
                  placeholder={
                    nameModal.kind === "type"
                      ? "e.g. Post-EECP Follow-up"
                      : "e.g. Callback Requested"
                  }
                  required
                />
              </label>
              <div className="pr-form-footer" style={{ marginTop: 16 }}>
                <button type="submit" className="ct-btn-orange" disabled={modalSaving}>
                  {modalSaving ? "Saving..." : nameModal.mode === "add" ? "Add" : "Save"}
                </button>
                <button
                  type="button"
                  className="ct-btn-cancel"
                  onClick={() => setNameModal(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
