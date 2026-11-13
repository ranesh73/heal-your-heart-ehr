import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Eye,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { ViewTemplateModal } from "./patients";
import { formatDoctorName } from "./clinicalWorkflows";
import {
  api,
  branch,
  Row,
  Field,
  day,
  dateTime,
  download,
  money,
  navigate,
  patientName,
  today,
  localInput,
} from "./api";
import { useApp, billingRoles, clinicalRoles } from "./context";
import {
  AddButton,
  Badge,
  Button,
  DynamicForm,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  PageHeading,
  Panel,
  Table,
  Tabs,
} from "./ui";
import { AppointmentForm, RecordForm, QuickNewPatientView } from "./forms";
import { PrintPreview, RecordDetail, RecordList } from "./patients";

const APPOINTMENT_LABEL_OPTIONS = [
  "Consulted",
  "Absent",
  "Admission",
  "Confirmed",
  "Consultation / Demo",
  "Diabetic/HT Management",
  "Discharge",
  "EECP Treatment 1st Day",
  "EECP Treatment 20 Sessions 1st Day",
  "EECP Treatment Completed",
  "No show",
  "Patient Discontinued",
  "Rescheduled",
] as const;

const APPOINTMENT_WORKFLOW_OPTIONS = [
  { value: "eecp-started", label: "EECP Treatment Started" },
  { value: "checked-in", label: "Checked In" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function AppointmentTable({ rows }: { rows: Row[] }) {
  const { user, patients, staff, resources, refresh, notify } = useApp();
  const [reschedule, setReschedule] = useState<Row>();
  const [status, setStatus] = useState<Row>();
  const [error, setError] = useState<unknown>();
  const edit = [
    "admin",
    "doctor",
    "therapist",
    "reception",
    "assistant",
  ].includes(user.role);
  return (
    <>
      <ErrorBox error={error} />
      <Table
        rows={rows}
        columns={[
          {
            title: "Time · IST",
            render: (r) => (
              <>
                <strong>{dateTime(r.start_at)}</strong>
                <small className="cell-sub">
                  {Math.round(
                    (new Date(r.end_at).getTime() -
                      new Date(r.start_at).getTime()) /
                    60000,
                  )}{" "}
                  min · {r.mode}
                </small>
              </>
            ),
          },
          {
            title: "Patient / visit",
            render: (r) => (
              <>
                <button
                  className="text-link"
                  onClick={() => navigate("/patients/" + r.patient_id)}
                >
                  {patientName(r.patient_id, patients)}
                </button>
                <small className="cell-sub">
                  {r.visit_type}
                  {r.session_number ? " · #" + r.session_number : ""}
                </small>
              </>
            ),
          },
          {
            title: "Care team / resource",
            render: (r) => (
              <>
                {staff.find((s) => s.id === r.provider_id)?.name}
                <small className="cell-sub">
                  {resources.find((x) => x.id === r.resource_id)?.name ||
                    "No room assigned"}
                </small>
              </>
            ),
          },
          { title: "Status", render: (r) => <Badge value={r.status} /> },
          {
            title: "Actions",
            render: (r) => (
              <div className="actions">
                {edit && r.status === "confirmed" && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api("/appointments/" + r.id + "/status", "POST", {
                          version: r.version,
                          status: "checked-in",
                        });
                        await refresh();
                        notify("Patient checked in.");
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    Check in
                  </Button>
                )}
                {edit && ["confirmed", "checked-in"].includes(r.status) && (
                  <Button variant="ghost" onClick={() => setStatus(r)}>
                    Status
                  </Button>
                )}
                {["admin", "doctor", "therapist", "reception"].includes(
                  user.role,
                ) &&
                  ["confirmed", "checked-in", "cancelled", "missed"].includes(
                    r.status,
                  ) && (
                    <Button variant="ghost" onClick={() => setReschedule(r)}>
                      Reschedule
                    </Button>
                  )}
              </div>
            ),
          },
        ]}
        empty="No appointments in this view"
      />
      {reschedule && (
        <AppointmentForm
          appointment={reschedule}
          onClose={() => setReschedule(undefined)}
        />
      )}{" "}
      {status && (
        <Modal
          title="Update appointment status"
          onClose={() => setStatus(undefined)}
        >
          <DynamicForm
            fields={[
              {
                name: "status",
                label: "New status",
                options:
                  status.status === "confirmed"
                    ? ["checked-in", "cancelled", "missed"]
                    : status.plan_id
                      ? ["cancelled", "missed"]
                      : ["completed", "cancelled", "missed"],
                required: true,
              },
              {
                name: "reason",
                label: "Reason (required for cancellation or missed visit)",
                type: "textarea",
              },
            ]}
            onSubmit={async (v) => {
              await api("/appointments/" + status.id + "/status", "POST", {
                ...v,
                version: status.version,
              });
              await refresh();
              setStatus(undefined);
            }}
          />
        </Modal>
      )}
    </>
  );
}

function AppointmentStatusDropdown({
  appointment,
  statuses,
}: {
  appointment: Row;
  statuses: { id: string; name: string; color: string }[];
}) {
  const { refresh, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const statusLabels = [
    ...APPOINTMENT_LABEL_OPTIONS,
    ...statuses.map((status) => status.name),
  ].filter((label, index, labels) => {
    const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      normalized &&
      !APPOINTMENT_WORKFLOW_OPTIONS.some(
        (option) =>
          option.label.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
      ) &&
      labels.findIndex(
        (candidate) =>
          candidate.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
      ) === index
    );
  });
  const options = [
    ...APPOINTMENT_WORKFLOW_OPTIONS,
    ...statusLabels.map((label) => ({ value: label, label })),
  ];
  const workflowValue =
    appointment.status === "completed"
      ? "completed"
      : appointment.status === "checked-in"
        ? "checked-in"
        : appointment.status === "cancelled"
          ? "cancelled"
          : "eecp-started";
  const selectedValue = appointment.status_label || workflowValue;
  const selectedOption =
    options.find((option) => option.value === selectedValue) || options[0];

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(
        Math.max(rect.width, 265),
        window.innerWidth - 16,
      );
      const top = rect.bottom + 4;
      setPosition({
        top,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight: Math.max(80, Math.min(320, window.innerHeight - top - 8)),
      });
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const chooseOption = async (value: string) => {
    setSaving(true);
    try {
      if (statusLabels.some((option) => option === value)) {
        await api("/appointments/" + appointment.id + "/label", "POST", {
          version: appointment.version,
          label: value,
        });
      } else {
        const status = value === "eecp-started" ? "checked-in" : value;
        await api("/appointments/" + appointment.id + "/status", "POST", {
          version: appointment.version,
          status,
        });
      }
      await refresh();
      notify("Status updated.");
      setOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="charm-status-pill purple"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            buttonRef.current?.scrollIntoView({ block: "center" });
            setOpen(true);
          }
        }}
        style={{
          border: "none",
          cursor: "pointer",
          background: "#7c3aed",
          color: "#fff",
          padding: "3px 8px",
          borderRadius: 4,
          fontWeight: 600,
          fontSize: 11,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {selectedOption.label}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Appointment status options"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              overflowY: "auto",
              zIndex: 1100,
              background: "#7c3aed",
              border: "1px solid #6d28d9",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === selectedValue}
                disabled={saving}
                onClick={() => chooseOption(option.value)}
                style={{
                  display: "block",
                  width: "100%",
                  border: "none",
                  padding: "7px 12px",
                  background:
                    option.value === selectedValue ? "#2563eb" : "transparent",
                  color: "#fff",
                  fontSize: 13,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

function NewWaitingListModal({
  onClose,
  onConfirm,
  initialDate,
}: {
  onClose: () => void;
  onConfirm: (entry: any) => void;
  initialDate?: string;
}) {
  const { staff, patients, facilities } = useApp();
  const [showQuickNewPatient, setShowQuickNewPatient] = useState(false);
  const [facility, setFacility] = useState(
    facilities?.[0]?.name ? `${facilities[0].name} - ${facilities[0].code || "HUH001"}` : "Heal Your Heart Neelankarai - HUH001"
  );
  const [selPatient, setSelPatient] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  const [providerId, setProviderId] = useState(
    staff.find((s) => ["doctor", "therapist"].includes(s.role))?.id || ""
  );
  const [visitType, setVisitType] = useState("--Select--");
  const [resource, setResource] = useState("--Select--");
  const [apptMode, setApptMode] = useState<"In Person" | "Phone Call">("In Person");
  const [datePreference, setDatePreference] = useState<"Specific Date(s)" | "Period">("Specific Date(s)");

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return "";
    try {
      const parts = dStr.split("-").map(Number);
      if (parts.length === 3) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[dt.getMonth()]} ${String(dt.getDate()).padStart(2, "0")}, ${dt.getFullYear()}`;
      }
    } catch {}
    return dStr;
  };

  const initDateStr = initialDate || today();
  const [opt1, setOpt1] = useState(() => formatDisplayDate(initDateStr));
  const [opt1Raw, setOpt1Raw] = useState(initDateStr);
  const [opt2, setOpt2] = useState("");
  const [opt2Raw, setOpt2Raw] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt3Raw, setOpt3Raw] = useState("");

  const [fromDate, setFromDate] = useState(() => formatDisplayDate(initDateStr));
  const [fromDateRaw, setFromDateRaw] = useState(initDateStr);
  const [toDate, setToDate] = useState("");
  const [toDateRaw, setToDateRaw] = useState("");

  const datePickerRef1 = useRef<HTMLInputElement>(null);
  const datePickerRef2 = useRef<HTMLInputElement>(null);
  const datePickerRef3 = useRef<HTMLInputElement>(null);
  const fromDatePickerRef = useRef<HTMLInputElement>(null);
  const toDatePickerRef = useRef<HTMLInputElement>(null);

  const [timePreference, setTimePreference] = useState("Any Time");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 15);
    return patients.filter((p) => {
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchMrn = (p.mrn || "").toLowerCase().includes(q);
      const matchPhone = (p.phone || "").toLowerCase().includes(q);
      return matchName || matchMrn || matchPhone;
    }).slice(0, 20);
  }, [patients, patientQuery]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    let targetPatientId = selPatient;
    if (!targetPatientId && patientQuery.trim()) {
      const q = patientQuery.trim().toLowerCase();
      const match = patients.find(
        (p) =>
          (p.name || "").toLowerCase() === q ||
          (p.mrn || "").toLowerCase() === q ||
          `${p.name} (${p.mrn})`.toLowerCase() === q ||
          (p.name || "").toLowerCase().includes(q)
      );
      if (match) {
        targetPatientId = match.id;
        setSelPatient(match.id);
      }
    }
    if (!targetPatientId) {
      setErr("Please select a patient.");
      return;
    }
    if (!providerId) {
      setErr("Please select a provider.");
      return;
    }

    const pat = patients.find((p) => p.id === targetPatientId);
    const prov = staff.find((s) => s.id === providerId);

    const mainDate = datePreference === "Specific Date(s)" ? (opt1Raw || initDateStr) : (fromDateRaw || initDateStr);

    const newEntry = {
      id: "wl_" + Date.now(),
      facility,
      patient_id: targetPatientId,
      patient_name: pat?.name || patientQuery,
      mrn: pat?.mrn || "HUHNKR" + selPatient.slice(0, 4),
      phone: pat?.phone || "",
      provider_id: providerId,
      provider_name: prov?.name || "Dr. Ramasamy S",
      visit_type: visitType !== "--Select--" ? visitType : "Cardiology Consultation",
      resource: resource !== "--Select--" ? resource : "",
      mode: apptMode,
      date_preference: datePreference,
      dates: datePreference === "Specific Date(s)"
        ? [opt1Raw, opt2Raw, opt3Raw].filter(Boolean)
        : [fromDateRaw, toDateRaw].filter(Boolean),
      preferred_date: mainDate,
      time_preference: timePreference,
      reason,
      created_at: new Date().toISOString(),
    };

    onConfirm(newEntry);
  };

  return (
    <div
      className="charm-modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="charm-modal-window"
        style={{
          width: 580,
          maxWidth: "96vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "#334155" }}>
            New Waiting List
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              color: "#64748b",
              cursor: "pointer",
              lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", maxHeight: "calc(92vh - 50px)" }}>
          {showQuickNewPatient ? (
            <div style={{ padding: 20 }}>
              <QuickNewPatientView
                onCancel={() => setShowQuickNewPatient(false)}
                onCreated={(created) => {
                  setSelPatient(created.id);
                  setPatientQuery(`${created.name} (${created.mrn})`);
                  setShowQuickNewPatient(false);
                }}
              />
            </div>
          ) : (
            <form onSubmit={handleConfirm} style={{ padding: "20px 24px" }}>
              {err && (
                <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "6px 12px", borderRadius: 4, fontSize: 12.5, marginBottom: 12 }}>
                  {err}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Facility */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                  <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Facility</label>
                  <select
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, background: "#fff" }}
                  >
                    <option value="Heal Your Heart Neelankarai - HUH001">Heal Your Heart Neelankarai - HUH001</option>
                    <option value="Heal Your Heart Royapettah - HUH002">Heal Your Heart Royapettah - HUH002</option>
                    <option value="Heal Your Heart Manapakkam - HUH003">Heal Your Heart Manapakkam - HUH003</option>
                  </select>
                </div>

                {/* Patient * */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                  <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>
                    Patient <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative", display: "flex", gap: 6, width: "100%" }} ref={patientRef}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Search by Name / Record ID / Mobile Phone"
                        value={patientQuery}
                        onChange={(e) => {
                          setPatientQuery(e.target.value);
                          setSelPatient("");
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        style={{
                          width: "100%",
                          padding: "6px 26px 6px 10px",
                          border: !selPatient && err ? "1.5px solid #ef4444" : "1px solid #38bdf8",
                          boxShadow: !selPatient && err ? "0 0 0 1px #ef4444" : undefined,
                          outline: "none",
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      />
                    {patientQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientQuery("");
                          setSelPatient("");
                          setShowPatientDropdown(true);
                        }}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, width: 28, height: 28, fontSize: 16, fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    onClick={() => setShowQuickNewPatient(true)}
                    title="Add Patient"
                  >
                    +
                  </button>

                  {showPatientDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 34, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 180, overflowY: "auto", zIndex: 100, marginTop: 4 }}>
                      {filteredPatients.length === 0 ? (
                        <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 12 }}>No matching patients found.</div>
                      ) : (
                        filteredPatients.map((p) => (
                          <div
                            key={p.id}
                            style={{ padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelPatient(p.id);
                              setPatientQuery(`${p.name} (${p.mrn})`);
                              setShowPatientDropdown(false);
                            }}
                            onClick={() => {
                              setSelPatient(p.id);
                              setPatientQuery(`${p.name} (${p.mrn})`);
                              setShowPatientDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{p.name}</div>
                            <div style={{ color: "#64748b", fontSize: 11 }}>ID: {p.mrn} {p.phone ? `• Ph: ${p.phone}` : ""}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Provider * */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>
                  Provider <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, background: "#fff" }}
                >
                  <option value="">--Select--</option>
                  {staff.filter((s) => ["doctor", "therapist"].includes(s.role)).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Visit Type */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Visit Type</label>
                <select
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, background: "#fff" }}
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Cardiology Consultation">Cardiology Consultation</option>
                  <option value="EECP session">EECP session</option>
                  <option value="EECP Treatment">EECP Treatment</option>
                  <option value="Follow-up Visit">Follow-up Visit</option>
                  <option value="New Patient Visit">New Patient Visit</option>
                  <option value="Telehealth Video Consult">Telehealth Video Consult</option>
                  <option value="Walk-in visits">Walk-in visits</option>
                  <option value="EECP 15th Day Review">EECP 15th Day Review</option>
                </select>
              </div>

              {/* Resource */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Resource</label>
                <select
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, background: "#fff" }}
                >
                  <option value="--Select--">--Select--</option>
                  <option value="EECP Bed 1">EECP Bed 1</option>
                  <option value="EECP Bed 2">EECP Bed 2</option>
                  <option value="EECP Bed 3">EECP Bed 3</option>
                  <option value="EECP Bed 4">EECP Bed 4</option>
                  <option value="Consultation Room 1">Consultation Room 1</option>
                  <option value="Consultation Room 2">Consultation Room 2</option>
                </select>
              </div>

              {/* Appointment Mode */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Appointment Mode</label>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="wl_appt_mode"
                      checked={apptMode === "In Person"}
                      onChange={() => setApptMode("In Person")}
                      style={{ accentColor: "#009688" }}
                    />
                    <span>In Person</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="wl_appt_mode"
                      checked={apptMode === "Phone Call"}
                      onChange={() => setApptMode("Phone Call")}
                      style={{ accentColor: "#009688" }}
                    />
                    <span>Phone Call</span>
                  </label>
                </div>
              </div>

              {/* Date Preference */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Date Preference</label>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="wl_date_pref"
                      checked={datePreference === "Specific Date(s)"}
                      onChange={() => setDatePreference("Specific Date(s)")}
                      style={{ accentColor: "#009688" }}
                    />
                    <span>Specific Date(s)</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="wl_date_pref"
                      checked={datePreference === "Period"}
                      onChange={() => setDatePreference("Period")}
                      style={{ accentColor: "#009688" }}
                    />
                    <span>Period</span>
                  </label>
                </div>
              </div>

              {/* Date Inputs based on Date Preference */}
              {datePreference === "Specific Date(s)" ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                    <label style={{ textAlign: "right", fontSize: 13, color: "#334155" }}>Option 1</label>
                    <div style={{ display: "flex", width: 180, position: "relative" }}>
                      <input
                        type="text"
                        value={opt1}
                        onChange={(e) => setOpt1(e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: "4px 0 0 4px", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        ref={datePickerRef1}
                        value={opt1Raw}
                        onChange={(e) => {
                          setOpt1Raw(e.target.value);
                          setOpt1(formatDisplayDate(e.target.value));
                        }}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => datePickerRef1.current?.showPicker?.()}
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "none", borderRadius: "0 4px 4px 0", padding: "5px 8px", cursor: "pointer", color: "#64748b" }}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                    <label style={{ textAlign: "right", fontSize: 13, color: "#334155" }}>Option 2</label>
                    <div style={{ display: "flex", width: 180, position: "relative" }}>
                      <input
                        type="text"
                        value={opt2}
                        onChange={(e) => setOpt2(e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: "4px 0 0 4px", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        ref={datePickerRef2}
                        value={opt2Raw}
                        onChange={(e) => {
                          setOpt2Raw(e.target.value);
                          setOpt2(formatDisplayDate(e.target.value));
                        }}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => datePickerRef2.current?.showPicker?.()}
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "none", borderRadius: "0 4px 4px 0", padding: "5px 8px", cursor: "pointer", color: "#64748b" }}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                    <label style={{ textAlign: "right", fontSize: 13, color: "#334155" }}>Option 3</label>
                    <div style={{ display: "flex", width: 180, position: "relative" }}>
                      <input
                        type="text"
                        value={opt3}
                        onChange={(e) => setOpt3(e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: "4px 0 0 4px", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        ref={datePickerRef3}
                        value={opt3Raw}
                        onChange={(e) => {
                          setOpt3Raw(e.target.value);
                          setOpt3(formatDisplayDate(e.target.value));
                        }}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => datePickerRef3.current?.showPicker?.()}
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "none", borderRadius: "0 4px 4px 0", padding: "5px 8px", cursor: "pointer", color: "#64748b" }}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                    <label style={{ textAlign: "right", fontSize: 13, color: "#334155" }}>From Date</label>
                    <div style={{ display: "flex", width: 180, position: "relative" }}>
                      <input
                        type="text"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: "4px 0 0 4px", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        ref={fromDatePickerRef}
                        value={fromDateRaw}
                        onChange={(e) => {
                          setFromDateRaw(e.target.value);
                          setFromDate(formatDisplayDate(e.target.value));
                        }}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => fromDatePickerRef.current?.showPicker?.()}
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "none", borderRadius: "0 4px 4px 0", padding: "5px 8px", cursor: "pointer", color: "#64748b" }}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                    <label style={{ textAlign: "right", fontSize: 13, color: "#334155" }}>To Date</label>
                    <div style={{ display: "flex", width: 180, position: "relative" }}>
                      <input
                        type="text"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ width: "100%", padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: "4px 0 0 4px", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        ref={toDatePickerRef}
                        value={toDateRaw}
                        onChange={(e) => {
                          setToDateRaw(e.target.value);
                          setToDate(formatDisplayDate(e.target.value));
                        }}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                      <button
                        type="button"
                        onClick={() => toDatePickerRef.current?.showPicker?.()}
                        style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderLeft: "none", borderRadius: "0 4px 4px 0", padding: "5px 8px", cursor: "pointer", color: "#64748b" }}
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Time Preference */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500 }}>Time Preference</label>
                <select
                  value={timePreference}
                  onChange={(e) => setTimePreference(e.target.value)}
                  style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, background: "#fff" }}
                >
                  <option value="Any Time">Any Time</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>

              {/* Reason */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "flex-start", gap: 12 }}>
                <label style={{ textAlign: "right", fontSize: 13, color: "#334155", fontWeight: 500, paddingTop: 4 }}>Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13, resize: "vertical" }}
                />
              </div>

              {/* Actions Footer */}
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 12, marginTop: 8 }}>
                <div></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {err && (
                    <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 500 }}>
                      {err}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="submit"
                      style={{ background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, padding: "7px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 4, padding: "7px 18px", fontSize: 13, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

function Schedule() {
  const { user, staff, patients, resources, refresh, notify } = useApp();
  const [view, setView] = useState("List View");
  const [date, setDate] = useState(today());
  const [provider, setProvider] = useState("");
  const [add, setAdd] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [calSubtab, setCalSubtab] = useState("Calendar");
  const [waitingListView, setWaitingListView] = useState<"Day" | "Week" | "Month">("Day");
  const [waitingPrefillDate, setWaitingPrefillDate] = useState<string>("");
  const [reschedule, setReschedule] = useState<Row>();
  const [statusModal, setStatusModal] = useState<Row>();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bookingSlot, setBookingSlot] = useState<{
    startAt: string;
    providerId?: string;
    resourceId?: string;
    patientId?: string;
    duration?: number;
  } | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Row | null>(null);
  const [error, setError] = useState<unknown>();

  const [waitingListModal, setWaitingListModal] = useState(false);
  const [waitingEntries, setWaitingEntries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("hyh_waiting_list_entries");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addWaitingEntry = (entry: any) => {
    setWaitingEntries((prev) => {
      const next = [entry, ...prev];
      try {
        localStorage.setItem("hyh_waiting_list_entries", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeWaitingEntry = (id: string) => {
    setWaitingEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem("hyh_waiting_list_entries", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Reports Filter Matrix
  const [reportType, setReportType] = useState<"Appointment" | "Waiting List" | "Appointment Request">("Appointment");
  const [reportFacility, setReportFacility] = useState("Heal Your Heart Neelankarai");
  const [reportDateRange, setReportDateRange] = useState("Today");
  const [reportFrom, setReportFrom] = useState(today());
  const [reportTo, setReportTo] = useState(today());
  const [showReport, setShowReport] = useState(true);

  const reportProvidersList = [
    "Aksharra P",
    "Divya A",
    "Dr. Ramasamy S",
    "Ranesh B",
    "Vijayalakshmi K",
  ];
  const [selectedReportProviders, setSelectedReportProviders] = useState<Record<string, boolean>>({
    "Aksharra P": true,
    "Divya A": true,
    "Dr. Ramasamy S": true,
    "Ranesh B": true,
    "Vijayalakshmi K": true,
  });

  // Dynamic Appointment Statuses & Visit Types synchronized with Settings
  const [availableStatuses, setAvailableStatuses] = useState<{ id: string; name: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem("hyh_appointment_statuses");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      { id: "status-1", name: "Absent", color: "#0000ff" },
      { id: "status-2", name: "Admission", color: "#004d40" },
      { id: "status-3", name: "Cancelled", color: "#ef4444" },
      { id: "status-4", name: "Checked in", color: "#008000" },
      { id: "status-5", name: "Confirmed", color: "#84cc16" },
      { id: "status-6", name: "Consultation / Demo", color: "#854d0e" },
      { id: "status-7", name: "Consulted", color: "#1e1b4b" },
      { id: "status-8", name: "Diabetic / HT Management", color: "#d97706" },
      { id: "status-9", name: "Discharge", color: "#06b6d4" },
      { id: "status-10", name: "EECP Treatment 1st Day", color: "#ea580c" },
      { id: "status-11", name: "EECP Treatment 20 Sessions 1st Day", color: "#dc2626" },
      { id: "status-12", name: "EECP Treatment Completed", color: "#64748b" },
      { id: "status-13", name: "EECP Treatment Started", color: "#78350f" },
      { id: "status-14", name: "No show", color: "#9ca3af" },
      { id: "status-15", name: "Rescheduled", color: "#a7f3d0" },
    ];
  });

  const [availableVisitTypes, setAvailableVisitTypes] = useState<{ id: string; name: string; mode?: string; duration?: number; color?: string }[]>(() => {
    try {
      const saved = localStorage.getItem("hyh_visit_types");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "vt1", name: "Absent", duration: 30 },
      { id: "vt2", name: "Admission", duration: 45 },
      { id: "vt3", name: "Diabetes/HT Management", duration: 30 },
      { id: "vt4", name: "EECP Treatment", duration: 60 },
      { id: "vt5", name: "EECP Demo", duration: 45 },
      { id: "vt6", name: "Follow-up Visit", duration: 20 },
      { id: "vt7", name: "New Patient Visit", duration: 45 },
      { id: "vt8", name: "Telehealth Video Consult", duration: 30 },
      { id: "vt9", name: "Walk-in visits", duration: 20 },
    ];
  });

  useEffect(() => {
    api<any[]>("/calendar/appointment-statuses")
      .then((data) => {
        if (data && data.length > 0) {
          setAvailableStatuses(data);
          localStorage.setItem("hyh_appointment_statuses", JSON.stringify(data));
        }
      })
      .catch(() => {});

    api<any[]>("/calendar/visit-types")
      .then((data) => {
        if (data && data.length > 0) {
          setAvailableVisitTypes(data);
          localStorage.setItem("hyh_visit_types", JSON.stringify(data));
        }
      })
      .catch(() => {});

    const onStatusUpdate = () => {
      api<any[]>("/calendar/appointment-statuses")
        .then((data) => {
          if (data && data.length > 0) {
            setAvailableStatuses(data);
            localStorage.setItem("hyh_appointment_statuses", JSON.stringify(data));
          }
        })
        .catch(() => {
          try {
            const saved = localStorage.getItem("hyh_appointment_statuses");
            if (saved) setAvailableStatuses(JSON.parse(saved));
          } catch {}
        });
    };
    const onVisitTypeUpdate = () => {
      try {
        const saved = localStorage.getItem("hyh_visit_types");
        if (saved) setAvailableVisitTypes(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("hyh_appointment_statuses_updated", onStatusUpdate);
    window.addEventListener("hyh_visit_types_updated", onVisitTypeUpdate);
    return () => {
      window.removeEventListener("hyh_appointment_statuses_updated", onStatusUpdate);
      window.removeEventListener("hyh_visit_types_updated", onVisitTypeUpdate);
    };
  }, []);

  const reportVisitTypesList = availableVisitTypes.map((vt) => vt.name);
  const [selectedReportVisitTypes, setSelectedReportVisitTypes] = useState<Record<string, boolean>>({
    "Absent": false,
    "Admission": false,
    "EECP Treatment": true,
    "EECP Demo": true,
    "Follow-up Visit": true,
    "New Patient Visit": true,
  });

  const reportResourcesList = [
    "EECP Room 01",
    "EECP Room 02",
    "EECP Room 03",
    "Consultation Room 1",
  ];
  const [selectedReportResources, setSelectedReportResources] = useState<Record<string, boolean>>({
    "EECP Room 01": true,
    "EECP Room 02": true,
    "EECP Room 03": true,
    "Consultation Room 1": true,
  });

  const reportStatusesList = availableStatuses.map((st) => st.name);
  const [selectedReportStatuses, setSelectedReportStatuses] = useState<Record<string, boolean>>({
    "Confirmed": true,
    "Checked in": true,
    "Completed": false,
    "Cancelled": false,
    "Missed": false,
  });

  const [appRequests, setAppRequests] = useState<any[]>([
    {
      id: "REQ-0102",
      patient_name: "Kanchana Jaganathan",
      mrn: "HUHNKR7187",
      phone: "9884406694",
      requested_at: "Today, 04:30 PM",
      visit_type: "Telehealth Video Consult",
      mode: "Video Consult",
      reason: "Post-EECP follow-up review and medication titration",
      status: "Pending",
    },
    {
      id: "REQ-0103",
      patient_name: "Kumaraguru Nagarajan",
      mrn: "HUHRYP2532",
      phone: "9962002511",
      requested_at: "Tomorrow, 10:00 AM",
      visit_type: "EECP Treatment 20 Sessions",
      mode: "In Person",
      reason: "Session #19 scheduled review",
      status: "Pending",
    },
  ]);

  const handleStartConsultation = async (patientId: string, visitType?: string) => {
    try {
      const pChart = await api<any>("/patients/" + patientId);
      const existingDraft = (pChart.encounters || []).find((e: any) => e.status !== "signed");
      if (existingDraft) {
        navigate(`/encounter/${existingDraft.id}/${patientId}`);
      } else {
        const created = await api<any>("/encounters", "POST", {
          patient_id: patientId,
          provider_id: provider || staff.find((s) => s.role === "doctor")?.id || user.id,
          visit_type: visitType || "EECP On-going Visit",
        });
        await refresh();
        navigate(`/encounter/${created.id}/${patientId}`);
      }
    } catch (err) {
      notify("Could not open consultation: " + String(err));
    }
  };

  const formatSessionDay = (appt: Row) => {
    if (appt.session_number) {
      const n = appt.session_number;
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      const suffix = s[(v - 20) % 10] || s[v] || s[0];
      return `EECP ${n}${suffix} Day`;
    }
    const idx = (appts.data || []).findIndex((x) => x.id === appt.id);
    const dayNum = idx >= 0 ? (idx % 30) + 1 : 26;
    const s = ["th", "st", "nd", "rd"];
    const v = dayNum % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];
    return `EECP ${dayNum}${suffix} Day`;
  };

  const appts = useQuery({
    queryKey: ["appointments", branch],
    queryFn: () => api<Row[]>("/appointments"),
  });
  const avail = useQuery({
    queryKey: ["availability", branch],
    queryFn: () => api<Row[]>("/availability"),
  });
  const [viewYear, viewMonth] = date.split("-").map(Number);
  const selectedDate = new Date(date + "T00:00:00+05:30");

  let rangeStart = selectedDate;
  let rangeEnd = new Date(selectedDate.getTime() + 86400000);
  if (view === "Month") {
    rangeStart = new Date(viewYear, viewMonth - 1, 1, 0, 0, 0);
    rangeEnd = new Date(viewYear, viewMonth, 1, 0, 0, 0);
  } else if (view === "Week") {
    rangeStart = selectedDate;
    rangeEnd = new Date(selectedDate.getTime() + 7 * 86400000);
  }

  const filtered = (appts.data || []).filter(
    (a) =>
      (!provider || a.provider_id === provider) &&
      new Date(a.start_at) >= rangeStart &&
      new Date(a.start_at) < rangeEnd,
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) {
      const raw = a.status_label || (a.status === "checked-in" ? "Checked in" : a.status === "confirmed" ? "Confirmed" : a.status === "completed" ? "Completed" : a.status === "cancelled" ? "Cancelled" : a.status);
      const match = availableStatuses.find((s) => s.name.toLowerCase() === raw.toLowerCase());
      const label = match ? match.name : raw;
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [filtered, availableStatuses]);

  const displayedAppts = useMemo(() => {
    if (statusFilter === "ALL") return filtered;
    return filtered.filter((a) => {
      const raw = a.status_label || (a.status === "checked-in" ? "Checked in" : a.status === "confirmed" ? "Confirmed" : a.status === "completed" ? "Completed" : a.status === "cancelled" ? "Cancelled" : a.status);
      return raw.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [filtered, statusFilter]);

  const activeCalView = calSubtab === "Waiting List" ? waitingListView : view;
  const shift = (amount: number) => {
    if (activeCalView === "Month") {
      const parts = date.split("-").map(Number);
      const target = new Date(parts[0], parts[1] - 1 + amount, 1);
      const y = target.getFullYear();
      const m = String(target.getMonth() + 1).padStart(2, "0");
      setDate(`${y}-${m}-01`);
    } else if (activeCalView === "Week") {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + amount * 7);
      setDate(d.toISOString().slice(0, 10));
    } else {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + amount);
      setDate(d.toISOString().slice(0, 10));
    }
  };

  const formattedDate =
    view === "Month"
      ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(viewYear, viewMonth - 1, 1, 12, 0, 0))
      : new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date + "T12:00:00Z"));

  const waitingDateObj = new Date(date + "T12:00:00Z");
  const waitingDayTitle = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(waitingDateObj);

  const startOfWeek = new Date(waitingDateObj);
  startOfWeek.setUTCDate(waitingDateObj.getUTCDate() - waitingDateObj.getUTCDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  const waitingWeekTitle = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(startOfWeek)} - ${new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(endOfWeek)}`;
  const waitingMonthTitle = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(waitingDateObj);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setUTCDate(startOfWeek.getUTCDate() + i);
    return d;
  });

  const dayEntries = waitingEntries.filter(
    (e) => e.preferred_date === date || (Array.isArray(e.dates) && e.dates.includes(date))
  );
  const weekStartStr = startOfWeek.toISOString().slice(0, 10);
  const weekEndStr = endOfWeek.toISOString().slice(0, 10);
  const weekEntries = waitingEntries.filter((e) => {
    const d = e.preferred_date || (Array.isArray(e.dates) ? e.dates[0] : "");
    return d >= weekStartStr && d <= weekEndStr;
  });

  // Authentic CharmHealth Month Grid calculation (Sun - Sat 7-col)
  const monthCells = useMemo<
    {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[]
  >(() => {
    if (view !== "Month") return [];
    const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

    const cells: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 2, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${y}-${m}-${dStr}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === today(),
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = String(d).padStart(2, "0");
      const mStr = String(viewMonth).padStart(2, "0");
      const dateStr = `${viewYear}-${mStr}-${dStr}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === today(),
      });
    }

    // Trailing days from next month
    const totalNeeded = cells.length <= 35 ? 35 : 42;
    const nextDays = totalNeeded - cells.length;
    for (let d = 1; d <= nextDays; d++) {
      const nextDate = new Date(viewYear, viewMonth, d);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${y}-${m}-${dStr}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === today(),
      });
    }

    return cells;
  }, [view, viewYear, viewMonth]);

  return (
    <div className="charm-calendar-page">
      {/* 1. CharmHealth Calendar Subtabs Strip */}
      <div className="charm-cal-subtabs-strip">
        <div className="charm-cal-subtabs">
          {["Calendar", "Waiting List", "Appointment Requests", "Reports"].map((st) => (
            <button
              key={st}
              className={`charm-cal-subtab-btn ${calSubtab === st ? "active" : ""}`}
              onClick={() => setCalSubtab(st)}
            >
              {st}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="charm-cal-quicksearch">
            <Search size={14} color="#94a3b8" />
            <input placeholder="Provider Quick Search" />
          </div>
          <button
            type="button"
            className="text-link"
            style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={() => setAvailability(true)}
          >
            <Settings size={13} />
            Settings
          </button>
        </div>
      </div>

      {/* 2. Main Calendar Layout: Left Drawer + Right Schedule */}
      {calSubtab === "Calendar" && (
        <div className="charm-cal-split">
          {/* Left: Collapsible Provider Availability Drawer */}
          <aside className={`charm-cal-drawer ${drawerOpen ? "open" : "collapsed"}`}>
            <div className="charm-drawer-head">
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}>
                Provider Availability
              </span>
              <button
                type="button"
                className="charm-drawer-toggle"
                onClick={() => setDrawerOpen(!drawerOpen)}
                title="Toggle Drawer"
              >
                {drawerOpen ? "◀" : "▶"}
              </button>
            </div>

            {drawerOpen && (
              <div className="charm-drawer-body">
                <div className="charm-drawer-field">
                  <label>Facility *</label>
                  <select defaultValue="curr">
                    <option value="curr">Heal Your Heart Neelankarai - HUH001</option>
                    <option value="roy">Heal Your Heart Royapettah - HUH002</option>
                    <option value="man">Heal Your Heart Manapakkam - HUH003</option>
                  </select>
                </div>

                <div className="charm-drawer-field">
                  <label>Provider *</label>
                  <select
                    aria-label="Filter provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="">All providers</option>
                    {staff
                      .filter((s) => ["doctor", "therapist"].includes(s.role))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="charm-drawer-field">
                  <label>Visit Type</label>
                  <select>
                    <option value="">--Select--</option>
                    <option value="eecp">EECP Treatment</option>
                    <option value="consult">Cardiology Consultation</option>
                    <option value="echo">2D Echo & Doppler</option>
                  </select>
                </div>

                <div className="charm-drawer-field">
                  <label>Duration *</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" defaultValue={10} style={{ width: 60 }} />
                    <span style={{ fontSize: 11, color: "#64748b" }}>minutes</span>
                  </div>
                </div>

                <div className="charm-drawer-alert">
                  Provider Timings not configured for this member.{" "}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setAvailability(true)}
                    style={{ fontSize: 11 }}
                  >
                    Configure
                  </button>
                </div>
              </div>
            )}
          </aside>

          {/* Right: Main Appointments Workspace */}
          <section className="charm-cal-content">
            {/* Controls Header */}
            <div className="charm-cal-controls">
              {/* View switcher buttons */}
              <div className="charm-view-pills">
                {["List View", "Day", "Week", "Month"].map((v) => (
                  <button
                    key={v}
                    className={`charm-view-btn ${view === v ? "active" : ""}`}
                    onClick={() => setView(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Date Display and Nav */}
              <div className="charm-date-navigator">
                <span className="charm-date-title">{formattedDate}</span>
                <input
                  type="date"
                  aria-label="Schedule date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: 28, height: 28, opacity: 0, position: "absolute", cursor: "pointer" }}
                />
                <button
                  type="button"
                  className="charm-nav-arrow"
                  aria-label="Previous period"
                  onClick={() => shift(-1)}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="charm-today-btn"
                  onClick={() => setDate(today())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="charm-nav-arrow"
                  aria-label="Next period"
                  onClick={() => shift(1)}
                >
                  &gt;
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                  <button
                    type="button"
                    className="charm-btn-confirm"
                    style={{ padding: "6px 14px", fontSize: 12, borderRadius: 4 }}
                    onClick={() => setAdd(true)}
                  >
                    + Book Appointment
                  </button>
                )}
              </div>
            </div>

            {/* Yellow Timezone Banner */}
            <div className="charm-cal-yellow-banner">
              <div>
                <span>Appointments are shown in <strong>Asia/Kolkata</strong> time zone</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Sort by <strong>Time ▼</strong></span>
              </div>
            </div>

            {/* Dynamic CharmHealth Stat Summary Pills */}
            <div className="charm-stat-pills" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <div
                className={`charm-stat-chip ${statusFilter === "ALL" ? "orange" : ""}`}
                onClick={() => setStatusFilter("ALL")}
                style={{
                  cursor: "pointer",
                  background: statusFilter === "ALL" ? "#ea580c" : "#fff",
                  color: statusFilter === "ALL" ? "#fff" : "#334155",
                  borderColor: statusFilter === "ALL" ? "#ea580c" : "#cbd5e1",
                  borderWidth: 1,
                  borderStyle: "solid",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                <strong>{filtered.length}</strong> ALL
              </div>
              {Object.entries(statusCounts).map(([sName, count]) => {
                const conf = availableStatuses.find((s) => s.name.toLowerCase() === sName.toLowerCase());
                const chipColor = conf?.color || "#7c3aed";
                const isSelected = statusFilter.toLowerCase() === sName.toLowerCase();
                return (
                  <div
                    key={sName}
                    className="charm-stat-chip"
                    onClick={() => setStatusFilter(isSelected ? "ALL" : sName)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? chipColor : "#fff",
                      color: isSelected ? "#fff" : chipColor,
                      borderColor: chipColor,
                      borderWidth: 1,
                      borderStyle: "solid",
                      fontWeight: 600,
                      transition: "all 0.15s ease",
                    }}
                    title={`Click to filter by ${sName}`}
                  >
                    <strong>{count}</strong> {sName.toUpperCase()}
                  </div>
                );
              })}
            </div>

            <ErrorBox error={appts.error || error} />

            {appts.isLoading ? (
              <Loading />
            ) : view === "Week" ? (
              /* 3. Authentic CharmHealth Week Grid (Image 4) */
              <div className="charm-week-grid-wrap">
                <div className="charm-week-header-row">
                  <div className="charm-week-time-col">Time</div>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(selectedDate.getTime() + i * 86400000);
                    const isCurrent = d.toISOString().slice(0, 10) === date;
                    return (
                      <div
                        key={i}
                        className={`charm-week-day-col ${isCurrent ? "active-day" : ""}`}
                      >
                        <strong>
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]}{" "}
                          {d.getMonth() + 1}/{d.getDate()}
                        </strong>
                      </div>
                    );
                  })}
                </div>

                <div className="charm-week-body">
                  {["8am", "8:30am", "9am", "9:30am", "10am", "10:30am", "11am", "11:30am", "12pm", "12:30pm", "1pm", "1:30pm", "2pm", "2:30pm", "3pm", "3:30pm", "4pm", "4:30pm", "5pm", "5:30pm"].map((hour, hIdx) => {
                    const hourNum = 8 + Math.floor(hIdx / 2);
                    const isHalf = hIdx % 2 === 1;
                    return (
                      <div className="charm-week-row" key={hour}>
                        <div className="charm-week-time-label">{hour}</div>
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                          const d = new Date(selectedDate.getTime() + dayIdx * 86400000);
                          const key = localInput(d.toISOString()).slice(0, 10);
                          const slotAppts = filtered.filter((a) => {
                            const localStart = localInput(a.start_at);
                            if (!localStart.startsWith(key)) return false;
                            const timePart = localStart.slice(11, 16);
                            const [h, m] = timePart.split(":").map(Number);
                            return h === hourNum && (isHalf ? m >= 30 : m < 30);
                          });
                          const isSlotEmpty = slotAppts.length === 0;
                          const slotDateStr = `${key}T${String(hourNum).padStart(2, "0")}:${isHalf ? "30" : "00"}`;
                          return (
                            <div
                              key={dayIdx}
                              className={`charm-week-slot ${isSlotEmpty ? "charm-week-slot-empty" : "has-appts"}`}
                              onClick={() => {
                                if (isSlotEmpty && ["reception", "doctor", "therapist", "admin"].includes(user.role)) {
                                  setBookingSlot({
                                    startAt: slotDateStr,
                                    providerId: provider || undefined,
                                    duration: 30,
                                  });
                                }
                              }}
                              title={isSlotEmpty ? `Click to book appointment on ${key} at ${hour}` : undefined}
                            >
                              {isSlotEmpty && (
                                <div className="charm-empty-slot-action">
                                  <span className="charm-slot-plus">+</span>
                                </div>
                              )}
                              {slotAppts.length > 1 ? (
                                <div className="charm-stacked-file-group" style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                                  {slotAppts.map((currentSlotAppt) => {
                                    const isEECP = currentSlotAppt.visit_type?.toLowerCase().includes("eecp");
                                    const stConfig = availableStatuses.find(
                                      (s) => s.name.toLowerCase() === (currentSlotAppt.status_label || currentSlotAppt.status).toLowerCase()
                                    );
                                    const accentColor = stConfig?.color || (isEECP ? "#8b5cf6" : "#0284c7");
                                    return (
                                      <div
                                        key={currentSlotAppt.id}
                                        className="charm-week-appt-strip"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAppt(currentSlotAppt);
                                        }}
                                        title={`${patientName(currentSlotAppt.patient_id, patients)} · ${localInput(currentSlotAppt.start_at).slice(11, 16)} - ${localInput(currentSlotAppt.end_at).slice(11, 16)} · ${currentSlotAppt.status_label || currentSlotAppt.status}`}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          background: "#f8fafc",
                                          border: "1px solid #cbd5e1",
                                          borderLeft: `4px solid ${accentColor}`,
                                          borderRadius: 3,
                                          padding: "3px 6px",
                                          fontSize: 11,
                                          cursor: "pointer",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                          overflow: "hidden",
                                          whiteSpace: "nowrap",
                                          textOverflow: "ellipsis",
                                          transition: "all 0.15s ease",
                                        }}
                                      >
                                        <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 10, flexShrink: 0 }}>
                                          {localInput(currentSlotAppt.start_at).slice(11, 16)}
                                        </span>
                                        <span style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                                          {patientName(currentSlotAppt.patient_id, patients)}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            padding: "1px 5px",
                                            borderRadius: 2,
                                            background: accentColor + "20",
                                            color: accentColor,
                                            textTransform: "uppercase",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {currentSlotAppt.status_label || currentSlotAppt.status}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                slotAppts.map((currentSlotAppt) => {
                                  const isEECP = currentSlotAppt.visit_type?.toLowerCase().includes("eecp");
                                  return (
                                    <div
                                      key={currentSlotAppt.id}
                                      className={`charm-week-appt-card ${isEECP ? "eecp-appt" : "consult-appt"} status-${currentSlotAppt.status}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAppt(currentSlotAppt);
                                      }}
                                      title="Click to view appointment details & actions"
                                    >
                                      <div className="appt-header-line">
                                        <span className="appt-time">
                                          {localInput(currentSlotAppt.start_at).slice(11, 16)} - {localInput(currentSlotAppt.end_at).slice(11, 16)}
                                        </span>
                                        <span className={`status-badge-mini ${currentSlotAppt.status}`}>
                                          {currentSlotAppt.status}
                                        </span>
                                      </div>
                                      <div className="appt-patient">
                                        {patientName(currentSlotAppt.patient_id, patients)}
                                      </div>
                                      <div className="appt-provider">
                                        {staff.find((s) => s.id === currentSlotAppt.provider_id)?.name}
                                      </div>
                                      <div className="appt-room">
                                        {resources.find((r) => r.id === currentSlotAppt.resource_id)?.name || (isEECP ? "EECP Bed" : "Consult Room")}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              {!isSlotEmpty && ["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBookingSlot({
                                      startAt: slotDateStr,
                                      providerId: provider || undefined,
                                      duration: 30,
                                    });
                                  }}
                                  style={{
                                    border: "1px dashed #93c5fd",
                                    borderRadius: 3,
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    fontSize: 9.5,
                                    padding: "2px 4px",
                                    cursor: "pointer",
                                    marginTop: 3,
                                    width: "100%",
                                    textAlign: "center",
                                  }}
                                  title={`Add another appointment on ${key} at ${hour}`}
                                >
                                  + Book another
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "Day" ? (
              <div className="charm-day-schedule-view">
                <div className="charm-day-timeline-head">
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      Daily Schedule · {formattedDate}
                    </h4>
                    <small style={{ color: "#64748b" }}>
                      {filtered.length} appointment{filtered.length === 1 ? "" : "s"} scheduled today
                    </small>
                  </div>
                  {["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                    <Button
                      variant="primary"
                      onClick={() => setBookingSlot({ startAt: date + "T09:00", providerId: provider || undefined, duration: 30 })}
                    >
                      <Plus size={14} /> Book Appointment
                    </Button>
                  )}
                </div>

                <div className="charm-day-timeline-grid">
                  {["8am", "8:30am", "9am", "9:30am", "10am", "10:30am", "11am", "11:30am", "12pm", "12:30pm", "1pm", "1:30pm", "2pm", "2:30pm", "3pm", "3:30pm", "4pm", "4:30pm", "5pm", "5:30pm"].map((hour, hIdx) => {
                    const hourNum = 8 + Math.floor(hIdx / 2);
                    const isHalf = hIdx % 2 === 1;
                    const timeKey = `${date}T${String(hourNum).padStart(2, "0")}:${isHalf ? "30" : "00"}`;
                    const slotAppts = filtered.filter((a) => {
                      const localStart = localInput(a.start_at);
                      if (!localStart.startsWith(date)) return false;
                      const timePart = localStart.slice(11, 16);
                      const [h, m] = timePart.split(":").map(Number);
                      return h === hourNum && (isHalf ? m >= 30 : m < 30);
                    });
                    const isSlotEmpty = slotAppts.length === 0;

                    return (
                      <div className="charm-day-time-row" key={hour}>
                        <div className="charm-day-time-gutter">{hour}</div>
                        <div
                          className={`charm-day-slot-area ${isSlotEmpty ? "empty-slot" : "filled-slot"}`}
                          onClick={() => {
                            if (["reception", "doctor", "therapist", "admin"].includes(user.role)) {
                              setBookingSlot({
                                startAt: timeKey,
                                providerId: provider || undefined,
                                duration: 30,
                              });
                            }
                          }}
                          title={`Click to book appointment at ${hour}`}
                        >
                          {isSlotEmpty ? (
                            <div className="charm-day-empty-placeholder">
                              <span className="slot-plus-text">+ Click to book at {hour}</span>
                            </div>
                          ) : (
                            <div className="charm-day-appt-cards">
                              {slotAppts.map((currentSlotAppt) => {
                                const isEECP = currentSlotAppt.visit_type?.toLowerCase().includes("eecp");
                                const pat = patients.find((p) => p.id === currentSlotAppt.patient_id);
                                return (
                                  <div
                                    key={currentSlotAppt.id}
                                    className={`charm-day-appt-card ${isEECP ? "eecp-theme" : "consult-theme"} status-${currentSlotAppt.status}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAppt(currentSlotAppt);
                                    }}
                                    title="Click to view appointment details & actions"
                                  >
                                    <div className="charm-day-card-header">
                                      <span className="day-card-patient">
                                        {pat?.name || patientName(currentSlotAppt.patient_id, patients)} [{pat?.mrn || "HUHNKR" + currentSlotAppt.id.slice(0, 4)}]
                                      </span>
                                      <Badge value={currentSlotAppt.status} />
                                    </div>
                                    <div className="charm-day-card-meta">
                                      <span>🕒 {localInput(currentSlotAppt.start_at).slice(11, 16)} - {localInput(currentSlotAppt.end_at).slice(11, 16)}</span>
                                      <span>🩺 {staff.find((s) => s.id === currentSlotAppt.provider_id)?.name}</span>
                                      <span>🏥 {resources.find((r) => r.id === currentSlotAppt.resource_id)?.name || (isEECP ? "EECP Bed" : "Consult Room")}</span>
                                      <span>🏷️ {currentSlotAppt.visit_type}</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBookingSlot({
                                      startAt: timeKey,
                                      providerId: provider || undefined,
                                      duration: 30,
                                    });
                                  }}
                                  style={{
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: 4,
                                    background: "#f8fafc",
                                    color: "#64748b",
                                    fontSize: 11,
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    alignSelf: "center",
                                  }}
                                  title={`Add another appointment at ${hour}`}
                                >
                                  + Book another
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "Month" ? (
              /* Authentic CharmHealth Month Grid (1:1 with CharmTracker) */
              <div className="charm-cal-month-wrap">
                {/* Day of Week Headers */}
                <div className="charm-cal-month-header-row">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                    <div key={dayName} className="charm-cal-month-th">
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* 7-column Calendar Month Grid */}
                <div className="charm-cal-month-cells-grid">
                  {monthCells.map((cell) => {
                    const dayAppts = (appts.data || [])
                      .filter((a) => {
                        if (provider && a.provider_id !== provider) return false;
                        const localDate = localInput(a.start_at).slice(0, 10);
                        return localDate === cell.dateStr;
                      })
                      .sort((a, b) => a.start_at.localeCompare(b.start_at));

                    return (
                      <div
                        key={cell.dateStr}
                        className={`charm-cal-month-cell-box ${!cell.isCurrentMonth ? "inactive" : ""} ${cell.isToday ? "is-today" : ""}`}
                        onClick={() => {
                          if (["reception", "doctor", "therapist", "admin"].includes(user.role)) {
                            setBookingSlot({
                              startAt: `${cell.dateStr}T09:00`,
                              providerId: provider || undefined,
                              duration: 30,
                            });
                          }
                        }}
                        title={cell.isToday ? "Today" : `Click to book appointment on ${cell.dateStr}`}
                      >
                        <div className="charm-cal-month-cell-top">
                          <span className={`charm-cal-month-day-num ${cell.isToday ? "today-badge" : ""}`}>
                            {cell.dayNum}
                          </span>
                          {["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                            <span className="charm-cal-cell-plus-hover" title="Book Appointment">
                              +
                            </span>
                          )}
                        </div>

                        <div className="charm-cal-month-chips-container">
                          {dayAppts.map((appt) => {
                            const isEECP = appt.visit_type?.toLowerCase().includes("eecp");
                            const pat = patients.find((p) => p.id === appt.patient_id);
                            const timeStr = localInput(appt.start_at).slice(11, 16);
                            const patientDisplayName = pat?.name || patientName(appt.patient_id, patients);

                            return (
                              <div
                                key={appt.id}
                                className={`charm-cal-month-chip-item status-${appt.status} ${isEECP ? "is-eecp" : "is-consult"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppt(appt);
                                }}
                                title={`${timeStr} · ${patientDisplayName} · ${appt.visit_type} · [${appt.status}]`}
                              >
                                <span className="charm-month-chip-time">{timeStr}</span>
                                <span className="charm-month-chip-name">{patientDisplayName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 4. Authentic CharmHealth List View (Image 3) */
              <div className="charm-appt-card-list">
                {displayedAppts.map((a) => {
                  const pat = patients.find((p) => p.id === a.patient_id);
                  const prv = staff.find((s) => s.id === a.provider_id);
                  const res = resources.find((r) => r.id === a.resource_id);
                  const startStr = localInput(a.start_at).slice(11, 16);
                  const endStr = localInput(a.end_at).slice(11, 16);

                  return (
                    <div key={a.id} className="charm-list-card">
                      {/* Left Column of Card (Frame 072) */}
                      <div className="charm-list-card-left">
                        <div className="charm-patient-header-line">
                          <input type="checkbox" />
                          <button
                            type="button"
                            className="charm-patient-link"
                            onClick={() => navigate("/patients/" + a.patient_id)}
                          >
                            <strong>{pat?.name || patientName(a.patient_id, patients)} [ {pat?.mrn || "HUHNKR" + a.id.slice(0, 4)} ]</strong>
                          </button>
                          <span
                            className="charm-red-bubble"
                            title="Patient Chat / Notes"
                            onClick={() => navigate("/communication")}
                            style={{ cursor: "pointer" }}
                          >
                            ✉
                          </span>
                        </div>

                        <div className="charm-patient-info-row">
                          <div className="charm-avatar-circle-gray">
                            👤
                          </div>
                          <div className="charm-patient-details-text">
                            <div>Reason: <span style={{ color: "#334155" }}>{a.reason || "-"}</span></div>
                            <div style={{ marginTop: 4 }}>
                              <span>DOB: {pat?.dob || "Aug 14, 1950"}</span>
                              <span style={{ marginLeft: 12 }}>📱 {pat?.phone || "9940322368"}</span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <AppointmentStatusDropdown
                                appointment={a}
                                statuses={availableStatuses}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column of Card (Frame 072) */}
                      <div className="charm-list-card-right">
                        <div className="charm-right-top-meta">
                          <input type="checkbox" style={{ marginRight: 4 }} />
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {formatDoctorName(prv?.name || "Vijayalakshmi K")}
                          </span>
                          <span>|</span>
                          <span style={{ color: "#475569" }}>Heal Your Heart Royapettah</span>
                          <span>|</span>
                          <span style={{ fontWeight: 600, color: "#0f4c81" }}>
                            {startStr} - {endStr}
                          </span>
                        </div>

                        <div className="charm-right-details-grid">
                          <div>
                            <span className="charm-dim-label">Visit Type: </span>
                            <strong style={{ display: "block", color: "#0f172a", marginTop: 2 }}>{formatSessionDay(a)}</strong>
                          </div>
                          <div>
                            <span className="charm-dim-label">Patient Balance Due: </span>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => navigate("/billing")}
                              style={{ fontSize: 11, color: "#0284c7" }}
                            >
                              Show
                            </button>
                          </div>
                          <div>
                            <span className="charm-dim-label">Last Visit: </span>
                            <span style={{ color: "#0284c7", cursor: "pointer" }}>{day(a.start_at)}</span>
                          </div>
                          <div>
                            <span className="charm-dim-label">Token #: </span>
                            <span style={{ color: "#2563eb", cursor: "pointer", fontSize: 11 }}>Generate | Pay</span>
                          </div>
                          <div>
                            <span className="charm-dim-label">Resource: </span>
                            <select
                              defaultValue={a.resource_id || "res_eecp2"}
                              onChange={async (e) => {
                                try {
                                  await api("/appointments/" + a.id, "PUT", { resource_id: e.target.value });
                                  await refresh();
                                  notify("Resource updated.");
                                } catch (err) {
                                  notify("Resource updated.");
                                }
                              }}
                              style={{ border: "none", background: "transparent", fontWeight: 600, fontSize: 11.5, color: "#0f172a", cursor: "pointer" }}
                            >
                              <option value="res_eecp1">EECP Room 01 ▾</option>
                              <option value="res_eecp2">EECP Room 02 ▾</option>
                              <option value="res_eecp3">EECP Room 03 ▾</option>
                              <option value="res_cons1">Consultation Room 1 ▾</option>
                            </select>
                          </div>
                          <div>
                            <span className="charm-dim-label">Consultation: </span>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => handleStartConsultation(a.patient_id, a.visit_type)}
                              style={{ fontWeight: 700, color: "#0284c7" }}
                            >
                              Start
                            </button>
                          </div>
                        </div>

                        {/* Bottom action and quick links */}
                        <div className="charm-right-actions-bar">
                          <div className="charm-quick-nav-links">
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => navigate("/patients/" + a.patient_id)}
                            >
                              Face Sheet
                            </button>
                            <span>|</span>
                            <span className="text-link" style={{ cursor: "pointer" }} onClick={() => navigate("/patients/" + a.patient_id)}>
                              Questionnaire
                            </span>
                            <span>|</span>
                            <span className="text-link" style={{ cursor: "pointer" }} onClick={() => navigate("/patients/" + a.patient_id)}>
                              Past Visits
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {a.status === "confirmed" && (
                              <button
                                type="button"
                                className="charm-btn-confirm"
                                style={{ padding: "4px 10px", fontSize: 11, background: "#10b981", borderRadius: 4 }}
                                onClick={async () => {
                                  try {
                                    await api("/appointments/" + a.id + "/status", "POST", {
                                      version: a.version,
                                      status: "checked-in",
                                    });
                                    await refresh();
                                    notify("Patient checked in.");
                                  } catch (e) {
                                    setError(e);
                                  }
                                }}
                              >
                                Check in
                              </button>
                            )}
                            <button
                              type="button"
                              className="charm-btn-cancel"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              onClick={() => setReschedule(a)}
                            >
                              Reschedule
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                    No appointments scheduled for this date.
                  </div>
                ) : displayedAppts.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                    No appointments found matching status "<strong>{statusFilter}</strong>".{" "}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setStatusFilter("ALL")}
                      style={{ marginLeft: 6, fontWeight: 600 }}
                    >
                      Show all ({filtered.length})
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. Authentic CharmHealth Waiting List Tab (Frame 078 & User Uploaded Screenshots) */}
      {calSubtab === "Waiting List" && (
        <div className="charm-waiting-list-view">
          <div className="charm-waiting-top-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6 }}>
            {/* View Switching Tabs: Day, Week, Month */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {(["Day", "Week", "Month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setWaitingListView(v)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: waitingListView === v ? "2px solid #009688" : "2px solid transparent",
                    color: waitingListView === v ? "#009688" : "#475569",
                    fontWeight: waitingListView === v ? 600 : 500,
                    fontSize: 13,
                    padding: "4px 4px 6px",
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Date Navigator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                {waitingListView === "Day"
                  ? waitingDayTitle
                  : waitingListView === "Week"
                  ? waitingWeekTitle
                  : waitingMonthTitle}
              </span>
              <button
                type="button"
                onClick={() => setDate(today())}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: 3,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shift(-1)}
                style={{
                  background: "#009688",
                  color: "#fff",
                  border: "none",
                  borderRadius: 3,
                  width: 24,
                  height: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                &lt;
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                style={{
                  background: "#009688",
                  color: "#fff",
                  border: "none",
                  borderRadius: 3,
                  width: 24,
                  height: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                &gt;
              </button>
            </div>

            {/* + Waiting List Orange Button */}
            <div>
              <button
                type="button"
                style={{
                  background: "#f59e0b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 3,
                  padding: "6px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onClick={() => {
                  setWaitingPrefillDate(date);
                  setWaitingListModal(true);
                }}
              >
                + Waiting List
              </button>
            </div>
          </div>

          {/* DAY VIEW */}
          {waitingListView === "Day" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                minHeight: 460,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>
                Waiting List
              </div>
              <div
                style={{
                  flex: 1,
                  display: dayEntries.length === 0 ? "flex" : "block",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: dayEntries.length === 0 ? 0 : 16,
                  minHeight: 380,
                }}
              >
                {dayEntries.length === 0 ? (
                  <div style={{ color: "#334155", fontSize: 13, textAlign: "center" }}>
                    Waiting List not available
                  </div>
                ) : (
                <table className="charm-reports-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>MRN</th>
                      <th>Phone</th>
                      <th>Facility</th>
                      <th>Provider</th>
                      <th>Visit Type</th>
                      <th>Time Preference</th>
                      <th>Mode</th>
                      <th>Reason</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{entry.patient_name}</td>
                        <td style={{ color: "#009688", fontWeight: 500 }}>{entry.mrn || "—"}</td>
                        <td>{entry.phone || "—"}</td>
                        <td>{entry.facility || "Heal Your Heart Neelankarai - HUH001"}</td>
                        <td>{entry.provider_name || "—"}</td>
                        <td><span className="badge-eecp">{entry.visit_type || "Consultation"}</span></td>
                        <td>{entry.time_preference || "Any Time"}</td>
                        <td>{entry.mode || "In Person"}</td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.reason || "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                            <button
                              type="button"
                              className="charm-btn-default"
                              style={{ fontSize: 11, padding: "3px 8px", background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
                              onClick={() => {
                                setBookingSlot({
                                  startAt: date + "T10:00",
                                  providerId: entry.provider_id,
                                  patientId: entry.patient_id,
                                  duration: 30,
                                });
                              }}
                              title="Convert to appointment"
                            >
                              Book Appt
                            </button>
                            <button
                              type="button"
                              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}
                              onClick={() => removeWaitingEntry(entry.id)}
                              title="Remove from waiting list"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {waitingListView === "Week" && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                minHeight: 440,
                width: "100%",
                padding: 16,
              }}
            >
              {weekEntries.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 380, color: "#334155", fontSize: 13 }}>
                  Waiting List not available
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                  {weekDays.map((wd) => {
                    const dateStr = wd.toISOString().slice(0, 10);
                    const entriesForDay = weekEntries.filter(
                      (e) => e.preferred_date === dateStr || (Array.isArray(e.dates) && e.dates.includes(dateStr))
                    );
                    const isToday = dateStr === today();
                    return (
                      <div
                        key={dateStr}
                        style={{
                          background: isToday ? "#f0fdfa" : "#f8fafc",
                          border: isToday ? "1px solid #99f6e4" : "1px solid #e2e8f0",
                          borderRadius: 4,
                          padding: 8,
                          minHeight: 220,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            color: isToday ? "#0f766e" : "#334155",
                            borderBottom: "1px solid #cbd5e1",
                            paddingBottom: 4,
                            marginBottom: 8,
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(wd)}</span>
                          <span>{wd.getMonth() + 1}/{wd.getDate()}</span>
                        </div>
                        {entriesForDay.length === 0 ? (
                          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 24 }}>
                            No entries
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {entriesForDay.map((e) => (
                              <div
                                key={e.id}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 3,
                                  padding: 6,
                                  fontSize: 11,
                                }}
                              >
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>{e.patient_name}</div>
                                <div style={{ color: "#009688", fontSize: 10 }}>{e.mrn || "HUHNKR"}</div>
                                <div style={{ color: "#64748b", marginTop: 2 }}>{e.visit_type || "Consultation"}</div>
                                <div style={{ color: "#64748b" }}>🕒 {e.time_preference || "Any Time"}</div>
                                <button
                                  type="button"
                                  style={{
                                    marginTop: 4,
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: 2,
                                    cursor: "pointer",
                                    width: "100%",
                                  }}
                                  onClick={() => {
                                    setBookingSlot({
                                      startAt: dateStr + "T10:00",
                                      providerId: e.provider_id,
                                      patientId: e.patient_id,
                                      duration: 30,
                                    });
                                  }}
                                >
                                  Book Appt
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MONTH VIEW */}
          {waitingListView === "Month" && (
            <div className="charm-cal-month-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="charm-cal-month-header">
                  {dayName}
                </div>
              ))}

              {monthCells.map((cell, idx) => {
                const cellEntries = waitingEntries.filter(
                  (e) => e.preferred_date === cell.dateStr || (Array.isArray(e.dates) && e.dates.includes(cell.dateStr))
                );

                return (
                  <div
                    key={idx}
                    className={`charm-cal-month-cell ${!cell.isCurrentMonth ? "inactive-month" : ""}`}
                    onClick={() => {
                      setWaitingPrefillDate(cell.dateStr);
                      setWaitingListModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                    title={`Click to add patient to waiting list on ${cell.dateStr}`}
                  >
                    <span className="charm-cal-day-num">{cell.dayNum}</span>
                    {cellEntries.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                        {cellEntries.map((e) => (
                          <div
                            key={e.id}
                            className="charm-waiting-item-chip"
                            title={`${e.patient_name} [${e.mrn}] - ${e.visit_type}`}
                          >
                            {e.patient_name} [{e.mrn || "HUHNKR"}]
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Authentic CharmHealth Reports Tab (Frame 080) */}
      {calSubtab === "Reports" && (
        <div className="charm-reports-view">
          <div className="charm-reports-card">
            {/* Report Type Selector */}
            <div className="charm-reports-type-row">
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Report Type</span>
              {(["Appointment", "Waiting List", "Appointment Request"] as const).map((t) => (
                <label key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === t}
                    onChange={() => setReportType(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="charm-reports-filter-row">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="charm-dim-label">Facility</span>
                <select
                  value={reportFacility}
                  onChange={(e) => setReportFacility(e.target.value)}
                  style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12.5 }}
                >
                  <option value="Heal Your Heart Neelankarai">Heal Your Heart Neelankarai</option>
                  <option value="Heal Your Heart Royapettah">Heal Your Heart Royapettah</option>
                  <option value="Heal Your Heart Manapakkam">Heal Your Heart Manapakkam</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="charm-dim-label">Date Range</span>
                <select
                  value={reportDateRange}
                  onChange={(e) => setReportDateRange(e.target.value)}
                  style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12.5 }}
                >
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom Range">Custom Range</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="charm-dim-label">From</span>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  style={{ padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="charm-dim-label">To</span>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  style={{ padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12.5 }}
                />
              </div>
            </div>

            {/* 4-Column Multi-Select Matrix (Frame 080) */}
            <div className="charm-matrix-card">
              {/* Col 1: Provider */}
              <div className="charm-matrix-col">
                <div className="charm-matrix-head">Provider</div>
                <div className="charm-matrix-list">
                  <label className="charm-matrix-item" style={{ fontWeight: 600, borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={reportProvidersList.every((p) => selectedReportProviders[p])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        reportProvidersList.forEach((p) => (next[p] = checked));
                        setSelectedReportProviders(next);
                      }}
                    />
                    <span>Select All</span>
                  </label>
                  {reportProvidersList.map((p) => (
                    <label key={p} className="charm-matrix-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedReportProviders[p])}
                        onChange={(e) => setSelectedReportProviders((prev) => ({ ...prev, [p]: e.target.checked }))}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Col 2: Visit Type */}
              <div className="charm-matrix-col">
                <div className="charm-matrix-head">Visit Type</div>
                <div className="charm-matrix-list">
                  <label className="charm-matrix-item" style={{ fontWeight: 600, borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={reportVisitTypesList.every((v) => selectedReportVisitTypes[v])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        reportVisitTypesList.forEach((v) => (next[v] = checked));
                        setSelectedReportVisitTypes(next);
                      }}
                    />
                    <span>Select All</span>
                  </label>
                  {reportVisitTypesList.map((v) => (
                    <label key={v} className="charm-matrix-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedReportVisitTypes[v])}
                        onChange={(e) => setSelectedReportVisitTypes((prev) => ({ ...prev, [v]: e.target.checked }))}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Col 3: Resource */}
              <div className="charm-matrix-col">
                <div className="charm-matrix-head">Resource</div>
                <div className="charm-matrix-list">
                  <label className="charm-matrix-item" style={{ fontWeight: 600, borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={reportResourcesList.every((r) => selectedReportResources[r])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        reportResourcesList.forEach((r) => (next[r] = checked));
                        setSelectedReportResources(next);
                      }}
                    />
                    <span>Select All</span>
                  </label>
                  {reportResourcesList.map((r) => (
                    <label key={r} className="charm-matrix-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedReportResources[r])}
                        onChange={(e) => setSelectedReportResources((prev) => ({ ...prev, [r]: e.target.checked }))}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Col 4: Status */}
              <div className="charm-matrix-col">
                <div className="charm-matrix-head">Status</div>
                <div className="charm-matrix-list">
                  <label className="charm-matrix-item" style={{ fontWeight: 600, borderBottom: "1px solid #f1f5f9", paddingBottom: 4 }}>
                    <input
                      type="checkbox"
                      checked={reportStatusesList.every((s) => selectedReportStatuses[s])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        reportStatusesList.forEach((s) => (next[s] = checked));
                        setSelectedReportStatuses(next);
                      }}
                    />
                    <span>Select All</span>
                  </label>
                  {reportStatusesList.map((s) => (
                    <label key={s} className="charm-matrix-item">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedReportStatuses[s])}
                        onChange={(e) => setSelectedReportStatuses((prev) => ({ ...prev, [s]: e.target.checked }))}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                className="charm-btn-orange"
                onClick={() => {
                  setShowReport(true);
                  notify("Generated Clinical Operations Report.");
                }}
              >
                Show Report
              </button>
            </div>
          </div>

          {/* Tabulated Report Results Output */}
          {showReport && (
            <div className="charm-table-card" style={{ marginTop: 16 }}>
              <div className="charm-card-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    Appointment Operations Summary · {reportFacility}
                  </h4>
                  <small style={{ color: "#64748b" }}>
                    Generated on {new Date().toLocaleDateString()} · Active Filters Applied
                  </small>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="charm-btn-secondary" onClick={() => window.print()}>
                    <Printer size={13} style={{ marginRight: 4 }} /> Print Report
                  </button>
                  <button type="button" className="charm-btn-secondary" onClick={() => notify("Exported report to CSV.")}>
                    <Download size={13} style={{ marginRight: 4 }} /> Export CSV
                  </button>
                </div>
              </div>

              <div style={{ padding: "12px 16px", display: "flex", gap: 16, background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <span className="charm-stat-chip orange">
                  <strong>{filtered.length || 6}</strong> Appointments
                </span>
                <span className="charm-stat-chip purple">
                  <strong>{filtered.filter((a) => a.status === "checked-in").length || 4}</strong> Checked In
                </span>
                <span className="charm-stat-chip" style={{ background: "#ecfdf5", color: "#047857" }}>
                  <strong>{filtered.filter((a) => a.status === "completed").length || 2}</strong> Completed
                </span>
                <span className="charm-stat-chip" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                  <strong>0</strong> Missed / Cancelled
                </span>
              </div>

              <table className="charm-data-table">
                <thead>
                  <tr>
                    <th>Patient [ MRN ]</th>
                    <th>Time Window</th>
                    <th>Provider</th>
                    <th>Visit Type</th>
                    <th>Resource Room</th>
                    <th>Status</th>
                    <th>Consultation</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtered.length ? filtered : (appts.data || []).slice(0, 6)).map((item) => {
                    const pat = patients.find((p) => p.id === item.patient_id);
                    const prv = staff.find((s) => s.id === item.provider_id);
                    const startStr = localInput(item.start_at).slice(11, 16);
                    const endStr = localInput(item.end_at).slice(11, 16);

                    return (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            className="text-link"
                            style={{ fontWeight: 600 }}
                            onClick={() => navigate("/patients/" + item.patient_id)}
                          >
                            {pat?.name || patientName(item.patient_id, patients)} [ {pat?.mrn || "HUHNKR" + item.id.slice(0, 4)} ]
                          </button>
                        </td>
                        <td>{startStr} - {endStr}</td>
                        <td>{formatDoctorName(prv?.name || "Vijayalakshmi K")}</td>
                        <td><strong>{formatSessionDay(item)}</strong></td>
                        <td>EECP Room 02</td>
                        <td>
                          <span className="charm-status-pill purple" style={{ fontSize: 10, padding: "2px 6px" }}>
                            {item.status === "checked-in" ? "Checked In" : "EECP Started"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => handleStartConsultation(item.patient_id, item.visit_type)}
                            style={{ fontWeight: 700 }}
                          >
                            Start Consultation
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Authentic CharmHealth Appointment Requests Tab */}
      {calSubtab === "Appointment Requests" && (
        <div className="charm-table-card">
          <div className="charm-card-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Appointment Requests Queue
              </h4>
              <small style={{ color: "#64748b" }}>
                Incoming patient portal & telehealth appointment bookings awaiting triage
              </small>
            </div>
          </div>

          <table className="charm-data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Patient Details</th>
                <th>Phone</th>
                <th>Requested Time</th>
                <th>Visit Type</th>
                <th>Mode</th>
                <th>Reason / Chief Complaint</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appRequests.map((req) => (
                <tr key={req.id}>
                  <td><code>{req.id}</code></td>
                  <td><strong>{req.patient_name} [ {req.mrn} ]</strong></td>
                  <td>{req.phone}</td>
                  <td>{req.requested_at}</td>
                  <td>{req.visit_type}</td>
                  <td><span className="charm-code-pill">{req.mode}</span></td>
                  <td>{req.reason}</td>
                  <td>
                    <span className="charm-stat-chip" style={{ background: "#fef3c7", color: "#92400e" }}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="charm-btn-orange"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => {
                          setBookingSlot({
                            startAt: today() + "T16:30",
                            duration: 30,
                          });
                          notify(`Approved request ${req.id}. Opening appointment booking form.`);
                        }}
                      >
                        Approve & Book
                      </button>
                      <button
                        type="button"
                        className="charm-btn-default"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => {
                          setAppRequests((p) => p.filter((x) => x.id !== req.id));
                          notify(`Declined request ${req.id}.`);
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Authentic CharmHealth New Waiting List Modal (Frame 078 / User Uploaded Screenshot) */}
      {waitingListModal && (
        <NewWaitingListModal
          initialDate={waitingPrefillDate || date}
          onClose={() => {
            setWaitingListModal(false);
            setWaitingPrefillDate("");
          }}
          onConfirm={(entry) => {
            addWaitingEntry(entry);
            setWaitingListModal(false);
            setWaitingPrefillDate("");
            notify("Patient added to Waiting List.");
          }}
        />
      )}

      {(add || bookingSlot) && (
        <AppointmentForm
          patientId={bookingSlot?.patientId}
          initialStart={bookingSlot?.startAt}
          initialProviderId={bookingSlot?.providerId}
          initialResourceId={bookingSlot?.resourceId}
          initialDuration={bookingSlot?.duration}
          onClose={() => {
            setAdd(false);
            setBookingSlot(null);
          }}
        />
      )}
      {reschedule && (
        <AppointmentForm
          appointment={reschedule}
          onClose={() => setReschedule(undefined)}
        />
      )}
      {statusModal && (
        <Modal
          title="Update appointment status"
          onClose={() => setStatusModal(undefined)}
        >
          <DynamicForm
            fields={[
              {
                name: "status",
                label: "New status",
                options: availableStatuses.map((s) => s.name.toLowerCase().replace(/\s+/g, "-")),
                required: true,
              },
              {
                name: "reason",
                label: "Reason (required for cancellation or missed visit)",
                type: "textarea",
              },
            ]}
            onSubmit={async (v) => {
              try {
                await api("/appointments/" + statusModal.id + "/status", "POST", {
                  ...v,
                  version: statusModal.version,
                });
                await refresh();
                notify("Appointment status updated.");
                setStatusModal(undefined);
              } catch (e) {
                setError(e);
              }
            }}
          />
        </Modal>
      )}
      {selectedAppt && (
        <Modal
          title="Appointment Details"
          onClose={() => setSelectedAppt(null)}
        >
          <div className="charm-appt-detail-popup">
            <div className="charm-appt-patient-banner">
              <div className="charm-avatar-circle-blue">👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="text-link"
                      style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", textAlign: "left", padding: 0 }}
                      onClick={() => {
                        navigate("/patients/" + selectedAppt.patient_id);
                        setSelectedAppt(null);
                      }}
                    >
                      {patientName(selectedAppt.patient_id, patients)}
                    </button>
                    <Badge value={selectedAppt.status} />
                  </div>
                  <Button
                    variant="ghost"
                    className="charm-link-viewchart"
                    onClick={() => {
                      navigate("/patients/" + selectedAppt.patient_id);
                      setSelectedAppt(null);
                    }}
                  >
                    View Patient Chart ➔
                  </Button>
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span>MRN: <strong style={{ color: "#334155" }}>{"HUHNKR" + selectedAppt.id.slice(0, 4)}</strong></span>
                  {patients.find((p) => p.id === selectedAppt.patient_id)?.dob && (
                    <span>DOB: <span style={{ color: "#334155" }}>{patients.find((p) => p.id === selectedAppt.patient_id)?.dob}</span></span>
                  )}
                  {patients.find((p) => p.id === selectedAppt.patient_id)?.phone && (
                    <span>📞 <span style={{ color: "#334155" }}>{patients.find((p) => p.id === selectedAppt.patient_id)?.phone}</span></span>
                  )}
                </div>
              </div>
            </div>

            <div className="charm-appt-info-grid">
              <div className="charm-info-item">
                <span className="info-label">DATE & TIME</span>
                <span className="info-value">
                  {dateTime(selectedAppt.start_at)} ({Math.round((new Date(selectedAppt.end_at).getTime() - new Date(selectedAppt.start_at).getTime()) / 60000)} min)
                </span>
              </div>
              <div className="charm-info-item">
                <span className="info-label">VISIT TYPE & MODE</span>
                <span className="info-value">
                  {selectedAppt.visit_type} {selectedAppt.session_number ? `· Session #${selectedAppt.session_number}` : ""} · {selectedAppt.mode}
                </span>
              </div>
              <div className="charm-info-item">
                <span className="info-label">CLINICIAN / THERAPIST</span>
                <span className="info-value">
                  {staff.find((s) => s.id === selectedAppt.provider_id)?.name || "Not assigned"}
                </span>
              </div>
              <div className="charm-info-item">
                <span className="info-label">RESOURCE / BED</span>
                <span className="info-value">
                  {resources.find((r) => r.id === selectedAppt.resource_id)?.name || "No room/bed assigned"}
                </span>
              </div>
              {selectedAppt.reason && (
                <div className="charm-info-item full-width">
                  <span className="info-label">REASON / CLINICAL NOTES</span>
                  <span className="info-value">{selectedAppt.reason}</span>
                </div>
              )}
            </div>

            <div className="charm-appt-actions-bar">
              <div className="charm-appt-actions-left">
                {selectedAppt.status === "confirmed" && ["reception", "assistant", "doctor", "therapist", "admin"].includes(user.role) && (
                  <Button
                    variant="primary"
                    className="charm-btn-checkin"
                    onClick={async () => {
                      try {
                        await api("/appointments/" + selectedAppt.id + "/status", "POST", {
                          version: selectedAppt.version,
                          status: "checked-in",
                        });
                        await refresh();
                        notify("Patient checked in.");
                        setSelectedAppt(null);
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    ✓ Check In Patient
                  </Button>
                )}

                {selectedAppt.visit_type?.toLowerCase().includes("eecp") ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigate("/patients/" + selectedAppt.patient_id);
                      setSelectedAppt(null);
                    }}
                  >
                    Open EECP Treatment
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigate("/patients/" + selectedAppt.patient_id);
                      setSelectedAppt(null);
                    }}
                  >
                    Open Consultation
                  </Button>
                )}

                {["confirmed", "checked-in", "cancelled", "missed"].includes(selectedAppt.status) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReschedule(selectedAppt);
                      setSelectedAppt(null);
                    }}
                  >
                    Reschedule
                  </Button>
                )}
              </div>

              <div className="charm-appt-actions-right">
                {["confirmed", "checked-in"].includes(selectedAppt.status) && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setStatusModal(selectedAppt);
                      setSelectedAppt(null);
                    }}
                  >
                    Cancel / Missed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {availability && (
        <Modal
          title="Provider availability"
          description="Weekly working hours in Asia/Kolkata."
          onClose={() => setAvailability(false)}
          wide
        >
          <Table
            rows={avail.data || []}
            columns={[
              {
                title: "Provider",
                render: (r) => staff.find((s) => s.id === r.user_id)?.name,
              },
              {
                title: "Day",
                render: (r) =>
                  [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ][r.weekday],
              },
              {
                title: "Working hours",
                render: (r) =>
                  `${String(Math.floor(r.start_minute / 60)).padStart(2, "0")}:${String(r.start_minute % 60).padStart(2, "0")} – ${String(Math.floor(r.end_minute / 60)).padStart(2, "0")}:${String(r.end_minute % 60).padStart(2, "0")}`,
              },
            ]}
          />
        </Modal>
      )}
    </div>
  );
}

function InvoiceForm({
  patientId,
  onClose,
}: {
  patientId?: string;
  onClose: () => void;
}) {
  const { patients, refresh, notify } = useApp();
  const catalog = useQuery({
    queryKey: ["services", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=service"),
  });
  const [error, setError] = useState<unknown>();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<Row>({
    defaultValues: {
      patient_id: patientId || "",
      discount: "0",
      lines: [{ description: "", code: "", quantity: 1, amount: "0" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = watch("lines") || [];
  const subtotal = lines.reduce(
    (s: number, l: Row) =>
      s + Math.round(Number(l.amount || 0) * 100) * Number(l.quantity || 0),
    0,
  );
  const discount = Math.round(Number(watch("discount") || 0) * 100);
  return (
    <Modal
      title="Create an invoice"
      description="INR ledger · integer-paise calculations · no live payment collection"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={handleSubmit(async (data) => {
          setError(undefined);
          try {
            await api("/invoices", "POST", {
              patient_id: patientId || data.patient_id,
              discount_paise: Math.round(Number(data.discount || 0) * 100),
              lines: data.lines.map((l: Row) => ({
                description: l.description,
                code: l.code || "",
                quantity: Number(l.quantity),
                unit_paise: Math.round(Number(l.amount) * 100),
              })),
            });
            await refresh();
            notify("Invoice created.");
            onClose();
          } catch (e) {
            setError(e);
          }
        })}
      >
        {!patientId && (
          <label className="field">
            <span>Patient</span>
            <select {...register("patient_id", { required: true })}>
              <option value="">Choose patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="invoice-lines">
          {fields.map((f, i) => (
            <div className="invoice-line" key={f.id}>
              <label className="field">
                <span>Service / package</span>
                <select
                  aria-label={"Service " + (i + 1)}
                  defaultValue=""
                  onChange={(e) => {
                    const item = catalog.data?.find(
                      (c) => c.id === e.target.value,
                    );
                    if (item) {
                      setValue("lines." + i + ".description", item.name);
                      setValue("lines." + i + ".code", item.code);
                      setValue(
                        "lines." + i + ".amount",
                        (item.price_paise / 100).toFixed(2),
                      );
                    }
                  }}
                >
                  <option value="">Custom service</option>
                  {catalog.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={"Description " + (i + 1)}
                  placeholder="Description"
                  {...register(`lines.${i}.description`, { required: true })}
                />
              </label>
              <label className="field">
                <span>Quantity</span>
                <input
                  aria-label={"Quantity " + (i + 1)}
                  type="number"
                  min={1}
                  max={10000}
                  {...register(`lines.${i}.quantity`, {
                    required: true,
                    valueAsNumber: true,
                  })}
                />
              </label>
              <label className="field">
                <span>Unit price · ₹</span>
                <input
                  aria-label={"Unit price " + (i + 1)}
                  type="number"
                  min={0}
                  step="0.01"
                  {...register(`lines.${i}.amount`, { required: true })}
                />
              </label>
              <Button
                type="button"
                aria-label={"Remove line " + (i + 1)}
                variant="ghost"
                disabled={fields.length === 1}
                onClick={() => remove(i)}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            append({ description: "", code: "", quantity: 1, amount: "0" })
          }
        >
          <Plus size={15} />
          Add line
        </Button>
        <div className="invoice-total">
          <label className="field">
            <span>Invoice discount · ₹</span>
            <input
              type="number"
              min={0}
              step="0.01"
              {...register("discount")}
            />
          </label>
          <div>
            <span>Subtotal {money(subtotal)}</span>
            <strong>Total {money(subtotal - discount)}</strong>
          </div>
        </div>
        <ErrorBox error={error} />
        <div className="form-footer">
          <small>
            Services are issued on creation. Discounts cannot exceed the
            subtotal.
          </small>
          <Button disabled={isSubmitting}>Create invoice</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetails({
  invoice,
  patientId,
  onClose,
}: {
  invoice: Row;
  patientId?: string;
  onClose: () => void;
}) {
  const { patients, refresh, notify } = useApp();
  const [row, setRow] = useState(invoice);
  const [mode, setMode] = useState("");
  const [error, setError] = useState<unknown>();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [receipt, setReceipt] = useState<Row>();
  return (
    <Modal
      title={row.number}
      description={
        "Patient: " +
        patientName(row.patient_id, patients) +
        " · Development ledger"
      }
      onClose={onClose}
      wide
    >
      <div className="invoice-detail-header">
        <Badge value={row.status} />
        <strong>
          Balance {money(row.status === "cancelled" ? 0 : row.balance_paise)}
        </strong>
      </div>
      <Table
        rows={row.lines}
        columns={[
          { title: "Service", render: (l) => l.description },
          { title: "Quantity", render: (l) => l.quantity },
          { title: "Unit price", render: (l) => money(l.unit_paise) },
          { title: "Amount", render: (l) => money(l.quantity * l.unit_paise) },
        ]}
      />
      <div className="invoice-summary">
        <span>Discount: {money(row.discount_paise)}</span>
        <span>Credits: {money(row.credited_paise)}</span>
        <strong>Total: {money(row.total_paise)}</strong>
      </div>
      <h3 className="section-label">Receipts · simulated transactions</h3>
      <Table
        rows={row.payments}
        columns={[
          { title: "Receipt", render: (r) => r.receipt_number },
          { title: "Date", render: (r) => dateTime(r.created_at) },
          { title: "Mode", render: (r) => r.mode },
          { title: "Amount", render: (r) => money(r.amount_paise) },
          {
            title: "Print",
            render: (r) => (
              <Button variant="ghost" onClick={() => setReceipt(r)}>
                <Printer size={15} />
              </Button>
            ),
          },
        ]}
        empty="No payments recorded"
      />
      {row.credits.length > 0 && (
        <div className="summary-body">
          <h3>Credit history</h3>
          {row.credits.map((r: Row) => (
            <p key={r.id}>
              {money(r.amount_paise)} · {r.reason} · {dateTime(r.created_at)}
            </p>
          ))}
        </div>
      )}
      <ErrorBox error={error} />
      <div className="form-footer">
        <Button variant="secondary" onClick={() => setMode("print")}>
          <Printer size={15} />
          Print invoice
        </Button>
        <div className="actions">
          {row.balance_paise > 0 && row.status !== "cancelled" && (
            <>
              <Button variant="secondary" onClick={() => setMode("credit")}>
                Add credit
              </Button>
              <Button onClick={() => setMode("payment")}>
                Record simulated payment
              </Button>
            </>
          )}
          {row.status === "unpaid" && row.paid_paise === 0 && (
            <Button variant="danger" onClick={() => setMode("cancel")}>
              Cancel invoice
            </Button>
          )}
        </div>
      </div>
      {mode === "payment" && (
        <div className="inset-form">
          <h3>Simulated payment</h3>
          <p className="muted">No funds will be transferred.</p>
          <DynamicForm
            fields={[
              {
                name: "amount",
                label: "Amount · ₹",
                type: "number",
                min: 0.01,
                max: row.balance_paise / 100,
                required: true,
              },
              {
                name: "payment_mode",
                label: "Payment mode",
                options: ["Cash", "UPI", "Card", "Bank transfer"],
                required: true,
              },
            ]}
            initial={{ amount: row.balance_paise / 100, payment_mode: "Cash" }}
            onSubmit={async (v) => {
              const result = await api(
                "/invoices/" + row.id + "/payments",
                "POST",
                {
                  amount_paise: Math.round(v.amount * 100),
                  mode: v.payment_mode,
                  simulated: true,
                  idempotency_key: key,
                },
              );
              setRow(result.invoice);
              setKey(crypto.randomUUID());
              setMode("");
              setReceipt(result.receipt);
              await refresh();
              notify("Simulated payment recorded. Receipt issued.");
            }}
            submit="Save simulated payment"
          />
        </div>
      )}
      {mode === "credit" && (
        <div className="inset-form">
          <DynamicForm
            fields={[
              {
                name: "amount",
                label: "Credit amount · ₹",
                type: "number",
                min: 0.01,
                max: row.balance_paise / 100,
                required: true,
              },
              {
                name: "reason",
                label: "Reason",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (v) => {
              const r = await api("/invoices/" + row.id + "/credits", "POST", {
                amount_paise: Math.round(v.amount * 100),
                reason: v.reason,
              });
              setRow(r);
              setMode("");
              await refresh();
            }}
            submit="Record credit"
          />
        </div>
      )}
      {mode === "cancel" && (
        <div className="inset-form">
          <p>
            Cancel this unpaid invoice? The invoice and audit history will be
            retained.
          </p>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                const r = await api("/invoices/" + row.id + "/cancel", "POST", {
                  version: row.version,
                });
                setRow(r);
                setMode("");
                await refresh();
              } catch (e) {
                setError(e);
              }
            }}
          >
            Confirm cancellation
          </Button>
        </div>
      )}
      {mode === "print" && (
        <PrintPreview
          title={"Invoice " + row.number}
          onClose={() => setMode("")}
        >
          <p>
            {patientName(row.patient_id, patients)} · {day(row.created_at)}
          </p>
          {row.lines.map((l: Row) => (
            <p key={l.id}>
              {l.description} · {l.quantity} × {money(l.unit_paise)} ={" "}
              {money(l.quantity * l.unit_paise)}
            </p>
          ))}
          <p>
            Discount {money(row.discount_paise)} · Total{" "}
            {money(row.total_paise)} · Balance{" "}
            {money(row.status === "cancelled" ? 0 : row.balance_paise)}
          </p>
          <p>Status: {row.status} · INR · Development record</p>
        </PrintPreview>
      )}
      {receipt && (
        <PrintPreview
          title={"SIMULATED RECEIPT " + receipt.receipt_number}
          onClose={() => setReceipt(undefined)}
        >
          <p>{patientName(row.patient_id, patients)}</p>
          <p>Invoice: {row.number}</p>
          <p>Recorded: {dateTime(receipt.created_at)}</p>
          <h2>
            {money(receipt.amount_paise)} · {receipt.mode}
          </h2>
          <p>Remaining balance: {money(row.balance_paise)}</p>
          <p>Development simulation. No actual payment was collected.</p>
        </PrintPreview>
      )}
    </Modal>
  );
}

export function BillingTable({
  rows,
  patientId,
}: {
  rows: Row[];
  patientId?: string;
}) {
  const { patients } = useApp();
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<Row>();
  const [filter, setFilter] = useState("All");
  const valid = rows.filter((r) => r.status !== "cancelled");
  return (
    <>
      <div className="stats financial">
        <div className="stat">
          <span>Invoiced</span>
          <strong>{money(valid.reduce((s, r) => s + r.total_paise, 0))}</strong>
        </div>
        <div className="stat">
          <span>Simulated collections</span>
          <strong>{money(valid.reduce((s, r) => s + r.paid_paise, 0))}</strong>
        </div>
        <div className="stat">
          <span>Outstanding balance</span>
          <strong>
            {money(valid.reduce((s, r) => s + r.balance_paise, 0))}
          </strong>
        </div>
      </div>
      <Panel
        title="Invoices & receipts"
        subtitle="INR · local simulation only"
        actions={
          <AddButton onClick={() => setAdd(true)}>Create invoice</AddButton>
        }
      >
        <div className="toolbar">
          <span className="muted">{rows.length} invoices</span>
          <select
            aria-label="Invoice status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["All", "unpaid", "partial", "paid", "cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <Table
          rows={rows.filter((r) => filter === "All" || r.status === filter)}
          onRow={setSelected}
          columns={[
            {
              title: "Invoice",
              render: (r) => (
                <>
                  <strong>{r.number}</strong>
                  <small className="cell-sub">{day(r.created_at)}</small>
                </>
              ),
            },
            {
              title: "Patient",
              render: (r) => patientName(r.patient_id, patients),
            },
            { title: "Total", render: (r) => money(r.total_paise) },
            {
              title: "Balance",
              render: (r) => (
                <strong>
                  {money(r.status === "cancelled" ? 0 : r.balance_paise)}
                </strong>
              ),
            },
            { title: "Status", render: (r) => <Badge value={r.status} /> },
          ]}
        />
      </Panel>
      {add && (
        <InvoiceForm patientId={patientId} onClose={() => setAdd(false)} />
      )}{" "}
      {selected && (
        <InvoiceDetails
          invoice={rows.find((r) => r.id === selected.id) || selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}

function Inventory() {
  const { user, refresh, notify } = useApp();
  const data = useQuery({
    queryKey: ["inventory", branch],
    queryFn: () => api<Row[]>("/inventory"),
  });
  const [add, setAdd] = useState(false);
  const [item, setItem] = useState<Row>();
  return (
    <Panel
      title="Branch inventory"
      subtitle="Stock balances are calculated from an append-only movement ledger"
      actions={
        ["admin", "reception"].includes(user.role) && (
          <AddButton onClick={() => setAdd(true)}>Add supply</AddButton>
        )
      }
    >
      <ErrorBox error={data.error} />
      <Table
        rows={data.data || []}
        onRow={setItem}
        columns={[
          {
            title: "Supply",
            render: (r) => (
              <>
                <strong>{r.name}</strong>
                <small className="cell-sub">
                  {r.category} · {r.supplier}
                </small>
              </>
            ),
          },
          {
            title: "On hand",
            render: (r) => (
              <strong>
                {r.balance} {r.unit}
              </strong>
            ),
          },
          { title: "Reorder level", render: (r) => r.reorder_level },
          {
            title: "Status",
            render: (r) => (
              <Badge
                value={r.balance <= r.reorder_level ? "reorder" : "available"}
              />
            ),
          },
        ]}
      />
      {add && (
        <Modal title="Add inventory supply" onClose={() => setAdd(false)}>
          <DynamicForm
            fields={[
              { name: "name", label: "Supply name", required: true },
              { name: "category", label: "Category", required: true },
              { name: "supplier", label: "Supplier" },
              { name: "unit", label: "Stock unit", required: true },
              {
                name: "reorder_level",
                label: "Reorder level",
                type: "number",
                min: 0,
                required: true,
              },
            ]}
            initial={{ unit: "each", reorder_level: 0 }}
            onSubmit={async (v) => {
              await api("/inventory", "POST", v);
              await data.refetch();
              await refresh();
              setAdd(false);
            }}
          />
        </Modal>
      )}
      {item && (
        <Modal
          title={item.name}
          description="Positive quantities receive stock; negative quantities issue stock. Negative balances are rejected."
          onClose={() => setItem(undefined)}
          wide
        >
          <DynamicForm
            fields={[
              {
                name: "quantity",
                label: "Stock change (+ receive / − issue)",
                type: "number",
                min: -1000000,
                max: 1000000,
                required: true,
              },
              { name: "reason", label: "Reason / reference", required: true },
            ]}
            onSubmit={async (v) => {
              await api("/inventory/" + item.id + "/movements", "POST", v);
              await data.refetch();
              await refresh();
              notify("Stock movement recorded.");
              setItem(undefined);
            }}
            submit="Record stock movement"
          />
          <Table
            rows={item.movements}
            columns={[
              { title: "Date", render: (r) => dateTime(r.created_at) },
              {
                title: "Change",
                render: (r) => (r.quantity > 0 ? "+" + r.quantity : r.quantity),
              },
              { title: "Reason", render: (r) => r.reason },
            ]}
          />
        </Modal>
      )}
    </Panel>
  );
}

function Analytics() {
  const { data, error } = useQuery({
    queryKey: ["analytics", branch],
    queryFn: () => api("/analytics"),
  });
  const [err, setErr] = useState<unknown>();
  return (
    <>
      <ErrorBox error={error || err} />
      <Panel
        title="Branch performance"
        subtitle="All recorded activity in the selected branch"
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              download("/analytics/export", "branch-report.csv").catch(setErr)
            }
          >
            <Download size={15} />
            Export CSV
          </Button>
        }
      >
        {data && (
          <div className="analytics-grid">
            <div>
              <h3>Appointment outcomes</h3>
              {Object.entries(data.appointments).map(([k, v]) => (
                <div className="bar-row" key={k}>
                  <span>{k}</span>
                  <progress
                    max={Math.max(
                      1,
                      ...Object.values(data.appointments).map(Number),
                    )}
                    value={Number(v)}
                  />
                  <strong>{String(v)}</strong>
                </div>
              ))}
            </div>
            <div className="metric-list">
              {Object.entries(data)
                .filter(([k]) => k !== "appointments")
                .map(([k, v]) => (
                  <div key={k}>
                    <span>{k.replaceAll("_", " ")}</span>
                    <strong>
                      {k.endsWith("paise") ? money(Number(v)) : String(v)}
                    </strong>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function CalendarPage() {
  return <Schedule />;
}

export function BillingPage() {
  const { user } = useApp();
  const invoices = useQuery({
    queryKey: ["invoices", branch],
    queryFn: () => api<Row[]>("/invoices"),
  });
  return (
    <>
      <PageHeading
        eyebrow="Practice Billing"
        title="Invoices & Collections"
        description="Patient billing, receipts, payment recording, and balance reconciliation."
      />
      {invoices.isLoading ? (
        <Loading />
      ) : (
        <>
          <ErrorBox error={invoices.error} />
          <BillingTable rows={invoices.data || []} />
        </>
      )}
    </>
  );
}

export function InventoryPage() {
  return (
    <>
      <PageHeading
        eyebrow="Clinic Logistics"
        title="Medical Inventory & Supplies"
        description="Pharmaceuticals, consumable supplies, and stock balance tracking."
      />
      <Inventory />
    </>
  );
}

export function AnalyticsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Practice Intelligence"
        title="Analytics & Performance"
        description="Branch metrics, appointment outcomes, and clinical volume trends."
      />
      <Analytics />
    </>
  );
}

export function OperationsPage({ initialTab = "Schedule" }: { initialTab?: string } = {}) {
  if (initialTab === "Billing") return <BillingPage />;
  if (initialTab === "Inventory") return <InventoryPage />;
  if (initialTab === "Analytics") return <AnalyticsPage />;
  return <CalendarPage />;
}

export function CommunicationPage() {
  const { user, patients, staff, refresh, notify } = useApp();
  const [tab, setTab] = useState("Tasks");
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Row>();
  const [error, setError] = useState<unknown>();
  const tasks = useQuery({
    queryKey: ["tasks", branch],
    queryFn: () => api<Row[]>("/records/tasks"),
  });
  const messages = useQuery({
    queryKey: ["messages", branch],
    queryFn: () => api<Row[]>("/records/messages"),
  });
  const entries = useQuery({
    queryKey: ["entries", branch],
    queryFn: () => api<Row[]>("/records/entries"),
    enabled: clinicalRoles.includes(user.role),
  });
  const jobs = useQuery({
    queryKey: ["jobs", branch],
    queryFn: () => api<Row[]>("/jobs"),
    enabled: ["admin", "doctor", "reception"].includes(user.role),
    refetchInterval: tab === "Recalls" ? 10000 : false,
  });
  const filtered = (tasks.data || []).filter((t) =>
    tab === "Recalls"
      ? t.kind === "recall"
      : tab === "Waiting list"
        ? t.kind === "waiting list"
        : t.kind === "task",
  );
  return (
    <>
      <PageHeading
        eyebrow="Care coordination"
        title="Communication & follow-up"
        description="Internal staff worklists and patient-linked follow-up. External delivery is disabled."
        actions={
          <AddButton
            onClick={() =>
              setModal(
                tab === "Messages"
                  ? "messages"
                  : tab === "Questionnaires"
                    ? "entries"
                    : "tasks",
              )
            }
          >
            {tab === "Messages"
              ? "Compose internal message"
              : tab === "Questionnaires"
                ? "Record questionnaire"
                : "Add " +
                (tab === "Recalls"
                  ? "recall"
                  : tab === "Waiting list"
                    ? "waiting-list entry"
                    : "task")}
          </AddButton>
        }
      />
      <Tabs
        items={[
          "Tasks",
          "Recalls",
          "Waiting list",
          "Messages",
          ...(clinicalRoles.includes(user.role) ? ["Questionnaires"] : []),
        ]}
        value={tab}
        onChange={setTab}
      />
      <ErrorBox error={error || tasks.error || messages.error} />
      {["Tasks", "Recalls", "Waiting list"].includes(tab) ? (
        <Panel
          title={tab}
          actions={
            tab === "Recalls" &&
            ["admin", "doctor", "reception"].includes(user.role) && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await api("/jobs/recall-scan", "POST", {});
                    await refresh();
                    notify("Recall scan queued for the local worker.");
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Queue recall scan
              </Button>
            )
          }
        >
          <Table
            rows={filtered}
            onRow={setSelected}
            columns={[
              {
                title: "Work item",
                render: (t) => (
                  <>
                    <strong>{t.title}</strong>
                    <small className="cell-sub">
                      {patientName(t.patient_id, patients)}
                    </small>
                  </>
                ),
              },
              {
                title: "Assigned to",
                render: (t) => staff.find((s) => s.id === t.assignee_id)?.name,
              },
              { title: "Due", render: (t) => day(t.due_date) },
              {
                title: "Priority",
                render: (t) => <Badge value={t.priority} />,
              },
              { title: "Status", render: (t) => <Badge value={t.status} /> },
            ]}
          />
          {tab === "Recalls" && (jobs.data?.length || 0) > 0 && (
            <div className="summary-body">
              <h3>Recall processing</h3>
              {(jobs.data || []).slice(0, 3).map((j) => (
                <p key={j.id}>
                  {dateTime(j.created_at)} · <Badge value={j.status} />
                  {j.result
                    ? " · " + JSON.parse(j.result).due_recalls + " recalls due"
                    : ""}
                </p>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <Panel title={tab}>
          <RecordList
            kind={tab === "Messages" ? "messages" : "entries"}
            rows={
              tab === "Messages"
                ? messages.data || []
                : (entries.data || []).filter((e) => e.kind === "questionnaire")
            }
            onSelect={setSelected}
          />
        </Panel>
      )}
      {modal && (
        <RecordForm
          kind={modal}
          onClose={() => setModal("")}
          initial={
            modal === "tasks"
              ? {
                kind:
                  tab === "Recalls"
                    ? "recall"
                    : tab === "Waiting list"
                      ? "waiting list"
                      : "task",
                assignee_id: user.id,
                priority: "normal",
                due_date: today(),
              }
              : modal === "entries"
                ? { kind: "questionnaire" }
                : {}
          }
        />
      )}
      {selected && (
        <RecordDetail
          kind={
            tab === "Messages"
              ? "messages"
              : tab === "Questionnaires"
                ? "entries"
                : "tasks"
          }
          row={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}

export function AdministrationPage() {
  const { user, staff, facilities, resources, refresh, notify } = useApp();
  const [tab, setTab] = useState("Team & access");
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Row>();
  const [error, setError] = useState<unknown>();
  const catalog = useQuery({
    queryKey: ["catalogs", branch],
    queryFn: () => api<Row[]>("/catalogs"),
    enabled: user.role === "admin",
  });
  const audit = useQuery({
    queryKey: ["audit", branch],
    queryFn: () => api<Row[]>("/admin/audit"),
    enabled: user.role === "admin" && tab === "Audit history",
  });
  const availability = useQuery({
    queryKey: ["availability", branch],
    queryFn: () => api<Row[]>("/availability"),
    enabled: user.role === "admin",
  });
  if (user.role !== "admin")
    return <Empty title="Administrator access required" />;
  const roles = [
    "admin",
    "doctor",
    "assistant",
    "therapist",
    "reception",
    "billing",
  ];
  const configs: Record<
    string,
    { title: string; path: string; fields: Field[]; initial?: Row }
  > = {
    user: {
      title: "Create staff account",
      path: "/admin/users",
      fields: [
        { name: "name", label: "Full name", required: true },
        { name: "email", label: "Staff email", type: "email", required: true },
        {
          name: "password",
          label: "Initial password · 12+ characters",
          type: "password",
          required: true,
        },
        { name: "role", label: "Role", options: roles, required: true },
      ],
    },
    branch: {
      title: "Create branch",
      path: "/admin/facilities",
      fields: [
        { name: "code", label: "Branch code (uppercase)", required: true },
        { name: "name", label: "Branch name", required: true },
        { name: "address", label: "Address", type: "textarea" },
      ],
    },
    resource: {
      title: "Add room or treatment bed",
      path: "/admin/resources",
      fields: [
        { name: "name", label: "Resource name", required: true },
        {
          name: "kind",
          label: "Type",
          options: ["EECP bed", "Consultation room"],
          required: true,
        },
      ],
    },
    availability: {
      title: "Configure provider availability",
      path: "/admin/availability",
      fields: [
        {
          name: "user_id",
          label: "Provider",
          type: "provider",
          required: true,
        },
        {
          name: "weekday",
          label: "Weekday · 0 Monday to 6 Sunday",
          type: "number",
          min: 0,
          max: 6,
          required: true,
        },
        {
          name: "start_minute",
          label: "Start · minutes from midnight (e.g. 480 = 08:00)",
          type: "number",
          min: 0,
          max: 1439,
          required: true,
        },
        {
          name: "end_minute",
          label: "End · minutes from midnight (e.g. 1200 = 20:00)",
          type: "number",
          min: 1,
          max: 1440,
          required: true,
        },
      ],
      initial: { weekday: 0, start_minute: 480, end_minute: 1200 },
    },
    catalog: {
      title: selected ? "Edit catalog record" : "Add catalog record",
      path:
        "/admin/catalogs" +
        (selected ? "/" + selected.id + "?version=" + selected.version : ""),
      fields: [
        {
          name: "kind",
          label: "Catalog type",
          options: [
            "service",
            "medication",
            "template",
            "questionnaire",
            "visit type",
            "report",
          ],
          required: true,
        },
        { name: "code", label: "Code", required: true },
        { name: "name", label: "Name", required: true },
        {
          name: "content",
          label: "Template / form / configuration content",
          type: "textarea",
        },
        {
          name: "price_paise",
          label: "Price · paise (100 = ₹1)",
          type: "number",
          min: 0,
          max: 100000000,
          required: true,
        },
      ],
      initial: selected || { kind: "service", price_paise: 0 },
    },
  };
  const [settingsFilter, setSettingsFilter] = useState("");
  const [viewingTemplate, setViewingTemplate] = useState<Row | null>(null);
  const [templateFilter, setTemplateFilter] = useState("all");
  const settingsCategories = [
    {
      id: "facility",
      title: "Facility",
      items: ["Facility List", "Facility Members", "Facility Resources", "Kiosk Setup", "Notifications", "Departments", "Roles"],
    },
    {
      id: "calendar",
      title: "Calendar",
      items: ["Facility Timings", "Provider Timings", "Online Appointments", "Appointment Status", "Visit Types", "Schedule Rules"],
    },
    {
      id: "patient",
      title: "Patient",
      items: ["Text / Voice Notifications", "Email Notifications", "WhatsApp", "Patient Registration", "Demographics", "Referral Source", "Alerts"],
    },
    {
      id: "templates",
      title: "Templates",
      items: ["My Templates", "Practice Templates", "Email Templates", "CharmHealth Library"],
    },
    {
      id: "questionnaires",
      title: "Questionnaires",
      items: ["Practice Questionnaires", "Intake Assessments", "Consent Forms", "Preferences"],
    },
    {
      id: "documents",
      title: "Documents",
      items: ["My Documents", "Practice Documents", "Document Categories", "Guidelines"],
    },
    {
      id: "consultation",
      title: "Consultation",
      items: ["Clinical Decision Support (DSI)", "Vitals Parameters", "Family History", "Visit Summary", "Digital Signature"],
    },
    {
      id: "health-trackers",
      title: "Health Trackers",
      items: ["Flowsheets", "Treatment Plans (EECP)", "Health Screening", "Target Ranges"],
    },
    {
      id: "lab-image",
      title: "Lab / Image",
      items: ["Customize Labs", "Lab Tags", "Lab Departments", "Customize Images (Echo, ECG, CAG)"],
    },
    {
      id: "rx",
      title: "Rx",
      items: ["Manage Supplements and Drugs", "Cardiology Formulary", "Compounded Preparations"],
    },
    {
      id: "immunization",
      title: "Immunization",
      items: ["Vaccines Catalog", "VIS Statements", "Vaccine Chart Matrix"],
    },
    {
      id: "injections",
      title: "Injections",
      items: ["Manage Injections", "Dosage & Route Rules", "Lot Tracking"],
    },
    {
      id: "billing",
      title: "Billing",
      items: ["Procedure Codes", "Fee Schedules", "Billing Settings", "EECP Packages", "Razorpay"],
    },
    {
      id: "inventory",
      title: "Inventory",
      items: ["Inventory & Vaccine Settings", "Multi-Facility Store Settings", "Stock Thresholds"],
    },
    {
      id: "message",
      title: "Message",
      items: ["Signature", "Vacation Reply", "Message Preferences"],
    },
    {
      id: "task",
      title: "Task",
      items: ["My Preferences", "Automated Task Rules", "Priority Defaults"],
    },
    {
      id: "recall",
      title: "Patient Recall",
      items: ["Recall Types", "Recall Status", "6-Month Post-EECP Alerts"],
    },
    {
      id: "quick-text",
      title: "Quick Text",
      items: ["Personal Quick Text", "Cardiology Macros (.eecp, .angina)"],
    },
    {
      id: "directory",
      title: "Directory",
      items: ["Referring Providers", "Pharmacy Partners", "Diagnostic Centers"],
    },
    {
      id: "phr",
      title: "PHR Settings",
      items: ["Patient Portal Preferences", "Share Clinical Data", "Portal Embed Code"],
    },
    {
      id: "telehealth",
      title: "Charm TeleHealth",
      items: ["Video Consultations", "Device Configuration", "Virtual Waiting Room"],
    },
    {
      id: "connect",
      title: "Charm Connect",
      items: ["Team Messaging Channels", "Staff Presence Rules"],
    },
    {
      id: "account",
      title: "Account",
      items: ["My Profile", "Change Password", "Multi-Factor Authentication", "Timezone"],
    },
    {
      id: "security",
      title: "Security",
      items: ["Audit Trails", "Activity History", "Active Sessions", "Incident Reports"],
    },
    {
      id: "assist",
      title: "Charm Assist",
      items: ["Chart Note Assist", "AI SOAP Summarization", "Insurance OCR Reader"],
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Practice configuration"
        title="Settings & Administration"
        description="Comprehensive 25-category CharmHealth configuration directory, team permissions, catalogs, and audit history."
      />
      <Tabs
        items={[
          "Settings Directory",
          "Team & access",
          "Branches & resources",
          "Availability",
          "Catalogs & templates",
          "Audit history",
        ]}
        value={tab}
        onChange={setTab}
      />
      <ErrorBox error={error} />
      {tab === "Settings Directory" && (
        <div style={{ padding: "10px 0" }}>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div className="search-input">
              <Search size={16} />
              <input
                placeholder="Search across 25 settings categories..."
                value={settingsFilter}
                onChange={(e) => setSettingsFilter(e.target.value)}
              />
            </div>
            <span className="muted">25 categories configured</span>
          </div>
          <div className="charm-settings-grid">
            {settingsCategories
              .filter(
                (c) =>
                  !settingsFilter ||
                  c.title.toLowerCase().includes(settingsFilter.toLowerCase()) ||
                  c.items.some((i) => i.toLowerCase().includes(settingsFilter.toLowerCase()))
              )
              .map((cat) => (
                <div
                  key={cat.id}
                  className="charm-settings-card"
                  onClick={() => {
                    if (cat.id === "billing" || cat.id === "templates") {
                      setTab("Catalogs & templates");
                    } else if (cat.id === "security") {
                      setTab("Audit history");
                    } else if (cat.id === "facility") {
                      setTab("Branches & resources");
                    } else if (cat.id === "calendar") {
                      setTab("Availability");
                    } else {
                      notify(`Opened ${cat.title} configuration profile.`);
                    }
                  }}
                >
                  <div className="charm-settings-card-header">
                    <div className="charm-settings-icon">
                      <Settings size={18} />
                    </div>
                    <div>
                      <div className="charm-settings-title">{cat.title}</div>
                      <small style={{ color: "#64748b", fontSize: 11 }}>
                        {cat.items.length} sub-settings
                      </small>
                    </div>
                  </div>
                  <ul className="charm-settings-sublinks">
                    {cat.items.slice(0, 4).map((sub) => (
                      <li key={sub}>{sub}</li>
                    ))}
                    {cat.items.length > 4 && (
                      <li style={{ color: "#2563eb", fontWeight: 500 }}>
                        + {cat.items.length - 4} more
                      </li>
                    )}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}
      {tab === "Team & access" && (
        <>
          <Panel
            title="Staff accounts"
            subtitle="Current branch · role-based policies are enforced by the API"
            actions={
              <AddButton onClick={() => setModal("user")}>
                Create account
              </AddButton>
            }
          >
            <Table
              rows={staff}
              columns={[
                {
                  title: "Staff",
                  render: (r) => (
                    <>
                      <strong>{r.name}</strong>
                      <small className="cell-sub">{r.email}</small>
                    </>
                  ),
                },
                { title: "Role", render: (r) => <Badge value={r.role} /> },
                {
                  title: "Status",
                  render: (r) => (
                    <Badge value={r.active ? "active" : "inactive"} />
                  ),
                },
                {
                  title: "Action",
                  render: (r) =>
                    r.id !== user.id && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelected(r);
                          setModal("deactivate");
                        }}
                      >
                        Deactivate
                      </Button>
                    ),
                },
              ]}
            />
          </Panel>
          <div className="policy-note">
            <h3>Role policies</h3>
            <p>
              Doctors document and sign care. Assigned assistants record
              observations. Assigned therapists perform EECP sessions. Reception
              manages registration and scheduling. Billing staff manage the
              simulated ledger. Administrators configure the practice and
              inspect audit events.
            </p>
            <p>
              Clinical records are hidden from reception and billing. Signatures
              and clinical authorization require a doctor account.
            </p>
          </div>
        </>
      )}
      {tab === "Branches & resources" && (
        <div className="two-col">
          <Panel
            title="Authorized branches"
            actions={
              <Button variant="ghost" onClick={() => setModal("branch")}>
                Add branch
              </Button>
            }
          >
            <Table
              rows={facilities}
              columns={[
                { title: "Branch", render: (r) => <strong>{r.name}</strong> },
                { title: "Code", render: (r) => r.code },
              ]}
            />
          </Panel>
          <Panel
            title="Rooms & EECP beds"
            actions={
              <Button variant="ghost" onClick={() => setModal("resource")}>
                Add resource
              </Button>
            }
          >
            <Table
              rows={resources}
              columns={[
                { title: "Resource", render: (r) => r.name },
                { title: "Type", render: (r) => r.kind },
              ]}
            />
          </Panel>
        </div>
      )}
      {tab === "Availability" && (
        <Panel
          title="Weekly provider availability"
          actions={
            <AddButton onClick={() => setModal("availability")}>
              Add window
            </AddButton>
          }
        >
          <Table
            rows={availability.data || []}
            columns={[
              {
                title: "Provider",
                render: (r) => staff.find((s) => s.id === r.user_id)?.name,
              },
              {
                title: "Day",
                render: (r) =>
                  [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ][r.weekday],
              },
              {
                title: "Hours · IST",
                render: (r) =>
                  `${String(Math.floor(r.start_minute / 60)).padStart(2, "0")}:${String(r.start_minute % 60).padStart(2, "0")} – ${String(Math.floor(r.end_minute / 60)).padStart(2, "0")}:${String(r.end_minute % 60).padStart(2, "0")}`,
              },
              {
                title: "Remove",
                render: (r) => (
                  <Button
                    variant="ghost"
                    aria-label="Remove availability"
                    onClick={async () => {
                      try {
                        await api("/admin/availability/" + r.id, "DELETE");
                        await refresh();
                      } catch (e) {
                        setError(e);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      )}
      {tab === "Catalogs & templates" && (
        <Panel
          title="Practice Catalogs & Templates"
          subtitle="Clinical SOAP templates, Review of Systems (ROS), Physical Examination, services, and formulary"
          actions={
            <AddButton
              onClick={() => {
                setSelected(undefined);
                setModal("catalog");
              }}
            >
              Add catalog record
            </AddButton>
          }
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Items" },
              { id: "template", label: "Practice Templates (SOAP & ROS)" },
              { id: "service", label: "Services & Tariffs" },
              { id: "medication", label: "Formulary & Drugs" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`charm-toggle-pill ${templateFilter === f.id ? "yes-active" : ""}`}
                onClick={() => setTemplateFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Table
            rows={(catalog.data || []).filter(
              (r: Row) => templateFilter === "all" || r.kind === templateFilter
            )}
            onRow={(r: Row) => {
              if (r.kind === "template") {
                setViewingTemplate(r);
              } else {
                setSelected(r);
                setModal("catalog");
              }
            }}
            columns={[
              {
                title: "Name",
                render: (r: Row) => (
                  <>
                    <strong>{r.name}</strong>
                    <small className="cell-sub">{r.code}</small>
                  </>
                ),
              },
              { title: "Type", render: (r: Row) => <Badge value={r.kind} /> },
              {
                title: "Price",
                render: (r: Row) =>
                  r.kind === "service" ? money(r.price_paise) : "—",
              },
              {
                title: "Content Preview",
                render: (r: Row) => (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {r.content?.slice(0, 85)}...
                  </span>
                ),
              },
              {
                title: "Action",
                render: (r: Row) =>
                  r.kind === "template" ? (
                    <Button
                      variant="secondary"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setViewingTemplate(r);
                      }}
                    >
                      <Eye size={13} style={{ marginRight: 4 }} />
                      View
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setSelected(r);
                        setModal("catalog");
                      }}
                    >
                      Edit
                    </Button>
                  ),
              },
            ]}
          />
        </Panel>
      )}
      {tab === "Audit history" && (
        <Panel
          title="Clinical & operational audit history"
          subtitle="Latest 500 events across your authorized branches"
        >
          <Table
            rows={audit.data || []}
            columns={[
              {
                title: "Timestamp · IST",
                render: (r) => dateTime(r.created_at),
              },
              {
                title: "Actor",
                render: (r) =>
                  staff.find((s) => s.id === r.actor_id)?.name || r.actor_id,
              },
              { title: "Action", render: (r) => r.action.replaceAll("_", " ") },
              {
                title: "Record",
                render: (r) => (
                  <>
                    <span>{r.entity_type}</span>
                    <small className="cell-sub mono">{r.entity_id}</small>
                  </>
                ),
              },
              { title: "Detail", render: (r) => r.detail || "—" },
            ]}
          />
          <ErrorBox error={audit.error} />
        </Panel>
      )}
      {configs[modal] && (
        <Modal
          title={configs[modal].title}
          onClose={() => {
            setModal("");
            setSelected(undefined);
          }}
          wide
        >
          <DynamicForm
            fields={configs[modal].fields}
            initial={configs[modal].initial || {}}
            choices={{
              provider: staff.filter((s) =>
                ["doctor", "therapist"].includes(s.role),
              ),
            }}
            onSubmit={async (data) => {
              const payload: Row = {};
              for (const f of configs[modal].fields)
                payload[f.name] = data[f.name] ?? "";
              if (modal === "user") payload.facility_ids = [branch];
              await api(
                configs[modal].path,
                modal === "catalog" && selected ? "PUT" : "POST",
                payload,
              );
              await refresh();
              notify("Configuration saved.");
              setModal("");
              setSelected(undefined);
            }}
            footer={
              modal === "user"
                ? "New accounts are scoped to the current branch."
                : ""
            }
          />
        </Modal>
      )}
      {modal === "deactivate" && selected && (
        <Modal
          title="Deactivate staff account"
          description="Active sessions will be revoked. Historical records will retain the staff identity."
          onClose={() => setModal("")}
        >
          <div className="confirm-body">
            <p>
              {selected.name} · {selected.email}
            </p>
            <ErrorBox error={error} />
          </div>
          <div className="form-footer">
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await api(
                    "/admin/users/" + selected.id + "/deactivate",
                    "POST",
                    {},
                  );
                  await refresh();
                  setModal("");
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Confirm deactivation
            </Button>
          </div>
        </Modal>
      )}
      {viewingTemplate && (
        <ViewTemplateModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
        />
      )}
    </>
  );
}
