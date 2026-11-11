import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, X } from "lucide-react";
import { api, Row } from "../../api";

export function FacilityResourcesPage() {
  const [resources, setResources] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, resList] = await Promise.all([
        api("/facilities"),
        api("/facility-resources"),
      ]);
      setFacilities(facs);
      setSelectedFacilityId(facs[0]?.id || "");
      setResources(resList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim()) return;
    setSaving(true);
    try {
      await api("/admin/facility-resources", "POST", {
        facility_id: selectedFacilityId,
        name: resourceName.trim(),
        kind: "EECP Room",
      });
      setShowAddModal(false);
      setResourceName("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create resource");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="charm-facility-resources-view">
      {/* Top Header Strip with New Resource Button */}
      <div className="charm-facility-header-strip">
        <div />
        <button
          type="button"
          className="charm-btn-orange"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} />
          <span>New Resource</span>
        </button>
      </div>

      {/* Table matching CharmHealth */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>Resource Name</th>
              <th style={{ width: "45%" }}>Facility</th>
              <th style={{ width: "10%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading resources…
                </td>
              </tr>
            ) : resources.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No resources configured.
                </td>
              </tr>
            ) : (
              resources.map((res) => (
                <tr key={res.id} className="charm-table-row">
                  <td className="charm-cell-name">
                    <strong>{res.name}</strong>
                  </td>
                  <td>{res.facility_name}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="charm-row-more-btn"
                      onClick={() => alert(`Resource options for ${res.name}`)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Resource Modal */}
      {showAddModal && (
        <div className="charm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="charm-modal-dialog"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-header">
              <h3>New Resource</h3>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddResource}>
              <div className="charm-modal-body">
                <div className="charm-form-group">
                  <label>Facility</label>
                  <select
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(e.target.value)}
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="charm-form-group">
                  <label>Resource Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter resource name"
                    value={resourceName}
                    onChange={(e) => setResourceName(e.target.value)}
                  />
                </div>
              </div>
              <div className="charm-modal-footer">
                <button type="submit" className="charm-btn-orange" disabled={saving}>
                  {saving ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  className="charm-btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

