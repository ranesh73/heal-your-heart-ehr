import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Pill,
  Leaf,
  Loader2,
  PackageCheck,
  ShieldAlert,
  ArrowLeft,
  Edit,
  Eye,
} from "lucide-react";
import { api, Row, navigate } from "../../api";
import { useApp } from "../../context";

interface CatalogueDrug {
  id: string;
  product_name: string;
  trade_name: string;
  template_count: number;
  template_names?: string[];
  is_in_inventory: boolean;
  inventory_status: "Yes" | "No";
  is_active: boolean;
  created_at?: string;
  version?: number;
}

interface CatalogueSupplement {
  id: string;
  name: string;
  dosage_form: string;
  strength?: string;
  route?: string;
  template_count: number;
  template_names?: string[];
  is_in_inventory: boolean;
  inventory_status: "Yes" | "No";
  is_active: boolean;
  created_at?: string;
  version?: number;
}

interface TemplateDetail {
  id: string;
  template_name: string;
  type: string;
  catalogue_id?: string;
  item_name: string;
  generic_name?: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  maen?: string;
  duration?: string;
  instructions?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function ManageSupplementsDrugsPage() {
  const { notify } = useApp();

  // Active top-level subtab: "supplements" or "drugs"
  const [activeTab, setActiveTab] = useState<"supplements" | "drugs">("supplements");

  // -------------------------------------------------------------------------
  // SUPPLEMENTS STATE
  // -------------------------------------------------------------------------
  const [supplements, setSupplements] = useState<CatalogueSupplement[]>([]);
  const [supplementsLoading, setSupplementsLoading] = useState(false);
  const [supplementsSearch, setSupplementsSearch] = useState("");
  const [supplementsPage, setSupplementsPage] = useState(1);
  const [supplementsTotal, setSupplementsTotal] = useState(0);
  const [supplementsTotalPages, setSupplementsTotalPages] = useState(1);
  const [selectedSuppIds, setSelectedSuppIds] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // DRUGS STATE
  // -------------------------------------------------------------------------
  const [drugs, setDrugs] = useState<CatalogueDrug[]>([]);
  const [drugsLoading, setDrugsLoading] = useState(false);
  const [drugsSearch, setDrugsSearch] = useState("");
  const [drugsPage, setDrugsPage] = useState(1);
  const [drugsTotal, setDrugsTotal] = useState(0);
  const [drugsTotalPages, setDrugsTotalPages] = useState(1);
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // MODAL STATES
  // -------------------------------------------------------------------------
  // Add Drug Modal
  const [addDrugModalOpen, setAddDrugModalOpen] = useState(false);
  const [drugProductName, setDrugProductName] = useState("");
  const [drugTradeName, setDrugTradeName] = useState("");
  const [drugDosageForm, setDrugDosageForm] = useState("Tablet");
  const [drugStrength, setDrugStrength] = useState("");
  const [drugRoute, setDrugRoute] = useState("Oral");
  const [drugFormError, setDrugFormError] = useState<string | null>(null);
  const [drugSubmitting, setDrugSubmitting] = useState(false);

  // Add Supplement Modal
  const [addSuppModalOpen, setAddSuppModalOpen] = useState(false);
  const [suppName, setSuppName] = useState("");
  const [suppDosageForm, setSuppDosageForm] = useState("Tablet");
  const [suppStrength, setSuppStrength] = useState("");
  const [suppRoute, setSuppRoute] = useState("Oral");
  const [suppFormError, setSuppFormError] = useState<string | null>(null);
  const [suppSubmitting, setSuppSubmitting] = useState(false);

  // Row Action Dropdown Menu (Three Dots)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Template Viewer Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateItemTitle, setTemplateItemTitle] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateList, setTemplateList] = useState<TemplateDetail[]>([]);

  // Delete Confirmation & Dependency Report Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<"drug" | "supplement">("drug");
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteTargetNames, setDeleteTargetNames] = useState<string[]>([]);
  const [deleteExecuting, setDeleteExecuting] = useState(false);

