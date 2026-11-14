import React, { useState } from "react";
import { Modal, Button, ErrorBox } from "../ui";
import { api } from "../api";
import { MedicineAutocomplete } from "./MedicineAutocomplete";
import { Plus } from "lucide-react";

export interface AddInventoryModalProps {
  categories: Array<{ id: string; name: string; group_name?: string }>;
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCategoryModal: () => void;
  onOpenSupplierModal: () => void;
  editItem?: any | null;
}

export function AddInventoryModal({
  categories,
  suppliers,
  onClose,
  onSuccess,
  onOpenCategoryModal,
  onOpenSupplierModal,
  editItem,
}: AddInventoryModalProps) {
  // Product Details (Left Column)
  const [name, setName] = useState(editItem?.name || "");
  const [tradeName, setTradeName] = useState(editItem?.trade_name || "");
  const [groupName, setGroupName] = useState(editItem?.group_name || "Drug");
  const [category, setCategory] = useState(editItem?.category || (categories[0]?.name || ""));
  const [productCode, setProductCode] = useState(editItem?.product_code || "");
  const [hsnCode, setHsnCode] = useState(editItem?.hsn_code || "");
  const [strength, setStrength] = useState(editItem?.strength || "");
  const [strengthUnit, setStrengthUnit] = useState(editItem?.strength_unit || "mg");
  const [route, setRoute] = useState(editItem?.route || "Oral");
  const [doseForm, setDoseForm] = useState(editItem?.dose_form || "Tablet");
  const [taxPercent, setTaxPercent] = useState<number | "">(editItem?.tax_percent || 0);
  const [reorderLevel, setReorderLevel] = useState<number | "">(editItem?.reorder_level || 10);
  const [orderQuantity, setOrderQuantity] = useState<number | "">(editItem?.order_quantity || 50);
  const [costPrice, setCostPrice] = useState<number | "">(editItem?.cost_price || 0);
  const [retailPrice, setRetailPrice] = useState<number | "">(editItem?.retail_price || 0);
  const [manufacturer, setManufacturer] = useState(editItem?.manufacturer || "");
  const [unit, setUnit] = useState(editItem?.unit || "Strips");

  // Stock Details (Right Column - only for new item)
  const [supplier, setSupplier] = useState(suppliers[0]?.name || "");
  const [stockReceivedDate, setStockReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [storageLocation, setStorageLocation] = useState("");
  const [pack, setPack] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSelectMedicine = (item: { id: string; product_name: string; trade_name: string }) => {
    setName(item.product_name);
    if (item.trade_name) setTradeName(item.trade_name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      if (editItem?.id) {
        // Edit existing product metadata
        await api(`/inventory/${editItem.id}`, "PATCH", {
          name: name.trim(),
          trade_name: tradeName.trim(),
          group_name: groupName.trim(),
          category: category.trim(),
          product_code: productCode.trim(),
          hsn_code: hsnCode.trim(),
          strength: strength.trim(),
          strength_unit: strengthUnit.trim(),
          route: route.trim(),
          dose_form: doseForm.trim(),
          tax_percent: Number(taxPercent) || 0,
          reorder_level: Number(reorderLevel) || 0,
          order_quantity: Number(orderQuantity) || 0,
          cost_price: Number(costPrice) || 0,
          retail_price: Number(retailPrice) || 0,
          manufacturer: manufacturer.trim(),
          unit: unit.trim() || "Units",
        });
      } else {
        // Create new product + opening batch
        await api("/inventory", "POST", {
          name: name.trim(),
          trade_name: tradeName.trim(),
          group_name: groupName.trim(),
          category: category.trim(),
          product_code: productCode.trim(),
          hsn_code: hsnCode.trim(),
          strength: strength.trim(),
          strength_unit: strengthUnit.trim(),
          route: route.trim(),
          dose_form: doseForm.trim(),
          tax_percent: Number(taxPercent) || 0,
          reorder_level: Number(reorderLevel) || 0,
          order_quantity: Number(orderQuantity) || 0,
          cost_price: Number(costPrice) || 0,
          retail_price: Number(retailPrice) || 0,
          manufacturer: manufacturer.trim(),
          unit: unit.trim() || "Units",
          is_active: true,
          // Stock details
          supplier: supplier.trim(),
          stock_received_date: stockReceivedDate || null,
          batch_number: batchNumber.trim(),
          expiry_date: expiryDate || null,
          quantity: Number(quantity) || 0,
          storage_location: storageLocation.trim(),
          pack: pack.trim(),
          reference_number: referenceNumber.trim(),
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={editItem ? `Edit Product: ${editItem.name}` : "Add New Medical Inventory"}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <ErrorBox error={error} />

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
          {/* LEFT COLUMN: Product Details */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "#0f766e", fontWeight: 700 }}>
                1. Product Details
              </h4>
            </div>

            {/* Medicine autocomplete */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Product Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <MedicineAutocomplete
                value={name}
                tradeNameValue={tradeName}
                onSelect={handleSelectMedicine}
                onChangeText={(text) => setName(text)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Trade Name
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="e.g. Cardivas"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Group <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="Drug">Drug</option>
                  <option value="Consumable">Consumable</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Diagnostic">Diagnostic</option>
                  <option value="General Supply">General Supply</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                    Category <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={onOpenCategoryModal}
                    style={{ fontSize: 11, color: "#0d9488", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Plus size={11} /> New
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Dose Form
                </label>
                <select
                  value={doseForm}
                  onChange={(e) => setDoseForm(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Kit">Kit</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Strength
                </label>
                <input
                  type="text"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 500"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Unit
                </label>
                <select
                  value={strengthUnit}
                  onChange={(e) => setStrengthUnit(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="mcg">mcg</option>
                  <option value="gm">gm</option>
                  <option value="IU">IU</option>
                  <option value="%">%</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Route
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="Oral">Oral</option>
                  <option value="Intravenous (IV)">Intravenous (IV)</option>
                  <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                  <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                  <option value="Topical">Topical</option>
                  <option value="Inhalation">Inhalation</option>
                  <option value="Sublingual">Sublingual</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Product Code
                </label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="PRD-001"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  HSN Code
                </label>
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="3004"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Reorder Level
                </label>
                <input
                  type="number"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Order Qty
                </label>
                <input
                  type="number"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  GST / Tax %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Retail / MRP (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Unit Label
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Strips / Boxes"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Manufacturer / Brand
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Sun Pharma, Cipla"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Stock Details (only for new entry) */}
          <div
            style={{
              background: editItem ? "#f8fafc" : "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: editItem ? 0.7 : 1,
            }}
          >
            <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "#0f766e", fontWeight: 700 }}>
                2. Opening Stock Details
              </h4>
              {editItem && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  (To adjust stock for existing products, please use "Add Stock" from the table actions)
                </div>
              )}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                  Supplier / Vendor
                </label>
                {!editItem && (
                  <button
                    type="button"
                    onClick={onOpenSupplierModal}
                    style={{ fontSize: 11, color: "#0d9488", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Plus size={11} /> New
                  </button>
                )}
              </div>
              <input
                list="suppliers-select-list"
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                disabled={Boolean(editItem)}
                placeholder="Select or enter supplier..."
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
              <datalist id="suppliers-select-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Received Date
                </label>
                <input
                  type="date"
                  value={stockReceivedDate}
                  onChange={(e) => setStockReceivedDate(e.target.value)}
                  disabled={Boolean(editItem)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Batch / Lot Number
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  disabled={Boolean(editItem)}
                  placeholder="e.g. BTH-101"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={Boolean(editItem)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Opening Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={Boolean(editItem)}
                  placeholder="0"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Storage / Shelf
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  disabled={Boolean(editItem)}
                  placeholder="Shelf A-1"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Pack Size
                </label>
                <input
                  type="text"
                  value={pack}
                  onChange={(e) => setPack(e.target.value)}
                  disabled={Boolean(editItem)}
                  placeholder="10x10"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Reference / PO #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={Boolean(editItem)}
                placeholder="INV-9921"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : editItem ? "Update Product" : "Save Inventory Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

