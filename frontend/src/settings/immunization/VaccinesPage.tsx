import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { api } from "../../api";

interface VaccineItem {
  id: string;
  name: string;
  vaccine_name: string;
  description: string;
  is_added_in_inventory: "Yes" | "No";
  is_in_inventory_bool: boolean;
  code?: string;
  cvx_code?: string;
  dose?: string;
  route?: string;
}

interface VaccinesPageProps {
  onAddNew: () => void;
}

export function VaccinesPage({ onAddNew }: VaccinesPageProps) {
  const [vaccines, setVaccines] = useState<VaccineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Selected for bulk deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchVaccines = async (query = searchQuery, targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const q = encodeURIComponent(query.trim());
      const res = await api<{ items: VaccineItem[]; total: number; page: number; limit: number }>(
        `/settings/immunization/vaccines?search=${q}&page=${targetPage}&limit=${pageSize}`
      );
      setVaccines(res?.items || []);
      setTotal(res?.total || 0);
      setPage(res?.page || 1);
    } catch (err: any) {
      setError(err?.message || "Failed to load vaccines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccines(searchQuery, page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVaccines(searchQuery, 1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(vaccines.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected vaccine(s)?`)) return;

    setDeleting(true);
    try {
      await api("/settings/immunization/vaccines", "DELETE", { ids: selectedIds });
      setSelectedIds([]);
      fetchVaccines();
    } catch (err: any) {
      alert(err?.message || "Failed to delete selected vaccines.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (vac: VaccineItem) => {
    if (!confirm(`Are you sure you want to delete vaccine "${vac.name}"?`)) return;
    try {
      await api(`/settings/immunization/vaccines/${vac.id}`, "DELETE");
      setSelectedIds((prev) => prev.filter((id) => id !== vac.id));
      fetchVaccines();
    } catch (err: any) {
      alert(err?.message || "Failed to delete vaccine.");
    }
  };

  // Pagination string calculation
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const totalPages = Math.ceil(total / pageSize) || 1;

  const isAllSelected = vaccines.length > 0 && selectedIds.length === vaccines.length;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Filter and Action Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* LEFT: Search Field */}
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: 280,
            }}
          >
            <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 10 }} />
            <input
              type="text"
              placeholder="Search by Vaccine Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => fetchVaccines(searchQuery, 1)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 32px",
                fontSize: 13,
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                outline: "none",
                background: "#ffffff",
                color: "#1e293b",
              }}
            />
          </div>
        </form>

        {/* RIGHT: + New Vaccine & Delete Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={onAddNew}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              background: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <Plus size={15} /> New Vaccine
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0 || deleting}
            onClick={handleDeleteSelected}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: selectedIds.length > 0 ? "#ffffff" : "#f8fafc",
              color: selectedIds.length > 0 ? "#dc2626" : "#94a3b8",
              border: "1px solid",
              borderColor: selectedIds.length > 0 ? "#fecaca" : "#e2e8f0",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 14,
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Vaccine Table */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
              <th style={{ width: 36, padding: "10px 12px", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                Vaccine Name
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                Vaccine Description
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: 180 }}>
                Is Added in Inventory
              </th>
              <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", textAlign: "right", width: 80 }}>
                Delete
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px 14px", textAlign: "center", color: "#64748b" }}>
                  Loading vaccines...
                </td>
              </tr>
            ) : vaccines.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "36px 14px", textAlign: "center", color: "#64748b" }}>
                  No vaccine records found. Click <strong>+ New Vaccine</strong> to add one.
                </td>
              </tr>
            ) : (
              vaccines.map((vac) => {
                const isSelected = selectedIds.includes(vac.id);
                return (
                  <tr
                    key={vac.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: isSelected ? "#f0fdf4" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(vac.id)}
                      />
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>
                      {vac.name}
                      {vac.cvx_code && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                          (CVX: {vac.cvx_code})
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        color: "#475569",
                        maxWidth: 420,
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {vac.description || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: vac.is_added_in_inventory === "Yes" ? "#15803d" : "#64748b",
                        }}
                      >
                        {vac.is_added_in_inventory}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(vac)}
                        title="Delete Vaccine"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          padding: 4,
                          borderRadius: 4,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
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

      {/* Pagination Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 16,
          marginTop: 14,
          fontSize: 13,
          color: "#64748b",
        }}
      >
        <span>
          {startItem} - {endItem} of {total}
        </span>

        <div style={{ display: "inline-flex", gap: 4 }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              background: page <= 1 ? "#f1f5f9" : "#ffffff",
              color: page <= 1 ? "#cbd5e1" : "#334155",
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              background: page >= totalPages ? "#f1f5f9" : "#ffffff",
              color: page >= totalPages ? "#cbd5e1" : "#334155",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

