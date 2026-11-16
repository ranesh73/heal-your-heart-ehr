import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "../ui";
import { api } from "../api";
import { Calendar, Package, AlertCircle } from "lucide-react";

export interface BatchListModalProps {
  item: {
    id: string;
    name: string;
    unit?: string;
  };
  onClose: () => void;
  onAddStockClick: () => void;
}

export function BatchListModal({ item, onClose, onAddStockClick }: BatchListModalProps) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<any[]>(`/inventory/items/${item.id}/batches`);
        setBatches(data || []);
      } catch (err) {
        console.error("Failed to load batches:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [item.id]);

  return (
    <Modal title={`Stock Batches: ${item.name}`} onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          Active and historical batches for this product.
        </p>
        <Button variant="primary" onClick={onAddStockClick}>
          + Add New Batch
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading batches...</div>
      ) : batches.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
          <Package size={32} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>No stock batches recorded yet</p>
          <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#64748b" }}>
            Add your first received stock batch to begin inventory tracking.
          </p>
          <Button variant="primary" onClick={onAddStockClick}>
            + Add Stock Batch
          </Button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "10px 12px" }}>Batch #</th>
                <th style={{ padding: "10px 12px" }}>Expiry Date</th>
                <th style={{ padding: "10px 12px" }}>Supplier</th>
                <th style={{ padding: "10px 12px" }}>Cost Price</th>
                <th style={{ padding: "10px 12px" }}>Location</th>
                <th style={{ padding: "10px 12px" }}>Initial Qty</th>
                <th style={{ padding: "10px 12px" }}>Current Balance</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>
                    {b.batch_number}
                  </td>
                  <td style={{ padding: "10px 12px", color: b.is_expired ? "#ef4444" : "#334155" }}>
                    {b.expiry_date || "N/A"}
                    {b.is_expired && (
                      <span style={{ marginLeft: 6, fontSize: 10, background: "#fee2e2", color: "#b91c1c", padding: "1px 5px", borderRadius: 4 }}>
                        Expired
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {b.supplier_name || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    ₹{(b.cost_price || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {b.storage_location || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>
                    {b.initial_quantity} {item.unit || ""}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: b.current_balance > 0 ? "#0d9488" : "#94a3b8" }}>
                    {b.current_balance} {item.unit || ""}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {b.is_expired ? (
                      <span style={{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                        Expired
                      </span>
                    ) : b.current_balance <= 0 ? (
                      <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                        Depleted
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, background: "#ccfbf1", color: "#0f766e", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

