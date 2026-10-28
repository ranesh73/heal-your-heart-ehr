import React, { useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  Stethoscope,
  Activity,
  CalendarDays,
  MessagesSquare,
  Settings,
  Search,
  LogOut,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import {
  api,
  branch,
  setSession,
  navigate,
  Row,
  today,
  dateTime,
  patientName,
  money,
} from "./api";
import { AppContext, billingRoles, clinicalRoles } from "./context";
import {
  Button,
  Panel,
  PageHeading,
  Loading,
  ErrorBox,
  Badge,
  Empty,
  Table,
} from "./ui";
import { PatientForm, AppointmentForm, RecordForm } from "./forms";
import {
  PatientsPage,
  PatientChart,
  EncounterEditor,
  ClinicalPage,
} from "./patients";
import { EECPPage } from "./eecp";
import {
  OperationsPage,
  CommunicationPage,
  AdministrationPage,
} from "./operations";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15000 },
  },
});
const subscribe = (cb: () => void) => {
  addEventListener("hashchange", cb);
  return () => removeEventListener("hashchange", cb);
};
const snapshot = () => location.hash.slice(1) || "/home";

function Login({ onLogin }: { onLogin: () => void }) {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Enter your password"),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "doctor@demo.local" },
  });
  const [error, setError] = useState<unknown>();
  return (
    <div className="login-layout">
      <section className="login-story">
        <div className="brand">
          <HeartPulse size={34} />
          <div>
            HEAL YOUR HEART<small>Clinical workspace</small>
          </div>
        </div>
        <div>
          <span className="eyebrow">Built around continuity of care</span>
          <h1>
            Every visit.
            <br />
            One patient story.
          </h1>
          <p>
            A connected workspace for cardiology, EECP treatment, and the people
            who make care happen.
          </p>
          <div className="login-line">
            <span />
            <HeartPulse size={48} />
            <span />
          </div>
        </div>
        <small>Cardiology & EECP · Multi-branch practice management</small>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <Badge value="Development environment" />
          <h2>Welcome to your workspace</h2>
          <p>Sign in with your staff account to continue.</p>
          <form
            onSubmit={handleSubmit(async (data) => {
              setError(undefined);
              try {
                const r = await api("/auth/login", "POST", data);
                setSession(r.csrf, "");
                onLogin();
              } catch (e) {
                setError(e);
              }
            })}
          >
            <label className="field">
              <span>Staff email</span>
              <input
                type="email"
                autoComplete="username"
                {...register("email")}
              />
              {errors.email && <small>{errors.email.message}</small>}
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && <small>{errors.password.message}</small>}
            </label>
            <ErrorBox error={error} />
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in to workspace"}
              <ArrowUpRight size={17} />
            </Button>
          </form>
          <div className="login-note">
            <ShieldCheck size={19} />
            <p>
              Synthetic demonstration data only. Local demo credentials are in{" "}
              <code>.demo-credentials.txt</code> in the project folder.
            </p>
          </div>
          <p className="muted small">
            Roles: doctor, assistant, therapist, reception, billing, admin —
            each at @demo.local.
          </p>
        </div>
      </section>
    </div>
  );
}

