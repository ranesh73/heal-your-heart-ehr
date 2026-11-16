import React, { useState, useEffect } from "react";
import { Button, Loading, ErrorBox } from "../ui";
import { api, money } from "../api";
import {
  Search,
  Plus,
  PackagePlus,
  MoreVertical,
  Layers,
  History,
  Eye,
  Edit2,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  PackageCheck,
  Download,
} from "lucide-react";
import { AddInventoryModal } from "./AddInventoryModal";
import { BulkInventoryModal } from "./BulkInventoryModal";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { BatchListModal } from "./BatchListModal";
import { StockMovementModal } from "./StockMovementModal";
import { AddStockModal } from "./AddStockModal";

export interface InventoryListTabProps {
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  onOpenCategoryModal: () => void;
  onOpenSupplierModal: () => void;
}

export function InventoryListTab({
  categories,
  suppliers,
  onOpenCategoryModal,
  onOpenSupplierModal,
}: InventoryListTabProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Filters (Default: Category = "all", Status = "active", Product search = "")
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");

  // Selection Checkbox State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [viewDetailsItem, setViewDetailsItem] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [addStockItem, setAddStockItem] = useState<any | null>(null);
  const [viewBatchesItem, setViewBatchesItem] = useState<any | null>(null);
  const [viewMovementsItem, setViewMovementsItem] = useState<any | null>(null);

  // Active menu dropdown ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm.trim()) params.append("q", searchTerm.trim());

      const url = `/inventory?${params.toString()}`;
      const data = await api<any[]>(url);
      setItems(data || []);
      setSelectedIds([]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleToggleActive = async (item: any) => {
    try {
      if (item.is_active) {
        await api(`/inventory/${item.id}`, "DELETE");
      } else {
        await api(`/inventory/${item.id}`, "PATCH", { is_active: true });
      }
      setActiveMenuId(null);
      fetchInventory();
    } catch (err) {
      console.error("Toggle item active error:", err);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleDocClick = () => setActiveMenuId(null);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  // Export current inventory items as CSV
  const handleExportCSV = () => {
    if (!items || items.length === 0) {
      alert("No inventory records to export.");
      return;
    }
    const headers = [
      "Product Name",
      "Trade Name",
      "Category",
      "Latest Retail Price",
      "Stock Quantity",
      "Reorder Level",
      "Quantity to be Ordered",
      "Status",
      "Product Code",
      "HSN Code",
    ];
    const rows = items.map((i) => [
      `"${(i.name || "").replace(/"/g, '""')}"`,
      `"${(i.trade_name || "").replace(/"/g, '""')}"`,
      `"${(i.category || "").replace(/"/g, '""')}"`,
      (i.retail_price || 0).toFixed(2),
      i.balance || 0,
      i.reorder_level || 0,
      i.order_quantity || (i.balance <= i.reorder_level && i.reorder_level > 0 ? (i.reorder_level * 2 - i.balance) : "--"),
      `"${i.status || ""}"`,
      `"${i.product_code || ""}"`,
      `"${i.hsn_code || ""}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Product Update action
  const handleProductUpdate = () => {
    if (selectedIds.length === 1) {
      const selected = items.find((i) => i.id === selectedIds[0]);
      if (selected) {
        setEditItem(selected);
        setShowAddModal(true);
        return;
      }
    }
    if (selectedIds.length > 1) {
      alert(`Product Update: ${selectedIds.length} items selected. Use individual row actions or select 1 item to edit.`);
      return;
    }
    alert("Please select a product from the table to update.");
  };

  return (
    <div>
      {/* ================= 1. FILTER ROW ================= */}
      {/* Exact left-to-right order: 1. Category, 2. Status, 3. Product search field */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
          background: "#ffffff",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        {/* 1. Category Dropdown (Default: All) */}
        <div style={{ minWidth: 180 }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
              color: "#1e293b",
              fontWeight: 500,
            }}
            aria-label="Filter by Category"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Status Dropdown (Default: Active) */}
        <div style={{ minWidth: 160 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
              color: "#1e293b",
              fontWeight: 500,
            }}
            aria-label="Filter by Status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* 3. Product Search Field */}
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: 6, flex: "1 1 280px", maxWidth: 440 }}
        >
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search By Product Name or Product ID"
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setTimeout(fetchInventory, 10);
                }}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 2,
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* ================= 2. ACTION ROW ================= */}
      {/* Top-right page action: + Inventory | Toolbar: + Bulk Inventory, Import / Export Inventory, Product Update */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {/* Left Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* + Bulk Inventory */}
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 6,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <PackagePlus size={15} color="#0f766e" />
            <span>+ Bulk Inventory</span>
          </button>

          {/* Import / Export Inventory */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 6,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Export filtered inventory records to CSV"
          >
            <FileSpreadsheet size={15} color="#0f766e" />
            <span>Import / Export Inventory</span>
          </button>

          {/* Product Update */}
          <button
            type="button"
            onClick={handleProductUpdate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 6,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
            title="Edit selected product"
          >
            <RefreshCw size={14} color="#0f766e" />
            <span>Product Update</span>
          </button>
        </div>

        {/* Top-Right Page Action: + Inventory (Single primary action, single plus) */}
        <div>
          <button
            type="button"
            onClick={() => {
              setEditItem(null);
              setShowAddModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 18px",
              borderRadius: 6,
              background: "#0f766e",
              border: "none",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            aria-label="Add Inventory"
          >
            <Plus size={16} />
            <span>Inventory</span>
          </button>
        </div>
      </div>

      <ErrorBox error={error} />

      {/* ================= 3. INVENTORY TABLE ================= */}
      {/* Exact 8 Headings:
          1. Checkbox
          2. Product Name
          3. Category
          4. Latest Retail Price
          5. Stock Quantity
          6. Reorder Level
          7. Quantity to be Ordered
          8. Actions
      */}
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "48px 16px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
            No inventory records found
          </div>
          <div style={{ fontSize: 13 }}>
            Try adjusting your category or status filters, or use the <strong>+ Inventory</strong> action above to add items.
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflowX: "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              textAlign: "left",
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
                {/* 1. Checkbox */}
                <th style={{ width: 44, padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && items.every((i) => selectedIds.includes(i.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all inventory items"
                  />
                </th>

                {/* 2. Product Name (Largest width) */}
                <th style={{ padding: "12px 16px", minWidth: 260 }}>Product Name</th>

                {/* 3. Category (Immediately after Product Name) */}
                <th style={{ padding: "12px 14px", width: 160 }}>Category</th>

                {/* 4. Latest Retail Price */}
                <th style={{ padding: "12px 14px", width: 150, textAlign: "right" }}>
                  Latest Retail Price
                </th>

                {/* 5. Stock Quantity */}
                <th style={{ padding: "12px 14px", width: 140, textAlign: "center" }}>
                  Stock Quantity
                </th>

                {/* 6. Reorder Level */}
                <th style={{ padding: "12px 14px", width: 130, textAlign: "right" }}>
                  Reorder Level
                </th>

                {/* 7. Quantity to be Ordered */}
                <th style={{ padding: "12px 14px", width: 170, textAlign: "right" }}>
                  Quantity to be Ordered
                </th>

                {/* 8. Actions */}
                <th style={{ padding: "12px 14px", width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id);
                const isMenuOpen = activeMenuId === item.id;

                // Accurate stock quantity
                const stockQty = item.balance || 0;
                const reorderLvl = item.reorder_level || 0;

                // Quantity to be Ordered: numerical or '--' when not applicable
                const qtyToBeOrdered =
                  item.order_quantity > 0
                    ? item.order_quantity
                    : stockQty <= reorderLvl && reorderLvl > 0
                    ? reorderLvl * 2 - stockQty
                    : "--";

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isSelected ? "#f0fdfa" : idx % 2 === 1 ? "#fafafa" : "#ffffff",
                      transition: "background 0.1s ease",
                    }}
                  >
                    {/* 1. Checkbox */}
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        aria-label={`Select ${item.name}`}
                      />
                    </td>

                    {/* 2. Product Name */}
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "#0f172a",
                          fontSize: 13.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.name}
                      </div>
                      {item.trade_name && item.trade_name.toLowerCase() !== item.name.toLowerCase() && (
                        <div style={{ fontSize: 11.5, color: "#0f766e", fontWeight: 500, marginTop: 2 }}>
                          {item.trade_name}
                        </div>
                      )}
                      {item.product_code && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                          ID: {item.product_code}
                        </div>
                      )}
                    </td>

                    {/* 3. Category */}
                    <td style={{ padding: "12px 14px", color: "#334155" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          background: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 500,
                        }}
                      >
                        {item.category || "General"}
                      </span>
                    </td>

                    {/* 4. Latest Retail Price */}
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#0f172a", fontWeight: 600 }}>
                      ₹{(item.retail_price || 0).toFixed(2)}
                    </td>

                    {/* 5. Stock Quantity (Exact CharmHealth layout: bold number with status badge below) */}
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: stockQty <= 0 ? "#ef4444" : reorderLvl > 0 && stockQty <= reorderLvl ? "#d97706" : "#0f172a",
                            lineHeight: 1.2,
                          }}
                        >
                          {stockQty}
                        </span>
                        {stockQty <= 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 3,
                              padding: "1px 8px",
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: "#fee2e2",
                              color: "#dc2626",
                              letterSpacing: "0.01em",
                            }}
                          >
                            Out of Stock
                          </span>
                        ) : reorderLvl > 0 && stockQty <= reorderLvl ? (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 3,
                              padding: "1px 8px",
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: "#fef3c7",
                              color: "#d97706",
                              letterSpacing: "0.01em",
                            }}
                          >
                            Low Stock
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 3,
                              padding: "1px 8px",
                              borderRadius: 10,
                              fontSize: 10.5,
                              fontWeight: 600,
                              background: "#dcfce7",
                              color: "#16a34a",
                              letterSpacing: "0.01em",
                            }}
                          >
                            In Stock
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Reorder Level */}
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#475569", fontWeight: 500 }}>
                      {reorderLvl}
                    </td>

                    {/* 7. Quantity to be Ordered */}
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        color: qtyToBeOrdered !== "--" ? "#0f766e" : "#94a3b8",
                        fontWeight: qtyToBeOrdered !== "--" ? 700 : 400,
                      }}
                    >
                      {qtyToBeOrdered}
                    </td>

                    {/* 8. Actions (Contextual Three-Dot Menu) */}
                    <td style={{ padding: "12px 14px", textAlign: "center", position: "relative" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(isMenuOpen ? null : item.id);
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
                          aria-label={`Actions for ${item.name}`}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Three-Dot Menu Dropdown */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              marginTop: 4,
                              width: 170,
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              borderRadius: 6,
                              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                              zIndex: 100,
                              overflow: "hidden",
                              textAlign: "left",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setViewDetailsItem(item.id);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
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
                              onClick={() => {
                                setAddStockItem(item);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
                                color: "#334155",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid #f1f5f9",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <Plus size={14} />
                              <span>Add Stock Batch</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setViewBatchesItem(item);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
                                color: "#334155",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid #f1f5f9",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <Layers size={14} />
                              <span>View Batches</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setViewMovementsItem(item);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
                                color: "#334155",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid #f1f5f9",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <History size={14} />
                              <span>Stock Movement</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditItem(item);
                                setShowAddModal(true);
                                setActiveMenuId(null);
                              }}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
                                color: "#334155",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid #f1f5f9",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <Edit2 size={14} />
                              <span>Edit Product</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "8px 12px",
                                fontSize: 12.5,
                                color: item.is_active ? "#b91c1c" : "#059669",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid #f1f5f9",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = item.is_active ? "#fef2f2" : "#ecfdf5")
                              }
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              {item.is_active ? (
                                <>
                                  <XCircle size={14} />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODALS ================= */}
      {showAddModal && (
        <AddInventoryModal
          editItem={editItem}
          categories={categories}
          suppliers={suppliers}
          onClose={() => {
            setShowAddModal(false);
            setEditItem(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditItem(null);
            fetchInventory();
          }}
          onOpenCategoryModal={onOpenCategoryModal}
          onOpenSupplierModal={onOpenSupplierModal}
        />
      )}

      {showBulkModal && (
        <BulkInventoryModal
          categories={categories}
          suppliers={suppliers}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchInventory();
          }}
        />
      )}

      {viewDetailsItem && (
        <ProductDetailsModal
          itemId={viewDetailsItem}
          onClose={() => setViewDetailsItem(null)}
          onEditClick={() => {
            const itm = items.find((i) => i.id === viewDetailsItem);
            setViewDetailsItem(null);
            setEditItem(itm);
            setShowAddModal(true);
          }}
          onAddStockClick={() => {
            const itm = items.find((i) => i.id === viewDetailsItem);
            setViewDetailsItem(null);
            setAddStockItem(itm);
          }}
        />
      )}

      {addStockItem && (
        <AddStockModal
          item={addStockItem}
          suppliers={suppliers}
          onClose={() => setAddStockItem(null)}
          onSuccess={() => {
            setAddStockItem(null);
            fetchInventory();
          }}
        />
      )}

      {viewBatchesItem && (
        <BatchListModal
          item={viewBatchesItem}
          onClose={() => setViewBatchesItem(null)}
          onAddStockClick={() => {
            const itm = viewBatchesItem;
            setViewBatchesItem(null);
            setAddStockItem(itm);
          }}
        />
      )}

      {viewMovementsItem && (
        <StockMovementModal
          item={viewMovementsItem}
          onClose={() => setViewMovementsItem(null)}
        />
      )}
    </div>
  );
}
