import React, { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, X, ChevronLeft, ChevronRight, Edit2, UserCheck, UserX, Trash2 } from "lucide-react";
import { api, Row } from "../../api";

const ALL_ROLES = [
  "All Roles",
  "Therapist",
  "Physician Assistant",
  "PA",
  "Physician",
  "PracticeAdmin",
  "Receptionist",
  "Charted Accountant",
  "Accounts Assistant",
  "Charm Assistant",
  "Lab Technician",
  "Clinic Administrator",
  "Clinic Admin Asst",
  "Follow Up Assistant",
];

export function FacilityMembersPage() {
  const [subTab, setSubTab] = useState<"active" | "invited">("active");
  const [members, setMembers] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Row | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // New member form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "assistant",
    title: "Physician Assistant",
    phone: "",
    password: "password123",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, allStaff] = await Promise.all([
        api("/facilities"),
        api("/staff"),
      ]);
      setFacilities(facs);
      const targetFacId = facs[0]?.id || "";
      const res = await api(`/facilities/${targetFacId}/members`);
      setMembers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleDoc = () => setOpenDropdownId(null);
    document.addEventListener("click", handleDoc);
    return () => document.removeEventListener("click", handleDoc);
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/admin/users", "POST", {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        title: formData.title,
        phone: formData.phone,
        password: formData.password || "password123",
        facility_ids: facilities.map((f) => f.id),
      });
      setShowAddModal(false);
      setFormData({ name: "", email: "", role: "assistant", title: "Physician Assistant", phone: "", password: "password123" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create staff member");
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await api(`/admin/users/${editingMember.id}`, "PUT", {
        name: editingMember.name,
        role: editingMember.role,
        title: editingMember.title,
        phone: editingMember.phone,
      });
      setEditingMember(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update staff member");
    }
  };

  const handleToggleStatus = async (member: Row) => {
    try {
      await api(`/admin/users/${member.id}/toggle-status`, "POST");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to change status");
    }
  };

  const handleDeleteMember = async (member: Row) => {
    if (!confirm(`Are you sure you want to deactivate ${member.name}? Their clinical history and audit records will be preserved.`)) {
      return;
    }
    try {
      await api(`/admin/users/${member.id}`, "DELETE");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate member");
    }
  };

  // Filter members
  const filteredMembers = members.filter((m) => {
    // Role filter
    if (selectedRole !== "All Roles") {
      const matchRole = m.title?.toLowerCase() === selectedRole.toLowerCase() ||
        (m.title && m.title.toLowerCase().includes(selectedRole.toLowerCase())) ||
        m.role?.toLowerCase() === selectedRole.toLowerCase();
      if (!matchRole) return false;
    }

    // Status filter
    if (selectedStatus === "active" && !m.active) return false;
    if (selectedStatus === "inactive" && m.active) return false;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchPhone = m.phone?.includes(q);
      const matchTitle = m.title?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchTitle) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredMembers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const currentMembers = filteredMembers.slice(startIdx, endIdx);

  return (
    <div className="charm-facility-members-view" data-testid="facility-members-view">
      {/* Sub-tabs Strip matching CharmHealth */}
      <div className="charm-subtabs-strip">
        <button
          type="button"
          className={`charm-subtab-btn ${subTab === "active" ? "active" : ""}`}
          onClick={() => {
            setSubTab("active");
            setPage(1);
          }}
        >
          Active Members
        </button>
        <button
          type="button"
          className={`charm-subtab-btn ${subTab === "invited" ? "active" : ""}`}
          onClick={() => {
            setSubTab("invited");
            setPage(1);
          }}
        >
          Invited Members
        </button>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="charm-members-filter-bar">
        <div className="charm-filter-group">
          <label>Facility</label>
          <select
            data-testid="filter-facility-select"
            value={selectedFacility}
            onChange={(e) => {
              setSelectedFacility(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="charm-filter-group">
          <label>Role</label>
          <select
            data-testid="filter-role-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="charm-filter-group">
          <label>Status</label>
          <select
            data-testid="filter-status-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="charm-members-search-wrap">
          <Search size={14} className="charm-filter-search-icon" />
          <input
            type="text"
            data-testid="members-search-input"
            placeholder="Search by Name or Contact Details"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          type="button"
          data-testid="add-member-btn"
          className="charm-btn-orange"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} />
          <span>Member</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table" data-testid="facility-members-table">
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Name</th>
              <th style={{ width: "34%" }}>Contact Details</th>
              <th style={{ width: "22%" }}>Role</th>
              <th style={{ width: "12%" }}>Status</th>
              <th style={{ width: "6%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading staff directory…
                </td>
              </tr>
            ) : currentMembers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No members found matching filter criteria.
                </td>
              </tr>
            ) : (
              currentMembers.map((m) => {
                const dropdownOpen = openDropdownId === m.id;
                const displayRole = m.title || (
                  m.role === "doctor"
                    ? "Physician"
                    : m.role === "assistant"
                    ? "Physician Assistant"
                    : m.role === "therapist"
                    ? "Therapist"
                    : m.role === "reception"
                    ? "Receptionist"
                    : m.role === "billing"
                    ? "Charted Accountant"
                    : "PracticeAdmin"
                );

                return (
                  <tr key={m.id} className="charm-table-row" data-testid={`member-row-${m.id}`}>
                    <td className="charm-cell-name">
                      <strong>{m.name}</strong>
                    </td>
                    <td>
                      {m.phone ? (
                        <div style={{ color: "#334155" }}>
                          Mobile : {m.phone}
                        </div>
                      ) : (
                        <div>{m.email}</div>
                      )}
                    </td>
                    <td>
                      <span className="charm-role-bracket" style={{ color: "#0f766e", fontWeight: 600 }}>
                        [{displayRole}]
                      </span>
                    </td>
                    <td>
                      <span
                        className={m.active ? "charm-status-active" : "charm-status-inactive"}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: m.active ? "#ecfdf5" : "#f1f5f9",
                          color: m.active ? "#059669" : "#64748b",
                        }}
                      >
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ position: "relative", textAlign: "center" }}>
                      <button
                        type="button"
                        data-testid={`member-actions-btn-${m.id}`}
                        className="charm-row-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(dropdownOpen ? null : m.id);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "4px",
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {dropdownOpen && (
                        <div
                          className="charm-row-dropdown"
                          data-testid={`member-dropdown-${m.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            zIndex: 100,
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                            minWidth: "150px",
                            padding: "4px 0",
                            textAlign: "left",
                          }}
                        >
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            data-testid={`action-edit-${m.id}`}
                            onClick={() => {
                              setOpenDropdownId(null);
                              setEditingMember(m);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              backgroundColor: "transparent",
                              fontSize: "13px",
                              color: "#334155",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <Edit2 size={14} color="#0d9488" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            data-testid={`action-toggle-status-${m.id}`}
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleToggleStatus(m);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              backgroundColor: "transparent",
                              fontSize: "13px",
                              color: "#334155",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            {m.active ? <UserX size={14} color="#dc2626" /> : <UserCheck size={14} color="#059669" />}
                            <span>{m.active ? "Deactivate" : "Make Active"}</span>
                          </button>
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            data-testid={`action-delete-${m.id}`}
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleDeleteMember(m);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              backgroundColor: "transparent",
                              fontSize: "13px",
                              color: "#dc2626",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <Trash2 size={14} color="#dc2626" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Authentic Pagination Matching Video: "1 - 25 of 62 < >" */}
      <div
        data-testid="facility-members-pagination"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "14px 16px",
          gap: "12px",
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          fontSize: "13px",
          color: "#475569",
        }}
      >
        <span>
          {totalItems > 0 ? `${startIdx + 1} - ${endIdx} of ${totalItems}` : "0 - 0 of 0"}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            type="button"
            data-testid="pagination-prev-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{
              backgroundColor: page <= 1 ? "#f1f5f9" : "#0d9488",
              color: page <= 1 ? "#94a3b8" : "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            data-testid="pagination-next-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              backgroundColor: page >= totalPages ? "#f1f5f9" : "#0d9488",
              color: page >= totalPages ? "#94a3b8" : "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="charm-modal-overlay" onClick={() => setEditingMember(null)}>
          <div
            className="charm-modal-dialog"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-header">
              <h3>Edit Member Profile</h3>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => setEditingMember(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateMember}>
              <div className="charm-modal-body">
                <div className="charm-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  />
                </div>
                <div className="charm-form-group">
                  <label>Title / Clinical Designation</label>
                  <input
                    type="text"
                    value={editingMember.title || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, title: e.target.value })}
                    placeholder="e.g. Therapist, Physician Assistant"
                  />
                </div>
                <div className="charm-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={editingMember.phone || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    placeholder="9003078282"
                  />
                </div>
                <div className="charm-form-group">
                  <label>System Role</label>
                  <select
                    value={editingMember.role || "assistant"}
                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  >
                    <option value="doctor">Physician</option>
                    <option value="assistant">Physician Assistant</option>
                    <option value="therapist">Therapist</option>
                    <option value="reception">Receptionist</option>
                    <option value="billing">Chartered Accountant / Billing</option>
                    <option value="admin">Practice Admin</option>
                  </select>
                </div>
              </div>
              <div className="charm-modal-footer">
                <button type="submit" className="charm-btn-orange">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="charm-btn-cancel"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="charm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="charm-modal-dialog"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-header">
              <h3>New Member</h3>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="charm-modal-body">
                <div className="charm-form-group">
                  <label>Full Name <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Kausiq M"
                  />
                </div>
                <div className="charm-form-group">
                  <label>Email Address <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. member@healyourheart.in"
                  />
                </div>
                <div className="charm-form-group">
                  <label>Title / Role Label</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Therapist, Lab Technician"
                  />
                </div>
                <div className="charm-form-group">
                  <label>System Role <span className="req">*</span></label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="doctor">Physician</option>
                    <option value="assistant">Physician Assistant</option>
                    <option value="therapist">Therapist</option>
                    <option value="reception">Receptionist</option>
                    <option value="billing">Chartered Accountant / Billing</option>
                    <option value="admin">Practice Admin</option>
                  </select>
                </div>
                <div className="charm-form-group">
                  <label>Mobile Contact</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9003078282"
                  />
                </div>
              </div>
              <div className="charm-modal-footer">
                <button type="submit" className="charm-btn-orange">
                  Add Member
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
