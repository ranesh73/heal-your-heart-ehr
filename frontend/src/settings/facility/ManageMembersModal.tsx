import React, { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { api, Row } from "../../api";

interface ManageMembersModalProps {
  facility: Row | null;
  allFacilities: Row[];
  onClose: () => void;
  onSaved: () => void;
}

export function ManageMembersModal({
  facility,
  allFacilities,
  onClose,
  onSaved,
}: ManageMembersModalProps) {
  const [selectedFacilityId, setSelectedFacilityId] = useState(
    facility?.id || allFacilities[0]?.id || ""
  );
  const [filterMode, setFilterMode] = useState<"mapped" | "unmapped">("mapped");
  const [members, setMembers] = useState<Row[]>([]);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedFacilityId) return;
    setLoading(true);
    api(`/facilities/${selectedFacilityId}/members`)
      .then((data: Row[]) => {
        setMembers(data);
        const mapped = new Set<string>();
        data.forEach((m) => {
          if (m.mapped) mapped.add(m.id);
        });
        setSelectedUids(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedFacilityId]);

  const handleToggle = (uid: string) => {
    const next = new Set(selectedUids);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setSelectedUids(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/admin/facilities/${selectedFacilityId}/members`, "POST", {
        user_ids: Array.from(selectedUids),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to update facility members");
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const isMapped = selectedUids.has(m.id);
    return filterMode === "mapped" ? isMapped : !isMapped;
  });

  return (
    <div className="charm-modal-overlay" onClick={onClose}>
      <div
        className="charm-modal-dialog"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="charm-modal-header">
          <h3>Manage Members</h3>
          <button
            type="button"
            className="charm-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="charm-modal-body">
          {/* Yellow Info Banner */}
          <div className="charm-info-banner">
            <Info size={16} className="charm-info-icon" />
            <span>
              Check/Uncheck the members listed below to associate/disassociate
              them from the selected facility.
            </span>
          </div>

          {/* Facility Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              margin: "18px 0",
              fontSize: 13,
            }}
          >
            <label style={{ fontWeight: 500, minWidth: 80, color: "#334155" }}>
              Facility
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="charm-form-select"
              style={{ minWidth: 260 }}
            >
              {allFacilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Radio Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 500, minWidth: 80, color: "#334155" }}>
              Show Members
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "mapped"}
                onChange={() => setFilterMode("mapped")}
              />
              <span>Mapped to this facility</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="filterMode"
                checked={filterMode === "unmapped"}
                onChange={() => setFilterMode("unmapped")}
              />
              <span>Not Mapped to this facility</span>
            </label>
          </div>

          {/* Members Checkbox Grid (2 Columns) */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              padding: "12px 16px",
              background: "#fafafa",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              minHeight: 220,
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            <span style={{ fontWeight: 500, minWidth: 80, color: "#334155", paddingTop: 4 }}>
              Members
            </span>
            {loading ? (
              <div style={{ padding: 20, color: "#64748b" }}>Loading members…</div>
            ) : filteredMembers.length === 0 ? (
              <div style={{ padding: 20, color: "#94a3b8", fontStyle: "italic" }}>
                No members found in this view.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 24px",
                  flex: 1,
                }}
              >
                {filteredMembers.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                      color: "#1e293b",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUids.has(m.id)}
                      onChange={() => handleToggle(m.id)}
                    />
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="charm-modal-footer">
          <button
            type="button"
            className="charm-btn-orange"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Updating…" : "Update"}
          </button>
          <button
            type="button"
            className="charm-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

