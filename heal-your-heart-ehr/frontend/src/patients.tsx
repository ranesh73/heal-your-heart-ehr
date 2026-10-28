import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  FileText,
  HeartPulse,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  api,
  branch,
  Row,
  Field,
  day,
  dateTime,
  download,
  navigate,
  patientName,
  label,
  today,
} from "./api";
import { useApp, clinicalRoles, billingRoles } from "./context";
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
import { PatientForm, AppointmentForm, RecordForm, UploadForm } from "./forms";
import { EECPPatient } from "./eecp";
import { BillingTable, AppointmentTable } from "./operations";

export function PatientsPage() {
  const { user } = useApp();
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [add, setAdd] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["directory", branch, q, offset],
    queryFn: () =>
      api(
        "/patients?limit=25&offset=" + offset + "&q=" + encodeURIComponent(q),
      ),
  });
  return (
    <>
      <PageHeading
        eyebrow="Patient workspace"
        title="Patients"
        description="Find a patient. Pick up their care where it left off."
        actions={
          ["reception", "doctor", "admin"].includes(user.role) && (
            <AddButton onClick={() => setAdd(true)}>Register patient</AddButton>
          )
        }
      />
      <Panel>
        <div className="toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search patient directory"
              placeholder="Search name, medical record number or phone"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <span className="muted">
            {data?.total ?? 0} patients · current branch
          </span>
        </div>
        {isLoading ? (
          <Loading />
        ) : (
          <Table
            rows={data?.items || []}
            onRow={(p) => navigate("/patients/" + p.id)}
            columns={[
              {
                title: "Patient",
                render: (p) => (
                  <div className="patient-cell">
                    <span className="avatar">
                      {p.first_name[0]}
                      {p.last_name[0]}
                    </span>
                    <span>
                      <button
                        className="text-link"
                        onClick={() => navigate("/patients/" + p.id)}
                      >
                        {p.name}
                      </button>
                      <small className="cell-sub">
                        {p.sex} ·{" "}
                        {new Date().getFullYear() - Number(p.dob.slice(0, 4))}{" "}
                        years (approx.)
                      </small>
                    </span>
                  </div>
                ),
              },
              {
                title: "Medical record",
                render: (p) => <span className="mono">{p.mrn}</span>,
              },
              { title: "Date of birth", render: (p) => day(p.dob) },
              {
                title: "Contact",
                render: (p) => p.phone || p.email || "Not recorded",
              },
              {
                title: "Status",
                render: (p) => (
                  <Badge value={p.active ? "active" : "inactive"} />
                ),
              },
            ]}
            empty="No matching patients"
          />
        )}
        <ErrorBox error={error} />
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={!offset}
            onClick={() => setOffset(Math.max(0, offset - 25))}
          >
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + 25, data?.total || 0)} of{" "}
            {data?.total || 0}
          </span>
          <Button
            variant="secondary"
            disabled={offset + 25 >= (data?.total || 0)}
            onClick={() => setOffset(offset + 25)}
          >
            Next
          </Button>
        </div>
      </Panel>
      {add && (
        <PatientForm
          onClose={() => setAdd(false)}
          onSaved={(p) => {
            setAdd(false);
            navigate("/patients/" + p.id);
          }}
        />
      )}
    </>
  );
}

export function PatientHeader({ p, chart }: { p: Row; chart: Row }) {
  const { staff, facilities } = useApp();
  const age = (() => {
    const d = new Date(p.dob),
      n = new Date();
    return (
      n.getFullYear() -
      d.getFullYear() -
      (n.getMonth() < d.getMonth() ||
      (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())
        ? 1
        : 0)
    );
  })();
  const next = (chart.appointments || [])
    .filter(
      (a: Row) => new Date(a.start_at) > new Date() && a.status === "confirmed",
    )
    .sort((a: Row, b: Row) => a.start_at.localeCompare(b.start_at))[0];
  const last = (chart.appointments || [])
    .filter((a: Row) => a.status === "completed")
    .sort((a: Row, b: Row) => b.start_at.localeCompare(a.start_at))[0];
  return (
    <div className="patient-header">
      <span className="avatar large">
        {p.first_name[0]}
        {p.last_name[0]}
      </span>
      <div className="patient-identity">
        <h1>
          {p.name}
          <Badge value="Synthetic record" />
        </h1>
        <p>
          <span className="mono">{p.mrn}</span>
          <span>•</span>
          {age} years · {p.sex}
          <span>•</span>
          {facilities
            .find((f) => f.id === p.primary_facility_id)
            ?.name.replace("Heal Your Heart · ", "") || "Primary branch"}
        </p>
        <small>
          {staff.find((s) => s.id === p.provider_id)?.name ||
            "No assigned clinician"}{" "}
          · Last visit: {last ? day(last.start_at) : "—"} · Next:{" "}
          {next ? dateTime(next.start_at) : "—"}
        </small>
      </div>
      {chart.allergies && (
        <div className="allergy-summary">
          <span className="eyebrow">ALLERGY REVIEW</span>
          {chart.allergies
            .filter((a: Row) => a.status === "active")
            .map((a: Row) => (
              <strong key={a.id}>{a.allergen}</strong>
            ))}
          {!chart.allergies.length && <strong>Not recorded — verify</strong>}
        </div>
      )}
    </div>
  );
}

