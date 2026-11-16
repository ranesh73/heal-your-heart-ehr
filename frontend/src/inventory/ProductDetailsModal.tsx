import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "../ui";
import { api } from "../api";
import { Package, Layers, Activity, Calendar } from "lucide-react";

export interface ProductDetailsModalProps {
  itemId: string;
  onClose: () => void;
  onEditClick: () => void;
  onAddStockClick: () => void;
}

export function ProductDetailsModal({ itemId, onClose, onEditClick, onAddStockClick }: ProductDetailsModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<any>(`/inventory/${itemId}`);
        setDetails(data);
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  if (loading) {
    return (
      <Modal title="Product Overview" onClose={onClose} wide>
        <div style={{ padding: 30, textAlign: "center", color: "#64748b" }}>Loading details...</div>
      </Modal>
    );
  }

  if (!details) {
    return (
      <Modal title="Product Overview" onClose={onClose}>
        <div style={{ padding: 20, color: "#ef4444" }}>Product could not be found.</div>
      </Modal>
    );
  }

  return (
    <Modal title={`Product: ${details.name}`} onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "#0f172a" }}>{details.name}</h3>
          {details.trade_name && details.trade_name !== details.name && (
            <span style={{ fontSize: 13, color: "#0d9488", fontWeight: 600 }}>
              Trade Name: {details.trade_name}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={onEditClick}>
            Edit Metadata
          </Button>
          <Button variant="primary" onClick={onAddStockClick}>
            + Add Stock
          </Button>
        </div>
      </div>

      {/* Key Metrics Header Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#0f766e", fontWeight: 600, textTransform: "uppercase" }}>Current Stock</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0d9488", marginTop: 4 }}>
            {details.balance} <span style={{ fontSize: 13, fontWeight: 400 }}>{details.unit || "Units"}</span>
          </div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Reorder Level</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#334155", marginTop: 4 }}>
            {details.reorder_level || 0}
          </div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Cost / Retail (₹)</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#334155", marginTop: 4 }}>
            ₹{(details.cost_price || 0).toFixed(2)} / ₹{(details.retail_price || 0).toFixed(2)}
          </div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Status</div>
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 12,
                background:
                  details.status === "In Stock"
                    ? "#ccfbf1"
                    : details.status === "Low Stock"
                    ? "#fef3c7"
                    : details.status === "Expired"
                    ? "#fee2e2"
                    : "#f1f5f9",
                color:
                  details.status === "In Stock"
                    ? "#0f766e"
                    : details.status === "Low Stock"
                    ? "#92400e"
                    : details.status === "Expired"
                    ? "#991b1b"
                    : "#475569",
              }}
            >
              {details.status}
            </span>
          </div>
        </div>
      </div>

      {/* Product Details Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b" }}>Product Identifiers</h4>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>Category:</span>
            <span style={{ fontWeight: 500 }}>{details.category || "—"}</span>
            <span style={{ color: "#64748b" }}>Group:</span>
            <span style={{ fontWeight: 500 }}>{details.group_name || "Drug"}</span>
            <span style={{ color: "#64748b" }}>Product Code:</span>
            <span style={{ fontWeight: 500 }}>{details.product_code || "—"}</span>
            <span style={{ color: "#64748b" }}>HSN Code:</span>
            <span style={{ fontWeight: 500 }}>{details.hsn_code || "—"}</span>
            <span style={{ color: "#64748b" }}>Manufacturer:</span>
            <span style={{ fontWeight: 500 }}>{details.manufacturer || "—"}</span>
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b" }}>Dosage & Packaging</h4>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>Dose Form:</span>
            <span style={{ fontWeight: 500 }}>{details.dose_form || "Tablet"}</span>
            <span style={{ color: "#64748b" }}>Strength:</span>
            <span style={{ fontWeight: 500 }}>
              {details.strength ? `${details.strength} ${details.strength_unit || ""}` : "—"}
            </span>
            <span style={{ color: "#64748b" }}>Route:</span>
            <span style={{ fontWeight: 500 }}>{details.route || "Oral"}</span>
            <span style={{ color: "#64748b" }}>GST / Tax %:</span>
            <span style={{ fontWeight: 500 }}>{details.tax_percent || 0}%</span>
            <span style={{ color: "#64748b" }}>Order Qty:</span>
            <span style={{ fontWeight: 500 }}>{details.order_quantity || 0}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

