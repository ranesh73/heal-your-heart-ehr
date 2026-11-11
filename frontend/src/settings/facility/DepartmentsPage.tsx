import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, X } from "lucide-react";
import { api, Row } from "../../api";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Row[]>([]);
  const [staffList, setStaffList] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formState, setFormState] = useState({
    name: "",
    facility: "Heal Your Heart Neelankarai",
    members: [] as string[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [depts, facs, staff] = await Promise.all([
        api("/departments"),
        api("/facilities"),
        api("/staff"),
      ]);
      setDepartments(depts);
      setFacilities(facs);
      setStaffList(staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (d: Row) => {
    setEditingDept(d);
    setIsNew(false);
    setFormState({
      name: d.name || "",
      facility: d.facility || "Heal Your Heart Neelankarai",
      members: d.members || [],
    });
  };

  const openNew = () => {
    setEditingDept(null);
    setIsNew(true);
    setFormState({
      name: "",
      facility: facilities[0]?.name || "--Select--",
      members: [],
    });
  };

  const handleMemberToggle = (name: string) => {
    const next = new Set(formState.members);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setFormState({ ...formState, members: Array.from(next) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) return;
    setSaving(true);
    try {
      await api("/admin/departments", "POST", {
        id: editingDept?.id,
        ...formState,
      });
      setEditingDept(null);
      setIsNew(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="charm-departments-view">
      {/* Top Header Strip with + Department button */}
      <div className="charm-facility-header-strip">
        <div />
        <button
          type="button"
          className="charm-btn-orange"
          onClick={openNew}
        >
          <Plus size={15} />
          <span>Department</span>
        </button>
      </div>

      {/* Table matching CharmHealth */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Department Name</th>
              <th style={{ width: "55%" }}>Department Members</th>
              <th style={{ width: "10%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading departments…
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="charm-table-row">
                  <td className="charm-cell-name">
                    <strong>{dept.name}</strong>
                  </td>
                  <td>
                    {dept.members && dept.members.length > 0 ? (
                      dept.members.join(", ")
                    ) : (
                      <span style={{ color: "#94a3b8" }}>No members assigned</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="charm-row-more-btn"
                      onClick={() => openEdit(dept)}
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

      {/* New / Edit Department Modal */}
      {(editingDept || isNew) && (
        <div className="charm-modal-overlay" onClick={() => { setEditingDept(null); setIsNew(false); }}>
          <div
            className="charm-modal-dialog"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-header">
              <h3>{isNew ? "New Department" : "Edit Department"}</h3>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => { setEditingDept(null); setIsNew(false); }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="charm-modal-body">
                <div className="charm-form-group">
                  <label>Department Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  />
                </div>

                <div className="charm-form-group">
                  <label>Facility <span className="req">*</span></label>
                  <select
                    value={formState.facility}
                    onChange={(e) => setFormState({ ...formState, facility: e.target.value })}
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="charm-form-group">
                  <label>Department Members <span className="req">*</span></label>
                  <div
                    style={{
                      maxHeight: 240,
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      padding: 10,
                      borderRadius: 4,
                      background: "#fafafa",
                    }}
                  >
                    {staffList.map((s) => (
                      <label
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          marginBottom: 6,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formState.members.includes(s.name)}
                          onChange={() => handleMemberToggle(s.name)}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="charm-modal-footer">
                <button type="submit" className="charm-btn-orange" disabled={saving}>
                  {saving ? "Saving…" : isNew ? "Add" : "Update"}
                </button>
                <button
                  type="button"
                  className="charm-btn-cancel"
                  onClick={() => { setEditingDept(null); setIsNew(false); }}
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

