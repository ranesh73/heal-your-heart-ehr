import React, { useState, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  User,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { api, navigate, Row } from "./api";
import { useApp } from "./context";
import { useQuery } from "@tanstack/react-query";

export function CharmChartNotesGlobal() {
  const { user, patients, staff, refresh, notify } = useApp();

  // Filters matching 1:1 CharmHealth Chart Notes Header
  const [providerFilter, setProviderFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("Unsigned"); // Default Unsigned in CharmHealth
  const [apptStatusFilter, setApptStatusFilter] = useState<string>("All");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("All");
  const [patientSearch, setPatientSearch] = useState<string>("");

  // Modal State for + Consultation
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultPatientId, setConsultPatientId] = useState<string>("");
  const [consultProviderId, setConsultProviderId] = useState<string>(
    user?.role === "doctor" ? user.id : staff.find((s) => s.role === "doctor")?.id || ""
  );
  const [consultVisitType, setConsultVisitType] = useState<string>("EECP On-going Visit");
  const [consultMode, setConsultMode] = useState<string>("In Person");
  const [creatingNote, setCreatingNote] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch encounters from backend
  const encountersQuery = useQuery({
    queryKey: ["encounters"],
    queryFn: () => api<Row[]>("/encounters"),
  });

  // Fetch appointments for appointment status filter correlation
  const apptsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api<Row[]>("/appointments"),
  });

  const doctorStaff = useMemo(() => {
    return staff.filter((s) => s.role === "doctor" || s.role === "admin");
  }, [staff]);

  const appointmentsMap = useMemo(() => {
    const map = new Map<string, Row>();
    (apptsQuery.data || []).forEach((a) => {
      map.set(a.id, a);
    });
    return map;
  }, [apptsQuery.data]);

  // Filtered encounters
  const filteredEncounters = useMemo(() => {
    const list = encountersQuery.data || [];
    return list.filter((enc) => {
      // 1. Provider Filter
      if (providerFilter !== "All" && enc.provider_id !== providerFilter) {
        return false;
      }

      // 2. Chart Status Filter (Unsigned = draft, Signed = signed)
      if (statusFilter === "Unsigned" && enc.status === "signed") {
        return false;
      }
      if (statusFilter === "Signed" && enc.status !== "signed") {
        return false;
      }

      // 3. Appointment Status Filter
      if (apptStatusFilter !== "All") {
        if (enc.appointment_id) {
          const appt = appointmentsMap.get(enc.appointment_id);
          if (appt && appt.status?.toLowerCase() !== apptStatusFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // 4. Visit Type Filter
      if (visitTypeFilter !== "All") {
        const vt = (enc.visit_type || "").toLowerCase();
        const target = visitTypeFilter.toLowerCase();
        if (!vt.includes(target) && !target.includes(vt)) {
          return false;
        }
      }

      // 5. Patient Search (Name or Record ID/MRN)
      if (patientSearch.trim()) {
        const query = patientSearch.trim().toLowerCase();
        const p = patients.find((pat) => pat.id === enc.patient_id);
        const nameMatch = (p?.name || "").toLowerCase().includes(query);
        const mrnMatch = (p?.mrn || "").toLowerCase().includes(query);
        const idMatch = (enc.patient_id || "").toLowerCase().includes(query);
        if (!nameMatch && !mrnMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    encountersQuery.data,
    providerFilter,
    statusFilter,
    apptStatusFilter,
    visitTypeFilter,
    patientSearch,
    patients,
    appointmentsMap,
  ]);

  const handleStartConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultPatientId) {
      notify("Please select a patient.");
      return;
    }
    const provId = consultProviderId || staff.find((s) => s.role === "doctor")?.id || user.id;
    setCreatingNote(true);
    try {
      const created = await api<any>("/encounters", "POST", {
        patient_id: consultPatientId,
        provider_id: provId,
        visit_type: consultVisitType,
        mode: consultMode,
      });
      await encountersQuery.refetch();
      await refresh();
      setShowConsultModal(false);
      navigate(`/encounter/${created.id}/${consultPatientId}`);
    } catch (err: any) {
      notify("Failed to create consultation note: " + (err.message || String(err)));
    } finally {
      setCreatingNote(false);
    }
  };

  const handleDeleteEncounter = async (enc: Row) => {
    if (enc.status === "signed") {
      notify("Signed encounters cannot be deleted.");
      return;
    }
    const pat = patients.find((p) => p.id === enc.patient_id);
    const patName = pat?.name || "this patient";
    if (
      !window.confirm(
        `Are you sure you want to delete the unsigned consultation note for ${patName}?`
      )
    ) {
      return;
    }

    setDeletingId(enc.id);
    try {
      await api(`/encounters/${enc.id}`, "DELETE");
      notify("Consultation note deleted.");
      await encountersQuery.refetch();
      await refresh();
    } catch (err: any) {
      notify("Could not delete note: " + (err.message || String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  const formatTitle = (enc: Row) => {
    const d = enc.created_at ? new Date(enc.created_at) : new Date();
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const prov = staff.find((s) => s.id === enc.provider_id);
    const provName = prov?.name || "Dr. Ramasamy S";
    const vt = enc.visit_type || "EECP On-going Visit";
    const mode = enc.mode || "In Person";
    return `${dateStr} : ${provName} : ${vt} : ${mode}`;
  };

  const formatDate = (enc: Row) => {
    const d = enc.created_at ? new Date(enc.created_at) : new Date();
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getRecordId = (patientId: string) => {
    const pat = patients.find((p) => p.id === patientId);
    return pat?.mrn || (patientId ? "HUHNKR" + patientId.slice(0, 4).toUpperCase() : "-");
  };

  return (
    <div className="charm-global-chart-notes">
      {/* 1. Header with Page Title and + Consultation Action */}
      <div className="charm-cn-header">
        <div className="charm-cn-title-wrap">
          <h2 className="charm-cn-page-title">Chart Notes</h2>
          <span className="charm-cn-count-badge">
            {filteredEncounters.length} {statusFilter.toLowerCase()} note{filteredEncounters.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="charm-cn-actions">
          {["doctor", "admin", "assistant", "reception"].includes(user.role) && (
            <button
              type="button"
              className="charm-btn-teal"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                padding: "7px 16px",
                borderRadius: 4,
              }}
              onClick={() => {
                if (patients.length > 0 && !consultPatientId) {
                  setConsultPatientId(patients[0].id);
                }
                setShowConsultModal(true);
              }}
            >
              <Plus size={16} />
              Consultation
            </button>
          )}
        </div>
      </div>

      {/* 2. CharmHealth 5-Filter Bar */}
      <div className="charm-cn-filter-bar">
        {/* Filter 1: Provider */}
        <div className="charm-cn-filter-item">
          <label className="charm-cn-label">Provider</label>
          <select
            className="charm-cn-select"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          >
            <option value="All">All</option>
            {doctorStaff.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 2: Chart Status (Defaults to Unsigned) */}
        <div className="charm-cn-filter-item">
          <label className="charm-cn-label">Chart Status</label>
          <select
            className="charm-cn-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Unsigned">Unsigned</option>
            <option value="Signed">Signed</option>
            <option value="All">All</option>
          </select>
        </div>

        {/* Filter 3: Appointment Status */}
        <div className="charm-cn-filter-item">
          <label className="charm-cn-label">Appointment Status</label>
          <select
            className="charm-cn-select"
            value={apptStatusFilter}
            onChange={(e) => setApptStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="checked-in">Checked-In</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {/* Filter 4: Visit Type */}
        <div className="charm-cn-filter-item">
          <label className="charm-cn-label">Visit Type</label>
          <select
            className="charm-cn-select"
            value={visitTypeFilter}
            onChange={(e) => setVisitTypeFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="EECP On-going Visit">EECP On-going Visit : In Person</option>
            <option value="Follow-up Visit">Follow-up Visit : In Person</option>
            <option value="EECP Treatment 20 Sessions">EECP Treatment 20 Sessions : In Person</option>
            <option value="Walk-in">Walk-in (New Patient Visit) : In Person</option>
            <option value="Cardiology Consultation">Cardiology Consultation : In Person</option>
          </select>
        </div>

        {/* Filter 5: Patient Search */}
        <div className="charm-cn-filter-item search-item">
          <label className="charm-cn-label">Patient</label>
          <div className="charm-cn-search-wrap">
            <Search size={14} className="charm-cn-search-icon" />
            <input
              type="text"
              className="charm-cn-search-input"
              placeholder="Search Patient by Name / ID"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
            {patientSearch && (
              <button
                type="button"
                className="charm-cn-clear-btn"
                onClick={() => setPatientSearch("")}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Authentic CharmHealth Data Table */}
      <div className="charm-cn-table-wrap">
        {encountersQuery.isLoading ? (
          <div className="charm-cn-loading">
            <Clock size={20} className="spinning" />
            <span>Loading Chart Notes...</span>
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div className="charm-cn-empty-state">
            <ClipboardList size={36} color="#94a3b8" />
            <div className="charm-cn-empty-title">No Chart Notes Found</div>
            <p className="charm-cn-empty-sub">
              No consultation notes match your selected filters (Status: {statusFilter}, Provider:{" "}
              {providerFilter === "All" ? "All" : staff.find((s) => s.id === providerFilter)?.name}).
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="charm-btn-secondary"
                onClick={() => {
                  setProviderFilter("All");
                  setStatusFilter("All");
                  setApptStatusFilter("All");
                  setVisitTypeFilter("All");
                  setPatientSearch("");
                }}
              >
                Clear Filters
              </button>
              {["doctor", "admin", "assistant", "reception"].includes(user.role) && (
                <button
                  type="button"
                  className="charm-btn-teal"
                  onClick={() => setShowConsultModal(true)}
                >
                  <Plus size={14} /> New Consultation
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="charm-cn-table">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Title</th>
                <th style={{ width: "22%" }}>Patient</th>
                <th style={{ width: "16%" }}>Record ID</th>
                <th style={{ width: "14%" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Date <ChevronDown size={14} />
                  </div>
                </th>
                <th style={{ width: "6%", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEncounters.map((enc) => {
                const pat = patients.find((p) => p.id === enc.patient_id);
                const titleText = formatTitle(enc);
                const isSigned = enc.status === "signed";

                return (
                  <tr key={enc.id} className="charm-cn-row">
                    {/* Title with link to open encounter */}
                    <td className="charm-cn-title-col">
                      <button
                        type="button"
                        className="charm-cn-title-link"
                        onClick={() => navigate(`/encounter/${enc.id}/${enc.patient_id}`)}
                        title="Click to open consultation chart note"
                      >
                        {titleText}
                      </button>
                      {isSigned && (
                        <span className="charm-cn-signed-pill" title="Signed Encounter">
                          Signed
                        </span>
                      )}
                    </td>

                    {/* Patient link to chart */}
                    <td>
                      <button
                        type="button"
                        className="charm-cn-patient-link"
                        onClick={() => navigate(`/patients/${enc.patient_id}`)}
                        title="Open Patient Chart"
                      >
                        {pat?.name || "Patient"}
                      </button>
                    </td>

                    {/* Record ID / MRN */}
                    <td className="charm-cn-mrn-col">
                      {getRecordId(enc.patient_id)}
                    </td>

                    {/* Date */}
                    <td className="charm-cn-date-col">
                      {formatDate(enc)}
                    </td>

                    {/* Actions (Delete icon) */}
                    <td style={{ textAlign: "center" }}>
                      {!isSigned ? (
                        <button
                          type="button"
                          className="charm-cn-action-del"
                          onClick={() => handleDeleteEncounter(enc)}
                          disabled={deletingId === enc.id}
                          title="Delete Unsigned Consultation"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <span
                          className="charm-cn-action-locked"
                          title="Signed encounters cannot be deleted"
                        >
                          <CheckCircle2 size={15} color="#10b981" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Modal: Start Consultation */}
      {showConsultModal && (
        <div className="charm-modal-backdrop" onClick={() => setShowConsultModal(false)}>
          <div
            className="charm-modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="charm-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ClipboardList size={18} color="#00838f" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Start Consultation
                </h3>
              </div>
              <button
                type="button"
                className="charm-modal-close"
                onClick={() => setShowConsultModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleStartConsultation}>
              <div className="charm-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Patient Selector */}
                <div>
                  <label className="charm-field-label">Select Patient *</label>
                  <select
                    className="charm-input-field"
                    value={consultPatientId}
                    onChange={(e) => setConsultPatientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.mrn || "HUHNKR" + p.id.slice(0, 4)}] - DOB: {p.dob || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Provider Selector */}
                <div>
                  <label className="charm-field-label">Clinician / Provider *</label>
                  <select
                    className="charm-input-field"
                    value={consultProviderId}
                    onChange={(e) => setConsultProviderId(e.target.value)}
                    required
                  >
                    {doctorStaff.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visit Type */}
                <div>
                  <label className="charm-field-label">Visit Type *</label>
                  <select
                    className="charm-input-field"
                    value={consultVisitType}
                    onChange={(e) => setConsultVisitType(e.target.value)}
                    required
                  >
                    <option value="EECP On-going Visit">EECP On-going Visit</option>
                    <option value="Follow-up Visit">Follow-up Visit</option>
                    <option value="EECP Treatment 20 Sessions">EECP Treatment 20 Sessions</option>
                    <option value="Walk-in (New Patient Visit)">Walk-in (New Patient Visit)</option>
                    <option value="Cardiology Consultation">Cardiology Consultation</option>
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label className="charm-field-label">Consultation Mode</label>
                  <select
                    className="charm-input-field"
                    value={consultMode}
                    onChange={(e) => setConsultMode(e.target.value)}
                  >
                    <option value="In Person">In Person</option>
                    <option value="Telehealth">Telehealth</option>
                  </select>
                </div>
              </div>

              <div className="charm-modal-footer">
                <button
                  type="button"
                  className="charm-btn-secondary"
                  onClick={() => setShowConsultModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="charm-btn-teal"
                  disabled={creatingNote || !consultPatientId}
                >
                  {creatingNote ? "Opening..." : "+ Create Chart Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
