import React, { useState, useEffect, useMemo } from "react";
import {
  Syringe,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  X,
  Calendar,
  User,
  Shield,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api, navigate, Row } from "./api";
import { useApp } from "./context";
import { InjectionAutocomplete } from "./InjectionAutocomplete";

// Cardiology Quick Order Presets matching practice formulary & CharmHealth video
const INJECTION_PRESETS = [
  {
    name: "Lasix 20 mg ( 10 mg x 2 ml )",
    dose: "2.0 ml",
    route: "Intravenous",
    site: "Basilic Vein - RH",
    frequency: "Once",
    period: 2,
    period_unit: "Day(s)",
    nurse_notes: "Start Immediate",
    comments: "Post Blood pressure and pulse rate monitor",
  },
  {
    name: "Orofer FCM 1K Injection 20 ml",
    dose: "1.0 gm",
    route: "Intravenous",
    site: "Cephalic Vein - RH",
    frequency: "Once a week",
    period: 2,
    period_unit: "Week(s)",
    nurse_notes:
      "Ferric Carboxymaltose: Dosage 50 mg / ml : 20 ml Vial Dilute it in 100 ml normal saline. Infusion slowly for 30 minutes. Flush with 0.9 ml saline before and after infusion.",
    comments: "Follow up for black stool. Dizziness and injection site reaction.",
  },
  {
    name: "Heparin Sodium 5,000 IU/mL",
    dose: "5,000 IU",
    route: "Subcutaneous",
    site: "Abdomen lower left",
    frequency: "Once",
    period: 1,
    period_unit: "Day(s)",
    nurse_notes: "Rotate injection site daily",
    comments: "Monitor aPTT levels closely",
  },
  {
    name: "Fondaflo 2.5 Injection",
    dose: "2.5 mg / 0.5 ml",
    route: "Subcutaneous",
    site: "Abdomen lower right",
    frequency: "Once a day",
    period: 5,
    period_unit: "Day(s)",
    nurse_notes: "Do not expel air bubble before injection",
    comments: "DVT and acute coronary syndrome management",
  },
  {
    name: "Clexane (Enoxaparin) 40 mg/0.4 mL",
    dose: "40 mg",
    route: "Subcutaneous",
    site: "Abdomen lower left",
    frequency: "Once a day",
    period: 7,
    period_unit: "Day(s)",
    nurse_notes: "Alternate between left and right anterolateral abdominal wall",
    comments: "Post-intervention anticoagulation prophylaxis",
  },
];

const VACCINE_PRESETS = [
  {
    name: "Influenza Vaccine (Quadrivalent)",
    cvx: "141",
    dose: "0.5 mL",
    route: "Intramuscular",
    site: "Right Deltoid",
    series: 1,
    notes: "Annual cardiovascular influenza prophylaxis",
  },
  {
    name: "Pneumococcal Conjugate (PCV13)",
    cvx: "133",
    dose: "0.5 mL",
    route: "Intramuscular",
    site: "Left Deltoid",
    series: 1,
    notes: "Recommended for high-risk CAD / HF patients",
  },
  {
    name: "Pneumococcal Polysaccharide (PPSV23)",
    cvx: "33",
    dose: "0.5 mL",
    route: "Intramuscular",
    site: "Left Deltoid",
    series: 1,
    notes: "Sequential booster 1 year post-PCV13",
  },
  {
    name: "Hepatitis B (Recombinant)",
    cvx: "43",
    dose: "1.0 mL",
    route: "Intramuscular",
    site: "Right Deltoid",
    series: 1,
    notes: "Routine vaccination for dialysis and high-risk patients",
  },
];

