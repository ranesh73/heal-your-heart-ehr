import React, { useState } from "react";
import { Button, Empty, Loading, ErrorBox } from "../ui";
import { api } from "../api";
import { Plus, Edit2, CheckCircle, XCircle, Tag } from "lucide-react";
import { CategoryModal } from "./CategoryModal";

export interface CategoryTabProps {
  categories: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCategoryModal: () => void;
}

export function CategoryTab({
  categories,
  loading,
  onRefresh,
  onOpenCategoryModal,
}: CategoryTabProps) {
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const handleToggleActive = async (cat: any) => {
    try {
      if (cat.is_active) {
        await api(`/inventory/categories/${cat.id}`, "DELETE");
      } else {
        await api(`/inventory/categories/${cat.id}`, "PATCH", { is_active: true });
      }
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle category status:", err);
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
          <h3 style={{ margin: "0 0 2px", fontSize: 16, color: "#0f172a" }}>Product Categories</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Classification hierarchy across drugs, medical consumables, diagnostic supplies, and clinic equipment.
          </p>
        </div>
        <Button variant="primary" onClick={onOpenCategoryModal} aria-label="Add Category">
          <Plus size={15} style={{ marginRight: 6 }} /> Category
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <Empty
          title="No categories configured"
          body="Add clinical categories to classify products, filter searches, and segment stock reports using the + Category button above."
        />
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Category</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Group</th>
                <th style={{ padding: "12px 14px", fontWeight: 600 }}>Description</th>
                <th style={{ padding: "12px 14px", fontWeight: 600, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Tag size={14} color="#0d9488" />
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "#f1f5f9",
                        color: "#334155",
                        fontWeight: 600,
                      }}
                    >
                      {cat.group_name || "General"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: "#64748b" }}>
                    {cat.description || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontWeight: 600,
                          background: cat.is_active ? "#ccfbf1" : "#f1f5f9",
                          color: cat.is_active ? "#0f766e" : "#64748b",
                          marginRight: 6,
                        }}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => setEditingCategory(cat)}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        <Edit2 size={13} style={{ marginRight: 4 }} /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleToggleActive(cat)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          color: cat.is_active ? "#dc2626" : "#16a34a",
                        }}
                      >
                        {cat.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingCategory && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={() => {
            setEditingCategory(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

