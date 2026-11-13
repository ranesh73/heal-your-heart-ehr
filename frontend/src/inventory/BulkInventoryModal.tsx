import React, { useState } from "react";
import { Modal, Button, ErrorBox } from "../ui";
import { api } from "../api";
import { Plus, Trash2 } from "lucide-react";
import { MedicineAutocomplete } from "./MedicineAutocomplete";

export interface BulkInventoryModalProps {
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

interface BulkRow {
  id: string;
  product_name: string;
  trade_name: string;
  product_code: string;
  hsn_code: string;
  strength: string;
  strength_unit: string;
  route: string;
  dose_form: string;
  quantity: number | "";
  batch_number: string;
  expiry_date: string;
  cost_price: number | "";
  retail_price: number | "";
  tax_percent: number | "";
  reorder_level: number | "";
  order_quantity: number | "";
  storage_location: string;
  pack: string;
  reference_number: string;
  manufacturer: string;
}

export function BulkInventoryModal({ categories, suppliers, onClose, onSuccess }: BulkInventoryModalProps) {
  const [groupName, setGroupName] = useState("Drug");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [supplier, setSupplier] = useState(suppliers[0]?.name || "");
  const [stockReceivedDate, setStockReceivedDate] = useState(new Date().toISOString().split("T")[0]);

  const createInitialRow = (): BulkRow => ({
    id: Math.random().toString(36).substring(2, 9),
    product_name: "",
    trade_name: "",
    product_code: "",
    hsn_code: "",
    strength: "",
    strength_unit: "mg",
    route: "Oral",
    dose_form: "Tablet",
    quantity: "",
    batch_number: "",
    expiry_date: "",
    cost_price: "",
    retail_price: "",
    tax_percent: 0,
    reorder_level: 10,
    order_quantity: 50,
    storage_location: "",
    pack: "",
    reference_number: "",
    manufacturer: "",
  });

  const [rows, setRows] = useState<BulkRow[]>([createInitialRow(), createInitialRow(), createInitialRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const addRow = () => {
    setRows((prev) => [...prev, createInitialRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof BulkRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.product_name.trim() !== "");
    if (validRows.length === 0) {
      setError(new Error("Please enter at least one product with a name."));
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payloadRows = validRows.map((r) => ({
        product_name: r.product_name.trim(),
        trade_name: r.trade_name.trim(),
        product_code: r.product_code.trim(),
        hsn_code: r.hsn_code.trim(),
        strength: r.strength.trim(),
        strength_unit: r.strength_unit.trim(),
        route: r.route.trim(),
        dose_form: r.dose_form.trim(),
        quantity: Number(r.quantity) || 0,
        batch_number: r.batch_number.trim(),
        expiry_date: r.expiry_date || null,
        cost_price: Number(r.cost_price) || 0,
        retail_price: Number(r.retail_price) || 0,
        tax_percent: Number(r.tax_percent) || 0,
        reorder_level: Number(r.reorder_level) || 0,
        order_quantity: Number(r.order_quantity) || 0,
        storage_location: r.storage_location.trim(),
        pack: r.pack.trim(),
        reference_number: r.reference_number.trim(),
        manufacturer: r.manufacturer.trim(),
        group_name: groupName,
        category: category,
        supplier: supplier,
        stock_received_date: stockReceivedDate || null,
      }));

      await api("/inventory/bulk", "POST", {
        group_name: groupName,
        category: category,
        supplier: supplier,
        stock_received_date: stockReceivedDate || null,
        rows: payloadRows,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Bulk Inventory Intake" onClose={onClose} wide>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ErrorBox error={error} />

        {/* Top shared fields bar */}
        <div
          style={{
            background: "#f0fdfa",
            border: "1px solid #ccfbf1",
            borderRadius: 8,
            padding: 14,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", marginBottom: 4 }}>
              Group (All Rows)
            </label>
            <select
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#ffffff" }}
            >
              <option value="Drug">Drug</option>
              <option value="Consumable">Consumable</option>
              <option value="Equipment">Equipment</option>
              <option value="Diagnostic">Diagnostic</option>
              <option value="General Supply">General Supply</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", marginBottom: 4 }}>
              Category (Default)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#ffffff" }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", marginBottom: 4 }}>
              Supplier (Default)
            </label>
            <input
              list="bulk-suppliers-list"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Select supplier..."
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#ffffff", boxSizing: "border-box" }}
            />
            <datalist id="bulk-suppliers-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f766e", textTransform: "uppercase", marginBottom: 4 }}>
              Received Date
            </label>
            <input
              type="date"
              value={stockReceivedDate}
              onChange={(e) => setStockReceivedDate(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#ffffff", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Repeating table */}
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: "420px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 10 }}>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "8px 10px", minWidth: 260 }}>Product Name (Catalogue Search) *</th>
                <th style={{ padding: "8px 10px", minWidth: 140 }}>Trade Name</th>
                <th style={{ padding: "8px 10px", minWidth: 90 }}>Dose Form</th>
                <th style={{ padding: "8px 10px", minWidth: 80 }}>Strength</th>
                <th style={{ padding: "8px 10px", minWidth: 100 }}>Batch #</th>
                <th style={{ padding: "8px 10px", minWidth: 125 }}>Expiry Date</th>
                <th style={{ padding: "8px 10px", minWidth: 80 }}>Quantity</th>
                <th style={{ padding: "8px 10px", minWidth: 85 }}>Cost Price</th>
                <th style={{ padding: "8px 10px", minWidth: 85 }}>Retail Price</th>
                <th style={{ padding: "8px 10px", minWidth: 120 }}>Manufacturer</th>
                <th style={{ padding: "8px 10px", width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <MedicineAutocomplete
                      value={row.product_name}
                      tradeNameValue={row.trade_name}
                      placeholder="Type or search medicine..."
                      onSelect={(med) => {
                        updateRow(row.id, "product_name", med.product_name);
                        if (med.trade_name) updateRow(row.id, "trade_name", med.trade_name);
                      }}
                      onChangeText={(text) => updateRow(row.id, "product_name", text)}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={row.trade_name}
                      onChange={(e) => updateRow(row.id, "trade_name", e.target.value)}
                      placeholder="Trade Name"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <select
                      value={row.dose_form}
                      onChange={(e) => updateRow(row.id, "dose_form", e.target.value)}
                      style={{ width: "100%", padding: "6px 4px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Kit">Kit</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={row.strength}
                      onChange={(e) => updateRow(row.id, "strength", e.target.value)}
                      placeholder="500mg"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={row.batch_number}
                      onChange={(e) => updateRow(row.id, "batch_number", e.target.value)}
                      placeholder="BTH-01"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="date"
                      value={row.expiry_date}
                      onChange={(e) => updateRow(row.id, "expiry_date", e.target.value)}
                      style={{ width: "100%", padding: "5px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.cost_price}
                      onChange={(e) => updateRow(row.id, "cost_price", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="₹0"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.retail_price}
                      onChange={(e) => updateRow(row.id, "retail_price", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="₹0"
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input
                      type="text"
                      value={row.manufacturer}
                      onChange={(e) => updateRow(row.id, "manufacturer", e.target.value)}
                      placeholder="Cipla, etc."
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      title="Remove row"
                      style={{
                        background: "none",
                        border: "none",
                        color: rows.length <= 1 ? "#cbd5e1" : "#ef4444",
                        cursor: rows.length <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <Button variant="secondary" type="button" onClick={addRow}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add Another Item Row
          </Button>

          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Processing..." : `Commit All (${rows.filter((r) => r.product_name.trim()).length} Items)`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

