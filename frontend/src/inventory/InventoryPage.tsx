import React, { useState, useEffect } from "react";
import { PageHeading } from "../ui";
import { api } from "../api";
import { Package, Truck, Tags, BarChart3 } from "lucide-react";
import { InventoryListTab } from "./InventoryListTab";
import { SupplierTab } from "./SupplierTab";
import { CategoryTab } from "./CategoryTab";
import { ReportsTab } from "./ReportsTab";
import { CategoryModal } from "./CategoryModal";
import { SupplierModal } from "./SupplierModal";

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "supplier" | "category" | "reports">("inventory");

  // Shared categories & suppliers state for auto-refresh
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Global modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const fetchLookups = async () => {
    try {
      const [cats, sups] = await Promise.all([
        api<any[]>("/inventory/categories"),
        api<any[]>("/inventory/suppliers"),
      ]);
      setCategories(cats || []);
      setSuppliers(sups || []);
    } catch (err) {
      console.error("Failed to load inventory lookup data:", err);
    } finally {
      setLoadingLookups(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 20px" }}>
      {/* Top Header */}
      <PageHeading
        title="Medical Inventory & Supplies"
        eyebrow="Clinical Operations"
        description="Comprehensive stock tracking, batch-level expiry auditing, supplier management, and dispensing controls."
      />

      {/* 4 Horizontal Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: 20,
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "inventory" ? "2px solid #0d9488" : "2px solid transparent",
            marginBottom: -2,
            background: "none",
            color: activeTab === "inventory" ? "#0f766e" : "#64748b",
            fontWeight: activeTab === "inventory" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Package size={17} color={activeTab === "inventory" ? "#0d9488" : "#94a3b8"} />
          Inventory
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("supplier")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "supplier" ? "2px solid #0d9488" : "2px solid transparent",
            marginBottom: -2,
            background: "none",
            color: activeTab === "supplier" ? "#0f766e" : "#64748b",
            fontWeight: activeTab === "supplier" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Truck size={17} color={activeTab === "supplier" ? "#0d9488" : "#94a3b8"} />
          Supplier
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("category")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "category" ? "2px solid #0d9488" : "2px solid transparent",
            marginBottom: -2,
            background: "none",
            color: activeTab === "category" ? "#0f766e" : "#64748b",
            fontWeight: activeTab === "category" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Tags size={17} color={activeTab === "category" ? "#0d9488" : "#94a3b8"} />
          Category
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "reports" ? "2px solid #0d9488" : "2px solid transparent",
            marginBottom: -2,
            background: "none",
            color: activeTab === "reports" ? "#0f766e" : "#64748b",
            fontWeight: activeTab === "reports" ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <BarChart3 size={17} color={activeTab === "reports" ? "#0d9488" : "#94a3b8"} />
          Reports
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "inventory" && (
        <InventoryListTab
          categories={categories}
          suppliers={suppliers}
          onOpenCategoryModal={() => setShowCategoryModal(true)}
          onOpenSupplierModal={() => setShowSupplierModal(true)}
        />
      )}

      {activeTab === "supplier" && (
        <SupplierTab
          suppliers={suppliers}
          loading={loadingLookups}
          onRefresh={fetchLookups}
          onOpenSupplierModal={() => setShowSupplierModal(true)}
        />
      )}

      {activeTab === "category" && (
        <CategoryTab
          categories={categories}
          loading={loadingLookups}
          onRefresh={fetchLookups}
          onOpenCategoryModal={() => setShowCategoryModal(true)}
        />
      )}

      {activeTab === "reports" && <ReportsTab />}

      {/* Global Modals for Quick Creation */}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={() => {
            setShowCategoryModal(false);
            fetchLookups();
          }}
        />
      )}

      {showSupplierModal && (
        <SupplierModal
          onClose={() => setShowSupplierModal(false)}
          onSuccess={() => {
            setShowSupplierModal(false);
            fetchLookups();
          }}
        />
      )}
    </div>
  );
}

