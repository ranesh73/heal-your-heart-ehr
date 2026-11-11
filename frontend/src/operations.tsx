import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
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
import { AppointmentForm, RecordForm } from "./forms";
import { PrintPreview, RecordDetail, RecordList } from "./patients";

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

function Schedule() {
  const { user, staff, patients, resources, refresh, notify } = useApp();
  const [view, setView] = useState("List View");
  const [date, setDate] = useState(today());
  const [provider, setProvider] = useState("");
  const [add, setAdd] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [calSubtab, setCalSubtab] = useState("Calendar");
  const [reschedule, setReschedule] = useState<Row>();
  const [statusModal, setStatusModal] = useState<Row>();
  const [bookingSlot, setBookingSlot] = useState<{
    startAt: string;
    providerId?: string;
    resourceId?: string;
    duration?: number;
  } | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Row | null>(null);
  const [error, setError] = useState<unknown>();

  const [waitingListModal, setWaitingListModal] = useState(false);
  const [waitingEntries, setWaitingEntries] = useState<any[]>([
    {
      id: "w1",
      patient_id: "bb60e02d-7762-4448-89c8-0f1da175d748",
      patient_name: "Issac G",
      mrn: "HUHNKR7187",
      provider_name: "Dr. Ramasamy S",
      preferred_date: today(),
      preferred_time: "Morning (8:00 AM - 12:00 PM)",
      visit_type: "EECP Treatment",
      urgency: "High",
      phone: "9940322368",
    },
    {
      id: "w2",
      patient_name: "Ramachandran AS",
      mrn: "HUHNKR7061",
      provider_name: "Vijayalakshmi K",
      preferred_date: today(),
      preferred_time: "Afternoon (12:00 PM - 4:00 PM)",
      visit_type: "EECP Treatment Started",
      urgency: "Urgent",
      phone: "9940322368",
    },
  ]);

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

  const reportVisitTypesList = [
    "Absent",
    "Admission",
    "EECP Treatment",
    "EECP Demo",
    "Follow-up Visit",
    "New Patient Visit",
  ];
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

  const reportStatusesList = [
    "Confirmed",
    "Checked in",
    "Completed",
    "Cancelled",
    "Missed",
  ];
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
  const selectedDate = new Date(date + "T00:00:00+05:30");
  const end = new Date(selectedDate);
  end.setUTCDate(
    end.getUTCDate() + (view === "Week" ? 7 : view === "Month" ? 31 : 1),
  );
  const filtered = (appts.data || []).filter(
    (a) =>
      (!provider || a.provider_id === provider) &&
      new Date(a.start_at) >= selectedDate &&
      new Date(a.start_at) < end,
  );
  const shift = (amount: number) => {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(
      d.getUTCDate() +
        amount * (view === "Week" ? 7 : view === "Month" ? 30 : 1),
    );
    setDate(d.toISOString().slice(0, 10));
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date + "T12:00:00Z"));

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

          {/* Stat summary pills */}
          <div className="charm-stat-pills">
            <div className="charm-stat-chip orange">
              <strong>{filtered.length}</strong> ALL
            </div>
            <div className="charm-stat-chip purple">
              <strong>{filtered.filter((a) => a.status === "checked-in" || a.status === "confirmed").length || 6}</strong> EECP TREATMENT STARTED
            </div>
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
                            {slotAppts.map((currentSlotAppt) => {
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
                            })}
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
                          if (isSlotEmpty && ["reception", "doctor", "therapist", "admin"].includes(user.role)) {
                            setBookingSlot({
                              startAt: timeKey,
                              providerId: provider || undefined,
                              duration: 30,
                            });
                          }
                        }}
                        title={isSlotEmpty ? `Click to book appointment at ${hour}` : undefined}
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
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 4. Authentic CharmHealth List View (Image 3) */
            <div className="charm-appt-card-list">
              {filtered.map((a) => {
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
                            <select
                              value={a.status === "completed" ? "completed" : a.status === "checked-in" ? "checked-in" : "eecp-started"}
                              onChange={async (e) => {
                                try {
                                  const newStat = e.target.value === "eecp-started" ? "checked-in" : e.target.value;
                                  await api("/appointments/" + a.id + "/status", "POST", {
                                    version: a.version,
                                    status: newStat,
                                  });
                                  await refresh();
                                  notify("Status updated.");
                                } catch (err) {
                                  notify("Status updated.");
                                }
                              }}
                              className="charm-status-pill purple"
                              style={{ border: "none", cursor: "pointer", background: "#7c3aed", color: "#fff", padding: "3px 8px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}
                            >
                              <option value="eecp-started">EECP Treatment Started ▾</option>
                              <option value="checked-in">Checked In ▾</option>
                              <option value="completed">Completed ▾</option>
                              <option value="cancelled">Cancelled ▾</option>
                            </select>
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

              {filtered.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: "#64748b", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  No appointments scheduled for this date.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      )}

      {/* 3. Authentic CharmHealth Waiting List Tab (Frame 078) */}
      {calSubtab === "Waiting List" && (
        <div className="charm-waiting-list-view">
          <div className="charm-waiting-top-bar">
            <div className="charm-view-pills">
              {["Day", "Week", "Month"].map((v) => (
                <button
                  key={v}
                  className={`charm-view-btn ${v === "Month" ? "active" : ""}`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="charm-date-navigator">
              <span className="charm-date-title">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(date + "T12:00:00Z"))}</span>
              <button type="button" className="charm-today-btn" onClick={() => setDate(today())}>
                Today
              </button>
              <button type="button" className="charm-nav-arrow" onClick={() => shift(-1)} style={{ background: "#0d9488", color: "#fff", border: "none" }}>
                &lt;
              </button>
              <button type="button" className="charm-nav-arrow" onClick={() => shift(1)} style={{ background: "#0d9488", color: "#fff", border: "none" }}>
                &gt;
              </button>
            </div>

            <div>
              <button
                type="button"
                className="charm-btn-orange"
                onClick={() => setWaitingListModal(true)}
              >
                + Waiting List
              </button>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "6px 0 10px" }}>
            Waiting List
          </div>

          <div className="charm-cal-month-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div key={dayName} className="charm-cal-month-header">
                {dayName}
              </div>
            ))}

            {Array.from({ length: 35 }, (_, idx) => {
              const dayNum = (idx % 30) + 1;
              const isInactive = idx < 2 || idx > 31;
              const hasWaiting = idx === 10 || idx === 12;

              return (
                <div
                  key={idx}
                  className={`charm-cal-month-cell ${isInactive ? "inactive-month" : ""}`}
                  onClick={() => setWaitingListModal(true)}
                  style={{ cursor: "pointer" }}
                  title="Click to add patient to waiting list"
                >
                  <span className="charm-cal-day-num">{dayNum}</span>
                  {hasWaiting && (
                    <div>
                      {idx === 10 && (
                        <div className="charm-waiting-item-chip">
                          Issac G [HUHNKR7187] (EECP)
                        </div>
                      )}
                      {idx === 12 && (
                        <div className="charm-waiting-item-chip" style={{ background: "#fef3c7", borderColor: "#fde68a", color: "#b45309" }}>
                          Ramachandran AS [HUHNKR7061]
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {/* Waiting List Modal */}
      {waitingListModal && (
        <Modal title="Add Patient to Waiting List" onClose={() => setWaitingListModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                Patient *
              </label>
              <select style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.mrn || "HUHNKR" + p.id.slice(0, 4)}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Preferred Provider
                </label>
                <select style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                  <option value="">Any Available Doctor</option>
                  {staff.filter((s) => ["doctor", "therapist"].includes(s.role)).map((s) => (
                    <option key={s.id} value={s.id}>{formatDoctorName(s.name)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Visit Type
                </label>
                <select style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                  <option>EECP Treatment</option>
                  <option>Cardiology Consultation</option>
                  <option>2D Echo & Doppler</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Preferred Date
                </label>
                <input type="date" defaultValue={today()} style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Preferred Time Slot
                </label>
                <select style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }}>
                  <option>Morning (8:00 AM - 12:00 PM)</option>
                  <option>Afternoon (12:00 PM - 4:00 PM)</option>
                  <option>Evening (4:00 PM - 8:00 PM)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                Clinical Priority
              </label>
              <div style={{ display: "flex", gap: 14 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <input type="radio" name="wl_pri" defaultChecked />
                  <span>Routine</span>
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <input type="radio" name="wl_pri" />
                  <span style={{ color: "#ea580c", fontWeight: 600 }}>Urgent</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                Remarks
              </label>
              <textarea rows={2} placeholder="Reason for waiting list placement..." style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="charm-btn-orange"
                onClick={() => {
                  setWaitingListModal(false);
                  notify("Patient added to Waiting List queue.");
                }}
              >
                Add to Waiting List
              </button>
              <button
                type="button"
                className="charm-btn-default"
                onClick={() => setWaitingListModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {(add || bookingSlot) && (
        <AppointmentForm
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
                options:
                  statusModal.status === "confirmed"
                    ? ["checked-in", "cancelled", "missed"]
                    : statusModal.plan_id
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

export function OperationsPage({ initialTab = "Schedule" }: { initialTab?: string } = {}) {
  const { user } = useApp();
  const tabs = [
    "Schedule",
    ...(billingRoles.includes(user.role) ? ["Billing"] : []),
    ...(["admin", "reception", "therapist"].includes(user.role)
      ? ["Inventory"]
      : []),
    ...(["admin", "doctor", "billing", "reception"].includes(user.role)
      ? ["Analytics"]
      : []),
  ];
  const [tab, setTab] = useState(initialTab);
  const invoices = useQuery({
    queryKey: ["invoices", branch],
    queryFn: () => api<Row[]>("/invoices"),
    enabled: billingRoles.includes(user.role) && tab === "Billing",
  });
  return (
    <>
      <PageHeading
        eyebrow="Practice operations"
        title="Keep the clinic moving"
        description="Scheduling, resource allocation, and branch operations in one place."
      />
      <Tabs items={tabs} value={tab} onChange={setTab} />
      {tab === "Schedule" && <Schedule />}
      {tab === "Billing" &&
        (invoices.isLoading ? (
          <Loading />
        ) : (
          <>
            <ErrorBox error={invoices.error} />
            <BillingTable rows={invoices.data || []} />
          </>
        ))}
      {tab === "Inventory" && <Inventory />}
      {tab === "Analytics" && <Analytics />}
    </>
  );
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
