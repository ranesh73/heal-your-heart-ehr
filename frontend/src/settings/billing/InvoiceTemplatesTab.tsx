import React, { useState, useEffect, useCallback } from "react";
import { Plus, Check, FileText, CheckCircle2, Star, Eye, Edit2, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../api";

interface InvoiceTemplateItem {
  id: string;
  name: string;
  code: string;
  is_default: boolean;
  is_active: boolean;
  type: string;
}

export function InvoiceTemplatesTab() {
  const [templates, setTemplates] = useState<InvoiceTemplateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplateItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<InvoiceTemplateItem[]>("/api/settings/billing/invoice-templates");
      setTemplates(res || []);
    } catch (err) {
      console.error("Failed to load invoice templates", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSetDefault = async (tmpl: InvoiceTemplateItem) => {
    if (tmpl.is_default) return;
    setUpdatingId(tmpl.id);
    try {
      await api(`/api/settings/billing/invoice-templates/${tmpl.id}/set-default`, "PUT", {});
      await loadTemplates();
    } catch (err: any) {
      alert(err?.message || "Failed to set default template");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (tmpl: InvoiceTemplateItem) => {
    setUpdatingId(tmpl.id);
    try {
      await api(`/api/settings/billing/invoice-templates/${tmpl.id}/toggle-active`, "PUT", {});
      await loadTemplates();
    } catch (err: any) {
      alert(err?.message || "Failed to update template status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      <div style={{ background: "#ffffff", borderRadius: 6, border: "1px solid #e2e8f0", padding: "22px 26px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
              Invoice Templates
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Configure patient statement formats, superbill layouts, envelope address alignments, and defaults.
            </p>
          </div>

          <button
            onClick={() => alert("Custom template creation is managed through the EHR Master Template Designer.")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            <Plus size={15} />
            New Template
          </button>
        </div>

      {/* Templates Grid / Cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          Loading invoice templates...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                border: tmpl.is_default ? "2px solid #0284c7" : "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "16px 18px",
                background: tmpl.is_default ? "#f8fafc" : "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 6,
                        background: tmpl.is_default ? "#e0f2fe" : "#f1f5f9",
                        color: tmpl.is_default ? "#0284c7" : "#475569",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: "0 0 2px 0" }}>
                        {tmpl.name}
                      </h4>
                      <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                        {tmpl.type} format
                      </span>
                    </div>
                  </div>

                  {tmpl.is_default && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#0284c7",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 12
                      }}
                    >
                      <Check size={12} /> Default
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 16px 0", lineHeight: 1.5 }}>
                  {tmpl.name.toLowerCase().includes("double window")
                    ? "Specially aligned patient invoice format designed to match standard #10 double-window billing envelopes."
                    : tmpl.name.toLowerCase().includes("superbill")
                    ? "Standard medical superbill with provider identifiers, primary and secondary diagnosis codes, and itemized procedure charges."
                    : "Standard comprehensive clinical invoice with practice branding, detailed charge itemization, and payment receipt stub."}
                </p>
              </div>

              {/* Bottom controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  borderTop: "1px solid #f1f5f9"
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={tmpl.is_active}
                    disabled={updatingId === tmpl.id}
                    onChange={() => handleToggleActive(tmpl)}
                    style={{ accentColor: "#0284c7" }}
                  />
                  Active
                </label>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setPreviewTemplate(tmpl)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0284c7",
                      background: "none",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <Eye size={13} /> Preview
                  </button>

                  {!tmpl.is_default && (
                    <button
                      onClick={() => handleSetDefault(tmpl)}
                      disabled={updatingId === tmpl.id}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#475569",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        padding: "3px 8px",
                        cursor: "pointer"
                      }}
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              maxWidth: 650,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  {previewTemplate.name} — Preview
                </h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>Sample Patient Invoice Render</span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                style={{ border: "none", background: "none", fontSize: 18, color: "#64748b", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 20, background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0284c7", paddingBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0284c7", margin: 0 }}>HEAL YOUR HEART</h2>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0" }}>Center for Advanced Cardiology & Preventive Care</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>INVOICE</span>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0" }}>Inv #: INV-2026-0042</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Date: 13-Nov-2026</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12 }}>
                <div>
                  <strong>Billed To:</strong>
                  <div>Mr. Rajesh Sharma (MRN: HYN-P-001)</div>
                  <div>Age: 54 / M | Ph: +91 98450 12345</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>Attending Consultant:</strong>
                  <div>Dr. Kausiq, MD, DM (Cardio)</div>
                  <div>Reg No: MCI-2018-98765</div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 16 }}>
                <thead>
                  <tr style={{ background: "#e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px" }}>Item Description</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Code</th>
                    <th style={{ padding: "6px 8px", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>Comprehensive Cardiovascular Consultation</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>99245</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>1</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>1,500.00</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>1,500.00</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>12-Lead Electrocardiogram (ECG) Tracing & Report</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>93000</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>1</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>500.00</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>500.00</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "6px 8px" }}>Cardiac Risk Marker Profile (Troponin I + Hs-CRP)</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>82040</td>
                    <td style={{ padding: "6px 8px", textAlign: "center" }}>1</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>1,800.00</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>1,800.00</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>Total Billed:</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>₹3,800.00</td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ marginTop: 16, fontSize: 11, color: "#64748b", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                Notes: Thank you for choosing Heal Your Heart Cardiology Centre.
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                onClick={() => setPreviewTemplate(null)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: "#e2e8f0",
                  color: "#334155",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
