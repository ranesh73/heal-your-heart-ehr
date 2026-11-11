import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { api, Row } from "../../api";
import { ManageMembersModal } from "./ManageMembersModal";
import { AddFacilityPage } from "./AddFacilityPage";

export function FacilityListPage() {
  const [facilities, setFacilities] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Modals / sub-views
  const [editingFacility, setEditingFacility] = useState<Row | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [manageMembersFacility, setManageMembersFacility] = useState<Row | null>(null);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await api("/facilities");
      setFacilities(data);
    } catch (err) {
      console.error("Failed to load facilities", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleDocClick = () => setOpenDropdownId(null);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const handleToggleStatus = async (f: Row) => {
    try {
      await api(`/admin/facilities/${f.id}/status`, "POST");
      await loadFacilities();
    } catch (err: any) {
      alert(err.message || "Failed to toggle facility status");
    }
  };

  if (isAddingNew || editingFacility) {
    return (
      <AddFacilityPage
        initialData={editingFacility}
        onBack={() => {
          setIsAddingNew(false);
          setEditingFacility(null);
        }}
        onSaved={loadFacilities}
      />
    );
  }

  return (
    <div className="charm-facility-list-view">
      {/* Top Practice Name and New Facility Button */}
      <div className="charm-facility-header-strip">
        <div className="charm-practice-name-label">
          <span className="charm-label-dim">Practice Name : </span>
          <span className="charm-practice-name-bold">Heal Your Heart</span>
        </div>

        <button
          type="button"
          className="charm-btn-orange"
          onClick={() => setIsAddingNew(true)}
        >
          <Plus size={15} />
          <span>New Facility</span>
        </button>
      </div>

      {/* Facilities Table matching CharmHealth #facilityList */}
      <div className="charm-table-responsive">
        <table className="charm-custom-table" id="facilityList">
          <thead>
            <tr>
              <th style={{ width: "22%" }}>Name</th>
              <th style={{ width: "38%" }}>Contact Details</th>
              <th style={{ width: "36%" }}>Address</th>
              <th style={{ width: "4%", textAlign: "center" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                  Loading facilities…
                </td>
              </tr>
            ) : facilities.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No facilities found.
                </td>
              </tr>
            ) : (
              facilities.map((fac) => {
                const isInactive = !fac.active;
                const dropdownOpen = openDropdownId === fac.id;

                // Format contact details
                const hasMobile = fac.mobile || fac.phone;
                const contactLines: string[] = [];
                if (fac.mobile) contactLines.push(`Mobile : ${fac.mobile}`);
                if (fac.phone) contactLines.push(`Office Phone : ${fac.phone}`);

                // If address contains contact lines, separate them
                let displayAddress = fac.address || "";
                if (!hasMobile && fac.address && fac.address.includes("Mobile")) {
                  // Pre-formatted
                  displayAddress = fac.address;
                }

                return (
                  <tr
                    key={fac.id}
                    className={`charm-table-row ${isInactive ? "is-inactive" : ""}`}
                  >
                    <td className="charm-cell-name">
                      <span className={isInactive ? "charm-strikethrough-dim" : ""}>
                        {fac.name}
                      </span>
                    </td>

                    <td className="charm-cell-contact">
                      <div className={isInactive ? "charm-strikethrough-dim" : ""}>
                        {contactLines.length > 0 ? (
                          contactLines.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))
                        ) : fac.address && fac.address.includes("Mobile") ? (
                          fac.address
                            .split(",")
                            .filter((s: string) => s.includes("Mobile") || s.includes("Phone"))
                            .map((l: string, idx: number) => <div key={idx}>{l.trim()}</div>)
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </div>
                    </td>

                    <td className="charm-cell-address">
                      <div className={isInactive ? "charm-strikethrough-dim" : ""}>
                        {displayAddress || <span style={{ color: "#94a3b8" }}>—</span>}
                      </div>
                    </td>

                    <td className="charm-cell-actions" style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="charm-row-more-btn"
                        title="Actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(dropdownOpen ? null : fac.id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {dropdownOpen && (
                        <div
                          className="charm-row-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="charm-dropdown-option"
                            onClick={() => {
                              setOpenDropdownId(null);
                              setEditingFacility(fac);
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="charm-dropdown-option"
                            onClick={() => {
                              setOpenDropdownId(null);
                              setManageMembersFacility(fac);
                            }}
                          >
                            Manage Members
                          </button>

                          <button
                            type="button"
                            className="charm-dropdown-option"
                            onClick={() => {
                              setOpenDropdownId(null);
                              handleToggleStatus(fac);
                            }}
                          >
                            {fac.active ? "Deactivate" : "Activate"}
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

      {/* Manage Members Modal */}
      {manageMembersFacility && (
        <ManageMembersModal
          facility={manageMembersFacility}
          allFacilities={facilities}
          onClose={() => setManageMembersFacility(null)}
          onSaved={loadFacilities}
        />
      )}
    </div>
  );
}

