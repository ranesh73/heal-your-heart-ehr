import React, { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { api } from "../../api";

export function TaskPreferencesPage() {
  // Row 1: Task Reminder Notification (Email, Charm Message)
  const [reminderEmail, setReminderEmail] = useState(true);
  const [reminderCharmMessage, setReminderCharmMessage] = useState(true);

  // Row 2: Task Assigned Notification (Charm Message)
  const [assignedCharmMessage, setAssignedCharmMessage] = useState(true);

  // Row 3: Task Completed Notification (Charm Message)
  const [completedCharmMessage, setCompletedCharmMessage] = useState(true);

  // Row 4: Sort Tasks By (Created Date, Due Date)
  const [sortBy, setSortBy] = useState<"Created Date" | "Due Date">("Created Date");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<any>("/settings/user-preferences/task:preferences");
        if (data) {
          setReminderEmail(data.reminder_email ?? true);
          setReminderCharmMessage(data.reminder_charm_message ?? true);
          setAssignedCharmMessage(data.assigned_charm_message ?? true);
          setCompletedCharmMessage(data.completed_charm_message ?? true);
          setSortBy(data.sort_by || "Created Date");
        }
      } catch (err: any) {
        console.error("Failed to load task preferences:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api("/settings/user-preferences/task:preferences", "PUT", {
        reminder_email: reminderEmail,
        reminder_charm_message: reminderCharmMessage,
        assigned_charm_message: assignedCharmMessage,
        completed_charm_message: completedCharmMessage,
        sort_by: sortBy,
      });
      setFeedback({ type: "success", message: "Task preferences saved successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to save task preferences." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Loading task preferences...</div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Panel Heading */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a", fontWeight: 700 }}>
          My Preferences
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Configure task assignment alerts, automated reminder notifications, and clinical task list sorting order.
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
          {/* ROW 1: Task Reminder Notification */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Task Reminder Notification</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={checkboxOptionStyle}>
                <input
                  type="checkbox"
                  checked={reminderEmail}
                  onChange={(e) => setReminderEmail(e.target.checked)}
                />
                Email
              </label>
              <label style={checkboxOptionStyle}>
                <input
                  type="checkbox"
                  checked={reminderCharmMessage}
                  onChange={(e) => setReminderCharmMessage(e.target.checked)}
                />
                Charm Message
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 2: Task Assigned Notification */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Task Assigned Notification</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={checkboxOptionStyle}>
                <input
                  type="checkbox"
                  checked={assignedCharmMessage}
                  onChange={(e) => setAssignedCharmMessage(e.target.checked)}
                />
                Charm Message
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 3: Task Completed Notification */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Task Completed Notification</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={checkboxOptionStyle}>
                <input
                  type="checkbox"
                  checked={completedCharmMessage}
                  onChange={(e) => setCompletedCharmMessage(e.target.checked)}
                />
                Charm Message
              </label>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* ROW 4: Sort Tasks By */}
          <div style={rowStyle}>
            <div style={labelColumnStyle}>
              <span style={rowLabelText}>Sort Tasks By</span>
            </div>
            <div style={controlColumnStyle}>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="sortTasksBy"
                  value="Created Date"
                  checked={sortBy === "Created Date"}
                  onChange={() => setSortBy("Created Date")}
                />
                Created Date
              </label>
              <label style={radioOptionStyle}>
                <input
                  type="radio"
                  name="sortTasksBy"
                  value="Due Date"
                  checked={sortBy === "Due Date"}
                  onChange={() => setSortBy("Due Date")}
                />
                Due Date
              </label>
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
  gridTemplateColumns: "300px 1fr",
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

const checkboxOptionStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
  cursor: "pointer",
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

