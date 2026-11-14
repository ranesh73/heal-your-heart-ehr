import React, { useState, useEffect } from "react";
import { Info, Check, AlertCircle, Users } from "lucide-react";
import { api } from "../../api";

interface PracticeMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export function MessagePreferencesPage() {
  const [notificationEmail, setNotificationEmail] = useState<"Required" | "Not Required">("Required");
  const [receiveFromPatients, setReceiveFromPatients] = useState<"Yes" | "No">("Yes");
  const [questionnaireNotification, setQuestionnaireNotification] = useState<"Required" | "Not Required">("Required");
  const [feedbackNotification, setFeedbackNotification] = useState<"Required" | "Not Required">("Required");
  const [sharedMemberIds, setSharedMemberIds] = useState<string[]>([]);

  // Practice staff
  const [members, setMembers] = useState<PracticeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [prefData, membersData] = await Promise.all([
          api<any>("/settings/user-preferences/message:preferences"),
          api<PracticeMember[]>("/settings/practice-members"),
        ]);

        if (prefData) {
          setNotificationEmail(prefData.notification_email || "Required");
          setReceiveFromPatients(prefData.receive_from_patients || "Yes");
          setQuestionnaireNotification(prefData.questionnaire_notification || "Required");
          setFeedbackNotification(prefData.feedback_notification || "Required");
          setSharedMemberIds(prefData.shared_member_ids || []);
        }
        setMembers(membersData || []);
      } catch (err: any) {
        console.error("Failed to load message preferences:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggleMember = (memberId: string) => {
    setSharedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api("/settings/user-preferences/message:preferences", "PUT", {
        notification_email: notificationEmail,
        receive_from_patients: receiveFromPatients,
        questionnaire_notification: questionnaireNotification,
        feedback_notification: feedbackNotification,
        shared_member_ids: sharedMemberIds,
      });
      setFeedback({ type: "success", message: "Message preferences saved successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to save message preferences." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Loading preferences...</div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Panel Heading */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a", fontWeight: 700 }}>
          My Preferences
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Configure message notification delivery, patient contact permissions, and collaborative message routing.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: feedback.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: "1px solid",
            borderColor: feedback.type === "success" ? "#bbf7d0" : "#fecaca",
            color: feedback.type === "success" ? "#15803d" : "#dc2626",
            padding: "8px 14px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {feedback.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Settings Panel */}
      <form
        onSubmit={handleSave}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 24,
          maxWidth: 900,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ROW 1: Message Notification Email */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Message Notification Email</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="msgNotificationEmail"
                  value="Required"
                  checked={notificationEmail === "Required"}
                  onChange={() => setNotificationEmail("Required")}
                />
                Required
              </label>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="msgNotificationEmail"
                  value="Not Required"
                  checked={notificationEmail === "Not Required"}
                  onChange={() => setNotificationEmail("Not Required")}
                />
                Not Required
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 2: Receive Message From Patients */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Receive Message From Patients</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="rcvFromPatients"
                  value="Yes"
                  checked={receiveFromPatients === "Yes"}
                  onChange={() => setReceiveFromPatients("Yes")}
                />
                Yes
              </label>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="rcvFromPatients"
                  value="No"
                  checked={receiveFromPatients === "No"}
                  onChange={() => setReceiveFromPatients("No")}
                />
                No
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 3: Questionnaire Notification Message From Patients */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Questionnaire Notification Message From Patients</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="questNotification"
                  value="Required"
                  checked={questionnaireNotification === "Required"}
                  onChange={() => setQuestionnaireNotification("Required")}
                />
                Required
              </label>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="questNotification"
                  value="Not Required"
                  checked={questionnaireNotification === "Not Required"}
                  onChange={() => setQuestionnaireNotification("Not Required")}
                />
                Not Required
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 4: Feedback Notification Message From Patients */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Feedback Notification Message From Patients</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="feedbackNotification"
                  value="Required"
                  checked={feedbackNotification === "Required"}
                  onChange={() => setFeedbackNotification("Required")}
                />
                Required
              </label>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="feedbackNotification"
                  value="Not Required"
                  checked={feedbackNotification === "Not Required"}
                  onChange={() => setFeedbackNotification("Not Required")}
                />
                Not Required
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 5: Share your Patient messages with other Members */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={rowLabelText}>Share your Patient messages with other Members</span>
                <span title="Selected members can view and collaborate on patient inquiries and clinical messages assigned to you.">
                  <Info size={14} color="#0284c7" style={{ cursor: "pointer" }} />
                </span>
              </div>
            </div>

            <div style={{ ...controlColumnStyle, flexDirection: "column", alignItems: "flex-start" }}>
              {/* Member Selector Dropdown / Multi-Select Box */}
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  padding: "6px 10px",
                  maxHeight: 140,
                  overflowY: "auto",
                  width: 320,
                  background: "#f8fafc",
                }}
              >
                {members.length === 0 ? (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>select members</span>
                ) : (
                  members.map((m) => {
                    const isChecked = sharedMemberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 6px",
                          borderRadius: 4,
                          fontSize: 12,
                          color: "#334155",
                          cursor: "pointer",
                          background: isChecked ? "#e0f2fe" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(m.id)}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>
                          {m.name} ({m.role})
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <span style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                {sharedMemberIds.length} member(s) selected
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "7px 24px",
              background: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px 1fr",
  alignItems: "center",
  gap: 16,
};

const labelColumnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const rowLabelText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const controlColumnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 24,
};

const radioOptionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "#334155",
  cursor: "pointer",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#f1f5f9",
};

