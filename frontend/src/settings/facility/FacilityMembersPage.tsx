import React, { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, X } from "lucide-react";
import { api, Row } from "../../api";

export function FacilityMembersPage() {
  const [subTab, setSubTab] = useState<"active" | "invited">("active");
  const [members, setMembers] = useState<Row[]>([]);
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New member form state
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "assistant",
    phone: "",
    title: "Physician Assistant",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, allStaff] = await Promise.all([
        api("/facilities"),
        api("/staff"),
      ]);
      setFacilities(facs);
      // Fetch users from users table
      const res = await api(`/facilities/${facs[0]?.id || ""}/members`);
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
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        password: "password123",
        facility_ids: facilities.map((f) => f.id),
      });
      setShowAddModal(false);
      setNewMember({ name: "", email: "", role: "assistant", phone: "", title: "Physician Assistant" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create staff member");
    }
  };

  const handleToggleActive = async (member: Row) => {
    try {
      await api(`/admin/users/${member.id}/deactivate`, "POST");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const filteredMembers = members.filter((m) => {
    if (subTab === "active" && !m.active && selectedStatus !== "all" && selectedStatus !== "inactive") {
      // Allow filter
    }
    if (selectedRole !== "all" && m.role !== selectedRole && !(m.title && m.title.toLowerCase().includes(selectedRole))) {
      return false;
    }
    if (selectedStatus === "active" && !m.active) return false;
    if (selectedStatus === "inactive" && m.active) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchPhone = m.phone?.includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="charm-facility-members-view">
      {/* Sub-tabs Strip matching CharmHealth */}
      <div className="charm-subtabs-strip">
        <button
          type="button"
          className={`charm-subtab-btn ${subTab === "active" ? "active" : ""}`}
          onClick={() => setSubTab("active")}
        >
          Active Members
        </button>
        <button
          type="button"
          className={`charm-subtab-btn ${subTab === "invited" ? "active" : ""}`}
          onClick={() => setSubTab("invited")}
        >
          Invited Members
        </button>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="charm-members-filter-bar">
        <div className="charm-filter-group">
          <label>Facility</label>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
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
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="doctor">Physician</option>
            <option value="assistant">Physician Assistant</option>
            <option value="therapist">Therapist</option>
            <option value="reception">Receptionist</option>
            <option value="billing">Billing</option>
            <option value="admin">Practice Admin</option>
          </select>
        </div>

        <div className="charm-filter-group">
          <label>Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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
            placeholder="Search by Name or Contact Details"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          type="button"
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
        <table className="charm-custom-table">
          <thead>
            <tr>
              <th style={{ width: "24%" }}>Name</th>
              <th style={{ width: "36%" }}>Contact Details</th>
              <th style={{ width: "22%" }}>Role</th>
              <th style={{ width: "14%" }}>Status</th>
              <th style={{ width: "4%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading staff directory…
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No members found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const isInactive = !m.active;
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
                    : "Practice Admin"
                );

                return (
                  <tr key={m.id} className="charm-table-row">
                    <td className="charm-cell-name">
                      <strong>{m.name}</strong>
                    </td>
                    <td>
                      <div>{m.email}</div>
                      {m.phone && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Mobile : {m.phone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="charm-role-bracket">[{displayRole}]</span>
                    </td>
                    <td>
                      <span className={m.active ? "charm-status-active" : "charm-status-inactive"}>
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="charm-row-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(dropdownOpen ? null : m.id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {dropdownOpen && (
                        <div className="charm-row-dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            onClick={() => {
                              setOpenDropdownId(null);
                              alert(`Edit profile for ${m.name}`);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleToggleActive(m);
                            }}
                          >
                            {m.active ? "Deactivate" : "Activate"}
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
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="e.g. Dr. Kausiq M"
                  />
                </div>
                <div className="charm-form-group">
                  <label>Email Address <span className="req">*</span></label>
                  <input
                    type="email"
                    required
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="e.g. member@healyourheart.in"
                  />
                </div>
                <div className="charm-form-group">
                  <label>System Role <span className="req">*</span></label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  >
                    <option value="doctor">Physician</option>
                    <option value="assistant">Physician Assistant</option>
                    <option value="therapist">Therapist</option>
                    <option value="reception">Receptionist</option>
                    <option value="billing">Billing Specialist</option>
                    <option value="admin">Practice Admin</option>
                  </select>
                </div>
                <div className="charm-form-group">
                  <label>Mobile Contact</label>
                  <input
                    type="text"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="9003070065"
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

