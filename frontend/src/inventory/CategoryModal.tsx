import React, { useState } from "react";
import { Modal, Button, ErrorBox } from "../ui";
import { api } from "../api";

export interface CategoryModalProps {
  category?: {
    id: string;
    name: string;
    group_name: string;
    description: string;
  } | null;
  onClose: () => void;
  onSuccess: (cat: any) => void;
}

export function CategoryModal({ category, onClose, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState(category?.name || "");
  const [groupName, setGroupName] = useState(category?.group_name || "Drug");
  const [description, setDescription] = useState(category?.description || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        group_name: groupName.trim() || "Drug",
        description: description.trim(),
      };
      let res;
      if (category?.id) {
        res = await api(`/inventory/categories/${category.id}`, "PATCH", payload);
      } else {
        res = await api("/inventory/categories", "POST", payload);
      }
      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={category ? "Edit Inventory Category" : "Add Inventory Category"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ErrorBox error={error} />

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Group <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          >
            <option value="Drug">Drug</option>
            <option value="Consumable">Consumable</option>
            <option value="Equipment">Equipment</option>
            <option value="Diagnostic">Diagnostic</option>
            <option value="General Supply">General Supply</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Category Name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Oral Hypoglycemic, Antiplatelet"
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
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional clinical or departmental notes about this category..."
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : category ? "Update Category" : "Save Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

