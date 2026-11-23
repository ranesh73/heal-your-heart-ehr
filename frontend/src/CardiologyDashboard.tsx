import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HeartPulse,
  CalendarDays,
  Users,
  ClipboardList,
  FlaskConical,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Video,
  FileText,
  TrendingUp,
  AlertCircle,
  Stethoscope,
  IndianRupee,
} from "lucide-react";
import { api, Row, navigate, today, formatClinicalDate } from "./api";
import { useApp } from "./context";

export function CardiologyDashboard({
  onRegister,
  onBook,
}: {
  onRegister?: () => void;
  onBook?: () => void;
}) {
  const { user, currentFacilityId, patients } = useApp() as any;
  const branchId = currentFacilityId || "";

  // 1. Operational Queries
  const apptsQuery = useQuery({
    queryKey: ["appointments", branchId],
    queryFn: () => api<Row[]>("/appointments"),
  });

  const tasksQuery = useQuery({
    queryKey: ["clinical-tasks", branchId],
    queryFn: () => api<Row[]>("/clinical-tasks"),
  });

  const eecpPlansQuery = useQuery({
    queryKey: ["eecp-plans", branchId],
    queryFn: () => api<Row[]>("/eecp/plans"),
  });

  const labOrdersQuery = useQuery({
    queryKey: ["lab-orders", branchId],
    queryFn: () => api<Row[]>("/labs/orders"),
  });

  const patientsQuery = useQuery({
    queryKey: ["dashboard-patients", branchId],
    queryFn: () => api<{ items: Row[] }>("/patients?limit=10"),
  });

  const todayStr = today();
  const appointments = apptsQuery.data || [];
  const todayAppts = appointments.filter(
    (a) => a.date === todayStr || (a.start_time && a.start_time.startsWith(todayStr))
  );

  const tasks = tasksQuery.data || [];
  const pendingTasks = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "Cancelled"
  );

  const eecpPlans = eecpPlansQuery.data || [];
  const activeEecpCourses = eecpPlans.filter(
    (p) => p.status === "in_progress" || p.status === "active" || !p.status
  );

  const labOrders = labOrdersQuery.data || [];
  const pendingLabs = labOrders.filter(
    (l) => l.status === "Ordered" || l.status === "Pending" || l.status === "In Progress"
  );

  const patientList = patientsQuery.data?.items || (Array.isArray(patients) ? patients : patients?.items) || [];
  const recentPatients = patientList.slice(0, 5);

  return (
    <div className="charm-home-launcher-container max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B6E75] to-[#168C89] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#99F6E4] text-xs font-semibold uppercase tracking-wider">
            <HeartPulse size={16} />
            <span>Cardiology & EECP Clinical Practice</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-white">
            Welcome back, {user?.name || "Clinician"}
          </h1>
          <p className="text-sm text-teal-50 mt-1 max-w-xl">
            Today is {formatClinicalDate(todayStr)}. All clinical workflows, appointment schedules, and EECP therapy sessions are synchronized.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onRegister && (
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-[#0B6E75] font-semibold text-xs shadow-xs hover:bg-teal-50 transition-colors"
            >
              <Plus size={15} />
              <span>Register Patient</span>
            </button>
          )}
          {onBook && (
            <button
              type="button"
              onClick={onBook}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#084F54] text-white font-semibold text-xs border border-teal-600/40 hover:bg-[#063B3F] transition-colors"
            >
              <CalendarDays size={15} />
              <span>Schedule Visit</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Key Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <div
          onClick={() => navigate("/calendar")}
          className="bg-white rounded-xl border border-[#E1E8E8] p-5 hover:border-[#0B6E75] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Visits</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B6E75] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {todayAppts.length}
            </span>
            <span className="text-xs text-[#64748B]">scheduled</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0B6E75] font-medium flex items-center gap-1">
            <span>View Calendar</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Card 2: Active EECP Courses */}
        <div
          onClick={() => navigate("/eecp")}
          className="bg-white rounded-xl border border-[#E1E8E8] p-5 hover:border-[#0B6E75] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Active EECP</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#B83B4A] flex items-center justify-center group-hover:scale-105 transition-transform">
              <HeartPulse size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {activeEecpCourses.length}
            </span>
            <span className="text-xs text-[#64748B]">treatment plans</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0B6E75] font-medium flex items-center gap-1">
            <span>EECP Workspace</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Card 3: Pending Lab Reviews */}
        <div
          onClick={() => navigate("/labs")}
          className="bg-white rounded-xl border border-[#E1E8E8] p-5 hover:border-[#0B6E75] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Labs</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center group-hover:scale-105 transition-transform">
              <FlaskConical size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {pendingLabs.length}
            </span>
            <span className="text-xs text-[#64748B]">awaiting review</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0B6E75] font-medium flex items-center gap-1">
            <span>Diagnostic Orders</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Card 4: Outstanding Tasks */}
        <div
          onClick={() => navigate("/tasks")}
          className="bg-white rounded-xl border border-[#E1E8E8] p-5 hover:border-[#0B6E75] hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-semibold uppercase tracking-wider">Care Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0284C7] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {pendingTasks.length}
            </span>
            <span className="text-xs text-[#64748B]">pending actions</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0B6E75] font-medium flex items-center gap-1">
            <span>Task Worklist</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div className="bg-white rounded-xl border border-[#E1E8E8] p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-[#0F172A] mb-3">Clinical Workspaces</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { id: "patients", title: "Patients", desc: "Charts & Directory", icon: Users, route: "/patients" },
            { id: "calendar", title: "Calendar", desc: "Provider Schedule", icon: CalendarDays, route: "/calendar" },
            { id: "chart-notes", title: "Chart Notes", desc: "SOAP & Consults", icon: ClipboardList, route: "/chart-notes" },
            { id: "eecp", title: "EECP Therapy", desc: "35-Hour Treatment", icon: HeartPulse, route: "/eecp" },
            { id: "labs", title: "Labs", desc: "Biomarkers & Results", icon: FlaskConical, route: "/labs" },
            { id: "images", title: "Images", desc: "Echo, ECG & Scans", icon: FileText, route: "/images" },
            { id: "billing", title: "Billing", desc: "Invoices & Ledger", icon: IndianRupee, route: "/billing" },
            { id: "tasks", title: "Tasks", desc: "Team Worklist", icon: CheckCircle2, route: "/tasks" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => navigate(m.route)}
                className="charm-grid-module-card flex flex-col items-center text-center p-3 rounded-lg border border-[#E2E8F0] hover:border-[var(--color-primary-clinical,#0B6E75)] hover:bg-[#F8FAFC] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E8F4F3] text-[var(--color-primary-clinical,#0B6E75)] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <span className="font-semibold text-xs text-[#0F172A] group-hover:text-[var(--color-primary-clinical,#0B6E75)] whitespace-nowrap w-full block">
                  {m.title}
                </span>
                <span className="text-[11px] text-[#64748B] whitespace-nowrap w-full block mt-0.5">
                  {m.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Today's Appointments & Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments Schedule Preview */}
        <div className="bg-white rounded-xl border border-[#E1E8E8] p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[var(--color-primary-clinical,#0B6E75)]" />
              <h2 className="text-sm font-bold text-[#0F172A]">Today's Appointment Schedule</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="text-xs text-[var(--color-primary-clinical,#0B6E75)] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Full Calendar</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex-1 divide-y divide-[#F1F5F9]">
            {todayAppts.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-xs">
                No appointments scheduled for today ({formatClinicalDate(todayStr)}).
              </div>
            ) : (
              todayAppts.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => {
                    if (appt.patient_id) navigate(`/patients/${appt.patient_id}`);
                    else navigate("/calendar");
                  }}
                  className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 text-center">
                      <span className="text-xs font-mono font-bold text-[#0F172A] block">
                        {appt.start_time?.slice(11, 16) || appt.time || "09:00"}
                      </span>
                      <span className="text-[10px] text-[#64748B] uppercase">
                        {appt.duration_minutes ? `${appt.duration_minutes}m` : "30m"}
                      </span>
                    </div>
                    <div className="border-l border-[#E2E8F0] pl-3">
                      <div className="font-semibold text-xs text-[#0F172A]">
                        {appt.patient_name || "Patient Consultation"}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {appt.type || "Cardiology Review"} · Token #{appt.token_number || "—"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        appt.status === "Completed"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : appt.status === "Checked In"
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {appt.status || "Scheduled"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white rounded-xl border border-[#E1E8E8] p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[var(--color-primary-clinical,#0B6E75)]" />
              <h2 className="text-sm font-bold text-[#0F172A]">Active Patients</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="text-xs text-[var(--color-primary-clinical,#0B6E75)] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Directory</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex-1 divide-y divide-[#F1F5F9]">
            {recentPatients.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-xs">
                No patients found in current facility.
              </div>
            ) : (
              recentPatients.map((p: Row) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E8F4F3] text-[var(--color-primary-clinical,#0B6E75)] flex items-center justify-center font-bold text-xs">
                      {(p.name || p.first_name || "P").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#0F172A]">
                        {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        MRN: {p.mrn} · {p.sex || "—"} · {p.age ? `${p.age}y` : "Adult"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#0B6E75] font-medium hover:underline flex items-center gap-1">
                      <span>View Chart</span>
                      <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
