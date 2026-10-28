import React, { useState, useEffect, useSyncExternalStore } from "react";
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
  Bell,
  Lock,
  Eye,
  EyeOff,
  FlaskConical,
  Image as ImageIcon,
  FileText,
  Syringe,
  Share2,
  Mail,
  Hash,
  CheckCircle2,
  DollarSign,
  Package,
  BarChart3,
  Pin,
  MessageCircle,
  Layers,
  HelpCircle,
  PhoneCall,
  Building2,
  Gift,
  Puzzle,
  Command,
  User,
  X,
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
import {
  LabsPage,
  ImagesPage,
  DocumentsPage,
  InjectionsPage,
  ReferralsPage,
  MessagesPage,
  ChannelsPage,
  TasksPage,
} from "./clinicalModules";
import "./styles.css";

const launcherModules = [
  { id: "patients", title: "Patients", sub: "Charts & Directory", icon: Users, route: "/patients" },
  { id: "calendar", title: "Calendar", sub: "Provider Schedules", icon: CalendarDays, route: "/calendar" },
  { id: "clinical", title: "Chart Notes", sub: "SOAP & Encounters", icon: Stethoscope, route: "/clinical" },
  { id: "labs", title: "Labs", sub: "Biomarkers & Orders", icon: FlaskConical, route: "/labs" },
  { id: "images", title: "Images", sub: "Echo, ECG & CAG", icon: ImageIcon, route: "/images" },
  { id: "documents", title: "Documents", sub: "Intake & Records", icon: FileText, route: "/documents" },
  { id: "injections", title: "Injections", sub: "MAR & Vaccines", icon: Syringe, route: "/injections" },
  { id: "referrals", title: "Referrals", sub: "Specialist In/Out", icon: Share2, route: "/referrals" },
  { id: "messages", title: "Messages", sub: "Secure Inquiries", icon: Mail, route: "/messages" },
  { id: "channels", title: "Channels", sub: "Team Chat Rooms", icon: Hash, route: "/channels" },
  { id: "tasks", title: "Tasks", sub: "Follow-ups & To-dos", icon: CheckCircle2, route: "/tasks" },
  { id: "billing", title: "Billing", sub: "Invoices & Ledger", icon: DollarSign, route: "/billing" },
  { id: "inventory", title: "Inventory", sub: "Supplies & Stock", icon: Package, route: "/inventory" },
  { id: "analytics", title: "Analytics", sub: "Clinical Reports", icon: BarChart3, route: "/analytics" },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Enter your password"),
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "doctor@demo.local" },
  });
  const [error, setError] = useState<unknown>();

  const quickRoles = [
    { role: "Doctor", email: "doctor@demo.local" },
    { role: "Assistant", email: "assistant@demo.local" },
    { role: "Therapist", email: "therapist@demo.local" },
    { role: "Reception", email: "reception@demo.local" },
    { role: "Billing", email: "billing@demo.local" },
    { role: "Admin", email: "admin@demo.local" },
  ];

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
          <Badge value="CharmHealth Practice Portal" />
          <h2>Welcome to your workspace</h2>
          <p>Sign in with your staff account to continue.</p>

          <form
            onSubmit={handleSubmit(async (data) => {
              setError(undefined);
              try {
                const r = await api("/auth/login", "POST", data);
                setSession(r.csrf, r.facility_id || "");
                queryClient.setQueryData(["me"], r);
                await onLogin();
              } catch (e) {
                setError(e);
              }
            })}
          >
            <label className="field">
              <span>Staff email</span>
              <input
                aria-label="Staff email"
                type="email"
                autoComplete="username"
                {...register("email")}
              />
              {errors.email && <small>{errors.email.message}</small>}
            </label>
            <label className="field">
              <span style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Password</span>
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    color: "#2563eb",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
              <input
                aria-label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && <small>{errors.password.message}</small>}
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#64748b",
                margin: "4px 0 10px 0",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" defaultChecked />
                <span>Remember email</span>
              </label>
              <span style={{ color: "#2563eb", cursor: "pointer" }}>Forgot password?</span>
            </div>

            <ErrorBox error={error} />
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Sign in to workspace"}
              <ArrowUpRight size={17} />
            </Button>
          </form>

          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              QUICK DEMO ROLES:
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {quickRoles.map((qr) => (
                <button
                  key={qr.role}
                  type="button"
                  onClick={() => setValue("email", qr.email)}
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  {qr.role}
                </button>
              ))}
            </div>
          </div>

          <div className="login-note" style={{ marginTop: 16 }}>
            <ShieldCheck size={19} />
            <p>
              Synthetic demonstration data only. Local demo credentials are in{" "}
              <code>.demo-credentials.txt</code> in the project folder.
            </p>
          </div>
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
    <div className="charm-home-wrap">
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

      {/* 14-Module Authentic CharmHealth Launcher Grid (Image 2) */}
      <div className="charm-home-launcher-container">
        <div className="charm-home-grid-3x5">
          {launcherModules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="charm-grid-module-card"
                onClick={() => navigate(m.route)}
              >
                <div className="charm-grid-icon-box">
                  <Icon size={28} />
                </div>
                <div className="charm-grid-card-label">{m.title}</div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Bottom Collaboration Dock */}
      <div className="charm-collab-dock">
        <div className="charm-dock-left">
          <button className="charm-dock-btn" onClick={() => navigate("/tasks")}>
            <Pin size={13} />
            <span>Pins</span>
          </button>
          <button className="charm-dock-btn" onClick={() => navigate("/messages")}>
            <MessageCircle size={13} />
            <span>Chats</span>
          </button>
          <button className="charm-dock-btn" onClick={() => navigate("/channels")}>
            <Hash size={13} />
            <span>Channels</span>
          </button>
          <button className="charm-dock-btn" onClick={() => navigate("/communication")}>
            <Layers size={13} />
            <span>Threads</span>
          </button>
          <button className="charm-dock-btn" onClick={() => navigate("/administration")}>
            <Users size={13} />
            <span>People</span>
          </button>
        </div>
        <div className="charm-dock-right">
          <span style={{ color: "#64748b" }}>Heal Your Heart EHR · Multi-Branch Practice Portal</span>
        </div>
      </div>
    </div>
  );
}

