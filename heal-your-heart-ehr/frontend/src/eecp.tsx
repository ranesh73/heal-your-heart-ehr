import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileCheck,
  LockKeyhole,
  Play,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  branch,
  Row,
  Field,
  day,
  dateTime,
  navigate,
  patientName,
  today,
} from "./api";
import { useApp } from "./context";
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
import { AppointmentForm, RecordForm, UploadForm } from "./forms";

function PlanForm({
  patientId,
  onClose,
}: {
  patientId?: string;
  onClose: () => void;
}) {
  const { patients, staff, refresh, notify } = useApp();
  const fields: Field[] = [
    ...(!patientId
      ? [
          {
            name: "patient_id",
            label: "Patient",
            type: "patient",
            required: true,
          },
        ]
      : []),
    { name: "program", label: "Treatment program", required: true },
    {
      name: "session_count",
      label: "Planned sessions (20, 35 or custom)",
      type: "number",
      min: 1,
      max: 100,
      required: true,
    },
    {
      name: "therapist_id",
      label: "Assigned therapist",
      type: "therapist",
      required: true,
    },
    {
      name: "start_date",
      label: "Plan start date",
      type: "date",
      required: true,
    },
  ];
  return (
    <Modal
      title="Enroll in EECP treatment"
      description="New plans start as drafts. A clinician must authorize the plan and consent must be documented before treatment can begin."
      onClose={onClose}
    >
      <DynamicForm
        fields={fields}
        initial={{
          program: "EECP treatment course",
          session_count: 35,
          start_date: today(),
        }}
        choices={{
          patient: patients,
          therapist: staff.filter((s) => s.role === "therapist"),
        }}
        onSubmit={async (data) => {
          await api("/eecp/plans", "POST", {
            ...data,
            patient_id: patientId || data.patient_id,
          });
          await refresh();
          notify("EECP plan created. Authorization and consent are pending.");
          onClose();
        }}
        submit="Create treatment plan"
      />
    </Modal>
  );
}

