import React, { useState, useEffect } from "react";
import { Save, Check, Loader2, QrCode, Stamp, FileCheck } from "lucide-react";
import { api } from "../../api";

interface ReceiptSettings {
  receipt_prefix: string;
  show_upi_qr: boolean;
  footer_note: string;
  show_digital_stamp: boolean;
}

export function ReceiptTemplatesTab() {
  const [settings, setSettings] = useState<ReceiptSettings>({
    receipt_prefix: "HYN-REC",
    show_upi_qr: true,
    footer_note: "Thank you for choosing Heal Your Heart Cardiology Centre. Keep this receipt for tax deduction under 80D.",
    show_digital_stamp: true
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api<ReceiptSettings>("/api/settings/billing/receipt-templates");
        if (res) {
          setSettings({
            receipt_prefix: res.receipt_prefix || "HYN-REC",
            show_upi_qr: res.show_upi_qr ?? true,
            footer_note: res.footer_note || "",
            show_digital_stamp: res.show_digital_stamp ?? true
          });
        }
      } catch (err) {
        console.error("Failed to load receipt settings", err);
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
      await api("/api/settings/billing/receipt-templates", "PUT", settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save receipt settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "22px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
            Receipt Templates
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Manage receipt numbering prefix, dynamic UPI QR code inclusion, digital clinical stamps, and tax disclaimers.
          </p>
        </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          Loading receipt template settings...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28, alignItems: "flex-start" }}>
          {/* Form Settings */}
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Receipt Number Prefix *
              </label>
              <input
                type="text"
                value={settings.receipt_prefix}
                onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                placeholder="e.g. HYN-REC"
                required
                style={{
                  width: "100%",
                  maxWidth: 320,
                  padding: "8px 12px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  outline: "none"
                }}
              />
              <span style={{ display: "block", fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Generated receipts will be numbered like: <strong>{settings.receipt_prefix || "REC"}-2026-0001</strong>
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1e293b", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings.show_upi_qr}
                  onChange={(e) => setSettings({ ...settings, show_upi_qr: e.target.checked })}
                  style={{ accentColor: "#0284c7" }}
                />
                <span style={{ fontWeight: 600 }}>Print Dynamic UPI QR Code on Receipts</span>
              </label>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 0 24px" }}>
                Allows patients to immediately verify the instant settlement or scan to pay outstanding balances directly from the printed paper receipt.
              </p>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1e293b", cursor: "pointer", marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={settings.show_digital_stamp}
                  onChange={(e) => setSettings({ ...settings, show_digital_stamp: e.target.checked })}
                  style={{ accentColor: "#0284c7" }}
                />
                <span style={{ fontWeight: 600 }}>Include Digital Clinic Stamp & Authorized Signatory</span>
              </label>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 0 24px" }}>
                Embeds the registered clinic seal and electronic verification signature on every generated payment receipt.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Footer Disclaimer & Tax Note
              </label>
              <textarea
                value={settings.footer_note}
                onChange={(e) => setSettings({ ...settings, footer_note: e.target.value })}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  outline: "none",
                  fontFamily: "inherit"
                }}
              />
              <span style={{ display: "block", fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Appears at the very bottom of every printed and emailed receipt.
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
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
                  padding: "7px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Settings"}
              </button>

              {savedSuccess && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#059669", fontSize: 13, fontWeight: 600 }}>
                  <Check size={16} /> Receipt settings saved successfully!
                </span>
              )}
            </div>
          </form>

          {/* Live Mock Receipt Preview */}
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
              <FileCheck size={16} color="#0284c7" />
              <span>LIVE RECEIPT PREVIEW</span>
            </div>

            <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 6, padding: 16, fontSize: 12 }}>
              <div style={{ textAlign: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: 10, marginBottom: 10 }}>
                <strong style={{ fontSize: 14, color: "#0f172a" }}>HEAL YOUR HEART CLINIC</strong>
                <div style={{ color: "#64748b", fontSize: 11 }}>Official Payment Receipt</div>
                <div style={{ color: "#0284c7", fontWeight: 700, marginTop: 4 }}>
                  {settings.receipt_prefix || "REC"}-2026-0042
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>Date & Time:</span>
                <span>13-Nov-2026 11:45 AM</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>Patient:</span>
                <span>Rajesh Sharma (HYN-P-001)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b" }}>Payment Mode:</span>
                <span style={{ fontWeight: 600 }}>UPI (Razorpay)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 6, marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>Amount Received:</span>
                <span style={{ fontWeight: 700, color: "#059669", fontSize: 13 }}>₹3,800.00</span>
              </div>

              {settings.show_upi_qr && (
                <div style={{ textAlign: "center", margin: "12px 0", padding: "8px", background: "#f8fafc", borderRadius: 6 }}>
                  <QrCode size={48} style={{ margin: "0 auto", color: "#1e293b" }} />
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Scan UPI QR for Payment Verification</div>
                </div>
              )}

              {settings.show_digital_stamp && (
                <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
                  <div style={{ border: "1px solid #0284c7", borderRadius: 4, padding: "4px 8px", textAlign: "center", color: "#0284c7", fontSize: 10, fontWeight: 700 }}>
                    HEAL YOUR HEART<br />VERIFIED RECEIPT
                  </div>
                </div>
              )}

              {settings.footer_note && (
                <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 8 }}>
                  {settings.footer_note}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
