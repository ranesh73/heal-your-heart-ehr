import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  HeartPulse,
  CalendarDays,
  Users,
  ClipboardList,
  FlaskConical,
  CheckCircle2,
  ArrowRight,
  Plus,
  FileText,
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
  const { currentFacilityId, facilities, patients } = useApp() as any;
  const branchId = currentFacilityId || "";
  const activeBranchName =
    facilities?.find((f: Row) => f.id === branchId)?.name || "";

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

  const patientList =
    patientsQuery.data?.items || (Array.isArray(patients) ? patients : patients?.items) || [];
  const recentPatients = patientList.slice(0, 5);

  return (
    <div className="-mx-[18px] -my-[11px] w-[calc(100%+36px)] space-y-5">
      {/* Clean Editorial Practice Header (No user name, no AI banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-snug">
            Cardiology & EECP Overview
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 mt-0.5 flex-wrap">
            <span>{formatClinicalDate(todayStr)}</span>
            {activeBranchName && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-600">
                  {activeBranchName.replace("Heal Your Heart · ", "")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {onBook && (
            <button
              type="button"
              onClick={onBook}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-[13px] font-semibold rounded-xl bg-white text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              <CalendarDays size={15} className="text-[#0B6E75]" />
              <span>Schedule Visit</span>
            </button>
          )}
          {onRegister && (
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex items-center gap-2 h-9 px-4 text-[13px] font-semibold rounded-xl bg-[#0B6E75] text-white shadow-xs hover:bg-[#09595F] transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Key Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Appointments */}
        <div
          onClick={() => navigate("/calendar")}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#0B6E75]/60 hover:shadow-[0_8px_20px_-6px_rgba(11,110,117,0.14)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Today's Visits</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0B6E75] flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarDays size={19} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[30px] leading-none font-bold text-slate-900 tabular-nums tracking-tight">
              {todayAppts.length}
            </span>
            <span className="text-[13px] text-slate-500">scheduled</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[12.5px] text-[#0B6E75] font-semibold flex items-center justify-between">
            <span>View Calendar</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Active EECP Courses */}
        <div
          onClick={() => navigate("/eecp")}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#0B6E75]/60 hover:shadow-[0_8px_20px_-6px_rgba(11,110,117,0.14)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Active EECP</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#B83B4A] flex items-center justify-center group-hover:scale-105 transition-transform">
              <HeartPulse size={19} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[30px] leading-none font-bold text-slate-900 tabular-nums tracking-tight">
              {activeEecpCourses.length}
            </span>
            <span className="text-[13px] text-slate-500">treatment plans</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[12.5px] text-[#0B6E75] font-semibold flex items-center justify-between">
            <span>EECP Workspace</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Pending Lab Reviews */}
        <div
          onClick={() => navigate("/labs")}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#0B6E75]/60 hover:shadow-[0_8px_20px_-6px_rgba(11,110,117,0.14)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Pending Labs</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FlaskConical size={19} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[30px] leading-none font-bold text-slate-900 tabular-nums tracking-tight">
              {pendingLabs.length}
            </span>
            <span className="text-[13px] text-slate-500">awaiting review</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[12.5px] text-[#0B6E75] font-semibold flex items-center justify-between">
            <span>Diagnostic Orders</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Outstanding Tasks */}
        <div
          onClick={() => navigate("/tasks")}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-[#0B6E75]/60 hover:shadow-[0_8px_20px_-6px_rgba(11,110,117,0.14)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[12px] font-semibold uppercase tracking-wider">Care Tasks</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={19} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[30px] leading-none font-bold text-slate-900 tabular-nums tracking-tight">
              {pendingTasks.length}
            </span>
            <span className="text-[13px] text-slate-500">pending actions</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[12.5px] text-[#0B6E75] font-semibold flex items-center justify-between">
            <span>Task Worklist</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Airy 4x2 Clinical Workspaces */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Clinical Workspaces</h2>
          <span className="text-[12.5px] text-slate-500">Quick module launcher</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { id: "patients", title: "Patients", desc: "Charts & Directory", icon: Users, route: "/patients", tint: "bg-teal-50 text-[#0B6E75]" },
            { id: "calendar", title: "Calendar", desc: "Provider Schedule", icon: CalendarDays, route: "/calendar", tint: "bg-sky-50 text-sky-700" },
            { id: "chart-notes", title: "Chart Notes", desc: "SOAP & Consults", icon: ClipboardList, route: "/chart-notes", tint: "bg-indigo-50 text-indigo-700" },
            { id: "eecp", title: "EECP Therapy", desc: "35-Hour Treatment", icon: HeartPulse, route: "/eecp", tint: "bg-rose-50 text-rose-600" },
            { id: "labs", title: "Labs", desc: "Biomarkers & Results", icon: FlaskConical, route: "/labs", tint: "bg-amber-50 text-amber-700" },
            { id: "images", title: "Images", desc: "Echo, ECG & Scans", icon: FileText, route: "/images", tint: "bg-cyan-50 text-cyan-700" },
            { id: "billing", title: "Billing", desc: "Invoices & Ledger", icon: IndianRupee, route: "/billing", tint: "bg-emerald-50 text-emerald-700" },
            { id: "tasks", title: "Tasks", desc: "Team Worklist", icon: CheckCircle2, route: "/tasks", tint: "bg-slate-100 text-slate-700" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                onClick={() => navigate(m.route)}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0B6E75]/50 hover:shadow-[0_6px_16px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group w-full"
              >
                <div className={`w-11 h-11 shrink-0 rounded-xl ${m.tint} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon size={20} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-[13.5px] text-slate-900 group-hover:text-[#0B6E75] truncate transition-colors">
                    {m.title}
                  </span>
                  <span className="text-[12px] text-slate-500 truncate mt-0.5">
                    {m.desc}
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-300 group-hover:text-[#0B6E75] group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Asymmetric 12-Col Bottom Split: Today's Appointments & Active Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Today's Appointments Schedule Preview */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B6E75] flex items-center justify-center">
                <CalendarDays size={17} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Today's Appointment Schedule</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="text-[12.5px] text-[#0B6E75] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Calendar</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {todayAppts.length === 0 ? (
              <div className="py-10 px-4 flex flex-col items-center justify-center text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
                  <CalendarDays size={20} />
                </div>
                <p className="text-[13.5px] font-semibold text-slate-700">
                  No appointments scheduled for today
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {formatClinicalDate(todayStr)} · Schedule a consult or EECP therapy session
                </p>
                {onBook && (
                  <button
                    type="button"
                    onClick={onBook}
                    className="mt-3.5 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#0B6E75] hover:bg-[#09595F] text-white text-[12.5px] font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Schedule Visit</span>
                  </button>
                )}
              </div>
            ) : (
              todayAppts.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => {
                    if (appt.patient_id) navigate(`/patients/${appt.patient_id}`);
                    else navigate("/calendar");
                  }}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 text-center">
                      <span className="text-[13px] font-mono font-bold text-slate-900 block">
                        {appt.start_time?.slice(11, 16) || appt.time || "09:00"}
                      </span>
                      <span className="text-[11px] text-slate-500 uppercase">
                        {appt.duration_minutes ? `${appt.duration_minutes}m` : "30m"}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-3.5">
                      <div className="font-semibold text-[13.5px] text-slate-900">
                        {appt.patient_name || "Patient Consultation"}
                      </div>
                      <div className="text-[12px] text-slate-500 mt-0.5">
                        {appt.type || "Cardiology Review"} · Token #{appt.token_number || "—"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${appt.status === "Completed"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : appt.status === "Checked In"
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
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

        {/* Active Patients */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0B6E75] flex items-center justify-center">
                <Users size={17} />
              </div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Active Patients</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="text-[12.5px] text-[#0B6E75] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Directory</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="flex-1 divide-y divide-slate-100">
            {recentPatients.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-[13px]">
                No patients found in current facility.
              </div>
            ) : (
              recentPatients.map((p: Row) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2.5 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#E8F4F3] text-[#0B6E75] flex items-center justify-center font-bold text-[12px]">
                      {(p.name || p.first_name || "P").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[13.5px] text-slate-900 group-hover:text-[#0B6E75] truncate transition-colors">
                        {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()}
                      </div>
                      <div className="text-[12px] text-slate-500 font-mono truncate mt-0.5">
                        {p.mrn} · {p.sex || "—"} · {p.age ? `${p.age}y` : "Adult"}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 ml-2 text-[12px] text-[#0B6E75] font-semibold px-2.5 py-1 rounded-lg bg-teal-50/0 group-hover:bg-teal-50 flex items-center gap-1 transition-colors">
                    <span>Chart</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
