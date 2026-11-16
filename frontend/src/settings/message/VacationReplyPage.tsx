import React, { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { RichTextEditor } from "../common/RichTextEditor";

export function VacationReplyPage() {
  const [enabled, setEnabled] = useState(false);
  const [sendToMembers, setSendToMembers] = useState(true);
  const [sendToPatients, setSendToPatients] = useState(true);
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [markNonWorking, setMarkNonWorking] = useState(false);
  const [messageHtml, setMessageHtml] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<any>("/settings/user-preferences/message:vacation");
        if (data) {
          setEnabled(Boolean(data.enabled));
          setSendToMembers(data.send_to_members ?? true);
          setSendToPatients(data.send_to_patients ?? true);
          setSubject(data.subject || "");
          setStartDate(data.start_date || "");
          setEndDate(data.end_date || "");
          setMarkNonWorking(Boolean(data.mark_non_working));
          setMessageHtml(data.message_html || "");
        }
      } catch (err: any) {
        console.error("Failed to load vacation reply preference:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled) {
      if (!sendToMembers && !sendToPatients) {
        setFeedback({ type: "error", message: "At least one recipient (Practice Members or Patients) must be selected." });
        return;
      }
      if (!subject.trim()) {
        setFeedback({ type: "error", message: "Subject is required." });
        return;
      }
      if (!startDate) {
        setFeedback({ type: "error", message: "Start date is required." });
        return;
      }
      if (!endDate) {
        setFeedback({ type: "error", message: "End date is required." });
        return;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setFeedback({ type: "error", message: "End date cannot be earlier than start date." });
        return;
      }
      if (!messageHtml.trim()) {
        setFeedback({ type: "error", message: "Vacation reply message is required when enabled." });
        return;
      }
    }

    setSaving(true);
    setFeedback(null);
    try {
      await api("/settings/user-preferences/message:vacation", "PUT", {
        enabled,
        send_to_members: sendToMembers,
        send_to_patients: sendToPatients,
        subject: subject.trim(),
        start_date: startDate,
        end_date: endDate,
        mark_non_working: markNonWorking,
        message_html: messageHtml,
      });
      setFeedback({ type: "success", message: "Vacation reply settings updated successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update vacation reply settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Loading vacation reply settings...</div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Panel Heading */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a", fontWeight: 700 }}>
          Vacation Reply
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Automated out-of-office message responder for patient and practice communications during clinician leaves.
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
        onSubmit={handleUpdate}
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 24,
          maxWidth: 900,
        }}
      >
        {/* Enable Checkbox */}
        <div style={{ marginBottom: enabled ? 20 : 24 }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Enable Vacation Reply
          </label>
        </div>

        {/* When Enabled: Additional Vacation Reply Form */}
        {enabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
            {/* 1. Send To * */}
            <div>
              <label style={labelStyle}>
                Send To <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={sendToMembers}
                    onChange={(e) => setSendToMembers(e.target.checked)}
                  />
                  Practice Members
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={sendToPatients}
                    onChange={(e) => setSendToPatients(e.target.checked)}
                  />
                  Patients
                </label>
              </div>
            </div>

            {/* 2. Subject * */}
            <div>
              <label style={labelStyle}>
                Subject <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Subject (e.g. Out of Office: Attending Cardiology Symposium)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* 3. Period * */}
            <div>
              <label style={labelStyle}>
                Period <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={dateInputStyle}
                  required
                />
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={dateInputStyle}
                  required
                />
              </div>
            </div>

            {/* 4. Mark these days as non working in calendar */}
            <div>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={markNonWorking}
                  onChange={(e) => setMarkNonWorking(e.target.checked)}
                />
                Mark these days as non working in calendar
              </label>
            </div>

            {/* 5. Vacation reply message * */}
            <div>
              <label style={labelStyle}>
                Vacation reply message <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <RichTextEditor
                value={messageHtml}
                onChange={setMessageHtml}
                placeholder="Enter automated vacation response message..."
                minHeight={180}
              />
            </div>
          </div>
        )}

        {/* Update Button */}
        <div>
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
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 4,
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  outline: "none",
  background: "#ffffff",
};

const dateInputStyle: React.CSSProperties = {
  padding: "7px 10px",
  fontSize: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  outline: "none",
  background: "#ffffff",
};

