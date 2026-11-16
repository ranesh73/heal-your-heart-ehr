import React, { useState, useEffect } from "react";
import { Check, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { RichTextEditor } from "../common/RichTextEditor";

export function MessageSignaturePage() {
  const [enabled, setEnabled] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ enabled?: boolean; signature_html?: string }>(
          "/settings/user-preferences/message:signature"
        );
        if (data) {
          setEnabled(Boolean(data.enabled));
          setSignatureHtml(data.signature_html || "");
        }
      } catch (err: any) {
        console.error("Failed to load signature preference:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled && !signatureHtml.trim()) {
      setFeedback({ type: "error", message: "Signature content is mandatory when message signature is enabled." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await api("/settings/user-preferences/message:signature", "PUT", {
        enabled,
        signature_html: signatureHtml,
      });
      setFeedback({ type: "success", message: "Message signature settings saved successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to save signature settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "#64748b", fontSize: 13 }}>Loading signature preferences...</div>;
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Panel Heading */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a", fontWeight: 700 }}>
          Signature
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Electronic email footer and consultation sign-off appended to patient and staff messages.
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
            Enable Message Signature
          </label>
        </div>

        {/* When Enabled: Rich-Text Editor Area */}
        {enabled && (
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#334155",
                marginBottom: 8,
              }}
            >
              Signature <span style={{ color: "#dc2626" }}>*</span>
            </label>

            <RichTextEditor
              value={signatureHtml}
              onChange={setSignatureHtml}
              placeholder="Compose your professional clinician signature..."
              minHeight={200}
            />
          </div>
        )}

        {/* Save Button */}
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
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