function Workspace() {
  const qc = useQueryClient();
  const path = useSyncExternalStore(subscribe, snapshot);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState(branch);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("/auth/me"),
    retry: false,
  });
  const logged = !!me.data;
  const currentBranch = activeBranch || branch || me.data?.facility_id || "";
  useEffect(() => {
    if (me.data && (!branch || !activeBranch)) {
      const fId = branch || me.data.facility_id;
      setSession(me.data.csrf, fId);
      if (!activeBranch) setActiveBranch(fId);
    }
  }, [me.data, activeBranch]);
  const patients = useQuery({
    queryKey: ["patients", currentBranch],
    queryFn: () => api("/patients?limit=200"),
    enabled: logged,
  });
  const staff = useQuery({
    queryKey: ["staff", currentBranch],
    queryFn: () => api<Row[]>("/staff"),
    enabled: logged,
  });
  const resources = useQuery({
    queryKey: ["resources", currentBranch],
    queryFn: () => api<Row[]>("/resources"),
    enabled: logged,
  });
  const metadata = useQuery({
    queryKey: ["metadata"],
    queryFn: () => api("/metadata"),
    enabled: logged,
  });
  const searchResults = useQuery({
    queryKey: ["global-search", currentBranch, search],
    queryFn: () => api("/patients?q=" + encodeURIComponent(search)),
    enabled: logged && search.length > 1,
  });

  if (me.isLoading) return <Loading />;
  if (!logged)
    return (
      <Login
        onLogin={async () => {
          await qc.refetchQueries({ queryKey: ["me"] });
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

  // The navigation list includes tested legacy keys + all CharmHealth global modules
  const navItems = [
    ["home", "Home", LayoutDashboard],
    ["patients", "Patients", Users],
    ["calendar", "Calendar", CalendarDays],
    ["clinical", "Clinical", Stethoscope],
    ["clinical", "Chart Notes", Stethoscope],
    ["eecp", "EECP", Activity],
    ["operations", "Operations", CalendarDays],
    ["communication", "Communication", MessagesSquare],
    ["labs", "Labs", FlaskConical],
    ["images", "Images", ImageIcon],
    ["documents", "Documents", FileText],
    ["injections", "Injections", Syringe],
    ["referrals", "Referrals", Share2],
    ["messages", "Messages", Mail],
    ["channels", "Channels", Hash],
    ["tasks", "Tasks", CheckCircle2],
    ["billing", "Billing", DollarSign],
    ["inventory", "Inventory", Package],
    ["analytics", "Analytics", BarChart3],
    ["administration", "Administration", Settings],
    ["administration", "Settings", Settings],
  ] as const;

  const currentFacility = me.data.facilities.find((f: Row) => f.id === branch);

  return (
    <AppContext.Provider value={context}>
      <div
        className="app-shell"
        onClick={() => {
          if (userMenuOpen) setUserMenuOpen(false);
          if (waffleOpen) setWaffleOpen(false);
        }}
      >
        <div className="workspace">
          {/* Authentic CharmHealth Topbar & Navigation Strip */}
          <header className="charm-global-topbar">
            <div className="charm-header-top-row">
              <div className="charm-header-left-group">
                {/* 9-Dot Waffle App Launcher */}
                <button
                  type="button"
                  className="charm-waffle-btn"
                  title="CharmHealth App Launcher"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWaffleOpen(!waffleOpen);
                  }}
                  aria-label="App Launcher"
                >
                  <span className="waffle-grid-icon">
                    <span /><span /><span />
                    <span /><span /><span />
                    <span /><span /><span />
                  </span>
                </button>

                {/* Charm Logo */}
                <div className="charm-logo-area" onClick={() => navigate("/home")} title="charmEHR">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill="#d32f2f"
                      stroke="#f59e0b"
                      strokeWidth="1.6"
                    />
                  </svg>
                  <span className="charm-logo-text-orange">charm</span>
                  <span className="charm-logo-text-navy">EHR</span>
                </div>

                {/* Horizontal Top Navigation Bar - Clean, White, No Dark Sidebar */}
                <nav className="charm-top-nav" aria-label="Global Navigation">
                  {navItems
                    .filter(([key, title]) => {
                      if (title === "Chart Notes" || title === "Settings") return false;
                      if (key === "administration") return user.role === "admin";
                      if (key === "clinical") return clinicalRoles.includes(user.role);
                      if (key === "eecp") return user.role !== "billing";
                      return ["home", "patients", "calendar", "clinical", "eecp", "operations", "communication", "administration"].includes(key);
                    })
                    .map(([key, title]) => (
                      <button
                        key={key + title}
                        aria-label={title}
                        className={
                          page === key ||
                          (page === "encounter" && key === "clinical") ||
                          (page === "calendar" && (key === "calendar" || key === "operations")) ||
                          (page === "settings" && key === "administration")
                            ? "active"
                            : ""
                        }
                        onClick={() => navigate("/" + key)}
                      >
                        <span>{title}</span>
                      </button>
                    ))}
                </nav>
              </div>

              {/* Right Controls */}
              <div className="charm-header-right-controls">
                {page !== "home" && (
                  <div className="charm-header-search-compact">
                    <Search size={14} color="#64748b" />
                    <input
                      aria-label="Find a patient"
                      placeholder="Search Patient by Name / ID"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className="charm-add-pat-mini"
                      title="Add Patient"
                      onClick={() => setModal("patient")}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="charm-btn-telehealth"
                  onClick={() => notify("TeleHealth session initialized.")}
                >
                  <PhoneCall size={13} />
                  <span>Enable TeleHealth</span>
                </button>

                <div className="charm-branch-selector-wrap">
                  <Building2 size={14} color="#475569" />
                  <select
                    aria-label="Active branch"
                    className="charm-branch-dropdown"
                    value={currentBranch}
                    onChange={(e) => {
                      setSession(me.data.csrf, e.target.value);
                      setActiveBranch(e.target.value);
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
                      <option key={f.id} value={f.id} label={f.name.replace("Heal Your Heart · ", "")}>
                        {f.name.replace("Heal Your Heart · ", "")}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="charm-icon-btn-round"
                  aria-label="Notifications"
                  onClick={() => notify("No new notifications.")}
                  title="Notifications"
                >
                  <Bell size={15} />
                  <span className="charm-bell-dot" />
                </button>

                <button
                  className="charm-icon-btn-round"
                  aria-label="Settings"
                  onClick={() => navigate("/administration")}
                  title="Settings"
                >
                  <Settings size={15} />
                </button>

                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="charm-avatar-menu-trigger"
                    style={{ background: "none", border: 0, padding: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserMenuOpen(!userMenuOpen);
                    }}
                    title="User Profile"
                  >
                    <div className="charm-user-avatar-circle">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                  </button>

                  {userMenuOpen && (
                    <div className="charm-user-popup" onClick={(e) => e.stopPropagation()}>
                      <div className="charm-popup-header">
                        <strong>{user.name}</strong>
                        <small>{user.role} · ID: 20001463661</small>
                        <div style={{ marginTop: 4, fontSize: 11, color: "#059669" }}>
                          ● {currentFacility?.name.replace("Heal Your Heart · ", "") || "Branch"}
                        </div>
                      </div>
                      <button
                        className="charm-popup-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/administration");
                        }}
                      >
                        <Settings size={14} />
                        <span>My Profile & Preferences</span>
                      </button>
                      <button
                        className="charm-popup-item"
                        onClick={() => {
                          setUserMenuOpen(false);
                          notify("Screen locked. Re-enter credentials to continue.");
                        }}
                      >
                        <Lock size={14} />
                        <span>Lock Screen</span>
                      </button>
                      <button
                        className="charm-popup-item danger"
                        aria-label="Sign out"
                        onClick={async () => {
                          await api("/auth/logout", "POST", {});
                          setSession("", "");
                          qc.clear();
                          navigate("/home");
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="charm-avatar-badge-circle" title={user.name}>
                  <User size={15} color="#0f4c81" />
                </div>
              </div>
            </div>

            {/* 9-Dot Waffle App Launcher Popover */}
            {waffleOpen && (
              <div className="charm-waffle-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="charm-waffle-head">
                  <span>CharmHealth Application Launcher</span>
                  <button type="button" onClick={() => setWaffleOpen(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="charm-waffle-grid">
                  {launcherModules.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        className="charm-waffle-item"
                        onClick={() => {
                          setWaffleOpen(false);
                          navigate(m.route);
                        }}
                      >
                        <div className="charm-waffle-icon-box">
                          <Icon size={20} />
                        </div>
                        <span>{m.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Signature CharmHealth Teal Search Banner when on Home (Image 2) */}
            {page === "home" && (
              <div className="charm-home-teal-banner">
                <div className="charm-teal-search-pill">
                  <Search size={18} color="#64748b" />
                  <input
                    aria-label="Find a patient"
                    placeholder="Search Patient by Name / ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="charm-pill-add-pat"
                    title="Add Patient"
                    onClick={() => setModal("patient")}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Search Dropdown Results */}
            {search.length > 1 && (
              <div className="search-results" style={{ position: "absolute", top: page === "home" ? 115 : 55, left: page === "home" ? "calc(50% - 360px)" : 240, width: 720, zIndex: 999 }}>
                {searchResults.data?.items.map((p: Row) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate("/patients/" + p.id);
                      setSearch("");
                    }}
                  >
                    <strong>{p.name}</strong>
                    <small>
                      MRN: {p.mrn} · {p.phone || "No phone"}
                    </small>
                  </button>
                ))}
                {searchResults.data?.items.length === 0 && (
                  <p style={{ padding: 12, margin: 0, color: "#64748b", fontSize: 12 }}>
                    No matching patients found.
                  </p>
                )}
              </div>
            )}
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
            {page === "calendar" && <OperationsPage initialTab="Schedule" />}
            {page === "encounter" && (
              <EncounterEditor id={parts[1]} patientId={parts[2]} />
            )}
            {page === "eecp" && <EECPPage />}
            {page === "operations" && <OperationsPage />}
            {page === "communication" && <CommunicationPage />}
            {page === "administration" && <AdministrationPage />}
            {page === "settings" && <AdministrationPage />}
            {page === "labs" && <LabsPage />}
            {page === "images" && <ImagesPage />}
            {page === "documents" && <DocumentsPage />}
            {page === "injections" && <InjectionsPage />}
            {page === "referrals" && <ReferralsPage />}
            {page === "messages" && <MessagesPage />}
            {page === "channels" && <ChannelsPage />}
            {page === "tasks" && <TasksPage />}
            {page === "billing" && <OperationsPage initialTab="Billing" />}
            {page === "inventory" && <OperationsPage initialTab="Inventory" />}
            {page === "analytics" && <OperationsPage initialTab="Analytics" />}
            {![
              "home",
              "patients",
              "clinical",
              "calendar",
              "encounter",
              "eecp",
              "operations",
              "communication",
              "administration",
              "settings",
              "labs",
              "images",
              "documents",
              "injections",
              "referrals",
              "messages",
              "channels",
              "tasks",
              "billing",
              "inventory",
              "analytics",
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

        {/* Right Floating Utility Rail matching CharmHealth */}
        <aside className="charm-floating-rail" aria-label="Quick Utilities">
          <button title="Refer a Friend" onClick={() => notify("Referral portal opened.")}>
            <Gift size={15} />
          </button>
          <button title="Add-ons & Extensions" onClick={() => notify("Add-ons manager.")}>
            <Puzzle size={15} />
          </button>
          <button title="Help & Support" onClick={() => notify("Help center.")}>
            <HelpCircle size={15} />
          </button>
          <button title="Layout Split View" onClick={() => notify("Toggle layout.")}>
            <Layers size={15} />
          </button>
          <button title="Keyboard Shortcuts" onClick={() => notify("Shortcuts: Shift+K")}>
            <Command size={15} />
          </button>
        </aside>

        {/* Bottom Collaboration Dock matching CharmHealth */}
        <footer className="charm-collab-dock">
          <div className="charm-dock-left">
            <button className="charm-dock-btn" onClick={() => navigate("/tasks")}>
              <Pin size={12} />
              <span>My Pins</span>
            </button>
            <button className="charm-dock-btn" onClick={() => navigate("/messages")}>
              <MessageCircle size={12} />
              <span>Chats</span>
              <span className="charm-dock-badge-red">1</span>
            </button>
            <button className="charm-dock-btn" onClick={() => navigate("/channels")}>
              <Hash size={12} />
              <span>Channels</span>
            </button>
            <button className="charm-dock-btn" onClick={() => navigate("/communication")}>
              <Layers size={12} />
              <span>Threads</span>
            </button>
            <button className="charm-dock-btn" onClick={() => navigate("/administration")}>
              <Users size={12} />
              <span>People</span>
            </button>
          </div>
          <div className="charm-dock-right">
            <button className="charm-dock-phone-btn" title="Phone Dialpad" onClick={() => notify("Telephony dialpad ready.")}>
              <PhoneCall size={12} />
            </button>
          </div>
        </footer>
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
      )}
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