function VitalsSummary({ rows }: { rows: Row[] }) {
  const latest = rows[0];
  if (!latest)
    return (
      <Empty
        title="No vitals recorded"
        body="Add observations to establish the baseline."
      />
    );
  const metrics = [
    [
      "Blood pressure",
      latest.bp_sys && latest.bp_dia
        ? `${latest.bp_sys}/${latest.bp_dia}`
        : "—",
      "mmHg",
    ],
    ["Heart rate", latest.pulse_bpm ?? "—", "bpm"],
    ["SpO₂", latest.spo2_pct ?? "—", "%"],
    ["Weight", latest.weight_kg ?? "—", "kg"],
  ];
  const bp = rows
    .filter((r) => r.bp_sys != null)
    .slice(0, 8)
    .reverse();
  return (
    <>
      <div className="vital-grid">
        {metrics.map(([k, v, u]) => (
          <div key={k}>
            <small>{k}</small>
            <strong>
              {v}
              <em>{u}</em>
            </strong>
          </div>
        ))}
      </div>
      <div className="vitals-bottom">
        <span>Recorded {dateTime(latest.created_at)}</span>
        {bp.length > 1 && (
          <svg
            width="170"
            height="45"
            viewBox="0 0 170 45"
            role="img"
            aria-label="Recent systolic blood pressure trend"
          >
            <polyline
              fill="none"
              stroke="#217878"
              strokeWidth="2"
              points={bp
                .map(
                  (r, i) =>
                    `${5 + (i * 160) / (bp.length - 1)},${40 - ((r.bp_sys - Math.min(...bp.map((x) => x.bp_sys))) / (Math.max(...bp.map((x) => x.bp_sys)) - Math.min(...bp.map((x) => x.bp_sys)) || 1)) * 35}`,
                )
                .join(" ")}
            />
          </svg>
        )}
      </div>
    </>
  );
}

