import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, ArrowLeft } from "lucide-react";
import { api, Row } from "../../api";

export function RolesPage() {
  const [roles, setRoles] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api("/roles-list");
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePerm = (section: string, item: string) => {
    if (!editingRole) return;
    const currentList = new Set<string>(editingRole[section] || []);
    if (currentList.has(item)) currentList.delete(item);
    else currentList.add(item);
    setEditingRole({
      ...editingRole,
      [section]: Array.from(currentList),
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSaving(true);
    try {
      await api("/admin/roles-list", "POST", editingRole);
      setEditingRole(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  if (editingRole) {
    return (
      <div className="charm-edit-role-view">
        {/* Header with Back Arrow */}
        <div className="charm-subpage-header">
          <button
            type="button"
            className="charm-settings-back-arrow-btn"
            onClick={() => setEditingRole(null)}
          >
            <ArrowLeft size={16} />
          </button>
          <h2>Edit Role · {editingRole.name}</h2>
        </div>

        <form onSubmit={handleSaveRole} className="charm-edit-role-form">
          {/* Encounters Permission Section */}
          <div className="charm-perm-section">
            <h4 className="charm-perm-section-title">Encounters</h4>
            <div className="charm-perm-grid">
              {[
                "Start Encounter and Enter Vitals",
                "Enter SOAP Notes, Prescribe Medications and Order Labs/Images",
                "Add Quick Rx",
                "View Private Encounters of other members",
                "Change Fee Schedule",
                "Show Procedure Charge",
                "Edit Item Charge in Procedure Codes",
                "Show 'Export Encounter as HL7 for Billing' in Chart Notes",
              ].map((item) => (
                <label key={item} className="charm-perm-label">
                  <input
                    type="checkbox"
                    checked={(editingRole.encounters || []).includes(item)}
                    onChange={() => handleTogglePerm("encounters", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Labs Permission Section */}
          <div className="charm-perm-section">
            <h4 className="charm-perm-section-title">Labs</h4>
            <div className="charm-perm-grid" style={{ gridTemplateColumns: "repeat(3, 120px)" }}>
              {["Add", "Edit", "Delete"].map((item) => (
                <label key={item} className="charm-perm-label">
                  <input
                    type="checkbox"
                    checked={(editingRole.labs || []).includes(item)}
                    onChange={() => handleTogglePerm("labs", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* GPT Assist Access Section */}
          <div className="charm-perm-section">
            <h4 className="charm-perm-section-title">GPT Assist Access</h4>
            <div className="charm-perm-grid">
              {[
                "Ask GPT",
                "Chart Note Assistance",
                "Referral Mail Assistance",
                "Lab Results Opinion",
              ].map((item) => (
                <label key={item} className="charm-perm-label">
                  <input
                    type="checkbox"
                    checked={(editingRole.gpt || []).includes(item)}
                    onChange={() => handleTogglePerm("gpt", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Charm Copilot Section */}
          <div className="charm-perm-section">
            <h4 className="charm-perm-section-title">Charm Copilot</h4>
            <div className="charm-perm-grid">
              {[
                "Text-Only Interaction",
                "Voice Chat",
                "Ambient Voice",
                "Consultation/ Encounter",
                "Nurse Triage",
                "Patient Summarization",
              ].map((item) => (
                <label key={item} className="charm-perm-label">
                  <input
                    type="checkbox"
                    checked={(editingRole.copilot || []).includes(item)}
                    onChange={() => handleTogglePerm("copilot", item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="charm-form-actions-strip">
            <button type="submit" className="charm-btn-orange" disabled={saving}>
              {saving ? "Updating…" : "Update"}
            </button>
            <button
              type="button"
              className="charm-btn-cancel"
              onClick={() => setEditingRole(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="charm-roles-view">
      {/* Top Header Strip with + New Role button */}
      <div className="charm-facility-header-strip">
        <div />
        <button
          type="button"
          className="charm-btn-orange"
          onClick={() => {
            const roleName = prompt("Enter new role name:");
            if (roleName) {
              api("/admin/roles-list", "POST", {
                name: roleName,
                description: "Custom practice role",
                encounters: ["Start Encounter and Enter Vitals"],
                labs: ["Add"],
                gpt: [],
                copilot: [],
              }).then(loadData);
            }
          }}
        >
          <Plus size={15} />
          <span>New Role</span>
        </button>
      </div>

      {/* Table matching CharmHealth */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table">
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Role</th>
              <th style={{ width: "66%" }}>Description</th>
              <th style={{ width: "8%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading roles…
                </td>
              </tr>
            ) : (
              roles.map((r) => (
                <tr key={r.id} className="charm-table-row">
                  <td className="charm-cell-name">
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.description}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="charm-row-more-btn"
                      onClick={() => setEditingRole(r)}
                      title="Edit Role Permissions"
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
    </div>
  );
}

