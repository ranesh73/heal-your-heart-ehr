import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { Modal } from "../../ui";

interface BillingAccountSettings {
  order_invoices_by: string;
  order_receipts_by: string;
  print_layouts: string[];
  include_inactive_providers: boolean;
  enable_invoice_consult_lab_product: boolean;
  included_invoice_groups: string[];
  create_lab_order_for_lab_invoice: boolean;
  allow_inter_facility_receipts: boolean;
  enable_hard_close: boolean;
  hard_close_basis: string;
  item_table_titles: string[];
  alternate_provider_names: string[];
  show_provider_degree: boolean;
  exclude_non_covered_superbill: boolean;
  superbill_payment_mode: string;
  enable_invoice_round_off: boolean;
  round_off_mode: string;
  round_off_label: string;
  enable_associate_products: boolean;
}

export function BillingSettingsTab() {
  const [accountSettings, setAccountSettings] = useState<BillingAccountSettings>({
    order_invoices_by: "Invoice Added Date",
    order_receipts_by: "Receipt Added Date",
    print_layouts: ["A4 / US Letter"],
    include_inactive_providers: false,
    enable_invoice_consult_lab_product: true,
    included_invoice_groups: ["Consultation", "Lab"],
    create_lab_order_for_lab_invoice: false,
    allow_inter_facility_receipts: true,
    enable_hard_close: false,
    hard_close_basis: "Invoice/Payment/Refund Date",
    item_table_titles: ["Consultation / Procedures", "Labs", "Medications / Drugs"],
    alternate_provider_names: ["Consultant", "Doctor", "Doctor", "Doctor"],
    show_provider_degree: false,
    exclude_non_covered_superbill: false,
    superbill_payment_mode: "Show Payments",
    enable_invoice_round_off: true,
    round_off_mode: "Round to nearest number",
    round_off_label: "Round Off",
    enable_associate_products: true,
  });

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [writeOffTypes, setWriteOffTypes] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [showAddPM, setShowAddPM] = useState(false);
  const [newPMName, setNewPMName] = useState("");

  const [showAddWO, setShowAddWO] = useState(false);
  const [newWOName, setNewWOName] = useState("");

  const [showAddTax, setShowAddTax] = useState(false);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxPercent, setNewTaxPercent] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [acc, pms, wos, txs] = await Promise.all([
        api<BillingAccountSettings>("/api/settings/billing/account-settings"),
        api<any[]>("/api/settings/billing/payment-methods"),
        api<any[]>("/api/settings/billing/write-off-types"),
        api<any[]>("/api/settings/billing/taxes"),
      ]);
      if (acc) {
        setAccountSettings((prev) => ({ ...prev, ...acc }));
      }
      setPaymentMethods(pms || []);
      setWriteOffTypes(wos || []);
      setTaxes(txs || []);
    } catch (err) {
      console.error("Failed to load billing settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await api("/api/settings/billing/account-settings", "PUT", accountSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPMName.trim()) return;
    try {
      await api("/api/settings/billing/payment-methods", "POST", { name: newPMName.trim() });
      setNewPMName("");
      setShowAddPM(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to add payment method");
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;
    try {
      await api(`/api/settings/billing/payment-methods/${id}`, "DELETE");
      setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete payment method");
    }
  };

  const handleAddWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWOName.trim()) return;
    try {
      await api("/api/settings/billing/write-off-types", "POST", { name: newWOName.trim() });
      setNewWOName("");
      setShowAddWO(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to add write-off type");
    }
  };

  const handleDeleteWriteOff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this write-off type?")) return;
    try {
      await api(`/api/settings/billing/write-off-types/${id}`, "DELETE");
      setWriteOffTypes((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert("Failed to delete write-off type");
    }
  };

  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxName.trim()) return;
    try {
      await api("/api/settings/billing/taxes", "POST", { name: newTaxName.trim(), percentage: Number(newTaxPercent) });
      setNewTaxName("");
      setNewTaxPercent(0);
      setShowAddTax(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to add tax");
    }
  };

  const handleDeleteTax = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax rate?")) return;
    try {
      await api(`/api/settings/billing/taxes/${id}`, "DELETE");
      setTaxes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert("Failed to delete tax");
    }
  };

  const toggleGroup = (group: string) => {
    const current = accountSettings.included_invoice_groups || [];
    if (current.includes(group)) {
      if (current.length <= 2) {
        alert("Please select at least two groups.");
        return;
      }
      setAccountSettings({ ...accountSettings, included_invoice_groups: current.filter((g) => g !== group) });
    } else {
      setAccountSettings({ ...accountSettings, included_invoice_groups: [...current, group] });
    }
  };

  const togglePrintLayout = (layout: string) => {
    const current = accountSettings.print_layouts || [];
    if (current.includes(layout)) {
      if (current.length <= 1) return;
      setAccountSettings({ ...accountSettings, print_layouts: current.filter((l) => l !== layout) });
    } else {
      setAccountSettings({ ...accountSettings, print_layouts: [...current, layout] });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
        Loading billing settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 0 32px 0" }}>
      {/* 1. Billing - Account Settings */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "24px 28px", marginBottom: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            Billing - Account Settings
          </h3>
          {saveSuccess && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#059669" }}>
              <Check size={15} /> Settings saved successfully
            </span>
          )}
        </div>

        {/* Form Grid Rows matching exact CharmHealth Frame 167 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Order Invoices by */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
              Order Invoices by
            </label>
            <div>
              <select
                value={accountSettings.order_invoices_by}
                onChange={(e) => setAccountSettings({ ...accountSettings, order_invoices_by: e.target.value })}
                style={{ width: 260, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
              >
                <option value="Invoice Added Date">Invoice Added Date</option>
                <option value="Invoice Date">Invoice Date</option>
                <option value="Due Date">Due Date</option>
              </select>
            </div>
          </div>

          {/* Order Receipts by */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
              Order Receipts by
            </label>
            <div>
              <select
                value={accountSettings.order_receipts_by}
                onChange={(e) => setAccountSettings({ ...accountSettings, order_receipts_by: e.target.value })}
                style={{ width: 260, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
              >
                <option value="Receipt Added Date">Receipt Added Date</option>
                <option value="Receipt Date">Receipt Date</option>
              </select>
            </div>
          </div>

          {/* Print layout options */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
              Print layout options for Invoice and Receipt PDF
            </label>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#334155" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(accountSettings.print_layouts || []).includes("A4 / US Letter")}
                  onChange={() => togglePrintLayout("A4 / US Letter")}
                  style={{ accentColor: "#0284c7" }}
                />
                A4 / US Letter
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={(accountSettings.print_layouts || []).includes("A5")}
                  onChange={() => togglePrintLayout("A5")}
                  style={{ accentColor: "#0284c7" }}
                />
                A5
              </label>
            </div>
          </div>

          {/* Include inactive providers */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Include inactive providers in Billing
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( If option &apos;Yes&apos; is selected, Inactive Provider will be shown in Providers List )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="includeInactive"
                  checked={accountSettings.include_inactive_providers}
                  onChange={() => setAccountSettings({ ...accountSettings, include_inactive_providers: true })}
                  style={{ accentColor: "#0284c7" }}
                />
                Yes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="includeInactive"
                  checked={!accountSettings.include_inactive_providers}
                  onChange={() => setAccountSettings({ ...accountSettings, include_inactive_providers: false })}
                  style={{ accentColor: "#0284c7" }}
                />
                No
              </label>
            </div>
          </div>

          {/* Enable Invoice option with Consultation, Lab and Product */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Enable Invoice option with Consultation, Lab and Product
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>
                ( If option &apos;Yes&apos; is selected, practice can invoice all the three groups Consultation, Lab and Product from a single Invoice. This option can be enabled to specific members of practice by enabling &apos;Invoice with Consultation, Lab and Product&apos; option in Roles )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="enableInvoiceConsultLabProduct"
                  checked={accountSettings.enable_invoice_consult_lab_product}
                  onChange={() => setAccountSettings({ ...accountSettings, enable_invoice_consult_lab_product: true })}
                  style={{ accentColor: "#0284c7" }}
                />
                Yes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="enableInvoiceConsultLabProduct"
                  checked={!accountSettings.enable_invoice_consult_lab_product}
                  onChange={() => setAccountSettings({ ...accountSettings, enable_invoice_consult_lab_product: false })}
                  style={{ accentColor: "#0284c7" }}
                />
                No
              </label>
            </div>
          </div>

          {/* Select groups to be included in the Invoice */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Select groups to be included in the Invoice
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( Select at least two groups )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#334155", paddingTop: 2 }}>
              {["Consultation", "Lab", "Product"].map((grp) => (
                <label key={grp} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(accountSettings.included_invoice_groups || []).includes(grp)}
                    onChange={() => toggleGroup(grp)}
                    style={{ accentColor: "#0284c7" }}
                  />
                  {grp}
                </label>
              ))}
            </div>
          </div>

          {/* Create 'Lab Order' automatically */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Create &apos;Lab Order&apos; automatically for &apos;Lab Invoice&apos;
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>
                ( If option &apos;Yes&apos; is selected, &apos;Lab Order&apos; will be created with &apos;Lab Tests&apos; that are linked with &apos;Procedure Codes&apos; of Invoice. &apos;Procedure Codes&apos; and &apos;Lab Tests&apos; can be linked under &apos;Settings &gt; Billing &gt; Procedure Code for Lab Tests&apos; section. No &apos;Lab Order&apos; will be created, if a Lab Order already exists for the Encounter )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="createLabOrderAuto"
                  checked={accountSettings.create_lab_order_for_lab_invoice}
                  onChange={() => setAccountSettings({ ...accountSettings, create_lab_order_for_lab_invoice: true })}
                  style={{ accentColor: "#0284c7" }}
                />
                Yes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="createLabOrderAuto"
                  checked={!accountSettings.create_lab_order_for_lab_invoice}
                  onChange={() => setAccountSettings({ ...accountSettings, create_lab_order_for_lab_invoice: false })}
                  style={{ accentColor: "#0284c7" }}
                />
                No
              </label>
            </div>
          </div>

          {/* Allow inter facility receipts */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Allow Receipts created in one facility to apply to Invoices of other facility
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( If all the facilities in the practice are operating as a single business entity, then option &apos;Yes&apos; can be selected )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="interFacilityReceipts"
                  checked={accountSettings.allow_inter_facility_receipts}
                  onChange={() => setAccountSettings({ ...accountSettings, allow_inter_facility_receipts: true })}
                  style={{ accentColor: "#0284c7" }}
                />
                Yes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="interFacilityReceipts"
                  checked={!accountSettings.allow_inter_facility_receipts}
                  onChange={() => setAccountSettings({ ...accountSettings, allow_inter_facility_receipts: false })}
                  style={{ accentColor: "#0284c7" }}
                />
                No
              </label>
            </div>
          </div>

          {/* Hard Close Accounts Box */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px", marginTop: 4 }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
              Hard Close Accounts
            </h4>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
              &apos;Hard Close&apos; is a feature introduced for effective accounting of Billing entries. This feature will be useful for the practices that take billing information from CharmHealth to accounting software for accounting or for taxation purposes. When you enable this feature, you will find a new option &apos;Hard Close&apos; in the &apos;Billing &gt; Invoices&apos; tab, where option to hard close data up to a specific date will be available. Generally, practice will choose the last date of the month as the date for hard closing.
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
              When &apos;Hard Close&apos; option is used, all entries - &apos;Invoices, Receipts &amp; Refunds&apos; within the selected date will be hard closed. At the time of editing/modification of these hard closed entries, a warning message will be shown that these entries are already hard closed and the user can still modify them. All the entries modified after the hard closing will be available in &apos;Hard Close - Modified Entities Report&apos; shown under &apos;Billing &gt; Reports &gt; Other Reports&apos; section.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start", marginBottom: 14 }}>
              <div style={{ textAlign: "right" }}>
                <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                  Enable &apos;Hard Close&apos; option
                </label>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  ( If option &apos;Yes&apos; is selected, &apos;Hard Close&apos; option will be shown in &apos;Billing &gt; Invoices&apos; tab )
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="enableHardClose"
                    checked={accountSettings.enable_hard_close}
                    onChange={() => setAccountSettings({ ...accountSettings, enable_hard_close: true })}
                    style={{ accentColor: "#0284c7" }}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="enableHardClose"
                    checked={!accountSettings.enable_hard_close}
                    onChange={() => setAccountSettings({ ...accountSettings, enable_hard_close: false })}
                    style={{ accentColor: "#0284c7" }}
                  />
                  No
                </label>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "center" }}>
              <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
                Hard Close Accounts based on
              </label>
              <div>
                <select
                  value={accountSettings.hard_close_basis}
                  onChange={(e) => setAccountSettings({ ...accountSettings, hard_close_basis: e.target.value })}
                  style={{ width: 240, padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
                >
                  <option value="Invoice/Payment/Refund Date">Invoice/Payment/Refund Date</option>
                  <option value="Posting Date">Posting Date</option>
                </select>
              </div>
            </div>
          </div>

          {/* Titles for Item Table */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Title for &apos;Item Table&apos; in Invoice
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( Using this option, practice can use their preferred title such as Consultation / Procedures, Labs, Products, etc. )
              </div>
            </div>
            <div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                {(accountSettings.item_table_titles || ["Consultation / Procedures", "Labs", "Medications / Drugs"]).map((title, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const updated = [...accountSettings.item_table_titles];
                      updated[idx] = e.target.value;
                      setAccountSettings({ ...accountSettings, item_table_titles: updated });
                    }}
                    style={{ width: 170, padding: "6px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "#64748b" }}>Corresponding &apos;Item table&apos; titles will be used</span>
            </div>
          </div>

          {/* Alternate Name for Provider */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Alternate Name for Provider (Doctor)
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( Using this option, practice can use their alternate name such as Provider, Doctor, Consultant, Referred By, etc. )
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(accountSettings.alternate_provider_names || ["Consultant", "Doctor", "Doctor", "Doctor"]).map((name, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const updated = [...accountSettings.alternate_provider_names];
                    updated[idx] = e.target.value;
                    setAccountSettings({ ...accountSettings, alternate_provider_names: updated });
                  }}
                  style={{ width: 120, padding: "6px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
                />
              ))}
            </div>
          </div>

          {/* Show Provider's Degree */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Show Provider&apos;s Degree along with Provider&apos;s Name
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( If Option &apos;Yes&apos; is selected, Provider Degree will be shown at the end of Provider&apos;s name in all list pages and filters across &apos;Billing&apos; tab )
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="showDegree"
                  checked={accountSettings.show_provider_degree}
                  onChange={() => setAccountSettings({ ...accountSettings, show_provider_degree: true })}
                  style={{ accentColor: "#0284c7" }}
                />
                Yes
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="showDegree"
                  checked={!accountSettings.show_provider_degree}
                  onChange={() => setAccountSettings({ ...accountSettings, show_provider_degree: false })}
                  style={{ accentColor: "#0284c7" }}
                />
                No
              </label>
            </div>
          </div>

          {/* Exclude Non-Covered services from Superbill */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#334155", textAlign: "right", fontWeight: 500 }}>
              Exclude Non-Covered services from Superbill PDF
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                checked={accountSettings.exclude_non_covered_superbill}
                onChange={(e) => setAccountSettings({ ...accountSettings, exclude_non_covered_superbill: e.target.checked })}
                style={{ accentColor: "#0284c7" }}
              />
              <select
                value={accountSettings.superbill_payment_mode}
                onChange={(e) => setAccountSettings({ ...accountSettings, superbill_payment_mode: e.target.value })}
                style={{ width: 160, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
              >
                <option value="Show Payments">Show Payments</option>
                <option value="Hide Payments">Hide Payments</option>
              </select>
            </div>
          </div>

          {/* Enable Invoice Round Off */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ textAlign: "right" }}>
              <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                Enable Invoice Round Off
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                ( Once enabled, this feature will automatically Round Off Invoice based on selected setting. Sum of Procedures Total and Products Total will not be Invoice Total. )
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 2 }}>
              <input
                type="checkbox"
                checked={accountSettings.enable_invoice_round_off}
                onChange={(e) => setAccountSettings({ ...accountSettings, enable_invoice_round_off: e.target.checked })}
                style={{ accentColor: "#0284c7" }}
              />
              <select
                value={accountSettings.round_off_mode}
                onChange={(e) => setAccountSettings({ ...accountSettings, round_off_mode: e.target.value })}
                style={{ width: 220, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}
              >
                <option value="Round to nearest number">Round to nearest number</option>
                <option value="Round down to lower integer">Round down to lower integer</option>
                <option value="Round up to next integer">Round up to next integer</option>
              </select>
              <input
                type="text"
                value={accountSettings.round_off_label}
                onChange={(e) => setAccountSettings({ ...accountSettings, round_off_label: e.target.value })}
                placeholder="Label (e.g. Round Off)"
                style={{ width: 120, padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
          </div>

          {/* Associate Products to Procedure Box */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
              This option is useful for the practices using the Charm Inventory module. When the option &apos;Yes&apos; is selected, the &quot;Associate Products&quot; option will be enabled for the procedures (Settings &gt; Billing Settings &gt; Procedure Codes &gt; List View &gt; Associate Products). One can associate products consumed during this procedure.
            </p>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
              When the procedure code is added to an invoice, the associated products will either:
              <br />i) be automatically added to the invoice and adjusted in inventory, or
              <br />ii) simply be deducted from inventory without getting added to the invoice.
            </p>
            <p style={{ margin: "0 0 14px 0", fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
              The second option is recommended when products are consumed internally and do not need to be billed directly to the patient. These internally consumed products will be recorded in the Inventory &gt; Reports &gt; Internal Consumption Report.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start", marginBottom: 16 }}>
              <div style={{ textAlign: "right" }}>
                <label style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                  Enable Associate Products to Procedure
                </label>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  ( When the option &apos;Yes&apos; is selected, the &quot;Associate Products&quot; option will be enabled for the procedures )
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, fontSize: 13, paddingTop: 2 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="assocProducts"
                    checked={accountSettings.enable_associate_products}
                    onChange={() => setAccountSettings({ ...accountSettings, enable_associate_products: true })}
                    style={{ accentColor: "#0284c7" }}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="assocProducts"
                    checked={!accountSettings.enable_associate_products}
                    onChange={() => setAccountSettings({ ...accountSettings, enable_associate_products: false })}
                    style={{ accentColor: "#0284c7" }}
                  />
                  No
                </label>
              </div>
            </div>

            <div style={{ marginLeft: 360 }}>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                style={{
                  padding: "7px 24px",
                  background: "#f59e0b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                {savingSettings ? <Loader2 size={14} className="animate-spin" /> : null}
                {savingSettings ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Payment Methods (Constrained width table) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px", marginBottom: 24, maxWidth: 680, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            Payment Methods
          </h3>
          <button
            type="button"
            onClick={() => setShowAddPM(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Payment Method
          </button>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Payment Method</th>
                <th style={{ width: 44, padding: "8px 12px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((pm) => (
                <tr key={pm.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: 500 }}>{pm.name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleDeletePaymentMethod(pm.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                      title="Delete Payment Method"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Write-off Types (Constrained width table) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px", marginBottom: 24, maxWidth: 680, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            Write-off Types
          </h3>
          <button
            type="button"
            onClick={() => setShowAddWO(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Write-off Type
          </button>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Write-off Type</th>
                <th style={{ width: 44, padding: "8px 12px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {writeOffTypes.map((wo) => (
                <tr key={wo.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: 500 }}>{wo.name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteWriteOff(wo.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                      title="Delete Write-off Type"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Taxes (Constrained width table) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 24px", maxWidth: 840, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            Taxes
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#334155" }}>
              <span>Choose Facility</span>
              <select style={{ padding: "5px 8px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff" }}>
                <option value="HYN">Heal Your Heart Neelankarai</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowAddTax(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f59e0b",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Tax
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Tax Name</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>Tax Percentage</th>
                <th style={{ width: 44, padding: "8px 12px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", color: "#1e293b", fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>{t.percentage}%</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteTax(t.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                      title="Delete Tax"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddPM && (
        <Modal title="Add Payment Method" onClose={() => setShowAddPM(false)}>
          <form onSubmit={handleAddPaymentMethod} style={{ padding: "16px 20px" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Payment Method Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Card Terminal 2"
                value={newPMName}
                onChange={(e) => setNewPMName(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddPM(false)}
                style={{ padding: "6px 14px", border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: 4, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: "6px 18px", border: "none", background: "#f59e0b", color: "#ffffff", fontWeight: 600, borderRadius: 4, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Write-off Type Modal */}
      {showAddWO && (
        <Modal title="Add Write-off Type" onClose={() => setShowAddWO(false)}>
          <form onSubmit={handleAddWriteOff} style={{ padding: "16px 20px" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Write-off Type Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Indigent Care"
                value={newWOName}
                onChange={(e) => setNewWOName(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddWO(false)}
                style={{ padding: "6px 14px", border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: 4, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: "6px 18px", border: "none", background: "#f59e0b", color: "#ffffff", fontWeight: 600, borderRadius: 4, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Tax Modal */}
      {showAddTax && (
        <Modal title="Add Tax" onClose={() => setShowAddTax(false)}>
          <form onSubmit={handleAddTax} style={{ padding: "16px 20px" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Tax Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Service GST"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Tax Percentage (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={newTaxPercent}
                onChange={(e) => setNewTaxPercent(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddTax(false)}
                style={{ padding: "6px 14px", border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: 4, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ padding: "6px 18px", border: "none", background: "#f59e0b", color: "#ffffff", fontWeight: 600, borderRadius: 4, cursor: "pointer" }}
              >
                Add
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