function SessionForm({
  session,
  onClose,
}: {
  session: Row;
  onClose: () => void;
}) {
  const { metadata, refresh, notify, user } = useApp();
  const [current, setCurrent] = useState(session);
  const [error, setError] = useState<unknown>();
  const [interrupt, setInterrupt] = useState(false);
  const edit =
    current.status === "started" &&
    current.therapist_id === user.id &&
    user.role === "therapist";
  return (
    <Modal
      title={"EECP daily chart · Session " + current.session_number}
      description="Record measured values only. Pressure uses the selected device unit. No treatment thresholds or recommendations are inferred."
      onClose={onClose}
      wide
    >
      <div className="session-banner">
        <Badge value={current.status} />
        <span>Started {dateTime(current.started_at)}</span>
      </div>
      {edit ? (
        <DynamicForm
          fields={metadata.daily_fields.map((f: Field) => ({
            ...f,
            required: f.name === "pressure_unit",
          }))}
          initial={current}
          onSubmit={async (data) => {
            const payload: Row = { version: current.version };
            for (const f of metadata.daily_fields)
              payload[f.name] = data[f.name];
            const r = await api("/eecp/sessions/" + current.id, "PUT", payload);
            setCurrent(r);
            await refresh();
            notify("Daily observations saved.");
          }}
          submit="Save measurements"
          footer="Save at each observation interval; complete after the full chart is recorded."
        />
      ) : (
        <div className="record-detail">
          <dl className="details">
            {metadata.daily_fields.map((f: Field) => (
              <div key={f.name}>
                <dt>{f.label}</dt>
                <dd>{current[f.name] ?? "Not recorded"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <ErrorBox error={error} />
      {edit && (
        <div className="form-footer">
          <Button variant="danger" onClick={() => setInterrupt(true)}>
            Interrupt session
          </Button>
          <Button
            onClick={async () => {
              try {
                const r = await api(
                  "/eecp/sessions/" + current.id + "/complete",
                  "POST",
                  { version: current.version },
                );
                await refresh();
                notify(
                  r.weekly_due
                    ? "Session completed. Weekly assessment is due."
                    : "Session completed. Treatment progress updated.",
                );
                onClose();
              } catch (e) {
                setError(e);
              }
            }}
          >
            <Check size={16} />
            Complete session
          </Button>
        </div>
      )}
      {interrupt && (
        <div className="inset-form">
          <h3>Record treatment interruption</h3>
          <DynamicForm
            fields={[
              {
                name: "reason",
                label: "Reason for interruption",
                type: "textarea",
                required: true,
              },
              {
                name: "content",
                label: "Observations and follow-up",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (data) => {
              await api(
                "/eecp/sessions/" + current.id + "/interrupt",
                "POST",
                data,
              );
              await refresh();
              onClose();
            }}
            submit="Record interruption"
          />
        </div>
      )}
    </Modal>
  );
}

export function PlanWorkspace({
  plan,
  chart,
  onClose,
}: {
  plan: Row;
  chart?: Row;
  onClose?: () => void;
}) {
  const { user, patients, staff, resources, refresh, notify } = useApp();
  const [modal, setModal] = useState("");
  const [session, setSession] = useState<Row>();
  const [error, setError] = useState<unknown>();
  const [review, setReview] = useState<Row>();
  const loaded = useQuery({
    queryKey: ["chart", branch, plan.patient_id],
    queryFn: () => api("/patients/" + plan.patient_id),
    enabled: !chart,
  });
  const data = chart || loaded.data;
  const current = data?.plans?.find((p: Row) => p.id === plan.id) || plan;
  const appointments = (data?.appointments || [])
    .filter((a: Row) => a.plan_id === plan.id)
    .sort((a: Row, b: Row) => a.session_number - b.session_number);
  const sessions = (data?.sessions || []).filter(
    (s: Row) => s.plan_id === plan.id,
  );
  const weekly = (data?.weekly || []).filter((w: Row) => w.plan_id === plan.id);
  const canTreat = user.role === "therapist";
  const clinical = user.role !== "reception";
  const run = async (path: string, body: Row) => {
    setError(undefined);
    try {
      const r = await api(path, "POST", body);
      await refresh();
      return r;
    } catch (e) {
      setError(e);
    }
  };
  if (!data && loaded.isLoading) return <Loading />;
  return (
    <>
      <div className="plan-overview">
        <div>
          <span className="eyebrow">TREATMENT PLAN</span>
          <h2>{current.program}</h2>
          <p>
            {patientName(plan.patient_id, patients)} ·{" "}
            {staff.find((s) => s.id === current.therapist_id)?.name} · From{" "}
            {day(current.start_date)}
          </p>
        </div>
        <div className="plan-progress">
          <strong>
            {current.completed}
            <span> / {current.session_count}</span>
          </strong>
          <small>sessions completed</small>
          <progress value={current.completed} max={current.session_count} />
        </div>
        <Badge value={current.status} />
      </div>
      {clinical && (
        <div className="approval-steps">
          <div className={current.authorized_by ? "done" : ""}>
            <ShieldCheck size={19} />
            <span>
              <strong>Clinician authorization</strong>
              <small>
                {current.authorized_by
                  ? "Authorized " + dateTime(current.authorized_at)
                  : "Pending clinical review"}
              </small>
            </span>
            {user.role === "doctor" && current.status === "draft" && (
              <Button onClick={() => setModal("authorize")}>Authorize</Button>
            )}
          </div>
          <div className={current.consent_document_id ? "done" : ""}>
            <FileCheck size={19} />
            <span>
              <strong>Consent documentation</strong>
              <small>
                {current.consent_document_id
                  ? "Recorded " + dateTime(current.consent_recorded_at)
                  : "A signed consent document is required"}
              </small>
            </span>
            {["doctor", "therapist"].includes(user.role) &&
              !["completed", "cancelled", "discontinued"].includes(
                current.status,
              ) && (
                <Button variant="secondary" onClick={() => setModal("consent")}>
                  {current.consent_document_id ? "Update" : "Record consent"}
                </Button>
              )}
          </div>
        </div>
      )}
      <ErrorBox error={error || loaded.error} />
      <div className="toolbar">
        <h3>Session timeline</h3>
        <div className="actions">
          {["doctor", "therapist", "reception", "admin"].includes(user.role) &&
            ["draft", "approved", "active"].includes(current.status) &&
            current.scheduled < current.session_count && (
              <Button onClick={() => setModal("schedule")}>
                <CalendarDays size={15} />
                Schedule sessions
              </Button>
            )}
          {["doctor", "therapist"].includes(user.role) && (
            <Button variant="secondary" onClick={() => setModal("weekly")}>
              Weekly assessment
            </Button>
          )}
          {user.role === "doctor" &&
            ["draft", "approved", "active", "interrupted"].includes(
              current.status,
            ) && (
              <Button variant="ghost" onClick={() => setModal("status")}>
                Manage plan
              </Button>
            )}
        </div>
      </div>
      <div className="session-timeline" aria-label="Treatment session progress">
        {Array.from({ length: current.session_count }, (_, i) => {
          const a = appointments.find((a: Row) => a.session_number === i + 1);
          return (
            <span
              key={i}
              className={a?.status || "unscheduled"}
              title={"Session " + (i + 1) + ": " + (a?.status || "unscheduled")}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
      <div className="timeline-legend">
        <span>□ Unscheduled</span>
        <span>■ Confirmed</span>
        <span className="teal">■ Completed</span>
        <span className="amber">■ Missed / interrupted</span>
      </div>
      <Table
        rows={appointments}
        columns={[
          {
            title: "Session",
            render: (a) => <strong>#{a.session_number}</strong>,
          },
          { title: "Schedule", render: (a) => dateTime(a.start_at) },
          {
            title: "Bed",
            render: (a) => resources.find((r) => r.id === a.resource_id)?.name,
          },
          { title: "Status", render: (a) => <Badge value={a.status} /> },
          {
            title: "Action",
            render: (a) => {
              const s = sessions.find((s: Row) => s.appointment_id === a.id);
              return (
                <div className="actions">
                  {s && clinical ? (
                    <Button variant="secondary" onClick={() => setSession(s)}>
                      Daily chart
                    </Button>
                  ) : canTreat &&
                    a.provider_id === user.id &&
                    ["confirmed", "checked-in"].includes(a.status) ? (
                    <Button
                      variant={
                        a.status === "confirmed" ? "secondary" : "primary"
                      }
                      onClick={async () => {
                        if (a.status === "confirmed") {
                          await run("/appointments/" + a.id + "/status", {
                            version: a.version,
                            status: "checked-in",
                          });
                        } else {
                          const result = await run(
                            "/eecp/appointments/" + a.id + "/start",
                            { version: a.version },
                          );
                          if (result) setSession(result);
                        }
                      }}
                    >
                      {a.status === "confirmed" ? "Check in" : "Start session"}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/patients/" + a.patient_id)}
                    aria-label="Open patient chart"
                  >
                    <ArrowUpRight size={15} />
                  </Button>
                </div>
              );
            },
          },
        ]}
        empty="No sessions scheduled"
      />
      {clinical && (
        <div className="weekly-section">
          <h3>Weekly functional assessments</h3>
          <Table
            rows={weekly}
            columns={[
              { title: "Week", render: (w) => "Week " + w.week_number },
              {
                title: "Functional class",
                render: (w) => "NYHA " + w.nyha_class + " · CCS " + w.ccs_class,
              },
              {
                title: "Exercise / walk",
                render: (w) =>
                  (w.exercise_minutes ?? "—") +
                  " min · " +
                  (w.walk_distance_m ?? "—") +
                  " m",
              },
              { title: "QOL", render: (w) => w.qol_score + " / 4" },
              {
                title: "Review",
                render: (w) =>
                  w.reviewed_at ? (
                    <span>
                      {w.physician_evaluation}
                      <small className="cell-sub">
                        {dateTime(w.reviewed_at)}
                      </small>
                    </span>
                  ) : user.role === "doctor" ? (
                    <Button variant="secondary" onClick={() => setReview(w)}>
                      Physician review
                    </Button>
                  ) : (
                    <Badge value="pending" />
                  ),
              },
            ]}
            empty="No weekly assessments recorded"
          />
        </div>
      )}
      {modal === "authorize" && (
        <Modal
          title="Authorize this treatment plan"
          description="This action records your clinician identity and authorization timestamp."
          onClose={() => setModal("")}
        >
          <div className="confirm-body">
            <p>
              {patientName(plan.patient_id, patients)} · {current.program}
            </p>
            <p>
              {current.session_count} planned sessions ·{" "}
              {staff.find((s) => s.id === current.therapist_id)?.name}
            </p>
            <ErrorBox error={error} />
          </div>
          <div className="form-footer">
            <Button
              onClick={async () => {
                if (
                  await run("/eecp/plans/" + plan.id + "/authorize", {
                    version: current.version,
                  })
                )
                  setModal("");
              }}
            >
              Confirm authorization
            </Button>
          </div>
        </Modal>
      )}
      {modal === "consent" && (
        <Modal
          title="Record EECP consent"
          description="Select the signed consent document after verifying patient identity and consent content."
          onClose={() => setModal("")}
        >
          <DynamicForm
            fields={[
              {
                name: "document_id",
                label: "Signed consent document",
                type: "document",
                required: true,
              },
            ]}
            choices={{ document: data?.documents || [] }}
            onSubmit={async (v) => {
              await api("/eecp/plans/" + plan.id + "/consent", "POST", {
                version: current.version,
                document_id: v.document_id,
              });
              await refresh();
              setModal("");
            }}
            submit="Record verified consent"
          />
          <div className="inset-form">
            <Button variant="secondary" onClick={() => setModal("upload")}>
              Upload a consent document
            </Button>
          </div>
        </Modal>
      )}
      {modal === "upload" && (
        <UploadForm
          patientId={plan.patient_id}
          onClose={() => setModal("consent")}
        />
      )}
      {modal === "schedule" && (
        <AppointmentForm
          patientId={plan.patient_id}
          plan={current}
          onClose={() => setModal("")}
        />
      )}
      {modal === "weekly" && (
        <RecordForm
          kind="weekly"
          patientId={plan.patient_id}
          planId={plan.id}
          initial={{
            week_number: Math.min(
              Math.floor(current.completed / 7) + 1,
              Math.ceil(current.session_count / 7),
            ),
            qol_score: 0,
          }}
          onClose={() => setModal("")}
        />
      )}
      {modal === "status" && (
        <Modal title="Manage treatment plan" onClose={() => setModal("")}>
          <DynamicForm
            fields={[
              {
                name: "status",
                label: "New status",
                options:
                  current.status === "draft"
                    ? ["cancelled"]
                    : current.status === "interrupted"
                      ? ["active", "discontinued"]
                      : current.status === "approved"
                        ? ["interrupted", "discontinued", "cancelled"]
                        : ["interrupted", "discontinued"],
                required: true,
              },
              {
                name: "reason",
                label: "Clinical / operational reason",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (v) => {
              await api("/eecp/plans/" + plan.id + "/status", "POST", {
                ...v,
                version: current.version,
              });
              await refresh();
              setModal("");
            }}
          />
        </Modal>
      )}
      {session && (
        <SessionForm session={session} onClose={() => setSession(undefined)} />
      )}
      {review && (
        <Modal
          title={"Physician evaluation · week " + review.week_number}
          onClose={() => setReview(undefined)}
        >
          <DynamicForm
            fields={[
              {
                name: "evaluation",
                label: "Physician evaluation",
                type: "textarea",
                required: true,
              },
            ]}
            onSubmit={async (v) => {
              await api("/eecp/weekly/" + review.id + "/review", "POST", {
                version: review.version,
                evaluation: v.evaluation,
              });
              await refresh();
              setReview(undefined);
            }}
            submit="Sign weekly review"
          />
        </Modal>
      )}
    </>
  );
}

export function EECPPatient({
  patientId,
  chart,
}: {
  patientId: string;
  chart: Row;
}) {
  const { user } = useApp();
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState("");
  const plans = chart.plans || [];
  const plan = plans.find((p: Row) => p.id === selected) || plans[0];
  return (
    <Panel
      title="EECP treatment"
      actions={
        ["doctor", "therapist"].includes(user.role) && (
          <AddButton onClick={() => setAdd(true)}>Enroll patient</AddButton>
        )
      }
    >
      {plans.length > 1 && (
        <div className="toolbar">
          <select
            aria-label="Treatment plan"
            value={plan?.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {plans.map((p: Row) => (
              <option key={p.id} value={p.id}>
                {p.program} · {day(p.start_date)}
              </option>
            ))}
          </select>
        </div>
      )}
      {plan ? (
        <PlanWorkspace plan={plan} chart={chart} />
      ) : (
        <Empty
          title="No treatment plans"
          body="Enroll this patient to define the program, session count, and care team."
        />
      )}
      {add && <PlanForm patientId={patientId} onClose={() => setAdd(false)} />}
    </Panel>
  );
}

export function EECPPage() {
  const { user, patients, staff } = useApp();
  const [tab, setTab] = useState("Treatment plans");
  const [add, setAdd] = useState(false);
  const [selected, setSelected] = useState<Row>();
  const [mine, setMine] = useState(user.role === "therapist");
  const plans = useQuery({
    queryKey: ["plans", branch],
    queryFn: () => api<Row[]>("/eecp/plans"),
  });
  const appointments = useQuery({
    queryKey: ["appointments", branch],
    queryFn: () => api<Row[]>("/appointments"),
  });
  const items = (plans.data || []).filter(
    (p) => !mine || p.therapist_id === user.id,
  );
  return (
    <>
      <PageHeading
        eyebrow="Specialty care"
        title="EECP treatment"
        description="Keep every session connected to its patient, approved plan, and care team."
        actions={
          ["doctor", "therapist"].includes(user.role) && (
            <AddButton onClick={() => setAdd(true)}>Enroll patient</AddButton>
          )
        }
      />
      <Tabs
        items={["Treatment plans", "Therapist worklist"]}
        value={tab}
        onChange={setTab}
      />
      <div className="toolbar">
        <span className="muted">{items.length} treatment plans</span>
        {user.role === "therapist" && (
          <label className="inline-check">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
            />
            My assigned plans
          </label>
        )}
      </div>
      <ErrorBox error={plans.error || appointments.error} />
      {plans.isLoading ? (
        <Loading />
      ) : tab === "Treatment plans" ? (
        <div className="plan-cards">
          {items.map((p) => (
            <Panel key={p.id}>
              <div className="treatment-card">
                <div className="row-between">
                  <span className="icon-box">
                    <Activity size={23} />
                  </span>
                  <Badge value={p.status} />
                </div>
                <button
                  className="patient-plan-name"
                  onClick={() => navigate("/patients/" + p.patient_id)}
                >
                  {patientName(p.patient_id, patients)}
                </button>
                <p>{p.program}</p>
                <div className="progress-label">
                  <strong>
                    {p.completed} <span>/ {p.session_count} sessions</span>
                  </strong>
                  <span>
                    {Math.round((100 * p.completed) / p.session_count)}%
                  </span>
                </div>
                <progress value={p.completed} max={p.session_count} />
                <div className="card-details">
                  <span>
                    {staff.find((s) => s.id === p.therapist_id)?.name}
                  </span>
                  <span>From {day(p.start_date)}</span>
                </div>
                {user.role !== "reception" && (
                  <div className="plan-gates">
                    <span className={p.authorized_by ? "met" : ""}>
                      <ShieldCheck size={14} />
                      {p.authorized_by ? "Authorized" : "Authorization pending"}
                    </span>
                    <span className={p.consent_document_id ? "met" : ""}>
                      <FileCheck size={14} />
                      {p.consent_document_id
                        ? "Consent recorded"
                        : "Consent pending"}
                    </span>
                  </div>
                )}
                <Button variant="secondary" onClick={() => setSelected(p)}>
                  Open treatment plan
                  <ArrowUpRight size={15} />
                </Button>
              </div>
            </Panel>
          ))}
          {!items.length && <Empty title="No treatment plans" />}
        </div>
      ) : (
        <Panel
          title="Assigned treatment sessions"
          subtitle="Check in and start sessions from the treatment plan"
        >
          <Table
            rows={(appointments.data || []).filter(
              (a) => a.plan_id && (!mine || a.provider_id === user.id),
            )}
            columns={[
              {
                title: "Patient",
                render: (a) => (
                  <strong>{patientName(a.patient_id, patients)}</strong>
                ),
              },
              { title: "Session", render: (a) => "#" + a.session_number },
              { title: "Scheduled", render: (a) => dateTime(a.start_at) },
              { title: "Status", render: (a) => <Badge value={a.status} /> },
            ]}
            onRow={(a) =>
              setSelected(plans.data?.find((p) => p.id === a.plan_id))
            }
          />
        </Panel>
      )}
      {add && <PlanForm onClose={() => setAdd(false)} />}{" "}
      {selected && (
        <Modal
          title="EECP treatment workspace"
          onClose={() => setSelected(undefined)}
          wide
        >
          <PlanWorkspace
            plan={plans.data?.find((p) => p.id === selected.id) || selected}
          />
        </Modal>
      )}
    </>
  );
}
