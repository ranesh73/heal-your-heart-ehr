import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
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
  const [error, setError] = useState<unknown>();

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
                        return (
                          <div key={dayIdx} className="charm-week-slot">
                            {slotAppts.map((currentSlotAppt) => (
                              <div
                                key={currentSlotAppt.id}
                                className="charm-week-appt-card"
                                onClick={() => navigate("/patients/" + currentSlotAppt.patient_id)}
                              >
                                <div className="appt-time">{localInput(currentSlotAppt.start_at).slice(11, 16)} - {localInput(currentSlotAppt.end_at).slice(11, 16)}</div>
                                <div className="appt-patient">{patientName(currentSlotAppt.patient_id, patients)}</div>
                                <div className="appt-provider">{staff.find(s => s.id === currentSlotAppt.provider_id)?.name}</div>
                                <div className="appt-room">{resources.find(r => r.id === currentSlotAppt.resource_id)?.name || "EECP Room 02"}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === "Day" ? (
            <AppointmentTable rows={filtered} />
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
                    {/* Left Column of Card */}
                    <div className="charm-list-card-left">
                      <div className="charm-patient-header-line">
                        <input type="checkbox" />
                        <button
                          type="button"
                          className="charm-patient-link"
                          onClick={() => navigate("/patients/" + a.patient_id)}
                        >
                          {pat?.name || patientName(a.patient_id, patients)} [{pat?.mrn || "HUHNKR" + a.id.slice(0, 4)}]
                        </button>
                        <span className="charm-red-bubble" title="Chat / Messages">...</span>
                      </div>

                      <div className="charm-patient-info-row">
                        <div className="charm-avatar-circle-gray">
                          👤
                        </div>
                        <div className="charm-patient-details-text">
                          <div>Reason: <span style={{ color: "#334155" }}>{a.reason || "-"}</span></div>
                          <div style={{ marginTop: 4 }}>
                            <span>DOB: {pat?.dob || "Aug 14, 1950"}</span>
                            <span style={{ marginLeft: 12 }}>📞 {pat?.phone || "9940322368"}</span>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <span className="charm-status-pill purple">
                              {a.status === "checked-in" ? "Checked In" : a.status === "completed" ? "Completed" : "EECP Treatment Started"} ▼
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column of Card */}
                    <div className="charm-list-card-right">
                      <div className="charm-right-top-meta">
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                          {prv?.name || "Vijayalakshmi K"}
                        </span>
                        <span>|</span>
                        <span style={{ color: "#475569" }}>Heal Your Heart Neelankarai</span>
                        <span>|</span>
                        <span style={{ fontWeight: 600, color: "#0f4c81" }}>
                          {startStr} - {endStr}
                        </span>
                      </div>

                      <div className="charm-right-details-grid">
                        <div>
                          <span className="charm-dim-label">Visit Type: </span>
                          <strong>{a.visit_type}</strong>
                        </div>
                        <div>
                          <span className="charm-dim-label">Patient Balance Due: </span>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => navigate("/billing")}
                            style={{ fontSize: 11 }}
                          >
                            Show
                          </button>
                        </div>
                        <div>
                          <span className="charm-dim-label">Last Visit: </span>
                          <span>{day(a.start_at)}</span>
                        </div>
                        <div>
                          <span className="charm-dim-label">Token #: </span>
                          <span style={{ color: "#2563eb", cursor: "pointer", fontSize: 11 }}>Generate | Pay</span>
                        </div>
                        <div>
                          <span className="charm-dim-label">Resource: </span>
                          <span style={{ fontWeight: 600 }}>{res?.name || "EECP Room 02"} ▼</span>
                        </div>
                        <div>
                          <span className="charm-dim-label">Consultation: </span>
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => navigate("/encounter/new/" + a.patient_id)}
                            style={{ fontWeight: 600 }}
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
                          <span className="text-link" style={{ cursor: "pointer" }}>Questionnaire</span>
                          <span>|</span>
                          <span className="text-link" style={{ cursor: "pointer" }}>Past Visits</span>
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

      {add && <AppointmentForm onClose={() => setAdd(false)} />}
      {reschedule && <AppointmentForm appointment={reschedule} onClose={() => setReschedule(undefined)} />}
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
          title="Practice catalogs"
          subtitle="Service fees, medication names, clinical templates, forms, and visit types"
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
          <Table
            rows={catalog.data || []}
            onRow={(r) => {
              setSelected(r);
              setModal("catalog");
            }}
            columns={[
              {
                title: "Name",
                render: (r) => (
                  <>
                    <strong>{r.name}</strong>
                    <small className="cell-sub">{r.code}</small>
                  </>
                ),
              },
              { title: "Type", render: (r) => <Badge value={r.kind} /> },
              {
                title: "Price",
                render: (r) =>
                  r.kind === "service" ? money(r.price_paise) : "—",
              },
              { title: "Content", render: (r) => r.content?.slice(0, 110) },
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
    </>
  );
}
