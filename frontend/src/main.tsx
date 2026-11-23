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
import { AppShell } from "./AppShell";
import { CardiologyDashboard } from "./CardiologyDashboard";
import { AICopilotDrawer } from "./AICopilotDrawer";
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
  Video,
  ChevronDown,
  Building2,
  Gift,
  Puzzle,
  Command,
  User,
  X,
  MoreHorizontal,
  ClipboardList,
  Folder,
  CheckSquare,
  MessageSquare,
  Receipt,
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
import { CharmChartNotesGlobal } from "./charmChartNotesGlobal";
import { EECPPage } from "./eecp";
import {
  OperationsPage,
  CalendarPage,
  BillingPage,
  AnalyticsPage,
  CommunicationPage,
  AdministrationPage,
} from "./operations";
import { InventoryPage } from "./inventory/InventoryPage";
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
import { TaskNotificationCenter } from "./clinicalTasks";
import {
  SettingsDashboard,
  IndividualSettingPage,
  FloatingToolbar,
  useKeyboardShortcuts,
} from "./settings";
import { DASHBOARD_ICONS } from "./DashboardIcons";
import { HealYourHeartLogo } from "./HealYourHeartLogo";
import { LandingPage } from "./LandingPage";
import { LoginPage } from "./LoginPage";
import { SignUpPage } from "./SignUpPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { PatientPhrApp } from "./phr/PatientPhrApp";
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
  { id: "settings", title: "Settings", sub: "Practice System Hub", icon: Settings, route: "/settings" },
];

