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
  Clock3,
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
import {
  ProviderAvailabilityPanel,
  ProviderAvailabilityResults,
  ProviderAvailabilityResult,
} from "./ProviderAvailability";
import {
  readWaitingListEntries,
  saveWaitingListEntries,
  WAITING_LIST_STORAGE_KEY,
  WAITING_LIST_UPDATED_EVENT,
} from "./waitingList";

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

function waitingListStartAt(entry: any, fallbackDate: string) {
  const date = entry.preferred_date || entry.dates?.find(Boolean) || fallbackDate;
  const match = String(entry.time_preference || "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return `${date}T10:00`;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${date}T${String(hour).padStart(2, "0")}:${match[2] || "00"}`;
}

function waitingEntryMatchesDate(entry: any, dateStr: string) {
  const dates = Array.isArray(entry.dates)
    ? entry.dates.filter((value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    : [];
  const preferredDate = typeof entry.preferred_date === "string" ? entry.preferred_date : "";

  if (entry.date_preference === "Period") {
    const start = dates[0] || preferredDate;
    const end = dates[1] || start;
    if (!start) return false;
    return dateStr >= (start < end ? start : end) && dateStr <= (start > end ? start : end);
  }

  return dates.includes(dateStr) || preferredDate === dateStr;
}

function WaitingListDateBadge({
  date,
  count,
  onClick,
}: {
  date: string;
  count: number;
  onClick: () => void;
}) {
  if (!count) return null;

  return (
    <button
      type="button"
      className="charm-waiting-counter charm-waiting-date-counter"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={`Open ${count} waiting list ${count === 1 ? "entry" : "entries"} for ${date}`}
      title={`Waiting list for ${date}`}
    >
      Waiting List
      <span className="charm-waiting-counter-badge">{count}</span>
    </button>
  );
}

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

  const matchedStatus = statuses.find(
    (s) => s.name.toLowerCase() === selectedOption.label.toLowerCase()
  );
  const statusColor =
    matchedStatus?.color ||
    (selectedOption.label.toLowerCase().includes("checked in")
      ? "#008000"
      : selectedOption.label.toLowerCase().includes("completed")
      ? "#64748b"
      : selectedOption.label.toLowerCase().includes("confirmed")
      ? "#84cc16"
      : "#7c3aed");

  return (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
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
            background: statusColor,
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
        {(appointment.status === "checked-in" ||
          appointment.status_label === "Checked in" ||
          appointment.checked_in_at) && (
          <span style={{ fontSize: 11, color: "#475569" }}>
            at{" "}
            {appointment.checked_in_at
              ? new Date(appointment.checked_in_at)
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                  .toLowerCase()
              : "10:47 am"}
          </span>
        )}
      </div>
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
  initialEntry,
}: {
  onClose: () => void;
  onConfirm: (entry: any) => void;
  initialDate?: string;
  initialEntry?: any;
}) {
  const { staff, patients, facilities } = useApp();
  const [showQuickNewPatient, setShowQuickNewPatient] = useState(false);
  const [facility, setFacility] = useState(
    initialEntry?.facility || (facilities?.[0]?.name ? `${facilities[0].name} - ${facilities[0].code || "HUH001"}` : "Heal Your Heart Neelankarai - HUH001")
  );
  const [selPatient, setSelPatient] = useState(initialEntry?.patient_id || "");
  const [patientQuery, setPatientQuery] = useState(() => {
    const patient = patients.find((p) => p.id === initialEntry?.patient_id);
    return patient ? `${patient.name} (${patient.mrn})` : initialEntry?.patient_name || "";
  });
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  const [providerId, setProviderId] = useState(
    initialEntry?.provider_id || staff.find((s) => ["doctor", "therapist"].includes(s.role))?.id || ""
  );
  const [visitType, setVisitType] = useState(initialEntry?.visit_type || "--Select--");
  const [resource, setResource] = useState(initialEntry?.resource || "--Select--");
  const [apptMode, setApptMode] = useState<"In Person" | "Phone Call">(
    initialEntry?.mode === "Phone Call" ? "Phone Call" : "In Person"
  );
  const [datePreference, setDatePreference] = useState<"Specific Date(s)" | "Period">(
    initialEntry?.date_preference === "Period" ? "Period" : "Specific Date(s)"
  );

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

  const initDateStr = initialEntry?.preferred_date || initialDate || today();
  const [opt1, setOpt1] = useState(() => formatDisplayDate(initDateStr));
  const [opt1Raw, setOpt1Raw] = useState(initialEntry?.dates?.[0] || initDateStr);
  const [opt2, setOpt2] = useState(() => formatDisplayDate(initialEntry?.dates?.[1] || ""));
  const [opt2Raw, setOpt2Raw] = useState(initialEntry?.dates?.[1] || "");
  const [opt3, setOpt3] = useState(() => formatDisplayDate(initialEntry?.dates?.[2] || ""));
  const [opt3Raw, setOpt3Raw] = useState(initialEntry?.dates?.[2] || "");

  const [fromDate, setFromDate] = useState(() => formatDisplayDate(initialEntry?.dates?.[0] || initDateStr));
  const [fromDateRaw, setFromDateRaw] = useState(initialEntry?.dates?.[0] || initDateStr);
  const [toDate, setToDate] = useState(() => formatDisplayDate(initialEntry?.dates?.[1] || ""));
  const [toDateRaw, setToDateRaw] = useState(initialEntry?.dates?.[1] || "");

  const datePickerRef1 = useRef<HTMLInputElement>(null);
  const datePickerRef2 = useRef<HTMLInputElement>(null);
  const datePickerRef3 = useRef<HTMLInputElement>(null);
  const fromDatePickerRef = useRef<HTMLInputElement>(null);
  const toDatePickerRef = useRef<HTMLInputElement>(null);

  const [timePreference, setTimePreference] = useState(initialEntry?.time_preference || "Any Time");
  const [reason, setReason] = useState(initialEntry?.reason || "");
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
      ...initialEntry,
      id: initialEntry?.id || "wl_" + Date.now(),
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
      created_at: initialEntry?.created_at || new Date().toISOString(),
      updated_at: initialEntry ? new Date().toISOString() : undefined,
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
            {initialEntry ? "Waiting List Details" : "New Waiting List"}
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
                      {initialEntry ? "Update" : "Confirm"}
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
  const { user, staff, patients, facilities, resources, refresh, notify } = useApp();
  const clinicalProviders = useMemo(() => {
    const list = staff.filter((s) => ["doctor", "therapist"].includes(s.role));
    return list.length > 0 ? list : staff;
  }, [staff]);
  const [view, setView] = useState("List View");
  const [date, setDate] = useState(today());
  const [provider, setProvider] = useState("");
  const [add, setAdd] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [providerAvailabilityOpen, setProviderAvailabilityOpen] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<ProviderAvailabilityResult | null>(null);
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

  const [calSortBy, setCalSortBy] = useState<"Time" | "Token" | "Status" | "Resource" | "Provider">("Time");
  const [providerQuickSearch, setProviderQuickSearch] = useState("");
  const [calSettingsOpen, setCalSettingsOpen] = useState(false);
  const [calSettings, setCalSettings] = useState({
    showCancelled: false,
    colorByEvents: "Event Type",
    viewSchedulesFor: "Current Facility",
    defaultView: "List View",
    timeSlot: "10 minutes",
    colorByAppts: "Provider",
  });
  const [selectedCalProviders, setSelectedCalProviders] = useState<Record<string, boolean>>({});
  const [selectedCalResources, setSelectedCalResources] = useState<Record<string, boolean>>({});
  const [selectedCalVisitTypes, setSelectedCalVisitTypes] = useState<Record<string, boolean>>({});
  const [shownBalances, setShownBalances] = useState<Record<string, boolean>>({});
  const [lastVisitModalAppt, setLastVisitModalAppt] = useState<Row | null>(null);
  const [paymentModalAppt, setPaymentModalAppt] = useState<Row | null>(null);

  const [waitingListModal, setWaitingListModal] = useState(false);
  const [waitingDetailsOpen, setWaitingDetailsOpen] = useState(false);
  const [waitingDetailsDate, setWaitingDetailsDate] = useState("");
  const [editingWaitingEntry, setEditingWaitingEntry] = useState<any | null>(null);
  const [confirmWaitingEntry, setConfirmWaitingEntry] = useState<any | null>(null);
  const [waitingEntries, setWaitingEntries] = useState<any[]>(readWaitingListEntries);

  useEffect(() => {
    const onWaitingListUpdate = (event: Event) => {
      const entries = (event as CustomEvent<any[]>).detail;
      setWaitingEntries(Array.isArray(entries) ? entries : readWaitingListEntries());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === WAITING_LIST_STORAGE_KEY) {
        setWaitingEntries(readWaitingListEntries());
      }
    };
    window.addEventListener(WAITING_LIST_UPDATED_EVENT, onWaitingListUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WAITING_LIST_UPDATED_EVENT, onWaitingListUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const waitingEntriesForDate = (dateStr: string) =>
    waitingEntries.filter((entry) => waitingEntryMatchesDate(entry, dateStr));
  const openWaitingDetails = (dateStr: string) => {
    setWaitingDetailsDate(dateStr);
    setWaitingDetailsOpen(true);
  };
  const closeWaitingDetails = () => {
    setWaitingDetailsOpen(false);
    setWaitingDetailsDate("");
  };

  const addWaitingEntry = (entry: any) => {
    const next = [entry, ...waitingEntries.filter((current) => current.id !== entry.id)];
    saveWaitingListEntries(next);
    setWaitingEntries(next);
  };

  const removeWaitingEntry = (id: string) => {
    const next = waitingEntries.filter((entry) => entry.id !== id);
    saveWaitingListEntries(next);
    setWaitingEntries(next);
  };

  const updateWaitingEntry = (entry: any) => {
    const next = waitingEntries.map((current) => current.id === entry.id ? entry : current);
    saveWaitingListEntries(next);
    setWaitingEntries(next);
  };

  const openWaitingEntryConfirmation = (entry: any) => {
    closeWaitingDetails();
    setConfirmWaitingEntry(entry);
  };

  const openWaitingEntryEdit = (entry: any) => {
    closeWaitingDetails();
    setEditingWaitingEntry(entry);
    setWaitingListModal(true);
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

  const closeProviderAvailability = () => {
    setProviderAvailabilityOpen(false);
    setAvailabilityResult(null);
  };

  const toggleProviderAvailability = () => {
    if (providerAvailabilityOpen) {
      closeProviderAvailability();
    } else {
      setProviderAvailabilityOpen(true);
    }
  };

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

  const resourceNames = useMemo(() => {
    const fromDb = Array.from(new Set(resources.map((r) => r.name))).filter(Boolean);
    const defaults = [
      "EECP Room 01", "EECP Room 02", "EECP Room 03", "EECP Room 04",
      "EECP Room 05", "EECP Room 06", "Consultation Room 1",
    ];
    return Array.from(new Set([...fromDb, ...defaults]));
  }, [resources]);

  const getApptResourceName = (resId?: string) => {
    if (!resId) return "-- Select --";
    const r = resources.find((res) => res.id === resId);
    if (r) return r.name;
    const map: Record<string, string> = {
      res_eecp1: "EECP Room 01",
      res_eecp2: "EECP Room 02",
      res_eecp3: "EECP Room 03",
      res_eecp4: "EECP Room 04",
      res_eecp5: "EECP Room 05",
      res_eecp6: "EECP Room 06",
      res_cons1: "Consultation Room 1",
    };
    return map[resId] || resId;
  };

  const normalizeVisitType = (vt?: string) => {
    if (!vt) return "General Visit";
    const lower = vt.toLowerCase().trim();
    if (lower.includes("eecp")) {
      if (lower.includes("1st day") || lower.includes("first")) return "EECP 1st Day";
      if (lower.includes("demo")) return "EECP Demo";
      const dayMatch = lower.match(/eecp\s+(\d+)(?:st|nd|rd|th)?\s*day/);
      if (dayMatch) return `EECP ${dayMatch[1]}th Day`;
      return "EECP Treatment";
    }
    if (lower.includes("follow")) return "Follow-up Visit";
    if (lower.includes("new") || lower.includes("consult")) return "New Patient Visit";
    if (lower.includes("diabet") || lower.includes("ht")) return "Diabetes/HT Management";
    if (lower.includes("admiss")) return "Admission";
    if (lower.includes("telehealth") || lower.includes("video")) return "Telehealth Video Consult";
    if (lower.includes("walk")) return "Walk-in visits";
    if (lower.includes("absent")) return "Absent";
    return vt;
  };

  const isProviderSelected = (provId?: string) => {
    const hasAnySelected = Object.values(selectedCalProviders).some((v) => v === true);
    const hasAnyUnselected = Object.values(selectedCalProviders).some((v) => v === false);
    if (hasAnyUnselected && !hasAnySelected) return false;
    if (!provId) return true;
    if (selectedCalProviders[provId] === false) return false;
    return true;
  };

  const isResourceSelected = (resId?: string) => {
    const hasAnySelected = Object.values(selectedCalResources).some((v) => v === true);
    const hasAnyUnselected = Object.values(selectedCalResources).some((v) => v === false);
    if (hasAnyUnselected && !hasAnySelected) return false;
    const resName = getApptResourceName(resId);
    if (resName === "-- Select --") return true;
    if (selectedCalResources[resName] === false) return false;
    return true;
  };

  const isVisitTypeSelected = (vt?: string) => {
    const hasAnySelected = Object.values(selectedCalVisitTypes).some((v) => v === true);
    const hasAnyUnselected = Object.values(selectedCalVisitTypes).some((v) => v === false);
    if (hasAnyUnselected && !hasAnySelected) return false;
    if (!vt) return true;
    if (selectedCalVisitTypes[vt] === false) return false;
    const norm = normalizeVisitType(vt);
    if (selectedCalVisitTypes[norm] === false) return false;
    return true;
  };

  // 1. Date & Facility filtering
  const dateAndFacilityFiltered = useMemo(() => {
    return (appts.data || []).filter((a) => {
      // Date filter
      const apptDate = new Date(a.start_at);
      if (view === "Month") {
        if (apptDate.getFullYear() !== viewYear || (apptDate.getMonth() + 1) !== viewMonth) return false;
      } else if (view === "Week") {
        const t = apptDate.getTime();
        if (t < rangeStart.getTime() || t >= rangeEnd.getTime()) return false;
      } else {
        const localDay = localInput(a.start_at).slice(0, 10);
        if (localDay !== date) return false;
      }
      // Facility filter
      if (calSettings.viewSchedulesFor === "Current Facility") {
        if (branch && a.facility_id && a.facility_id !== branch && a.facility_id !== "curr") {
          return false;
        }
      }
      return true;
    });
  }, [appts.data, date, view, viewYear, viewMonth, rangeStart, rangeEnd, calSettings.viewSchedulesFor, branch]);

  // 2. Settings filters (Cancelled toggle, Provider, Resource, Visit Type, and Left Drawer Provider)
  const scopedAppts = useMemo(() => {
    return dateAndFacilityFiltered.filter((a) => {
      if (provider && a.provider_id !== provider) return false;
      if (!calSettings.showCancelled) {
        const s = (a.status || "").toLowerCase();
        if (s === "cancelled" || s === "missed" || s === "no show" || s === "rescheduled") {
          return false;
        }
      }
      if (!isProviderSelected(a.provider_id)) return false;
      if (!isResourceSelected(a.resource_id)) return false;
      if (!isVisitTypeSelected(a.visit_type)) return false;
      return true;
    });
  }, [dateAndFacilityFiltered, provider, calSettings.showCancelled, selectedCalProviders, selectedCalResources, selectedCalVisitTypes, resources]);

  // Backward compatibility alias for single-day list view
  const filtered = scopedAppts;

  // 3. Status counts derived from scopedAppts (stays stable regardless of which status chip is clicked)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of scopedAppts) {
      const raw = a.status_label || (a.status === "checked-in" ? "Checked in" : a.status === "confirmed" ? "Confirmed" : a.status === "completed" ? "Completed" : a.status === "cancelled" ? "Cancelled" : a.status);
      const match = availableStatuses.find((s) => s.name.toLowerCase() === raw.toLowerCase());
      const label = match ? match.name : raw;
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [scopedAppts, availableStatuses]);

  // 4. Status chip filter & Quick Search filter
  const searchAndStatusFiltered = useMemo(() => {
    let list = scopedAppts;
    if (statusFilter !== "ALL") {
      list = list.filter((a) => {
        const raw = a.status_label || (a.status === "checked-in" ? "Checked in" : a.status === "confirmed" ? "Confirmed" : a.status === "completed" ? "Completed" : a.status === "cancelled" ? "Cancelled" : a.status);
        return raw.toLowerCase() === statusFilter.toLowerCase();
      });
    }
    if (providerQuickSearch.trim()) {
      const q = providerQuickSearch.trim().toLowerCase();
      list = list.filter((a) => {
        const provName = (staff.find((s) => s.id === a.provider_id)?.name || "").toLowerCase();
        const pat = patients.find((p) => p.id === a.patient_id);
        const patName = (pat?.name || patientName(a.patient_id, patients)).toLowerCase();
        const patMrn = (pat?.mrn || "").toLowerCase();
        return provName.includes(q) || patName.includes(q) || patMrn.includes(q);
      });
    }
    return list;
  }, [scopedAppts, statusFilter, providerQuickSearch, staff, patients]);

  // 5. Sort By application
  const displayedAppts = useMemo(() => {
    const sorted = [...searchAndStatusFiltered];
    if (calSortBy === "Time") {
      sorted.sort((a, b) => a.start_at.localeCompare(b.start_at));
    } else if (calSortBy === "Token") {
      sorted.sort((a, b) => {
        const tokA = a.token_number != null ? Number(a.token_number) : 999999;
        const tokB = b.token_number != null ? Number(b.token_number) : 999999;
        if (tokA !== tokB) return tokA - tokB;
        return a.start_at.localeCompare(b.start_at);
      });
    } else if (calSortBy === "Status") {
      sorted.sort((a, b) => {
        const sA = a.status_label || a.status || "";
        const sB = b.status_label || b.status || "";
        const cmp = sA.localeCompare(sB);
        if (cmp !== 0) return cmp;
        return a.start_at.localeCompare(b.start_at);
      });
    } else if (calSortBy === "Resource") {
      sorted.sort((a, b) => {
        const rA = getApptResourceName(a.resource_id);
        const rB = getApptResourceName(b.resource_id);
        const cmp = rA.localeCompare(rB);
        if (cmp !== 0) return cmp;
        return a.start_at.localeCompare(b.start_at);
      });
    } else if (calSortBy === "Provider") {
      sorted.sort((a, b) => {
        const pA = staff.find((s) => s.id === a.provider_id)?.name || "zzz";
        const pB = staff.find((s) => s.id === b.provider_id)?.name || "zzz";
        const cmp = pA.localeCompare(pB);
        if (cmp !== 0) return cmp;
        return a.start_at.localeCompare(b.start_at);
      });
    }
    return sorted;
  }, [searchAndStatusFiltered, calSortBy, resources, staff]);

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

  const dayEntries = waitingEntriesForDate(date);
  const weekEntries = waitingEntries.filter((entry) =>
    weekDays.some((day) => waitingEntryMatchesDate(entry, day.toISOString().slice(0, 10)))
  );

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
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div className="charm-cal-quicksearch">
            <Search size={14} color="#94a3b8" />
            <input
              placeholder="Provider Quick Search"
              value={providerQuickSearch}
              onChange={(e) => setProviderQuickSearch(e.target.value)}
            />
            {providerQuickSearch && (
              <button
                type="button"
                onClick={() => setProviderQuickSearch("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, padding: "0 4px" }}
                title="Clear quick search"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="button"
            className="text-link"
            style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            onClick={() => setCalSettingsOpen(!calSettingsOpen)}
          >
            <Settings size={13} />
            Settings
          </button>

          {/* CharmHealth Calendar Settings Popover (Frame 030/050) */}
          {calSettingsOpen && (
            <div className="charm-calendar-settings-popover" onClick={(e) => e.stopPropagation()}>
              <div className="charm-cal-popover-top">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={calSettings.showCancelled}
                    onChange={(e) => setCalSettings({ ...calSettings, showCancelled: e.target.checked })}
                  />
                  Show Cancelled/Rescheduled Appointments
                </label>
                <div className="charm-cal-popover-row">
                  <div className="charm-cal-popover-field">
                    <span>Color code events by</span>
                    <select
                      value={calSettings.colorByEvents}
                      onChange={(e) => setCalSettings({ ...calSettings, colorByEvents: e.target.value })}
                    >
                      <option value="Event Type">Event Type</option>
                      <option value="Provider">Provider</option>
                    </select>
                  </div>
                  <div className="charm-cal-popover-field">
                    <span>View schedules for</span>
                    <select
                      value={calSettings.viewSchedulesFor}
                      onChange={(e) => setCalSettings({ ...calSettings, viewSchedulesFor: e.target.value })}
                    >
                      <option value="Current Facility">Current Facility</option>
                      <option value="All Facilities">All Facilities</option>
                    </select>
                  </div>
                </div>
                <div className="charm-cal-popover-row">
                  <div className="charm-cal-popover-field">
                    <span>Default View</span>
                    <select
                      value={calSettings.defaultView}
                      onChange={(e) => {
                        setCalSettings({ ...calSettings, defaultView: e.target.value });
                        setView(e.target.value);
                      }}
                    >
                      <option value="List View">List View</option>
                      <option value="Day">Day</option>
                      <option value="Week">Week</option>
                      <option value="Month">Month</option>
                    </select>
                  </div>
                  <div className="charm-cal-popover-field">
                    <span>Time Slot</span>
                    <select
                      value={calSettings.timeSlot}
                      onChange={(e) => setCalSettings({ ...calSettings, timeSlot: e.target.value })}
                    >
                      <option value="10 minutes">10 minutes</option>
                      <option value="15 minutes">15 minutes</option>
                      <option value="20 minutes">20 minutes</option>
                      <option value="30 minutes">30 minutes</option>
                    </select>
                  </div>
                  <div className="charm-cal-popover-field">
                    <span>Color code appointments by</span>
                    <select
                      value={calSettings.colorByAppts}
                      onChange={(e) => setCalSettings({ ...calSettings, colorByAppts: e.target.value })}
                    >
                      <option value="Provider">Provider</option>
                      <option value="Status">Status</option>
                      <option value="Visit Type">Visit Type</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Three Filter Columns: Provider, Resource, Visit Type */}
              <div className="charm-cal-popover-cols">
                {/* Column 1: Provider */}
                <div className="charm-cal-popover-col">
                  <div className="charm-cal-popover-col-head">
                    <span>Provider</span>
                    <span className="charm-cal-popover-col-links">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          clinicalProviders.forEach((p: any) => { all[p.id] = true; });
                          setSelectedCalProviders(all);
                        }}
                      >
                        Select All
                      </button>{" "}
                      |{" "}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const none: Record<string, boolean> = {};
                          clinicalProviders.forEach((p: any) => { none[p.id] = false; });
                          setSelectedCalProviders(none);
                        }}
                      >
                        Unselect All
                      </button>
                    </span>
                  </div>
                  <div className="charm-cal-popover-col-list">
                    {clinicalProviders.map((prv: any, idx: number) => {
                      const colors = ["#00bcd4", "#4caf50", "#2196f3", "#9c27b0", "#ff9800", "#e91e63"];
                      const swatch = colors[idx % colors.length];
                      const isChecked = selectedCalProviders[prv.id] !== false;
                      return (
                        <label key={prv.id} className="charm-cal-popover-item">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setSelectedCalProviders({ ...selectedCalProviders, [prv.id]: e.target.checked })}
                          />
                          <span>{prv.name}</span>
                          <span className="charm-cal-popover-swatch" style={{ background: swatch }} />
                        </label>
                      );
                    })}
                  </div>
                  <div className="charm-cal-popover-drag-note">* Drag and drop to rearrange providers</div>
                </div>

                {/* Column 2: Resource */}
                <div className="charm-cal-popover-col">
                  <div className="charm-cal-popover-col-head">
                    <span>Resource</span>
                    <span className="charm-cal-popover-col-links">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          resourceNames.forEach((r) => { all[r] = true; });
                          setSelectedCalResources(all);
                        }}
                      >
                        Select All
                      </button>{" "}
                      |{" "}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const none: Record<string, boolean> = {};
                          resourceNames.forEach((r) => { none[r] = false; });
                          setSelectedCalResources(none);
                        }}
                      >
                        Unselect All
                      </button>
                    </span>
                  </div>
                  <div className="charm-cal-popover-col-list">
                    <div className="charm-cal-popover-col-subhead">Heal Your Heart Neelankarai</div>
                    {resourceNames.map((resName) => (
                      <label key={resName} className="charm-cal-popover-item">
                        <input
                          type="checkbox"
                          checked={selectedCalResources[resName] !== false}
                          onChange={(e) => setSelectedCalResources({ ...selectedCalResources, [resName]: e.target.checked })}
                        />
                        <span>{resName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Column 3: Visit Type */}
                <div className="charm-cal-popover-col">
                  <div className="charm-cal-popover-col-head">
                    <span>Visit Type</span>
                    <span className="charm-cal-popover-col-links">
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          availableVisitTypes.forEach((v) => { all[v.name] = true; });
                          setSelectedCalVisitTypes(all);
                        }}
                      >
                        Select All
                      </button>{" "}
                      |{" "}
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          const none: Record<string, boolean> = {};
                          availableVisitTypes.forEach((v) => { none[v.name] = false; });
                          setSelectedCalVisitTypes(none);
                        }}
                      >
                        Unselect All
                      </button>
                    </span>
                  </div>
                  <div className="charm-cal-popover-col-list">
                    {availableVisitTypes.map((vt) => {
                      const isChecked = selectedCalVisitTypes[vt.name] !== false;
                      return (
                        <label key={vt.id || vt.name} className="charm-cal-popover-item">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setSelectedCalVisitTypes({ ...selectedCalVisitTypes, [vt.name]: e.target.checked })}
                          />
                          <span>{vt.name}</span>
                          <span className="charm-cal-popover-swatch" style={{ background: vt.color || "#84cc16" }} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Calendar Layout: Left Drawer + Right Schedule */}
      {calSubtab === "Calendar" && (
        <div className="charm-cal-split">
          {providerAvailabilityOpen && (
            <ProviderAvailabilityPanel
              providers={staff.filter((member) => ["doctor", "therapist"].includes(member.role))}
              facilities={facilities}
              visitTypes={availableVisitTypes}
              schedules={avail.data || []}
              appointments={appts.data || []}
              onClose={closeProviderAvailability}
              onSearch={setAvailabilityResult}
            />
          )}

          {/* Right: Main Appointments Workspace */}
          <section className="charm-cal-content">
            {availabilityResult ? (
              <ProviderAvailabilityResults
                result={availabilityResult}
                onClose={() => setAvailabilityResult(null)}
              />
            ) : (
              <>
            {/* Controls Header */}
            <div className="charm-cal-controls">
              {/* View switcher buttons */}
              <div className="charm-calendar-view-switcher">
                <button
                  type="button"
                  className={`charm-provider-availability-toggle ${providerAvailabilityOpen ? "active" : ""}`}
                  onClick={toggleProviderAvailability}
                  aria-label={providerAvailabilityOpen ? "Close Provider Availability" : "Open Provider Availability"}
                  aria-expanded={providerAvailabilityOpen}
                  title="Provider Availability"
                >
                  <Clock3 size={18} />
                </button>
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

            {/* Yellow Timezone Banner with Functional Sort by Selector */}
            <div className="charm-cal-yellow-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px", background: "#fef9c3", border: "1px solid #fef08a", borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#854d0e" }}>
                  Appointments are shown in <strong>Asia/Kolkata (IST)</strong> time zone
                </span>
                {view === "List View" && (
                  <WaitingListDateBadge
                    date={date}
                    count={waitingEntriesForDate(date).length}
                    onClick={() => openWaitingDetails(date)}
                  />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span style={{ fontWeight: 500 }}>Sort by</span>
                <select
                  value={calSortBy}
                  onChange={(e) => setCalSortBy(e.target.value as any)}
                  aria-label="Sort appointments by"
                  style={{
                    padding: "3px 8px",
                    fontSize: 12,
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    background: "#fff",
                    color: "#0f172a",
                    fontWeight: 500,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="Time">Time</option>
                  <option value="Token">Token</option>
                  <option value="Status">Status</option>
                  <option value="Resource">Resource</option>
                  <option value="Provider">Provider</option>
                </select>
              </div>
            </div>

            {/* Dynamic CharmHealth Stat Summary Pills */}
            <div className="charm-stat-pills" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div
                className={`charm-stat-chip ${statusFilter === "ALL" ? "orange" : ""}`}
                onClick={() => setStatusFilter("ALL")}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 54,
                  padding: "4px 10px",
                  background: statusFilter === "ALL" ? "#ea580c" : "#fff",
                  color: statusFilter === "ALL" ? "#fff" : "#ea580c",
                  borderColor: "#ea580c",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderRadius: 4,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{scopedAppts.length}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.5px", marginTop: 2 }}>ALL</span>
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
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 70,
                      padding: "4px 12px",
                      background: isSelected ? chipColor : "#fff",
                      color: isSelected ? "#fff" : chipColor,
                      borderColor: chipColor,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderRadius: 4,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                    title={`Click to filter by ${sName}`}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{count}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.5px", marginTop: 2, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sName.toUpperCase()}
                    </span>
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
                    const dayDateStr = d.toISOString().slice(0, 10);
                    const isCurrent = dayDateStr === date;
                    return (
                      <div
                        key={i}
                        className={`charm-week-day-col ${isCurrent ? "active-day" : ""}`}
                      >
                        <strong>
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]}{" "}
                          {d.getMonth() + 1}/{d.getDate()}
                        </strong>
                        <WaitingListDateBadge
                          date={dayDateStr}
                          count={waitingEntriesForDate(dayDateStr).length}
                          onClick={() => openWaitingDetails(dayDateStr)}
                        />
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
                          const slotAppts = searchAndStatusFiltered.filter((a) => {
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
                    <WaitingListDateBadge
                      date={date}
                      count={waitingEntriesForDate(date).length}
                      onClick={() => openWaitingDetails(date)}
                    />
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
                    const slotAppts = searchAndStatusFiltered.filter((a) => {
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
                            <div className="charm-day-appt-cards" style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                              {slotAppts.length > 1 ? (
                                slotAppts.map((currentSlotAppt) => {
                                  const isEECP = currentSlotAppt.visit_type?.toLowerCase().includes("eecp");
                                  const pat = patients.find((p) => p.id === currentSlotAppt.patient_id);
                                  const pName = pat?.name || patientName(currentSlotAppt.patient_id, patients);
                                  const startTime = localInput(currentSlotAppt.start_at).slice(11, 16);
                                  const endTime = localInput(currentSlotAppt.end_at).slice(11, 16);
                                  const displayStatus = currentSlotAppt.status_label || (currentSlotAppt.status === "checked-in" ? "Checked in" : currentSlotAppt.status === "confirmed" ? "Confirmed" : currentSlotAppt.status === "completed" ? "Completed" : currentSlotAppt.status === "cancelled" ? "Cancelled" : currentSlotAppt.status);
                                  const stConfig = availableStatuses.find(
                                    (s) => s.name.toLowerCase() === displayStatus.toLowerCase()
                                  );
                                  const accentColor = stConfig?.color || (isEECP ? "#10b981" : "#0284c7");
                                  return (
                                    <div
                                      key={currentSlotAppt.id}
                                      className="charm-week-appt-strip"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAppt(currentSlotAppt);
                                      }}
                                      title={`${pName} (${startTime} - ${endTime}) · ${displayStatus} · ${staff.find((s) => s.id === currentSlotAppt.provider_id)?.name || ""}`}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        background: "#f8fafc",
                                        border: "1px solid #cbd5e1",
                                        borderLeft: `4px solid ${accentColor}`,
                                        borderRadius: 3,
                                        padding: "4px 8px",
                                        fontSize: 11,
                                        cursor: "pointer",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 10.5, flexShrink: 0 }}>
                                        {startTime} - {endTime}
                                      </span>
                                      <span style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                                        {pName} [{pat?.mrn || "HUHNKR" + currentSlotAppt.id.slice(0, 4)}]
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
                                        {displayStatus}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                slotAppts.map((currentSlotAppt) => {
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
                                })
                              )}
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
                    const dayAppts = scopedAppts
                      .filter((a) => localInput(a.start_at).slice(0, 10) === cell.dateStr)
                      .sort((a, b) => a.start_at.localeCompare(b.start_at));
                    const waitingCount = waitingEntriesForDate(cell.dateStr).length;

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

                        <WaitingListDateBadge
                          date={cell.dateStr}
                          count={waitingCount}
                          onClick={() => openWaitingDetails(cell.dateStr)}
                        />

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
                        {(() => {
                          const prvIdx = clinicalProviders.findIndex((p: any) => p.id === a.provider_id);
                          const colors = ["#00bcd4", "#4caf50", "#2196f3", "#9c27b0", "#ff9800", "#e91e63"];
                          const swatchColor = prvIdx >= 0 ? colors[prvIdx % colors.length] : "#8b5cf6";
                          return (
                            <div className="charm-right-top-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input type="checkbox" />
                              <span style={{ display: "inline-block", width: 8, height: 8, backgroundColor: swatchColor, borderRadius: 1, flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                {formatDoctorName(prv?.name || "Dr. Ramasamy S")}
                              </span>
                              <span style={{ color: "#cbd5e1" }}>|</span>
                              <span style={{ color: "#475569" }}>Heal Your Heart Neelankarai</span>
                              <span style={{ color: "#cbd5e1" }}>|</span>
                              <span style={{ fontWeight: 600, color: "#0f4c81" }}>
                                {startStr} - {endStr}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="charm-right-details-grid">
                          <div>
                            <span className="charm-dim-label">Visit Type: </span>
                            <strong style={{ display: "block", color: "#0f172a", marginTop: 2 }}>{formatSessionDay(a)}</strong>
                          </div>
                          <div>
                            <span className="charm-dim-label">Patient Balance Due: </span>
                            {shownBalances[a.id] ? (
                              <strong style={{ color: "#0f172a", fontSize: 11.5 }}>Rs. 0.00</strong>
                            ) : (
                              <button
                                type="button"
                                className="text-link"
                                onClick={() => setShownBalances((prev) => ({ ...prev, [a.id]: true }))}
                                style={{ fontSize: 11, color: "#0284c7" }}
                              >
                                Show
                              </button>
                            )}
                          </div>
                          <div>
                            <span className="charm-dim-label">Last Visit: </span>
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => setLastVisitModalAppt(a)}
                              style={{ color: "#0284c7", fontSize: 11.5, padding: 0 }}
                            >
                              {day(a.start_at)}
                            </button>
                          </div>
                          <div>
                            <span className="charm-dim-label">Token #: </span>
                            {a.token_number ? (
                              <span style={{ fontSize: 11.5 }}>
                                <strong style={{ color: "#0f172a" }}>{a.token_number}</strong>
                                <span style={{ color: "#94a3b8", margin: "0 5px" }}>|</span>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() => setPaymentModalAppt(a)}
                                  style={{ color: "#2563eb", fontWeight: 500 }}
                                >
                                  Pay
                                </button>
                              </span>
                            ) : (
                              <span style={{ fontSize: 11.5 }}>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={async () => {
                                    try {
                                      await api("/appointments/" + a.id + "/token", "POST");
                                      await refresh();
                                      notify("Token number generated.");
                                    } catch (err: any) {
                                      notify(err.message || "Failed to generate token");
                                    }
                                  }}
                                  style={{ color: "#2563eb", fontWeight: 500 }}
                                >
                                  Generate
                                </button>
                                <span style={{ color: "#94a3b8", margin: "0 5px" }}>|</span>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() => setPaymentModalAppt(a)}
                                  style={{ color: "#2563eb", fontWeight: 500 }}
                                >
                                  Pay
                                </button>
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="charm-dim-label">Resource: </span>
                            <select
                              value={a.resource_id || ""}
                              onChange={async (e) => {
                                try {
                                  await api("/appointments/" + a.id, "PATCH", { resource_id: e.target.value });
                                  await refresh();
                                  notify("Resource updated.");
                                } catch (err) {
                                  notify("Resource updated.");
                                }
                              }}
                              style={{ border: "1px solid #cbd5e1", borderRadius: 3, padding: "2px 6px", background: "#fff", fontWeight: 500, fontSize: 11.5, color: "#0f172a", cursor: "pointer" }}
                            >
                              <option value="">-- Select --</option>
                              <option value="res_eecp1">EECP Room 01</option>
                              <option value="res_eecp2">EECP Room 02</option>
                              <option value="res_eecp3">EECP Room 03</option>
                              <option value="res_eecp4">EECP Room 04</option>
                              <option value="res_eecp5">EECP Room 05</option>
                              <option value="res_eecp6">EECP Room 06</option>
                              <option value="res_cons1">Consultation Room 1</option>
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
                              {(a.status === "checked-in" || a.status === "completed" || a.status === "started" || a.status_label === "Checked in") ? "Edit" : "Start"}
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
              </>
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
                          <div className="charm-waiting-actions">
                            <button
                              type="button"
                              onClick={() => openWaitingEntryConfirmation(entry)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => openWaitingEntryEdit(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeWaitingEntry(entry.id)}
                            >
                              Cancel
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
                    const entriesForDay = waitingEntriesForDate(dateStr);
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
                const cellEntries = waitingEntriesForDate(cell.dateStr);

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
      {waitingDetailsOpen && (
        <Modal
          title={`Waiting List Details · ${new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${waitingDetailsDate}T12:00:00Z`))}`}
          onClose={closeWaitingDetails}
          wide
        >
          <div className="charm-waiting-details-content">
            <table className="charm-reports-table charm-waiting-details-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Time Preference</th>
                  <th>Mobile Phone</th>
                  <th>Reason</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {waitingEntriesForDate(waitingDetailsDate).map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.patient_name}</strong>
                      {entry.mrn && <span className="charm-waiting-details-mrn">[{entry.mrn}]</span>}
                    </td>
                    <td>{entry.provider_name || "—"}</td>
                    <td>{entry.time_preference || "Any Time"}</td>
                    <td>{entry.phone || "—"}</td>
                    <td>{entry.reason || "—"}</td>
                    <td>
                      <div className="charm-waiting-actions">
                        <button type="button" onClick={() => openWaitingEntryConfirmation(entry)}>
                          Confirm
                        </button>
                        <button type="button" onClick={() => openWaitingEntryEdit(entry)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => removeWaitingEntry(entry.id)}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {waitingEntriesForDate(waitingDetailsDate).length === 0 && (
                  <tr>
                    <td colSpan={6} className="charm-waiting-details-empty">
                      No people are currently on the waiting list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {waitingListModal && (
        <NewWaitingListModal
          initialDate={waitingPrefillDate || date}
          initialEntry={editingWaitingEntry || undefined}
          onClose={() => {
            setWaitingListModal(false);
            setWaitingPrefillDate("");
            setEditingWaitingEntry(null);
          }}
          onConfirm={(entry) => {
            if (editingWaitingEntry) {
              updateWaitingEntry(entry);
              notify("Waiting list entry updated.");
            } else {
              addWaitingEntry(entry);
              notify("Patient added to Waiting List.");
            }
            setWaitingListModal(false);
            setWaitingPrefillDate("");
            setEditingWaitingEntry(null);
          }}
        />
      )}

      {confirmWaitingEntry && (
        <AppointmentForm
          patientId={confirmWaitingEntry.patient_id}
          initialStart={waitingListStartAt(confirmWaitingEntry, date)}
          initialProviderId={confirmWaitingEntry.provider_id}
          initialResourceId={resources.find((resource) => resource.name === confirmWaitingEntry.resource)?.id}
          initialDuration={10}
          waitingListEntry={confirmWaitingEntry}
          onBooked={() => removeWaitingEntry(confirmWaitingEntry.id)}
          onClose={() => setConfirmWaitingEntry(null)}
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
      {lastVisitModalAppt && (
        <div className="charm-dialog-backdrop" onClick={() => setLastVisitModalAppt(null)}>
          <div className="charm-dialog-box" style={{ width: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="charm-dialog-head">
              <div>
                <h3>Last Visit</h3>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  {day(lastVisitModalAppt.start_at)} : {formatDoctorName(staff.find((p: any) => p.id === lastVisitModalAppt.provider_id)?.name || "Dr. Ramasamy S")} : {lastVisitModalAppt.visit_type || "Follow-up Visit"}
                </div>
              </div>
              <button type="button" className="charm-dialog-close-btn" onClick={() => setLastVisitModalAppt(null)}>✕</button>
            </div>
            <div className="charm-dialog-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", paddingBottom: 14, borderBottom: "1px solid #e2e8f0", marginBottom: 14 }}>
                <div><span style={{ color: "#64748b" }}>Patient:</span> <strong>{patientName(lastVisitModalAppt.patient_id, patients)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Provider:</span> <strong>{formatDoctorName(staff.find((p: any) => p.id === lastVisitModalAppt.provider_id)?.name || "Dr. Ramasamy S")}</strong></div>
                <div><span style={{ color: "#64748b" }}>Age:</span> <strong>{patients.find((p: any) => p.id === lastVisitModalAppt.patient_id)?.age || "68"}</strong></div>
                <div><span style={{ color: "#64748b" }}>Date:</span> <strong>{day(lastVisitModalAppt.start_at)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Chart Type:</span> <strong>SOAP</strong></div>
                <div><span style={{ color: "#64748b" }}>Signed by:</span> <strong>{formatDoctorName(staff.find((p: any) => p.id === lastVisitModalAppt.provider_id)?.name || "Dr. Ramasamy S")}</strong></div>
                <div><span style={{ color: "#64748b" }}>Facility:</span> <strong>Heal Your Heart Neelankarai</strong></div>
                <div><span style={{ color: "#64748b" }}>Visit Type:</span> <strong>{lastVisitModalAppt.visit_type || "Follow-up Visit"}</strong></div>
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#0f172a" }}>Subjective</h4>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#334155" }}>
                <p><strong>Chief Complaints:</strong> Post EECP follow up visit. Patient reports continuous improvements in stamina and no exertional chest discomfort.</p>
                <p><strong>Cardiac Complaints:</strong> Walking distance without chest pain: 45-60 mins. Walking everyday: 30-40 mins. Shortness of breath: Nil. Chest pain at rest: Nil.</p>
                <p><strong>History of Present Illness:</strong> Blood pressure well managed, patient taking prescribed medication regularly.</p>
              </div>
            </div>
            <div className="charm-dialog-foot">
              <button type="button" className="charm-btn-cancel" onClick={() => setLastVisitModalAppt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {paymentModalAppt && (
        <div className="charm-dialog-backdrop" onClick={() => setPaymentModalAppt(null)}>
          <div className="charm-dialog-box" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="charm-dialog-head">
              <h3>Quick Pay / Balance Collection</h3>
              <button type="button" className="charm-dialog-close-btn" onClick={() => setPaymentModalAppt(null)}>✕</button>
            </div>
            <div className="charm-dialog-body">
              <div style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 6, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{patientName(paymentModalAppt.patient_id, patients)}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Date: {day(paymentModalAppt.start_at)} | Token #{paymentModalAppt.token_number || "-"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Balance Due (Rs.)</label>
                  <input type="text" readOnly value="0.00" style={{ width: "100%", padding: "6px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 4, fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Amount to Collect (Rs.) *</label>
                  <input type="number" defaultValue="500.00" style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Payment Mode *</label>
                  <select defaultValue="UPI" style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Receipt / Reference Note</label>
                  <input type="text" placeholder="Optional transaction ID or receipt note" style={{ width: "100%", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
                </div>
              </div>
            </div>
            <div className="charm-dialog-foot">
              <button type="button" className="charm-btn-cancel" onClick={() => setPaymentModalAppt(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  notify("Payment recorded successfully.");
                  setPaymentModalAppt(null);
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
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
