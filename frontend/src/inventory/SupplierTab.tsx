import React, { useState } from "react";
import { Button, Empty, Loading, ErrorBox } from "../ui";
import { api } from "../api";
import { Plus, Edit2, CheckCircle, XCircle, Phone, Mail, MapPin } from "lucide-react";
import { SupplierModal } from "./SupplierModal";

export interface SupplierTabProps {
  suppliers: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenSupplierModal: () => void;
}

export function SupplierTab({
  suppliers,
  loading,
  onRefresh,
  onOpenSupplierModal,
}: SupplierTabProps) {
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  const handleToggleActive = async (sup: any) => {
    try {
      if (sup.is_active) {
        await api(`/inventory/suppliers/${sup.id}`, "DELETE");
      } else {
        await api(`/inventory/suppliers/${sup.id}`, "PATCH", { is_active: true });
      }
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle supplier status:", err);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          background: "#ffffff",
          padding: 14,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: 16, color: "#0f172a" }}>Medical Suppliers Directory</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Authorized pharmaceutical distributors, manufacturers, and medical supply vendors.
          </p>
        </div>
        <Button variant="primary" onClick={onOpenSupplierModal} aria-label="Add Supplier">
          <Plus size={15} style={{ marginRight: 6 }} /> Supplier
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : suppliers.length === 0 ? (
        <Empty
          title="No suppliers registered"
          body="Add clinical distributors or vendors to assign them to stock batches and purchase orders using the + Supplier button above."
        />
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Supplier</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Contact Person</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Contact Numbers</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Address</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>E-Mail</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Notes</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sup) => (
                <tr key={sup.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{sup.name}</div>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    {sup.contact_person || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155", fontSize: 12 }}>
                    {sup.work_phone && (
                      <div><span style={{ color: "#64748b" }}>Work Ph:</span> {sup.work_phone}</div>
                    )}
                    {sup.mobile_phone && (
                      <div><span style={{ color: "#64748b" }}>Mobile Ph:</span> {sup.mobile_phone}</div>
                    )}
                    {sup.fax && (
                      <div><span style={{ color: "#64748b" }}>Fax:</span> {sup.fax}</div>
                    )}
                    {!sup.work_phone && !sup.mobile_phone && !sup.fax && "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#475569", fontSize: 12 }}>
                    {sup.address_line1 || sup.city ? (
                      <div>
                        {sup.address_line1 && <div>{sup.address_line1}</div>}
                        {sup.city && (
                          <div style={{ color: "#64748b" }}>
                            {sup.city}{sup.state ? `, ${sup.state}` : ""}{sup.postal_code ? ` - ${sup.postal_code}` : ""}
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#334155" }}>
                    {sup.email ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Mail size={12} color="#64748b" /> {sup.email}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#64748b", fontSize: 12, maxWidth: 200 }}>
                    {sup.notes || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingSupplier(sup)}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        <Edit2 size={13} style={{ marginRight: 4 }} /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleToggleActive(sup)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          color: sup.is_active ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {sup.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={() => {
            setEditingSupplier(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

