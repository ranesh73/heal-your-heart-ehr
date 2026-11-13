import React, { useState, useEffect } from "react";
import { Save, Check, Loader2, Copy, Shield, CreditCard, Eye, EyeOff } from "lucide-react";
import { api } from "../../api";

interface RazorpaySettings {
  enabled: boolean;
  key_id: string;
  key_secret: string;
  auto_send_payment_links: boolean;
  webhook_url: string;
}

export function RazorpayTab() {
  const [settings, setSettings] = useState<RazorpaySettings>({
    enabled: true,
    key_id: "rzp_live_HealYourHeartEHR2026",
    key_secret: "",
    auto_send_payment_links: true,
    webhook_url: "https://api.healyourheart.in/webhooks/razorpay"
  });
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api<RazorpaySettings>("/api/settings/billing/razorpay");
        if (res) {
          setSettings({
            enabled: res.enabled ?? true,
            key_id: res.key_id || "",
            key_secret: res.key_secret || "",
            auto_send_payment_links: res.auto_send_payment_links ?? true,
            webhook_url: res.webhook_url || "https://api.healyourheart.in/webhooks/razorpay"
          });
        }
      } catch (err) {
        console.error("Failed to load razorpay settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api("/api/settings/billing/razorpay", "PUT", settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save Razorpay settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(settings.webhook_url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "22px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Razorpay Integration
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: settings.enabled ? "#ecfdf5" : "#f1f5f9",
                color: settings.enabled ? "#059669" : "#64748b",
                border: `1px solid ${settings.enabled ? "#a7f3d0" : "#e2e8f0"}`
              }}
            >
              {settings.enabled ? "ACTIVE" : "DISABLED"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}>
            Configure Razorpay payment gateway API keys to collect patient payments via UPI, Credit/Debit cards, and Net Banking.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 6 }}>
          <Shield size={16} color="#16a34a" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>PCI-DSS Level 1 Compliant</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          Loading Razorpay settings...
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "#1e293b", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                style={{ accentColor: "#0284c7" }}
              />
              Enable Razorpay Payment Gateway
            </label>
            <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0 24px" }}>
              When enabled, patients can pay invoices immediately via UPI QR, Google Pay, PhonePe, Paytm, and credit cards.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Key ID *
            </label>
            <input
              type="text"
              value={settings.key_id}
              onChange={(e) => setSettings({ ...settings, key_id: e.target.value })}
              placeholder="rzp_live_..."
              required={settings.enabled}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                outline: "none",
                fontFamily: "monospace"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Key Secret *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showSecret ? "text" : "password"}
                value={settings.key_secret}
                onChange={(e) => setSettings({ ...settings, key_secret: e.target.value })}
                placeholder="Enter secret from Razorpay Dashboard"
                required={settings.enabled}
                style={{
                  width: "100%",
                  padding: "8px 36px 8px 12px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  outline: "none",
                  fontFamily: "monospace"
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  color: "#64748b",
                  cursor: "pointer"
                }}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1e293b", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.auto_send_payment_links}
                onChange={(e) => setSettings({ ...settings, auto_send_payment_links: e.target.checked })}
                style={{ accentColor: "#0284c7" }}
              />
              <span style={{ fontWeight: 600 }}>Auto-generate and SMS Razorpay Payment Links</span>
            </label>
            <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 24px" }}>
              Immediately generates a verified Razorpay payment link and includes it in patient SMS notifications when an invoice is created.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
              Webhook Endpoint URL (Auto-Settlement)
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                readOnly
                value={settings.webhook_url}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  outline: "none",
                  background: "#f8fafc",
                  color: "#334155",
                  fontFamily: "monospace"
                }}
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  cursor: "pointer"
                }}
              >
                {copiedWebhook ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
                {copiedWebhook ? "Copied" : "Copy"}
              </button>
            </div>
            <span style={{ display: "block", fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Register this URL in your Razorpay Dashboard &gt; Webhooks for instant real-time payment reconciliation.
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#f59e0b",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "8px 22px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>

            {savedSuccess && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#059669", fontSize: 13, fontWeight: 600 }}>
                <Check size={16} /> Razorpay configuration saved!
              </span>
            )}
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