function Home({
  onRegister,
  onBook,
}: {
  onRegister: () => void;
  onBook: () => void;
}) {
  const app = React.useContext(AppContext);
  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard", branch],
    queryFn: () => api("/dashboard"),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const appointments = data.appointments as Row[],
    stats = data.metrics;
  const cards = [
    {
      label: "Appointments today",
      value: appointments.length,
      sub: "Across this branch",
    },
    {
      label: "Waiting for care",
      value: appointments.filter((a) => a.status === "checked-in").length,
      sub: "Checked in and ready",
    },
    {
      label: clinicalRoles.includes(app.user.role)
        ? "Open consultations"
        : "Pending tasks",
      value: clinicalRoles.includes(app.user.role)
        ? stats.draft_encounters
        : stats.pending_tasks,
      sub: clinicalRoles.includes(app.user.role)
        ? "Documentation in progress"
        : "Team follow-up work",
    },
    {
      label:
        app.user.role === "billing"
          ? "Outstanding balance"
          : "Active EECP plans",
      value:
        app.user.role === "billing"
          ? money(stats.balance_paise)
          : stats.active_plans,
      sub:
        app.user.role === "billing"
          ? "Simulated ledger"
          : "Continuity of treatment",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
        title="Your day, at a glance"
        description={
          "Welcome, " + app.user.name + ". Here’s what needs your attention."
        }
        actions={
          <>
            {["reception", "doctor", "admin"].includes(app.user.role) && (
              <Button variant="secondary" onClick={onRegister}>
                <Plus size={16} />
                Register patient
              </Button>
            )}
            {["reception", "doctor", "therapist", "admin"].includes(
              app.user.role,
            ) && (
              <Button onClick={onBook}>
                <Plus size={16} />
                Book appointment
              </Button>
            )}
          </>
        }
      />
      <div className="stats">
        {cards.map((card, i) => (
          <div className="stat" key={card.label}>
            <div>
              <span>{card.label}</span>
              <span className="stat-index">0{i + 1}</span>
            </div>
            <strong>{card.value ?? 0}</strong>
            <small>{card.sub}</small>
          </div>
        ))}
      </div>
      <div className="home-grid">
        <Panel
          title="Today's care queue"
          subtitle="A shared view of arrivals, consultations, and treatment"
          actions={
            <Button variant="ghost" onClick={() => navigate("/operations")}>
              View schedule
              <ArrowUpRight size={15} />
            </Button>
          }
        >
          <Table
            rows={appointments}
            columns={[
              {
                title: "Time",
                render: (a) => (
                  <span className="mono">
                    {dateTime(a.start_at).split(",").pop()}
                  </span>
                ),
              },
              {
                title: "Patient",
                render: (a) => (
                  <button
                    className="text-link"
                    onClick={() => navigate("/patients/" + a.patient_id)}
                  >
                    {patientName(a.patient_id, app.patients)}
                  </button>
                ),
              },
              {
                title: "Visit",
                render: (a) => (
                  <>
                    <span>{a.visit_type}</span>
                    <small className="cell-sub">
                      {app.staff.find((s) => s.id === a.provider_id)?.name}
                    </small>
                  </>
                ),
              },
              { title: "Status", render: (a) => <Badge value={a.status} /> },
            ]}
            empty="No appointments today"
          />
        </Panel>
        <div className="side-stack">
          <Panel
            title="Your attention list"
            subtitle="Assigned tasks and recalls"
          >
            {data.tasks.length ? (
              data.tasks.map((t: Row) => (
                <button
                  className="task-preview"
                  key={t.id}
                  onClick={() => navigate("/communication")}
                >
                  <span className="task-dot" />
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {patientName(t.patient_id, app.patients)} · {t.priority}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <Empty
                title="Your task list is clear"
                body="Assigned follow-ups will appear here."
              />
            )}
          </Panel>
          <div className="eecp-promo">
            <Activity size={23} />
            <h2>One treatment. Continuous care.</h2>
            <p>
              Review the next EECP session with its plan, consent, and progress
              in context.
            </p>
            <Button variant="secondary" onClick={() => navigate("/eecp")}>
              Open EECP workspace
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </div>
      </div>
      <div className="environment-note">
        <ShieldCheck size={15} />
        Development system · Synthetic patients · No live prescribing, payments,
        or external messaging
      </div>
    </>
  );
}

function Workspace() {
  const qc = useQueryClient();
  const path = useSyncExternalStore(subscribe, snapshot);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("/auth/me"),
    retry: false,
  });
  const logged = !!me.data;
  if (me.data && !branch) setSession(me.data.csrf, me.data.facility_id);
  const patients = useQuery({
    queryKey: ["patients", branch],
    queryFn: () => api("/patients?limit=200"),
    enabled: logged,
  });
  const staff = useQuery({
    queryKey: ["staff", branch],
    queryFn: () => api<Row[]>("/staff"),
    enabled: logged,
  });
  const resources = useQuery({
    queryKey: ["resources", branch],
    queryFn: () => api<Row[]>("/resources"),
    enabled: logged,
  });
  const metadata = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api("/metadata"),
    enabled: logged,
  });
  const searchResults = useQuery({
    queryKey: ["global-search", branch, search],
    queryFn: () => api("/patients?q=" + encodeURIComponent(search)),
    enabled: logged && search.length > 1,
  });
  if (me.isLoading) return <Loading />;
  if (!logged)
    return (
      <Login
        onLogin={() => {
          qc.clear();
          qc.invalidateQueries();
        }}
      />
    );
  if (patients.isLoading || staff.isLoading || metadata.isLoading)
    return <Loading />;
  const error =
    patients.error || staff.error || resources.error || metadata.error;
  if (error)
    return (
      <div className="fatal">
        <ErrorBox error={error} />
        <Button onClick={() => qc.invalidateQueries()}>Retry workspace</Button>
      </div>
    );
  const user = me.data.user;
  const parts = path.split("/").filter(Boolean);
  const page = parts[0];
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 5000);
  };
  const refresh = async () => {
    await qc.invalidateQueries();
  };
  const context = {
    user,
    staff: staff.data || [],
    patients: patients.data?.items || [],
    resources: resources.data || [],
    metadata: metadata.data || {},
    facilities: me.data.facilities,
    refresh,
    notify,
  };
  const nav = [
    ["home", "Home", LayoutDashboard],
    ["patients", "Patients", Users],
    ["clinical", "Clinical", Stethoscope],
    ["eecp", "EECP", Activity],
    ["operations", "Operations", CalendarDays],
    ["communication", "Communication", MessagesSquare],
    ["administration", "Administration", Settings],
  ] as const;
  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={() => navigate("/home")}>
            <HeartPulse size={29} />
            <span>
              HEAL YOUR HEART<small>EHR workspace</small>
            </span>
          </button>
          <div className="sidebar-caption">WORKSPACE</div>
          <nav>
            {nav
              .filter(([key]) =>
                key === "administration"
                  ? user.role === "admin"
                  : key === "clinical"
                    ? clinicalRoles.includes(user.role)
                    : key === "eecp"
                      ? user.role !== "billing"
                      : true,
              )
              .map(([key, title, Icon]) => (
                <button
                  key={key}
                  className={
                    page === key || (page === "encounter" && key === "clinical")
                      ? "active"
                      : ""
                  }
                  onClick={() => navigate("/" + key)}
                >
                  <Icon size={19} />
                  <span>{title}</span>
                  {key === "eecp" && <span className="nav-tag">CARE</span>}
                </button>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="dev-label">
              <span />
              LOCAL DEVELOPMENT
            </div>
            <div className="staff-card">
              <span className="avatar">
                {user.name
                  .split(" ")
                  .map((x: string) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </div>
              <button
                aria-label="Sign out"
                onClick={async () => {
                  await api("/auth/logout", "POST", {});
                  setSession("", "");
                  qc.clear();
                  navigate("/home");
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="global-search">
              <Search size={17} />
              <input
                aria-label="Find a patient"
                placeholder="Find a patient by name, MRN or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.length > 1 && (
                <div className="search-results">
                  {searchResults.data?.items.map((p: Row) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate("/patients/" + p.id);
                        setSearch("");
                      }}
                    >
                      <strong>{p.name}</strong>
                      <small>{p.mrn}</small>
                    </button>
                  ))}
                  {searchResults.data?.items.length === 0 && (
                    <p>No patients found</p>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-right">
              <span className="branch-dot" />
              <select
                aria-label="Active branch"
                value={branch}
                onChange={(e) => {
                  setSession(me.data.csrf, e.target.value);
                  navigate("/home");
                  qc.removeQueries({
                    predicate: (q) =>
                      q.queryKey[0] !== "me" && q.queryKey[0] !== "metadata",
                  });
                  setSearch("");
                  setToast("Branch changed.");
                }}
              >
                {me.data.facilities.map((f: Row) => (
                  <option key={f.id} value={f.id}>
                    {f.name.replace("Heal Your Heart · ", "")}
                  </option>
                ))}
              </select>
              <span className="timezone">IST</span>
            </div>
          </header>
          <main>
            {page === "home" && (
              <Home
                onRegister={() => setModal("patient")}
                onBook={() => setModal("appointment")}
              />
            )}
            {page === "patients" &&
              (parts[1] ? <PatientChart id={parts[1]} /> : <PatientsPage />)}
            {page === "clinical" && <ClinicalPage />}
            {page === "encounter" && (
              <EncounterEditor id={parts[1]} patientId={parts[2]} />
            )}
            {page === "eecp" && <EECPPage />}
            {page === "operations" && <OperationsPage />}
            {page === "communication" && <CommunicationPage />}
            {page === "administration" && <AdministrationPage />}
            {![
              "home",
              "patients",
              "clinical",
              "encounter",
              "eecp",
              "operations",
              "communication",
              "administration",
            ].includes(page) && (
              <Empty
                title="Workspace not found"
                action={
                  <Button onClick={() => navigate("/home")}>Go home</Button>
                }
              />
            )}
          </main>
        </div>
      </div>
      {modal === "patient" && (
        <PatientForm
          onClose={() => setModal("")}
          onSaved={(p) => {
            setModal("");
            navigate("/patients/" + p.id);
          }}
        />
      )}
      {modal === "appointment" && (
        <AppointmentForm onClose={() => setModal("")} />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={17} />
          {toast}
        </div>
      )}
    </AppContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Workspace />
    </QueryClientProvider>
  </React.StrictMode>,
);