  // Blocked Dependency Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [deleteReport, setDeleteReport] = useState<{
    deletedCount: number;
    blocked: { id: string; name: string; reason: string }[];
  } | null>(null);

  // Details Modal (for row 3-dots "View Details")
  const [viewDetailsItem, setViewDetailsItem] = useState<CatalogueDrug | null>(null);

  // -------------------------------------------------------------------------
  // API FETCH FUNCTIONS
  // -------------------------------------------------------------------------
  const fetchSupplements = useCallback(
    async (pageToFetch: number, searchToFetch: string) => {
      setSupplementsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(pageToFetch));
        params.append("limit", "100");
        if (searchToFetch.trim()) {
          params.append("q", searchToFetch.trim());
        }
        const data = await api<PaginatedResponse<CatalogueSupplement>>(
          `/rx/supplements?${params.toString()}`
        );
        setSupplements(data.items || []);
        setSupplementsTotal(data.total || 0);
        setSupplementsPage(data.page || 1);
        setSupplementsTotalPages(data.total_pages || 1);
        setSelectedSuppIds([]);
      } catch (err: any) {
        console.error("Failed to fetch supplements:", err);
        notify(err.message || "Failed to load supplements");
      } finally {
        setSupplementsLoading(false);
      }
    },
    [notify]
  );

  const fetchDrugs = useCallback(
    async (pageToFetch: number, searchToFetch: string) => {
      setDrugsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(pageToFetch));
        params.append("limit", "100");
        if (searchToFetch.trim()) {
          params.append("q", searchToFetch.trim());
        }
        const data = await api<PaginatedResponse<CatalogueDrug>>(
          `/rx/drugs?${params.toString()}`
        );
        setDrugs(data.items || []);
        setDrugsTotal(data.total || 0);
        setDrugsPage(data.page || 1);
        setDrugsTotalPages(data.total_pages || 1);
        setSelectedDrugIds([]);
      } catch (err: any) {
        console.error("Failed to fetch drugs:", err);
        notify(err.message || "Failed to load drugs");
      } finally {
        setDrugsLoading(false);
      }
    },
    [notify]
  );

  // Initial load
  useEffect(() => {
    fetchSupplements(1, "");
    fetchDrugs(1, "");
  }, [fetchSupplements, fetchDrugs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".charm-rx-action-menu-container")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Search debouncing for Supplements
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSupplements(1, supplementsSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [supplementsSearch, fetchSupplements]);

  // Search debouncing for Drugs
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrugs(1, drugsSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [drugsSearch, fetchDrugs]);

  // -------------------------------------------------------------------------
  // SELECTION HANDLERS
  // -------------------------------------------------------------------------
  const handleSelectAllSupplements = (checked: boolean) => {
    if (checked) {
      setSelectedSuppIds(supplements.map((s) => s.id));
    } else {
      setSelectedSuppIds([]);
    }
  };

  const handleSelectSupplement = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSuppIds((prev) => [...prev, id]);
    } else {
      setSelectedSuppIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleSelectAllDrugs = (checked: boolean) => {
    if (checked) {
      setSelectedDrugIds(drugs.map((d) => d.id));
    } else {
      setSelectedDrugIds([]);
    }
  };

  const handleSelectDrug = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDrugIds((prev) => [...prev, id]);
    } else {
      setSelectedDrugIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // -------------------------------------------------------------------------
  // TEMPLATE INSPECTION MODAL
  // -------------------------------------------------------------------------
  const openTemplateModal = async (
    itemName: string,
    catalogueId: string,
    type: "prescription" | "supplement"
  ) => {
    setTemplateItemTitle(itemName);
    setTemplateLoading(true);
    setTemplateModalOpen(true);
    try {
      const list = await api<TemplateDetail[]>(
        `/rx/templates?type=${type}&catalogue_id=${encodeURIComponent(catalogueId)}`
      );
      setTemplateList(list || []);
    } catch (err: any) {
      console.error("Failed to load template details:", err);
      setTemplateList([]);
    } finally {
      setTemplateLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // ADD DRUG HANDLER
  // -------------------------------------------------------------------------
  const handleCreateDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrugFormError(null);
    const pTrimmed = drugProductName.trim();
    if (!pTrimmed) {
      setDrugFormError("Drug / Product Name is required.");
      return;
    }
    setDrugSubmitting(true);
    try {
      await api("/rx/drugs", "POST", {
        product_name: pTrimmed,
        trade_name: drugTradeName.trim() || pTrimmed,
        dosage_form: drugDosageForm,
        strength: drugStrength.trim(),
        route: drugRoute,
      });
      notify(`Drug "${pTrimmed}" added to master catalogue.`);
      setAddDrugModalOpen(false);
      setDrugProductName("");
      setDrugTradeName("");
      setDrugStrength("");
      fetchDrugs(1, drugsSearch);
    } catch (err: any) {
      setDrugFormError(err.message || "Failed to add drug");
    } finally {
      setDrugSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // ADD SUPPLEMENT HANDLER
  // -------------------------------------------------------------------------
  const handleCreateSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuppFormError(null);
    const sTrimmed = suppName.trim();
    if (!sTrimmed) {
      setSuppFormError("Supplement Name is required.");
      return;
    }
    setSuppSubmitting(true);
    try {
      await api("/rx/supplements", "POST", {
        name: sTrimmed,
        dosage_form: suppDosageForm,
        strength: suppStrength.trim(),
        route: suppRoute,
      });
      notify(`Supplement "${sTrimmed}" added to master catalogue.`);
      setAddSuppModalOpen(false);
      setSuppName("");
      setSuppStrength("");
      fetchSupplements(1, supplementsSearch);
    } catch (err: any) {
      setSuppFormError(err.message || "Failed to add supplement");
    } finally {
      setSuppSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // DELETION LOGIC (ENFORCING INVENTORY & TEMPLATE DEPENDENCIES)
  // -------------------------------------------------------------------------
  const promptDeleteDrug = (drug: CatalogueDrug) => {
    setOpenDropdownId(null);
    setDeleteTargetType("drug");
    setDeleteTargetIds([drug.id]);
    setDeleteTargetNames([drug.product_name]);
    setDeleteConfirmOpen(true);
  };

  const promptDeleteSupplement = (supp: CatalogueSupplement) => {
    setDeleteTargetType("supplement");
    setDeleteTargetIds([supp.id]);
    setDeleteTargetNames([supp.name]);
    setDeleteConfirmOpen(true);
  };

  const promptBulkDelete = () => {
    if (activeTab === "supplements") {
      if (selectedSuppIds.length === 0) return;
      const names = supplements
        .filter((s) => selectedSuppIds.includes(s.id))
        .map((s) => s.name);
      setDeleteTargetType("supplement");
      setDeleteTargetIds(selectedSuppIds);
      setDeleteTargetNames(names);
      setDeleteConfirmOpen(true);
    } else {
      if (selectedDrugIds.length === 0) return;
      const names = drugs
        .filter((d) => selectedDrugIds.includes(d.id))
        .map((d) => d.product_name);
      setDeleteTargetType("drug");
      setDeleteTargetIds(selectedDrugIds);
      setDeleteTargetNames(names);
      setDeleteConfirmOpen(true);
    }
  };

  const executeDelete = async () => {
    setDeleteExecuting(true);
    try {
      if (deleteTargetType === "drug") {
        if (deleteTargetIds.length === 1) {
          // Single delete
          await api(`/rx/drugs/${deleteTargetIds[0]}`, "DELETE");
          notify(`Drug "${deleteTargetNames[0]}" removed successfully.`);
          setDeleteConfirmOpen(false);
          fetchDrugs(drugsPage, drugsSearch);
        } else {
          // Bulk delete with report
          const res = await api<{
            ok: boolean;
            deleted: string[];
            blocked: { id: string; name: string; reason: string }[];
            message: string;
          }>("/rx/drugs/bulk-delete", "POST", { ids: deleteTargetIds });

          setDeleteConfirmOpen(false);
          fetchDrugs(drugsPage, drugsSearch);
          if (res.blocked && res.blocked.length > 0) {
            setDeleteReport({
              deletedCount: res.deleted.length,
              blocked: res.blocked,
            });
            setReportModalOpen(true);
          } else {
            notify(res.message || "Selected drugs removed successfully.");
          }
        }
      } else {
        if (deleteTargetIds.length === 1) {
          // Single delete
          await api(`/rx/supplements/${deleteTargetIds[0]}`, "DELETE");
          notify(`Supplement "${deleteTargetNames[0]}" removed successfully.`);
          setDeleteConfirmOpen(false);
          fetchSupplements(supplementsPage, supplementsSearch);
        } else {
          // Bulk delete with report
          const res = await api<{
            ok: boolean;
            deleted: string[];
            blocked: { id: string; name: string; reason: string }[];
            message: string;
          }>("/rx/supplements/bulk-delete", "POST", { ids: deleteTargetIds });

          setDeleteConfirmOpen(false);
          fetchSupplements(supplementsPage, supplementsSearch);
          if (res.blocked && res.blocked.length > 0) {
            setDeleteReport({
              deletedCount: res.deleted.length,
              blocked: res.blocked,
            });
            setReportModalOpen(true);
          } else {
            notify(res.message || "Selected supplements removed successfully.");
          }
        }
      }
    } catch (err: any) {
      alert(err.message || "Deletion failed due to dependency restrictions.");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteExecuting(false);
    }
  };

  // -------------------------------------------------------------------------
  // PAGINATION CALCULATIONS
  // -------------------------------------------------------------------------
  const currentTotal = activeTab === "supplements" ? supplementsTotal : drugsTotal;
  const currentPage = activeTab === "supplements" ? supplementsPage : drugsPage;
  const currentTotalPages = activeTab === "supplements" ? supplementsTotalPages : drugsTotalPages;
  const limit = 100;

  const startRecord = currentTotal === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, currentTotal);

  return (
    <div className="charm-rx-container" style={{ padding: "0 4px" }}>
      {/* Top Banner / Breadcrumb Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="charm-settings-back-arrow-btn"
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Back to Settings"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Manage Supplements and Drugs
            </h1>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              Settings &bull; <strong style={{ color: "#0f766e" }}>Rx</strong> &bull;{" "}
              {activeTab === "supplements" ? "Supplements Catalogue" : "Drugs Catalogue"}
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div
          style={{
            display: "flex",
            background: "#f1f5f9",
            borderRadius: 8,
            padding: 3,
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("supplements")}
            style={{
              padding: "7px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              background: activeTab === "supplements" ? "#ffffff" : "transparent",
              color: activeTab === "supplements" ? "#0f766e" : "#64748b",
              boxShadow: activeTab === "supplements" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Leaf size={15} />
            <span>Supplements</span>
            <span
              style={{
                fontSize: 11,
                background: activeTab === "supplements" ? "#ccfbf1" : "#e2e8f0",
                color: activeTab === "supplements" ? "#0f766e" : "#475569",
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {supplementsTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("drugs")}
            style={{
              padding: "7px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              background: activeTab === "drugs" ? "#ffffff" : "transparent",
              color: activeTab === "drugs" ? "#0f766e" : "#64748b",
              boxShadow: activeTab === "drugs" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Pill size={15} />
            <span>Drugs</span>
            <span
              style={{
                fontSize: 11,
                background: activeTab === "drugs" ? "#ccfbf1" : "#e2e8f0",
                color: activeTab === "drugs" ? "#0f766e" : "#475569",
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {drugsTotal}
            </span>
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Left: Search input */}
        <div style={{ position: "relative", minWidth: 320, flex: 1, maxWidth: 460 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            type="text"
            placeholder={
              activeTab === "supplements"
                ? "Search supplement by name..."
                : "Search drug by name or trade name..."
            }
            value={activeTab === "supplements" ? supplementsSearch : drugsSearch}
            onChange={(e) => {
              if (activeTab === "supplements") {
                setSupplementsSearch(e.target.value);
              } else {
                setDrugsSearch(e.target.value);
              }
            }}
            style={{
              width: "100%",
              padding: "8px 36px 8px 36px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {(activeTab === "supplements" ? supplementsSearch : drugsSearch) && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === "supplements") {
                  setSupplementsSearch("");
                } else {
                  setDrugsSearch("");
                }
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                padding: 2,
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Right: Actions & Genuine Server Pagination */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Bulk Delete Button */}
          {activeTab === "supplements" && selectedSuppIds.length > 0 && (
            <button
              type="button"
              onClick={promptBulkDelete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={15} />
              <span>Delete ({selectedSuppIds.length})</span>
            </button>
          )}

          {activeTab === "drugs" && selectedDrugIds.length > 0 && (
            <button
              type="button"
              onClick={promptBulkDelete}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={15} />
              <span>Delete ({selectedDrugIds.length})</span>
            </button>
          )}

          {/* Add Item Button */}
          {activeTab === "supplements" ? (
            <button
              type="button"
              onClick={() => {
                setSuppFormError(null);
                setSuppName("");
                setSuppStrength("");
                setAddSuppModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 6,
                background: "#0f766e",
                border: "none",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <Plus size={16} />
              <span>Add Supplement</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDrugFormError(null);
                setDrugProductName("");
                setDrugTradeName("");
                setDrugStrength("");
                setAddDrugModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 6,
                background: "#0f766e",
                border: "none",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <Plus size={16} />
              <span>Add Drug</span>
            </button>
          )}

          {/* Server-Side Pagination Cluster */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderLeft: "1px solid #e2e8f0",
              paddingLeft: 12,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {currentTotal === 0 ? "0 of 0" : `${startRecord}–${endRecord} of ${currentTotal}`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => {
                  if (activeTab === "supplements") {
                    fetchSupplements(supplementsPage - 1, supplementsSearch);
                  } else {
                    fetchDrugs(drugsPage - 1, drugsSearch);
                  }
                }}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  background: currentPage <= 1 ? "#f8fafc" : "#ffffff",
                  color: currentPage <= 1 ? "#cbd5e1" : "#334155",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                }}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                disabled={currentPage >= currentTotalPages}
                onClick={() => {
                  if (activeTab === "supplements") {
                    fetchSupplements(supplementsPage + 1, supplementsSearch);
                  } else {
                    fetchDrugs(drugsPage + 1, drugsSearch);
                  }
                }}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  background: currentPage >= currentTotalPages ? "#f8fafc" : "#ffffff",
                  color: currentPage >= currentTotalPages ? "#cbd5e1" : "#334155",
                  cursor: currentPage >= currentTotalPages ? "not-allowed" : "pointer",
                }}
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Banner Info Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#f0fdfa",
          border: "1px solid #ccfbf1",
          borderRadius: 6,
          padding: "8px 12px",
          marginBottom: 14,
          fontSize: 12,
          color: "#0f766e",
        }}
      >
        <AlertCircle size={15} style={{ flexShrink: 0 }} />
        <span>
          <strong>CharmHealth Policy:</strong> Supplements & Drugs added in Inventory cannot be deleted here (must be managed from Inventory). Items referenced in active prescription or supplement templates must first be removed from Settings &gt; Templates.
        </span>
      </div>

      {/* MAIN DATA TABLES */}
      {activeTab === "supplements" ? (
        /* ================= SUPPLEMENTS TABLE ================= */
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                <th style={{ width: 44, padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      supplements.length > 0 &&
                      supplements.every((s) => selectedSuppIds.includes(s.id))
                    }
                    onChange={(e) => handleSelectAllSupplements(e.target.checked)}
                    aria-label="Select all supplements"
                  />
                </th>
                <th style={{ padding: "12px 16px" }}>Supplement Name</th>
                <th style={{ padding: "12px 16px", width: 260 }}>
                  Number of Templates Using the Supplement
                </th>
                <th style={{ padding: "12px 16px", width: 180 }}>Is Added in Inventory</th>
                <th style={{ padding: "12px 16px", width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplementsLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        color: "#0f766e",
                      }}
                    >
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading supplements catalogue...</span>
                    </div>
                  </td>
                </tr>
              ) : supplements.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                    <Leaf size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: "#334155" }}>No supplements found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {supplementsSearch
                        ? `No supplements matching "${supplementsSearch}". Try clearing your search.`
                        : "Click 'Add Supplement' above to add your first supplement."}
                    </div>
                  </td>
                </tr>
              ) : (
                supplements.map((supp, idx) => {
                  const isChecked = selectedSuppIds.includes(supp.id);
                  const isInv = supp.is_in_inventory || supp.inventory_status === "Yes";
                  const hasTemplates = supp.template_count > 0;

                  return (
                    <tr
                      key={supp.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isChecked ? "#f0fdfa" : idx % 2 === 1 ? "#fafafa" : "#ffffff",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectSupplement(supp.id, e.target.checked)}
                          aria-label={`Select ${supp.name}`}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ wordBreak: "break-word" }}>{supp.name}</span>
                          {supp.dosage_form && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "#f1f5f9",
                                color: "#475569",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {supp.dosage_form}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {hasTemplates ? (
                          <button
                            type="button"
                            onClick={() => openTemplateModal(supp.name, supp.id, "supplement")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0f766e",
                              fontWeight: 600,
                              textDecoration: "underline",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 13,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Click to view templates referencing this supplement"
                          >
                            <span>{supp.template_count} template(s)</span>
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {isInv ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <PackageCheck size={13} />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 500,
                              background: "#f1f5f9",
                              color: "#64748b",
                            }}
                          >
                            No
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => promptDeleteSupplement(supp)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#94a3b8",
                            padding: 4,
                            borderRadius: 4,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                          title="Delete Supplement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ================= DRUGS TABLE ================= */
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                <th style={{ width: 44, padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={drugs.length > 0 && drugs.every((d) => selectedDrugIds.includes(d.id))}
                    onChange={(e) => handleSelectAllDrugs(e.target.checked)}
                    aria-label="Select all drugs"
                  />
                </th>
                <th style={{ padding: "12px 16px" }}>Drug Name</th>
                <th style={{ padding: "12px 16px", width: 260 }}>
                  Number of Templates Using the Drug
                </th>
                <th style={{ padding: "12px 16px", width: 180 }}>Is Added in Inventory</th>
                <th style={{ padding: "12px 16px", width: 80, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {drugsLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        color: "#0f766e",
                      }}
                    >
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading master drugs formulary...</span>
                    </div>
                  </td>
                </tr>
              ) : drugs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                    <Pill size={32} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: "#334155" }}>No drugs found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {drugsSearch
                        ? `No drugs matching "${drugsSearch}". Try clearing your search.`
                        : "Click 'Add Drug' above to create your first drug catalogue entry."}
                    </div>
                  </td>
                </tr>
              ) : (
                drugs.map((drug, idx) => {
                  const isChecked = selectedDrugIds.includes(drug.id);
                  const isInv = drug.is_in_inventory || drug.inventory_status === "Yes";
                  const hasTemplates = drug.template_count > 0;
                  const isMenuOpen = openDropdownId === drug.id;

                  return (
                    <tr
                      key={drug.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isChecked ? "#f0fdfa" : idx % 2 === 1 ? "#fafafa" : "#ffffff",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectDrug(drug.id, e.target.checked)}
                          aria-label={`Select ${drug.product_name}`}
                        />
                      </td>
                      <td style={{ padding: "12px 16px", color: "#0f172a" }}>
                        <div style={{ fontWeight: 600, wordBreak: "break-word" }}>
                          {drug.product_name}
                        </div>
                        {drug.trade_name && drug.trade_name !== drug.product_name && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {drug.trade_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {hasTemplates ? (
                          <button
                            type="button"
                            onClick={() => openTemplateModal(drug.product_name, drug.id, "prescription")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0f766e",
                              fontWeight: 600,
                              textDecoration: "underline",
                              cursor: "pointer",
                              padding: 0,
                              fontSize: 13,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Click to view templates referencing this drug"
                          >
                            <span>{drug.template_count} template(s)</span>
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {isInv ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              background: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <PackageCheck size={13} />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 500,
                              background: "#f1f5f9",
                              color: "#64748b",
                            }}
                          >
                            No
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", position: "relative" }}>
                        <div className="charm-rx-action-menu-container" style={{ position: "relative", display: "inline-block" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isMenuOpen ? null : drug.id);
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              borderRadius: 4,
                              padding: 4,
                              cursor: "pointer",
                              color: isMenuOpen ? "#0f766e" : "#64748b",
                            }}
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Action Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                marginTop: 4,
                                width: 140,
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: 6,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                zIndex: 100,
                                overflow: "hidden",
                                textAlign: "left",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setViewDetailsItem(drug);
                                  setOpenDropdownId(null);
                                }}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 12px",
                                  fontSize: 12,
                                  color: "#334155",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <Eye size={14} />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => promptDeleteDrug(drug)}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 12px",
                                  fontSize: 12,
                                  color: "#b91c1c",
                                  background: "transparent",
                                  border: "none",
                                  borderTop: "1px solid #f1f5f9",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
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
      )}

      {/* ================= MODAL: ADD DRUG ================= */}
      {addDrugModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Add Drug to Master Formulary
              </h2>
              <button
                type="button"
                onClick={() => setAddDrugModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDrug} style={{ padding: "20px" }}>
              {drugFormError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    padding: "10px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{drugFormError}</span>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Product Name / Generic Chemical *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ATORVASTATIN 20 MG + CLOPIDOGREL 75 MG"
                  value={drugProductName}
                  onChange={(e) => setDrugProductName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Brand / Trade Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. LIPIDATOR CV 20/75"
                  value={drugTradeName}
                  onChange={(e) => setDrugTradeName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Dosage Form
                  </label>
                  <select
                    value={drugDosageForm}
                    onChange={(e) => setDrugDosageForm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Suspension">Suspension</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Solution">Solution</option>
                    <option value="Sachet">Sachet</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Route
                  </label>
                  <select
                    value={drugRoute}
                    onChange={(e) => setDrugRoute(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Oral">Oral</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Topical">Topical</option>
                    <option value="Intramuscular">Intramuscular</option>
                    <option value="Intravenous">Intravenous</option>
                    <option value="Subcutaneous">Subcutaneous</option>
                    <option value="Inhalation">Inhalation</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Strength
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20mg + 75mg"
                  value={drugStrength}
                  onChange={(e) => setDrugStrength(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddDrugModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={drugSubmitting}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0f766e",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: drugSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {drugSubmitting && <Loader2 className="animate-spin" size={15} />}
                  <span>Save Drug</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD SUPPLEMENT ================= */}
      {addSuppModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 500,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Add Supplement to Master Catalogue
              </h2>
              <button
                type="button"
                onClick={() => setAddSuppModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplement} style={{ padding: "20px" }}>
              {suppFormError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    padding: "10px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{suppFormError}</span>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Supplement Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CoQ10 Ubiquinol 100mg Capsule"
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Dosage Form
                  </label>
                  <select
                    value={suppDosageForm}
                    onChange={(e) => setSuppDosageForm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Capsule">Capsule</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Solution">Solution</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Powder">Powder</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Route
                  </label>
                  <select
                    value={suppRoute}
                    onChange={(e) => setSuppRoute(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Oral">Oral</option>
                    <option value="Sublingual">Sublingual</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Strength
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100mg"
                  value={suppStrength}
                  onChange={(e) => setSuppStrength(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setAddSuppModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suppSubmitting}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0f766e",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: suppSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {suppSubmitting && <Loader2 className="animate-spin" size={15} />}
                  <span>Save Supplement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW DETAILS ================= */}
      {viewDetailsItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 480,
              padding: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Drug Master Record</h3>
              <button
                type="button"
                onClick={() => setViewDetailsItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 10, color: "#334155" }}>
              <div>
                <strong style={{ color: "#64748b", display: "block", fontSize: 11 }}>PRODUCT NAME</strong>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{viewDetailsItem.product_name}</span>
              </div>
              <div>
                <strong style={{ color: "#64748b", display: "block", fontSize: 11 }}>TRADE / BRAND NAME</strong>
                <span>{viewDetailsItem.trade_name || "—"}</span>
              </div>
              <div>
                <strong style={{ color: "#64748b", display: "block", fontSize: 11 }}>DATABASE IDENTIFIER (CATALOGUE ID)</strong>
                <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                  {viewDetailsItem.id}
                </code>
              </div>
              <div>
                <strong style={{ color: "#64748b", display: "block", fontSize: 11 }}>INVENTORY STATUS</strong>
                <span style={{ fontWeight: 600, color: viewDetailsItem.is_in_inventory ? "#059669" : "#64748b" }}>
                  {viewDetailsItem.inventory_status}
                </span>
              </div>
              <div>
                <strong style={{ color: "#64748b", display: "block", fontSize: 11 }}>PRESCRIPTION TEMPLATES REFERENCING</strong>
                <span>{viewDetailsItem.template_count} template(s)</span>
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setViewDetailsItem(null)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TEMPLATE USAGE DETAILS ================= */}
      {templateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 600,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Templates Referencing Item
                </h3>
                <div style={{ fontSize: 12, color: "#0f766e", marginTop: 2 }}>{templateItemTitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", maxHeight: 400, overflowY: "auto" }}>
              {templateLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#0f766e" }}>
                  <Loader2 className="animate-spin" size={20} style={{ margin: "0 auto 8px auto" }} />
                  <span>Loading referenced templates...</span>
                </div>
              ) : templateList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>
                  No active templates found referencing this item.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {templateList.map((tpl) => (
                    <div
                      key={tpl.id}
                      style={{
                        padding: "12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <FileText size={16} color="#0f766e" />
                        <strong style={{ fontSize: 14, color: "#0f172a" }}>{tpl.template_name}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginLeft: 24 }}>
                        {tpl.dosage && <span>Dosage: {tpl.dosage} &bull; </span>}
                        {tpl.frequency && <span>Frequency: {tpl.frequency} &bull; </span>}
                        {tpl.duration && <span>Duration: {tpl.duration}</span>}
                        {tpl.instructions && (
                          <div style={{ marginTop: 4, fontStyle: "italic", color: "#64748b" }}>
                            "{tpl.instructions}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 13,
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

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 480,
              padding: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b91c1c", marginBottom: 12 }}>
              <ShieldAlert size={24} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Confirm Removal from Catalogue
              </h3>
            </div>

            <div style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
              Are you sure you want to remove{" "}
              {deleteTargetNames.length === 1 ? (
                <strong style={{ color: "#0f172a" }}>"{deleteTargetNames[0]}"</strong>
              ) : (
                <strong style={{ color: "#0f172a" }}>{deleteTargetNames.length} selected items</strong>
              )}{" "}
              from the master {deleteTargetType} catalogue?
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "#fef2f2",
                  borderRadius: 6,
                  border: "1px solid #fee2e2",
                  color: "#991b1b",
                  fontSize: 12,
                }}
              >
                <strong>Note:</strong> Items added in Inventory or currently in active clinical templates are protected and will be rejected automatically.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteExecuting}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={deleteExecuting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: "#b91c1c",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleteExecuting ? "not-allowed" : "pointer",
                }}
              >
                {deleteExecuting && <Loader2 className="animate-spin" size={15} />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BLOCKED DEPENDENCIES REPORT ================= */}
      {reportModalOpen && deleteReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              width: "100%",
              maxWidth: 540,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#fef2f2",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#b91c1c" }}>
                <ShieldAlert size={18} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#991b1b" }}>
                  Deletion Dependency Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", maxHeight: 360, overflowY: "auto" }}>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 12 }}>
                {deleteReport.deletedCount > 0 ? (
                  <span style={{ color: "#059669", fontWeight: 600 }}>
                    &bull; {deleteReport.deletedCount} unlinked item(s) successfully deleted.
                  </span>
                ) : (
                  <span>No items were deleted.</span>
                )}
                <div style={{ color: "#b91c1c", fontWeight: 600, marginTop: 4 }}>
                  &bull; {deleteReport.blocked.length} item(s) could NOT be deleted due to active relationships:
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deleteReport.blocked.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: "10px 12px",
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#9f1239" }}>{b.name}</div>
                    <div style={{ color: "#881337", marginTop: 2 }}>{b.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "12px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