export function CharmInjectionsGlobal() {
  const { user, staff, patients, notify } = useApp();

  // Primary Tabs: Injection Orders | Vaccine Orders (Frame 0026 & 0027)
  const [activeTab, setActiveTab] = useState<"injections" | "vaccines">("injections");

  // Filters (Frame 0026 & 0027)
  const [orderedByFilter, setOrderedByFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("pending_partial");
  const [patientSearch, setPatientSearch] = useState<string>("");

  // Data state
  const [injections, setInjections] = useState<Row[]>([]);
  const [vaccines, setVaccines] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [addInjectionModal, setAddInjectionModal] = useState<boolean>(false);
  const [addVaccineModal, setAddVaccineModal] = useState<boolean>(false);
  const [administerModal, setAdministerModal] = useState<{
    open: boolean;
    item: Row | null;
    type: "injection" | "vaccine";
  }>({ open: false, item: null, type: "injection" });

  // Load records
  const loadRecords = async () => {
    setLoading(true);
    try {
      const [ordersRes, injRes, vacRes] = await Promise.all([
        api<Row[]>("/injections/orders"),
        api<Row[]>("/records/injections"),
        api<Row[]>("/records/vaccines"),
      ]);
      const combinedInjections = [
        ...(ordersRes || []).map((o) => ({
          ...o,
          id: o.id,
          is_order: true,
          patient_id: o.patient_id,
          name: o.medication_name_snapshot || o.name,
          dose: o.dosage,
          dosage: o.dosage,
          status: o.status || "ordered",
          created_at: o.ordered_at || o.created_at,
          ordered_at: o.ordered_at || o.created_at,
          ordered_by_name: o.ordered_by_name,
          nurse_notes: o.nurse_note || o.nurse_notes,
        })),
        ...(injRes || []).filter((r) => !ordersRes?.some((o) => o.id === r.order_id || o.id === r.id)),
      ];
      setInjections(combinedInjections);
      setVaccines(vacRes || []);
    } catch (err) {
      console.error("Failed to load injection/vaccine records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Filtered Injections
  const filteredInjections = useMemo(() => {
    return injections.filter((inj) => {
      // Status filter
      if (statusFilter === "pending_partial") {
        if (inj.status === "administered" || inj.status === "completed" || inj.status === "cancelled") {
          return false;
        }
      } else if (statusFilter === "administered") {
        if (inj.status !== "administered" && inj.status !== "completed") return false;
      } else if (statusFilter === "ordered") {
        if (inj.status !== "ordered" && inj.status !== "pending") return false;
      } else if (statusFilter === "cancelled") {
        if (inj.status !== "cancelled") return false;
      }

      // Ordered By filter
      if (orderedByFilter !== "ALL") {
        const orderAuthor = inj.author_id || inj.administered_by;
        if (orderAuthor !== orderedByFilter) {
          // match by name if stored
          const staffObj = staff.find((s) => s.id === orderedByFilter);
          if (staffObj && inj.ordered_by_name !== staffObj.name && inj.ordered_by_name !== `Dr. ${staffObj.name}`) {
            return false;
          }
        }
      }

      // Patient & Injection / Drug Search Filter
      if (patientSearch.trim()) {
        const query = patientSearch.toLowerCase().trim();
        const pName = (inj.patient_name || "").toLowerCase();
        const pMrn = (inj.patient_mrn || "").toLowerCase();
        const drug = (inj.medication_name_snapshot || inj.name || inj.drug_name || "").toLowerCase();
        const lot = (inj.lot_number || "").toLowerCase();
        const site = (inj.site || "").toLowerCase();
        const doc = (inj.ordered_by_name || "").toLowerCase();
        if (
          !pName.includes(query) &&
          !pMrn.includes(query) &&
          !drug.includes(query) &&
          !lot.includes(query) &&
          !site.includes(query) &&
          !doc.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [injections, statusFilter, orderedByFilter, patientSearch, staff]);

  // Filtered Vaccines
  const filteredVaccines = useMemo(() => {
    return vaccines.filter((vac) => {
      // Status filter
      if (statusFilter === "pending_partial") {
        if (vac.status === "administered" || vac.status === "completed" || vac.status === "cancelled") {
          return false;
        }
      } else if (statusFilter === "administered") {
        if (vac.status !== "administered" && vac.status !== "completed") return false;
      } else if (statusFilter === "ordered") {
        if (vac.status !== "ordered" && vac.status !== "pending") return false;
      } else if (statusFilter === "cancelled") {
        if (vac.status !== "cancelled") return false;
      }

      // Ordered By filter
      if (orderedByFilter !== "ALL") {
        const orderAuthor = vac.ordered_by || vac.author_id || vac.administered_by;
        if (orderAuthor !== orderedByFilter) {
          const staffObj = staff.find((s) => s.id === orderedByFilter);
          if (staffObj && vac.ordered_by_name !== staffObj.name && vac.ordered_by_name !== `Dr. ${staffObj.name}`) {
            return false;
          }
        }
      }

      // Patient search filter
      if (patientSearch.trim()) {
        const query = patientSearch.toLowerCase().trim();
        const pName = (vac.patient_name || "").toLowerCase();
        const pMrn = (vac.patient_mrn || "").toLowerCase();
        const vName = (vac.vaccine_name || "").toLowerCase();
        if (!pName.includes(query) && !pMrn.includes(query) && !vName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [vaccines, statusFilter, orderedByFilter, patientSearch, staff]);

  // Helper date formatter
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "Nov 07, 2026";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  // Delete handler
  const handleDelete = async (id: string, type: "injection" | "vaccine") => {
    if (!confirm(`Are you sure you want to delete this ${type} order?`)) return;
    try {
      const item = injections.find((i) => i.id === id);
      if (type === "injection" && item?.is_order) {
        await api(`/injections/orders/${id}`, "DELETE");
      } else {
        await api(`/records/${type === "injection" ? "injections" : "vaccines"}/${id}`, "DELETE");
      }
      notify(`${type === "injection" ? "Injection" : "Vaccine"} order deleted successfully.`);
      loadRecords();
    } catch (err) {
      console.error(err);
      notify("Failed to delete order.");
    }
  };

  return (
    <div style={{ padding: "16px 24px", minHeight: "100%", background: "#f8fafc" }}>
      {/* 1. TOP SUBTABS (Frame 0026 & Frame 0027) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          padding: "0 16px",
          borderRadius: "6px 6px 0 0",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("injections")}
          style={{
            padding: "12px 4px",
            fontSize: 14,
            fontWeight: activeTab === "injections" ? 600 : 500,
            color: activeTab === "injections" ? "#00838f" : "#64748b",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "injections" ? "2px solid #00838f" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Injection Orders
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vaccines")}
          style={{
            padding: "12px 4px",
            fontSize: 14,
            fontWeight: activeTab === "vaccines" ? 600 : 500,
            color: activeTab === "vaccines" ? "#00838f" : "#64748b",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "vaccines" ? "2px solid #00838f" : "2px solid transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Vaccine Orders
        </button>
      </div>

      {/* 2. FILTER CONTROLS & ACTION BUTTON (Frame 0026 & Frame 0027) */}
      <div
        style={{
          background: "#ffffff",
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          borderTop: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          {/* Ordered By Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>Ordered By</label>
            <select
              value={orderedByFilter}
              onChange={(e) => setOrderedByFilter(e.target.value)}
              style={{
                height: 34,
                padding: "0 10px",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                color: "#1e293b",
                background: "#ffffff",
                minWidth: 160,
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Providers</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.startsWith("Dr.") ? s.name : `Dr. ${s.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 34,
                padding: "0 10px",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                color: "#1e293b",
                background: "#ffffff",
                minWidth: 150,
                cursor: "pointer",
              }}
            >
              <option value="pending_partial">Pending / Partial</option>
              <option value="ALL">All</option>
              <option value="ordered">Ordered</option>
              <option value="administered">Administered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Patient Search Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>Patient</label>
            <div style={{ position: "relative", display: "inline-block" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                placeholder="Search Patient, Drug, Injection..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={{
                  height: 34,
                  padding: "0 12px 0 28px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  color: "#1e293b",
                  width: 250,
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Button: + Injection Order / + Vaccine Order (CharmHealth Theme) */}
        <div>
          {activeTab === "injections" ? (
            <button
              type="button"
              className="charm-btn-teal"
              onClick={() => setAddInjectionModal(true)}
              style={{
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={15} />
              Injection Order
            </button>
          ) : (
            <button
              type="button"
              className="charm-btn-teal"
              onClick={() => setAddVaccineModal(true)}
              style={{
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={15} />
              Vaccine Order
            </button>
          )}
        </div>
      </div>

      {/* 3. TABLE SECTION (Frame 0026 & Frame 0027) */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          overflowX: "auto",
        }}
      >
        {activeTab === "injections" ? (
          /* =========================================================================
             INJECTION ORDERS TABLE (Frame 0026)
             Columns: Patient | Drug Name | Ordered On | Ordered By | Order Status | Actions
             ========================================================================= */
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "22%" }}>Patient</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "32%" }}>Drug Name</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "14%" }}>Ordered On</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "16%" }}>Ordered By</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "12%" }}>Order Status</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "10%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInjections.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#64748b" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                filteredInjections.map((inj) => {
                  const isOrdered = inj.status === "ordered" || inj.status === "pending";
                  const isAdministered = inj.status === "administered" || inj.status === "completed";
                  return (
                    <tr
                      key={inj.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Patient */}
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/patients/${inj.patient_id}`)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#00838f",
                            fontWeight: 600,
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 13,
                          }}
                        >
                          {inj.patient_name || "Unknown Patient"}
                        </button>
                        {inj.patient_mrn && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            [{inj.patient_mrn}]
                          </div>
                        )}
                      </td>

                      {/* Drug Name */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{inj.name}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                          {[inj.dose, inj.route, inj.site].filter(Boolean).join(" · ")}
                        </div>
                        {inj.nurse_notes && (
                          <div style={{ fontSize: 11, color: "#0284c7", marginTop: 3 }}>
                            Note: {inj.nurse_notes}
                          </div>
                        )}
                      </td>

                      {/* Ordered On */}
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {formatDate(inj.created_at || inj.administered_at)}
                      </td>

                      {/* Ordered By */}
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {inj.ordered_by_name || inj.administered_by_name || "Dr. Ramasamy S"}
                      </td>

                      {/* Order Status */}
                      <td style={{ padding: "12px 16px" }}>
                        {isAdministered ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Check size={11} /> Administered
                          </span>
                        ) : isOrdered ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#fffbeb",
                              color: "#d97706",
                              border: "1px solid #fde68a",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={11} /> Ordered
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "#f1f5f9",
                              color: "#64748b",
                              border: "1px solid #cbd5e1",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {inj.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {isOrdered && (
                            <button
                              type="button"
                              onClick={() => setAdministerModal({ open: true, item: inj, type: "injection" })}
                              style={{
                                background: "#00838f",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 3,
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Administer injection"
                            >
                              Administer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(inj.id, "injection")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Delete order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* =========================================================================
             VACCINE ORDERS TABLE (Frame 0027)
             Columns: Patient | Vaccine Name | Ordered On | Ordered By | Order Status | Actions
             ========================================================================= */
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "22%" }}>Patient</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "32%" }}>Vaccine Name</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "14%" }}>Ordered On</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "16%" }}>Ordered By</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "12%" }}>Order Status</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, width: "10%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVaccines.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#64748b" }}>
                    No data available
                  </td>
                </tr>
              ) : (
                filteredVaccines.map((vac) => {
                  const isOrdered = vac.status === "ordered" || vac.status === "pending";
                  const isAdministered = vac.status === "administered" || vac.status === "completed";
                  return (
                    <tr
                      key={vac.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Patient */}
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/patients/${vac.patient_id}`)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#00838f",
                            fontWeight: 600,
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 13,
                          }}
                        >
                          {vac.patient_name || "Unknown Patient"}
                        </button>
                        {vac.patient_mrn && (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            [{vac.patient_mrn}]
                          </div>
                        )}
                      </td>

                      {/* Vaccine Name */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>
                          {vac.vaccine_name || vac.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                          {[
                            vac.dose,
                            vac.route,
                            vac.site,
                            vac.series_number ? `Dose #${vac.series_number}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        {vac.notes && (
                          <div style={{ fontSize: 11, color: "#0284c7", marginTop: 3 }}>
                            Note: {vac.notes}
                          </div>
                        )}
                      </td>

                      {/* Ordered On */}
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {formatDate(vac.created_at || vac.administered_at)}
                      </td>

                      {/* Ordered By */}
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {vac.ordered_by_name || vac.administered_by_name || "Dr. Ramasamy S"}
                      </td>

                      {/* Order Status */}
                      <td style={{ padding: "12px 16px" }}>
                        {isAdministered ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Check size={11} /> Administered
                          </span>
                        ) : isOrdered ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#fffbeb",
                              color: "#d97706",
                              border: "1px solid #fde68a",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            <Clock size={11} /> Ordered
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              background: "#f1f5f9",
                              color: "#64748b",
                              border: "1px solid #cbd5e1",
                              borderRadius: 12,
                              padding: "2px 9px",
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {vac.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {isOrdered && (
                            <button
                              type="button"
                              onClick={() => setAdministerModal({ open: true, item: vac, type: "vaccine" })}
                              style={{
                                background: "#00838f",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 3,
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Administer vaccine"
                            >
                              Administer
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(vac.id, "vaccine")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#94a3b8",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Delete order"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. ADD INJECTION ORDER MODAL */}
      {addInjectionModal && (
        <AddInjectionOrderModal
          patients={patients}
          staff={staff}
          user={user}
          onClose={() => setAddInjectionModal(false)}
          onSuccess={() => {
            setAddInjectionModal(false);
            notify("Injection order created successfully.");
            loadRecords();
          }}
        />
      )}

      {/* 5. ADD VACCINE ORDER MODAL */}
      {addVaccineModal && (
        <AddVaccineOrderModal
          patients={patients}
          staff={staff}
          user={user}
          onClose={() => setAddVaccineModal(false)}
          onSuccess={() => {
            setAddVaccineModal(false);
            notify("Vaccine order created successfully.");
            loadRecords();
          }}
        />
      )}

      {/* 6. ADMINISTER MODAL */}
      {administerModal.open && administerModal.item && (
        <AdministerRecordModal
          item={administerModal.item}
          type={administerModal.type}
          staff={staff}
          user={user}
          onClose={() => setAdministerModal({ open: false, item: null, type: "injection" })}
          onSuccess={() => {
            setAdministerModal({ open: false, item: null, type: "injection" });
            notify("Administration recorded successfully.");
            loadRecords();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// ADD INJECTION ORDER MODAL COMPONENT
// =============================================================================
function AddInjectionOrderModal({
  patients,
  staff,
  user,
  onClose,
  onSuccess,
}: {
  patients: Row[];
  staff: Row[];
  user: Row;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patientId, setPatientId] = useState<string>(patients[0]?.id || "");
  const [catalogueId, setCatalogueId] = useState<string | null>(null);
  const [drugName, setDrugName] = useState<string>("Lasix 20 mg ( 10 mg x 2 ml )");
  const [dose, setDose] = useState<string>("2.0 ml");
  const [route, setRoute] = useState<string>("Intravenous");
  const [site, setSite] = useState<string>("Basilic Vein - RH");
  const [frequency, setFrequency] = useState<string>("Once");
  const [period, setPeriod] = useState<number>(2);
  const [nurseNotes, setNurseNotes] = useState<string>("Start Immediate");
  const [comments, setComments] = useState<string>("Post Blood pressure and pulse rate monitor");
  const [status, setStatus] = useState<string>("ordered");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const applyPreset = async (preset: typeof INJECTION_PRESETS[0]) => {
    setDrugName(preset.name);
    setDose(preset.dose);
    setRoute(preset.route);
    setSite(preset.site);
    setFrequency(preset.frequency);
    setPeriod(preset.period);
    setNurseNotes(preset.nurse_notes);
    setComments(preset.comments);
    try {
      const prefix = preset.name.split(" ")[0];
      const data = await api<Row[]>(`/injections/catalog?q=${encodeURIComponent(prefix)}`);
      const match = (data || []).find(
        (c) => c.name.toLowerCase() === preset.name.toLowerCase() || c.name.toLowerCase().startsWith(prefix.toLowerCase())
      );
      if (match) setCatalogueId(match.id);
      else setCatalogueId(null);
    } catch {
      setCatalogueId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    if (!drugName.trim()) {
      alert("Please enter drug name.");
      return;
    }
    setSubmitting(true);
    try {
      try {
        await api("/injections/orders", "POST", {
          patient_id: patientId,
          catalogue_id: catalogueId || null,
          medication_name_snapshot: drugName.trim(),
          dosage: dose.trim(),
          route: route.trim(),
          site: site.trim(),
          frequency: frequency.trim(),
          nurse_note: nurseNotes.trim(),
          comments: comments.trim(),
          status: status || "ordered",
        });
      } catch {
        // Fallback to records/injections if orders endpoint fails
        await api("/records/injections", "POST", {
          patient_id: patientId,
          catalogue_id: catalogueId || null,
          name: drugName.trim(),
          dose: dose.trim(),
          route: route.trim(),
          site: site.trim(),
          frequency: frequency.trim(),
          period: period || 1,
          period_unit: "Day(s)",
          nurse_notes: nurseNotes.trim(),
          comments: comments.trim(),
          status: status || "ordered",
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create injection order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "14px 20px",
            background: "#00838f",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Syringe size={18} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Add Injection Order</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {/* Presets */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
              Quick Presets (Formulary)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INJECTION_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    background: drugName === p.name ? "#e0f2fe" : "#f1f5f9",
                    color: drugName === p.name ? "#0284c7" : "#334155",
                    border: drugName === p.name ? "1px solid #7dd3fc" : "1px solid #cbd5e1",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {p.name.split(" ")[0]} ({p.dose})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Patient Select */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Patient *
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.mrn ? `[${p.mrn}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Drug Name */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Drug Name *
              </label>
              <InjectionAutocomplete
                value={drugName}
                catalogueId={catalogueId}
                onChangeText={(text) => {
                  setDrugName(text);
                  setCatalogueId(null);
                }}
                onSelect={(item) => {
                  setDrugName(item.name);
                  setCatalogueId(item.id);
                }}
                required
                placeholder="Search or select injection from master catalogue (e.g. Deform 20ml, Lasix, Clexane)..."
              />
            </div>

            {/* Dosage */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Dosage
              </label>
              <input
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. 2.0 ml"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Route */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Route
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                <option value="Intravenous">Intravenous</option>
                <option value="Subcutaneous">Subcutaneous</option>
                <option value="Intramuscular">Intramuscular</option>
              </select>
            </div>

            {/* Site */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Basilic Vein - RH"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Frequency */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Frequency
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g. Once"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Note to Nurse */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Note to Nurse
              </label>
              <input
                type="text"
                value={nurseNotes}
                onChange={(e) => setNurseNotes(e.target.value)}
                placeholder="e.g. Start Immediate"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Comments */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Follow-up instructions or administration precautions"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Order Status */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Order Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                <option value="ordered">Ordered (Pending)</option>
                <option value="administered">Administered Immediately</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="charm-btn-teal"
              disabled={submitting}
              style={{
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Saving..." : "Save Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// ADD VACCINE ORDER MODAL COMPONENT
// =============================================================================
function AddVaccineOrderModal({
  patients,
  staff,
  user,
  onClose,
  onSuccess,
}: {
  patients: Row[];
  staff: Row[];
  user: Row;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [patientId, setPatientId] = useState<string>(patients[0]?.id || "");
  const [vaccineName, setVaccineName] = useState<string>("Influenza Vaccine (Quadrivalent)");
  const [cvxCode, setCvxCode] = useState<string>("141");
  const [dose, setDose] = useState<string>("0.5 mL");
  const [route, setRoute] = useState<string>("Intramuscular");
  const [site, setSite] = useState<string>("Right Deltoid");
  const [seriesNumber, setSeriesNumber] = useState<number>(1);
  const [notes, setNotes] = useState<string>("Annual cardiovascular influenza prophylaxis");
  const [status, setStatus] = useState<string>("ordered");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const applyPreset = (p: typeof VACCINE_PRESETS[0]) => {
    setVaccineName(p.name);
    setCvxCode(p.cvx);
    setDose(p.dose);
    setRoute(p.route);
    setSite(p.site);
    setSeriesNumber(p.series);
    setNotes(p.notes);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    if (!vaccineName.trim()) {
      alert("Please enter vaccine name.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/records/vaccines", "POST", {
        patient_id: patientId,
        vaccine_name: vaccineName.trim(),
        cvx_code: cvxCode.trim(),
        dose: dose.trim(),
        route: route.trim(),
        site: site.trim(),
        series_number: seriesNumber || 1,
        notes: notes.trim(),
        status: status,
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create vaccine order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "14px 20px",
            background: "#00838f",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={18} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>Add Vaccine Order</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {/* Quick Presets */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase" }}>
              Common Immunizations
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {VACCINE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    background: vaccineName === p.name ? "#e0f2fe" : "#f1f5f9",
                    color: vaccineName === p.name ? "#0284c7" : "#334155",
                    border: vaccineName === p.name ? "1px solid #7dd3fc" : "1px solid #cbd5e1",
                    borderRadius: 4,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {p.name.split(" ")[0]} ({p.dose})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Patient */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Patient *
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.mrn ? `[${p.mrn}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Vaccine Name */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Vaccine Name *
              </label>
              <input
                type="text"
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                required
                placeholder="e.g. Influenza Vaccine (Quadrivalent)"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* CVX Code */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                CVX Code
              </label>
              <input
                type="text"
                value={cvxCode}
                onChange={(e) => setCvxCode(e.target.value)}
                placeholder="e.g. 141"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Dose */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Dose
              </label>
              <input
                type="text"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. 0.5 mL"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Route */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Route
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                <option value="Intramuscular">Intramuscular</option>
                <option value="Subcutaneous">Subcutaneous</option>
              </select>
            </div>

            {/* Site */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Right Deltoid"
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Series Number */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Series / Dose #
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={seriesNumber}
                onChange={(e) => setSeriesNumber(parseInt(e.target.value) || 1)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            {/* Status */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Order Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                <option value="ordered">Ordered (Pending)</option>
                <option value="administered">Administered Immediately</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#334155", marginBottom: 4 }}>
                Clinical Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Vaccination precautions or protocol justification"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="charm-btn-teal"
              disabled={submitting}
              style={{
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Saving..." : "Save Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// RECORD ADMINISTRATION MODAL
// =============================================================================
function AdministerRecordModal({
  item,
  type,
  staff,
  user,
  onClose,
  onSuccess,
}: {
  item: Row;
  type: "injection" | "vaccine";
  staff: Row[];
  user: Row;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lotNumber, setLotNumber] = useState<string>("LOT-" + Math.floor(100000 + Math.random() * 900000));
  const [adminBy, setAdminBy] = useState<string>(user?.id || staff[0]?.id || "");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleAdminister = async () => {
    setSubmitting(true);
    try {
      if (item.is_order) {
        await api("/records/injections", "POST", {
          patient_id: item.patient_id,
          catalogue_id: item.catalogue_id || null,
          order_id: item.id,
          name: item.name || item.medication_name_snapshot,
          dose: item.dose || item.dosage || "",
          dosage: item.dosage || item.dose || "",
          route: item.route || "Subcutaneous (SC)",
          site: item.site || "Deltoid - Left",
          lot_number: lotNumber,
          administered_by: adminBy,
          administered_at: new Date().toISOString(),
          nurse_notes: item.nurse_notes || item.nurse_note || "",
          comments: item.comments || "",
          status: "administered",
        });
        await api(`/injections/orders/${item.id}`, "PATCH", {
          status: "completed",
        });
      } else {
        // update status via api
        await api(`/records/${type === "injection" ? "injections" : "vaccines"}/${item.id}/status`, "PATCH", {
          status: "administered",
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update administration status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            background: "#00838f",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>Record Administration</div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#334155" }}>
            Confirm administration of <strong>{item.name || item.vaccine_name}</strong> for{" "}
            <strong>{item.patient_name || "Patient"}</strong>.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                Lot Number
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                Administered By
              </label>
              <select
                value={adminBy}
                onChange={(e) => setAdminBy(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 10px",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 500,
                color: "#475569",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="charm-btn-teal"
              disabled={submitting}
              onClick={handleAdminister}
              style={{
                backgroundColor: "#00838f",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Recording..." : "Confirm Administration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

