import React, { useState, useEffect } from "react";
import { Modal, Button } from "../ui";
import { api } from "../api";
import { History } from "lucide-react";

export interface StockMovementModalProps {
  item: {
    id: string;
    name: string;
    unit?: string;
  };
  onClose: () => void;
}

export function StockMovementModal({ item, onClose }: StockMovementModalProps) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<any[]>(`/inventory/items/${item.id}/movements`);
        setMovements(data || []);
      } catch (err) {
        console.error("Failed to load movements:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [item.id]);

  return (
    <Modal title={`Stock Movement Audit: ${item.name}`} onClose={onClose} wide>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
        Chronological audit ledger of all receipts, adjustments, and clinical dispensing events.
      </p>

      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading movements...</div>
      ) : movements.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", background: "#f8fafc", borderRadius: 8 }}>
          <History size={32} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>No stock transactions yet</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "10px 12px" }}>Timestamp</th>
                <th style={{ padding: "10px 12px" }}>Type</th>
                <th style={{ padding: "10px 12px" }}>Batch #</th>
                <th style={{ padding: "10px 12px" }}>Quantity Change</th>
                <th style={{ padding: "10px 12px" }}>Reason / Notes</th>
                <th style={{ padding: "10px 12px" }}>Staff / Actor</th>
                <th style={{ padding: "10px 12px" }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv) => {
                const isPositive = mv.quantity > 0;
                return (
                  <tr key={mv.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {mv.created_at ? new Date(mv.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "capitalize",
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: isPositive ? "#ccfbf1" : "#fee2e2",
                          color: isPositive ? "#0f766e" : "#991b1b",
                        }}
                      >
                        {mv.movement_type || (isPositive ? "Received" : "Dispensed")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1e293b" }}>
                      {mv.batch_number || "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: 700,
                        color: isPositive ? "#0d9488" : "#dc2626",
                      }}
                    >
                      {isPositive ? `+${mv.quantity}` : mv.quantity} {item.unit || ""}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#334155" }}>
                      {mv.reason || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {mv.actor_name || "Staff"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {mv.reference || "—"}
                    </td>
                  </tr>
                );
              })}
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

