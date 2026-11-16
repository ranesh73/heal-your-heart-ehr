import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  Save,
  Check,
  AlertCircle,
  X,
  Syringe,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { api, Row } from "../../api";
import { useApp } from "../../context";

export function ManageInjectionsPage() {
  const { notify } = useApp();
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingNotice, setSavingNotice] = useState(false);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [injectionNameInput, setInjectionNameInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalItem, setDeleteModalItem] = useState<Row | null>(null);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      // Pass all=true to see active and inactive if needed, or active by default
      const data = await api<Row[]>("/injections/catalog?all=false");
      setCatalog(data || []);
    } catch (err) {
      console.error("Failed to load injection catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Filter and sort catalog alphabetically
  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase().trim();
    return catalog
      .filter((item) => {
        if (!q) return true;
        return (item.name || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [catalog, search]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCatalog.map((i) => i.id));
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

  const handleOpenAddModal = () => {
    setInjectionNameInput("");
    setAddError(null);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmed = injectionNameInput.trim();

    if (!trimmed) {
      setAddError("Injection Name is required.");
      return;
    }

    // Case-insensitive duplicate check in local state
    const isDuplicate = catalog.some(
      (item) => (item.name || "").toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setAddError(`Injection "${trimmed}" already exists in the catalogue.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api("/admin/injections/catalog", "POST", {
        name: trimmed,
        original_source_name: trimmed,
        verification_status: "verified",
        is_active: true,
      });
      setAddModalOpen(false);
      setInjectionNameInput("");
      notify(`Injection "${trimmed}" added to master catalogue.`);
      await loadCatalog();
    } catch (err: any) {
      setAddError(err.message || "Failed to add injection to catalogue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalItem) return;
    try {
      await api(`/admin/injections/catalog/${deleteModalItem.id}`, "DELETE");
      notify(`Injection "${deleteModalItem.name}" deactivated from active catalogue.`);
      setDeleteModalItem(null);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate injection.");
    }
  };

  const handleSaveChanges = () => {
    setSavingNotice(true);
    notify("Catalogue order and configuration updated.");
    setTimeout(() => setSavingNotice(false), 2500);
  };

  return (
    <div className="charm-settings-tab-inner" style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Subhead Strip with Breadcrumb & Save Changes */}
      <div
        className="charm-settings-subhead-strip"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
            Heal Your Heart · Settings &gt; Injections
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            Manage Injections
          </h2>
          <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
            Injectable medication catalog, predefined doses, administration routes and nurse notes.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {savingNotice && (
            <span style={{ fontSize: 12, color: "#0d9488", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={14} /> Catalog updated
            </span>
          )}
          <button
            type="button"
            className="charm-btn-primary-action"
            onClick={handleSaveChanges}
            style={{
              background: "#00838f",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "7px 16px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          padding: 20,
        }}
      >
        {/* Controls Bar: Search on left, + Injection on right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 16,
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
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
              placeholder="Search by Injection Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="charm-btn-orange-new"
            style={{
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "7px 16px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={15} /> Injection
          </button>
        </div>

        {/* Injection List Table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            Loading injection catalogue...
          </div>
        ) : (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 4, overflow: "hidden" }}>
            <table
              className="charm-settings-table"
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ width: 44, padding: "9px 12px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredCatalog.length > 0 &&
                        selectedIds.length === filteredCatalog.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ padding: "9px 12px", fontWeight: 700 }}>Injection Name</th>
                  <th style={{ padding: "9px 12px", width: 140 }}>Verification</th>
                  <th style={{ width: 60, padding: "9px 12px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "36px 0",
                        textAlign: "center",
                        color: "#64748b",
                      }}
                    >
                      <Syringe size={28} style={{ color: "#cbd5e1", margin: "0 auto 8px auto", display: "block" }} />
                      <strong>No injections found</strong>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        {search ? "No catalogue items matched your search query." : "No injections configured. Click \"+ Injection\" to create."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCatalog.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isSelected ? "#f0fdfa" : "transparent",
                        }}
                      >
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b" }}>
                          {item.name}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 3,
                              background: item.verification_status === "verified" ? "#dcfce7" : "#fef3c7",
                              color: item.verification_status === "verified" ? "#166534" : "#b45309",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <ShieldCheck size={12} />
                            {item.verification_status === "verified" ? "Verified" : "Pending Review"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(item)}
                            title={`Deactivate ${item.name}`}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: 4,
                              borderRadius: 4,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
          <span>Total active catalogue injections: <strong>{filteredCatalog.length}</strong></span>
          {selectedIds.length > 0 && <span>Selected: <strong>{selectedIds.length}</strong> items</span>}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD INJECTION MODAL (Centered, simple form per Part D3)                   */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 6,
              maxWidth: 440,
              width: "100%",
              padding: "20px 24px 24px 24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
          >
            {/* Header with Close X */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 10,
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1e293b" }}>
                Add Injection
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 2,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #f87171",
                  color: "#b91c1c",
                  padding: "8px 12px",
                  borderRadius: 4,
                  marginBottom: 14,
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertCircle size={15} />
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Injection Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Injection Name"
                  value={injectionNameInput}
                  onChange={(e) => setInjectionNameInput(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 13.5,
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Centered Action Buttons */}
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: "#00838f",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 4,
                    padding: "7px 22px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  style={{
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    padding: "7px 22px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE / DEACTIVATE CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {deleteModalItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 6,
              maxWidth: 460,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px 0", color: "#1e293b" }}>
              Deactivate Injection from Catalogue?
            </h3>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 16 }}>
              Are you sure you want to remove <strong>{deleteModalItem.name}</strong> from the active catalogue?
            </p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, padding: "10px 12px", fontSize: 12, color: "#64748b", marginBottom: 20 }}>
              <strong>Clinical Data Preservation Notice:</strong> Deactivating will make this injection unavailable for new clinical orders and administrations, but all historical administration records, prior orders, and audit logs will remain completely preserved.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 4,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

