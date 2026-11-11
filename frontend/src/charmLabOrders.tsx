import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Upload,
  Check,
  MoreHorizontal,
  X,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  FlaskConical,
  Paperclip,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";

// Known standard laboratory reference ranges dictionary for auto-population
const KNOWN_LAB_RANGES: Record<string, { min?: number; max?: number; text?: string; unit?: string }> = {
  "calcium": { min: 8.6, max: 10.2, unit: "mg/dL" },
  "magnesium": { min: 1.6, max: 2.6, unit: "mg/dL" },
  "phosphorous": { min: 2.5, max: 4.5, unit: "mg/dL" },
  "apolipoprotein-a1": { min: 111.0, max: 184.0, unit: "mg/dL" },
  "apolipoprotein-b": { min: 81.0, max: 156.0, unit: "mg/dL" },
  "apo b/apo a1 ratio": { min: 0.35, max: 1.0, unit: "Ratio" },
  "apob/apo a1 ratio": { min: 0.35, max: 1.0, unit: "Ratio" },
  "lipoprotein": { text: "<30 mg/dL", unit: "mg/dL" },
  "lipoprotein-a": { text: "<30 mg/dL", unit: "mg/dL" },
  "homocysteine": { min: 5.0, max: 15.0, unit: "umol/L" },
  "hs c-reactive protein": { text: "<1.0 mg/L (Low Risk)", unit: "mg/L" },
  "hs c-reactive protein (hscrp)": { text: "<1.0 mg/L (Low Risk)", unit: "mg/L" },
  "total wbc count": { min: 4000.0, max: 10000.0, unit: "cells/cumm" },
  "neutrophils": { min: 40.0, max: 80.0, unit: "%" },
  "lymphocytes": { min: 20.0, max: 40.0, unit: "%" },
  "eosinophils": { min: 1.0, max: 6.0, unit: "%" },
  "monocytes": { min: 2.0, max: 10.0, unit: "%" },
  "basophils": { text: "<2", unit: "%" },
  "haemoglobin-hb": { min: 13.0, max: 17.0, unit: "g/dL" },
  "platelet count": { min: 150000, max: 450000, unit: "cells/cumm" },
  "fasting blood sugar": { min: 70.0, max: 100.0, unit: "mg/dL" },
  "postprandial blood sugar": { min: 70.0, max: 140.0, unit: "mg/dL" },
  "postprandial sugar": { min: 70.0, max: 140.0, unit: "mg/dL" },
  "hba1c": { min: 4.0, max: 5.6, unit: "%" },
  "blood urea nitrogen": { min: 7.0, max: 20.0, unit: "mg/dL" },
  "bun-blood urea nitrogen": { min: 7.0, max: 20.0, unit: "mg/dL" },
  "creatinine": { min: 0.7, max: 1.3, unit: "mg/dL" },
  "sodium": { min: 135.0, max: 145.0, unit: "mEq/L" },
  "chloride": { min: 96.0, max: 106.0, unit: "mEq/L" },
  "total cholesterol": { min: 125.0, max: 200.0, unit: "mg/dL" },
  "triglyceride": { min: 50.0, max: 150.0, unit: "mg/dL" },
  "hdl cholesterol": { min: 40.0, max: 60.0, unit: "mg/dL" },
  "ldl cholesterol": { min: 50.0, max: 100.0, unit: "mg/dL" },
  "tsh": { min: 0.4, max: 4.2, unit: "uIU/mL" },
  "free t3": { min: 2.3, max: 4.2, unit: "pg/mL" },
  "free t4": { min: 0.8, max: 1.8, unit: "ng/dL" },
};

export interface CharmLabOrdersProps {
  patientId?: string;
  encounterId?: string;
  isGlobal?: boolean;
}