const specializedModules = [
  { id: "labs", title: "Diagnostic Labs", sub: "Biomarkers & Orders", icon: FlaskConical, route: "/labs" },
  { id: "images", title: "Imaging & Radiology", sub: "Echo, ECG & CAG", icon: ImageIcon, route: "/images" },
  { id: "documents", title: "Clinical Documents", sub: "Intake & Consent Records", icon: FileText, route: "/documents" },
  { id: "injections", title: "Injections & MAR", sub: "Med Administration & Vials", icon: Syringe, route: "/injections" },
  { id: "referrals", title: "Specialist Referrals", sub: "Inbound & Outbound Care", icon: Share2, route: "/referrals" },
  { id: "billing", title: "Practice Billing", sub: "Invoices, Receipts & Ledger", icon: DollarSign, route: "/billing" },
  { id: "inventory", title: "Medical Inventory", sub: "Clinical Supplies & Stock", icon: Package, route: "/inventory" },
  { id: "analytics", title: "Clinical Analytics", sub: "Operational Quality Reports", icon: BarChart3, route: "/analytics" },
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
const snapshot = () => {
  const hash = location.hash.slice(1);
  return hash || "/";
};

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
    defaultValues: { email: "doctor@demo.local", password: "password123" },
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
          <Badge value="Practice Clinical Portal" />
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
                  onClick={() => {
                    setValue("email", qr.email);
                    setValue("password", "password123");
                  }}
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
            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              Demo password: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, color: "#0f172a" }}>password123</code> (or <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, color: "#0f172a" }}>OoDC4hdJkhoRrPWYSjk0TdLI</code>)
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
  onRegister: _onRegister,
  onBook: _onBook,
  onOpenWaffle: _onOpenWaffle,
}: {
  onRegister?: () => void;
  onBook?: () => void;
  onOpenWaffle?: () => void;
}) {
  return (
    <div className="charm-home-wrap">
      {/* 15-Module Premium Vector Launcher Grid */}
      <div className="charm-home-launcher-container">
        <div className="charm-home-grid-3x5">
          {launcherModules.map((m) => {
            return (
              <div
                key={m.id}
                className="charm-grid-module-card"
                onClick={() => navigate(m.route)}
              >
                <div className="charm-grid-icon-box">
                  <img
                    src={`/assets/dashboard/tile_${m.id}_clean.svg`}
                    alt={m.title}
                    className="charm-grid-tile-img"
                    width={96}
                    height={96}
                    loading="eager"
                  />
                </div>
                <div className="charm-grid-card-label">{m.title}</div>
              </div>
            );
          })}
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
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState(branch);

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 5000);
  };
  const refresh = async () => {
    await qc.invalidateQueries();
  };

  useEffect(() => {
    const handleSettingUpdated = async () => {
      await qc.invalidateQueries();
      await qc.refetchQueries({ queryKey: ["me"] });
    };
    window.addEventListener("hyh_setting_updated", handleSettingUpdated);
    window.addEventListener("hyh_facility_updated", handleSettingUpdated);
    window.addEventListener("hyh_staff_updated", handleSettingUpdated);
    window.addEventListener("hyh_resource_updated", handleSettingUpdated);
    window.addEventListener("hyh_appointment_statuses_updated", handleSettingUpdated);
    window.addEventListener("hyh_visit_types_updated", handleSettingUpdated);
    window.addEventListener("hyh_auth_change", handleSettingUpdated);
    return () => {
      window.removeEventListener("hyh_setting_updated", handleSettingUpdated);
      window.removeEventListener("hyh_facility_updated", handleSettingUpdated);
      window.removeEventListener("hyh_staff_updated", handleSettingUpdated);
      window.removeEventListener("hyh_resource_updated", handleSettingUpdated);
      window.removeEventListener("hyh_appointment_statuses_updated", handleSettingUpdated);
      window.removeEventListener("hyh_visit_types_updated", handleSettingUpdated);
      window.removeEventListener("hyh_auth_change", handleSettingUpdated);
    };
  }, [qc]);

  // Global Keyboard Shortcuts (Shift + K, Alt navigation, Escape)
  useKeyboardShortcuts({
    onOpenShortcuts: () => setShortcutsModalOpen(true),
    onCloseModals: () => {
      setShortcutsModalOpen(false);
      setUserMenuOpen(false);
      setWaffleOpen(false);
      setMoreMenuOpen(false);
    },
  });

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

  const cleanPath = path.startsWith("/") ? path : "/" + path;
  if (cleanPath === "/" || cleanPath === "") {
    return <LandingPage />;
  }
  if (cleanPath === "/login") {
    return (
      <LoginPage
        onLoginSuccess={async () => {
          await qc.refetchQueries({ queryKey: ["me"] });
          navigate("/home");
        }}
      />
    );
  }
  if (cleanPath === "/signup") {
    return <SignUpPage />;
  }
  if (cleanPath === "/forgot-password") {
    return <ForgotPasswordPage />;
  }
  if (cleanPath.startsWith("/phr")) {
    return <PatientPhrApp path={cleanPath} />;
  }

  if (me.isLoading) return <Loading />;
  if (!logged)
    return (
      <LoginPage
        onLoginSuccess={async () => {
          await qc.refetchQueries({ queryKey: ["me"] });
          navigate("/home");
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
  const page = (!parts[0] || parts[0] === "login") ? "home" : parts[0];

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

  // Authentic CharmHealth Left Sidebar Navigation Items (matching user screenshot)
  const sidebarNavItems = [
    { id: "patients", label: "Patients", route: "/patients", icon: Users },
    { id: "calendar", label: "Calendar", route: "/calendar", icon: CalendarDays },
    {
      id: "clinical",
      label: "Chart Notes",
      route: "/chart-notes",
      icon: ClipboardList,
      activeMatch: ["clinical", "chart-notes", "encounter"],
    },
    { id: "labs", label: "Labs", route: "/labs", icon: FlaskConical, badge: 1 },
    { id: "images", label: "Images", route: "/images", icon: ImageIcon },
    { id: "documents", label: "Documents", route: "/documents", icon: Folder },
    { id: "injections", label: "Injections", route: "/injections", icon: Syringe },
    { id: "referrals", label: "Referrals", route: "/referrals", icon: Share2 },
  ];

  const moreNavItems = [
    { id: "messages", label: "Messages", route: "/messages", icon: MessageSquare },
    { id: "tasks", label: "Tasks", route: "/tasks", icon: CheckSquare },
    { id: "billing", label: "Billing", route: "/billing", icon: Receipt },
    { id: "inventory", label: "Inventory", route: "/inventory", icon: Package },
    { id: "eecp", label: "EECP Workspace", route: "/eecp", icon: HeartPulse },
    { id: "analytics", label: "Analytics", route: "/analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", route: "/settings", icon: Settings },
    { id: "administration", label: "Practice Admin", route: "/administration", icon: Building2 },
  ];

  const isMoreActive = moreNavItems.some(
    (m) => page === m.id || (m.id === "administration" && page === "settings")
  );

  const isFullWidthPage = page === "home" || page === "settings";
  const isHome = page === "home";
  const currentFacility = me.data.facilities.find((f: Row) => f.id === branch);

  const activePatientId =
    (page === "patients" && parts[1]) ? parts[1] :
    (page === "encounter" && parts[2]) ? parts[2] :
    undefined;
  const activePatient = activePatientId
    ? (patients.data?.items || []).find((p: Row) => p.id === activePatientId)
    : undefined;
  const activePatientName = activePatient
    ? `${activePatient.first_name || ""} ${activePatient.last_name || ""}`.trim()
    : undefined;

  return (
    <AppContext.Provider value={context}>
      <AppShell
        user={user}
        facilities={me.data.facilities}
        currentBranch={currentBranch}
        onBranchChange={(newBranchId) => {
          setSession(me.data.csrf, newBranchId);
          setActiveBranch(newBranchId);
          navigate("/home");
          qc.removeQueries({
            predicate: (q) =>
              q.queryKey[0] !== "me" && q.queryKey[0] !== "metadata",
          });
          setSearch("");
          setToast("Branch changed.");
        }}
        activePage={page}
        search={search}
        onSearchChange={setSearch}
        searchResults={searchResults}
        onSelectPatient={(pId) => {
          navigate("/patients/" + pId);
          setSearch("");
        }}
        onNewPatient={() => setModal("patient")}
        onNewAppointment={() => setModal("appointment")}
        notify={notify}
        onLogout={async () => {
          await api("/auth/logout", "POST", {});
          setSession("", "");
          qc.clear();
          navigate("/");
        }}
        onSwitchRole={async (email) => {
          try {
            const r = await api("/auth/login", "POST", { email, password: "password123" });
            setSession(r.csrf, r.facility_id || "");
            await qc.invalidateQueries();
            await qc.refetchQueries({ queryKey: ["me"] });
            notify(`Switched role to ${r.user?.role || email}`);
          } catch (e: any) {
            notify("Could not switch role: " + (e?.message || "Error"));
          }
        }}
      >
        <div className={`w-full min-w-0 ${page === "encounter" ? "main-encounter" : (page === "patients" && parts[1] ? "main-patient-chart" : "")}`}>
          {page === "home" && (
            <CardiologyDashboard
              onRegister={() => setModal("patient")}
              onBook={() => setModal("appointment")}
            />
          )}
          {page === "patients" &&
            (parts[1] ? <PatientChart id={parts[1]} /> : <PatientsPage />)}
          {(page === "clinical" || page === "chart-notes") && <CharmChartNotesGlobal />}
          {page === "calendar" && <CalendarPage />}
          {page === "encounter" && (
            <EncounterEditor id={parts[1]} patientId={parts[2]} />
          )}
          {page === "eecp" && <EECPPage />}
          {page === "operations" && <CalendarPage />}
          {page === "communication" && <CommunicationPage />}
          {page === "administration" && <AdministrationPage />}
          {page === "settings" && (
            <IndividualSettingPage
              categoryId={parts[1] || "facility"}
              optionId={parts[2] || (parts[1] ? undefined : "facility-list")}
            />
          )}
          {page === "templates" && (
            <IndividualSettingPage categoryId="templates" optionId={parts[1] || "my_templates"} />
          )}

          {page === "labs" && <LabsPage />}
          {page === "images" && <ImagesPage />}
          {page === "documents" && <DocumentsPage />}
          {page === "injections" && <InjectionsPage />}
          {page === "referrals" && <ReferralsPage />}
          {page === "messages" && <MessagesPage />}
          {page === "channels" && <ChannelsPage />}
          {page === "tasks" && <TasksPage />}
          {page === "billing" && <BillingPage />}
          {page === "inventory" && <InventoryPage />}
          {page === "analytics" && <AnalyticsPage />}
          {![
            "home",
            "patients",
            "clinical",
            "chart-notes",
            "calendar",
            "encounter",
            "eecp",
            "operations",
            "communication",
            "administration",
            "settings",
            "templates",
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
        </div>
      </AppShell>

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
      <AICopilotDrawer
        currentUser={user}
        activeFacilityId={branch}
        selectedPatientId={activePatientId}
        selectedPatientName={activePatientName}
        currentPage={page}
        hideFloatingLauncher={true}
      />
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
