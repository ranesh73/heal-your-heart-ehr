import React, { useState } from "react";
import { Modal, Button, ErrorBox } from "../ui";
import { api } from "../api";

export interface AddStockModalProps {
  item: {
    id: string;
    name: string;
    unit?: string;
    cost_price?: number;
    retail_price?: number;
    manufacturer?: string;
  };
  suppliers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStockModal({ item, suppliers, onClose, onSuccess }: AddStockModalProps) {
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState<number | "">(10);
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || "");
  const [costPrice, setCostPrice] = useState<number | "">(item.cost_price || 0);
  const [retailPrice, setRetailPrice] = useState<number | "">(item.retail_price || 0);
  const [storageLocation, setStorageLocation] = useState("");
  const [pack, setPack] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber.trim() || !quantity || Number(quantity) <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api("/inventory/batches", "POST", {
        item_id: item.id,
        batch_number: batchNumber.trim(),
        expiry_date: expiryDate ? expiryDate : null,
        received_date: receivedDate ? receivedDate : null,
        supplier_name: supplierName.trim(),
        cost_price: Number(costPrice) || 0,
        retail_price: Number(retailPrice) || 0,
        storage_location: storageLocation.trim(),
        pack: pack.trim(),
        reference_number: referenceNumber.trim(),
        quantity: Number(quantity),
        manufacturer: item.manufacturer || "",
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
    <Modal title={`Add Stock: ${item.name}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ErrorBox error={error} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Batch / Lot Number <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. BTH-8890"
              required
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

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Quantity ({item.unit || "Units"}) <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
              required
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
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Stock Received Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              required
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

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
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
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Supplier
            </label>
            <input
              list="stock-suppliers-list"
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Select or enter supplier name..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
            <datalist id="stock-suppliers-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Invoice / PO Reference #
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. INV-2026-901"
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
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Cost Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
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

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Retail / MRP (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value === "" ? "" : Number(e.target.value))}
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

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
              Storage / Shelf Location
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="Shelf B-3"
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
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Stock Batch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

