import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, X } from "lucide-react";
import { api, Row } from "../../api";

export function KioskSetupPage() {
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formState, setFormState] = useState({
    user_name: "",
    access_through: "Web Browser, Tablet (iPad, GTab etc)",
    facilities: [] as string[],
    video_consult: "Not Required",
    modules: ["Patient Demographics", "Insurance", "Questionnaires", "Consent Forms"] as string[],
    checked_in_status: "--Select--",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, facs] = await Promise.all([
        api("/kiosk-accounts"),
        api("/facilities"),
      ]);
      setAccounts(accs);
      setFacilities(facs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (acc: Row) => {
    setEditingAccount(acc);
    setIsNew(false);
    setFormState({
      user_name: acc.user_name || "",
      access_through: acc.access_through || "Web Browser, Tablet (iPad, GTab etc)",
      facilities: acc.facilities || [],
      video_consult: acc.video_consult || "Not Required",
      modules: acc.modules || ["Patient Demographics", "Consent Forms"],
      checked_in_status: acc.checked_in_status || "--Select--",
    });
  };

  const openNew = () => {
    setEditingAccount(null);
    setIsNew(true);
    setFormState({
      user_name: "",
      access_through: "Web Browser, Tablet (iPad, GTab etc)",
      facilities: facilities.slice(0, 2).map((f) => f.name),
      video_consult: "Not Required",
      modules: ["Patient Demographics", "Insurance", "Questionnaires", "Consent Forms"],
      checked_in_status: "--Select--",
    });
  };

  const handleFacilityToggle = (fname: string) => {
    const next = new Set(formState.facilities);
    if (next.has(fname)) next.delete(fname);
    else next.add(fname);
    setFormState({ ...formState, facilities: Array.from(next) });
  };

  const handleModuleToggle = (mod: string) => {
    const next = new Set(formState.modules);
    if (next.has(mod)) next.delete(mod);
    else next.add(mod);
    setFormState({ ...formState, modules: Array.from(next) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.user_name.trim()) return;
    setSaving(true);
    try {
      await api("/admin/kiosk-accounts", "POST", {
        id: editingAccount?.id,
        ...formState,
      });
      setEditingAccount(null);
      setIsNew(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save kiosk account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="charm-kiosk-setup-view">
      {/* Top Strip with + Account button */}
      <div className="charm-facility-header-strip">
        <div />
        <button
          type="button"
          className="charm-btn-orange"
          onClick={openNew}
        >
          <Plus size={15} />
          <span>Account</span>
        </button>
      </div>

      {/* Table matching CharmHealth */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>User Name</th>
              <th style={{ width: "45%" }}>Access through</th>
              <th style={{ width: "10%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading kiosk accounts…
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No kiosk accounts configured.
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id} className="charm-table-row">
                  <td className="charm-cell-name">
                    <strong>{acc.user_name}</strong>
                  </td>
                  <td>{acc.access_through}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="charm-row-more-btn"
                      onClick={() => openEdit(acc)}
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

      {/* Edit / New Account Details Modal */}
      {(editingAccount || isNew) && (
        <div className="charm-modal-overlay" onClick={() => { setEditingAccount(null); setIsNew(false); }}>
          <div
            className="charm-modal-dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-header">
              <h3>{isNew ? "New Account Details" : "Edit Account Details"}</h3>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => { setEditingAccount(null); setIsNew(false); }}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="charm-modal-body">
                <div className="charm-form-group">
                  <label>User Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={formState.user_name}
                    onChange={(e) => setFormState({ ...formState, user_name: e.target.value })}
                  />
                </div>

                <div className="charm-form-group">
                  <label>Access through</label>
                  <select
                    value={formState.access_through}
                    onChange={(e) => setFormState({ ...formState, access_through: e.target.value })}
                  >
                    <option value="Web Browser, Tablet (iPad, GTab etc)">
                      Web Browser, Tablet (iPad, GTab etc)
                    </option>
                    <option value="Kiosk Terminal (self check-in)">
                      Kiosk Terminal (self check-in)
                    </option>
                  </select>
                </div>

                <div className="charm-form-group">
                  <label>Facilities</label>
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      padding: 10,
                      borderRadius: 4,
                      background: "#fafafa",
                    }}
                  >
                    {facilities.map((f) => (
                      <label
                        key={f.id}
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
                          checked={formState.facilities.includes(f.name)}
                          onChange={() => handleFacilityToggle(f.name)}
                        />
                        <span>{f.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="charm-form-group">
                  <label>Video Consult</label>
                  <select
                    value={formState.video_consult}
                    onChange={(e) => setFormState({ ...formState, video_consult: e.target.value })}
                  >
                    <option value="Not Required">Not Required</option>
                    <option value="Required">Required</option>
                  </select>
                </div>

                <div className="charm-form-group">
                  <label>Modules Required</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                    {["Patient Demographics", "Insurance", "Questionnaires", "Consent Forms"].map((mod) => (
                      <label
                        key={mod}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}
                      >
                        <input
                          type="checkbox"
                          checked={formState.modules.includes(mod)}
                          onChange={() => handleModuleToggle(mod)}
                        />
                        <span>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="charm-form-group">
                  <label>
                    Checked-in Status <small style={{ color: "#64748b" }}>(Update appointment status once the patient checks in)</small>
                  </label>
                  <select
                    value={formState.checked_in_status}
                    onChange={(e) => setFormState({ ...formState, checked_in_status: e.target.value })}
                  >
                    <option value="--Select--">--Select--</option>
                    <option value="Checked In">Checked In</option>
                    <option value="In Waiting Room">In Waiting Room</option>
                    <option value="With Physician">With Physician</option>
                  </select>
                </div>
              </div>

              <div className="charm-modal-footer">
                <button type="submit" className="charm-btn-orange" disabled={saving}>
                  {saving ? "Updating…" : isNew ? "Add" : "Update"}
                </button>
                <button
                  type="button"
                  className="charm-btn-cancel"
                  onClick={() => { setEditingAccount(null); setIsNew(false); }}
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

