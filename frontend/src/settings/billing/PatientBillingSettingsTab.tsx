import React, { useState, useEffect } from "react";
import { api } from "../../api";

const DEFAULT_SMS_INVOICE = "$FACILITY_NAME has sent you an Invoice #$INVOICE_NUMBER. $INVOICE_DETAILS_LINK";
const DEFAULT_SMS_STATEMENT = "$FACILITY_NAME has sent you your Balance Due Statement. $STATEMENT_DETAILS_LINK";

export function PatientBillingSettingsTab() {
  const [data, setData] = useState({
    enable_automation: true,
    invoice_delivery_mode: "Send Invoices with Scheduled Reminders",
    invoice_phr_template: "SendInvoicePHRTemplate",
    invoice_email_template: "SendInvoiceEmailTemplate",
    invoice_sms_template: DEFAULT_SMS_INVOICE,
    default_pdf_template: "--Select--",
    statement_phr_template: "Send Patient Statement PHR Template",
    statement_email_template: "Send Patient Statement Email Template",
    statement_sms_template: DEFAULT_SMS_STATEMENT,
    reminder_days_interval: 30,
  });

  const [saving, setSaving] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api<any>("/settings/billing/patient-automation");
        if (res) setData((prev) => ({ ...prev, ...res }));
      } catch (err) {
        console.error("Failed to load patient billing automation settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/settings/billing/patient-automation", "PUT", data);
      alert("Patient billing automation settings saved successfully");
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      <h3 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
        Patient Billing Automation - Default Settings
      </h3>

      {/* Description */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          Patient Billing Automation simplifies the patient billing process by automatically sending invoices and payment reminders once insurance claims are processed. This reduces manual effort, minimizes delays, and ensures patients receive timely and consistent billing communications—helping practices maintain a smooth and efficient revenue cycle.
        </p>
        <p style={{ margin: "0 0 10px 0", fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          Through this setting, practices can:
        </p>
        <ul style={{ margin: "0 0 10px 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          <li>Define the Billing Cycle Frequency (e.g., Every Monday, Every 1st of the Month).</li>
          <li>Specify criteria to exclude certain invoices from automation.</li>
          <li>Choose preferred communication modes (PHR, Email, Text).</li>
          <li>Configure default templates and attachments for both Initial Communication and Reminders.</li>
        </ul>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#334155" }}>
          Once enabled, practices can monitor the automation progress by navigating to &apos;Billing → Invoices → Patient Billing Automation&apos;. From this dashboard, they can view invoices that are scheduled, excluded, or already sent, and optionally exclude scheduled invoices from future runs.
        </p>
      </div>

      {/* Enable Automation */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
          Enable Patient Billing Automation
        </label>
        <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="enableAutomation"
              checked={data.enable_automation}
              onChange={() => setData({ ...data, enable_automation: true })}
            />
            Yes
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="enableAutomation"
              checked={!data.enable_automation}
              onChange={() => setData({ ...data, enable_automation: false })}
            />
            No
          </label>
        </div>
      </div>

      {/* How Should Patient Invoices Be Sent */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "start", marginBottom: 20 }}>
        <div style={{ textAlign: "right" }}>
          <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
            How Should Patient Invoices Be Sent?
          </label>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            (Choose whether invoices should be sent individually based on their own reminder schedule or combined with other outstanding invoices for the patient)
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "start", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="radio"
              name="deliveryMode"
              checked={data.invoice_delivery_mode === "Send Invoices with Scheduled Reminders"}
              onChange={() => setData({ ...data, invoice_delivery_mode: "Send Invoices with Scheduled Reminders" })}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>Send Invoices with Scheduled Reminders</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                (Send invoices when due and follow up with reminder notifications for unpaid balances. Supports multiple templates for initial communication and each reminder, offering flexibility in patient billing. Best suited for Practices that want structured follow-ups, customized messaging, and a more proactive collections workflow.)
              </div>
            </div>
          </label>

          <label style={{ display: "flex", alignItems: "start", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input
              type="radio"
              name="deliveryMode"
              checked={data.invoice_delivery_mode === "Always Send All Outstanding Invoices as Statement at regular intervals"}
              onChange={() => setData({ ...data, invoice_delivery_mode: "Always Send All Outstanding Invoices as Statement at regular intervals" })}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>Always Send All Outstanding Invoices as Statement at regular intervals</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                (Send all outstanding invoices together as a single statement at regular intervals, consolidating communications for patients with recurring balances.)
              </div>
            </div>
          </label>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "20px 0" }} />

      <h4 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
        Initial Communication Settings
      </h4>

      {/* Send Invoice PHR Template */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
          Default &apos;Send Invoice - PHR Template&apos; for Initial Communication
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={data.invoice_phr_template}
            onChange={(e) => setData({ ...data, invoice_phr_template: e.target.value })}
            style={{ width: "100%", maxWidth: 280, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
          >
            <option value="SendInvoicePHRTemplate">SendInvoicePHRTemplate</option>
          </select>
          <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, cursor: "pointer" }}>
            View
          </button>
        </div>
      </div>

      {/* Send Invoice Email Template */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
          Default &apos;Send Invoice - Email Template&apos; for Initial Communication
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={data.invoice_email_template}
            onChange={(e) => setData({ ...data, invoice_email_template: e.target.value })}
            style={{ width: "100%", maxWidth: 280, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
          >
            <option value="SendInvoiceEmailTemplate">SendInvoiceEmailTemplate</option>
          </select>
          <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, cursor: "pointer" }}>
            View
          </button>
        </div>
      </div>

      {/* Templates Row 1: Invoice SMS Text */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "start", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right", marginTop: 4 }}>
          Default &apos;Send Invoice - Text Message&apos; Content for Initial Communication
        </label>
        <div>
          <textarea
            rows={3}
            value={data.invoice_sms_template}
            onChange={(e) => setData({ ...data, invoice_sms_template: e.target.value })}
            style={{ width: "100%", maxWidth: 460, padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setData({ ...data, invoice_sms_template: DEFAULT_SMS_INVOICE })}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}
            >
              Restore to default
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              onClick={() => setShowPlaceholders(!showPlaceholders)}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}
            >
              Allowed Placeholders
            </button>
          </div>
          {showPlaceholders && (
            <div style={{ background: "#f8fafc", padding: 8, fontSize: 11, color: "#475569", borderRadius: 4, marginTop: 6, maxWidth: 460 }}>
              <code>$FACILITY_NAME</code>, <code>$INVOICE_NUMBER</code>, <code>$INVOICE_DETAILS_LINK</code>, <code>$PATIENT_NAME</code>, <code>$BALANCE_DUE</code>
            </div>
          )}
        </div>
      </div>

      {/* Default PDF dropdown */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
          Default PDF for Send Invoice To Cell Number for Initial Communication
        </label>
        <select
          value={data.default_pdf_template}
          onChange={(e) => setData({ ...data, default_pdf_template: e.target.value })}
          style={{ width: "100%", maxWidth: 260, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
        >
          <option value="--Select--">--Select--</option>
          <option value="Invoice PDF">Invoice PDF</option>
          <option value="Invoice PDF for Double Window Envelop">Invoice PDF for Double Window Envelop</option>
          <option value="Superbill PDF">Superbill PDF</option>
        </select>
      </div>

      {/* Send Statement PHR Template */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
          Default &apos;Send Statement - PHR Template&apos; for Initial Communication
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={data.statement_phr_template}
            onChange={(e) => setData({ ...data, statement_phr_template: e.target.value })}
            style={{ width: "100%", maxWidth: 280, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          >
            <option value="Send Patient Statement PHR Template">Send Patient Statement PHR Template</option>
          </select>
          <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, cursor: "pointer" }}>
            View
          </button>
        </div>
      </div>

      {/* Send Statement Email Template */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "center", marginBottom: 18 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right" }}>
          Default &apos;Send Statement - Email Template&apos; for Initial Communication
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={data.statement_email_template}
            onChange={(e) => setData({ ...data, statement_email_template: e.target.value })}
            style={{ width: "100%", maxWidth: 280, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          >
            <option value="Send Patient Statement Email Template">Send Patient Statement Email Template</option>
          </select>
          <button type="button" style={{ background: "none", border: "none", color: "#2563eb", fontSize: 13, cursor: "pointer" }}>
            View
          </button>
        </div>
      </div>

      {/* Statement SMS Content */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, alignItems: "start", marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: "#334155", textAlign: "right", marginTop: 4 }}>
          Default &apos;Send Statement - Text Message&apos; Content for Initial Communication
        </label>
        <div>
          <textarea
            rows={3}
            value={data.statement_sms_template}
            onChange={(e) => setData({ ...data, statement_sms_template: e.target.value })}
            style={{ width: "100%", maxWidth: 460, padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setData({ ...data, statement_sms_template: DEFAULT_SMS_STATEMENT })}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}
            >
              Restore to default
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              onClick={() => setShowPlaceholders(!showPlaceholders)}
              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0 }}
            >
              Allowed Placeholders
            </button>
          </div>
        </div>
      </div>

      {/* Reminders Settings */}
      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 14px 0", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
          Reminders Settings
        </h4>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
          <span>Send Reminders in</span>
          <input
            type="number"
            value={data.reminder_days_interval}
            onChange={(e) => setData({ ...data, reminder_days_interval: parseInt(e.target.value) || 30 })}
            style={{ width: 60, padding: "5px 8px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "center" }}
          />
          <span>days interval</span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 24px",
            background: "#f59e0b",
            color: "#ffffff",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
  );
}

