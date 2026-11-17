import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  ChevronDown,
  DollarSign,
  Printer,
  X,
  Check,
  Search,
  Calendar,
  AlertCircle,
  MoreVertical,
  Download,
  Send,
  Trash2,
  Edit,
  ArrowLeft,
  Receipt,
  CreditCard,
  Building2,
  UserCheck,
  HelpCircle
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";

// Format currency as Indian Rupee (INR)
export function money(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return "Rs. 0.00";
  return (
    "Rs. " +
    (paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function rupees(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0.00";
  return (
    "Rs. " +
    Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

interface ProcedureItem {
  id: string;
  code: string;
  description: string;
  qty: number;
  charge: number;
  discountPercent: number;
  tax: number;
  total: number;
}

interface LabItem {
  id: string;
  code: string;
  description: string;
  sac: string;
  qty: number;
  charge: number;
  discountPercent: number;
  tax: number;
  total: number;
}

interface ProductItem {
  id: string;
  name: string;
  batch: string;
  stockQty: number;
  qty: number;
  price: number;
  discountPercent: number;
  tax: number;
  total: number;
}

export function CharmPatientBilling({
  patientId,
  patient,
  onRefreshChart,
}: {
  patientId: string;
  patient?: any;
  onRefreshChart?: () => void;
}) {
  const { user, staff, facilities, refresh, notify } = useApp();

  // Navigation Subtabs
  const [activeSubtab, setActiveSubtab] = useState<
    "invoices" | "receipts" | "balance_due" | "family_balance_due"
  >("invoices");

  // View Mode: 'list' | 'create' | 'detail' | 'edit'
  const [viewMode, setViewMode] = useState<"list" | "create" | "detail" | "edit">("list");
  const [invoiceTypeMode, setInvoiceTypeMode] = useState<
    "Invoice" | "Consultation" | "Lab" | "Product"
  >("Invoice");

  // Invoices & Receipts Data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals
  const [quickPayInvoice, setQuickPayInvoice] = useState<any | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMethod, setQuickPayMethod] = useState("UPI");
  const [quickPayRef, setQuickPayRef] = useState("");
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<any | null>(null);

  // -------------------------------------------------------------
  // Invoice Creator / Editor Form State
  // -------------------------------------------------------------
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formConsultationDate, setFormConsultationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [labs, setLabs] = useState<LabItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [flatDiscount, setFlatDiscount] = useState<number>(0);
  const [payInFull, setPayInFull] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "1. Payment is due upon receipt.\n2. Cheques are subject to realization.\n3. Goods or medicines once sold cannot be returned or exchanged after 7 days."
  );

  // Search autocomplete states
  const [searchingProcedures, setSearchingProcedures] = useState(false);
  const [procedureResults, setProcedureResults] = useState<any[]>([]);
  const [activeProcSearchIndex, setActiveProcSearchIndex] = useState<number | null>(null);

  const [searchingLabs, setSearchingLabs] = useState(false);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [activeLabSearchIndex, setActiveLabSearchIndex] = useState<number | null>(null);

  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productResults, setProductResults] = useState<any[]>([]);
  const [activeProdSearchIndex, setActiveProdSearchIndex] = useState<number | null>(null);

  // Load Invoices & Receipts
  const loadData = async () => {
    setLoading(true);
    try {
      const invData = await api<any[]>(`/invoices?patient_id=${patientId}`);
      setInvoices(invData || []);
      const recData = await api<any[]>(`/receipts?patient_id=${patientId}`);
      setReceipts(recData || []);
    } catch (err) {
      console.error("Failed to load billing data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  // Set default doctor and facility
  useEffect(() => {
    if (!formFacilityId && facilities?.length) {
      setFormFacilityId(facilities[0].id);
    }
    if (!formDoctorId && staff?.length) {
      const doc = staff.find((s: any) => s.role === "doctor") || staff[0];
      if (doc) setFormDoctorId(doc.id);
    }
  }, [facilities, staff]);

  // Close dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowInvoiceDropdown(false);
      }
      if (activeMenuId && !(event.target as Element).closest(".charm-menu-container")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  // Calculate Subtotals & Grand Totals
  const procSubtotal = procedures.reduce((sum, p) => sum + p.total, 0);
  const labSubtotal = labs.reduce((sum, l) => sum + l.total, 0);
  const prodSubtotal = products.reduce((sum, pr) => sum + pr.total, 0);
  const grossTotal = procSubtotal + labSubtotal + prodSubtotal;
  const netTotal = Math.max(0, grossTotal - flatDiscount);
  const balanceDue = Math.max(0, netTotal - (payInFull ? netTotal : paymentAmount));

  // Sync Pay In Full
  useEffect(() => {
    if (payInFull) {
      setPaymentAmount(netTotal);
    }
  }, [payInFull, netTotal]);

  // Start Creating an Invoice
  const startCreateInvoice = (type: "Invoice" | "Consultation" | "Lab" | "Product") => {
    setShowInvoiceDropdown(false);
    setInvoiceTypeMode(type);
    setProcedures([]);
    setLabs([]);
    setProducts([]);
    setFlatDiscount(0);
    setPayInFull(false);
    setPaymentAmount(0);
    setPaymentRef("");
    setPaymentMode("Cash");
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setFormConsultationDate(new Date().toISOString().split("T")[0]);

    // Pre-populate based on type mode
    if (type === "Consultation" || type === "Invoice") {
      setProcedures([
        {
          id: Math.random().toString(),
          code: "99241",
          description: "Cardiac Consultation",
          qty: 1,
          charge: 500,
          discountPercent: 0,
          tax: 0,
          total: 500,
        },
      ]);
    } else if (type === "Lab") {
      setLabs([
        {
          id: Math.random().toString(),
          code: "80050",
          description: "HUH-Cardiodiabetic Test",
          sac: "999312",
          qty: 1,
          charge: 7900,
          discountPercent: 0,
          tax: 0,
          total: 7900,
        },
      ]);
    } else if (type === "Product") {
      setProducts([
        {
          id: Math.random().toString(),
          name: "EECP treatment kit",
          batch: "BATCH-01",
          stockQty: 45,
          qty: 1,
          price: 3500,
          discountPercent: 0,
          tax: 0,
          total: 3500,
        },
      ]);
    }

    setViewMode("create");
  };

  // Autocomplete searches
  const searchProcedures = async (q: string, idx: number) => {
    setActiveProcSearchIndex(idx);
    setSearchingProcedures(true);
    try {
      const res = await api<any[]>(
        `/billing/procedure-codes/search?q=${encodeURIComponent(q)}&is_lab=false&limit=15`
      );
      setProcedureResults(res || []);
    } catch {
      setProcedureResults([]);
    } finally {
      setSearchingProcedures(false);
    }
  };

  const searchLabs = async (q: string, idx: number) => {
    setActiveLabSearchIndex(idx);
    setSearchingLabs(true);
    try {
      const res = await api<any[]>(
        `/billing/procedure-codes/search?q=${encodeURIComponent(q)}&is_lab=true&limit=15`
      );
      setLabResults(res || []);
    } catch {
      setLabResults([]);
    } finally {
      setSearchingLabs(false);
    }
  };

  const searchProducts = async (q: string, idx: number) => {
    setActiveProdSearchIndex(idx);
    setSearchingProducts(true);
    try {
      const res = await api<any[]>(
        `/billing/products/search?q=${encodeURIComponent(q)}&limit=15`
      );
      setProductResults(res || []);
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Submit Invoice (Approve or Save as Draft)
  const handleSubmitInvoice = async (asDraft: boolean = false, andPrint: boolean = false) => {
    const allLines: any[] = [];

    procedures.forEach((p) => {
      if (p.description.trim()) {
        allLines.push({
          code: p.code || "PROC",
          description: p.description,
          quantity: Number(p.qty) || 1,
          unit_paise: Math.round(Number(p.charge) * 100 * (1 - (p.discountPercent || 0) / 100)),
        });
      }
    });

    labs.forEach((l) => {
      if (l.description.trim()) {
        allLines.push({
          code: l.code || "LAB",
          description: `${l.description} [SAC: ${l.sac || "999312"}]`,
          quantity: Number(l.qty) || 1,
          unit_paise: Math.round(Number(l.charge) * 100 * (1 - (l.discountPercent || 0) / 100)),
        });
      }
    });

    products.forEach((pr) => {
      if (pr.name.trim()) {
        allLines.push({
          code: pr.batch ? `BATCH-${pr.batch}` : "PROD",
          description: `${pr.name} (Batch: ${pr.batch || "NA"})`,
          quantity: Number(pr.qty) || 1,
          unit_paise: Math.round(Number(pr.price) * 100 * (1 - (pr.discountPercent || 0) / 100)),
        });
      }
    });

    if (allLines.length === 0) {
      notify("Please add at least one line item to the invoice");
      return;
    }

    const payload: any = {
      patient_id: patientId,
      doctor_id: formDoctorId || undefined,
      status: asDraft ? "draft" : "unpaid",
      discount_paise: Math.round(Number(flatDiscount) * 100),
      lines: allLines,
      notes: notes,
      terms: terms,
    };

    if (!asDraft && (payInFull || paymentAmount > 0)) {
      payload.payment = {
        amount_paise: Math.round(Number(payInFull ? netTotal : paymentAmount) * 100),
        mode: paymentMode || "Cash",
        reference: paymentRef || "",
      };
    }

    try {
      let savedInvoice: any;
      if (viewMode === "edit" && selectedInvoice) {
        savedInvoice = await api(`/invoices/${selectedInvoice.id}`, "PUT", payload);
        notify("Invoice updated successfully");
      } else {
        savedInvoice = await api("/invoices", "POST", payload);
        notify(
          asDraft
            ? "Invoice saved as draft"
            : `Invoice ${savedInvoice.number} approved successfully!`
        );
      }

      await loadData();
      if (onRefreshChart) onRefreshChart();
      refresh();

      if (andPrint) {
        setSelectedInvoice(savedInvoice);
        setViewMode("detail");
        setTimeout(() => window.print(), 300);
      } else {
        setSelectedInvoice(savedInvoice);
        setViewMode("detail");
      }
    } catch (err: any) {
      notify("Error saving invoice: " + (err.message || String(err)));
    }
  };

  // Quick Pay Action
  const handleQuickPaySubmit = async () => {
    if (!quickPayInvoice) return;
    setQuickPaySubmitting(true);
    try {
      const payPaise = Math.round(quickPayAmount * 100);
      const res = await api(`/invoices/${quickPayInvoice.id}/payments`, "POST", {
        amount_paise: payPaise,
        mode: quickPayMethod,
        reference: quickPayRef,
        simulated: true,
      });
      notify(
        `Payment of ${rupees(quickPayAmount)} recorded! Receipt ${
          res.receipt?.receipt_number || ""
        } generated.`
      );
      setQuickPayInvoice(null);
      await loadData();
      if (onRefreshChart) onRefreshChart();
      refresh();
    } catch (err: any) {
      notify("Payment failed: " + (err.message || String(err)));
    } finally {
      setQuickPaySubmitting(false);
    }
  };

  // Cancel Invoice Action
  const handleCancelInvoice = async () => {
    if (!cancelModalInvoice) return;
    try {
      await api(`/invoices/${cancelModalInvoice.id}/cancel`, "POST", {
        version: cancelModalInvoice.version,
      });
      notify(`Invoice ${cancelModalInvoice.number} has been cancelled`);
      setCancelModalInvoice(null);
      await loadData();
      if (selectedInvoice?.id === cancelModalInvoice.id) {
        setSelectedInvoice(null);
        setViewMode("list");
      }
      if (onRefreshChart) onRefreshChart();
      refresh();
    } catch (err: any) {
      notify("Failed to cancel invoice: " + (err.message || String(err)));
    }
  };

  // Void Receipt Action
  const handleVoidReceipt = async (receiptId: string) => {
    if (!confirm("Are you sure you want to void this receipt?")) return;
    try {
      await api(`/receipts/${receiptId}/void`, "POST", {});
      notify("Receipt voided successfully");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      refresh();
    } catch (err: any) {
      notify("Failed to void receipt: " + (err.message || String(err)));
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.number?.toLowerCase().includes(q);
      const matchDoc = inv.consultant_name?.toLowerCase().includes(q);
      const matchFac = inv.facility_name?.toLowerCase().includes(q);
      if (!matchNum && !matchDoc && !matchFac) return false;
    }
    if (dateFilter === "30d") {
      const d = new Date(inv.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return d >= thirtyDaysAgo;
    }
    return true;
  });

  // Calculate Balance Due for Statement
  const totalInvoicedPaise = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + (i.total_paise || 0), 0);
  const totalPaidPaise = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + (i.paid_paise || 0), 0);
  const totalBalanceDuePaise = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((s, i) => s + (i.balance_paise || 0), 0);

  // =========================================================================
  // RENDER: Full-Page Invoice Creator / Editor
  // =========================================================================
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="charm-billing-creator-page" style={{ padding: "0 4px 60px 4px" }}>
        {/* Sticky Action Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            padding: "12px 18px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setViewMode("list")}
              className="charm-btn charm-btn-outline"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
              {viewMode === "edit"
                ? `Edit Invoice: ${selectedInvoice?.number || ""}`
                : `New Invoice [${invoiceTypeMode}]`}
            </h2>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleSubmitInvoice(false, false)}
              style={{
                background: "#f97316",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                padding: "7px 18px",
                borderRadius: "4px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(249,115,22,0.3)",
              }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => handleSubmitInvoice(false, true)}
              className="charm-btn charm-btn-outline"
              style={{ fontWeight: 600, padding: "7px 14px" }}
            >
              Approve & Print
            </button>
            <button
              type="button"
              onClick={() => handleSubmitInvoice(true, false)}
              className="charm-btn charm-btn-outline"
              style={{ fontWeight: 600, padding: "7px 14px" }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="charm-btn charm-btn-outline"
              style={{ padding: "7px 14px", color: "#64748b" }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Header Metadata: Two Columns (Patient Details vs Invoice Details) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Patient Details Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              Patient Details
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f766e" }}>
              {patient?.first_name} {patient?.last_name}
            </div>
            <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
              <strong>Patient ID:</strong> {patient?.mrn || `HYN-MR-${patientId.slice(0, 6)}`} |{" "}
              <strong>Age/Sex:</strong> {patient?.dob || "12 Jan 1968"} (58 Yrs /{" "}
              {patient?.sex || "Male"})
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              <strong>Phone:</strong> {patient?.phone || "+91 98400 12345"} |{" "}
              <strong>Address:</strong> {patient?.address || "Neelankarai, Chennai - 600115"}
            </div>
          </div>

          {/* Invoice Details Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              Invoice Details
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "12px",
                rowGap: "8px",
              }}
            >
              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  Invoice #
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedInvoice?.number || "[Auto Generated]"}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    fontSize: "12px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formInvoiceDate}
                  onChange={(e) => setFormInvoiceDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  Facility
                </label>
                <select
                  value={formFacilityId}
                  onChange={(e) => setFormFacilityId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                >
                  {(facilities || []).map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  {(!facilities || facilities.length === 0) && (
                    <option value="default">Heal Your Heart · Neelankarai</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                  Consultant
                </label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                >
                  {(staff || [])
                    .filter((s: any) => s.role === "doctor" || s.role === "admin")
                    .map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  {(!staff || staff.length === 0) && (
                    <option value="doc">Dr. Prem Sekar</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 1: Consultation / Procedures */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            marginBottom: "16px",
            overflow: "visible",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: 700,
              fontSize: "13px",
              color: "#334155",
            }}
          >
            Consultation / Procedures
          </div>

          <table className="charm-table" style={{ width: "100%", margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                <th style={{ width: "40%", padding: "8px 12px" }}>
                  Procedure Code / Description
                </th>
                <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>Qty</th>
                <th style={{ width: "15%", padding: "8px 12px", textAlign: "right" }}>
                  Charge (Rs.)
                </th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "center" }}>
                  Discount (%)
                </th>
                <th style={{ width: "8%", padding: "8px 12px", textAlign: "center" }}>Tax</th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>
                  Total (Rs.)
                </th>
                <th style={{ width: "5%", padding: "8px 8px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ padding: "6px 12px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Type CPT code or procedure name..."
                      value={p.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        const copy = [...procedures];
                        copy[idx].description = val;
                        setProcedures(copy);
                        searchProcedures(val, idx);
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                    {activeProcSearchIndex === idx && procedureResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 12,
                          right: 12,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {procedureResults.map((pr) => (
                          <div
                            key={pr.id}
                            onClick={() => {
                              const copy = [...procedures];
                              copy[idx].code = pr.code;
                              copy[idx].description = `[${pr.code}] ${pr.description}`;
                              copy[idx].charge = pr.charge;
                              copy[idx].total =
                                pr.charge *
                                copy[idx].qty *
                                (1 - copy[idx].discountPercent / 100);
                              setProcedures(copy);
                              setActiveProcSearchIndex(null);
                            }}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                          >
                            <span>
                              <strong>[{pr.code}]</strong> {pr.description}
                            </span>
                            <span style={{ fontWeight: 600, color: "#0f766e" }}>
                              {rupees(pr.charge)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={p.qty}
                      onChange={(e) => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        const copy = [...procedures];
                        copy[idx].qty = q;
                        copy[idx].total = q * copy[idx].charge * (1 - copy[idx].discountPercent / 100);
                        setProcedures(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={p.charge}
                      onChange={(e) => {
                        const chg = parseFloat(e.target.value) || 0;
                        const copy = [...procedures];
                        copy[idx].charge = chg;
                        copy[idx].total = copy[idx].qty * chg * (1 - copy[idx].discountPercent / 100);
                        setProcedures(copy);
                      }}
                      style={{
                        width: "90px",
                        padding: "4px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={p.discountPercent}
                      onChange={(e) => {
                        const disc = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        const copy = [...procedures];
                        copy[idx].discountPercent = disc;
                        copy[idx].total = copy[idx].qty * copy[idx].charge * (1 - disc / 100);
                        setProcedures(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center", fontSize: "12px" }}>
                    0%
                  </td>
                  <td
                    style={{
                      padding: "6px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {rupees(p.total)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setProcedures(procedures.filter((_, i) => i !== idx));
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "8px 16px" }}>
            <button
              type="button"
              onClick={() => {
                setProcedures([
                  ...procedures,
                  {
                    id: Math.random().toString(),
                    code: "",
                    description: "",
                    qty: 1,
                    charge: 0,
                    discountPercent: 0,
                    tax: 0,
                    total: 0,
                  },
                ]);
              }}
              style={{
                color: "#f97316",
                background: "none",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Add Procedure
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 2: Labs */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            marginBottom: "16px",
            overflow: "visible",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: 700,
              fontSize: "13px",
              color: "#334155",
            }}
          >
            Labs (Clinical Laboratory Services)
          </div>

          <table className="charm-table" style={{ width: "100%", margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                <th style={{ width: "35%", padding: "8px 12px" }}>Test Code / Description</th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "center" }}>SAC</th>
                <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>Qty</th>
                <th style={{ width: "15%", padding: "8px 12px", textAlign: "right" }}>
                  Charge (Rs.)
                </th>
                <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>
                  Discount (%)
                </th>
                <th style={{ width: "8%", padding: "8px 12px", textAlign: "center" }}>Tax</th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>
                  Total (Rs.)
                </th>
                <th style={{ width: "5%", padding: "8px 8px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l, idx) => (
                <tr key={l.id}>
                  <td style={{ padding: "6px 12px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Type lab test name or code..."
                      value={l.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        const copy = [...labs];
                        copy[idx].description = val;
                        setLabs(copy);
                        searchLabs(val, idx);
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                    {activeLabSearchIndex === idx && labResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 12,
                          right: 12,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {labResults.map((lr) => (
                          <div
                            key={lr.id}
                            onClick={() => {
                              const copy = [...labs];
                              copy[idx].code = lr.code;
                              copy[idx].description = `[${lr.code}] ${lr.description}`;
                              copy[idx].sac = lr.sac_code || "999312";
                              copy[idx].charge = lr.charge;
                              copy[idx].total =
                                lr.charge * copy[idx].qty * (1 - copy[idx].discountPercent / 100);
                              setLabs(copy);
                              setActiveLabSearchIndex(null);
                            }}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                          >
                            <span>
                              <strong>[{lr.code}]</strong> {lr.description}
                            </span>
                            <span style={{ fontWeight: 600, color: "#0f766e" }}>
                              {rupees(lr.charge)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="text"
                      value={l.sac || "999312"}
                      onChange={(e) => {
                        const copy = [...labs];
                        copy[idx].sac = e.target.value;
                        setLabs(copy);
                      }}
                      style={{
                        width: "80px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        const copy = [...labs];
                        copy[idx].qty = q;
                        copy[idx].total = q * copy[idx].charge * (1 - copy[idx].discountPercent / 100);
                        setLabs(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={l.charge}
                      onChange={(e) => {
                        const chg = parseFloat(e.target.value) || 0;
                        const copy = [...labs];
                        copy[idx].charge = chg;
                        copy[idx].total = copy[idx].qty * chg * (1 - copy[idx].discountPercent / 100);
                        setLabs(copy);
                      }}
                      style={{
                        width: "90px",
                        padding: "4px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={l.discountPercent}
                      onChange={(e) => {
                        const disc = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        const copy = [...labs];
                        copy[idx].discountPercent = disc;
                        copy[idx].total = copy[idx].qty * copy[idx].charge * (1 - disc / 100);
                        setLabs(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center", fontSize: "12px" }}>
                    0%
                  </td>
                  <td
                    style={{
                      padding: "6px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {rupees(l.total)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setLabs(labs.filter((_, i) => i !== idx));
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "8px 16px" }}>
            <button
              type="button"
              onClick={() => {
                setLabs([
                  ...labs,
                  {
                    id: Math.random().toString(),
                    code: "",
                    description: "",
                    sac: "999312",
                    qty: 1,
                    charge: 0,
                    discountPercent: 0,
                    tax: 0,
                    total: 0,
                  },
                ]);
              }}
              style={{
                color: "#f97316",
                background: "none",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Add Lab
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SECTION 3: Medications / Drugs (Products) */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            marginBottom: "16px",
            overflow: "visible",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: 700,
              fontSize: "13px",
              color: "#334155",
            }}
          >
            Medications / Drugs (Products)
          </div>

          <table className="charm-table" style={{ width: "100%", margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                <th style={{ width: "35%", padding: "8px 12px" }}>Product Name</th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "center" }}>Batch</th>
                <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>Stock</th>
                <th style={{ width: "8%", padding: "8px 12px", textAlign: "center" }}>Qty</th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>
                  Price (Rs.)
                </th>
                <th style={{ width: "10%", padding: "8px 12px", textAlign: "center" }}>
                  Discount (%)
                </th>
                <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>
                  Total (Rs.)
                </th>
                <th style={{ width: "5%", padding: "8px 8px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((pr, idx) => (
                <tr key={pr.id}>
                  <td style={{ padding: "6px 12px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Type medication or item name..."
                      value={pr.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const copy = [...products];
                        copy[idx].name = val;
                        setProducts(copy);
                        searchProducts(val, idx);
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                    {activeProdSearchIndex === idx && productResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 12,
                          right: 12,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {productResults.map((pRes) => (
                          <div
                            key={pRes.id}
                            onClick={() => {
                              const copy = [...products];
                              copy[idx].name = pRes.name;
                              copy[idx].batch = pRes.batch_number || "BATCH-01";
                              copy[idx].stockQty = pRes.stock_qty || 100;
                              copy[idx].price = pRes.price || 0;
                              copy[idx].total =
                                (pRes.price || 0) *
                                copy[idx].qty *
                                (1 - copy[idx].discountPercent / 100);
                              setProducts(copy);
                              setActiveProdSearchIndex(null);
                            }}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderBottom: "1px solid #f1f5f9",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                          >
                            <span>
                              <strong>{pRes.name}</strong> ({pRes.category})
                            </span>
                            <span style={{ fontWeight: 600, color: "#0f766e" }}>
                              {rupees(pRes.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="text"
                      value={pr.batch}
                      onChange={(e) => {
                        const copy = [...products];
                        copy[idx].batch = e.target.value;
                        setProducts(copy);
                      }}
                      style={{
                        width: "80px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center", fontSize: "12px" }}>
                    {pr.stockQty}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={pr.qty}
                      onChange={(e) => {
                        const q = Math.max(1, parseInt(e.target.value) || 1);
                        const copy = [...products];
                        copy[idx].qty = q;
                        copy[idx].total = q * copy[idx].price * (1 - copy[idx].discountPercent / 100);
                        setProducts(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={pr.price}
                      onChange={(e) => {
                        const prc = parseFloat(e.target.value) || 0;
                        const copy = [...products];
                        copy[idx].price = prc;
                        copy[idx].total = copy[idx].qty * prc * (1 - copy[idx].discountPercent / 100);
                        setProducts(copy);
                      }}
                      style={{
                        width: "90px",
                        padding: "4px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pr.discountPercent}
                      onChange={(e) => {
                        const disc = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        const copy = [...products];
                        copy[idx].discountPercent = disc;
                        copy[idx].total = copy[idx].qty * copy[idx].price * (1 - disc / 100);
                        setProducts(copy);
                      }}
                      style={{
                        width: "60px",
                        padding: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "6px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {rupees(pr.total)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setProducts(products.filter((_, i) => i !== idx));
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "8px 16px" }}>
            <button
              type="button"
              onClick={() => {
                setProducts([
                  ...products,
                  {
                    id: Math.random().toString(),
                    name: "",
                    batch: "BATCH-01",
                    stockQty: 50,
                    qty: 1,
                    price: 0,
                    discountPercent: 0,
                    tax: 0,
                    total: 0,
                  },
                ]);
              }}
              style={{
                color: "#f97316",
                background: "none",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* TOTALS & FINANCIAL SUMMARY CARD (Right-Aligned) */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* Notes & Terms (Left) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Notes</label>
              <textarea
                rows={3}
                placeholder="Internal billing notes or instructions for patient..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                Terms & Conditions
              </label>
              <textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              />
            </div>
          </div>

          {/* Right Totals Box */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              <span>Sub Total:</span>
              <span style={{ fontWeight: 600 }}>{rupees(grossTotal)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              <span>Discount (-):</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "12px" }}>Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={flatDiscount}
                  onChange={(e) => setFlatDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: "80px",
                    padding: "3px 6px",
                    textAlign: "right",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              <span>Section Total:</span>
              <span>{rupees(grossTotal)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              <span>Round Off:</span>
              <span>Rs. 0.00</span>
            </div>

            <div
              style={{
                borderTop: "2px solid #e2e8f0",
                marginTop: "8px",
                paddingTop: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                Grand Total:
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#0f766e",
                  border: "1px solid #99f6e4",
                  background: "#f0fdfa",
                  padding: "4px 12px",
                  borderRadius: "4px",
                }}
              >
                {rupees(netTotal)}
              </span>
            </div>

            <div
              style={{
                marginTop: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                Balance Due:
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: balanceDue > 0 ? "#dc2626" : "#16a34a",
                  border: `1px solid ${balanceDue > 0 ? "#fecaca" : "#bbf7d0"}`,
                  background: balanceDue > 0 ? "#fef2f2" : "#f0fdf4",
                  padding: "4px 12px",
                  borderRadius: "4px",
                }}
              >
                {rupees(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* PAYMENT TENDER (Pay Invoice in Full / Partial Payment) */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "16px 20px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "12px" }}>
            <input
              type="checkbox"
              id="payInFullCheck"
              checked={payInFull}
              onChange={(e) => setPayInFull(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label
              htmlFor="payInFullCheck"
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#1e293b",
                cursor: "pointer",
              }}
            >
              Pay Invoice in Full ({rupees(netTotal)})
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1.2fr",
              gap: "12px",
              paddingTop: "6px",
            }}
          >
            <div>
              <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                Payment Method
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Cheque</option>
                <option>Bank Transfer</option>
                <option>Net Banking</option>
                <option>Razorpay</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                Reference # (UPI Ref / Cheque No)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI/3910283 or CHQ-0021"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                Amount (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={payInFull}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: payInFull ? "#f8fafc" : "#ffffff",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                Receipt will be auto-generated and added to patient's Receipts ledger.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Invoice Detail / Printable Summary View
  // =========================================================================
  if (viewMode === "detail" && selectedInvoice) {
    const isCancelled = selectedInvoice.status === "cancelled";
    return (
      <div className="charm-billing-detail-view" style={{ padding: "0 4px 60px 4px" }}>
        {/* Top Action Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            padding: "10px 18px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            marginBottom: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setViewMode("list");
              }}
              className="charm-btn charm-btn-outline"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <ArrowLeft size={14} /> Back to Invoices
            </button>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
              Invoice {selectedInvoice.number}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                background:
                  selectedInvoice.status === "paid"
                    ? "#dcfce7"
                    : selectedInvoice.status === "partial"
                    ? "#dbeafe"
                    : selectedInvoice.status === "draft"
                    ? "#fef9c3"
                    : "#fee2e2",
                color:
                  selectedInvoice.status === "paid"
                    ? "#15803d"
                    : selectedInvoice.status === "partial"
                    ? "#1d4ed8"
                    : selectedInvoice.status === "draft"
                    ? "#a16207"
                    : "#b91c1c",
              }}
            >
              {selectedInvoice.status}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {!isCancelled && selectedInvoice.balance_paise > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuickPayInvoice(selectedInvoice);
                  setQuickPayAmount(selectedInvoice.balance_paise / 100);
                  setQuickPayRef("");
                  setQuickPayMethod("UPI");
                }}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <DollarSign size={14} /> Add Payment
              </button>
            )}

            {!isCancelled && selectedInvoice.status !== "paid" && (
              <button
                type="button"
                onClick={() => {
                  setViewMode("edit");
                }}
                className="charm-btn charm-btn-outline"
                style={{ fontWeight: 600, padding: "6px 12px" }}
              >
                <Edit size={14} /> Edit Invoice
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="charm-btn charm-btn-outline"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Printer size={14} /> Print
            </button>

            <button
              type="button"
              onClick={() => {
                notify("Invoice PDF exported to Downloads folder");
              }}
              className="charm-btn charm-btn-outline"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Download size={14} /> Download PDF
            </button>

            <button
              type="button"
              onClick={() => {
                notify(`Invoice sent to ${patient?.email || "patient email"}`);
              }}
              className="charm-btn charm-btn-outline"
              style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Send size={14} /> Send Invoice
            </button>

            {!isCancelled &&
              selectedInvoice.paid_paise === 0 &&
              selectedInvoice.credited_paise === 0 && (
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(selectedInvoice)}
                  style={{
                    color: "#dc2626",
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel Invoice
                </button>
              )}
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "36px 40px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {/* Authentic Diagonal Stamp Watermark if Cancelled */}
          {isCancelled && (
            <div
              style={{
                position: "absolute",
                top: "40%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-25deg)",
                fontSize: "64px",
                fontWeight: 900,
                color: "rgba(220, 38, 38, 0.22)",
                border: "6px solid rgba(220, 38, 38, 0.3)",
                padding: "8px 36px",
                borderRadius: "12px",
                letterSpacing: "8px",
                pointerEvents: "none",
                zIndex: 10,
                textTransform: "uppercase",
                userSelect: "none",
              }}
            >
              CANCELLED
            </div>
          )}

          {/* Practice Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#0f766e" }}>
                Heal Your Heart
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                A Unit of Vaso-Meditech (EECP) Systems
              </div>
              <div style={{ fontSize: "12px", color: "#334155", marginTop: "6px" }}>
                No. 4/77, East Coast Road, Neelankarai, Chennai - 600115
              </div>
              <div style={{ fontSize: "12px", color: "#334155" }}>
                Phone: +91 44 2449 2233 | Email: billing@healyourheart.com
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                GSTIN: 33AAAAA0000A1Z5 | State Code: 33 (Tamil Nadu)
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>INVOICE</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f766e", marginTop: 4 }}>
                {selectedInvoice.number}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>
                <strong>Date:</strong> {selectedInvoice.created_at?.split("T")[0]}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
                <strong>Branch:</strong> {selectedInvoice.facility_name}
              </div>
            </div>
          </div>

          {/* Patient Details & Doctor */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 20,
              marginBottom: "24px",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                padding: "12px 16px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#64748b",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Billed To
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                {selectedInvoice.patient_name || `${patient?.first_name} ${patient?.last_name}`}
              </div>
              <div style={{ color: "#334155", marginTop: 2 }}>
                <strong>MRN / ID:</strong> {selectedInvoice.patient_mrn || patient?.mrn}
              </div>
              <div style={{ color: "#64748b", marginTop: 2 }}>
                {patient?.phone && `Phone: ${patient.phone}`}
                {patient?.address && ` | ${patient.address}`}
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: "12px 16px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#64748b",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Consulting Provider
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                {selectedInvoice.consultant_name || "Dr. Prem Sekar"}
              </div>
              <div style={{ color: "#64748b", fontSize: "12px", marginTop: 2 }}>
                Cardiology & Preventive Medicine
              </div>
              <div style={{ color: "#64748b", fontSize: "12px", marginTop: 4 }}>
                Consultation Date: {selectedInvoice.created_at?.split("T")[0]}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table
            className="charm-table"
            style={{ width: "100%", marginBottom: "20px", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", fontSize: "12px", color: "#334155" }}>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 12px" }}>Description</th>
                <th style={{ textAlign: "center", padding: "8px 12px" }}>Qty</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Rate</th>
                <th style={{ textAlign: "right", padding: "8px 12px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(selectedInvoice.lines || []).map((line: any, i: number) => (
                <tr key={line.id || i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: "13px", fontWeight: 500 }}>
                    {line.description}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: "13px", textAlign: "center" }}>
                    {line.quantity}
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: "13px", textAlign: "right" }}>
                    {money(line.unit_paise)}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {money(line.quantity * line.unit_paise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Calculation Summary */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "24px",
            }}
          >
            <div style={{ width: "300px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>
                  {money(
                    (selectedInvoice.lines || []).reduce(
                      (s: number, l: any) => s + l.quantity * l.unit_paise,
                      0
                    )
                  )}
                </span>
              </div>

              {selectedInvoice.discount_paise > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    fontSize: "13px",
                    color: "#dc2626",
                  }}
                >
                  <span>Discount:</span>
                  <span>- {money(selectedInvoice.discount_paise)}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "15px",
                  fontWeight: 800,
                  borderTop: "2px solid #e2e8f0",
                  marginTop: "6px",
                  color: "#1e293b",
                }}
              >
                <span>Grand Total:</span>
                <span>{money(selectedInvoice.total_paise)}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  fontSize: "13px",
                  color: "#16a34a",
                }}
              >
                <span>Paid Amount:</span>
                <span>{money(selectedInvoice.paid_paise || 0)}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "15px",
                  fontWeight: 800,
                  borderTop: "1px solid #e2e8f0",
                  marginTop: "4px",
                  color:
                    isCancelled || selectedInvoice.balance_paise === 0 ? "#16a34a" : "#dc2626",
                }}
              >
                <span>Balance Due:</span>
                <span>{money(isCancelled ? 0 : selectedInvoice.balance_paise)}</span>
              </div>
            </div>
          </div>

          {/* Payment Receipts Received */}
          {(selectedInvoice.payments || []).length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Payments Collected
              </div>
              <table className="charm-table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", fontSize: "11px", color: "#64748b" }}>
                    <th>Receipt #</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: "#0f766e" }}>{p.receipt_number}</td>
                      <td>{p.created_at?.split("T")[0]}</td>
                      <td>{p.mode}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {money(p.amount_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Terms & Conditions */}
          <div
            style={{
              fontSize: "11px",
              color: "#64748b",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "12px",
              lineHeight: 1.6,
            }}
          >
            <strong>Terms & Conditions:</strong>
            <br />
            1. All payments are due upon receipt of invoice. Cheques subject to realization.
            <br />
            2. For online bank transfers, please mention Patient ID and Invoice # in remarks.
            <br />
            3. Thank you for choosing Heal Your Heart for non-invasive cardiovascular care.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: Subtabs Navigation & Main Views
  // =========================================================================
  return (
    <div className="charm-patient-billing-container" style={{ padding: "0 4px" }}>
      {/* 4 Subtabs Matching CharmHealth */}
      <div
        className="charm-billing-subtabs"
        style={{
          display: "flex",
          gap: "2px",
          borderBottom: "1px solid #cbd5e1",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubtab("invoices")}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 600,
            background: activeSubtab === "invoices" ? "#ffffff" : "transparent",
            color: activeSubtab === "invoices" ? "#0f766e" : "#64748b",
            border: activeSubtab === "invoices" ? "1px solid #cbd5e1" : "none",
            borderBottom: activeSubtab === "invoices" ? "2px solid #ffffff" : "none",
            marginBottom: activeSubtab === "invoices" ? "-1px" : "0",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            cursor: "pointer",
          }}
        >
          Invoices ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab("receipts")}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 600,
            background: activeSubtab === "receipts" ? "#ffffff" : "transparent",
            color: activeSubtab === "receipts" ? "#0f766e" : "#64748b",
            border: activeSubtab === "receipts" ? "1px solid #cbd5e1" : "none",
            borderBottom: activeSubtab === "receipts" ? "2px solid #ffffff" : "none",
            marginBottom: activeSubtab === "receipts" ? "-1px" : "0",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            cursor: "pointer",
          }}
        >
          Receipts ({receipts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab("balance_due")}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 600,
            background: activeSubtab === "balance_due" ? "#ffffff" : "transparent",
            color: activeSubtab === "balance_due" ? "#0f766e" : "#64748b",
            border: activeSubtab === "balance_due" ? "1px solid #cbd5e1" : "none",
            borderBottom: activeSubtab === "balance_due" ? "2px solid #ffffff" : "none",
            marginBottom: activeSubtab === "balance_due" ? "-1px" : "0",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            cursor: "pointer",
          }}
        >
          Balance Due
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab("family_balance_due")}
          style={{
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 600,
            background: activeSubtab === "family_balance_due" ? "#ffffff" : "transparent",
            color: activeSubtab === "family_balance_due" ? "#0f766e" : "#64748b",
            border: activeSubtab === "family_balance_due" ? "1px solid #cbd5e1" : "none",
            borderBottom: activeSubtab === "family_balance_due" ? "2px solid #ffffff" : "none",
            marginBottom: activeSubtab === "family_balance_due" ? "-1px" : "0",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            cursor: "pointer",
          }}
        >
          Family Balance Due
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: INVOICES TABLE VIEW */}
      {/* =================================================================== */}
      {activeSubtab === "invoices" && (
        <div>
          {/* Header Action & Filter Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              gap: 12,
            }}
          >
            {/* Left Filter & Search Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Date:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                >
                  <option value="all">All Invoices</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div style={{ position: "relative", width: "240px" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: 8, top: 8, color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Search Invoice #, doctor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px 5px 28px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            {/* Right: Orange Split Button + Invoice ▾ */}
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: "4px",
                  boxShadow: "0 1px 2px rgba(249,115,22,0.3)",
                }}
              >
                <button
                  type="button"
                  onClick={() => startCreateInvoice("Invoice")}
                  style={{
                    background: "#f97316",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    padding: "7px 14px",
                    borderTopLeftRadius: "4px",
                    borderBottomLeftRadius: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus size={15} /> Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                  style={{
                    background: "#ea580c",
                    color: "#ffffff",
                    border: "none",
                    padding: "7px 8px",
                    borderTopRightRadius: "4px",
                    borderBottomRightRadius: "4px",
                    cursor: "pointer",
                    borderLeft: "1px solid #c2410c",
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Split Dropdown Menu */}
              {showInvoiceDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 60,
                    minWidth: "170px",
                  }}
                >
                  <div
                    onClick={() => startCreateInvoice("Invoice")}
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    Invoice [New]
                  </div>
                  <div
                    onClick={() => startCreateInvoice("Consultation")}
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    Consultation [New]
                  </div>
                  <div
                    onClick={() => startCreateInvoice("Lab")}
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    Lab [New]
                  </div>
                  <div
                    onClick={() => startCreateInvoice("Product")}
                    style={{
                      padding: "8px 14px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    Product [New]
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invoices Table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              overflow: "visible",
            }}
          >
            <table className="charm-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                  <th style={{ width: "3%", padding: "8px" }}>
                    <input type="checkbox" />
                  </th>
                  <th style={{ width: "12%", padding: "8px" }}>Consultation Date</th>
                  <th style={{ width: "18%", padding: "8px" }}>Facility Name</th>
                  <th style={{ width: "11%", padding: "8px" }}>Invoice Date</th>
                  <th style={{ width: "14%", padding: "8px" }}>Invoice #</th>
                  <th style={{ width: "14%", padding: "8px" }}>Consultant</th>
                  <th style={{ width: "9%", padding: "8px", textAlign: "right" }}>Amount</th>
                  <th style={{ width: "9%", padding: "8px", textAlign: "right" }}>Payment</th>
                  <th style={{ width: "9%", padding: "8px", textAlign: "right" }}>Due</th>
                  <th style={{ width: "8%", padding: "8px", textAlign: "center" }}>Status</th>
                  <th style={{ width: "6%", padding: "8px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const isCancelled = inv.status === "cancelled";
                  const hasDue = !isCancelled && inv.balance_paise > 0;
                  return (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isCancelled ? "#fafafa" : "#ffffff",
                      }}
                    >
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input type="checkbox" />
                      </td>
                      <td style={{ padding: "8px", fontSize: "12px", color: "#475569" }}>
                        {inv.consultation_date?.split("T")[0] || inv.created_at?.split("T")[0]}
                      </td>
                      <td style={{ padding: "8px", fontSize: "12px", color: "#334155" }}>
                        {inv.facility_name || "Heal Your Heart · Neelankarai"}
                      </td>
                      <td style={{ padding: "8px", fontSize: "12px", color: "#475569" }}>
                        {inv.created_at?.split("T")[0]}
                      </td>
                      <td style={{ padding: "8px", position: "relative" }}>
                        {/* Red Diagonal Rubber Stamp Watermark if Cancelled */}
                        {isCancelled && (
                          <span
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "30%",
                              transform: "translate(-50%, -50%) rotate(-12deg)",
                              color: "rgba(220, 38, 38, 0.8)",
                              fontSize: "10px",
                              fontWeight: 800,
                              letterSpacing: "1.5px",
                              border: "1.5px solid rgba(220, 38, 38, 0.8)",
                              padding: "0 4px",
                              borderRadius: "2px",
                              pointerEvents: "none",
                              zIndex: 2,
                            }}
                          >
                            CANCELLED
                          </span>
                        )}
                        <span
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setViewMode("detail");
                          }}
                          style={{
                            fontWeight: 600,
                            color: isCancelled ? "#94a3b8" : "#0f766e",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontSize: "12px",
                          }}
                        >
                          {inv.number}
                        </span>
                      </td>
                      <td style={{ padding: "8px", fontSize: "12px", color: "#334155" }}>
                        {inv.consultant_name || "Dr. Prem Sekar"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {money(inv.total_paise)}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontSize: "12px",
                          color: "#16a34a",
                        }}
                      >
                        {money(inv.paid_paise || 0)}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: hasDue ? 700 : 500,
                          color: hasDue ? "#dc2626" : "#64748b",
                        }}
                      >
                        {money(isCancelled ? 0 : inv.balance_paise)}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "10px",
                            textTransform: "capitalize",
                            background:
                              inv.status === "paid"
                                ? "#dcfce7"
                                : inv.status === "partial"
                                ? "#dbeafe"
                                : inv.status === "draft"
                                ? "#fef9c3"
                                : "#fee2e2",
                            color:
                              inv.status === "paid"
                                ? "#15803d"
                                : inv.status === "partial"
                                ? "#1d4ed8"
                                : inv.status === "draft"
                                ? "#a16207"
                                : "#b91c1c",
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                          }}
                          className="charm-menu-container"
                        >
                          {/* Quick Pay [$] icon button */}
                          {hasDue && (
                            <button
                              type="button"
                              title="Quick Pay"
                              onClick={() => {
                                setQuickPayInvoice(inv);
                                setQuickPayAmount(inv.balance_paise / 100);
                                setQuickPayRef("");
                                setQuickPayMethod("UPI");
                              }}
                              style={{
                                background: "#dcfce7",
                                color: "#16a34a",
                                border: "1px solid #bbf7d0",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <DollarSign size={13} />
                            </button>
                          )}

                          {/* Three Dots Menu */}
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === inv.id ? null : inv.id)
                              }
                              style={{
                                background: "none",
                                border: "none",
                                color: "#64748b",
                                cursor: "pointer",
                                padding: "2px",
                              }}
                            >
                              <MoreVertical size={14} />
                            </button>

                            {activeMenuId === inv.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                  zIndex: 70,
                                  minWidth: "130px",
                                  textAlign: "left",
                                }}
                              >
                                <div
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setViewMode("detail");
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f1f5f9",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "#f8fafc")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#ffffff")
                                  }
                                >
                                  View Invoice
                                </div>

                                {!isCancelled && inv.status !== "paid" && (
                                  <div
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setViewMode("edit");
                                      setActiveMenuId(null);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background = "#f8fafc")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = "#ffffff")
                                    }
                                  >
                                    Edit Invoice
                                  </div>
                                )}

                                {!isCancelled && hasDue && (
                                  <div
                                    onClick={() => {
                                      setQuickPayInvoice(inv);
                                      setQuickPayAmount(inv.balance_paise / 100);
                                      setActiveMenuId(null);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background = "#f8fafc")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = "#ffffff")
                                    }
                                  >
                                    Add Payment
                                  </div>
                                )}

                                <div
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setViewMode("detail");
                                    setTimeout(() => window.print(), 200);
                                    setActiveMenuId(null);
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f1f5f9",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "#f8fafc")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#ffffff")
                                  }
                                >
                                  Print
                                </div>

                                {!isCancelled && inv.paid_paise === 0 && (
                                  <div
                                    onClick={() => {
                                      setCancelModalInvoice(inv);
                                      setActiveMenuId(null);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      color: "#dc2626",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background = "#fef2f2")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = "#ffffff")
                                    }
                                  >
                                    Cancel Invoice
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                    >
                      {loading
                        ? "Loading invoices..."
                        : "No invoices generated yet for this patient. Click '+ Invoice' to create one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: RECEIPTS VIEW */}
      {/* =================================================================== */}
      {activeSubtab === "receipts" && (
        <div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              overflow: "visible",
            }}
          >
            <table className="charm-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                  <th style={{ width: "16%", padding: "8px 12px" }}>Receipt #</th>
                  <th style={{ width: "14%", padding: "8px 12px" }}>Receipt Date</th>
                  <th style={{ width: "20%", padding: "8px 12px" }}>Facility Name</th>
                  <th style={{ width: "12%", padding: "8px 12px", textAlign: "right" }}>Amount</th>
                  <th style={{ width: "14%", padding: "8px 12px" }}>Payment Method</th>
                  <th style={{ width: "12%", padding: "8px 12px" }}>Payment From</th>
                  <th style={{ width: "12%", padding: "8px 12px", textAlign: "center" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((rec) => {
                  const isVoided = rec.is_void;
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isVoided ? "#fafafa" : "#ffffff",
                      }}
                    >
                      <td style={{ padding: "8px 12px", position: "relative" }}>
                        {isVoided && (
                          <span
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "30%",
                              transform: "translate(-50%, -50%) rotate(-12deg)",
                              color: "rgba(220, 38, 38, 0.8)",
                              fontSize: "10px",
                              fontWeight: 800,
                              letterSpacing: "1.5px",
                              border: "1.5px solid rgba(220, 38, 38, 0.8)",
                              padding: "0 4px",
                              borderRadius: "2px",
                              pointerEvents: "none",
                              zIndex: 2,
                            }}
                          >
                            VOIDED
                          </span>
                        )}
                        <span
                          onClick={() => setViewingReceipt(rec)}
                          style={{
                            fontWeight: 600,
                            color: isVoided ? "#94a3b8" : "#0f766e",
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontSize: "12px",
                          }}
                        >
                          {rec.receipt_number}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px", color: "#475569" }}>
                        {rec.receipt_date?.split("T")[0]}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px", color: "#334155" }}>
                        {rec.facility_name}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#16a34a",
                        }}
                      >
                        {money(rec.amount_paise)}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px" }}>{rec.mode}</td>
                      <td style={{ padding: "8px 12px", fontSize: "12px", color: "#64748b" }}>
                        Patient
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(rec)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0f766e",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Printer size={13} /> Print
                          </button>
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => handleVoidReceipt(rec.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#dc2626",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {receipts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                    >
                      No payment receipts generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BALANCE DUE STATEMENT VIEW */}
      {/* =================================================================== */}
      {activeSubtab === "balance_due" && (
        <div>
          {/* Summary Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "16px",
                borderLeft: "4px solid #ea580c",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Patient Balance Due
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: totalBalanceDuePaise > 0 ? "#dc2626" : "#16a34a",
                  marginTop: 4,
                }}
              >
                {money(totalBalanceDuePaise)}
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "16px",
                borderLeft: "4px solid #3b82f6",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Insurance Balance Due
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#334155", marginTop: 4 }}>
                Rs. 0.00
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "16px",
                borderLeft: "4px solid #0f766e",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Total Collections Received
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                {money(totalPaidPaise)}
              </div>
            </div>
          </div>

          {/* Outstanding Invoices Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 700,
                fontSize: "13px",
                color: "#1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Outstanding Invoices</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="charm-btn charm-btn-outline"
                style={{ padding: "4px 10px", fontSize: "11px", gap: 4 }}
              >
                <Printer size={12} /> Print Statement
              </button>
            </div>
            <table className="charm-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                  <th style={{ padding: "8px 12px" }}>Invoice #</th>
                  <th style={{ padding: "8px 12px" }}>Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Paid</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Balance Due</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter((i) => i.status !== "cancelled" && i.balance_paise > 0)
                  .map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, color: "#0f766e", padding: "8px 12px" }}>
                        {inv.number}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px" }}>
                        {inv.created_at?.split("T")[0]}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontSize: "12px" }}>
                        {money(inv.total_paise)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          color: "#16a34a",
                        }}
                      >
                        {money(inv.paid_paise || 0)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#dc2626",
                        }}
                      >
                        {money(inv.balance_paise)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPayInvoice(inv);
                            setQuickPayAmount(inv.balance_paise / 100);
                            setQuickPayRef("");
                          }}
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  ))}
                {invoices.filter((i) => i.status !== "cancelled" && i.balance_paise > 0).length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: "24px", textAlign: "center", color: "#16a34a" }}
                    >
                      Patient has clear accounts! No outstanding balance due.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paid Invoices Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                fontWeight: 700,
                fontSize: "13px",
                color: "#1e293b",
              }}
            >
              Paid Invoices (Settled)
            </div>
            <table className="charm-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                  <th style={{ padding: "8px 12px" }}>Invoice #</th>
                  <th style={{ padding: "8px 12px" }}>Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Paid</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter((i) => i.status === "paid")
                  .map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, color: "#0f766e", padding: "8px 12px" }}>
                        {inv.number}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: "12px" }}>
                        {inv.created_at?.split("T")[0]}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontSize: "12px" }}>
                        {money(inv.total_paise)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "12px",
                          color: "#16a34a",
                        }}
                      >
                        {money(inv.paid_paise || 0)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: FAMILY BALANCE DUE VIEW */}
      {/* =================================================================== */}
      {activeSubtab === "family_balance_due" && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "24px",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            Family Group Account Summary
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: 16 }}>
            Family billing links member accounts within the same household for consolidated
            statement generation.
          </p>

          <table className="charm-table" style={{ width: "100%", margin: 0 }}>
            <thead>
              <tr style={{ background: "#f8fafc", fontSize: "12px", color: "#64748b" }}>
                <th style={{ padding: "8px 12px" }}>Family Member</th>
                <th style={{ padding: "8px 12px" }}>Relation</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Invoiced</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Paid</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Balance Due</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f766e" }}>
                  {patient?.first_name} {patient?.last_name} (Self)
                </td>
                <td style={{ padding: "8px 12px", fontSize: "12px" }}>Primary Account</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontSize: "12px" }}>
                  {money(totalInvoicedPaise)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontSize: "12px",
                    color: "#16a34a",
                  }}
                >
                  {money(totalPaidPaise)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: totalBalanceDuePaise > 0 ? "#dc2626" : "#16a34a",
                  }}
                >
                  {money(totalBalanceDuePaise)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================================== */}
      {/* QUICK PAY MODAL */}
      {/* =================================================================== */}
      {quickPayInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "480px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                Add Payment - Invoice {quickPayInvoice.number}
              </h3>
              <button
                type="button"
                onClick={() => setQuickPayInvoice(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "12px",
                  borderRadius: "6px",
                  marginBottom: 16,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Total Amount</div>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>
                    {money(quickPayInvoice.total_paise)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Already Paid</div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#16a34a" }}>
                    {money(quickPayInvoice.paid_paise || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Balance Due</div>
                  <div style={{ fontWeight: 800, fontSize: "14px", color: "#dc2626" }}>
                    {money(quickPayInvoice.balance_paise)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    Payment Amount (Rs.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={quickPayInvoice.balance_paise / 100}
                    value={quickPayAmount}
                    onChange={(e) => setQuickPayAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "14px",
                      fontWeight: 700,
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      marginTop: 4,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    Payment Method
                  </label>
                  <select
                    value={quickPayMethod}
                    onChange={(e) => setQuickPayMethod(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      marginTop: 4,
                    }}
                  >
                    <option>UPI</option>
                    <option>Cash</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                    <option>Cheque</option>
                    <option>Bank Transfer</option>
                    <option>Net Banking</option>
                    <option>Razorpay</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                    Reference # (Transaction ID / Cheque #)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/293810284 or CHQ-00124"
                    value={quickPayRef}
                    onChange={(e) => setQuickPayRef(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      marginTop: 4,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => setQuickPayInvoice(null)}
                  className="charm-btn charm-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={quickPaySubmitting || quickPayAmount <= 0}
                  onClick={handleQuickPaySubmit}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {quickPaySubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRINTABLE RECEIPT MODAL */}
      {/* =================================================================== */}
      {viewingReceipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "600px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "28px 32px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setViewingReceipt(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={20} />
            </button>

            {/* Receipt Watermark if Voided */}
            {viewingReceipt.is_void && (
              <div
                style={{
                  position: "absolute",
                  top: "45%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-25deg)",
                  fontSize: "54px",
                  fontWeight: 900,
                  color: "rgba(220, 38, 38, 0.22)",
                  border: "5px solid rgba(220, 38, 38, 0.3)",
                  padding: "6px 28px",
                  borderRadius: "8px",
                  letterSpacing: "6px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                VOIDED
              </div>
            )}

            <div
              style={{
                textAlign: "center",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f766e" }}>
                Heal Your Heart
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                A Unit of Vaso-Meditech (EECP) Systems · Neelankarai, Chennai
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginTop: 10,
                  letterSpacing: "1px",
                }}
              >
                PAYMENT RECEIPT
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: 10,
                fontSize: "13px",
                marginBottom: 24,
              }}
            >
              <div>
                <span style={{ color: "#64748b" }}>Receipt #:</span>{" "}
                <strong>{viewingReceipt.receipt_number}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Date:</span>{" "}
                <strong>{viewingReceipt.receipt_date?.split("T")[0]}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Patient:</span>{" "}
                <strong>{viewingReceipt.patient_name}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Invoice Reference:</span>{" "}
                <strong>{viewingReceipt.invoice_number}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Payment Mode:</span>{" "}
                <strong>{viewingReceipt.mode}</strong>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Facility:</span>{" "}
                <strong>{viewingReceipt.facility_name}</strong>
              </div>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "16px",
                borderRadius: "6px",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>
                Amount Received
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#15803d", marginTop: 4 }}>
                {money(viewingReceipt.amount_paise)}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                borderTop: "1px solid #e2e8f0",
                paddingTop: 16,
              }}
            >
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Local electronic receipt · Authenticated via Heal Your Heart EHR
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderBottom: "1px solid #94a3b8", width: "140px", height: "30px" }} />
                <div style={{ fontSize: "11px", color: "#475569", marginTop: 4 }}>
                  Authorized Signatory
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 8 }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="charm-btn charm-btn-outline"
                style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Printer size={14} /> Print
              </button>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                style={{
                  background: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  padding: "6px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CANCEL INVOICE CONFIRMATION MODAL */}
      {/* =================================================================== */}
      {cancelModalInvoice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "420px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#dc2626" }}>
              <AlertCircle size={22} />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                Cancel Invoice {cancelModalInvoice.number}?
              </h3>
            </div>
            <p style={{ fontSize: "13px", color: "#475569", marginTop: 12, lineHeight: 1.5 }}>
              Are you sure you want to cancel this invoice? The invoice balance will become 0.00 and
              it will be marked with a <strong>CANCELLED</strong> stamp. This action cannot be
              undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                className="charm-btn charm-btn-outline"
              >
                Keep Invoice
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  padding: "7px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Yes, Cancel Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