export function PatientChart({ id }: { id: string }) {
  const { user, staff, refresh, notify } = useApp();
  const [tab, setTab] = useState("Overview");
  const [recordTab, setRecordTab] = useState("Vitals");
  const [modal, setModal] = useState("");
  const [selected, setSelected] = useState<Row>();
  const [error, setError] = useState<unknown>();
  const {
    data: chart,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["chart", branch, id],
    queryFn: () => api("/patients/" + id),
  });
  useEffect(() => {
    setTab("Overview");
    setModal("");
  }, [id]);
  if (isLoading) return <Loading />;
  if (queryError || !chart) return <ErrorBox error={queryError} />;
  const clinical = clinicalRoles.includes(user.role);
  const p = chart.patient;
  const tabs = [
    "Overview",
    ...(clinical
      ? ["Consultations", "Medical Records", "EECP Treatment"]
      : user.role === "reception"
        ? ["EECP Treatment"]
        : []),
    "Appointments",
    ...(billingRoles.includes(user.role) ? ["Billing"] : []),
    "More",
  ];
  const createEncounter = async () => {
    setError(undefined);
    try {
      const r = await api("/encounters", "POST", {
        patient_id: id,
        provider_id: user.id,
        assistant_id: staff.find((s) => s.role === "assistant")?.id || null,
        visit_type: "Cardiology consultation",
      });
      await refresh();
      navigate("/encounter/" + r.id + "/" + id);
    } catch (e) {
      setError(e);
    }
  };
  const assistantEncounter = (chart.encounters || []).find(
    (e: Row) => e.status === "draft" && e.assistant_id === user.id,
  )?.id;
  const recordTypes: Record<string, string> = {
    History: "history",
    Diagnoses: "diagnoses",
    Allergies: "allergies",
    Prescriptions: "medications",
    Vitals: "vitals",
    "Orders & Results": "orders",
    Documents: "documents",
  };
  const writable = (kind: string) =>
    (
      ({
        history: ["doctor", "assistant"],
        diagnoses: ["doctor"],
        allergies: ["doctor", "assistant"],
        medications: ["doctor"],
        vitals: ["doctor", "assistant", "therapist"],
        orders: ["doctor"],
        documents: clinicalRoles,
      })[kind] || []
    ).includes(user.role);
  return (
    <>
      <button className="back-link" onClick={() => navigate("/patients")}>
        <ArrowLeft size={15} />
        Patient directory
      </button>
      <PatientHeader p={p} chart={chart} />
      <div className="chart-actions">
        {user.role === "doctor" && (
          <Button onClick={createEncounter}>
            <StethoscopeIcon />
            Start consultation
          </Button>
        )}
        {["doctor", "assistant", "therapist"].includes(user.role) && (
          <Button variant="secondary" onClick={() => setModal("vitals")}>
            <Activity size={15} />
            Record vitals
          </Button>
        )}
        {["reception", "doctor", "therapist", "admin"].includes(user.role) && (
          <Button variant="secondary" onClick={() => setModal("appointment")}>
            <CalendarDays size={15} />
            Book appointment
          </Button>
        )}
        {clinical && (
          <Button variant="secondary" onClick={() => setModal("documents")}>
            <Upload size={15} />
            Add document
          </Button>
        )}
        {["reception", "doctor", "admin"].includes(user.role) && (
          <Button variant="ghost" onClick={() => setModal("edit")}>
            Edit demographics
          </Button>
        )}
        <span className="muted small push-right">
          Chart scope: current branch
        </span>
      </div>
      <ErrorBox error={error} />
      <Tabs items={tabs} value={tab} onChange={setTab} />
      {tab === "Overview" && (
        <div className="chart-grid">
          <div className="chart-main">
            {clinical && (
              <>
                <Panel
                  title="Latest observations"
                  actions={
                    writable("vitals") && (
                      <Button
                        variant="ghost"
                        onClick={() => setModal("vitals")}
                      >
                        Record vitals
                        <Plus size={15} />
                      </Button>
                    )
                  }
                >
                  <VitalsSummary rows={chart.vitals} />
                </Panel>
                <Panel
                  title="Clinical summary"
                  subtitle="Active conditions and documented history"
                >
                  <div className="summary-body">
                    <h3>Active diagnoses</h3>
                    {chart.diagnoses
                      .filter((x: Row) => x.status === "active")
                      .map((r: Row) => (
                        <p key={r.id}>
                          <Badge value={r.code || "Clinical"} /> {r.description}
                        </p>
                      ))}
                    {!chart.diagnoses.length && (
                      <p className="muted">No diagnoses recorded.</p>
                    )}
                    <h3>Current medication records</h3>
                    {chart.medications
                      .filter((x: Row) => x.status !== "discontinued")
                      .map((r: Row) => (
                        <p key={r.id}>
                          {r.trade_name} · {r.dose} · {r.maen}{" "}
                          <Badge value={r.status} />
                        </p>
                      ))}
                    {!chart.medications.length && (
                      <p className="muted">No prescriptions recorded.</p>
                    )}
                    <h3>Relevant history</h3>
                    {chart.history.slice(0, 3).map((r: Row) => (
                      <p key={r.id}>
                        <strong>{r.category}</strong> · {r.content}
                      </p>
                    ))}
                  </div>
                </Panel>
                <Panel title="Recent consultations">
                  <Table
                    rows={chart.encounters.slice(0, 5)}
                    onRow={(e) => navigate("/encounter/" + e.id + "/" + id)}
                    columns={[
                      {
                        title: "Visit",
                        render: (e) => (
                          <>
                            <strong>{e.visit_type}</strong>
                            <small className="cell-sub">
                              {dateTime(e.created_at)}
                            </small>
                          </>
                        ),
                      },
                      {
                        title: "Status",
                        render: (e) => <Badge value={e.status} />,
                      },
                    ]}
                    empty="No consultations yet"
                  />
                </Panel>
              </>
            )}
            {!clinical && (
              <Panel title="Patient details">
                <div className="summary-body">
                  <dl className="details">
                    <dt>Email</dt>
                    <dd>{p.email || "—"}</dd>
                    <dt>Phone</dt>
                    <dd>{p.phone || "—"}</dd>
                    <dt>Address</dt>
                    <dd>
                      {[p.address, p.area, p.city, p.state, p.postal_code]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </dd>
                    <dt>Emergency contact</dt>
                    <dd>
                      {p.emergency_name || "—"} {p.emergency_phone}
                    </dd>
                    <dt>Residency</dt>
                    <dd>{p.residency}</dd>
                  </dl>
                </div>
              </Panel>
            )}
          </div>
          <div className="side-stack">
            {chart.plans && (
              <Panel title="EECP care plan">
                {chart.plans.length ? (
                  chart.plans.map((plan: Row) => (
                    <div className="plan-summary" key={plan.id}>
                      <div>
                        <Activity size={20} />
                        <Badge value={plan.status} />
                      </div>
                      <h3>{plan.program}</h3>
                      <strong>
                        {plan.completed}
                        <small> / {plan.session_count} sessions</small>
                      </strong>
                      <progress
                        max={plan.session_count}
                        value={plan.completed}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => setTab("EECP Treatment")}
                      >
                        View treatment
                        <ArrowUpRight size={15} />
                      </Button>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="No EECP plan"
                    body="Enrollment appears here when a treatment plan is created."
                  />
                )}
              </Panel>
            )}
            <Panel title="Patient timeline">
              <div className="timeline">
                {[
                  ...(chart.encounters || []).map((e: Row) => ({
                    ...e,
                    type: "Consultation",
                    title: e.visit_type,
                  })),
                  ...chart.appointments.map((a: Row) => ({
                    ...a,
                    type: "Appointment",
                    title: a.visit_type,
                  })),
                  ...(chart.documents || []).map((d: Row) => ({
                    ...d,
                    type: "Document",
                  })),
                ]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 8)
                  .map((r: Row) => (
                    <div key={r.id}>
                      <span className="timeline-dot" />
                      <small>
                        {day(r.created_at)} · {r.type}
                      </small>
                      <strong>{r.title}</strong>
                    </div>
                  ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
      {tab === "Consultations" && (
        <Panel
          title="Consultation history"
          actions={
            user.role === "doctor" && (
              <AddButton onClick={createEncounter}>New consultation</AddButton>
            )
          }
        >
          <Table
            rows={chart.encounters}
            onRow={(e) => navigate("/encounter/" + e.id + "/" + id)}
            columns={[
              {
                title: "Encounter",
                render: (e) => (
                  <>
                    <strong>{e.visit_type}</strong>
                    <small className="cell-sub">{dateTime(e.created_at)}</small>
                  </>
                ),
              },
              {
                title: "Clinician",
                render: (e) => staff.find((s) => s.id === e.provider_id)?.name,
              },
              {
                title: "Chief complaint",
                render: (e) => e.chief_complaint || "Draft not yet documented",
              },
              { title: "Status", render: (e) => <Badge value={e.status} /> },
            ]}
          />
        </Panel>
      )}
      {tab === "Medical Records" && (
        <>
          <Tabs
            items={Object.keys(recordTypes)}
            value={recordTab}
            onChange={setRecordTab}
          />
          <Panel
            title={recordTab}
            actions={
              writable(recordTypes[recordTab]) && (
                <AddButton onClick={() => setModal(recordTypes[recordTab])}>
                  {recordTab === "Documents" ? "Upload document" : "Add record"}
                </AddButton>
              )
            }
          >
            <RecordList
              kind={recordTypes[recordTab]}
              rows={chart[recordTypes[recordTab]] || []}
              onSelect={(r) => {
                setSelected(r);
                setModal("detail");
              }}
            />
          </Panel>
        </>
      )}
      {tab === "EECP Treatment" && <EECPPatient patientId={id} chart={chart} />}
      {tab === "Appointments" && (
        <Panel
          title="Patient appointments"
          actions={
            ["reception", "doctor", "therapist", "admin"].includes(
              user.role,
            ) && (
              <AddButton onClick={() => setModal("appointment")}>
                Book appointment
              </AddButton>
            )
          }
        >
          <AppointmentTable rows={chart.appointments} />
        </Panel>
      )}
      {tab === "Billing" && (
        <BillingTable patientId={id} rows={chart.invoices || []} />
      )}
      {tab === "More" && (
        <div className="two-col">
          <Panel
            title="Tasks, recalls & waiting list"
            actions={
              <Button variant="ghost" onClick={() => setModal("tasks")}>
                <Plus size={15} />
                Add
              </Button>
            }
          >
            <RecordList
              kind="tasks"
              rows={chart.tasks}
              onSelect={(r) => {
                setSelected(r);
                setModal("task-detail");
              }}
            />
          </Panel>
          {clinical && (
            <Panel
              title="Alerts, questionnaires & additional records"
              actions={
                ["doctor", "assistant", "therapist"].includes(user.role) && (
                  <Button variant="ghost" onClick={() => setModal("entries")}>
                    <Plus size={15} />
                    Add
                  </Button>
                )
              }
            >
              <RecordList
                kind="entries"
                rows={chart.entries || []}
                onSelect={(r) => {
                  setSelected(r);
                  setModal("entry-detail");
                }}
              />
            </Panel>
          )}
          <Panel
            title="Internal patient communication"
            actions={
              <Button variant="ghost" onClick={() => setModal("messages")}>
                <Plus size={15} />
                Compose
              </Button>
            }
          >
            <RecordList
              kind="messages"
              rows={chart.messages || []}
              onSelect={(r) => {
                setSelected(r);
                setModal("message-detail");
              }}
            />
          </Panel>
        </div>
      )}
      {modal === "edit" && (
        <PatientForm
          patient={p}
          onClose={() => setModal("")}
          onSaved={() => setModal("")}
        />
      )}
      {modal === "appointment" && (
        <AppointmentForm patientId={id} onClose={() => setModal("")} />
      )}
      {modal === "documents" && (
        <UploadForm patientId={id} onClose={() => setModal("")} />
      )}
      {[
        "history",
        "diagnoses",
        "allergies",
        "medications",
        "vitals",
        "orders",
        "tasks",
        "entries",
        "messages",
      ].includes(modal) && (
        <RecordForm
          kind={modal}
          patientId={id}
          encounterId={
            user.role === "assistant" && modal === "vitals"
              ? assistantEncounter
              : undefined
          }
          onClose={() => setModal("")}
        />
      )}
      {modal === "detail" && selected && (
        <RecordDetail
          kind={recordTypes[recordTab]}
          row={selected}
          onClose={() => setModal("")}
        />
      )}
      {["task-detail", "entry-detail", "message-detail"].includes(modal) &&
        selected && (
          <RecordDetail
            kind={
              modal === "task-detail"
                ? "tasks"
                : modal === "entry-detail"
                  ? "entries"
                  : "messages"
            }
            row={selected}
            onClose={() => setModal("")}
          />
        )}
    </>
  );
}

function StethoscopeIcon() {
  return <HeartPulse size={16} />;
}

export function RecordList({
  kind,
  rows,
  onSelect,
}: {
  kind: string;
  rows: Row[];
  onSelect: (r: Row) => void;
}) {
  const { metadata } = useApp();
  const title = (r: Row) =>
    r.title ||
    r.name ||
    r.trade_name ||
    r.description ||
    r.allergen ||
    r.subject ||
    r.category ||
    (kind === "vitals"
      ? `${r.bp_sys ?? "—"}/${r.bp_dia ?? "—"} mmHg · ${r.pulse_bpm ?? "—"} bpm`
      : kind === "weekly"
        ? "Week " + r.week_number
        : "Record");
  return (
    <Table
      rows={rows}
      onRow={onSelect}
      columns={[
        {
          title: "Record",
          render: (r) => (
            <>
              <strong>{title(r)}</strong>
              <small className="cell-sub">
                {r.generic_name ||
                  r.kind ||
                  r.reaction ||
                  r.content?.slice(0, 90) ||
                  r.instructions?.slice(0, 90) ||
                  ""}
              </small>
            </>
          ),
        },
        { title: "Recorded", render: (r) => dateTime(r.created_at) },
        {
          title: "Status",
          render: (r) => (
            <Badge
              value={r.status || (r.reviewed_at ? "reviewed" : "recorded")}
            />
          ),
        },
      ]}
    />
  );
}

export function RecordDetail({
  kind,
  row,
  onClose,
}: {
  kind: string;
  row: Row;
  onClose: () => void;
}) {
  const { user, metadata, refresh, notify, staff } = useApp();
  const [action, setAction] = useState("");
  const [error, setError] = useState<unknown>();
  const change = async (status: string) => {
    try {
      await api("/records/" + kind + "/" + row.id + "/status", "POST", {
        version: row.version,
        status,
      });
      await refresh();
      notify("Status updated.");
      onClose();
    } catch (e) {
      setError(e);
    }
  };
  const detailFields = metadata.record_fields?.[kind] || [];
  return (
    <Modal
      title={
        row.title ||
        row.name ||
        row.trade_name ||
        row.subject ||
        "Patient record"
      }
      onClose={onClose}
      wide
    >
      <div className="record-detail">
        <p className="muted">
          Recorded {dateTime(row.created_at)} ·{" "}
          {staff.find((s) => s.id === row.author_id)?.name || "Staff"} ·{" "}
          <Badge value={row.status || "recorded"} />
        </p>
        <dl className="details">
          {detailFields
            .filter(
              (f: Field) =>
                row[f.name] !== null &&
                row[f.name] !== "" &&
                row[f.name] !== undefined,
            )
            .map((f: Field) => (
              <div key={f.name}>
                <dt>{f.label}</dt>
                <dd>
                  {typeof row[f.name] === "boolean"
                    ? row[f.name]
                      ? "Yes"
                      : "No"
                    : ["staff"].includes(f.type || "")
                      ? staff.find((s) => s.id === row[f.name])?.name || "Staff"
                      : String(row[f.name])}
                </dd>
              </div>
            ))}
          {kind === "documents" && (
            <>
              <dt>Title</dt>
              <dd>{row.title}</dd>
              <dt>Size</dt>
              <dd>{Math.ceil(row.size / 1024)} KB</dd>
              <dt>SHA-256</dt>
              <dd className="mono break">{row.sha256}</dd>
            </>
          )}
          {row.result && (
            <>
              <dt>Result</dt>
              <dd>{row.result}</dd>
            </>
          )}
          {row.values?.length > 0 && (
            <>
              <dt>Structured results</dt>
              <dd>
                {row.values.map((v: Row) => (
                  <p key={v.id}>
                    {v.parameter}: {v.value} {v.unit} · reference{" "}
                    {v.reference_range || "not supplied"}
                  </p>
                ))}
              </dd>
            </>
          )}
        </dl>
      </div>
      <ErrorBox error={error} />
      <div className="form-footer">
        <div className="actions">
          {kind === "documents" && (
            <Button
              onClick={() =>
                download(
                  "/documents/" + row.id + "/download",
                  row.filename,
                ).catch(setError)
              }
            >
              <Download size={15} />
              Download
            </Button>
          )}
          {kind === "tasks" && (
            <Button
              onClick={() =>
                change(row.status === "completed" ? "pending" : "completed")
              }
            >
              {row.status === "completed" ? "Reopen task" : "Complete task"}
            </Button>
          )}
          {kind === "diagnoses" && user.role === "doctor" && (
            <Button
              onClick={() =>
                change(row.status === "active" ? "resolved" : "active")
              }
            >
              Mark {row.status === "active" ? "resolved" : "active"}
            </Button>
          )}
          {kind === "allergies" &&
            ["doctor", "assistant"].includes(user.role) && (
              <Button
                onClick={() =>
                  change(row.status === "active" ? "inactive" : "active")
                }
              >
                Mark {row.status === "active" ? "inactive" : "active"}
              </Button>
            )}
          {kind === "medications" &&
            user.role === "doctor" &&
            row.status === "draft" && (
              <Button onClick={() => change("discontinued")}>
                Discontinue draft
              </Button>
            )}
          {kind === "medications" && (
            <Button variant="secondary" onClick={() => setAction("print")}>
              <Printer size={15} />
              Print draft prescription
            </Button>
          )}
          {kind === "orders" &&
            ["doctor", "assistant"].includes(user.role) &&
            row.status !== "reviewed" && (
              <Button onClick={() => setAction("result")}>Record result</Button>
            )}
          {kind === "orders" &&
            user.role === "doctor" &&
            row.status === "resulted" && (
              <Button
                onClick={async () => {
                  try {
                    await api("/orders/" + row.id + "/review", "POST", {
                      version: row.version,
                    });
                    await refresh();
                    onClose();
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Review & finalize result
              </Button>
            )}
          {kind === "entries" &&
            ["doctor", "assistant", "therapist"].includes(user.role) && (
              <Button
                onClick={() =>
                  change(row.status === "active" ? "resolved" : "active")
                }
              >
                Mark {row.status === "active" ? "resolved" : "active"}
              </Button>
            )}
        </div>
      </div>
      {action === "result" && (
        <div className="inset-form">
          <DynamicForm
            fields={[
              {
                name: "result",
                label: "Result narrative / interpretation",
                type: "textarea",
                required: true,
              },
              { name: "parameter", label: "Structured parameter (optional)" },
              { name: "value", label: "Value" },
              { name: "unit", label: "Unit" },
              { name: "reference_range", label: "Laboratory reference range" },
            ]}
            initial={{ result: row.result || "" }}
            onSubmit={async (data) => {
              const values = data.parameter
                ? [
                    {
                      parameter: data.parameter,
                      value: data.value || "",
                      unit: data.unit || "",
                      reference_range: data.reference_range || "",
                    },
                  ]
                : [];
              await api("/orders/" + row.id + "/result", "POST", {
                version: row.version,
                result: data.result,
                values,
              });
              await refresh();
              onClose();
            }}
            submit="Save result"
          />
        </div>
      )}
      {action === "print" && (
        <PrintPreview
          title="DRAFT PRESCRIPTION — NOT FOR DISPENSING"
          onClose={() => setAction("")}
        >
          <p>Development record · {dateTime(row.created_at)}</p>
          {detailFields.map((f: Field) => (
            <p key={f.name}>
              <strong>{f.label}: </strong>
              {String(row[f.name] ?? "—")}
            </p>
          ))}
        </PrintPreview>
      )}
    </Modal>
  );
}

const noteFields = [
  ["chief_complaint", "Chief complaint"],
  ["hpi", "History of present illness"],
  ["medical_history", "Past medical history"],
  ["ros", "Review of systems"],
  ["objective", "Objective findings"],
  ["examination", "Physical examination"],
  ["assessment", "Assessment"],
  ["plan", "Care plan"],
  ["follow_up", "Follow-up instructions"],
];
const symptoms = [
  "Chest pain, burning, radiating shoulder or jaw pain",
  "Exertional shortness of breath / chest pain",
  "Difficulty climbing stairs or slopes",
  "Symptoms while bending down",
  "Inability to walk after meals",
  "Swelling in legs",
  "Tiredness / lack of sleep",
  "Recent hospitalization for ACS / LVF",
];
const outcomes = [
  "The patient maintains the benefits.",
  "Mild increase in symptoms compared to post-EECP.",
  "Recurrent symptoms to pre-EECP level.",
  "Symptoms improved beyond post-EECP level.",
  "Major adverse cardiac event.",
];

export function PrintPreview({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal title="Print preview" onClose={onClose} wide>
      <div className="print-sheet">
        <small>HEAL YOUR HEART EHR · DEVELOPMENT</small>
        <h1>{title}</h1>
        {children}
      </div>
      <div className="form-footer">
        <small>Use the browser print dialog to save as PDF.</small>
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          Print / save PDF
        </Button>
      </div>
    </Modal>
  );
}

export function EncounterEditor({
  id,
  patientId,
}: {
  id: string;
  patientId: string;
}) {
  const { user, staff, refresh, notify } = useApp();
  const {
    data: chart,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["chart", branch, patientId],
    queryFn: () => api("/patients/" + patientId),
  });
  const encounter = chart?.encounters?.find((r: Row) => r.id === id);
  const [modal, setModal] = useState("");
  const [saveError, setSaveError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [previous, setPrevious] = useState("");
  const templates = useQuery({
    queryKey: ["templates", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=template"),
  });
  const revisions = useQuery({
    queryKey: ["revisions", branch, id],
    queryFn: () => api<Row[]>("/encounters/" + id + "/history"),
    enabled: modal === "history",
  });
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isDirty },
  } = useForm<Row>();
  useEffect(() => {
    if (encounter) {
      const v: Row = {};
      for (const [key] of noteFields) v[key] = encounter[key] || "";
      for (const key of ["outcome", "cad_year", "cabg", "cag", "ccs_class"])
        v[key] = encounter[key] ?? "";
      symptoms.forEach((name, i) => {
        const row = encounter.symptoms.find((s: Row) => s.name === name);
        v["symptom_" + i] = row?.response || "Not assessed";
        v["narrative_" + i] = row?.narrative || "";
      });
      reset(v);
    }
  }, [encounter?.id, encounter?.version, reset]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", fn);
    return () => removeEventListener("beforeunload", fn);
  }, [isDirty]);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!encounter)
    return (
      <Empty
        title="Encounter unavailable"
        body="Your role or selected branch may not have access to this encounter."
      />
    );
  const editable =
    user.role === "doctor" &&
    encounter.provider_id === user.id &&
    encounter.status === "draft";
  const old = chart.encounters.filter(
    (e: Row) => e.id !== id && e.status === "signed",
  );
  const source = old.find((e: Row) => e.id === previous) || old[0];
  const save = async (values: Row, sign = false) => {
    setBusy(true);
    setSaveError(undefined);
    try {
      const data: Row = {
        version: encounter.version,
        symptoms: symptoms.map((name, i) => ({
          name,
          response: values["symptom_" + i],
          narrative: values["narrative_" + i] || "",
        })),
      };
      for (const [k] of noteFields) data[k] = values[k] || "";
      for (const k of ["outcome", "cabg", "cag", "ccs_class"])
        data[k] = values[k] || "";
      data.cad_year = values.cad_year ? Number(values.cad_year) : null;
      const saved = await api("/encounters/" + id, "PUT", data);
      if (sign)
        await api("/encounters/" + id + "/sign", "POST", {
          version: saved.version,
        });
      await refresh();
      notify(
        sign
          ? "Encounter signed. The original note is now immutable."
          : "Consultation draft saved.",
      );
      setModal("");
    } catch (e) {
      setSaveError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        className="back-link"
        onClick={() => navigate("/patients/" + patientId)}
      >
        <ArrowLeft size={15} />
        Patient chart{isDirty ? " · Unsaved changes" : ""}
      </button>
      <div className="encounter-title">
        <div>
          <span className="eyebrow">ACTIVE CONSULTATION</span>
          <h1>
            {chart.patient.name}
            <Badge value={encounter.status} />
          </h1>
          <p>
            {encounter.visit_type} · {dateTime(encounter.created_at)} ·{" "}
            {staff.find((s) => s.id === encounter.provider_id)?.name}
          </p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={() => setModal("history")}>
            History
          </Button>
          <Button variant="secondary" onClick={() => setModal("preview")}>
            <Printer size={15} />
            Preview
          </Button>
          {editable && (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={handleSubmit((v) => save(v))}
              >
                <Save size={15} />
                Save draft
              </Button>
              <Button disabled={busy} onClick={() => setModal("sign")}>
                <ShieldCheck size={15} />
                Sign encounter
              </Button>
            </>
          )}
          {user.role === "doctor" && encounter.status === "signed" && (
            <Button onClick={() => setModal("amend")}>Add amendment</Button>
          )}
        </div>
      </div>
      <ErrorBox error={saveError} />
      <div className="encounter-grid">
        <aside className="context-pane">
          <Panel title="Patient context">
            <div className="context-body">
              <span className="mono">{chart.patient.mrn}</span>
              <p>
                {chart.patient.sex} · DOB {day(chart.patient.dob)}
              </p>
              <h3>Allergies</h3>
              {chart.allergies
                .filter((r: Row) => r.status === "active")
                .map((r: Row) => (
                  <div className="context-alert" key={r.id}>
                    {r.allergen}
                    <small>{r.reaction}</small>
                  </div>
                ))}
              {!chart.allergies.length && (
                <p className="muted">Not yet recorded</p>
              )}
              <h3>Active diagnoses</h3>
              {chart.diagnoses.map((r: Row) => (
                <p key={r.id}>
                  {r.code} {r.description}
                </p>
              ))}
              <h3>Medications</h3>
              {chart.medications.map((r: Row) => (
                <p key={r.id}>
                  <strong>{r.trade_name}</strong>
                  <small>
                    {r.dose} · {r.maen} · {r.status}
                  </small>
                </p>
              ))}
              <h3>Latest observations</h3>
              {chart.vitals[0] ? (
                <>
                  <strong>
                    {chart.vitals[0].bp_sys ?? "—"} /{" "}
                    {chart.vitals[0].bp_dia ?? "—"} mmHg
                  </strong>
                  <p>
                    Pulse {chart.vitals[0].pulse_bpm ?? "—"} bpm · SpO₂{" "}
                    {chart.vitals[0].spo2_pct ?? "—"}%
                  </p>
                  <small>{dateTime(chart.vitals[0].created_at)}</small>
                </>
              ) : (
                <p className="muted">No readings</p>
              )}
              {["doctor", "assistant", "therapist"].includes(user.role) &&
                encounter.status === "draft" && (
                  <Button
                    variant="secondary"
                    onClick={() => setModal("vitals")}
                  >
                    Record observations
                  </Button>
                )}
              <h3>History</h3>
              {chart.history.map((r: Row) => (
                <p key={r.id}>
                  {r.category}: {r.content}
                </p>
              ))}
            </div>
          </Panel>
        </aside>
        <section className="history-pane">
          <Panel
            title="Previous records"
            subtitle="Historical context · never a current observation"
          >
            <div className="context-body">
              {old.length ? (
                <>
                  <select
                    aria-label="Previous consultation"
                    value={source?.id}
                    onChange={(e) => setPrevious(e.target.value)}
                  >
                    {old.map((r: Row) => (
                      <option key={r.id} value={r.id}>
                        {day(r.created_at)} · {r.visit_type}
                      </option>
                    ))}
                  </select>
                  {noteFields.map(
                    ([k, title]) =>
                      source?.[k] && (
                        <div className="historical-section" key={k}>
                          <h3>{title}</h3>
                          <p>{source[k]}</p>
                          {editable && k !== "chief_complaint" && (
                            <Button
                              variant="ghost"
                              disabled={isDirty}
                              title={
                                isDirty
                                  ? "Save your current draft before carrying forward"
                                  : undefined
                              }
                              onClick={async () => {
                                try {
                                  await api(
                                    "/encounters/" + id + "/carry-forward",
                                    "POST",
                                    {
                                      version: encounter.version,
                                      source_id: source.id,
                                      section: k,
                                    },
                                  );
                                  await refresh();
                                  notify(
                                    "Historical section copied with source attribution.",
                                  );
                                } catch (e) {
                                  setSaveError(e);
                                }
                              }}
                            >
                              Carry forward
                              <ArrowUpRight size={13} />
                            </Button>
                          )}
                        </div>
                      ),
                  )}
                </>
              ) : (
                <p className="muted">No previous signed consultations.</p>
              )}
              <h3>Reports & results</h3>
              {chart.orders.map((r: Row) => (
                <div key={r.id} className="historical-section">
                  <strong>{r.name}</strong>
                  <p>{r.result || "Awaiting result"}</p>
                  <Badge value={r.status} />
                </div>
              ))}
              {chart.documents.map((r: Row) => (
                <button
                  className="text-link document-link"
                  key={r.id}
                  onClick={() =>
                    download(
                      "/documents/" + r.id + "/download",
                      r.filename,
                    ).catch(setSaveError)
                  }
                >
                  <FileText size={15} />
                  {r.title}
                </button>
              ))}
            </div>
          </Panel>
        </section>
        <section className="editor-pane">
          <Panel
            title={editable ? "Document this visit" : "Consultation record"}
            subtitle={
              editable
                ? isDirty
                  ? "Unsaved changes"
                  : "Draft saved · manual save"
                : "Finalized documentation is read-only"
            }
          >
            <form className="note-form" onSubmit={handleSubmit((v) => save(v))}>
              <fieldset disabled={!editable || busy}>
                <label className="field">
                  <span>Documentation template</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const t = templates.data?.find(
                        (x) => x.id === e.target.value,
                      );
                      if (t)
                        reset(
                          {
                            ...getValues(),
                            plan:
                              (getValues("plan") || "") +
                              "\n[Template prompts — complete before signing]\n" +
                              t.content,
                          },
                          { keepDefaultValues: true },
                        );
                    }}
                  >
                    <option value="">Choose a template…</option>
                    {templates.data?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                {noteFields.slice(0, 2).map(([k, l]) => (
                  <label className="field" key={k}>
                    <span>{l}</span>
                    <textarea rows={k === "hpi" ? 4 : 2} {...register(k)} />
                  </label>
                ))}
                <details className="checklist" open>
                  <summary>Cardiology symptom review</summary>
                  {symptoms.map((s, i) => (
                    <div className="symptom-row" key={s}>
                      <label>
                        {s}
                        <select aria-label={s} {...register("symptom_" + i)}>
                          <option>Not assessed</option>
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </label>
                      <input
                        aria-label={s + " narrative"}
                        placeholder="Clinical details, if relevant"
                        {...register("narrative_" + i)}
                      />
                    </div>
                  ))}
                </details>
                <div className="form-grid compact">
                  <label className="field">
                    <span>CAD diagnosis year</span>
                    <input
                      type="number"
                      min={1900}
                      max={2200}
                      {...register("cad_year")}
                    />
                  </label>
                  <label className="field">
                    <span>CCS class</span>
                    <select {...register("ccs_class")}>
                      <option value="">Not assessed</option>
                      {["I", "II", "III", "IV"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>CABG history</span>
                    <input {...register("cabg")} />
                  </label>
                  <label className="field">
                    <span>CAG history and date</span>
                    <input {...register("cag")} />
                  </label>
                </div>
                {noteFields.slice(2).map(([k, l]) => (
                  <label className="field" key={k}>
                    <span>{l}</span>
                    <textarea rows={k === "plan" ? 4 : 3} {...register(k)} />
                  </label>
                ))}
                <label className="field">
                  <span>Post-EECP outcome</span>
                  <select {...register("outcome")}>
                    <option value="">Not assessed</option>
                    {outcomes.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              </fieldset>
              {encounter.carry_forwards.map((r: Row) => (
                <div className="historical-attribution" key={r.id}>
                  Historical {label(r.section)} copied from{" "}
                  {dateTime(r.source_date)}.
                </div>
              ))}
            </form>
            <div className="encounter-related">
              <h3>Orders & prescriptions</h3>
              <div className="actions">
                {editable && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setModal("medications")}
                    >
                      Draft prescription
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setModal("orders")}
                    >
                      Add order
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setModal("diagnoses")}
                    >
                      Add diagnosis
                    </Button>
                  </>
                )}
              </div>
              {[...chart.medications, ...chart.orders, ...chart.diagnoses]
                .filter((r: Row) => r.encounter_id === id)
                .map((r: Row) => (
                  <p key={r.id}>
                    {r.trade_name || r.name || r.description}{" "}
                    <Badge value={r.status} />
                  </p>
                ))}
            </div>
            {encounter.amendments.map((a: Row) => (
              <div className="amendment" key={a.id}>
                <h3>Amendment · {dateTime(a.created_at)}</h3>
                <p>
                  <strong>Reason:</strong> {a.reason}
                </p>
                <p>{a.content}</p>
              </div>
            ))}
          </Panel>
        </section>
      </div>
      {["medications", "orders", "diagnoses", "vitals"].includes(modal) && (
        <RecordForm
          kind={modal}
          patientId={patientId}
          encounterId={id}
          onClose={() => setModal("")}
        />
      )}
      {modal === "sign" && (
        <Modal
          title="Finalize this consultation"
          description="Signing saves the current draft and locks the original note. Later corrections are recorded as dated amendments."
          onClose={() => setModal("")}
        >
          <div className="confirm-body">
            <p>
              Patient: <strong>{chart.patient.name}</strong> ·{" "}
              {chart.patient.mrn}
            </p>
            <p>
              Clinician: <strong>{user.name}</strong>
            </p>
            <p>
              Confirm that you have reviewed the observations, historical
              carry-forward, assessment, and plan.
            </p>
            <ErrorBox error={saveError} />
          </div>
          <div className="form-footer">
            <Button variant="secondary" onClick={() => setModal("")}>
              Continue editing
            </Button>
            <Button
              disabled={busy}
              onClick={handleSubmit((v) => save(v, true))}
            >
              Confirm & sign
            </Button>
          </div>
        </Modal>
      )}
      {modal === "amend" && (
        <Modal
          title="Add a signed-note amendment"
          description="The original signed note is preserved. Your identity and timestamp are recorded with this amendment."
          onClose={() => setModal("")}
        >
          <DynamicForm
            fields={[
              {
                name: "reason",
                label: "Reason for amendment",
                type: "textarea",
                required: true,
              },
              {
                name: "content",
                label: "Amendment",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (data) => {
              await api("/encounters/" + id + "/amend", "POST", data);
              await refresh();
              setModal("");
            }}
            submit="Record amendment"
          />
        </Modal>
      )}
      {modal === "history" && (
        <Modal
          title="Encounter revision history"
          onClose={() => setModal("")}
          wide
        >
          {revisions.isLoading ? (
            <Loading />
          ) : (
            revisions.data?.map((r) => (
              <details className="revision" key={r.id}>
                <summary>
                  {dateTime(r.created_at)} · {label(r.action)} ·{" "}
                  {staff.find((s) => s.id === r.actor_id)?.name}
                </summary>
                <pre>{JSON.stringify(JSON.parse(r.snapshot), null, 2)}</pre>
              </details>
            ))
          )}
          <ErrorBox error={revisions.error} />
        </Modal>
      )}
      {modal === "preview" && (
        <PrintPreview
          title={chart.patient.name + " · " + encounter.visit_type}
          onClose={() => setModal("")}
        >
          <p>
            {chart.patient.mrn} · {dateTime(encounter.created_at)} ·{" "}
            {encounter.status === "signed" ? "Signed" : "UNSIGNED DRAFT"}
          </p>
          {noteFields.map(([k, l]) => (
            <section key={k}>
              <h3>{l}</h3>
              <p>{getValues(k) || encounter[k] || "Not documented"}</p>
            </section>
          ))}
          <h3>Symptom review</h3>
          {symptoms.map((s, i) => (
            <p key={s}>
              {s}: {getValues("symptom_" + i) || "Not assessed"}{" "}
              {getValues("narrative_" + i)}
            </p>
          ))}
          <p>Outcome: {getValues("outcome") || "Not assessed"}</p>
          {encounter.amendments.map((a: Row) => (
            <section key={a.id}>
              <h3>Amendment · {dateTime(a.created_at)}</h3>
              <p>{a.reason}</p>
              <p>{a.content}</p>
            </section>
          ))}
          {encounter.signed_at && (
            <small>
              Signed {dateTime(encounter.signed_at)} · Record digest{" "}
              {encounter.signature_digest}
            </small>
          )}
        </PrintPreview>
      )}
    </>
  );
}

export function ClinicalPage() {
  const { user, patients, staff } = useApp();
  const [tab, setTab] = useState("Consultations");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Row>();
  const encounters = useQuery({
    queryKey: ["encounters", branch],
    queryFn: () => api<Row[]>("/encounters"),
  });
  const orders = useQuery({
    queryKey: ["orders", branch],
    queryFn: () => api<Row[]>("/records/orders"),
  });
  return (
    <>
      <PageHeading
        eyebrow="Clinical workspace"
        title="Care & documentation"
        description="Review consultations and diagnostic results in patient context."
      />
      <Tabs
        items={[
          "Consultations",
          "Lab & imaging",
          "Injections & vaccines",
          "Referrals",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "Consultations" ? (
        <Panel>
          <div className="toolbar">
            <strong>Consultation queue</strong>
            <select
              aria-label="Encounter status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>draft</option>
              <option>signed</option>
            </select>
          </div>
          <Table
            rows={(encounters.data || []).filter(
              (e) =>
                (filter === "All" || e.status === filter) &&
                (user.role !== "assistant" || e.assistant_id === user.id),
            )}
            onRow={(e) => navigate("/encounter/" + e.id + "/" + e.patient_id)}
            columns={[
              {
                title: "Patient",
                render: (e) => (
                  <strong>{patientName(e.patient_id, patients)}</strong>
                ),
              },
              {
                title: "Consultation",
                render: (e) => (
                  <>
                    {e.visit_type}
                    <small className="cell-sub">{dateTime(e.created_at)}</small>
                  </>
                ),
              },
              {
                title: "Clinician",
                render: (e) => staff.find((s) => s.id === e.provider_id)?.name,
              },
              { title: "Status", render: (e) => <Badge value={e.status} /> },
            ]}
          />
          <ErrorBox error={encounters.error} />
        </Panel>
      ) : (
        <Panel title={tab}>
          <Table
            rows={(orders.data || []).filter((r) =>
              tab === "Lab & imaging"
                ? ["Lab", "Imaging"].includes(r.kind)
                : tab === "Injections & vaccines"
                  ? ["Injection", "Vaccine"].includes(r.kind)
                  : r.kind === "Referral",
            )}
            onRow={setSelected}
            columns={[
              {
                title: "Patient",
                render: (r) => (
                  <button
                    className="text-link"
                    onClick={() => navigate("/patients/" + r.patient_id)}
                  >
                    {patientName(r.patient_id, patients)}
                  </button>
                ),
              },
              {
                title: "Order",
                render: (r) => (
                  <>
                    <strong>{r.name}</strong>
                    <small className="cell-sub">{r.kind}</small>
                  </>
                ),
              },
              { title: "Date", render: (r) => day(r.created_at) },
              { title: "Status", render: (r) => <Badge value={r.status} /> },
            ]}
          />
          <ErrorBox error={orders.error} />
        </Panel>
      )}
      {selected && (
        <RecordDetail
          kind="orders"
          row={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