export function CharmLabOrders({ patientId, encounterId, isGlobal }: CharmLabOrdersProps) {
  const { user, staff, patients, notify } = useApp();
  const queryClient = useQueryClient();

  const isGlobalMode = !patientId || !!isGlobal;

  // Navigation & View Modes: in global mode, default to results (matching CharmHealth Frame 5)
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "results">(isGlobalMode ? "results" : "orders");
  const [viewMode, setViewMode] = useState<"list" | "add_order" | "import_result" | "print_view">("list");
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);

  // Filters & Search for Orders
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending_partial");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filters & Search for Results
  const [filterReviewer, setFilterReviewer] = useState<string>("all");
  const [filterResultStatus, setFilterResultStatus] = useState<string>("unsigned");
  const [resultSearchQuery, setResultSearchQuery] = useState<string>("");

  // Table State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openResultMenuId, setOpenResultMenuId] = useState<string | null>(null);

  // Secondary Modals
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);
  const [specimenOrder, setSpecimenOrder] = useState<Row | null>(null);
  const [specimenData, setSpecimenData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "08:30",
    type: "Blood (Serum)",
    site: "Left antecubital fossa",
    volume: "5 mL",
    container: "Gold top (SST gel separator)",
    fasting: true,
  });
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeOrder, setBarcodeOrder] = useState<Row | null>(null);
  const [viewReportModalOrder, setViewReportModalOrder] = useState<Row | null>(null);
  const [selectOrderForResultsModal, setSelectOrderForResultsModal] = useState<boolean>(false);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["orders", branch],
    queryFn: () => api<Row[]>("/records/orders"),
  });

  const labCatalogsQuery = useQuery({
    queryKey: ["catalogs", "lab_test", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=lab_test"),
  });

  const labTemplatesQuery = useQuery({
    queryKey: ["catalogs", "lab_template", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=lab_template"),
  });

  const orders = ordersQuery.data || [];
  const labCatalogs = labCatalogsQuery.data || [];
  const labTemplates = labTemplatesQuery.data || [];

  // Filter for Lab orders: clinic-wide if global, or patient-specific if patientId is provided
  const activeLabOrders = useMemo(() => {
    return orders.filter((o) => {
      const isLab = o.kind ? o.kind.toLowerCase() === "lab" : true;
      if (!isLab) return false;
      if (!isGlobalMode && patientId) {
        return o.patient_id === patientId;
      }
      return true;
    });
  }, [orders, patientId, isGlobalMode]);

  // Apply listing filters for Lab Orders tab
  const filteredOrders = useMemo(() => {
    return activeLabOrders.filter((o) => {
      // Provider filter
      if (filterProvider !== "all") {
        const authorMatch = o.author_id === filterProvider || o.reviewed_by === filterProvider;
        if (!authorMatch) return false;
      }
      // Status filter
      const st = (o.status || "Pending").toLowerCase();
      if (filterStatus === "pending_partial") {
        if (!["pending", "partial", "ordered"].includes(st)) return false;
      } else if (filterStatus === "pending") {
        if (!["pending", "ordered"].includes(st)) return false;
      } else if (filterStatus === "partial") {
        if (st !== "partial") return false;
      } else if (filterStatus === "completed") {
        if (!["completed", "resulted", "reviewed"].includes(st)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = patients.find((x) => x.id === o.patient_id);
        const pName = (p ? `${p.first_name || ""} ${p.last_name || ""} ${p.mrn || ""}` : (o.patient_name || "") + " " + (o.patient_mrn || "")).toLowerCase();
        const refMatch = (o.lab_ref || "").toLowerCase().includes(q);
        const nameMatch = (o.name || "").toLowerCase().includes(q);
        const metaMatch = (o.order_metadata || "").toLowerCase().includes(q);
        const notesMatch = (o.instructions || "").toLowerCase().includes(q);
        const patMatch = pName.includes(q);
        if (!refMatch && !nameMatch && !metaMatch && !notesMatch && !patMatch) return false;
      }
      return true;
    });
  }, [activeLabOrders, filterProvider, filterStatus, searchQuery, patients]);

  // Apply listing filters for Lab Results tab (matching CharmHealth Frame 5)
  const filteredResultOrders = useMemo(() => {
    return activeLabOrders.filter((o) => {
      // Must have results/values or resulted/partial/completed/reviewed status
      const hasValues = (o.values && o.values.length > 0) || ["partial", "completed", "resulted", "reviewed"].includes((o.status || "").toLowerCase());
      if (!hasValues) return false;

      // Reviewer filter
      if (filterReviewer !== "all") {
        const reviewerMatch = o.reviewed_by === filterReviewer || o.author_id === filterReviewer;
        if (!reviewerMatch) return false;
      }

      // Result Status filter: "unsigned" vs "signed" vs "all"
      const st = (o.status || "").toLowerCase();
      const isSigned = st === "reviewed" || st === "signed";
      if (filterResultStatus === "unsigned" && isSigned) return false;
      if (filterResultStatus === "signed" && !isSigned) return false;

      // Search query
      if (resultSearchQuery.trim()) {
        const q = resultSearchQuery.toLowerCase();
        const p = patients.find((x) => x.id === o.patient_id);
        const pName = (p ? `${p.first_name || ""} ${p.last_name || ""} ${p.mrn || ""}` : (o.patient_name || "") + " " + (o.patient_mrn || "")).toLowerCase();
        const refMatch = (o.lab_ref || "").toLowerCase().includes(q);
        const nameMatch = (o.name || "").toLowerCase().includes(q);
        const metaMatch = (o.order_metadata || "").toLowerCase().includes(q);
        const valuesMatch = (o.values || []).some((v: any) =>
          (v.parameter || "").toLowerCase().includes(q) || (v.test_name || "").toLowerCase().includes(q)
        );
        const patMatch = pName.includes(q);
        if (!refMatch && !nameMatch && !metaMatch && !valuesMatch && !patMatch) return false;
      }
      return true;
    });
  }, [activeLabOrders, filterReviewer, filterResultStatus, resultSearchQuery, patients]);

  // Helpers
  const getPatientData = (patientIdOrOrder: string | Row) => {
    const pid = typeof patientIdOrOrder === "string" ? patientIdOrOrder : patientIdOrOrder.patient_id;
    const p = patients.find((x) => x.id === pid);
    const pName = p ? `${p.first_name} ${p.last_name}` : (typeof patientIdOrOrder === "object" ? patientIdOrOrder.patient_name || "Patient" : "Patient");
    const pMrn = p?.mrn || (typeof patientIdOrOrder === "object" ? patientIdOrOrder.patient_mrn : "") || "4R 0017";
    const initial = p ? `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}` : "PT";
    return { id: pid, name: pName, mrn: pMrn, initial };
  };

  const getOrderLabName = (order: Row): string => {
    if (order.order_metadata) {
      try {
        const meta = JSON.parse(order.order_metadata);
        if (meta.template_name) return meta.template_name;
        if (meta.primary_lab) return meta.primary_lab;
      } catch {}
    }
    if (order.name && order.name.includes(" · ")) {
      return order.name.split(" · ")[0].trim();
    }
    return "HUH-Cardio Diabetic";
  };

  const isOrderAbnormal = (order: Row): boolean => {
    const vals: any[] = order.values || [];
    return vals.some((v) => ["low", "high", "abnormal"].includes((v.interpretation || "").toLowerCase()));
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".charm-menu-container")) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Helper to parse tests array from order
  const getOrderTests = (order: Row): string[] => {
    if (order.order_metadata) {
      try {
        const meta = JSON.parse(order.order_metadata);
        if (Array.isArray(meta.tests) && meta.tests.length > 0) {
          return meta.tests;
        }
      } catch { }
    }
    if (order.name) {
      if (order.name.includes(" · ")) {
        return [order.name.split(" · ")[1].trim()];
      }
      return [order.name];
    }
    return ["Routine Diagnostic Evaluation"];
  };

  // Helper to check if a specific test within an order has resulted values
  const isTestResulted = (order: Row, testName: string): boolean => {
    const values: any[] = order.values || [];
    if (values.length === 0) return false;
    return values.some(
      (v) => (v.test_name && v.test_name.toLowerCase() === testName.toLowerCase()) || values.length > 0
    );
  };

  // Status badge renderer matching CharmHealth
  const renderStatusBadge = (status: string) => {
    const s = (status || "Pending").toLowerCase();
    if (s === "pending" || s === "ordered") {
      return (
        <span style={{ color: "#ea580c", fontWeight: 600, fontSize: "0.85rem" }}>
          Pending
        </span>
      );
    }
    if (s === "partial") {
      return (
        <span style={{ color: "#0d9488", fontWeight: 600, fontSize: "0.85rem" }}>
          Partial
        </span>
      );
    }
    if (s === "completed" || s === "resulted") {
      return (
        <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.85rem" }}>
          Completed
        </span>
      );
    }
    if (s === "reviewed") {
      return (
        <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.85rem" }}>
          Reviewed
        </span>
      );
    }
    return <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{status}</span>;
  };

  // Formatter for clinician name
  const getProviderName = (userId?: string) => {
    if (!userId) return user.name;
    const s = staff.find((x) => x.id === userId);
    return s?.name || user.name;
  };

  return (
    <div className="charm-lab-module" style={{ background: "#ffffff", minHeight: "650px", padding: "16px 20px" }}>
      {/* 1. TOP SUBTABS & MAIN ACTIONS BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "28px" }}>
          <button
            type="button"
            className="charm-lab-subtab"
            style={{
              background: "none",
              border: "none",
              fontSize: "1rem",
              fontWeight: activeSubTab === "results" ? 700 : 500,
              color: activeSubTab === "results" ? "#0f172a" : "#64748b",
              borderBottom: activeSubTab === "results" ? "2.5px solid #0d9488" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => {
              setActiveSubTab("results");
              setViewMode("list");
            }}
          >
            Lab Results
          </button>
          <button
            type="button"
            className="charm-lab-subtab"
            style={{
              background: "none",
              border: "none",
              fontSize: "1rem",
              fontWeight: activeSubTab === "orders" ? 700 : 500,
              color: activeSubTab === "orders" ? "#0f172a" : "#64748b",
              borderBottom: activeSubTab === "orders" ? "2.5px solid #0d9488" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => {
              setActiveSubTab("orders");
              setViewMode("list");
            }}
          >
            Lab Orders
          </button>
        </div>

        {viewMode === "list" && activeSubTab === "orders" && (
          <button
            type="button"
            className="charm-btn-orange"
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onClick={() => setViewMode("add_order")}
          >
            <Plus size={15} />
            + Lab Order
          </button>
        )}

        {viewMode === "list" && activeSubTab === "results" && (
          <button
            type="button"
            className="charm-btn-orange"
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onClick={() => setSelectOrderForResultsModal(true)}
          >
            <Plus size={15} />
            + Lab Result
          </button>
        )}
      </div>

      {/* 2. RENDER SUB-VIEWS */}
      {viewMode === "add_order" && (
        <AddLabOrderScreen
          patientId={patientId}
          encounterId={encounterId}
          labCatalogs={labCatalogs}
          labTemplates={labTemplates}
          onCancel={() => setViewMode("list")}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            notify("Lab order created successfully.");
          }}
        />
      )}

      {viewMode === "import_result" && selectedOrder && (
        <ImportLabResultScreen
          order={selectedOrder}
          labCatalogs={labCatalogs}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab results saved successfully.");
          }}
        />
      )}

      {viewMode === "print_view" && selectedOrder && (
        <PrintRequisitionView
          order={selectedOrder}
          patientId={patientId}
          onClose={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
        />
      )}

      {/* 3. LISTING VIEW (LAB ORDERS TAB) */}
      {viewMode === "list" && activeSubTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Ordered By</div>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "140px",
                }}
              >
                <option value="all">All</option>
                {staff
                  .filter((s) => ["doctor", "assistant"].includes(s.role))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Order Status</div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "150px",
                }}
              >
                <option value="pending_partial">Pending / Partial</option>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: "340px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Search</div>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "9px", top: "8px", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder={isGlobalMode ? "Search Patient by Name / ID" : "Search by Lab Name"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 10px 5px 28px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  {isGlobalMode && (
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: "22%" }}>
                      Patient <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                    </th>
                  )}
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: isGlobalMode ? "28%" : "35%" }}>Tests</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Lab Ref.# <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Ordered By</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Ordered On <span style={{ fontSize: "0.75rem", color: "#0d9488" }}>▾</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Result Interpretation</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={isGlobalMode ? 7 : 6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      No lab orders found. Click <strong>+ Lab Order</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const testList = getOrderTests(order);
                    const isExpanded = !!expandedRows[order.id];
                    const visibleTests = isExpanded ? testList : testList.slice(0, 2);
                    const remainingCount = testList.length - 2;

                    return (
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          verticalAlign: "top",
                        }}
                      >
                        {isGlobalMode && (
                          <td style={{ padding: "12px 14px" }}>
                            {(() => {
                              const pat = getPatientData(order);
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "50%",
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      color: "#0f766e",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {pat.initial}
                                  </div>
                                  <div>
                                    <a
                                      href={`#/patients/${pat.id}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/patients/${pat.id}`);
                                      }}
                                      style={{
                                        color: "#0284c7",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        fontSize: "0.85rem",
                                        display: "block",
                                      }}
                                    >
                                      {pat.name}
                                    </a>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                      [ {pat.mrn} ]
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {/* Tests with checkmarks and expansion */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {visibleTests.map((tName, idx) => {
                              const resulted = isTestResulted(order, tName);
                              return (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ color: "#1e293b" }}>{tName}</span>
                                  {resulted && (
                                    <Check size={14} style={{ color: "#16a34a", strokeWidth: 3 }} />
                                  )}
                                </div>
                              );
                            })}

                            {!isExpanded && remainingCount > 0 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "2px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: true }))}
                              >
                                {remainingCount} More..
                              </button>
                            )}

                            {isExpanded && testList.length > 2 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "4px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: false }))}
                              >
                                Less
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Lab Ref.# */}
                        <td style={{ padding: "12px 14px", color: "#334155", fontFamily: "monospace" }}>
                          {order.lab_ref || `00020${order.id.slice(0, 3)}`}
                        </td>

                        {/* Ordered By */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {getProviderName(order.author_id)}
                        </td>

                        {/* Ordered On */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {order.ordered_date ||
                            (order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "Today")}
                        </td>

                        {/* Result Interpretation */}
                        <td style={{ padding: "12px 14px" }}>
                          {renderStatusBadge(order.status)}
                        </td>

                        {/* 10-Item Action Menu */}
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div className="charm-menu-container" style={{ position: "relative", display: "inline-block" }}>
                            <button
                              type="button"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "4px 7px",
                                cursor: "pointer",
                                color: "#475569",
                              }}
                              className="charm-order-actions-btn"
                              title="Order Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === order.id ? null : order.id);
                              }}
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === order.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "28px",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                                  width: "190px",
                                  zIndex: 100,
                                  textAlign: "left",
                                  padding: "4px 0",
                                }}
                              >
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 600,
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("import_result");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Import Results
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("add_order");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Edit Lab Order
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("print_view");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Print Lab Order
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("print_view");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Export as PDF
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    notify(`Requisition notification SMS sent to registered mobile.`);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Share by SMS
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSpecimenOrder(order);
                                    setSpecimenModalOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Specimen Details
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setBarcodeOrder(order);
                                    setBarcodeModalOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Print Test Specimen Label
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#16a34a",
                                  }}
                                  onClick={async () => {
                                    await api(`/records/orders/${order.id}/status`, "POST", {
                                      status: "Completed",
                                      version: order.version,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                                    setOpenMenuId(null);
                                    notify("Order marked as Completed.");
                                  }}
                                >
                                  Mark as Completed
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#dc2626",
                                  }}
                                  onClick={async () => {
                                    await api(`/records/orders/${order.id}/status`, "POST", {
                                      status: "Expired",
                                      version: order.version,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                                    setOpenMenuId(null);
                                    notify("Order marked as Expired.");
                                  }}
                                >
                                  Mark as Expired
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. LAB RESULTS TAB */}
      {viewMode === "list" && activeSubTab === "results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Results Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Reviewer</div>
              <select
                value={filterReviewer}
                onChange={(e) => setFilterReviewer(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "140px",
                }}
              >
                <option value="all">All</option>
                {staff
                  .filter((s) => ["doctor", "assistant"].includes(s.role))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Status</div>
              <select
                value={filterResultStatus}
                onChange={(e) => setFilterResultStatus(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "150px",
                }}
              >
                <option value="unsigned">Unsigned</option>
                <option value="all">All</option>
                <option value="signed">Signed</option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: "340px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Search</div>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "9px", top: "8px", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder={isGlobalMode ? "Search Patient by Name / ID" : "Search by Test / Lab Name"}
                  value={resultSearchQuery}
                  onChange={(e) => setResultSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 10px 5px 28px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results Data Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  {isGlobalMode && (
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: "22%" }}>
                      Patient <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                    </th>
                  )}
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: isGlobalMode ? "28%" : "35%" }}>Tests</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Lab</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Date <span style={{ fontSize: "0.75rem", color: "#0d9488" }}>▾</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Param Interpretation</th>
                  <th style={{ padding: "10px 14px", width: "40px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredResultOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isGlobalMode ? 6 : 5}
                      style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
                    >
                      No laboratory results available matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredResultOrders.map((order) => {
                    const testList = getOrderTests(order);
                    const isExpanded = !!expandedRows[order.id];
                    const visibleTests = isExpanded ? testList : testList.slice(0, 2);
                    const remainingCount = testList.length - 2;
                    const isMenuOpen = openMenuId === order.id;
                    const pat = getPatientData(order);
                    const isAbnormal = isOrderAbnormal(order);

                    return (
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        {/* Patient Column */}
                        {isGlobalMode && (
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  background: "#e0f2fe",
                                  color: "#0284c7",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {pat.initial}
                              </div>
                              <div>
                                <a
                                  href={`#/patients/${pat.id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/patients/${pat.id}`);
                                  }}
                                  style={{
                                    color: "#0284c7",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    fontSize: "0.85rem",
                                    display: "block",
                                  }}
                                >
                                  {pat.name}
                                </a>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                  [ {pat.mrn} ]
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Tests with checkmarks and expansion */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {visibleTests.map((tName, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: "#1e293b" }}>{tName}</span>
                                <Check size={14} style={{ color: "#16a34a", strokeWidth: 3 }} />
                              </div>
                            ))}

                            {!isExpanded && remainingCount > 0 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "2px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: true }))}
                              >
                                {remainingCount} More..
                              </button>
                            )}

                            {isExpanded && testList.length > 2 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "4px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: false }))}
                              >
                                Less
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Lab name */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {getOrderLabName(order)}
                        </td>

                        {/* Date */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {order.ordered_date ||
                            (order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-") : "10-26-2026")}
                        </td>

                        {/* Param Interpretation */}
                        <td style={{ padding: "12px 14px" }}>
                          {isAbnormal ? (
                            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.85rem" }}>
                              Abnormal
                            </span>
                          ) : (
                            <span style={{ color: "#334155", fontWeight: 600, fontSize: "0.85rem" }}>
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Three-dot action menu */}
                        <td style={{ padding: "12px 10px", textAlign: "center", position: "relative" }}>
                          <div className="charm-menu-container" style={{ display: "inline-block" }}>
                            <button
                              type="button"
                              className="charm-action-btn"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#64748b",
                                borderRadius: "4px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(isMenuOpen ? null : order.id);
                              }}
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {isMenuOpen && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "28px",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                                  width: "180px",
                                  zIndex: 100,
                                  textAlign: "left",
                                  padding: "4px 0",
                                }}
                              >
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 600,
                                  }}
                                  onClick={() => {
                                    setViewReportModalOrder(order);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  View Report
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("import_result");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Edit Values
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#16a34a",
                                    fontWeight: 600,
                                  }}
                                  onClick={async () => {
                                    await api(`/records/orders/${order.id}/status`, "POST", {
                                      status: "Reviewed",
                                      version: order.version,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                                    setOpenMenuId(null);
                                    notify("Lab results reviewed and signed.");
                                  }}
                                >
                                  Review & Sign
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("print_view");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Print Requisition
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SPECIMEN DETAILS MODAL */}
      {specimenModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "500px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Specimen Details</h3>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Collection Date</label>
                  <input
                    type="date"
                    value={specimenData.date}
                    onChange={(e) => setSpecimenData({ ...specimenData, date: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Collection Time</label>
                  <input
                    type="time"
                    value={specimenData.time}
                    onChange={(e) => setSpecimenData({ ...specimenData, time: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Specimen Type</label>
                <select
                  value={specimenData.type}
                  onChange={(e) => setSpecimenData({ ...specimenData, type: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                >
                  <option value="Blood (Serum)">Blood (Serum)</option>
                  <option value="Blood (Whole EDTA)">Blood (Whole EDTA)</option>
                  <option value="Blood (Plasma Citrate)">Blood (Plasma Citrate)</option>
                  <option value="Urine (Spot)">Urine (Spot)</option>
                  <option value="Urine (24-Hour)">Urine (24-Hour)</option>
                  <option value="Sputum">Sputum</option>
                </select>
              </div>

              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Container / Tube</label>
                <input
                  type="text"
                  value={specimenData.container}
                  onChange={(e) => setSpecimenData({ ...specimenData, container: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="fasting-cb"
                  checked={specimenData.fasting}
                  onChange={(e) => setSpecimenData({ ...specimenData, fasting: e.target.checked })}
                />
                <label htmlFor="fasting-cb" style={{ color: "#334155", cursor: "pointer" }}>
                  12-hour Overnight Fasting Verified
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpecimenModalOpen(false);
                  notify("Specimen details updated.");
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Specimen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BARCODE LABEL MODAL */}
      {barcodeModalOpen && barcodeOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "420px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>Specimen Tube Label Preview</h3>
              <button
                type="button"
                onClick={() => setBarcodeModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                border: "2px dashed #94a3b8",
                padding: "14px",
                borderRadius: "4px",
                background: "#fafafa",
                fontFamily: "monospace",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>HEAL YOUR HEART CLINIC</div>
              <div style={{ fontSize: "0.85rem" }}>REF: {barcodeOrder.lab_ref || `00020${barcodeOrder.id.slice(0, 3)}`}</div>
              <div style={{ fontSize: "0.85rem" }}>TEST: {getOrderTests(barcodeOrder)[0] || barcodeOrder.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                DATE: {new Date().toLocaleDateString()} · TUBE: SST (Gold)
              </div>
              <div style={{ marginTop: "10px", textAlign: "center", letterSpacing: "4px", fontWeight: 700 }}>
                |||| | ||||| || |||||| | |||
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setBarcodeModalOpen(false);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 7. VIEW LAB RESULTS REPORT MODAL */}
      {viewReportModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "720px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Diagnostic Lab Report</h3>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: (viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "#dcfce7" : "#fef3c7",
                      color: (viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "#16a34a" : "#d97706",
                    }}
                  >
                    {(viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "Reviewed / Signed" : "Unsigned / Pending Review"}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
                  Ref.#: <strong style={{ fontFamily: "monospace", color: "#334155" }}>{viewReportModalOrder.lab_ref || `00020${viewReportModalOrder.id.slice(0, 3)}`}</strong> · Lab: <strong>{getOrderLabName(viewReportModalOrder)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewReportModalOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Details strip */}
            {(() => {
              const p = getPatientData(viewReportModalOrder);
              return (
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "4px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "0.83rem", marginBottom: "16px" }}>
                  <div><span style={{ color: "#64748b" }}>Patient:</span> <strong style={{ color: "#0f172a" }}>{p.name}</strong></div>
                  <div><span style={{ color: "#64748b" }}>MRN:</span> <strong style={{ color: "#0f172a" }}>{p.mrn}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Ordered Date:</span> <strong style={{ color: "#0f172a" }}>{viewReportModalOrder.ordered_date || "Today"}</strong></div>
                </div>
              );
            })()}

            {/* Parameter Results Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "16px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Parameter</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Result</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Unit</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Reference Interval</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {(!viewReportModalOrder.values || viewReportModalOrder.values.length === 0) ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                      No structured parameter results recorded yet.
                    </td>
                  </tr>
                ) : (
                  viewReportModalOrder.values.map((v: any, idx: number) => {
                    const isAbn = ["low", "high", "abnormal"].includes((v.interpretation || "").toLowerCase());
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: isAbn ? "#fff5f5" : "transparent" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{v.parameter}</td>
                        <td style={{ padding: "8px 10px", fontWeight: isAbn ? 700 : 500, color: isAbn ? "#dc2626" : "#0f172a" }}>
                          {v.value}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{v.unit || "-"}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{v.reference_range || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {v.interpretation ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: isAbn ? "#fee2e2" : "#f1f5f9",
                                color: isAbn ? "#dc2626" : "#475569",
                                border: isAbn ? "1px solid #dc2626" : "none",
                              }}
                            >
                              {v.interpretation}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(viewReportModalOrder);
                  setViewMode("print_view");
                  setViewReportModalOrder(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <Printer size={15} /> Print Requisition
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                {(viewReportModalOrder.status || "").toLowerCase() !== "reviewed" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api(`/records/orders/${viewReportModalOrder.id}/status`, "POST", {
                        status: "Reviewed",
                        version: viewReportModalOrder.version,
                      });
                      queryClient.invalidateQueries({ queryKey: ["orders"] });
                      setViewReportModalOrder(null);
                      notify("Results signed and approved.");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Review & Sign Off
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewReportModalOrder(null)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SELECT LAB ORDER FOR RESULTS ENTRY MODAL */}
      {selectOrderForResultsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "720px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Enter Laboratory Results</h3>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                  Select an active requisition to enter or import laboratory test results
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectOrderForResultsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    {isGlobalMode && <th style={{ padding: "8px 12px", color: "#334155" }}>Patient</th>}
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Lab Ref.#</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Tests</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Ordered Date</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#334155" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLabOrders.filter((o) => ["pending", "partial", "ordered"].includes((o.status || "").toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={isGlobalMode ? 6 : 5} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                        No pending requisitions awaiting results entry.
                      </td>
                    </tr>
                  ) : (
                    activeLabOrders
                      .filter((o) => ["pending", "partial", "ordered"].includes((o.status || "").toLowerCase()))
                      .map((ord) => {
                        const pat = getPatientData(ord);
                        const tests = getOrderTests(ord);
                        return (
                          <tr key={ord.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {isGlobalMode && (
                              <td style={{ padding: "8px 12px" }}>
                                <strong style={{ color: "#0f172a" }}>{pat.name}</strong>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>[ {pat.mrn} ]</div>
                              </td>
                            )}
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#334155" }}>
                              {ord.lab_ref || `00020${ord.id.slice(0, 3)}`}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#1e293b" }}>{tests.join(", ")}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b" }}>{ord.ordered_date || "Today"}</td>
                            <td style={{ padding: "8px 12px" }}>{renderStatusBadge(ord.status)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setSelectOrderForResultsModal(false);
                                  setViewMode("import_result");
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "4px",
                                  border: "none",
                                  background: "#ea580c",
                                  color: "#fff",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                }}
                              >
                                Enter Results
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setSelectOrderForResultsModal(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.85rem",
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

// ==========================================
// SCREEN: ADD LAB ORDER REQUISITION BUILDER
// ==========================================
function AddLabOrderScreen({
  patientId,
  encounterId,
  labCatalogs,
  labTemplates,
  onCancel,
  onSaved,
}: {
  patientId?: string;
  encounterId?: string;
  labCatalogs: Row[];
  labTemplates: Row[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, staff, patients } = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || patients[0]?.id || "");
  const [orderedDate, setOrderedDate] = useState<string>("Nov 06, 2026");
  const [orderedBy, setOrderedBy] = useState<string>(user.id);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [isAddingTestsLoading, setIsAddingTestsLoading] = useState(false);
  const [isSavingLoading, setIsSavingLoading] = useState(false);

  // Ordered tests list
  const [orderedItems, setOrderedItems] = useState<{ labName: string; testName: string }[]>([]);

  // Notes
  const [noteLabPatient, setNoteLabPatient] = useState("");
  const [notesIntraOffice, setNotesIntraOffice] = useState("");

  const handleRemoveItem = (index: number) => {
    setOrderedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTestsFromTemplate = (testsToAdd: { labName: string; testName: string }[]) => {
    setTemplateModalOpen(false);
    setIsAddingTestsLoading(true);
    setTimeout(() => {
      setOrderedItems((prev) => {
        const existing = new Set(prev.map((x) => x.testName.toLowerCase()));
        const unique = testsToAdd.filter((x) => !existing.has(x.testName.toLowerCase()));
        return [...prev, ...unique];
      });
      setIsAddingTestsLoading(false);
    }, 450);
  };

  const handleSaveOrder = async () => {
    const effPatientId = patientId || selectedPatientId;
    if (!effPatientId) {
      alert("Please select a patient for this lab order.");
      return;
    }
    if (orderedItems.length === 0) {
      alert("Please add at least one test to the order.");
      return;
    }
    setIsSavingLoading(true);
    try {
      const primaryLab = orderedItems[0].labName;
      const testNames = orderedItems.map((x) => x.testName);
      const title = `${primaryLab} · ${testNames[0]}${testNames.length > 1 ? ` (+${testNames.length - 1} tests)` : ""}`;

      await api("/records/orders", "POST", {
        patient_id: effPatientId,
        encounter_id: encounterId || null,
        kind: "Lab",
        name: title,
        ordered_date: orderedDate,
        status: "Pending",
        notes_lab_patient: noteLabPatient,
        notes_intra_office: notesIntraOffice,
        instructions: noteLabPatient,
        order_metadata: JSON.stringify({
          primary_lab: primaryLab,
          tests: testNames,
          notes_lab_patient: noteLabPatient,
          notes_intra_office: notesIntraOffice,
        }),
      });
      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to create lab order.");
      setIsSavingLoading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Loading overlay for test additions or saving */}
      {(isAddingTestsLoading || isSavingLoading) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Loading...</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>Add Lab Order</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={isSavingLoading}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Form Controls Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "12px 0",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "16px",
          fontSize: "0.85rem",
        }}
      >
        {!patientId && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#334155", fontWeight: 600 }}>Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{
                padding: "5px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.85rem",
                minWidth: "180px",
              }}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.mrn})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#334155" }}>Ordered Date</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
            <input
              type="text"
              value={orderedDate}
              onChange={(e) => setOrderedDate(e.target.value)}
              style={{ border: "none", padding: "5px 8px", fontSize: "0.85rem", width: "110px", outline: "none" }}
            />
            <span style={{ padding: "0 6px", color: "#64748b" }}>
              <Calendar size={15} />
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#334155" }}>Ordered By</span>
          <select
            value={orderedBy}
            onChange={(e) => setOrderedBy(e.target.value)}
            style={{
              padding: "5px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              minWidth: "160px",
            }}
          >
            {staff
              .filter((s) => ["doctor", "assistant"].includes(s.role))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Action Links Bar (strictly omitting Map Dx) */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          fontSize: "0.85rem",
          color: "#0284c7",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Search & Add
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer", fontWeight: 600 }}
        >
          Templates
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => alert("Custom facility dialog")}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Add Lab
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => alert("Specimen metadata recorded.")}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Specimen Details
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => alert("No previous orders found for reordering.")}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Past Lab Orders
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => alert("All active orders view.")}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          View Orders
        </button>
      </div>

      {/* Ordered Tests Table */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "9px 14px", fontWeight: 600, color: "#334155", width: "40%" }}>Lab Name</th>
              <th style={{ padding: "9px 14px", fontWeight: 600, color: "#334155", width: "50%" }}>Test(s)</th>
              <th style={{ padding: "9px 14px", textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  No tests ordered. Click <strong style={{ color: "#0284c7" }}>Templates</strong> above to add test panels.
                </td>
              </tr>
            ) : (
              orderedItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "9px 14px", color: "#1e293b" }}>{item.labName}</td>
                  <td style={{ padding: "9px 14px", color: "#0f172a" }}>{item.testName}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                      title="Remove test"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dual Note Textareas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Note to Lab / Patient
          </label>
          <textarea
            rows={4}
            value={noteLabPatient}
            onChange={(e) => setNoteLabPatient(e.target.value)}
            placeholder="e.g. 12-hour overnight fasting required; draw prior to morning dose..."
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
              Intra Office Notes
            </label>
            <span style={{ fontSize: "0.75rem", color: "#dc2626", fontStyle: "italic" }}>
              Notes not shared with patient.
            </span>
          </div>
          <textarea
            rows={4}
            value={notesIntraOffice}
            onChange={(e) => setNotesIntraOffice(e.target.value)}
            placeholder="Internal coordination notes (e.g. sample stored in rack B; alert Dr. on arrival)..."
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Templates Modal */}
      {templateModalOpen && (
        <TemplatesModal
          labCatalogs={labCatalogs}
          labTemplates={labTemplates}
          onClose={() => setTemplateModalOpen(false)}
          onAdd={handleAddTestsFromTemplate}
        />
      )}
    </div>
  );
}

// ==========================================
// MODAL: TEMPLATES (PRACTICE & MY TEMPLATES)
// ==========================================
function TemplatesModal({
  labCatalogs,
  labTemplates,
  onClose,
  onAdd,
}: {
  labCatalogs: Row[];
  labTemplates: Row[];
  onClose: () => void;
  onAdd: (tests: { labName: string; testName: string }[]) => void;
}) {
  // Practice template list
  const practiceList = useMemo(() => {
    return [
      "AFB Sputum",
      "Allergy Profile",
      "Anemia Profile",
      "Blood Group",
      "eGFR",
      "Heart Failure Plus",
      "HUH - EECP Routine",
      "HUH - EECP Routine Out",
      "HUH-Cardio Diabetic",
      "HUH-CD Diabetic Routine",
      "HUH-CD-Diabetic",
      "Lab Orders",
      "Master Health Checkup",
    ];
  }, []);

  const [selectedTemplateName, setSelectedTemplateName] = useState("HUH-Cardio Diabetic");
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});

  // Get active template tests from database catalog or default definitions
  const activeTemplateData = useMemo(() => {
    const found = labTemplates.find((t) => t.name === selectedTemplateName);
    if (found?.content) {
      try {
        return JSON.parse(found.content);
      } catch { }
    }
    // Default fallback mapping for HUH-Cardio Diabetic
    if (selectedTemplateName === "HUH-Cardio Diabetic") {
      return {
        category: "HUH-Cardio Diabetic",
        tests: [
          "HUH-CD-Bone Marker",
          "HUH-CD-Cardiac Risk Marker",
          "HUH-CD-Complete Hemogram",
          "HUH-CD-Diabetes",
          "HUH-CD-Electrolytes",
          "HUH-CD-Free Thyroid",
          "HUH-CD-Gout Marker",
          "HUH-CD-Iron Deficiency Profile",
          "HUH-CD-Kidney Microvascular",
          "HUH-CD-Lipid Profile",
          "HUH-CD-Liver Function Test",
          "HUH-CD-Pancreas Profile",
          "HUH-CD-Renal Function Test",
          "HUH-CD-Trace Micronutrients",
          "HUH-CD-Urine Routine",
          "HUH-CD-Vitamins",
        ],
      };
    }
    if (selectedTemplateName === "AFB Sputum") {
      return { category: "Microbiology", tests: ["AFB Suptum"] };
    }
    return {
      category: selectedTemplateName,
      tests: ["Test Panel A", "Test Panel B", "Test Panel C"],
    };
  }, [selectedTemplateName, labTemplates]);

  const testList: string[] = activeTemplateData.tests || [];
  const categoryName: string = activeTemplateData.category || selectedTemplateName;

  // Filtered tests by search box
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return testList;
    return testList.filter((t) => t.toLowerCase().includes(testSearch.toLowerCase()));
  }, [testList, testSearch]);

  // Toggle single test
  const handleToggleTest = (name: string) => {
    setSelectedTests((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Select all toggle
  const allChecked = filteredTests.length > 0 && filteredTests.every((t) => !!selectedTests[t]);
  const handleToggleAll = () => {
    const nextState = !allChecked;
    const update = { ...selectedTests };
    filteredTests.forEach((t) => {
      update[t] = nextState;
    });
    setSelectedTests(update);
  };

  const handleAddClicked = () => {
    const toAdd = testList
      .filter((t) => !!selectedTests[t])
      .map((t) => ({ labName: categoryName, testName: t }));

    if (toAdd.length === 0) {
      alert("Please select at least one test from the template.");
      return;
    }
    onAdd(toAdd);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "6px",
          width: "900px",
          maxWidth: "95vw",
          height: "560px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#334155" }}>
            Templates added under &apos;Settings &gt; Templates &gt; Lab Record&apos; are listed here.{" "}
            <a href="#/settings" style={{ color: "#0284c7", textDecoration: "none" }}>
              Create new template
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Split-Pane Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left Pane: Practice & My Templates */}
          <div
            style={{
              width: "250px",
              borderRight: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Practice Templates Accordion */}
            <div style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
              Practice Templates
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {practiceList.map((name) => {
                const isActive = selectedTemplateName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateName(name);
                      setSelectedTests({});
                    }}
                    style={{
                      background: isActive ? "#ffffff" : "transparent",
                      border: "none",
                      borderLeft: isActive ? "3px solid #0d9488" : "3px solid transparent",
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: "0.82rem",
                      color: isActive ? "#0d9488" : "#334155",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* My Templates Accordion */}
            <div
              style={{
                padding: "12px 14px 6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "#64748b",
                borderTop: "1px solid #e2e8f0",
                marginTop: "10px",
              }}
            >
              My Templates
            </div>
            <div style={{ padding: "4px 14px 10px", fontSize: "0.78rem", color: "#94a3b8" }}>
              (Personal saved templates)
            </div>
          </div>

          {/* Right Pane: Test Selector with 3-Column Grid */}
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* Top Controls: Select All & Search */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={allChecked} onChange={handleToggleAll} />
                <span>Select All</span>
              </label>

              <div style={{ position: "relative", width: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "8px", top: "7px", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by Test Name or Code"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px 4px 26px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>

            {/* Category Header Checkbox */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={handleToggleAll}
                />
                <span style={{ color: "#0f172a" }}>{categoryName}</span>
              </label>
            </div>

            {/* 3-COLUMN RESPONSIVE CHECKBOX GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px 16px",
                fontSize: "0.82rem",
              }}
            >
              {filteredTests.map((tName) => {
                const checked = !!selectedTests[tName];
                return (
                  <label
                    key={tName}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "7px",
                      cursor: "pointer",
                      lineHeight: "1.25",
                      color: checked ? "#0f172a" : "#334155",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleTest(tName)}
                      style={{ marginTop: "2px" }}
                    />
                    <span>{tName}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={handleAddClicked}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN: IMPORT LAB RESULT (AUTO-INTERPRETATION)
// ==========================================
function ImportLabResultScreen({
  order,
  labCatalogs,
  onCancel,
  onSaved,
}: {
  order: Row;
  labCatalogs: Row[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, notify } = useApp();
  const [resultDate, setResultDate] = useState("Nov 06, 2026");
  const [resultTime, setResultTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Parse tests inside this order
  const testNames = useMemo(() => {
    if (order.order_metadata) {
      try {
        const meta = JSON.parse(order.order_metadata);
        if (Array.isArray(meta.tests)) return meta.tests;
      } catch { }
    }
    if (order.name) {
      if (order.name.includes(" · ")) {
        return [order.name.split(" · ")[1].trim()];
      }
      return [order.name];
    }
    return ["Test Panel"];
  }, [order]);

  // Card collapsed states
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Structured Analyte Entry State
  // Map of testName -> Array of Analyte records
  interface AnalyteItem {
    name: string;
    result: string;
    unit: string;
    minRef?: number;
    maxRef?: number;
    textRef?: string;
    interpretation: string; // '-', 'Normal', 'Low', 'High', 'Abnormal'
    comments: string;
  }

  const [analyteState, setAnalyteState] = useState<Record<string, AnalyteItem[]>>({});

  // Initialize analyte state from catalog compendium and preloaded values
  useEffect(() => {
    const existingValues: any[] = order.values || [];
    const initial: Record<string, AnalyteItem[]> = {};

    testNames.forEach((tName: string) => {
      // Find matching catalog entry for this test
      const matchedCatalog = labCatalogs.find((c) => {
        const cName = c.name.toLowerCase();
        return cName.includes(tName.toLowerCase()) || tName.toLowerCase().includes(cName);
      });

      let params: any[] = [];
      if (matchedCatalog?.content) {
        try {
          params = JSON.parse(matchedCatalog.content).parameters || [];
        } catch { }
      }

      // If no catalog params found, provide representative analytes based on test name
      if (params.length === 0) {
        if (tName.includes("Bone Marker")) {
          params = [
            { name: "Calcium", unit: "mg/dL" },
            { name: "Magnesium", unit: "mg/dL" },
            { name: "Phosphorous", unit: "mg/dL" },
          ];
        } else if (tName.includes("Cardiac Risk Marker")) {
          params = [
            { name: "Apolipoprotein-A1", unit: "mg/dL" },
            { name: "Apolipoprotein-B", unit: "mg/dL" },
            { name: "Apo B/Apo A1 Ratio", unit: "Ratio" },
            { name: "Lipoprotein", unit: "mg/dL" },
          ];
        } else if (tName.includes("Complete Hemogram")) {
          params = [
            { name: "Red Cell Distribution Width SD", unit: "fL" },
            { name: "Red Cell Distribution Width CV", unit: "%" },
            { name: "Total WBC Count", unit: "cells/cumm" },
            { name: "Neutrophils", unit: "%" },
            { name: "Lymphocytes", unit: "%" },
            { name: "Eosinophils", unit: "%" },
            { name: "Monocytes", unit: "%" },
            { name: "Basophils", unit: "%" },
          ];
        } else {
          params = [{ name: tName, unit: "" }];
        }
      }

      // Build AnalyteItem array
      initial[tName] = params.map((p) => {
        const pKey = p.name.toLowerCase();
        const refDict = KNOWN_LAB_RANGES[pKey] || {};
        const exist = existingValues.find(
          (v) => v.parameter?.toLowerCase() === pKey && (!v.test_name || v.test_name === tName)
        );

        return {
          name: p.name,
          result: exist?.value || "",
          unit: p.unit || refDict.unit || "",
          minRef: refDict.min,
          maxRef: refDict.max,
          textRef: refDict.text || p.reference_range || "",
          interpretation: exist?.interpretation || "-",
          comments: exist?.comments || "",
        };
      });
    });

    setAnalyteState(initial);
  }, [order, testNames, labCatalogs]);

  // Handle Result input change with INSTANT AUTO-INTERPRETATION
  const handleResultChange = (tName: string, idx: number, val: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const target = { ...items[idx], result: val };

      // Auto-evaluation logic against Min/Max
      if (val.trim() === "") {
        target.interpretation = "-";
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (target.minRef !== undefined && num < target.minRef) {
            target.interpretation = "Low";
          } else if (target.maxRef !== undefined && num > target.maxRef) {
            target.interpretation = "High";
          } else if (target.minRef !== undefined || target.maxRef !== undefined) {
            target.interpretation = "Normal";
          }
        }
      }

      items[idx] = target;
      return { ...prev, [tName]: items };
    });
  };

  const handleInterpretationChange = (tName: string, idx: number, interp: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], interpretation: interp };
      return { ...prev, [tName]: items };
    });
  };

  const handleCommentsChange = (tName: string, idx: number, comm: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], comments: comm };
      return { ...prev, [tName]: items };
    });
  };

  // Calculate completed count
  const completedTestCount = useMemo(() => {
    let count = 0;
    Object.entries(analyteState).forEach(([_, items]) => {
      if (items.length > 0 && items.every((x) => x.result.trim() !== "")) {
        count++;
      }
    });
    return count;
  }, [analyteState]);

  // Save all results
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payloadValues: any[] = [];
      let totalTestsWithResults = 0;

      Object.entries(analyteState).forEach(([tName, items]) => {
        let hasAny = false;
        items.forEach((item) => {
          if (item.result.trim() !== "") {
            hasAny = true;
            payloadValues.push({
              test_name: tName,
              parameter: item.name,
              value: item.result.trim(),
              unit: item.unit || "",
              reference_range:
                item.minRef !== undefined && item.maxRef !== undefined
                  ? `Min ${item.minRef} - Max ${item.maxRef}`
                  : item.textRef || "",
              interpretation: item.interpretation,
              comments: item.comments || "",
            });
          }
        });
        if (hasAny) totalTestsWithResults++;
      });

      // Compute order status
      let nextStatus = "Pending";
      if (totalTestsWithResults === testNames.length && testNames.length > 0) {
        nextStatus = "Completed";
      } else if (totalTestsWithResults > 0) {
        nextStatus = "Partial";
      }

      await api(`/orders/${order.id}/result`, "POST", {
        version: order.version,
        status: nextStatus,
        result: `Entered results for ${totalTestsWithResults} of ${testNames.length} laboratory test panels.`,
        values: payloadValues,
      });

      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save results.");
      setIsSaving(false);
    }
  };

  // Simulated PDF upload
  const handlePdfUpload = (tName: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      notify(`PDF laboratory report "${file.name}" uploaded for ${tName}.`);
    };
    input.click();
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Loading overlay during save */}
      {isSaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Loading...</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>Import Lab Result</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Metadata Row 1 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          padding: "10px 0",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          <div>
            <span style={{ color: "#64748b" }}>Ordered By : </span>
            <strong style={{ color: "#1e293b" }}>{user.name}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Ordered On : </span>
            <strong style={{ color: "#1e293b" }}>{order.ordered_date || "Nov 06, 2026"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          <div>
            <span style={{ color: "#64748b" }}>No of Tests : </span>
            <strong style={{ color: "#1e293b" }}>{testNames.length}</strong>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Completed : </span>
            <strong style={{ color: "#1e293b" }}>{completedTestCount}</strong>
          </div>
          <button
            type="button"
            onClick={() => alert("Specimen Details")}
            style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", padding: 0 }}
          >
            Specimen Details
          </button>
        </div>
      </div>

      {/* Metadata Row 2 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          marginBottom: "16px",
        }}
      >
        <div>
          <span style={{ color: "#64748b" }}>Lab Name : </span>
          <strong style={{ color: "#1e293b" }}>
            {order.name.includes(" · ") ? order.name.split(" · ")[0] : "Diagnostic Laboratory"}
          </strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "#64748b" }}>Result Date Time</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
            <input
              type="text"
              value={resultDate}
              onChange={(e) => setResultDate(e.target.value)}
              style={{ border: "none", padding: "4px 8px", fontSize: "0.85rem", width: "100px", outline: "none" }}
            />
            <span style={{ padding: "0 4px", color: "#64748b" }}>
              <Calendar size={14} />
            </span>
          </div>
          <input
            type="text"
            placeholder="hh:mm"
            value={resultTime}
            onChange={(e) => setResultTime(e.target.value)}
            style={{ width: "65px", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* COLLAPSIBLE TEST CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {testNames.map((tName: string) => {
          const isCollapsed = !!collapsedCards[tName];
          const items = analyteState[tName] || [];
          const isTestComplete = items.length > 0 && items.every((x) => x.result.trim() !== "");

          return (
            <div
              key={tName}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{tName}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isTestComplete ? "#16a34a" : "#ea580c",
                    }}
                  >
                    [ {isTestComplete ? "Completed" : "Pending"} ]
                  </span>
                  <button
                    type="button"
                    onClick={() => setCollapsedCards((prev) => ({ ...prev, [tName]: !prev[tName] }))}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {/* Card Subheader & Table */}
              {!isCollapsed && (
                <div style={{ padding: "12px 14px" }}>
                  {/* Result PDF Upload Button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "0.85rem", color: "#334155" }}>Result PDF:</span>
                    <button
                      type="button"
                      onClick={() => handlePdfUpload(tName)}
                      style={{
                        backgroundColor: "#ea580c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "4px 10px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Upload
                    </button>
                  </div>

                  {/* Analyte Parameter Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Name</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "14%" }}>Result</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "8%" }}>Unit</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Reference</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "16%" }}>Param Interpretation</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "18%" }}>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((analyte, idx) => {
                        const isAbnormal = ["Low", "High", "Abnormal"].includes(analyte.interpretation);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                            {/* Name */}
                            <td style={{ padding: "8px 8px", color: "#1e293b", fontWeight: 500 }}>
                              {analyte.name}
                            </td>

                            {/* Result Input (turns RED BORDER on Low/High!) */}
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={analyte.result}
                                onChange={(e) => handleResultChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.85rem",
                                  outline: "none",
                                }}
                              />
                            </td>

                            {/* Unit */}
                            <td style={{ padding: "8px 8px", color: "#64748b" }}>
                              {analyte.unit}
                            </td>

                            {/* Reference: Min/Max or Text */}
                            <td style={{ padding: "8px 8px" }}>
                              {analyte.minRef !== undefined || analyte.maxRef !== undefined ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Min</span>
                                    <input
                                      type="text"
                                      readOnly
                                      value={analyte.minRef ?? ""}
                                      style={{
                                        width: "48px",
                                        padding: "3px 4px",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "3px",
                                        fontSize: "0.8rem",
                                        background: "#f8fafc",
                                        color: "#334155",
                                      }}
                                    />
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Max</span>
                                    <input
                                      type="text"
                                      readOnly
                                      value={analyte.maxRef ?? ""}
                                      style={{
                                        width: "52px",
                                        padding: "3px 4px",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "3px",
                                        fontSize: "0.8rem",
                                        background: "#f8fafc",
                                        color: "#334155",
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <textarea
                                  readOnly
                                  rows={1}
                                  value={analyte.textRef || ""}
                                  style={{
                                    width: "100%",
                                    padding: "3px 6px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "3px",
                                    fontSize: "0.78rem",
                                    background: "#f8fafc",
                                    color: "#334155",
                                    resize: "none",
                                  }}
                                />
                              )}
                            </td>

                            {/* Param Interpretation Dropdown (turns RED BORDER on Low/High!) */}
                            <td style={{ padding: "8px 8px" }}>
                              <select
                                value={analyte.interpretation}
                                onChange={(e) => handleInterpretationChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 6px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.82rem",
                                  outline: "none",
                                }}
                              >
                                <option value="-">-</option>
                                <option value="Normal">Normal</option>
                                <option value="Low">Low</option>
                                <option value="High">High</option>
                                <option value="Abnormal">Abnormal</option>
                              </select>
                            </td>

                            {/* Comments */}
                            <td style={{ padding: "8px 8px" }}>
                              <textarea
                                rows={1}
                                value={analyte.comments}
                                onChange={(e) => handleCommentsChange(tName, idx, e.target.value)}
                                placeholder=""
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.8rem",
                                  resize: "vertical",
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// PRINTABLE REQUISITION VIEW
// ==========================================
function PrintRequisitionView({
  order,
  patientId,
  onClose,
}: {
  order: Row;
  patientId?: string;
  onClose: () => void;
}) {
  const { patients, staff } = useApp();
  const pid = patientId || order.patient_id;
  const patient = patients.find((p) => p.id === pid);

  const tests = useMemo(() => {
    if (order.order_metadata) {
      try {
        const m = JSON.parse(order.order_metadata);
        if (Array.isArray(m.tests)) return m.tests;
      } catch { }
    }
    return [order.name];
  }, [order]);

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            backgroundColor: "#ea580c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Printer size={16} /> Print Requisition
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Back to Orders
        </button>
      </div>

      <div
        id="requisition-printable"
        style={{
          border: "1px solid #000",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "14px", marginBottom: "20px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", textTransform: "uppercase" }}>Heal Your Heart Clinic</h1>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>Diagnostic & EECP Center · Tamil Nadu</div>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>Phone: +91 44 2449 0000 · Reg: HYH-CL-TN01</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>LABORATORY REQUISITION</h2>
            <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>
              REF: {order.lab_ref || `00020${order.id.slice(0, 3)}`}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Date: {order.ordered_date || "Nov 06, 2026"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", fontSize: "0.9rem" }}>
          <div>
            <div><strong>Patient Name:</strong> {patient?.name || `${patient?.first_name || ""} ${patient?.last_name || ""}`}</div>
            <div><strong>MRN:</strong> {patient?.mrn || "HYN-MR-000001"}</div>
            <div><strong>DOB / Age / Sex:</strong> {patient?.dob || "1968-01-12"} ({patient?.sex || "Male"})</div>
          </div>
          <div>
            <div><strong>Ordering Clinician:</strong> {staff.find((s) => s.id === order.author_id)?.name || "Dr. Ananya Demo"}</div>
            <div><strong>Clinical Priority:</strong> Routine</div>
            <div><strong>Status:</strong> {order.status}</div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "0.95rem", borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "10px" }}>
            ORDERED LABORATORY PANELS ({tests.length})
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "6px" }}>#</th>
                <th style={{ padding: "6px" }}>Panel Name</th>
                <th style={{ padding: "6px" }}>Specimen Required</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((tName: string, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px" }}>{i + 1}</td>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{tName}</td>
                  <td style={{ padding: "6px" }}>Blood (Serum) / EDTA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {order.notes_lab_patient && (
          <div style={{ marginBottom: "24px", fontSize: "0.85rem" }}>
            <strong>Special Instructions / Patient Preparation:</strong>
            <div style={{ border: "1px solid #ddd", padding: "8px", marginTop: "4px", borderRadius: "3px" }}>
              {order.notes_lab_patient}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", fontSize: "0.85rem" }}>
          <div>
            <div>Phlebotomist Signature: _________________________</div>
            <div style={{ marginTop: "4px" }}>Date & Time: ________________________________</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>Clinician Signature: _________________________</div>
            <div style={{ marginTop: "4px" }}>Dr. Ananya Demo, M.D.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
