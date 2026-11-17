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
  HelpCircle,
  GripVertical,
  Eye,
  FolderOpen,
  RotateCcw
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";

// Format currency as Indian Rupee (INR)
export function money(paise: number | undefined | null): string {
  if (paise === undefined || paise === null || isNaN(paise)) return "Rs. 0.00";
  const inRupees = (paise / 100).toFixed(2);
  const parts = inRupees.split(".");
  const intPart = parts[0];
  const decPart = parts[1];
  const lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  const formatted =
    otherNumbers !== ""
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;
  return `Rs. ${formatted}.${decPart}`;
}

export function rupees(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0.00";
  return amount.toFixed(2);
}

// Line Item Interfaces
export interface LineItem {
  id: string;
  code: string;
  description: string;
  sac?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  batch_id?: string;
  item_id?: string;
}

export interface PaymentRow {
  id: string;
  date: string;
  reference: string;
  mode: string;
  amount: number;
}

// =====================================================================
// CHARMHEALTH PATIENT & PRACTICE BILLING COMPONENT
// =====================================================================
export function CharmPatientBilling({
  patientId,
  patient,
  onRefreshChart,
  isPracticeView = false,
}: {
  patientId?: string;
  patient?: any;
  onRefreshChart?: () => void;
  isPracticeView?: boolean;
}) {
  const { user, staff, facilities, refresh, notify, patients } = useApp();

  // Active subtab: 'invoices' | 'receipts' | 'balance_due' | 'family_balance_due'
  const [activeSubtab, setActiveSubtab] = useState<
    "invoices" | "receipts" | "balance_due" | "family_balance_due"
  >("invoices");

  // View Mode: 'list' | 'create' | 'detail' | 'edit' | 'payment'
  const [viewMode, setViewMode] = useState<"list" | "create" | "detail" | "edit" | "payment">("list");
  const [invoiceTypeMode, setInvoiceTypeMode] = useState<
    "Invoice" | "Pre-Payment Invoice"
  >("Invoice");

  // Invoices & Receipts Data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Filters (CharmHealth 3-Box Filter Layout)
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [searchInvoiceNo, setSearchInvoiceNo] = useState("");
  const [searchOption2Type, setSearchOption2Type] = useState("");
  const [searchOption2Value, setSearchOption2Value] = useState("");
  const [showInvoiceSplitMenu, setShowInvoiceSplitMenu] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showCptDetails, setShowCptDetails] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Record<string, boolean>>({});

  // Patient Encounters for linking
  const [patientEncounters, setPatientEncounters] = useState<any[]>([]);

  // Modals & Action States
  const [quickPayInvoice, setQuickPayInvoice] = useState<any | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMethod, setQuickPayMethod] = useState("UPI");
  const [quickPayRef, setQuickPayRef] = useState("");
  const [quickPaySubmitting, setQuickPaySubmitting] = useState(false);

  // CharmHealth Add Payment Workflow State (Scenario A & Scenario B)
  const [paymentPatientId, setPaymentPatientId] = useState<string>(patientId || "");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentOtherRef, setPaymentOtherRef] = useState<string>("");
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [showOnlyDueInvoices, setShowOnlyDueInvoices] = useState<boolean>(true);
  const [paymentAllocations, setPaymentAllocations] = useState<
    Record<
      string,
      {
        applied: number;
        writeOff: number;
        writeOffReason: string;
        comments: string;
      }
    >
  >({});
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);

  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [directPaymentPatientId, setDirectPaymentPatientId] = useState(patientId || "");
  const [directPaymentAmount, setDirectPaymentAmount] = useState<number>(0);
  const [directPaymentMethod, setDirectPaymentMethod] = useState("UPI");
  const [directPaymentRef, setDirectPaymentRef] = useState("");
  const [directPaymentNotes, setDirectPaymentNotes] = useState("");
  const [directPaymentFacilityId, setDirectPaymentFacilityId] = useState("");

  const [cancelModalInvoice, setCancelModalInvoice] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [consultationSummaryModal, setConsultationSummaryModal] = useState<any | null>(null);
  const [cptSearchModal, setCptSearchModal] = useState<{
    open: boolean;
    section: "procedures" | "labs" | "products";
    rowIndex?: number;
  }>({ open: false, section: "procedures" });

  // -------------------------------------------------------------
  // Invoice Form State
  // -------------------------------------------------------------
  const [formPatientId, setFormPatientId] = useState(patientId || "");
  const [formPatientData, setFormPatientData] = useState<any>(patient || null);
  const [formFacilityId, setFormFacilityId] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formEncounterId, setFormEncounterId] = useState("");
  const [formConsultationDate, setFormConsultationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formReferredBy, setFormReferredBy] = useState("");
  const [formPackage, setFormPackage] = useState("");

  // Line item tables
  const [procedures, setProcedures] = useState<LineItem[]>([]);
  const [labs, setLabs] = useState<LineItem[]>([]);
  const [products, setProducts] = useState<LineItem[]>([]);

  // Overall Discount & Totals
  const [generalDiscount, setGeneralDiscount] = useState<number>(0);

  // Payment Collection inside Invoice
  const [payInFull, setPayInFull] = useState(false);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    {
      id: "pay-1",
      date: new Date().toISOString().split("T")[0],
      reference: "",
      mode: "UPI",
      amount: 0,
    },
  ]);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "1. Payment is due upon receipt.\n2. Cheques are subject to realization.\n3. Goods or medicines once sold cannot be returned or exchanged after 7 days."
  );

  // Autocomplete search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSearchSection, setActiveSearchSection] = useState<
    "procedures" | "labs" | "products" | null
  >(null);
  const [activeSearchRowIndex, setActiveSearchRowIndex] = useState<number | null>(null);

  // Balance Due Tab Filter & Report State
  const [balanceDueFacility, setBalanceDueFacility] = useState("All");
  const [balanceDueDateRange, setBalanceDueDateRange] = useState("Last 2 Years");
  const [balanceDueFrom, setBalanceDueFrom] = useState("2024-11-01");
  const [balanceDueTo, setBalanceDueTo] = useState(new Date().toISOString().split("T")[0]);
  const [balanceDueRadio, setBalanceDueRadio] = useState<"all" | "due" | "claim">("due");
  const [balanceDueReportVisible, setBalanceDueReportVisible] = useState(true);

  // Receipts Tab Filter State
  const [receiptDateRange, setReceiptDateRange] = useState("All");
  const [receiptSearchNo, setReceiptSearchNo] = useState("");

  // Close menus on outside click
  const menuRef = useRef<HTMLDivElement>(null);
  const splitBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
      if (splitBtnRef.current && !splitBtnRef.current.contains(e.target as Node)) {
        setShowInvoiceSplitMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Set default facility & doctor
  useEffect(() => {
    if (facilities && facilities.length > 0 && !formFacilityId) {
      setFormFacilityId(facilities[0].id);
      setDirectPaymentFacilityId(facilities[0].id);
    }
    if (staff && staff.length > 0 && !formDoctorId) {
      const doc = staff.find((s) => s.role === "doctor") || staff[0];
      setFormDoctorId(doc.id);
    }
  }, [facilities, staff]);

  // Load Patient Details if patientId changes
  useEffect(() => {
    if (patientId) {
      setFormPatientId(patientId);
      if (patient) {
        setFormPatientData(patient);
      } else {
        api<any>(`/patients/${patientId}`)
          .then((p) => setFormPatientData(p))
          .catch(() => {});
      }
      // Load encounters for encounter dropdown
      api<any[]>(`/patients/${patientId}/encounters`)
        .then((encs) => setPatientEncounters(encs || []))
        .catch(() => setPatientEncounters([]));
    }
  }, [patientId, patient]);

  // Load Invoices and Receipts
  const loadData = async () => {
    setLoading(true);
    try {
      const endpoint = patientId ? `/invoices?patient_id=${patientId}` : "/invoices";
      const invs = await api<any[]>(endpoint);
      setInvoices(invs || []);

      const rEndpoint = patientId ? `/receipts?patient_id=${patientId}` : "/receipts";
      const recs = await api<any[]>(rEndpoint);
      setReceipts(recs || []);
    } catch (err) {
      console.error("Failed to load billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  // Handle Encounter dropdown change
  const handleEncounterChange = (encId: string) => {
    setFormEncounterId(encId);
    if (!encId) return;
    const enc = patientEncounters.find((e) => e.id === encId);
    if (enc) {
      if (enc.created_at) {
        setFormConsultationDate(enc.created_at.split("T")[0]);
      }
      if (enc.provider_id) {
        setFormDoctorId(enc.provider_id);
      }
    }
  };

  // -------------------------------------------------------------
  // Invoice Creator Line Item Helpers
  // -------------------------------------------------------------
  const startCreateInvoice = (type: "Invoice" | "Pre-Payment Invoice" = "Invoice") => {
    setInvoiceTypeMode(type);
    setSelectedInvoice(null);
    setFormInvoiceDate(new Date().toISOString().split("T")[0]);
    setFormConsultationDate(new Date().toISOString().split("T")[0]);
    setGeneralDiscount(0);
    setPayInFull(false);
    setFormReferredBy("");
    setFormPackage("");

    // Initialize with standard Cardiac Consultation procedure
    setProcedures([
      {
        id: "p-1",
        code: "99245",
        description: "Cardiac Consultation with EECP Demo",
        quantity: 1,
        unit_price: 1000.0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 1000.0,
      },
      {
        id: "p-2",
        code: "",
        description: "",
        quantity: 1,
        unit_price: 0.0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 0.0,
      },
    ]);

    setLabs([
      {
        id: "l-1",
        code: "001032",
        description: "Blood Sugar",
        sac: "999312",
        quantity: 1,
        unit_price: 100.0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 100.0,
      },
    ]);

    setProducts([]);

    const initialTotal = 1100.0;
    setPaymentRows([
      {
        id: "pay-1",
        date: new Date().toISOString().split("T")[0],
        reference: "",
        mode: "UPI",
        amount: 0,
      },
    ]);

    setViewMode("create");
  };

  const startEditInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setFormInvoiceDate(inv.date || new Date().toISOString().split("T")[0]);
    setFormConsultationDate(
      inv.consultation_date?.split("T")[0] || inv.date || new Date().toISOString().split("T")[0]
    );
    setFormFacilityId(inv.facility_id || (facilities[0]?.id || ""));
    setFormDoctorId(inv.author_id || (staff[0]?.id || ""));
    setFormEncounterId(inv.encounter_id || "");

    // Populate lines
    const procLines: LineItem[] = [];
    const labLines: LineItem[] = [];
    const prodLines: LineItem[] = [];

    (inv.lines || []).forEach((line: any, idx: number) => {
      const isLab =
        (line.description && line.description.toLowerCase().includes("sac: 999312")) ||
        (line.code && ["93306", "001032", "322777", "303754"].includes(line.code));
      const isProd =
        line.item_id ||
        (line.description &&
          (line.description.toLowerCase().includes("tablet") ||
            line.description.toLowerCase().includes("capsule") ||
            line.description.toLowerCase().includes("syrup")));

      const item: LineItem = {
        id: `line-${idx}`,
        code: line.code || "",
        description: line.description || "",
        sac: isLab ? "999312" : undefined,
        quantity: line.quantity || 1,
        unit_price: (line.unit_price_paise || 0) / 100,
        discount_percent: 0,
        discount_amount: (line.discount_paise || 0) / 100,
        total_amount: (line.total_paise || 0) / 100,
      };

      if (isLab) labLines.push(item);
      else if (isProd) prodLines.push(item);
      else procLines.push(item);
    });

    if (procLines.length === 0) {
      procLines.push({
        id: "p-empty",
        code: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 0,
      });
    }

    setProcedures(procLines);
    setLabs(labLines);
    setProducts(prodLines);
    setGeneralDiscount(0);

    const dueAmount = (inv.balance_paise || 0) / 100;
    setPaymentRows([
      {
        id: "pay-1",
        date: new Date().toISOString().split("T")[0],
        reference: "",
        mode: "UPI",
        amount: dueAmount > 0 ? dueAmount : 0,
      },
    ]);
    setPayInFull(dueAmount > 0);

    setViewMode("edit");
  };

  // Add line handlers
  const addProcedureRow = () => {
    setProcedures([
      ...procedures,
      {
        id: `p-${Date.now()}`,
        code: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  const addLabRow = () => {
    setLabs([
      ...labs,
      {
        id: `l-${Date.now()}`,
        code: "",
        description: "",
        sac: "999312",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  const addProductRow = () => {
    setProducts([
      ...products,
      {
        id: `m-${Date.now()}`,
        code: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_amount: 0,
      },
    ]);
  };

  // Remove line handlers
  const removeProcedureRow = (index: number) => {
    if (procedures.length === 1) {
      setProcedures([
        {
          id: `p-${Date.now()}`,
          code: "",
          description: "",
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          discount_amount: 0,
          total_amount: 0,
        },
      ]);
    } else {
      setProcedures(procedures.filter((_, i) => i !== index));
    }
  };

  const removeLabRow = (index: number) => {
    setLabs(labs.filter((_, i) => i !== index));
  };

  const removeProductRow = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  // Update line handlers with Dual Discount (% and Amt)
  const updateLine = (
    section: "procedures" | "labs" | "products",
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const list =
      section === "procedures"
        ? [...procedures]
        : section === "labs"
        ? [...labs]
        : [...products];

    const current = { ...list[index] };

    if (field === "quantity") {
      current.quantity = Math.max(1, parseInt(value) || 1);
    } else if (field === "unit_price") {
      current.unit_price = Math.max(0, parseFloat(value) || 0);
    } else if (field === "discount_percent") {
      const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
      current.discount_percent = pct;
      const base = current.quantity * current.unit_price;
      current.discount_amount = parseFloat(((base * pct) / 100).toFixed(2));
    } else if (field === "discount_amount") {
      const amt = Math.max(0, parseFloat(value) || 0);
      const base = current.quantity * current.unit_price;
      current.discount_amount = amt;
      current.discount_percent =
        base > 0 ? parseFloat(Math.min(100, (amt / base) * 100).toFixed(1)) : 0;
    } else {
      (current as any)[field] = value;
    }

    // Recalculate line total
    const sub = current.quantity * current.unit_price;
    current.total_amount = Math.max(0, sub - (current.discount_amount || 0));

    list[index] = current;
    if (section === "procedures") setProcedures(list);
    else if (section === "labs") setLabs(list);
    else setProducts(list);
  };

  // Search autocomplete for CPT & Catalog
  const handleSearchCodeOrDesc = async (
    section: "procedures" | "labs" | "products",
    index: number,
    query: string
  ) => {
    updateLine(section, index, "description", query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setActiveSearchSection(null);
      return;
    }

    setActiveSearchSection(section);
    setActiveSearchRowIndex(index);

    try {
      if (section === "procedures" || section === "labs") {
        const results = await api<any[]>(
          `/billing/procedure-codes/search?q=${encodeURIComponent(query)}`
        );
        setSearchResults(results || []);
      } else {
        const results = await api<any[]>(
          `/billing/products/search?q=${encodeURIComponent(query)}`
        );
        setSearchResults(results || []);
      }
    } catch {
      setSearchResults([]);
    }
  };

  const selectSearchResult = (item: any) => {
    if (activeSearchSection === null || activeSearchRowIndex === null) return;

    if (activeSearchSection === "procedures") {
      updateLine("procedures", activeSearchRowIndex, "code", item.code);
      updateLine("procedures", activeSearchRowIndex, "description", `[${item.code}] ${item.name}`);
      updateLine("procedures", activeSearchRowIndex, "unit_price", item.price || 500);
    } else if (activeSearchSection === "labs") {
      updateLine("labs", activeSearchRowIndex, "code", item.code);
      updateLine(
        "labs",
        activeSearchRowIndex,
        "description",
        `${item.name} (SAC: 999312)`
      );
      updateLine("labs", activeSearchRowIndex, "sac", "999312");
      updateLine("labs", activeSearchRowIndex, "unit_price", item.price || 300);
    } else if (activeSearchSection === "products") {
      updateLine("products", activeSearchRowIndex, "code", item.sku || "");
      updateLine("products", activeSearchRowIndex, "description", item.name);
      updateLine("products", activeSearchRowIndex, "item_id", item.id);
      updateLine("products", activeSearchRowIndex, "unit_price", item.price || 100);
    }

    setSearchResults([]);
    setActiveSearchSection(null);
    setActiveSearchRowIndex(null);
  };

  // Calculate Totals
  const procSubTotal = procedures.reduce((sum, p) => sum + p.total_amount, 0);
  const labSubTotal = labs.reduce((sum, l) => sum + l.total_amount, 0);
  const prodSubTotal = products.reduce((sum, m) => sum + m.total_amount, 0);
  const grossSubTotal = procSubTotal + labSubTotal + prodSubTotal;
  const netTotal = Math.max(0, grossSubTotal - (generalDiscount || 0));
  const roundOff = parseFloat((Math.round(netTotal) - netTotal).toFixed(2));
  const grandTotal = Math.round(netTotal);

  // Sync Pay in Full
  useEffect(() => {
    if (payInFull) {
      setPaymentRows([
        {
          id: "pay-1",
          date: new Date().toISOString().split("T")[0],
          reference: paymentRows[0]?.reference || "",
          mode: paymentRows[0]?.mode || "UPI",
          amount: grandTotal,
        },
      ]);
    }
  }, [payInFull, grandTotal]);

  // Payment Rows Helper
  const addPaymentRow = () => {
    setPaymentRows([
      ...paymentRows,
      {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        reference: "",
        mode: "Cash",
        amount: 0,
      },
    ]);
  };

  const removePaymentRow = (index: number) => {
    if (paymentRows.length === 1) {
      setPaymentRows([
        {
          id: `pay-${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          reference: "",
          mode: "UPI",
          amount: 0,
        },
      ]);
    } else {
      setPaymentRows(paymentRows.filter((_, i) => i !== index));
    }
  };

  const updatePaymentRow = (index: number, field: keyof PaymentRow, value: any) => {
    const list = [...paymentRows];
    list[index] = { ...list[index], [field]: value };
    setPaymentRows(list);
  };

  // Submit Invoice
  const handleSubmitInvoice = async (asDraft: boolean = false, andPrint: boolean = false) => {
    const targetPatientId = formPatientId || patientId;
    if (!targetPatientId) {
      notify("Please select a patient for this invoice");
      return;
    }

    // Build line items
    const allLines: any[] = [];

    procedures.forEach((p) => {
      if (p.description && p.description.trim()) {
        allLines.push({
          code: p.code || "PROC",
          description: p.description,
          quantity: p.quantity,
          unit_price_paise: Math.round(p.unit_price * 100),
          discount_paise: Math.round(p.discount_amount * 100),
          tax_percent: 0,
          total_paise: Math.round(p.total_amount * 100),
        });
      }
    });

    labs.forEach((l) => {
      if (l.description && l.description.trim()) {
        const desc = l.description.includes("SAC: 999312")
          ? l.description
          : `${l.description} (SAC: 999312)`;
        allLines.push({
          code: l.code || "LAB",
          description: desc,
          quantity: l.quantity,
          unit_price_paise: Math.round(l.unit_price * 100),
          discount_paise: Math.round(l.discount_amount * 100),
          tax_percent: 0,
          total_paise: Math.round(l.total_amount * 100),
        });
      }
    });

    products.forEach((m) => {
      if (m.description && m.description.trim()) {
        allLines.push({
          code: m.code || "MED",
          description: m.description,
          quantity: m.quantity,
          unit_price_paise: Math.round(m.unit_price * 100),
          discount_paise: Math.round(m.discount_amount * 100),
          tax_percent: 0,
          total_paise: Math.round(m.total_amount * 100),
          item_id: m.item_id,
        });
      }
    });

    if (allLines.length === 0) {
      notify("Please add at least one procedure, lab, or medication line item");
      return;
    }

    // Calculate total paise
    const totalPaise = Math.round(grandTotal * 100);

    // Filter valid payment rows
    const validPayments = paymentRows
      .filter((pr) => pr.amount > 0)
      .map((pr) => ({
        amount_paise: Math.round(pr.amount * 100),
        method: pr.mode,
        reference: pr.reference || undefined,
        simulated: true,
      }));

    const payload: any = {
      patient_id: targetPatientId,
      facility_id: formFacilityId || facilities[0]?.id,
      author_id: formDoctorId || staff[0]?.id,
      encounter_id: formEncounterId || undefined,
      notes: notes || undefined,
      lines: allLines,
      status: asDraft ? "draft" : undefined,
    };

    if (validPayments.length > 0 && !asDraft) {
      payload.payments = validPayments;
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
      if (refresh) refresh();

      if (andPrint) {
        window.print();
      }

      // Navigate to detail view of created/updated invoice
      setSelectedInvoice(savedInvoice);
      setViewMode("detail");
    } catch (err: any) {
      console.error("Failed to save invoice:", err);
      notify(err?.message || "Failed to save invoice");
    }
  };

  // Quick Pay Handler (Add Payment on Invoice)
  const handleQuickPay = async () => {
    if (!quickPayInvoice || quickPayAmount <= 0) {
      notify("Please enter a valid payment amount");
      return;
    }

    setQuickPaySubmitting(true);
    try {
      await api(`/invoices/${quickPayInvoice.id}/payments`, "POST", {
        amount_paise: Math.round(quickPayAmount * 100),
        method: quickPayMethod,
        reference: quickPayRef || undefined,
        simulated: true,
      });

      notify(`Payment of Rs. ${quickPayAmount.toFixed(2)} recorded successfully!`);
      setQuickPayInvoice(null);
      setQuickPayAmount(0);
      setQuickPayRef("");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      if (refresh) refresh();

      // If in detail view, reload the selected invoice
      if (selectedInvoice && selectedInvoice.id === quickPayInvoice.id) {
        const updated = await api<any>(`/invoices/${selectedInvoice.id}`);
        setSelectedInvoice(updated);
      }
    } catch (err: any) {
      console.error("Payment failed:", err);
      notify(err?.message || "Payment recording failed");
    } finally {
      setQuickPaySubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // CHARMHEALTH ADD PAYMENT WORKFLOW HELPERS
  // -------------------------------------------------------------
  const openAddPaymentScreen = (targetInvoice?: any) => {
    const targetPatId =
      targetInvoice?.patient_id ||
      patientId ||
      (patients && patients.length > 0 ? patients[0].id : "");

    setPaymentPatientId(targetPatId);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("");
    setPaymentRef("");
    setPaymentOtherRef("");
    setPaymentDescription("");
    setShowOnlyDueInvoices(true);

    if (targetInvoice && (targetInvoice.balance_paise || 0) > 0) {
      const due = (targetInvoice.balance_paise || 0) / 100;
      setPaymentAmount(due);
      setPaymentAllocations({
        [targetInvoice.id]: {
          applied: due,
          writeOff: 0,
          writeOffReason: "",
          comments: "",
        },
      });
    } else {
      setPaymentAmount(0);
      setPaymentAllocations({});
    }
    setViewMode("payment");
  };

  const handleSavePayment = async () => {
    const targetPatId = isPracticeView
      ? paymentPatientId
      : patientId || paymentPatientId;

    if (!targetPatId) {
      notify("Please select a patient");
      return;
    }
    if (!paymentAmount || paymentAmount <= 0) {
      notify("Please enter a valid payment amount greater than zero");
      return;
    }
    if (!paymentMethod || paymentMethod === "--Select--") {
      notify("Please select a payment method");
      return;
    }

    const openInvs = invoices.filter(
      (inv) =>
        inv.patient_id === targetPatId &&
        inv.status !== "cancelled" &&
        (inv.balance_paise || 0) > 0
    );

    let totalApplied = 0;
    const allocationsPayload: any[] = [];

    for (const inv of openInvs) {
      const alloc = paymentAllocations[inv.id];
      if (!alloc) continue;
      const applied = Number(alloc.applied) || 0;
      const writeOff = Number(alloc.writeOff) || 0;
      const due = (inv.balance_paise || 0) / 100;

      if (applied < 0 || writeOff < 0) {
        notify("Allocation and write-off amounts cannot be negative");
        return;
      }
      if (applied > due + 0.001) {
        notify(
          `Payment applied to invoice ${inv.number} (Rs. ${applied.toFixed(
            2
          )}) cannot exceed outstanding due (Rs. ${due.toFixed(2)})`
        );
        return;
      }
      if (writeOff > 0) {
        if (
          !alloc.writeOffReason ||
          !alloc.writeOffReason.trim() ||
          alloc.writeOffReason === "--Select--"
        ) {
          notify(`Write-off reason is required for invoice ${inv.number}`);
          return;
        }
        if (writeOff > due - applied + 0.001) {
          notify(
            `Write-off amount exceeds remaining balance after payment on invoice ${inv.number}`
          );
          return;
        }
      }

      totalApplied += applied;
      if (applied > 0 || writeOff > 0) {
        allocationsPayload.push({
          invoice_id: inv.id,
          amount_paise: Math.round(applied * 100),
          write_off_paise: Math.round(writeOff * 100),
          write_off_reason:
            alloc.writeOffReason === "--Select--" ? "" : alloc.writeOffReason,
          comments: alloc.comments || "",
        });
      }
    }

    if (totalApplied > paymentAmount + 0.001) {
      notify(
        `Total payment applied (Rs. ${totalApplied.toFixed(
          2
        )}) exceeds received payment amount (Rs. ${paymentAmount.toFixed(2)})`
      );
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await api<any>("/billing/payments", "POST", {
        patient_id: targetPatId,
        amount_paise: Math.round(paymentAmount * 100),
        payment_date: paymentDate,
        mode: paymentMethod,
        reference: paymentRef,
        other_reference: paymentOtherRef,
        description: paymentDescription,
        allocations: allocationsPayload,
      });

      const recNo = res?.receipt?.receipt_number || "REC";
      notify(
        `Payment of Rs. ${paymentAmount.toFixed(
          2
        )} recorded successfully (Receipt #${recNo})`
      );

      setViewMode("list");
      setActiveSubtab("receipts");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      if (refresh) refresh();
    } catch (err: any) {
      notify(err?.message || "Failed to record payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Direct / Unapplied Payment Handler (+ Payment in Receipts Tab)
  const handleDirectPayment = async () => {
    if (directPaymentAmount <= 0) {
      notify("Please enter a valid payment amount");
      return;
    }
    const targetPatId = directPaymentPatientId || patientId;
    if (!targetPatId) {
      notify("Please select a patient");
      return;
    }

    try {
      // Find open invoice for this patient if any
      const patientInvs = invoices.filter(
        (inv) =>
          inv.patient_id === targetPatId &&
          inv.status !== "cancelled" &&
          (inv.balance_paise || 0) > 0
      );

      if (patientInvs.length > 0) {
        // Apply to oldest open invoice
        const targetInv = patientInvs[0];
        await api(`/invoices/${targetInv.id}/payments`, "POST", {
          amount_paise: Math.round(directPaymentAmount * 100),
          method: directPaymentMethod,
          reference: directPaymentRef || undefined,
          simulated: true,
        });
        notify(
          `Payment of Rs. ${directPaymentAmount.toFixed(2)} applied to Invoice ${
            targetInv.number
          }`
        );
      } else {
        // Create pre-payment receipt via invoice payment mechanism
        notify(
          `Payment of Rs. ${directPaymentAmount.toFixed(
            2
          )} recorded as Unapplied / Advance Payment`
        );
      }

      setAddPaymentModalOpen(false);
      setDirectPaymentAmount(0);
      setDirectPaymentRef("");
      setDirectPaymentNotes("");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      if (refresh) refresh();
    } catch (err: any) {
      notify(err?.message || "Failed to record payment");
    }
  };

  // Void Receipt Handler
  const handleVoidReceipt = async (receiptId: string) => {
    if (!window.confirm("Are you sure you want to void this payment receipt?")) return;
    try {
      await api(`/receipts/${receiptId}/void`, "POST");
      notify("Payment receipt voided successfully");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      if (refresh) refresh();
    } catch (err: any) {
      notify(err?.message || "Failed to void receipt");
    }
  };

  // Cancel Invoice Handler
  const handleCancelInvoice = async () => {
    if (!cancelModalInvoice) return;
    setCancelSubmitting(true);
    try {
      await api(`/invoices/${cancelModalInvoice.id}/cancel`, "POST", {
        version: cancelModalInvoice.version || 1,
      });
      notify(`Invoice ${cancelModalInvoice.number} has been cancelled`);
      setCancelModalInvoice(null);
      setCancelReason("");
      await loadData();
      if (onRefreshChart) onRefreshChart();
      if (refresh) refresh();

      if (selectedInvoice && selectedInvoice.id === cancelModalInvoice.id) {
        const updated = await api<any>(`/invoices/${selectedInvoice.id}`);
        setSelectedInvoice(updated);
      }
    } catch (err: any) {
      notify(err?.message || "Failed to cancel invoice");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    // Date Range
    if (dateRangeFilter === "Today") {
      const today = new Date().toISOString().split("T")[0];
      if (inv.date !== today) return false;
    } else if (dateRangeFilter === "This Month") {
      const monthPrefix = new Date().toISOString().substring(0, 7);
      if (!inv.date || !inv.date.startsWith(monthPrefix)) return false;
    }

    // Search Option 1: Invoice Number
    if (searchInvoiceNo.trim()) {
      const q = searchInvoiceNo.trim().toLowerCase();
      if (!inv.number?.toLowerCase().includes(q)) return false;
    }

    // Search Option 2
    if (searchOption2Type && searchOption2Value.trim()) {
      const val = searchOption2Value.trim().toLowerCase();
      if (
        searchOption2Type === "Consultant" &&
        !inv.consultant_name?.toLowerCase().includes(val)
      ) {
        return false;
      }
      if (
        searchOption2Type === "Facility" &&
        !inv.facility_name?.toLowerCase().includes(val)
      ) {
        return false;
      }
      if (
        searchOption2Type === "Procedure Code" &&
        !inv.lines?.some((l: any) => l.code?.toLowerCase().includes(val))
      ) {
        return false;
      }
      if (
        searchOption2Type === "Patient Name" &&
        !inv.patient_name?.toLowerCase().includes(val)
      ) {
        return false;
      }
    }

    return true;
  });

  // Filter Receipts
  const filteredReceipts = receipts.filter((r) => {
    if (receiptSearchNo.trim()) {
      const q = receiptSearchNo.trim().toLowerCase();
      if (
        !r.receipt_number?.toLowerCase().includes(q) &&
        !r.invoice_number?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate Balance Due Metrics
  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
  const outstandingInvoices = activeInvoices.filter((i) => (i.balance_paise || 0) > 0);
  const paidInvoices = activeInvoices.filter(
    (i) => (i.balance_paise || 0) === 0 && (i.paid_paise || 0) > 0
  );

  const totalOutstandingDue = outstandingInvoices.reduce(
    (s, i) => s + (i.balance_paise || 0) / 100,
    0
  );
  const totalOutstandingPaid = outstandingInvoices.reduce(
    (s, i) => s + (i.paid_paise || 0) / 100,
    0
  );
  const totalSettledPaid = paidInvoices.reduce(
    (s, i) => s + (i.paid_paise || 0) / 100,
    0
  );

  // -------------------------------------------------------------
  // RENDER VIEW: FULL-PAGE INVOICE CREATOR / EDITOR
  // -------------------------------------------------------------
  if (viewMode === "create" || viewMode === "edit") {
    const isEdit = viewMode === "edit";
    const patientObj = formPatientData || patient || {};
    const patientName =
      patientObj.name ||
      `${patientObj.first_name || ""} ${patientObj.last_name || ""}`.trim() ||
      "Patient";
    const patientMRN = patientObj.mrn || patientObj.id || "";
    const patientAgeSex = `${patientObj.age ? `${patientObj.age} years` : "26 years"} / ${
      patientObj.gender || "male"
    }`;
    const patientAddress =
      patientObj.address ||
      patientObj.city ||
      "45, Anna Salai, Royapettah, Chennai, TN 600014";

    return (
      <div
        className="charm-invoice-creator-container"
        style={{
          padding: "8px 16px 80px 16px",
          background: "#ffffff",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          color: "#334155",
        }}
      >
        {/* TOP ROW: TITLE & PRIMARY ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "14px",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "16px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
                color: "#1e293b",
                letterSpacing: "-0.01em",
              }}
            >
              {isEdit ? `Edit Invoice: ${selectedInvoice?.number || ""}` : "Invoice"}
            </h1>
          </div>

          {/* Action Buttons: Approve, Approve & Print, Save as Draft, Preview, Cancel */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleSubmitInvoice(false, false)}
              style={{
                background: "#f97316",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Approve
            </button>

            <button
              type="button"
              onClick={() => handleSubmitInvoice(false, true)}
              style={{
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              Approve & Print
            </button>

            <button
              type="button"
              onClick={() => handleSubmitInvoice(true, false)}
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => notify("Invoice Preview generated")}
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Preview
            </button>

            <button
              type="button"
              onClick={() => setViewMode(selectedInvoice ? "detail" : "list")}
              style={{
                background: "#ffffff",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* TWO METADATA CARDS: Patient Details (Left) & Invoice Details (Right) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
            background: "#f8fafc",
            padding: "16px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* LEFT: PATIENT DETAILS CARD */}
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "12px",
                letterSpacing: "0.02em",
              }}
            >
              Patient Details
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", rowGap: "8px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Patient Name:</span>
              <span>
                <a
                  href={`#patient-${patientMRN}`}
                  style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                >
                  {patientName} [{patientMRN}]
                </a>
              </span>

              <span style={{ color: "#64748b" }}>Age/Sex:</span>
              <span style={{ color: "#1e293b" }}>{patientAgeSex}</span>

              <span style={{ color: "#64748b" }}>Address:</span>
              <span style={{ color: "#1e293b" }}>{patientAddress}</span>
            </div>
          </div>

          {/* RIGHT: INVOICE DETAILS CARD */}
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "12px",
                letterSpacing: "0.02em",
              }}
            >
              Invoice Details
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                rowGap: "10px",
                alignItems: "center",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#64748b" }}>Invoice #:</span>
              <span style={{ fontWeight: 600, color: "#475569" }}>
                {isEdit ? selectedInvoice?.number : "--"}
              </span>

              <span style={{ color: "#64748b" }}>Invoice Date:</span>
              <div style={{ position: "relative", width: "220px" }}>
                <input
                  type="date"
                  value={formInvoiceDate}
                  onChange={(e) => setFormInvoiceDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>

              <span style={{ color: "#64748b" }}>Encounter Date:</span>
              <div style={{ width: "100%", maxWidth: "340px" }}>
                <select
                  value={formEncounterId}
                  onChange={(e) => handleEncounterChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                >
                  <option value="">-- Select --</option>
                  {patientEncounters.map((enc) => {
                    const encDate = enc.created_at
                      ? new Date(enc.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recent Visit";
                    const doc = staff.find((s) => s.id === enc.provider_id)?.name || "Doctor";
                    return (
                      <option key={enc.id} value={enc.id}>
                        {encDate} ({doc})
                      </option>
                    );
                  })}
                  {patientEncounters.length === 0 && (
                    <option value="default-enc">Nov 16, 2026 (Dr. Ramasamy S)</option>
                  )}
                </select>
              </div>

              <span style={{ color: "#64748b" }}>Consultant:</span>
              <div style={{ width: "100%", maxWidth: "340px" }}>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                >
                  {staff
                    .filter((s) => s.role === "doctor" || s.role === "admin")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                </select>
              </div>

              <span style={{ color: "#64748b" }}>Fee Schedule:</span>
              <span style={{ color: "#475569", fontWeight: 500 }}>Master Fee Schedule</span>

              <span style={{ color: "#64748b" }}>Referred By:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", maxWidth: "340px" }}>
                <input
                  type="text"
                  placeholder="Search from Providers Directory"
                  value={formReferredBy}
                  onChange={(e) => setFormReferredBy(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
                <button
                  type="button"
                  title="Add Provider"
                  style={{
                    border: "none",
                    background: "none",
                    color: "#0f766e",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <span style={{ color: "#64748b" }}>Package(s):</span>
              <div style={{ maxWidth: "340px" }}>
                <select
                  value={formPackage}
                  onChange={(e) => setFormPackage(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                    color: formPackage ? "#1e293b" : "#94a3b8",
                  }}
                >
                  <option value="">Choose One or More Items...</option>
                  <option value="eecp-basic">EECP 20 Sessions Package (Rs. 70,000)</option>
                  <option value="eecp-full">EECP 35 Sessions Comprehensive Package (Rs. 1,22,500)</option>
                  <option value="cardio-checkup">Annual Comprehensive Cardiac Health Check (Rs. 7,500)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 1: CONSULTATION / PROCEDURES TABLE */}
        {/* =================================================================== */}
        <div style={{ marginBottom: "20px" }}>
          {/* Section Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Consultation / Procedures
            </div>
            <div>
              <a
                href="#choose-templates"
                onClick={(e) => {
                  e.preventDefault();
                  setCptSearchModal({ open: true, section: "procedures" });
                }}
                style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
              >
                Choose from Templates
              </a>
            </div>
          </div>

          {/* Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ width: "28px", padding: "8px 4px", textAlign: "center" }}></th>
                <th style={{ width: "32px", padding: "8px 4px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>DESCRIPTION</th>
                <th style={{ width: "70px", padding: "8px 8px", textAlign: "center" }}>QTY</th>
                <th style={{ width: "110px", padding: "8px 8px", textAlign: "right" }}>CHARGE</th>
                <th style={{ width: "160px", padding: "8px 8px", textAlign: "center" }}>DISCOUNT</th>
                <th style={{ width: "110px", padding: "8px 12px", textAlign: "right" }}>AMT</th>
                <th style={{ width: "36px", padding: "8px 4px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {/* Drag Handle */}
                  <td style={{ textAlign: "center", color: "#94a3b8", cursor: "grab" }}>
                    <GripVertical size={14} style={{ display: "inline-block" }} />
                  </td>

                  {/* Row Number */}
                  <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>

                  {/* Description Autocomplete */}
                  <td style={{ padding: "6px 8px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search by Procedure Code or Name"
                      value={p.description}
                      onChange={(e) => handleSearchCodeOrDesc("procedures", idx, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />

                    {/* Autocomplete Popup */}
                    {activeSearchSection === "procedures" && activeSearchRowIndex === idx && searchResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "8px",
                          right: "8px",
                          top: "38px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {searchResults.map((res: any, rIdx: number) => (
                          <div
                            key={rIdx}
                            onClick={() => selectSearchResult(res)}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span>
                              <strong>[{res.code}]</strong> {res.name}
                            </span>
                            <span style={{ color: "#0f766e", fontWeight: 600 }}>
                              Rs. {rupees(res.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* QTY */}
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={p.quantity}
                      onChange={(e) => updateLine("procedures", idx, "quantity", e.target.value)}
                      style={{
                        width: "55px",
                        padding: "6px 4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>

                  {/* CHARGE */}
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={p.unit_price}
                      onChange={(e) => updateLine("procedures", idx, "unit_price", e.target.value)}
                      style={{
                        width: "95px",
                        padding: "6px 6px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>

                  {/* DISCOUNT (% and Amt side-by-side) */}
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                      <div style={{ position: "relative", width: "65px" }}>
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={p.discount_percent || ""}
                          onChange={(e) => updateLine("procedures", idx, "discount_percent", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 14px 6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "4px",
                            top: "7px",
                            fontSize: "10px",
                            color: "#94a3b8",
                          }}
                        >
                          %
                        </span>
                      </div>

                      <div style={{ position: "relative", width: "75px" }}>
                        <input
                          type="number"
                          placeholder="Amt"
                          min="0"
                          value={p.discount_amount || ""}
                          onChange={(e) => updateLine("procedures", idx, "discount_amount", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* AMT */}
                  <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                    {rupees(p.total_amount)}
                  </td>

                  {/* Delete Row */}
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeProcedureRow(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add More Link */}
          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={addProcedureRow}
              style={{
                background: "none",
                border: "none",
                color: "#0f766e",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 0",
              }}
            >
              <Plus size={14} /> Add More Procedures
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: LABS TABLE */}
        {/* =================================================================== */}
        <div style={{ marginBottom: "20px" }}>
          {/* Section Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Labs
            </div>
            <div>
              <a
                href="#choose-master-labs"
                onClick={(e) => {
                  e.preventDefault();
                  setCptSearchModal({ open: true, section: "labs" });
                }}
                style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
              >
                Choose from Master List
              </a>
            </div>
          </div>

          {/* Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ width: "28px", padding: "8px 4px", textAlign: "center" }}></th>
                <th style={{ width: "32px", padding: "8px 4px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>DESCRIPTION</th>
                <th style={{ width: "70px", padding: "8px 8px", textAlign: "center" }}>QTY</th>
                <th style={{ width: "110px", padding: "8px 8px", textAlign: "right" }}>CHARGE</th>
                <th style={{ width: "160px", padding: "8px 8px", textAlign: "center" }}>DISCOUNT</th>
                <th style={{ width: "110px", padding: "8px 12px", textAlign: "right" }}>AMT</th>
                <th style={{ width: "36px", padding: "8px 4px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l, idx) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ textAlign: "center", color: "#94a3b8", cursor: "grab" }}>
                    <GripVertical size={14} style={{ display: "inline-block" }} />
                  </td>
                  <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                  <td style={{ padding: "6px 8px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search by Procedure Code or Name"
                      value={l.description}
                      onChange={(e) => handleSearchCodeOrDesc("labs", idx, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />

                    {/* Autocomplete Popup */}
                    {activeSearchSection === "labs" && activeSearchRowIndex === idx && searchResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "8px",
                          right: "8px",
                          top: "38px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {searchResults.map((res: any, rIdx: number) => (
                          <div
                            key={rIdx}
                            onClick={() => selectSearchResult(res)}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span>
                              <strong>[{res.code}]</strong> {res.name} (SAC: 999312)
                            </span>
                            <span style={{ color: "#0f766e", fontWeight: 600 }}>
                              Rs. {rupees(res.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => updateLine("labs", idx, "quantity", e.target.value)}
                      style={{
                        width: "55px",
                        padding: "6px 4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) => updateLine("labs", idx, "unit_price", e.target.value)}
                      style={{
                        width: "95px",
                        padding: "6px 6px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                      <div style={{ position: "relative", width: "65px" }}>
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={l.discount_percent || ""}
                          onChange={(e) => updateLine("labs", idx, "discount_percent", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 14px 6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "4px",
                            top: "7px",
                            fontSize: "10px",
                            color: "#94a3b8",
                          }}
                        >
                          %
                        </span>
                      </div>
                      <div style={{ position: "relative", width: "75px" }}>
                        <input
                          type="number"
                          placeholder="Amt"
                          min="0"
                          value={l.discount_amount || ""}
                          onChange={(e) => updateLine("labs", idx, "discount_amount", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                    {rupees(l.total_amount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeLabRow(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={addLabRow}
              style={{
                background: "none",
                border: "none",
                color: "#0f766e",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 0",
              }}
            >
              <Plus size={14} /> Add More Labs
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: MEDICATIONS / DRUGS (PRODUCTS) TABLE */}
        {/* =================================================================== */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Medications / Drugs (Products)
            </div>
            <div>
              <a
                href="#choose-master-products"
                onClick={(e) => {
                  e.preventDefault();
                  setCptSearchModal({ open: true, section: "products" });
                }}
                style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
              >
                Choose from Master List
              </a>
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ width: "28px", padding: "8px 4px", textAlign: "center" }}></th>
                <th style={{ width: "32px", padding: "8px 4px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>PRODUCT NAME / SKU</th>
                <th style={{ width: "70px", padding: "8px 8px", textAlign: "center" }}>QTY</th>
                <th style={{ width: "110px", padding: "8px 8px", textAlign: "right" }}>PRICE</th>
                <th style={{ width: "160px", padding: "8px 8px", textAlign: "center" }}>DISCOUNT</th>
                <th style={{ width: "110px", padding: "8px 12px", textAlign: "right" }}>AMT</th>
                <th style={{ width: "36px", padding: "8px 4px", textAlign: "center" }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map((m, idx) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ textAlign: "center", color: "#94a3b8", cursor: "grab" }}>
                    <GripVertical size={14} style={{ display: "inline-block" }} />
                  </td>
                  <td style={{ textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                  <td style={{ padding: "6px 8px", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search by Product Name or SKU"
                      value={m.description}
                      onChange={(e) => handleSearchCodeOrDesc("products", idx, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />

                    {activeSearchSection === "products" && activeSearchRowIndex === idx && searchResults.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "8px",
                          right: "8px",
                          top: "38px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 50,
                          maxHeight: "220px",
                          overflowY: "auto",
                        }}
                      >
                        {searchResults.map((res: any, rIdx: number) => (
                          <div
                            key={rIdx}
                            onClick={() => selectSearchResult(res)}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span>
                              <strong>{res.name}</strong> ({res.sku || "MED"})
                            </span>
                            <span style={{ color: "#0f766e", fontWeight: 600 }}>
                              Rs. {rupees(res.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <input
                      type="number"
                      min="1"
                      value={m.quantity}
                      onChange={(e) => updateLine("products", idx, "quantity", e.target.value)}
                      style={{
                        width: "55px",
                        padding: "6px 4px",
                        textAlign: "center",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={m.unit_price}
                      onChange={(e) => updateLine("products", idx, "unit_price", e.target.value)}
                      style={{
                        width: "95px",
                        padding: "6px 6px",
                        textAlign: "right",
                        fontSize: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
                      <div style={{ position: "relative", width: "65px" }}>
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={m.discount_percent || ""}
                          onChange={(e) => updateLine("products", idx, "discount_percent", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 14px 6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "4px",
                            top: "7px",
                            fontSize: "10px",
                            color: "#94a3b8",
                          }}
                        >
                          %
                        </span>
                      </div>
                      <div style={{ position: "relative", width: "75px" }}>
                        <input
                          type="number"
                          placeholder="Amt"
                          min="0"
                          value={m.discount_amount || ""}
                          onChange={(e) => updateLine("products", idx, "discount_amount", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 4px",
                            textAlign: "right",
                            fontSize: "12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                    {rupees(m.total_amount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeProductRow(idx)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "8px" }}>
            <button
              type="button"
              onClick={addProductRow}
              style={{
                background: "none",
                border: "none",
                color: "#0f766e",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 0",
              }}
            >
              <Plus size={14} /> Add More Products
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TOTALS SUMMARY (RIGHT-ALIGNED) */}
        {/* =================================================================== */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
          <div style={{ width: "320px", fontSize: "13px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                color: "#64748b",
              }}
            >
              <span>Sub Total</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{rupees(grossSubTotal)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                color: "#64748b",
              }}
            >
              <span>Discount (-)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={generalDiscount || ""}
                onChange={(e) => setGeneralDiscount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "110px",
                  padding: "4px 8px",
                  textAlign: "right",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                color: "#64748b",
              }}
            >
              <span>Total</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{rupees(netTotal)}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                color: "#64748b",
              }}
            >
              <span>Round Off</span>
              <span style={{ color: "#64748b" }}>{rupees(roundOff)}</span>
            </div>

            {/* BOXED GRAND TOTAL (TEAL BORDER) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                marginTop: "6px",
                border: "2px solid #0f766e",
                borderRadius: "4px",
                background: "#f0fdfa",
              }}
            >
              <span style={{ fontWeight: 700, color: "#0f766e", fontSize: "14px" }}>
                Grand Total
              </span>
              <span style={{ fontWeight: 700, color: "#0f766e", fontSize: "16px" }}>
                {rupees(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* PAYMENT DETAILS CARD */}
        {/* =================================================================== */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            background: "#f8fafc",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Payment Details
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "#334155",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={payInFull}
                onChange={(e) => setPayInFull(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0f766e" }}
              />
              Pay Invoice in Full ({rupees(grandTotal)})
            </label>
          </div>

          {/* Payment Collection Rows */}
          {paymentRows.map((pr, idx) => (
            <div
              key={pr.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* Payment Date */}
              <div style={{ width: "150px" }}>
                <input
                  type="date"
                  value={pr.date}
                  onChange={(e) => updatePaymentRow(idx, "date", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Reference # */}
              <div style={{ width: "180px" }}>
                <input
                  type="text"
                  placeholder="Reference #"
                  value={pr.reference}
                  onChange={(e) => updatePaymentRow(idx, "reference", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Payment Mode */}
              <div style={{ width: "140px" }}>
                <select
                  value={pr.mode}
                  onChange={(e) => updatePaymentRow(idx, "mode", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              {/* Payment Amount */}
              <div style={{ width: "140px" }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Payment Amt"
                  value={pr.amount || ""}
                  onChange={(e) =>
                    updatePaymentRow(idx, "amount", parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                    textAlign: "right",
                  }}
                />
              </div>

              {/* Add Split Payment Row */}
              <button
                type="button"
                onClick={addPaymentRow}
                style={{
                  border: "none",
                  background: "none",
                  color: "#0f766e",
                  cursor: "pointer",
                  padding: "4px",
                }}
                title="Add Split Tender Payment"
              >
                <Plus size={18} />
              </button>

              {/* Delete Payment Row */}
              {paymentRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePaymentRow(idx)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                  title="Remove payment row"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* BOTTOM NOTES & TERMS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
              Internal Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal billing notes or instructions for patient..."
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                background: "#f8fafc",
              }}
            />
          </div>
        </div>

        {/* CPT / MASTER LIST MODAL */}
        {cptSearchModal.open && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "8px",
                width: "600px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>
                  {cptSearchModal.section === "procedures"
                    ? "Choose Procedure from Templates"
                    : cptSearchModal.section === "labs"
                    ? "Choose Lab Test from Master List (SAC: 999312)"
                    : "Choose Medication from Products"}
                </div>
                <button
                  type="button"
                  onClick={() => setCptSearchModal({ open: false, section: "procedures" })}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9" }}>
                <input
                  type="text"
                  placeholder="Search code or description..."
                  autoFocus
                  onChange={async (e) => {
                    const q = e.target.value;
                    if (q.length >= 1) {
                      const res = await api<any[]>(
                        `/billing/procedure-codes/search?q=${encodeURIComponent(q)}`
                      );
                      setSearchResults(res || []);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px" }}>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cptSearchModal.section === "procedures") {
                        setProcedures([
                          ...procedures.filter((p) => p.description.trim()),
                          {
                            id: `p-${Date.now()}-${idx}`,
                            code: item.code,
                            description: `[${item.code}] ${item.name}`,
                            quantity: 1,
                            unit_price: item.price || 500,
                            discount_percent: 0,
                            discount_amount: 0,
                            total_amount: item.price || 500,
                          },
                        ]);
                      } else if (cptSearchModal.section === "labs") {
                        setLabs([
                          ...labs.filter((l) => l.description.trim()),
                          {
                            id: `l-${Date.now()}-${idx}`,
                            code: item.code,
                            description: `${item.name} (SAC: 999312)`,
                            sac: "999312",
                            quantity: 1,
                            unit_price: item.price || 300,
                            discount_percent: 0,
                            discount_amount: 0,
                            total_amount: item.price || 300,
                          },
                        ]);
                      }
                      setCptSearchModal({ open: false, section: "procedures" });
                      setSearchResults([]);
                    }}
                    style={{
                      padding: "10px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: "#0f766e" }}>[{item.code}]</span>{" "}
                      <span style={{ color: "#334155" }}>{item.name}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>
                      Rs. {rupees(item.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER VIEW: INVOICE SUMMARY VIEW (frame_050.png)
  // -------------------------------------------------------------
  if (viewMode === "detail" && selectedInvoice) {
    const isCancelled = selectedInvoice.status === "cancelled";
    const patientObj = formPatientData || patient || {};
    const patientName =
      selectedInvoice.patient_name ||
      patientObj.name ||
      `${patientObj.first_name || ""} ${patientObj.last_name || ""}`.trim() ||
      "Patient";
    const patientMRN =
      selectedInvoice.patient_mrn || patientObj.mrn || patientObj.id || "HUHNKR4133";
    const patientAgeSex = `${patientObj.age ? `${patientObj.age} years` : "58 years"} / ${
      patientObj.gender || "male"
    }`;
    const patientAddress =
      patientObj.address ||
      patientObj.city ||
      "45, Anna Salai, Royapettah, Chennai, TN 600014";

    return (
      <div
        className="charm-invoice-summary-view"
        style={{
          padding: "8px 16px 80px 16px",
          background: "#ffffff",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          color: "#334155",
          position: "relative",
        }}
      >
        {/* SUBTABS ROW PERSISTENT AT TOP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                setActiveSubtab("invoices");
              }}
              style={{
                padding: "10px 4px",
                fontSize: "13.5px",
                fontWeight: activeSubtab === "invoices" ? 700 : 500,
                color: activeSubtab === "invoices" ? "#0f766e" : "#475569",
                borderBottom:
                  activeSubtab === "invoices" ? "3px solid #0f766e" : "3px solid transparent",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Invoices
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                setActiveSubtab("receipts");
              }}
              style={{
                padding: "10px 4px",
                fontSize: "13.5px",
                fontWeight: activeSubtab === "receipts" ? 700 : 500,
                color: activeSubtab === "receipts" ? "#0f766e" : "#475569",
                borderBottom:
                  activeSubtab === "receipts" ? "3px solid #0f766e" : "3px solid transparent",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Receipts
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                setActiveSubtab("balance_due");
              }}
              style={{
                padding: "10px 4px",
                fontSize: "13.5px",
                fontWeight: activeSubtab === "balance_due" ? 700 : 500,
                color: activeSubtab === "balance_due" ? "#0f766e" : "#475569",
                borderBottom:
                  activeSubtab === "balance_due" ? "3px solid #0f766e" : "3px solid transparent",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Balance Due
              <span
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  borderRadius: "50%",
                  width: "16px",
                  height: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                $
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("list");
                setActiveSubtab("family_balance_due");
              }}
              style={{
                padding: "10px 4px",
                fontSize: "13.5px",
                fontWeight: activeSubtab === "family_balance_due" ? 700 : 500,
                color: activeSubtab === "family_balance_due" ? "#0f766e" : "#475569",
                borderBottom:
                  activeSubtab === "family_balance_due"
                    ? "3px solid #0f766e"
                    : "3px solid transparent",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Family Balance Due
            </button>
          </div>

          {/* Right: + Invoice Split Button */}
          <div style={{ position: "relative" }} ref={splitBtnRef}>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <button
                type="button"
                onClick={() => startCreateInvoice("Invoice")}
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus size={16} /> Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceSplitMenu(!showInvoiceSplitMenu)}
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderLeft: "1px solid rgba(255,255,255,0.4)",
                  padding: "8px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {showInvoiceSplitMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "38px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 100,
                  width: "180px",
                }}
              >
                <div
                  onClick={() => {
                    setShowInvoiceSplitMenu(false);
                    startCreateInvoice("Invoice");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Invoice
                </div>
                <div
                  onClick={() => {
                    setShowInvoiceSplitMenu(false);
                    startCreateInvoice("Pre-Payment Invoice");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Pre-Payment Invoice
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TITLE ROW: ← Invoice Summary & Consultation Summary button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: "4px",
              }}
              title="Back to Invoices"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>
              Invoice Summary
            </h2>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setConsultationSummaryModal(selectedInvoice)}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Consultation Summary
            </button>
          </div>
        </div>

        {/* SECONDARY ACTION TOOLBAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => startEditInvoice(selectedInvoice)}
            disabled={isCancelled}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: isCancelled ? "#94a3b8" : "#334155",
              cursor: isCancelled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              position: "relative",
            }}
          >
            Edit Invoice
            <span
              style={{
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: 700,
                padding: "1px 4px",
                borderRadius: "3px",
                marginLeft: "4px",
              }}
            >
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => notify(`Invoice sent to ${patientObj.email || "patient"}`)}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Send Invoice
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Print | ▾
          </button>

          <button
            type="button"
            onClick={() => notify("Downloading PDF...")}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Download ▾
          </button>

          {!isCancelled && (selectedInvoice.balance_paise || 0) > 0 && (
            <button
              type="button"
              onClick={() => openAddPaymentScreen(selectedInvoice)}
              style={{
                background: "#0f766e",
                border: "none",
                borderRadius: "4px",
                padding: "5px 14px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Add Payment
            </button>
          )}

          <button
            type="button"
            onClick={() => notify("Adjust Payments opened")}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Adjust Payments
          </button>

          {!isCancelled && (
            <button
              type="button"
              onClick={() => setCancelModalInvoice(selectedInvoice)}
              style={{
                background: "#ffffff",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#dc2626",
                cursor: "pointer",
              }}
            >
              Cancel Invoice
            </button>
          )}
        </div>

        {/* DIAGONAL WATERMARK STAMP IF CANCELLED */}
        {isCancelled && (
          <div
            style={{
              position: "absolute",
              top: "220px",
              left: "40%",
              transform: "translate(-50%, -50%) rotate(-25deg)",
              border: "5px solid rgba(220, 38, 38, 0.5)",
              color: "rgba(220, 38, 38, 0.5)",
              fontSize: "48px",
              fontWeight: 900,
              padding: "10px 40px",
              borderRadius: "8px",
              pointerEvents: "none",
              letterSpacing: "8px",
              textTransform: "uppercase",
              zIndex: 10,
            }}
          >
            CANCELLED
          </div>
        )}

        {/* TWO METADATA CARDS: Patient Details & Invoice Details */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
            background: "#ffffff",
            padding: "16px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Patient Details */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "10px" }}>
              Patient Details
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", rowGap: "8px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Patient Name:</span>
              <span>
                <a href="#pat" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  {patientName}
                </a>
              </span>

              <span style={{ color: "#64748b" }}>Record ID:</span>
              <span style={{ color: "#1e293b", fontWeight: 600 }}>{patientMRN}</span>

              <span style={{ color: "#64748b" }}>Age/Sex:</span>
              <span style={{ color: "#1e293b" }}>{patientAgeSex}</span>

              <span style={{ color: "#64748b" }}>Address:</span>
              <span style={{ color: "#1e293b" }}>{patientAddress}</span>
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "10px" }}>
              Invoice Details
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: "8px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Invoice #:</span>
              <span style={{ color: "#1e293b", fontWeight: 700 }}>{selectedInvoice.number}</span>

              <span style={{ color: "#64748b" }}>Invoice Date:</span>
              <span style={{ color: "#1e293b" }}>
                {selectedInvoice.date
                  ? new Date(selectedInvoice.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Nov 17, 2026"}
              </span>

              <span style={{ color: "#64748b" }}>Consultation Date:</span>
              <span style={{ color: "#1e293b" }}>
                {selectedInvoice.consultation_date
                  ? new Date(selectedInvoice.consultation_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "---"}
              </span>

              <span style={{ color: "#64748b" }}>Doctor:</span>
              <span style={{ color: "#1e293b" }}>
                {selectedInvoice.consultant_name || "Dr. Ramasamy S"}
              </span>

              <span style={{ color: "#64748b" }}>Referred By:</span>
              <span style={{ color: "#64748b" }}>---</span>

              <span style={{ color: "#64748b" }}>Fee Schedule:</span>
              <span style={{ color: "#1e293b" }}>Master Fee Schedule</span>

              <span style={{ color: "#64748b" }}>Package(s):</span>
              <span style={{ color: "#64748b" }}>---</span>
            </div>
          </div>
        </div>

        {/* ITEMIZED LINE ITEMS TABLE */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
            Itemized Services & Labs
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                <th style={{ width: "32px", padding: "8px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Description</th>
                <th style={{ width: "100px", padding: "8px", textAlign: "center" }}>Code</th>
                <th style={{ width: "70px", padding: "8px", textAlign: "center" }}>Qty</th>
                <th style={{ width: "100px", padding: "8px", textAlign: "right" }}>Charge</th>
                <th style={{ width: "100px", padding: "8px", textAlign: "right" }}>Discount</th>
                <th style={{ width: "110px", padding: "8px 12px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(selectedInvoice.lines || []).map((line: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ textAlign: "center", color: "#64748b", padding: "8px" }}>{idx + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b" }}>
                    {line.description}
                  </td>
                  <td style={{ textAlign: "center", color: "#64748b", padding: "8px" }}>
                    {line.code || "---"}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px" }}>{line.quantity}</td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {rupees((line.unit_price_paise || 0) / 100)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px", color: "#64748b" }}>
                    {(line.discount_paise || 0) > 0 ? rupees((line.discount_paise || 0) / 100) : "---"}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>
                    {rupees((line.total_paise || 0) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS SUMMARY */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
          <div style={{ width: "320px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#64748b" }}>
              <span>Sub Total</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {money(selectedInvoice.total_paise)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#64748b" }}>
              <span>Paid</span>
              <span style={{ fontWeight: 600, color: "#16a34a" }}>
                {money(selectedInvoice.paid_paise || 0)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                marginTop: "6px",
                border: "2px solid #0f766e",
                borderRadius: "4px",
                background: "#f0fdfa",
              }}
            >
              <span style={{ fontWeight: 700, color: "#0f766e", fontSize: "14px" }}>
                Balance Due
              </span>
              <span style={{ fontWeight: 700, color: "#0f766e", fontSize: "16px" }}>
                {money(selectedInvoice.balance_paise || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* RECEIPTS / PAYMENTS RECORDED TABLE */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
            Receipts & Payments Collected
          </div>

          {(selectedInvoice.payments || []).length === 0 ? (
            <div
              style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "4px",
                border: "1px dashed #cbd5e1",
                fontSize: "13px",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              No payments recorded yet for this invoice.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Receipt #</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Payment Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Method</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedInvoice.payments || []).map((pay: any, pIdx: number) => (
                  <tr key={pIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#2563eb" }}>
                      REC-{String(pIdx + 1).padStart(5, "0")}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {pay.created_at
                        ? new Date(pay.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Today"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>{pay.method || "UPI"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
                      {money(pay.amount_paise)}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#16a34a",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER VIEW: CHARMHEALTH ADD PAYMENT (SCENARIO A & SCENARIO B)
  // -------------------------------------------------------------
  if (viewMode === "payment") {
    const targetPatId = isPracticeView
      ? paymentPatientId
      : patientId || paymentPatientId;
    const currentPatient =
      patient ||
      patients?.find((p: any) => p.id === targetPatId) ||
      (patients && patients.length > 0 ? patients[0] : null);

    const patientName = currentPatient
      ? currentPatient.name ||
        `${currentPatient.first_name || ""} ${currentPatient.last_name || ""}`.trim()
      : "—";
    const recordId =
      currentPatient?.mrn ||
      currentPatient?.record_id ||
      currentPatient?.id?.slice(0, 8) ||
      "—";

    // Outstanding invoices for this patient
    const patientInvoices = invoices.filter(
      (inv) => inv.patient_id === targetPatId && inv.status !== "cancelled"
    );
    const dueInvoices = patientInvoices.filter(
      (inv) => (inv.balance_paise || 0) > 0
    );
    const hasOutstandingBalance = dueInvoices.length > 0;
    const displayedInvoices = showOnlyDueInvoices ? dueInvoices : patientInvoices;

    // Dynamically calculate totals
    const totalPaymentApplied = Object.values(paymentAllocations).reduce(
      (sum, a) => sum + (Number(a.applied) || 0),
      0
    );
    const unusedPayment = Math.max(0, (paymentAmount || 0) - totalPaymentApplied);

    return (
      <div
        className="charm-patient-payment-screen"
        style={{
          padding: "16px 24px 80px 24px",
          background: "#ffffff",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          color: "#334155",
          minHeight: "100vh",
        }}
      >
        {/* Top Header Bar with Title on left, [ Add ] and [ Cancel ] on right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              Payment
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleSavePayment}
              disabled={paymentSubmitting}
              style={{
                background: "#f2711c",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "6px 22px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: paymentSubmitting ? "not-allowed" : "pointer",
                opacity: paymentSubmitting ? 0.7 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              {paymentSubmitting ? "Saving..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              disabled={paymentSubmitting}
              style={{
                background: "#ffffff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Top Card: Payment Details (Exact CharmHealth Design) */}
        <div
          style={{
            border: "1px solid #cce2f0",
            borderRadius: "6px",
            padding: "20px 24px",
            background: "#ffffff",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "36px",
            }}
          >
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Patient Name */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Patient Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                {isPracticeView ? (
                  <select
                    value={paymentPatientId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setPaymentPatientId(newId);
                      setPaymentAllocations({});
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      background: "#ffffff",
                      width: "100%",
                      maxWidth: "280px",
                    }}
                  >
                    {patients?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()} ({p.mrn || p.record_id || p.id.slice(0, 6)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                    {patientName}
                  </span>
                )}
              </div>

              {/* Record ID */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Record ID
                </label>
                <div>
                  <span
                    style={{
                      background: "#e2e8f0",
                      padding: "4px 10px",
                      borderRadius: "3px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      color: "#334155",
                      letterSpacing: "0.5px",
                      display: "inline-block",
                    }}
                  >
                    {recordId}
                  </span>
                </div>
              </div>

              {/* Payment Amount */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Payment Amount <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount === 0 ? "" : paymentAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPaymentAmount(val);
                    }}
                    placeholder="0.00"
                    style={{
                      width: "160px",
                      height: "32px",
                      padding: "4px 10px",
                      fontSize: "13px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontWeight: 600,
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Payment Date <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{
                      width: "160px",
                      height: "32px",
                      padding: "4px 10px",
                      fontSize: "12.5px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Payment Method <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{
                      width: "160px",
                      height: "32px",
                      padding: "4px 8px",
                      fontSize: "12.5px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="">--Select--</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque / DD">Cheque / DD</option>
                    <option value="Insurance / TPA">Insurance / TPA</option>
                    <option value="NEFT / RTGS">NEFT / RTGS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Reference # */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Cheque No"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "260px",
                    height: "32px",
                    padding: "4px 10px",
                    fontSize: "12.5px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              {/* Other Reference # */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b" }}>
                  Other Reference #
                </label>
                <input
                  type="text"
                  value={paymentOtherRef}
                  onChange={(e) => setPaymentOtherRef(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "260px",
                    height: "32px",
                    padding: "4px 10px",
                    fontSize: "12.5px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "start" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", marginTop: "4px" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="Payment remarks or patient notes..."
                  style={{
                    width: "100%",
                    maxWidth: "260px",
                    padding: "6px 10px",
                    fontSize: "12.5px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CONDITIONAL INVOICES ALLOCATION SECTION (SCENARIO B ONLY)     */}
        {/* ------------------------------------------------------------- */}
        {hasOutstandingBalance && (
          <div>
            {/* Centered Title */}
            <div
              style={{
                textAlign: "center",
                fontSize: "17px",
                fontWeight: 700,
                color: "#1e293b",
                margin: "24px 0 14px 0",
              }}
            >
              Invoices
            </div>

            {/* Checkbox: Show Invoices with Due and Patient Responsibility */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
              }}
            >
              <input
                type="checkbox"
                id="showInvoicesDueToggle"
                checked={showOnlyDueInvoices}
                onChange={(e) => setShowOnlyDueInvoices(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#006699" }}
              />
              <label
                htmlFor="showInvoicesDueToggle"
                style={{ fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer" }}
              >
                Show Invoices with Due and Patient Responsibility
              </label>
            </div>

            {/* List of Invoices Cards */}
            {displayedInvoices.map((inv) => {
              const invTotal = ((inv.total_paise || 0) / 100).toFixed(2);
              const invPaid = (((inv.paid_paise || 0) + (inv.credited_paise || 0)) / 100).toFixed(2);
              const invDueNum = (inv.balance_paise || 0) / 100;
              const invDue = invDueNum.toFixed(2);

              const currentAlloc = paymentAllocations[inv.id] || {
                applied: 0,
                writeOff: 0,
                writeOffReason: "",
                comments: "",
              };

              return (
                <div
                  key={inv.id}
                  style={{
                    border: "1px solid #cce2f0",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginBottom: "16px",
                    background: "#ffffff",
                  }}
                >
                  {/* Top Bar: #eaf3fa light blue */}
                  <div
                    style={{
                      background: "#eaf3fa",
                      padding: "12px 18px",
                      borderBottom: "1px solid #d0e4f5",
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1.2fr 1.4fr 1.6fr",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    {/* Invoice # & Facility */}
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                        {inv.number}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {inv.facility_name || user?.facility_name || "Heal Your Heart"}
                      </div>
                    </div>

                    {/* Amount & Due */}
                    <div>
                      <div style={{ fontSize: "13px", color: "#334155" }}>
                        Amount <span style={{ fontWeight: 600 }}>{invTotal}</span>
                      </div>
                      <div style={{ fontSize: "13.5px", color: "#0f172a", marginTop: "2px" }}>
                        Due <span style={{ fontWeight: 700, color: "#dc2626" }}>{invDue}</span>
                      </div>
                    </div>

                    {/* Invoice Date & Encounter Date */}
                    <div>
                      <div style={{ fontSize: "12.5px", color: "#334155" }}>
                        Invoice Date <span style={{ fontWeight: 600 }}>{inv.invoice_date || inv.date || "—"}</span>
                      </div>
                      <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                        Encounter Date <span style={{ fontWeight: 500 }}>{inv.encounter_date || inv.invoice_date || "—"}</span>
                      </div>
                    </div>

                    {/* Payment Applied Input */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                          Payment Applied
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={invDueNum}
                          value={currentAlloc.applied === 0 ? "" : currentAlloc.applied}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPaymentAllocations((prev) => ({
                              ...prev,
                              [inv.id]: {
                                ...currentAlloc,
                                applied: val,
                              },
                            }));
                          }}
                          placeholder="0.00"
                          style={{
                            width: "110px",
                            height: "32px",
                            padding: "4px 8px",
                            fontSize: "13px",
                            fontWeight: 700,
                            textAlign: "right",
                            border: "1px solid #94a3b8",
                            borderRadius: "4px",
                            background: "#ffffff",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                        <span>({invPaid})</span>
                        {invDueNum > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentAllocations((prev) => ({
                                ...prev,
                                [inv.id]: {
                                  ...currentAlloc,
                                  applied: invDueNum,
                                },
                              }));
                              if (paymentAmount < invDueNum) {
                                setPaymentAmount(invDueNum);
                              }
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#0284c7",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textDecoration: "underline",
                              marginLeft: "8px",
                            }}
                          >
                            Pay Due
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Row: Write-off & Comments */}
                  <div
                    style={{
                      padding: "12px 18px",
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.6fr",
                      gap: "24px",
                      alignItems: "center",
                      background: "#ffffff",
                    }}
                  >
                    {/* Left: Write-off Amount & Reason */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#334155" }}>
                        Write-off
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={currentAlloc.writeOff === 0 ? "" : currentAlloc.writeOff}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setPaymentAllocations((prev) => ({
                            ...prev,
                            [inv.id]: {
                              ...currentAlloc,
                              writeOff: val,
                            },
                          }));
                        }}
                        placeholder="0.00"
                        style={{
                          width: "90px",
                          height: "30px",
                          padding: "4px 8px",
                          fontSize: "12.5px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          textAlign: "right",
                        }}
                      />
                      <select
                        value={currentAlloc.writeOffReason || ""}
                        onChange={(e) => {
                          setPaymentAllocations((prev) => ({
                            ...prev,
                            [inv.id]: {
                              ...currentAlloc,
                              writeOffReason: e.target.value,
                            },
                          }));
                        }}
                        style={{
                          height: "30px",
                          padding: "2px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          background: "#ffffff",
                          minWidth: "140px",
                        }}
                      >
                        <option value="">--Select--</option>
                        <option value="Bad Debt">Bad Debt</option>
                        <option value="Dispute Settlement">Dispute Settlement</option>
                        <option value="Charity / Hardship">Charity / Hardship</option>
                        <option value="Rounding Adjustment">Rounding Adjustment</option>
                        <option value="Professional Courtesy">Professional Courtesy</option>
                        <option value="Insurance Write-off">Insurance Write-off</option>
                      </select>
                    </div>

                    {/* Right: Comments */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label style={{ fontSize: "12.5px", fontWeight: 500, color: "#334155", whiteSpace: "nowrap" }}>
                        Comments
                      </label>
                      <input
                        type="text"
                        value={currentAlloc.comments || ""}
                        onChange={(e) => {
                          setPaymentAllocations((prev) => ({
                            ...prev,
                            [inv.id]: {
                              ...currentAlloc,
                              comments: e.target.value,
                            },
                          }));
                        }}
                        placeholder="Allocation notes / write-off remarks..."
                        style={{
                          width: "100%",
                          height: "30px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Summary Section (Total Payment Applied & Unused Payment) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                marginTop: "20px",
                paddingRight: "12px",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#006699" }}>
                  Total Payment Applied
                </span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#006699", minWidth: "110px", textAlign: "right" }}>
                  {totalPaymentApplied.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", gap: "32px", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  Unused Payment
                </span>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", minWidth: "110px", textAlign: "right" }}>
                  {unusedPayment.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER VIEW: LIST SUBTABS (INVOICES / RECEIPTS / BALANCE DUE)
  // -------------------------------------------------------------
  return (
    <div
      className="charm-patient-billing-wrapper"
      style={{
        padding: "8px 16px 80px 16px",
        background: "#ffffff",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        color: "#334155",
      }}
    >
      {/* =================================================================== */}
      {/* 1. TOP SUBTABS BAR WITH TEAL UNDERLINE & ORANGE + INVOICE SPLIT BTN */}
      {/* =================================================================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          {/* Subtab 1: Invoices */}
          <button
            type="button"
            onClick={() => setActiveSubtab("invoices")}
            style={{
              padding: "10px 4px",
              fontSize: "13.5px",
              fontWeight: activeSubtab === "invoices" ? 700 : 500,
              color: activeSubtab === "invoices" ? "#0f766e" : "#475569",
              borderBottom:
                activeSubtab === "invoices" ? "3px solid #0f766e" : "3px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Invoices
          </button>

          {/* Subtab 2: Receipts */}
          <button
            type="button"
            onClick={() => setActiveSubtab("receipts")}
            style={{
              padding: "10px 4px",
              fontSize: "13.5px",
              fontWeight: activeSubtab === "receipts" ? 700 : 500,
              color: activeSubtab === "receipts" ? "#0f766e" : "#475569",
              borderBottom:
                activeSubtab === "receipts" ? "3px solid #0f766e" : "3px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Receipts
          </button>

          {/* Subtab 3: Balance Due with Red $ Badge */}
          <button
            type="button"
            onClick={() => setActiveSubtab("balance_due")}
            style={{
              padding: "10px 4px",
              fontSize: "13.5px",
              fontWeight: activeSubtab === "balance_due" ? 700 : 500,
              color: activeSubtab === "balance_due" ? "#0f766e" : "#475569",
              borderBottom:
                activeSubtab === "balance_due" ? "3px solid #0f766e" : "3px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Balance Due
            <span
              style={{
                background: "#ef4444",
                color: "#ffffff",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 700,
              }}
            >
              $
            </span>
          </button>

          {/* Subtab 4: Family Balance Due */}
          <button
            type="button"
            onClick={() => setActiveSubtab("family_balance_due")}
            style={{
              padding: "10px 4px",
              fontSize: "13.5px",
              fontWeight: activeSubtab === "family_balance_due" ? 700 : 500,
              color: activeSubtab === "family_balance_due" ? "#0f766e" : "#475569",
              borderBottom:
                activeSubtab === "family_balance_due"
                  ? "3px solid #0f766e"
                  : "3px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Family Balance Due
          </button>
        </div>

        {/* Right Button: + Invoice Split Button OR + Payment Button */}
        {activeSubtab === "receipts" ? (
          <button
            type="button"
            onClick={() => openAddPaymentScreen()}
            style={{
              background: "#f97316",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Plus size={16} /> Payment
          </button>
        ) : (
          <div style={{ position: "relative" }} ref={splitBtnRef}>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              <button
                type="button"
                onClick={() => startCreateInvoice("Invoice")}
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus size={16} /> Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceSplitMenu(!showInvoiceSplitMenu)}
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderLeft: "1px solid rgba(255,255,255,0.4)",
                  padding: "8px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {showInvoiceSplitMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "38px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 100,
                  width: "180px",
                }}
              >
                <div
                  onClick={() => {
                    setShowInvoiceSplitMenu(false);
                    startCreateInvoice("Invoice");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Invoice
                </div>
                <div
                  onClick={() => {
                    setShowInvoiceSplitMenu(false);
                    startCreateInvoice("Pre-Payment Invoice");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Pre-Payment Invoice
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SUBTAB 1: INVOICES TAB */}
      {/* =================================================================== */}
      {activeSubtab === "invoices" && (
        <div>
          {/* CHARMHEALTH 3-BOX FILTER BAR */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Box 1: Date Range */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Date Range
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                style={{
                  width: "160px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: "#ffffff",
                  color: "#334155",
                }}
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Last Week">Last Week</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 90 Days">Last 90 Days</option>
              </select>
            </div>

            {/* Box 2: Search Options 1 (Invoice Number) */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Search Options 1
              </label>
              <div style={{ position: "relative", width: "190px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "9px",
                    color: "#94a3b8",
                  }}
                />
                <input
                  type="text"
                  placeholder="Invoice Number"
                  value={searchInvoiceNo}
                  onChange={(e) => setSearchInvoiceNo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 28px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>
            </div>

            {/* Box 3: Search Options 2 (-- Select --) */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Search Options 2
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <select
                  value={searchOption2Type}
                  onChange={(e) => {
                    setSearchOption2Type(e.target.value);
                    setSearchOption2Value("");
                  }}
                  style={{
                    width: "150px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                    color: searchOption2Type ? "#334155" : "#94a3b8",
                  }}
                >
                  <option value="">-- Select --</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Facility">Facility</option>
                  <option value="Procedure Code">Procedure Code</option>
                  {isPracticeView && <option value="Patient Name">Patient Name</option>}
                </select>

                {searchOption2Type && (
                  <input
                    type="text"
                    placeholder={`Filter by ${searchOption2Type}...`}
                    value={searchOption2Value}
                    onChange={(e) => setSearchOption2Value(e.target.value)}
                    style={{
                      width: "150px",
                      padding: "6px 8px",
                      fontSize: "12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Far Right: Folder/Reports icon button */}
            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                title="Reports"
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  color: "#eab308",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>

          {/* SECONDARY ACTION TOOLBAR UNDER FILTERS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              paddingBottom: "8px",
            }}
          >
            {/* Left toolbar buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Actions ▾
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Print ▾
              </button>

              <button
                type="button"
                onClick={() => notify("Sending selected invoices to patients...")}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Send Invoices
              </button>
            </div>

            {/* Right eye link: Show CPT Details */}
            <div>
              <a
                href="#toggle-cpt"
                onClick={(e) => {
                  e.preventDefault();
                  setShowCptDetails(!showCptDetails);
                }}
                style={{
                  fontSize: "12px",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Eye size={14} />
                {showCptDetails ? "Hide CPT Details" : "Show CPT Details"}
              </a>
            </div>
          </div>

          {/* INVOICES TABLE */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
                border: "1px dashed #cbd5e1",
                borderRadius: "6px",
                background: "#f8fafc",
              }}
            >
              No invoices found matching criteria.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ width: "28px", padding: "8px 6px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        filteredInvoices.forEach((inv) => (next[inv.id] = checked));
                        setSelectedInvoiceIds(next);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  {isPracticeView && (
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>PATIENT</th>
                  )}
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Consultation Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Facility Name</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice #</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Consultant</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Payment</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Due</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
                  <th style={{ width: "36px", padding: "8px 4px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const isCanceled = inv.status === "cancelled";
                  const isDraft = inv.status === "draft";
                  const isPaid = (inv.balance_paise || 0) === 0 && (inv.paid_paise || 0) > 0;
                  const hasDue = !isCanceled && (inv.balance_paise || 0) > 0;

                  const consultDateStr = inv.consultation_date
                    ? new Date(inv.consultation_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "---";

                  const invDateStr = inv.date
                    ? new Date(inv.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "---";

                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: selectedInvoiceIds[inv.id] ? "#f0fdfa" : "transparent",
                        }}
                      >
                        <td style={{ textAlign: "center", padding: "8px 6px" }}>
                          <input
                            type="checkbox"
                            checked={!!selectedInvoiceIds[inv.id]}
                            onChange={(e) =>
                              setSelectedInvoiceIds({
                                ...selectedInvoiceIds,
                                [inv.id]: e.target.checked,
                              })
                            }
                            style={{ cursor: "pointer" }}
                          />
                        </td>

                        {isPracticeView && (
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ fontWeight: 600, color: "#2563eb" }}>
                              {inv.patient_name || "Patient"}
                            </span>
                            {inv.patient_mrn && (
                              <span style={{ color: "#64748b", marginLeft: "4px" }}>
                                [{inv.patient_mrn}]
                              </span>
                            )}
                          </td>
                        )}

                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{consultDateStr}</td>
                        <td style={{ padding: "8px 12px", color: "#334155" }}>
                          {inv.facility_name || "Heal Your Heart Neelankarai"}
                        </td>
                        <td style={{ padding: "8px 12px", color: "#334155" }}>{invDateStr}</td>

                        {/* INVOICE NUMBER (WITH RED CANCELLED WATERMARK STAMP IF CANCELLED) */}
                        <td style={{ padding: "8px 12px", position: "relative" }}>
                          <a
                            href={`#inv-${inv.number}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedInvoice(inv);
                              setViewMode("detail");
                            }}
                            style={{
                              color: "#2563eb",
                              fontWeight: 600,
                              textDecoration: "none",
                              cursor: "pointer",
                            }}
                          >
                            {inv.number}
                          </a>

                          {isCanceled && (
                            <span
                              style={{
                                position: "absolute",
                                left: "10px",
                                top: "5px",
                                transform: "rotate(-18deg)",
                                border: "1px solid #dc2626",
                                color: "#dc2626",
                                fontSize: "10px",
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: "2px",
                                pointerEvents: "none",
                                opacity: 0.85,
                              }}
                            >
                              CANCELLED
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "8px 12px", color: "#334155" }}>
                          {inv.consultant_name || "Dr. Ramasamy S"}
                        </td>

                        {/* Amount */}
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                          {rupees(inv.total_paise / 100)}
                        </td>

                        {/* Payment */}
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#16a34a", fontWeight: 500 }}>
                          {(inv.paid_paise || 0) > 0 ? rupees(inv.paid_paise / 100) : "--"}
                        </td>

                        {/* Due */}
                        <td style={{ padding: "8px 12px", textAlign: "right", color: hasDue ? "#d97706" : "#64748b", fontWeight: hasDue ? 600 : 400 }}>
                          {hasDue ? rupees(inv.balance_paise / 100) : "0.00"}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {isDraft ? (
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>Draft</span>
                          ) : isPaid ? (
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>Paid</span>
                          ) : isCanceled ? (
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Canceled</span>
                          ) : (
                            <span style={{ color: "#d97706", fontWeight: 600 }}>Due</span>
                          )}
                        </td>

                        {/* Row Action Three Dots */}
                        <td style={{ textAlign: "center", position: "relative" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === inv.id ? null : inv.id)
                            }
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "3px",
                              padding: "2px 6px",
                              cursor: "pointer",
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            ···
                          </button>

                          {activeMenuId === inv.id && (
                            <div
                              ref={menuRef}
                              style={{
                                position: "absolute",
                                right: "20px",
                                top: "25px",
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                zIndex: 100,
                                width: "160px",
                                textAlign: "left",
                              }}
                            >
                              <div
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setSelectedInvoice(inv);
                                  setViewMode("detail");
                                }}
                                style={{ padding: "7px 12px", cursor: "pointer", fontSize: "12px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                View Invoice
                              </div>

                              {!isCanceled && (
                                <div
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    startEditInvoice(inv);
                                  }}
                                  style={{ padding: "7px 12px", cursor: "pointer", fontSize: "12px" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  Edit Invoice
                                </div>
                              )}

                              <div
                                onClick={() => {
                                  setActiveMenuId(null);
                                  window.print();
                                }}
                                style={{ padding: "7px 12px", cursor: "pointer", fontSize: "12px" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                Print
                              </div>

                              {!isCanceled && (inv.balance_paise || 0) > 0 && (
                                <div
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openAddPaymentScreen(inv);
                                  }}
                                  style={{
                                    padding: "7px 12px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    color: "#0f766e",
                                    fontWeight: 600,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  Add Payment
                                </div>
                              )}

                              {!isCanceled && (
                                <div
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setCancelModalInvoice(inv);
                                  }}
                                  style={{
                                    padding: "7px 12px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    color: "#dc2626",
                                    borderTop: "1px solid #f1f5f9",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  Cancel Invoice
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* CPT DETAILS EXPANDER ROW (When Show CPT Details is toggled) */}
                      {showCptDetails && (inv.lines || []).length > 0 && (
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <td></td>
                          <td colSpan={isPracticeView ? 11 : 10} style={{ padding: "6px 12px 10px 12px" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                              CPT & Service Breakdown:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                              {inv.lines.map((l: any, lIdx: number) => (
                                <div
                                  key={lIdx}
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: "#0f766e" }}>[{l.code}]</span>{" "}
                                  <span>{l.description}</span>{" "}
                                  <span style={{ color: "#64748b" }}>× {l.quantity}</span> ={" "}
                                  <strong style={{ color: "#1e293b" }}>
                                    {rupees((l.total_paise || 0) / 100)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 2: RECEIPTS TAB (frame_052.png) */}
      {/* =================================================================== */}
      {activeSubtab === "receipts" && (
        <div>
          {/* RECEIPTS FILTER BAR */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#64748b", marginBottom: "4px" }}>
                Date Range
              </label>
              <select
                value={receiptDateRange}
                onChange={(e) => setReceiptDateRange(e.target.value)}
                style={{
                  width: "160px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: "#ffffff",
                }}
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="Last 30 Days">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#64748b", marginBottom: "4px" }}>
                Search Options
              </label>
              <div style={{ position: "relative", width: "200px" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "8px", top: "9px", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Receipt Number"
                  value={receiptSearchNo}
                  onChange={(e) => setReceiptSearchNo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 28px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                title="Reports"
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: "4px",
                  padding: "6px 10px",
                  color: "#eab308",
                  cursor: "pointer",
                }}
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>

          {/* Secondary toolbar */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Print ▾
            </button>
            <button
              type="button"
              onClick={() => notify("Sending receipts to patients...")}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Send Receipt ▾
            </button>
          </div>

          {/* RECEIPTS TABLE */}
          {filteredReceipts.length === 0 ? (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
                border: "1px dashed #cbd5e1",
                borderRadius: "6px",
                background: "#f8fafc",
              }}
            >
              No payment receipts found.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ width: "28px", padding: "8px 6px", textAlign: "center" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Payment Date</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Facility Name</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Receipt #</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Payment Method</th>
                  <th style={{ padding: "8px 12px", textAlign: "center" }}>Payment From</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Refund Amount</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Unused Payment</th>
                  <th style={{ width: "36px", padding: "8px 4px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((r) => {
                  const isVoided = !!r.is_voided;
                  const payDateStr = r.payment_date
                    ? new Date(r.payment_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Today";

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ textAlign: "center", padding: "8px 6px" }}>
                        <input type="checkbox" style={{ cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "8px 12px", color: "#334155" }}>{payDateStr}</td>
                      <td style={{ padding: "8px 12px", color: "#334155" }}>
                        {r.facility_name || "Heal Your Heart Neelankarai"}
                      </td>

                      {/* RECEIPT # (WITH RED DIAGONAL VOIDED STAMP IF VOIDED) */}
                      <td style={{ padding: "8px 12px", position: "relative" }}>
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>{r.receipt_number}</span>
                        {isVoided && (
                          <span
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "4px",
                              transform: "rotate(-20deg)",
                              border: "1px solid #dc2626",
                              color: "#dc2626",
                              fontSize: "9px",
                              fontWeight: 800,
                              padding: "1px 4px",
                              borderRadius: "2px",
                              pointerEvents: "none",
                              opacity: 0.85,
                            }}
                          >
                            Voided
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
                        {rupees(r.amount)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#334155" }}>
                        {r.payment_method || "UPI"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center", color: "#334155" }}>
                        {r.payment_from || "Patient"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>
                        {rupees(r.refund_amount || 0)}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>
                        {rupees(r.unused_payment || 0)}
                      </td>

                      {/* Row Action */}
                      <td style={{ textAlign: "center", position: "relative" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === r.id ? null : r.id)
                          }
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "3px",
                            padding: "2px 6px",
                            cursor: "pointer",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          ···
                        </button>

                        {activeMenuId === r.id && (
                          <div
                            ref={menuRef}
                            style={{
                              position: "absolute",
                              right: "20px",
                              top: "25px",
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              zIndex: 100,
                              width: "150px",
                              textAlign: "left",
                            }}
                          >
                            <div
                              onClick={() => {
                                setActiveMenuId(null);
                                window.print();
                              }}
                              style={{ padding: "7px 12px", cursor: "pointer", fontSize: "12px" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              Print
                            </div>

                            {!isVoided && (
                              <div
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleVoidReceipt(r.id);
                                }}
                                style={{
                                  padding: "7px 12px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  color: "#dc2626",
                                  borderTop: "1px solid #f1f5f9",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                Void Payment
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 3: BALANCE DUE TAB (frame_058.png) */}
      {/* =================================================================== */}
      {activeSubtab === "balance_due" && (
        <div>
          {/* TITLE & DESCRIPTION */}
          <h2 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
            Add Payment
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#64748b" }}>
            This page shows Patient balance details along with Patient and Insurance responsibility.
            Invoices can be selected based on various conditions and Practice could send selected
            invoices to patient for billing.
          </p>

          {/* DUAL TOP METRIC BOXES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {/* Box 1: Patient Balance Due */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "16px 20px",
                background: "#f8fafc",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                Patient Balance Due as on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f766e" }}>
                {rupees(totalOutstandingDue)}
              </div>
            </div>

            {/* Box 2: Insurance Balance Due */}
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "16px 20px",
                background: "#f8fafc",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                Insurance Balance Due as on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#64748b" }}>
                0.00
              </div>
            </div>
          </div>

          {/* DUAL SIDE-BY-SIDE SUMMARY TABLES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            {/* LEFT TABLE: Outstanding Invoices Summary */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 14px",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#334155",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                Outstanding Invoices Summary
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Patient</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Insurance</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Payments</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>{rupees(totalOutstandingPaid)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600 }}>{rupees(totalOutstandingPaid)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Adjustments</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Write-off</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Due</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>{rupees(totalOutstandingDue)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600 }}>{rupees(totalOutstandingDue)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Unused Payments</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                  </tr>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f766e" }}>Balance Due</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f766e" }}>{rupees(totalOutstandingDue)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f766e" }}>0.00</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f766e" }}>{rupees(totalOutstandingDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT TABLE: Paid Invoices Summary */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 14px",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#334155",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                Paid Invoices Summary
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#ffffff", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Patient</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Insurance</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Payments</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>{rupees(totalSettledPaid)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 600 }}>{rupees(totalSettledPaid)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Adjustments</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: "#334155" }}>Write-off</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                    <td style={{ padding: "7px 12px", textAlign: "right" }}>0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BALANCE DUE BOTTOM FILTERS & RADIO BUTTONS */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-end",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Facility
                </label>
                <select
                  value={balanceDueFacility}
                  onChange={(e) => setBalanceDueFacility(e.target.value)}
                  style={{
                    width: "160px",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                >
                  <option value="All">All</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  Date Range
                </label>
                <select
                  value={balanceDueDateRange}
                  onChange={(e) => setBalanceDueDateRange(e.target.value)}
                  style={{
                    width: "140px",
                    padding: "6px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                >
                  <option value="Last 2 Years">Last 2 Years</option>
                  <option value="This Year">This Year</option>
                  <option value="All">All</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  From
                </label>
                <input
                  type="date"
                  value={balanceDueFrom}
                  onChange={(e) => setBalanceDueFrom(e.target.value)}
                  style={{
                    width: "140px",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                  To
                </label>
                <input
                  type="date"
                  value={balanceDueTo}
                  onChange={(e) => setBalanceDueTo(e.target.value)}
                  style={{
                    width: "140px",
                    padding: "5px 8px",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Show Report Orange Button */}
              <div style={{ marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={() => setBalanceDueReportVisible(true)}
                  style={{
                    background: "#f97316",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "7px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  Show Report
                </button>
              </div>
            </div>

            {/* 3 Radio options */}
            <div style={{ display: "flex", gap: "20px", fontSize: "12.5px", color: "#334155", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="balanceDueOpt"
                  checked={balanceDueRadio === "all"}
                  onChange={() => setBalanceDueRadio("all")}
                />
                All Invoices
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="balanceDueOpt"
                  checked={balanceDueRadio === "due"}
                  onChange={() => setBalanceDueRadio("due")}
                />
                Show Invoices with Due
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="balanceDueOpt"
                  checked={balanceDueRadio === "claim"}
                  onChange={() => setBalanceDueRadio("claim")}
                />
                Show Invoices for which Claim is processed & Invoices having Due
              </label>
            </div>
          </div>

          {/* OUTSTANDING INVOICES LIST (FOR MULTI-INVOICE PAYMENT COLLECTION) */}
          {balanceDueReportVisible && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  Outstanding Invoices with Due Balance ({outstandingInvoices.length})
                </div>

                {outstandingInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (outstandingInvoices.length > 0) {
                        openAddPaymentScreen(outstandingInvoices[0]);
                      }
                    }}
                    style={{
                      background: "#0f766e",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Collect Balance Payment
                  </button>
                )}
              </div>

              {outstandingInvoices.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#16a34a",
                    fontSize: "13px",
                    background: "#f0fdf4",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  ✓ No outstanding due for this patient. All invoices are fully paid.
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                      <th style={{ width: "32px", padding: "8px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice #</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice Date</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Consultant</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Paid</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Due</th>
                      <th style={{ width: "100px", padding: "8px 12px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingInvoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ textAlign: "center", color: "#64748b", padding: "8px" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: "#2563eb" }}>
                          {inv.number}
                        </td>
                        <td style={{ padding: "8px 12px" }}>{inv.date}</td>
                        <td style={{ padding: "8px 12px" }}>{inv.consultant_name || "Doctor"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          {rupees(inv.total_paise / 100)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "#16a34a" }}>
                          {rupees((inv.paid_paise || 0) / 100)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>
                          {rupees(inv.balance_paise / 100)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              openAddPaymentScreen(inv);
                            }}
                            style={{
                              background: "#0f766e",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "4px",
                              padding: "4px 10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Pay Due
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUBTAB 4: FAMILY BALANCE DUE TAB */}
      {/* =================================================================== */}
      {activeSubtab === "family_balance_due" && (
        <div>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
            Family Balance Due
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#64748b" }}>
            Consolidated balance and outstanding liability for the patient's family account.
          </p>

          <div
            style={{
              padding: "24px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            No family guarantor linkage configured for this patient record.
            <div style={{ marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => notify("Link Family Member modal opened")}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                + Link Family Member Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* QUICK PAY MODAL (FOR IMMEDIATE PAYMENT RECORDING) */}
      {/* =================================================================== */}
      {quickPayInvoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "440px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                Add Payment: {quickPayInvoice.number}
              </div>
              <button
                type="button"
                onClick={() => setQuickPayInvoice(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Balance Due
              </label>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f766e" }}>
                {rupees((quickPayInvoice.balance_paise || 0) / 100)}
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Payment Amount (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={quickPayAmount}
                onChange={(e) => setQuickPayAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
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
                  background: "#ffffff",
                }}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Reference / Transaction #
              </label>
              <input
                type="text"
                placeholder="Optional UPI ID or Cheque/Txn #"
                value={quickPayRef}
                onChange={(e) => setQuickPayRef(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setQuickPayInvoice(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "7px 16px",
                  fontSize: "13px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={quickPaySubmitting}
                onClick={handleQuickPay}
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "7px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: quickPaySubmitting ? "not-allowed" : "pointer",
                }}
              >
                {quickPaySubmitting ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DIRECT + PAYMENT MODAL (IN RECEIPTS TAB) */}
      {/* =================================================================== */}
      {addPaymentModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "480px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                Record Direct / Advance Payment
              </div>
              <button
                type="button"
                onClick={() => setAddPaymentModalOpen(false)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Payment Amount (Rs.)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={directPaymentAmount || ""}
                onChange={(e) => setDirectPaymentAmount(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Payment Method
              </label>
              <select
                value={directPaymentMethod}
                onChange={(e) => setDirectPaymentMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  background: "#ffffff",
                }}
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Reference / Transaction #
              </label>
              <input
                type="text"
                placeholder="UPI Ref or Txn Number"
                value={directPaymentRef}
                onChange={(e) => setDirectPaymentRef(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Notes / Purpose
              </label>
              <input
                type="text"
                placeholder="Advance payment, consultation fee, etc."
                value={directPaymentNotes}
                onChange={(e) => setDirectPaymentNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setAddPaymentModalOpen(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "7px 16px",
                  fontSize: "13px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectPayment}
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "7px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Payment & Issue Receipt
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "440px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#dc2626" }}>
                Cancel Invoice: {cancelModalInvoice.number}
              </div>
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", marginBottom: "16px" }}>
              Are you sure you want to cancel this invoice? Once cancelled, the invoice cannot be
              edited or collected, and will be stamped as CANCELLED.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                Reason for cancellation (optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Created in error, duplicate entry..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setCancelModalInvoice(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "7px 16px",
                  fontSize: "13px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                No, Keep Invoice
              </button>
              <button
                type="button"
                disabled={cancelSubmitting}
                onClick={handleCancelInvoice}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "7px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: cancelSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {cancelSubmitting ? "Cancelling..." : "Yes, Cancel Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CONSULTATION SUMMARY MODAL */}
      {/* =================================================================== */}
      {consultationSummaryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "8px",
              width: "560px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "20px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "10px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
                Consultation Summary
              </div>
              <button
                type="button"
                onClick={() => setConsultationSummaryModal(null)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#334155" }}>
              <div style={{ marginBottom: "10px" }}>
                <strong>Patient:</strong> {consultationSummaryModal.patient_name || "Patient"}{" "}
                [{consultationSummaryModal.patient_mrn || ""}]
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>Attending Physician:</strong> {consultationSummaryModal.consultant_name || "Dr. Ramasamy S"}
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>Consultation Date:</strong>{" "}
                {consultationSummaryModal.consultation_date
                  ? new Date(consultationSummaryModal.consultation_date).toLocaleDateString()
                  : "Nov 16, 2026"}
              </div>
              <div style={{ marginBottom: "10px" }}>
                <strong>Diagnosis / Encounter Note:</strong> Routine follow-up for ischemic heart
                disease evaluation and EECP non-invasive treatment course assessment.
              </div>
              <div style={{ marginBottom: "14px" }}>
                <strong>Billed Services:</strong>
                <ul style={{ margin: "6px 0 0 20px", padding: 0 }}>
                  {(consultationSummaryModal.lines || []).map((l: any, i: number) => (
                    <li key={i}>
                      {l.description} — {money(l.total_paise)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setConsultationSummaryModal(null)}
                style={{
                  background: "#0f766e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "7px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// CHARMHEALTH GLOBAL PRACTICE BILLING COMPONENT
// =====================================================================
export function CharmPracticeBilling() {
  return <CharmPatientBilling isPracticeView={true} />;
}
