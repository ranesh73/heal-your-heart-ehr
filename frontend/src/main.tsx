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
  InventoryPage,
  AnalyticsPage,
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
      {/* 14-Module Authentic CharmHealth Launcher Grid */}
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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
    { id: "administration", label: "Settings & Admin", route: "/administration", icon: Settings },
  ];

  const isMoreActive = moreNavItems.some(
    (m) => page === m.id || (m.id === "administration" && page === "settings")
  );

  const isHome = page === "home";
  const currentFacility = me.data.facilities.find((f: Row) => f.id === branch);

  return (
    <AppContext.Provider value={context}>
      <div
        className={`app-shell ${isHome ? "is-home" : "has-sidebar"}`}
        onClick={() => {
          if (userMenuOpen) setUserMenuOpen(false);
          if (waffleOpen) setWaffleOpen(false);
          if (moreMenuOpen) setMoreMenuOpen(false);
        }}
      >
        {/* Contextual CharmHealth Left Sidebar - Hidden on Home, Visible inside opened modules */}
        {!isHome && (
          <nav className="charm-global-sidebar" aria-label="Global Navigation">
            <button
              type="button"
              className="charm-sidebar-top-brand"
              onClick={() => navigate("/home")}
              title="Heal Your Heart EHR · Home"
              aria-label="Home"
            >
              <HeartPulse size={24} className="charm-sidebar-brand-icon" />
            </button>

            <div className="charm-sidebar-nav-list">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.activeMatch
                  ? item.activeMatch.includes(page)
                  : page === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    title={item.label}
                    className={`charm-sidebar-btn ${isActive ? "active" : ""}`}
                    onClick={() => navigate(item.route)}
                  >
                    <div className="charm-sidebar-icon-wrap">
                      <Icon size={22} />
                      {item.badge ? (
                        <span className="charm-sidebar-badge-count">{item.badge}</span>
                      ) : null}
                    </div>
                    <span className="charm-sidebar-btn-label">{item.label}</span>
                  </button>
                );
              })}

              <div className="charm-sidebar-divider" />

              {/* More Action with Dropdown Flyout */}
              <div className="charm-sidebar-more-wrap">
                <button
                  type="button"
                  aria-label="More"
                  title="More Modules"
                  className={`charm-sidebar-btn ${isMoreActive ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreMenuOpen(!moreMenuOpen);
                  }}
                >
                  <div className="charm-sidebar-icon-wrap">
                    <MoreHorizontal size={22} />
                  </div>
                  <span className="charm-sidebar-btn-label">More</span>
                </button>

                {moreMenuOpen && (
                  <div
                    className="charm-sidebar-more-flyout"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="charm-more-flyout-head">
                      <span>Clinical & Ops Modules</span>
                    </div>
                    {moreNavItems.map((m) => {
                      const MIcon = m.icon;
                      const isSubActive =
                        page === m.id ||
                        (m.id === "administration" && page === "settings");
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`charm-more-flyout-item ${isSubActive ? "active" : ""}`}
                          onClick={() => {
                            setMoreMenuOpen(false);
                            navigate(m.route);
                          }}
                        >
                          <MIcon size={16} />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}

        {/* Main Workspace Area (Full width on Home, Beside Sidebar inside modules) */}
        <div className={`workspace ${isHome ? "workspace-full" : "workspace-with-sidebar"}`}>
          {/* Authentic CharmHealth Topbar Strip (NO horizontal navigation bar) */}
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

                {/* Heal Your Heart EHR Logo */}
                <div
                  className="charm-logo-area"
                  onClick={() => navigate("/home")}
                  title="Heal Your Heart EHR"
                >
                  <HeartPulse size={22} className="brand-logo-icon" />
                  <span className="charm-logo-text-teal">Heal Your Heart</span>
                  <span className="charm-logo-badge">EHR</span>
                </div>
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
                  <span>Heal Your Heart EHR · Application Launcher</span>
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

            {/* Signature CharmHealth Teal Search Banner when on Home */}
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
              <div className="search-results" style={{ position: "absolute", top: page === "home" ? 115 : 48, left: page === "home" ? "calc(50% - 360px)" : undefined, right: page === "home" ? undefined : 330, width: page === "home" ? 720 : 380, zIndex: 999 }}>
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

          <main className={page === "encounter" ? "main-encounter" : (page === "patients" && parts[1] ? "main-patient-chart" : undefined)}>
            {page === "home" && (
              <Home
                onRegister={() => setModal("patient")}
                onBook={() => setModal("appointment")}
                onOpenWaffle={() => setWaffleOpen(true)}
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
            {page === "settings" && <AdministrationPage />}
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
        <footer className={`charm-collab-dock ${isHome ? "dock-full" : "dock-with-sidebar"}`}>
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
