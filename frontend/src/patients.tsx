import { useEffect, useState } from "react";
import { CharmChartNotesGlobal } from "./charmChartNotesGlobal";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Heart,
  HeartPulse,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Upload,
  User,
  X,
  LayoutDashboard,
  ShieldAlert,
  Syringe,
  Share2,
  Receipt,
  RotateCcw,
  FlaskConical,
  Image as ImageIcon,
  MessagesSquare,
  Clock,
  Sliders,
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
import {
  MedicationsSection,
  InjectionsSection,
  VaccinesSection,
  VitalsSection,
  FlowsheetSection,
  AddPrescriptionModal,
  AddInjectionModal,
  AddVaccineModal,
  AddVitalsModal,
  formatDoctorName,
} from "./clinicalWorkflows";
import {
  DiagnosisTemplatesModal,
  PrescriptionTemplatesModal,
  SupplementTemplatesModal,
  SymptomsTemplatesModal,
  AssessmentNotesTemplatesModal,
  AddPrescriptionModal as CharmAddPrescriptionModal,
  NewEncounterModal,
} from "./charmTemplates";
import { EECPPatient } from "./eecp";
import { BillingTable, AppointmentTable } from "./operations";
import { CharmLabOrders } from "./charmLabOrders";
import { CharmImages } from "./charmImages";
import {
  QuickChartNotesCanvas,
  BriefChartNotesCanvas,
  ComprehensiveChartNotesCanvas,
  NurseInputView,
  QuestionnairesView,
  ProcedureCodesView,
} from "./charmChartTypes";

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

export function PatientHeader({
  p,
  chart,
  onAction,
  onSectionSelect,
  onCreateEncounter,
}: {
  p: Row;
  chart: Row;
  onAction?: (modal: string) => void;
  onSectionSelect?: (section: string) => void;
  onCreateEncounter?: () => void;
}) {
  const { user, staff, facilities } = useApp();
  const [plusOpen, setPlusOpen] = useState(false);
  const [moreHeaderOpen, setMoreHeaderOpen] = useState(false);

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
  const latestVital = chart.vitals?.[0];
  const activeAllergies = (chart.allergies || []).filter((a: Row) => a.status === "active");

  return (
    <div className="charm-patient-banner patient-header">
      {/* 1. Left: Profile Block matching CharmHealth */}
      <div className="charm-patient-profile-block">
        <button
          type="button"
          className="charm-back-btn"
          onClick={() => navigate("/patients")}
          title="Back to Patient Directory"
          aria-label="Back to Patient Directory"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="charm-banner-avatar">
          {p.first_name?.[0]}{p.last_name?.[0]}
        </div>

        <div className="charm-patient-identity-lines">
          <h1 className="charm-pat-name">{p.name}</h1>
          <div className="charm-pat-meta-line">
            <span>{p.sex || p.gender || "Male"}/ {age}</span>
            <span className="charm-id-inline">ID:{p.mrn || p.record_number || p.id?.slice(0, 8)}</span>
          </div>
          <div className="charm-pat-dob-line">
            DOB:{day(p.dob)}
          </div>
        </div>
      </div>

      {/* 2. Center-Right: 4 Metric Badges matching CharmHealth */}
      <div className="charm-banner-cards-row">
        {/* Allergies Card */}
        <div className={`charm-stat-card card-allergies ${activeAllergies.length ? "has-alert" : ""}`}>
          <span className="card-label">Allergies</span>
          <span className="card-val">
            {activeAllergies.length
              ? activeAllergies.map((a: Row) => a.allergen || a.substance).join(", ")
              : "Not Recorded"}
          </span>
        </div>

        {/* Visits Card (soft yellow tint) */}
        <div className="charm-stat-card card-visits">
          <span className="card-label">Visits</span>
          <div className="card-val-multi">
            <span>Last : {last ? day(last.start_at) : "Nov 05, 2026"}</span>
            <span>Next : {next ? day(next.start_at) : "Nov 07, 2026"}</span>
          </div>
        </div>

        {/* Vitals Card */}
        <div className="charm-stat-card card-vitals">
          <div className="card-val-multi" style={{ justifyContent: "center" }}>
            <span>Wt : {latestVital?.weight_kg || p.weight_kg || "68"} kgs</span>
            <span>BMI : {latestVital?.bmi || p.bmi || ""}</span>
          </div>
        </div>

        {/* Balance Due Card (soft pink/purple tint) */}
        <div className="charm-stat-card card-balance">
          <div className="card-balance-head">
            <span className="card-label">Balance Due</span>
            <button
              type="button"
              className="card-link-btn"
              onClick={() => onSectionSelect?.("Billing")}
            >
              Show Details
            </button>
          </div>
          <div className="card-val-multi">
            <span>Patient : Rs.{chart.balance_paise ? (chart.balance_paise / 100).toFixed(2) : "57500.00"}</span>
            <span>Insurance : Rs.0.00</span>
          </div>
        </div>
      </div>

      {/* 3. Right: (+) and (...) Action Buttons */}
      <div className="charm-header-actions-group">
        {/* Quick Action (+) button */}
        <div className="charm-header-popover-wrap">
          <button
            type="button"
            className="charm-circle-action-btn plus-btn"
            title="Quick Actions"
            aria-label="Quick Actions"
            onClick={() => {
              setPlusOpen(!plusOpen);
              setMoreHeaderOpen(false);
            }}
          >
            <Plus size={16} />
          </button>
          {plusOpen && (
            <div className="charm-header-dropdown-menu" onMouseLeave={() => setPlusOpen(false)}>
              {onCreateEncounter && (
                <button
                  type="button"
                  className="charm-dropdown-item"
                  onClick={() => {
                    setPlusOpen(false);
                    onCreateEncounter();
                  }}
                >
                  <Stethoscope size={14} /> Start consultation
                </button>
              )}
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("medications");
                }}
              >
                <Pill size={14} /> Quick Rx
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("vitals");
                }}
              >
                <Activity size={14} /> Record vitals
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("injections");
                }}
              >
                <Syringe size={14} /> Log injection
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("vaccines");
                }}
              >
                <ShieldAlert size={14} /> Record vaccine
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("appointment");
                }}
              >
                <CalendarDays size={14} /> Book appointment
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("tasks");
                }}
              >
                <CheckSquare size={14} /> Add task
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("messages");
                }}
              >
                <MessageSquare size={14} /> Send message
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setPlusOpen(false);
                  onAction?.("documents");
                }}
              >
                <Upload size={14} /> Upload document
              </button>
            </div>
          )}
        </div>

        {/* Secondary Actions (...) button */}
        <div className="charm-header-popover-wrap">
          <button
            type="button"
            className="charm-circle-action-btn more-btn"
            title="More Options"
            aria-label="More Options"
            onClick={() => {
              setMoreHeaderOpen(!moreHeaderOpen);
              setPlusOpen(false);
            }}
          >
            <MoreHorizontal size={16} />
          </button>
          {moreHeaderOpen && (
            <div className="charm-header-dropdown-menu" onMouseLeave={() => setMoreHeaderOpen(false)}>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setMoreHeaderOpen(false);
                  onAction?.("edit");
                }}
              >
                <Edit2 size={14} /> Edit Demographics
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setMoreHeaderOpen(false);
                  onSectionSelect?.("Patient Details");
                }}
              >
                <User size={14} /> Patient Details
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setMoreHeaderOpen(false);
                  onSectionSelect?.("Billing");
                }}
              >
                <Receipt size={14} /> Billing / Invoices
              </button>
              <button
                type="button"
                className="charm-dropdown-item"
                onClick={() => {
                  setMoreHeaderOpen(false);
                  window.print();
                }}
              >
                <Printer size={14} /> Print Chart
              </button>
            </div>
          )}
        </div>
      </div>
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
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [subTab, setSubTab] = useState("Face Sheet");
  const [moreOpen, setMoreOpen] = useState(false);
  const [showNewEncounterModal, setShowNewEncounterModal] = useState(false);
  const {
    data: chart,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["chart", branch, id],
    queryFn: () => api("/patients/" + id),
  });
  useEffect(() => {
    setActiveSection("Dashboard");
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
  const createEncounter = () => {
    setShowNewEncounterModal(true);
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
    Images: "images",
    Documents: "documents",
  };
  const writable = (kind: string) =>
    (
      ({
        history: ["doctor", "assistant", "admin", "therapist", "reception"],
        diagnoses: ["doctor", "assistant", "admin"],
        allergies: ["doctor", "assistant", "admin", "therapist", "reception"],
        medications: ["doctor", "assistant", "admin"],
        vitals: ["doctor", "assistant", "therapist", "admin", "reception"],
        orders: ["doctor", "assistant", "admin", "therapist", "reception"],
        images: ["doctor", "assistant", "admin", "therapist", "reception"],
        documents: clinicalRoles,
        injections: ["doctor", "assistant", "therapist", "admin", "reception"],
        vaccines: ["doctor", "assistant", "admin", "reception"],
      })[kind] || ["doctor", "admin", "assistant"]
    ).includes(user.role);

  const sections22 = [
    { id: "Dashboard", label: "Dashboard", count: "" },
    { id: "Patient Details", label: "Patient Details", count: "" },
    { id: "Consultations", label: "Consultations", count: chart.encounters?.length || 0 },
    { id: "Diagnoses", label: "Diagnoses", count: chart.diagnoses?.length || 0 },
    { id: "Medications", label: "Medications", count: chart.medications?.length || 0 },
    { id: "Allergies", label: "Allergies", count: chart.allergies?.length || 0 },
    { id: "Vitals", label: "Vitals", count: chart.vitals?.length || 0 },
    { id: "Injections", label: "Injections", count: chart.injections?.length || 0 },
    { id: "Vaccines", label: "Vaccines", count: chart.vaccines?.length || 0 },
    { id: "Lab Records", label: "Lab Records", count: (chart.orders || []).filter((o: any) => o.kind === 'Lab').length || "" },
    { id: "Images", label: "Images", count: (chart.orders || []).filter((o: any) => o.kind === 'Image' || o.kind === 'Imaging').length || "" },
    { id: "Documents", label: "Documents", count: chart.documents?.length || 0 },
    { id: "Referrals", label: "Referrals", count: "" },
    { id: "Appointments", label: "Appointments", count: chart.appointments?.length || 0 },
    { id: "Messages", label: "Messages", count: chart.messages?.length || 0 },
    { id: "Chat History", label: "Chat History", count: "" },
    { id: "Tasks", label: "Tasks", count: chart.tasks?.length || 0 },
    { id: "Recalls", label: "Recalls", count: "" },
    { id: "Billing", label: "Billing", count: chart.invoices?.length || 0 },
    { id: "EECP Treatment", label: "EECP Treatment", count: chart.plans?.length || 0 },
    { id: "Customize", label: "+ Customize", count: "" },
  ];

  return (
    <div className="charm-chart-page">
      <PatientHeader
        p={p}
        chart={chart}
        onAction={(m) => setModal(m)}
        onSectionSelect={(sec) => setActiveSection(sec)}
        onCreateEncounter={createEncounter}
      />

      <ErrorBox error={error} />

      {/* CharmHealth 22-Section Navigation Layout */}
      <div className="charm-chart-layout">
        <aside className="charm-chart-sidebar" role="tablist">
          {sections22.map((sec) => {
            return (
              <button
                key={sec.id}
                role="tab"
                aria-selected={activeSection === sec.id}
                data-tab={sec.id}
                className={`charm-sidebar-link ${activeSection === sec.id ? "active" : ""}`}
                onClick={() => {
                  setActiveSection(sec.id);
                  if (sec.id === "Appointments") setTab("Appointments");
                  else if (sec.id === "Billing") setTab("Billing");
                  else if (sec.id === "EECP Treatment") setTab("EECP Treatment");
                  else if (sec.id === "Consultations") setTab("Consultations");
                  else if (sec.id === "Diagnoses") {
                    setTab("Medical Records");
                    setRecordTab("Diagnoses");
                  } else if (sec.id === "Medications") {
                    setTab("Medical Records");
                    setRecordTab("Prescriptions");
                  } else if (sec.id === "Allergies") {
                    setTab("Medical Records");
                    setRecordTab("Allergies");
                  } else if (sec.id === "Vitals") {
                    setTab("Medical Records");
                    setRecordTab("Vitals");
                  } else if (sec.id === "Lab Records") {
                    setTab("Medical Records");
                    setRecordTab("Orders & Results");
                  } else if (sec.id === "Images") {
                    setTab("Medical Records");
                    setRecordTab("Images");
                  } else if (sec.id === "Documents") {
                    setTab("Medical Records");
                    setRecordTab("Documents");
                  } else if (sec.id === "Dashboard" || sec.id === "Patient Details") {
                    setTab("Overview");
                  } else {
                    setTab("More");
                  }
                }}
              >
                <span className="charm-sidebar-link-text">{sec.label}</span>
                {sec.count ? (
                  <span className="charm-sidebar-badge">{sec.count}</span>
                ) : null}
              </button>
            );
          })}
        </aside>

        <section className="charm-chart-content">
          {(() => {
            const resolvedSection = (() => {
              if (activeSection === "Dashboard") {
                if (tab === "Consultations") return "Consultations";
                if (tab === "EECP Treatment") return "EECP Treatment";
                if (tab === "Appointments") return "Appointments";
                if (tab === "Billing") return "Billing";
                if (tab === "Medical Records") {
                  if (recordTab === "Orders & Results") return "Lab Records";
                  if (recordTab === "Images") return "Images";
                  if (recordTab === "Prescriptions") return "Medications";
                  return recordTab;
                }
                if (tab === "More") return "Tasks";
              }
              return activeSection;
            })();

            if (resolvedSection === "Dashboard") {
              return (
                <div>
                  {/* CharmHealth Dashboard Subtabs */}
                  <div className="charm-subtabs">
                    <div className="charm-subtabs-left">
                      {[
                        "Face Sheet",
                        "Flowsheet",
                        "Treatment Plan",
                        "Health Screening",
                        "Timeline",
                        "Tag Cloud",
                      ].map((st) => (
                        <button
                          key={st}
                          role="tab"
                          aria-selected={subTab === st}
                          className={`charm-subtab-btn ${subTab === st ? "active" : ""}`}
                          onClick={() => setSubTab(st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <div className="charm-subtabs-right">
                      <button className="charm-subtab-link" onClick={() => window.print()}>
                        Print
                      </button>
                      <button
                        className="charm-subtab-link"
                        onClick={() => {
                          const summaryText = `PATIENT SUMMARY - HEAL YOUR HEART EHR\nName: ${p.name}\nMRN: ${p.record_number}\nDOB: ${p.dob} (${p.age} yrs / ${p.gender})\nPhone: ${p.phone || "N/A"}\nEmail: ${p.email || "N/A"}\n\nACTIVE DIAGNOSES:\n${(chart.diagnoses || []).map((d: Row) => `- ${d.description} [${d.code || ""}]`).join("\n") || "None"}\n\nCURRENT MEDICATIONS:\n${(chart.medications || []).map((m: Row) => `- ${m.trade_name || m.name} (${m.dose || ""}) : ${m.maen || ""}`).join("\n") || "None"}\n\nALLERGIES:\n${(chart.allergies || []).map((a: Row) => `- ${a.substance || a.allergen} (${a.severity || ""})`).join("\n") || "None"}\n\nRECENT VITALS:\n${(chart.vitals || []).slice(0, 3).map((v: Row) => `- ${v.created_at ? dateTime(v.created_at) : ""}: BP ${v.bp_sys}/${v.bp_dia} mmHg, HR ${v.pulse_bpm} bpm, SpO2 ${v.spo2_pct}%`).join("\n") || "None"}`;
                          const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `patient_summary_${p.record_number || p.name}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download
                      </button>
                      <button className="charm-subtab-link" onClick={() => setActiveSection("Customize")}>
                        Customize
                      </button>
                    </div>
                  </div>

                  {subTab === "Face Sheet" && (
                    <div>
                      {/* CharmHealth 2-column clinical grid */}
                      <div className="charm-facesheet-grid">
                        {/* Left Column */}
                        <div className="charm-clinical-col">
                          {/* ALLERGIES */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Allergies</span>
                              {writable("allergies") && (
                                <button
                                  className="charm-subtab-link"
                                  onClick={() => setModal("allergies")}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                            <div className="charm-card-body">
                              {chart.allergies?.length ? (
                                chart.allergies.map((a: Row) => (
                                  <div key={a.id} className="charm-allergy-row">
                                    <div>
                                      <div className="charm-allergy-name">{a.substance || a.allergen || "Allergen"}</div>
                                      <div className="charm-allergy-sub">
                                        {a.reaction ? `Reaction: ${a.reaction}` : ""} {a.severity ? `· ${a.severity}` : ""}
                                      </div>
                                    </div>
                                    <Badge value={a.status || "active"} />
                                  </div>
                                ))
                              ) : (
                                <p className="charm-empty-text">No data recorded</p>
                              )}
                            </div>
                          </div>

                          {/* MEDICATIONS */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Medications</span>
                              {writable("medications") && (
                                <button
                                  className="charm-subtab-link"
                                  onClick={() => setModal("medications")}
                                >
                                  + Prescribe
                                </button>
                              )}
                            </div>
                            <div className="charm-card-body">
                              {chart.medications?.filter((x: Row) => x.status !== "discontinued")?.length ? (
                                chart.medications
                                  .filter((x: Row) => x.status !== "discontinued")
                                  .map((m: Row) => (
                                    <div key={m.id} className="charm-med-row">
                                      <div className="charm-med-title">
                                        {m.trade_name || m.name}{m.dose ? ` ${m.dose}` : ""} {m.generic_name ? `[${m.generic_name}]` : ""}
                                      </div>
                                      <div className="charm-med-desc">
                                        {m.maen || m.frequency || "1 - 0 - 0"} for {m.duration || "Day(s)"}
                                        {m.status && m.status !== "active" ? ` · (${m.status})` : ""}
                                      </div>
                                    </div>
                                  ))
                              ) : (
                                <p className="charm-empty-text">No data recorded</p>
                              )}
                            </div>
                          </div>

                          {/* SUPPLEMENTS */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Supplements</span>
                            </div>
                            <div className="charm-card-body">
                              <p className="charm-empty-text">No data recorded</p>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="charm-clinical-col">
                          {/* DIAGNOSES */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Diagnoses</span>
                              {writable("diagnoses") && (
                                <button
                                  className="charm-subtab-link"
                                  onClick={() => setModal("diagnoses")}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                            <div className="charm-card-body">
                              {chart.diagnoses?.length ? (
                                chart.diagnoses.map((d: Row) => (
                                  <div key={d.id} className="charm-diag-row">
                                    <div className="charm-diag-title">
                                      {d.description} {d.code ? `[${d.code}]` : ""}
                                    </div>
                                    <div className="charm-diag-date">
                                      {d.created_at ? day(d.created_at) : (d.onset_date ? day(d.onset_date) : "07 Nov 2026")}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="charm-empty-text">No data recorded</p>
                              )}
                            </div>
                          </div>

                          {/* HISTORY */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">History</span>
                              {writable("history") && (
                                <button
                                  className="charm-subtab-link"
                                  onClick={() => setModal("history")}
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                            <div className="charm-card-body">
                              {chart.history?.length ? (
                                chart.history.map((h: Row) => (
                                  <div key={h.id} className="charm-diag-row">
                                    <div>
                                      <strong style={{ color: "var(--brand-teal-deep)" }}>{h.category || "Medical"}:</strong> {h.content || h.description}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="charm-empty-text">No data recorded</p>
                              )}
                            </div>
                          </div>

                          {/* IMPLANTED DEVICES */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Implanted Devices</span>
                            </div>
                            <div className="charm-card-body">
                              <p className="charm-empty-text">No data recorded</p>
                            </div>
                          </div>

                          {/* VACCINES */}
                          <div className="charm-clinical-card">
                            <div className="charm-card-head">
                              <span className="charm-card-title">Vaccines</span>
                            </div>
                            <div className="charm-card-body">
                              <p className="charm-empty-text">No data recorded</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {subTab === "Flowsheet" && (
                    <FlowsheetSection
                      patient={p}
                      vitals={chart.vitals || []}
                      writable={writable("vitals")}
                      onRefresh={() => refetch()}
                    />
                  )}

                  {subTab === "Treatment Plan" && (
                    <Panel title="Cardiology Treatment Protocol · 35-Hour EECP Therapy">
                      {chart.plans?.length ? (
                        chart.plans.map((pl: Row) => (
                          <div key={pl.id} style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong>{pl.program}</strong>
                              <Badge value={pl.status} />
                            </div>
                            <p style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                              Completed: <strong>{pl.completed} of {pl.session_count} hours</strong> · Start Date: {pl.start_date ? day(pl.start_date) : "—"}
                            </p>
                            <progress max={pl.session_count} value={pl.completed} style={{ height: 8, margin: "8px 0", width: "100%" }} />
                            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                              <Button variant="secondary" onClick={() => setActiveSection("EECP Treatment")}>
                                Open Daily Treatment Chart
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty title="No active treatment plan" body="Enroll patient from EECP Treatment tab." />
                      )}
                    </Panel>
                  )}

                  {subTab === "Timeline" && (
                    <Panel title="Patient Comprehensive Care Timeline">
                      <div className="timeline">
                        {[
                          ...(chart.encounters || []).map((e: Row) => ({ ...e, type: "Consultation", title: e.visit_type })),
                          ...chart.appointments.map((a: Row) => ({ ...a, type: "Appointment", title: a.visit_type })),
                          ...(chart.documents || []).map((d: Row) => ({ ...d, type: "Document" })),
                        ]
                          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                          .map((r: Row) => (
                            <div key={r.id}>
                              <span className="timeline-dot" />
                              <small>{r.created_at ? dateTime(r.created_at) : "—"} · {r.type}</small>
                              <strong>{r.title}</strong>
                            </div>
                          ))}
                      </div>
                    </Panel>
                  )}

                  {subTab === "Health Screening" && (
                    <Panel title="Cardiovascular Health Screening Matrix">
                      <Table
                        rows={[
                          { exam: "Lipid Profile (TC, LDL, HDL, Triglycerides)", interval: "Every 6 Months", status: "Due Nov 2026", result: "Normal" },
                          { exam: "12-Lead Resting Electrocardiogram (ECG)", interval: "Annual", status: "Completed Oct 2026", result: "Sinus Rhythm" },
                          { exam: "2D Echocardiogram / LVEF Evaluation", interval: "Annual", status: "Completed Oct 2026", result: "LVEF 48%" },
                          { exam: "Glycated Hemoglobin (HbA1c)", interval: "Every 3 Months", status: "Due Dec 2026", result: "Pending" },
                        ]}
                        columns={[
                          { title: "Screening Evaluation", render: (r) => <strong>{r.exam}</strong> },
                          { title: "Recommended Interval", render: (r) => <span>{r.interval}</span> },
                          { title: "Schedule Status", render: (r) => <Badge value={r.status} /> },
                          { title: "Latest Finding", render: (r) => <span>{r.result}</span> },
                        ]}
                      />
                    </Panel>
                  )}

                  {subTab === "Tag Cloud" && (
                    <Panel title="Clinical Condition & Workflow Tags">
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 10 }}>
                        {["Refractory Angina", "CCS Class III", "Post-CABG", "EECP Enrolled", "Hypertension", "Dyslipidemia", "High Fall Risk", "Adherent"].map((t) => (
                          <span key={t} style={{ padding: "4px 12px", borderRadius: 16, background: "#f1f5f9", color: "#0f4c81", fontWeight: 600, fontSize: 12, border: "1px solid #cbd5e1" }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    </Panel>
                  )}
                </div>
              );
            }

            if (resolvedSection === "Patient Details") {
              return (
                <Panel
                  title="Patient Details & Demographics"
                  actions={
                    writable("edit") && (
                      <Button variant="secondary" onClick={() => setModal("edit")}>
                        <Edit2 size={14} /> Edit Demographics
                      </Button>
                    )
                  }
                >
                  <div className="summary-body">
                    <dl className="details">
                      <dt>Full Name</dt>
                      <dd><strong>{p.name}</strong></dd>
                      <dt>Patient ID / MRN</dt>
                      <dd><span className="mono">{p.record_number || p.id?.slice(0, 8)}</span></dd>
                      <dt>Date of Birth</dt>
                      <dd>{p.dob} ({p.age} yrs · {p.gender})</dd>
                      <dt>Contact Phone</dt>
                      <dd>{p.phone || "—"}</dd>
                      <dt>Email Address</dt>
                      <dd>{p.email || "—"}</dd>
                      <dt>Residential Address</dt>
                      <dd>
                        {[p.address, p.area, p.city, p.state, p.postal_code]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </dd>
                      <dt>Residency Type</dt>
                      <dd>{p.residency || "Domestic"}</dd>
                      <dt>Emergency Contact</dt>
                      <dd>
                        {p.emergency_name ? `${p.emergency_name} (${p.emergency_phone || "No phone"})` : "—"}
                      </dd>
                      <dt>Attending Clinician</dt>
                      <dd>{staff.find((s) => s.id === p.provider_id)?.name || "Dr. Ananya Demo"}</dd>
                      <dt>Registration Date</dt>
                      <dd>{p.created_at ? day(p.created_at) : "01 Oct 2026"}</dd>
                    </dl>
                  </div>
                </Panel>
              );
            }

            if (resolvedSection === "Consultations") {
              return (
                <Panel
                  title="Consultation History"
                  actions={
                    <button
                      type="button"
                      className="charm-btn-consultation"
                      onClick={() => setShowNewEncounterModal(true)}
                    >
                      <Plus size={14} /> Consultation
                    </button>
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
                            <small className="cell-sub">{e.created_at ? dateTime(e.created_at) : "—"}</small>
                          </>
                        ),
                      },
                      {
                        title: "Clinician",
                        render: (e) => staff.find((s) => s.id === e.provider_id)?.name || "—",
                      },
                      {
                        title: "Chief complaint",
                        render: (e) => e.chief_complaint || "Draft not yet documented",
                      },
                      { title: "Status", render: (e) => <Badge value={e.status} /> },
                    ]}
                    empty="No consultation encounters recorded for this patient."
                  />
                </Panel>
              );
            }

            if (resolvedSection === "Diagnoses") {
              return (
                <Panel
                  title="Diagnoses"
                  actions={
                    writable("diagnoses") && (
                      <AddButton onClick={() => setModal("diagnoses")}>Add Diagnosis</AddButton>
                    )
                  }
                >
                  <RecordList
                    kind="diagnoses"
                    rows={chart.diagnoses || []}
                    onSelect={(r) => {
                      setSelected(r);
                      setRecordTab("Diagnoses");
                      setModal("detail");
                    }}
                  />
                </Panel>
              );
            }

            if (resolvedSection === "Medications") {
              return (
                <MedicationsSection
                  patient={p}
                  medications={chart.medications || []}
                  writable={writable("medications")}
                  onRefresh={() => refetch()}
                />
              );
            }

            if (resolvedSection === "Allergies") {
              return (
                <Panel
                  title="Allergies & Adverse Reactions"
                  actions={
                    writable("allergies") && (
                      <AddButton onClick={() => setModal("allergies")}>Add Allergy</AddButton>
                    )
                  }
                >
                  <RecordList
                    kind="allergies"
                    rows={chart.allergies || []}
                    onSelect={(r) => {
                      setSelected(r);
                      setRecordTab("Allergies");
                      setModal("detail");
                    }}
                  />
                </Panel>
              );
            }

            if (resolvedSection === "Vitals") {
              return (
                <VitalsSection
                  patient={p}
                  vitals={chart.vitals || []}
                  writable={writable("vitals")}
                  onRefresh={() => refetch()}
                />
              );
            }

            if (resolvedSection === "Injections") {
              return (
                <InjectionsSection
                  patient={p}
                  injections={chart.injections || []}
                  writable={writable("injections")}
                  onRefresh={() => refetch()}
                />
              );
            }

            if (resolvedSection === "Vaccines") {
              return (
                <VaccinesSection
                  patient={p}
                  vaccines={chart.vaccines || []}
                  writable={writable("vaccines")}
                  onRefresh={() => refetch()}
                />
              );
            }

            if (resolvedSection === "Lab Records") {
              return (
                <div style={{ marginTop: 2 }}>
                  <CharmLabOrders patientId={id} />
                </div>
              );
            }

            if (resolvedSection === "Images") {
              return (
                <div style={{ marginTop: 2 }}>
                  <CharmImages patientId={id} />
                </div>
              );
            }

            if (resolvedSection === "Documents") {
              return (
                <Panel
                  title="Clinical Documents & Uploads"
                  actions={
                    <AddButton onClick={() => setModal("documents")}>Upload Document</AddButton>
                  }
                >
                  <RecordList
                    kind="documents"
                    rows={chart.documents || []}
                    onSelect={(r) => {
                      setSelected(r);
                      setRecordTab("Documents");
                      setModal("detail");
                    }}
                  />
                </Panel>
              );
            }

            if (resolvedSection === "Referrals") {
              return (
                <Panel
                  title="Specialist Referrals"
                  actions={
                    <AddButton onClick={() => setModal("entries")}>New Referral</AddButton>
                  }
                >
                  <Empty title="No Specialist Referrals" body="External referrals and cardiologist consultations appear here." />
                </Panel>
              );
            }

            if (resolvedSection === "Appointments") {
              return (
                <Panel
                  title="Patient Appointments"
                  actions={
                    ["reception", "doctor", "therapist", "admin"].includes(user.role) && (
                      <AddButton onClick={() => setModal("appointment")}>
                        Book appointment
                      </AddButton>
                    )
                  }
                >
                  <AppointmentTable rows={chart.appointments} />
                </Panel>
              );
            }

            if (resolvedSection === "Messages") {
              return (
                <Panel
                  title="Internal Patient Communication"
                  actions={
                    <Button variant="ghost" onClick={() => setModal("messages")}>
                      <Plus size={15} /> Compose
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
              );
            }

            if (resolvedSection === "Chat History") {
              return (
                <Panel title="Patient Communication Logs & SMS/WhatsApp">
                  <Empty title="No Communication Logs" body="SMS confirmations, reminder dispatches and patient outreach history appear here." />
                </Panel>
              );
            }

            if (resolvedSection === "Tasks") {
              return (
                <Panel
                  title="Tasks, Recalls & Waiting List"
                  actions={
                    <Button variant="ghost" onClick={() => setModal("tasks")}>
                      <Plus size={15} /> Add Task
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
              );
            }

            if (resolvedSection === "Recalls") {
              return (
                <Panel
                  title="Cardiology Recalls & Preventative Reviews"
                  actions={
                    <Button variant="ghost" onClick={() => setModal("tasks")}>
                      <Plus size={15} /> Schedule Recall
                    </Button>
                  }
                >
                  <Empty title="No Scheduled Recalls" body="Preventative follow-up recalls for this patient will be listed here." />
                </Panel>
              );
            }

            if (resolvedSection === "Alerts") {
              return (
                <Panel
                  title="Clinical Alerts, Questionnaires & Additional Records"
                  actions={
                    ["doctor", "assistant", "therapist"].includes(user.role) && (
                      <Button variant="ghost" onClick={() => setModal("entries")}>
                        <Plus size={15} /> Add
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
              );
            }

            if (resolvedSection === "EECP Treatment") {
              return <EECPPatient patientId={id} chart={chart} />;
            }

            if (resolvedSection === "Billing") {
              return <BillingTable patientId={id} rows={chart.invoices || []} />;
            }

            if (resolvedSection === "Customize") {
              return (
                <Panel title="Face Sheet Customization Preferences">
                  <div style={{ maxWidth: 600, display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      Select which clinical widgets and diagnostic sections are displayed on the Face Sheet for rapid review.
                    </p>
                    {[
                      "Allergies & Adverse Reactions",
                      "Current Active Medications",
                      "Active Diagnoses & ICD Codes",
                      "Cardiovascular History & Risk Factors",
                      "EECP Therapy Progress Snapshot",
                      "Longitudinal Vitals Observations Strip",
                      "Specialist Referrals & Documents",
                    ].map((item) => (
                      <label key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" defaultChecked />
                        <span>{item}</span>
                      </label>
                    ))}
                    <div style={{ marginTop: 12 }}>
                      <Button variant="primary" onClick={() => setActiveSection("Dashboard")}>
                        Save Customization
                      </Button>
                    </div>
                  </div>
                </Panel>
              );
            }

            return null;
          })()}
        </section>
      </div>

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
      {modal === "medications" && (
        <AddPrescriptionModal
          patientId={id}
          onClose={() => setModal("")}
          onSaved={() => refetch()}
        />
      )}
      {modal === "vitals" && (
        <AddVitalsModal
          patientId={id}
          encounterId={
            user.role === "assistant" ? assistantEncounter : undefined
          }
          onClose={() => setModal("")}
          onSaved={() => refetch()}
        />
      )}
      {modal === "injections" && (
        <AddInjectionModal
          patientId={id}
          onClose={() => setModal("")}
          onSaved={() => refetch()}
        />
      )}
      {modal === "vaccines" && (
        <AddVaccineModal
          patientId={id}
          onClose={() => setModal("")}
          onSaved={() => refetch()}
        />
      )}
      {[
        "history",
        "diagnoses",
        "allergies",
        "orders",
        "tasks",
        "entries",
        "messages",
      ].includes(modal) && (
          <RecordForm
            kind={modal}
            patientId={id}
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
      {showNewEncounterModal && (
        <NewEncounterModal
          patient={chart.patient}
          staff={staff}
          onClose={() => setShowNewEncounterModal(false)}
          onCreate={async (payload) => {
            try {
              const r = await api("/encounters", "POST", {
                patient_id: id,
                provider_id:
                  payload.provider_id ||
                  (user.role === "doctor"
                    ? user.id
                    : staff.find((s) => s.role === "doctor")?.id || user.id),
                assistant_id: staff.find((s) => s.role === "assistant")?.id || null,
                visit_type: payload.visit_type || "Cardiology consultation",
                chart_type: payload.chart_type || "SOAP Template",
                mode: payload.mode || "In Person",
              });
              setShowNewEncounterModal(false);
              await refresh();
              navigate("/encounter/" + r.id + "/" + id);
            } catch (err) {
              notify("Failed to create consultation: " + String(err));
            }
          }}
        />
      )}
    </div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #008278", paddingBottom: 10, marginBottom: 18 }}>
          <div>
            <strong style={{ color: "#008278", fontSize: 18, letterSpacing: "0.5px" }}>HEAL YOUR HEART</strong>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Speciality Clinic for EECP & Preventive Cardiology</div>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", textAlign: "right" }}>
            CharmHealth Practice Portal<br />Official Clinical Document
          </div>
        </div>
        <h1 style={{ fontSize: 20, color: "#0f172a", margin: "10px 0 16px" }}>{title}</h1>
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

export function ViewTemplateModal({
  template,
  onClose,
  onInsert,
}: {
  template: Row;
  onClose: () => void;
  onInsert?: (content: string) => void;
}) {
  const [apmr, setApmr] = useState("162");
  const [targetHr, setTargetHr] = useState("138");
  const [maxHr, setMaxHr] = useState("142");
  const [bpSys, setBpSys] = useState("160");
  const [bpDia, setBpDia] = useState("90");
  const [exerciseTime, setExerciseTime] = useState("7.5");
  const [pctApmhr, setPctApmhr] = useState("87.6");
  const [meds, setMeds] = useState("Metoprolol 25mg bd");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    indication: false,
    protocol: false,
    parameters: true,
    mets: false,
  });

  const isTmt =
    template?.code === "TMT_PRACTICE" ||
    template?.name?.includes("Treadmill") ||
    template?.name?.includes("TMT");

  const handleInsert = () => {
    if (onInsert) {
      onInsert(template?.name || "Treadmill Test ( TMT )_Practice");
    }
    onClose();
  };


  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div
        className="charm-view-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="charm-view-modal-header">
          <h2>View Template</h2>
          <button
            className="charm-view-modal-close"
            onClick={onClose}
            aria-label="Close template view"
          >
            <X size={18} />
          </button>
        </div>

        <div className="charm-view-modal-meta">
          <div className="charm-view-meta-item">
            <span className="charm-view-meta-label">Template Name</span>
            <div className="charm-view-meta-box">
              {template?.name || "Treadmill Test ( TMT )_Practice"}
            </div>
          </div>
          <div className="charm-view-meta-item">
            <span className="charm-view-meta-label">Template Type</span>
            <div className="charm-view-meta-box">Review of Systems</div>
          </div>
        </div>

        <div className="charm-view-modal-body">
          {isTmt ? (
            <div className="charm-template-tree">
              {/* Node 1: Indication */}
              <div className="charm-tree-node">
                <div
                  className="charm-tree-node-title"
                  onClick={() =>
                    setExpanded((p) => ({ ...p, indication: !p.indication }))
                  }
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="charm-tree-arrow">
                    {expanded.indication ? "▼" : "▶"}
                  </span>
                  <span className="charm-tree-text">Indication for Test</span>
                </div>
                {expanded.indication && (
                  <div className="charm-tree-children">
                    {[
                      "Exertional Chest Pain",
                      "Evaluation of Known / Suspected CAD",
                      "Post-Revascularization Assessment",
                      "Exercise-Induced Arrhythmia Assessment",
                    ].map((item) => (
                      <label key={item} className="charm-tree-child-row">
                        <input type="checkbox" defaultChecked />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Node 2: Protocol Used */}
              <div className="charm-tree-node">
                <div
                  className="charm-tree-node-title"
                  onClick={() =>
                    setExpanded((p) => ({ ...p, protocol: !p.protocol }))
                  }
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="charm-tree-arrow">
                    {expanded.protocol ? "▼" : "▶"}
                  </span>
                  <span className="charm-tree-text">Protocol Used</span>
                </div>
                {expanded.protocol && (
                  <div className="charm-tree-children">
                    {[
                      "Standard Bruce Protocol",
                      "Modified Bruce Protocol",
                      "Naughton Protocol",
                    ].map((item, idx) => (
                      <label key={item} className="charm-tree-child-row">
                        <input type="checkbox" defaultChecked={idx === 0} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Node 3: Test Parameters (Interactive inline inputs) */}
              <div className="charm-tree-node expanded">
                <div
                  className="charm-tree-node-title"
                  onClick={() =>
                    setExpanded((p) => ({ ...p, parameters: !p.parameters }))
                  }
                >
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="charm-tree-arrow">
                    {expanded.parameters ? "▼" : "▶"}
                  </span>
                  <span className="charm-tree-text">Test Parameters</span>
                </div>

                {expanded.parameters && (
                  <div className="charm-tree-children">
                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span>
                        Age-Predicted Maximum Heart Rate (APMHR): (
                        <input
                          className="charm-tree-inline-input number"
                          value={apmr}
                          onChange={(e) => setApmr(e.target.value)}
                        />
                        ) bpm Formula = ( 220 – age )
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span>
                        Target Heart Rate ( 85% predicted - Vigorous exercise ):
                        (
                        <input
                          className="charm-tree-inline-input number"
                          value={targetHr}
                          onChange={(e) => setTargetHr(e.target.value)}
                        />
                        ) bpm. Formula = (220-age) x 0.85
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span className="charm-tree-arrow-sub">▶</span>
                      <span>
                        Maximum Heart Rate Achieved: [
                        <input
                          className="charm-tree-inline-input number"
                          value={maxHr}
                          onChange={(e) => setMaxHr(e.target.value)}
                        />
                        ] bpm
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span>
                        Maximum Blood Pressure Achieved: [
                        <input
                          className="charm-tree-inline-input number"
                          value={bpSys}
                          onChange={(e) => setBpSys(e.target.value)}
                        />
                        ] / [
                        <input
                          className="charm-tree-inline-input number"
                          value={bpDia}
                          onChange={(e) => setBpDia(e.target.value)}
                        />
                        ] mmHg
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span>
                        Total Exercise Time: [
                        <input
                          className="charm-tree-inline-input number"
                          value={exerciseTime}
                          onChange={(e) => setExerciseTime(e.target.value)}
                        />
                        ] minutes (Bruce Protocol)
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span>
                        [
                        <input
                          className="charm-tree-inline-input number"
                          value={pctApmhr}
                          onChange={(e) => setPctApmhr(e.target.value)}
                        />
                        ]% of Age-Predicted Maximum Heart Rate. Formula = Maximum
                        Heart rate Achieved / APMHR x 100 = (
                        <input
                          className="charm-tree-inline-input number"
                          value={pctApmhr}
                          onChange={(e) => setPctApmhr(e.target.value)}
                        />
                        ) %
                      </span>
                    </div>

                    <div className="charm-tree-interactive-row">
                      <input type="checkbox" defaultChecked />
                      <span className="charm-tree-arrow-sub">▶</span>
                      <span>
                        Rate-Limiting Medications: [
                        <input
                          className="charm-tree-inline-input text"
                          value={meds}
                          onChange={(e) => setMeds(e.target.value)}
                        />
                        ]
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Node 4: Exercise Tolerance / METs */}
              <div className="charm-tree-node">
                <div
                  className="charm-tree-node-title"
                  onClick={() =>
                    setExpanded((p) => ({ ...p, mets: !p.mets }))
                  }
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="charm-tree-arrow">
                    {expanded.mets ? "▼" : "▶"}
                  </span>
                  <span className="charm-tree-text">Exercise Tolerance / METs</span>
                </div>
                {expanded.mets && (
                  <div className="charm-tree-children">
                    {[
                      "< 5 METs (Poor exercise capacity)",
                      "5 - 7 METs (Fair exercise capacity)",
                      "7 - 10 METs (Good exercise capacity)",
                      "> 10 METs (Excellent exercise capacity)",
                    ].map((item, idx) => (
                      <label key={item} className="charm-tree-child-row">
                        <input type="checkbox" defaultChecked={idx === 2} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="charm-template-generic-view">
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {typeof template?.content === "string"
                  ? template.content
                  : JSON.stringify(template?.content, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="charm-view-modal-footer">
          {onInsert && (
            <button
              className="charm-btn-teal"
              style={{ marginRight: 8 }}
              onClick={handleInsert}
            >
              Insert into Chart Note
            </button>
          )}
          <button className="charm-btn-light-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function EncounterEditor({
  id,
  patientId,
}: {
  id: string;
  patientId: string;
}) {
  const { user, staff, facilities, refresh, notify } = useApp();
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
  const currentChartType = encounter?.chart_type || "SOAP Template";
  const subtabs =
    currentChartType === "Comprehensive"
      ? ["Questionnaires", "Nurse Input", "Physician Notes", "Procedure Codes"]
      : ["Questionnaires", "Chart Notes", "Procedure Codes"];

  const [consultSubTab, setConsultSubTab] = useState<string>(
    currentChartType === "Comprehensive" ? "Physician Notes" : "Chart Notes",
  );

  useEffect(() => {
    if (encounter?.chart_type === "Comprehensive") {
      setConsultSubTab("Physician Notes");
    } else {
      setConsultSubTab("Chart Notes");
    }
  }, [encounter?.id, encounter?.chart_type]);
  const [leftPaneOpen, setLeftPaneOpen] = useState(true);
  const [activeTplModal, setActiveTplModal] = useState<
    "diagnosis" | "prescription" | "supplement" | "symptoms" | "assessment" | "add_rx" | null
  >(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [rosTemplate, setRosTemplate] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<Row | null>(null);
  const [activeRailSection, setActiveRailSection] = useState("CC");

  // Authentic CharmHealth: Treadmill Test (TMT) Practice Clinical Parameters
  const [tmtIndication, setTmtIndication] = useState<Record<string, boolean>>({
    "Exertional Chest Pain": true,
    "Evaluation of Known / Suspected CAD": true,
  });
  const [tmtProtocol, setTmtProtocol] = useState("Standard Bruce Protocol");
  const [tmtApmhr, setTmtApmhr] = useState("");
  const [tmtTargetHr, setTmtTargetHr] = useState("");
  const [tmtMaxHr, setTmtMaxHr] = useState("142");
  const [tmtBpSys, setTmtBpSys] = useState("160");
  const [tmtBpDia, setTmtBpDia] = useState("90");
  const [tmtDurationMin, setTmtDurationMin] = useState("7");
  const [tmtDurationSec, setTmtDurationSec] = useState("30");
  const [tmtPctApmhr, setTmtPctApmhr] = useState("87.7");
  const [tmtMeds, setTmtMeds] = useState("Corbis (Bisoprolol 1.25mg)");
  const [tmtMets, setTmtMets] = useState("8.5");
  const [tmtSymptoms, setTmtSymptoms] = useState<Record<string, boolean>>({
    "No chest pain / asymptomatic": true,
  });
  const [tmtEcgChanges, setTmtEcgChanges] = useState(
    "No ischemic ST-segment depression or elevation",
  );
  const [tmtImpression, setTmtImpression] = useState(
    "Negative for inducible myocardial ischemia at 87.7% APMHR",
  );


  // Screenshot 1: 9 Cardiac Chief Complaint Questions (matches CharmHealth template)
  const ccQuestions = [
    "Chest pain, burning sensation in the chest, radiating left shoulder pain, and jaw pain",
    "Shortness of breath / Chest pain related to exertion",
    "Difficulty in climbing stairs or slopes",
    "Symptoms appear while bending down",
    "Inability to walk after meals",
    "Swelling in legs",
    "Tiredness.",
    "Lack of sleep",
    "Recent history of hospitalization for ACS/LVF",
  ];
  const [ccAnswers, setCcAnswers] = useState<Record<number, "Yes" | "No" | "">>({
    0: "Yes",
    1: "No",
    8: "Yes",
  });

  // Authentic CharmHealth: Post-EECP assessment checklist under Symptoms
  const postEecpOptions = [
    "The patient maintain the benefits.",
    "Mild increase in the symptoms compared to post-EECP",
    "Recurrent symptoms to pre-EECP level.",
    "Symptoms improved better than post EECP level.",
    "Major adverse cardiac event.",
  ];
  const [postEecpAssessment, setPostEecpAssessment] = useState<
    Record<string, boolean>
  >({
    "The patient maintain the benefits.": true,
  });

  // Authentic CharmHealth (Frames 003-005): HPI Frequency Table and Cardiac Symptoms
  const [hpiInitialAssessment, setHpiInitialAssessment] = useState(false);
  const [hpiChestPain, setHpiChestPain] = useState<"No" | "Yes" | "Other">("Yes");
  const [hpiFreq, setHpiFreq] = useState("j");
  const [hpiNitro, setHpiNitro] = useState("");
  const [hpiWalk, setHpiWalk] = useState("");
  const [hpiSob, setHpiSob] = useState<"No" | "Yes" | "Other">("Yes");
  const [hpiNyha, setHpiNyha] = useState<string>("Class I");
  const [hpiEdema, setHpiEdema] = useState<"No" | "Yes" | "Other">("Yes");
  const [hpiEdemaStatus, setHpiEdemaStatus] = useState<string>("Stable");
  const [hpiOrthopnea, setHpiOrthopnea] = useState<"Yes" | "No">("Yes");
  const [hpiPnd, setHpiPnd] = useState<"Yes" | "No">("Yes");
  const [hpiPalpitations, setHpiPalpitations] = useState<"Yes" | "No">("No");
  const [pmhInitialAssessment, setPmhInitialAssessment] = useState(false);

  // Authentic CharmHealth: Past Medical History (PMH) structured fields
  const [pmhCad, setPmhCad] = useState("2020");
  const [pmhPtca, setPmhPtca] = useState("");
  const [pmhCabg, setPmhCabg] = useState("fhf");
  const [pmhMi, setPmhMi] = useState("");
  const [pmhDm1, setPmhDm1] = useState("");
  const [pmhDm2, setPmhDm2] = useState("");
  const [pmhHtn, setPmhHtn] = useState("");
  const [pmhLipid, setPmhLipid] = useState("");

  // Authentic CharmHealth: Plan, Recommendations & Treatment Notes (frames 017-021)
  const [dietAvoidPotassium, setDietAvoidPotassium] = useState(true);
  const [dietFruits, setDietFruits] = useState(false);
  const [dietVeg, setDietVeg] = useState(false);
  const [dietOthers, setDietOthers] = useState(false);

  const [lifestyleItems, setLifestyleItems] = useState<Record<string, boolean>>({});
  const [treatmentNotesCheck, setTreatmentNotesCheck] = useState(false);
  const [treatmentNotesItems, setTreatmentNotesItems] = useState<Record<string, boolean>>({});

  const [instructionsItems, setInstructionsItems] = useState<Record<string, boolean>>({});
  const [repeatEecpCheck, setRepeatEecpCheck] = useState(false);

  // Authentic CharmHealth: Review of Systems Categories (from frame_018 & dense_frame_175)
  const rosCategories = [
    {
      category: "General",
      items: ["Weight Loss", "Weight Gain", "Cold Intolerance", "Poor Appetite"],
    },
    {
      category: "Gastroentrology",
      items: ["Abdominal Pain", "Bloating", "Black Stool"],
    },
    {
      category: "Renal",
      items: [
        "Periorbital edema",
        "Facial edema",
        "Burning micturition",
        "Low urine output",
        "Nausea",
        "Fistula",
      ],
    },
    {
      category: "Anemia",
      items: [
        "Gastrointestinal bleeding induced by DAPT",
        "Poor Iron absorption inhibited by proton pump inhibitors.",
        "Congestive heart failure(CHF).",
        "Chronic kidney disease(CKD).",
      ],
    },
    {
      category: "EECP Indications & Contraindications",
      items: [
        "Angina Pectoris",
        "Coronary Artery Disease",
        "Refractory Angina",
        "Heart Failure / Ischemic Cardiomyopathy",
      ],
    },
  ];
  const [rosHeaders, setRosHeaders] = useState<Record<string, boolean>>({
    General: true,
    Gastroentrology: true,
    Renal: true,
    Anemia: true,
    "EECP Indications & Contraindications": true,
  });
  const [rosChecked, setRosChecked] = useState<Record<string, boolean>>({});
  const [rosNotes, setRosNotes] = useState<
    Record<string, { col1: string; col2: string }>
  >({
    General: { col1: "", col2: "" },
    Gastroentrology: { col1: "", col2: "" },
    Renal: { col1: "", col2: "" },
    Anemia: { col1: "", col2: "" },
    "EECP Indications & Contraindications": { col1: "", col2: "" },
  });

  // Screenshot 3: Physical Examination 4-Column Assessment Grid
  const [peLungsAuscultation, setPeLungsAuscultation] = useState(false);
  const [peLungsOther, setPeLungsOther] = useState(false);
  const [peHeartAuscultation, setPeHeartAuscultation] = useState(false);
  const [peHeartOther, setPeHeartOther] = useState(false);
  const [peRhythm, setPeRhythm] = useState<Record<string, boolean>>({});
  const [peHeartBlock, setPeHeartBlock] = useState("");

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
    setValue,
    formState: { isDirty },
  } = useForm<Row>();

  useEffect(() => {
    if (encounter) {
      const v: Row = {};
      for (const [key] of noteFields) v[key] = encounter[key] || "";
      for (const key of [
        "outcome",
        "cad_year",
        "cabg",
        "cag",
        "ccs_class",
        "consult_notes",
        "nurse_notes",
        "physician_notes",
        "treatment_notes",
        "chart_type",
        "mode",
      ])
        v[key] = encounter[key] ?? "";
      symptoms.forEach((name, i) => {
        const row = encounter.symptoms.find((s: Row) => s.name === name);
        v["symptom_" + i] = row?.response || "Not assessed";
        v["narrative_" + i] = row?.narrative || "";
      });
      // Clean consultation start: DO NOT force preload template narratives
      v.assessment = encounter.assessment || "";
      v.plan = encounter.plan || "";
      v.chief_complaint = encounter.chief_complaint || "";
      v.consult_notes = encounter.consult_notes || "";
      v.nurse_notes = encounter.nurse_notes || "";
      v.physician_notes = encounter.physician_notes || "";
      v.treatment_notes = encounter.treatment_notes || "";
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
    (user.role === "admin" || (user.role === "doctor" && encounter.provider_id === user.id)) &&
    encounter.status === "draft";
  const old = chart.encounters.filter(
    (e: Row) => e.id !== id && e.status === "signed",
  );
  const source = old.find((e: Row) => e.id === previous) || old[0];

  const scrollTo = (elemId: string, railId: string) => {
    setActiveRailSection(railId);
    const el = document.getElementById(elemId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    setTemplateSearch(templateName);
    setTemplateDropdownOpen(false);

    const age = patientAge || 58;
    const apmhrVal = 220 - age;
    const targetVal = Math.round(apmhrVal * 0.85);

    if (templateName.includes("Treadmill") || templateName.includes("TMT")) {
      setRosTemplate("Treadmill Test ( TMT )_Practice");
      setTmtApmhr(String(apmhrVal));
      setTmtTargetHr(String(targetVal));
      setTmtMaxHr("142");
      const pct = ((142 / apmhrVal) * 100).toFixed(1);
      setTmtPctApmhr(pct);
      notify(`Loaded template: ${templateName} in Review of Systems`);
      scrollTo("sec-ros", "ROS");
    } else if (templateName.includes("EECP")) {
      if (!getValues("chief_complaint")) {
        setValue(
          "chief_complaint",
          "- Chest pain, burning sensation in the chest, radiating left shoulder pain, and jaw pain-Yes\n- Shortness of breath / Chest pain related to exertion-Yes\n- Difficulty in climbing stairs or slopes-Yes",
        );
      }
      if (!getValues("assessment")) {
        setValue(
          "assessment",
          "Patient came with chest pain, shortness of breath, tiredness, easy fatigability, swelling in the legs, not able to walk without symptoms. Known case of CAD for the past 2 years. Current cardiac risk factors include hypertension, dyslipidemia. General condition stable. Hemodynamically stable for continued EECP counterpulsation.",
        );
      }
      if (!getValues("plan")) {
        setValue(
          "plan",
          "Avoid high potassium foods:-\nEECP daily session recommended for 35 sessions.\nMaintain target augmentation ratio > 1.2.",
        );
      }
      notify(`Loaded template: ${templateName}`);
    } else if (templateName.includes("Diabetes")) {
      if (!getValues("assessment")) {
        setValue(
          "assessment",
          "Diabetes Mellitus Type 2 - Suboptimally controlled. Recent HbA1c: 7.8%. Fasting blood glucose: 138 mg/dL, Post-prandial glucose: 182 mg/dL. No evidence of diabetic retinopathy or microalbuminuria on screening.",
        );
      }
      if (!getValues("plan")) {
        setValue(
          "plan",
          "1. Diabetic diet counseling: Low glycemic index, avoid refined carbs and sugary beverages.\n2. Continue Metformin 500mg bd after meals.\n3. Daily self-monitoring of blood glucose.\n4. Repeat HbA1c in 3 months.",
        );
      }
      notify(`Loaded template: ${templateName}`);
    } else if (templateName.includes("Diet")) {
      const dietText = templateName.includes("BP")
        ? "Diet for Hypertensive Patient (DASH):\n- Restrict sodium intake to < 2.0g/day (< 1 tsp table salt).\n- Increase potassium-rich vegetables and fruits.\n- Avoid pickles, papads, canned foods, and salted snacks."
        : templateName.includes("Cholesterol")
          ? "Diet for Cholesterol / Dyslipidemia:\n- Low saturated fat and zero trans fats.\n- Incorporate soluble fiber (oats, legumes, flaxseeds).\n- Mediterranean heart-healthy diet."
          : templateName.includes("Kidney")
            ? "Diet for Renal / Kidney Disease:\n- Controlled protein intake.\n- Strict restriction of high-potassium and high-phosphorus foods.\n- Fluid intake tailored to 1.2 - 1.5 L/day."
            : "Heart Healthy Dietary Guidelines:\n- High fiber, whole grains, leafy greens, moderate nuts.\n- Low sodium, heart-safe cooking oils (olive/mustard).";
      const currentPlan = getValues("plan") || "";
      setValue("plan", currentPlan ? currentPlan + "\n\n" + dietText : dietText);
      notify(`Loaded diet template into Plan: ${templateName}`);
    } else {
      notify(`Loaded template: ${templateName}`);
    }
  };


  const save = async (values: Row, sign = false) => {
    setBusy(true);
    setSaveError(undefined);
    try {
      const data: Row = {
        version: encounter.version,
        symptoms: symptoms.map((name, i) => ({
          name,
          response: values["symptom_" + i] || "Not assessed",
          narrative: values["narrative_" + i] || "",
        })),
      };
      for (const [k] of noteFields) data[k] = values[k] || "";
      for (const k of [
        "outcome",
        "cabg",
        "cag",
        "ccs_class",
        "consult_notes",
        "nurse_notes",
        "physician_notes",
        "treatment_notes",
        "chart_type",
        "mode",
      ])
        data[k] = values[k] || "";
      data.cad_year = values.cad_year ? Number(values.cad_year) : null;

      // Authentic CharmHealth: Structured HPI & PMH serialization if note text is empty
      if (!data.hpi || !data.hpi.trim()) {
        data.hpi = `Chest Pain? ${hpiChestPain}\nChest Pain Frequency per Week: ${hpiFreq}\nS/L Nitroglycerin per Week: ${hpiNitro}\nWalking Time without Symptoms: ${hpiWalk}`;
      }
      if (!data.medical_history || !data.medical_history.trim()) {
        data.medical_history = `CAD Diagnosis: ${pmhCad}\nPTCA: ${pmhPtca}\nCABG: ${pmhCabg}\nMyocardial Infarction: ${pmhMi}\nDiabetes Type 1: ${pmhDm1}\nDiabetes Type 2: ${pmhDm2}\nHypertension: ${pmhHtn}\nHyperlipidemia: ${pmhLipid}`;
      }

      const saved = await api("/encounters/" + id, "PUT", data);
      if (sign)
        await api("/encounters/" + id + "/sign", "POST", {
          version: saved.version,
        });
      await refresh();
      reset(values);
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

  const patient = chart?.patient || {};
  const patientAge = patient.dob
    ? new Date().getFullYear() - Number(patient.dob.slice(0, 4))
    : 58;
  const latestVital = chart?.vitals?.[0];

  return (
    <div className="charm-consult-wrapper">
      {/* 1. TOP PATIENT DEMOGRAPHIC STRIP (Screenshots 1-3) */}
      <div className="charm-consult-header-strip">
        <div className="charm-patient-avatar-box">
          <span className="charm-patient-avatar-initials">
            {patient.first_name ? patient.first_name[0] : "K"}
            {patient.last_name ? patient.last_name[0] : "J"}
          </span>
        </div>

        <div className="charm-consult-patient-meta">
          <div className="charm-patient-name-row">
            <strong>{patient.name || "Kanchana Jaganathan"}</strong>
            <span className="charm-demog-pill">
              {patient.sex || "Female"}/ {patientAge}
            </span>
            <span className="charm-id-tag">
              ID: {patient.mrn || "HUHNKR7187"}
            </span>
            <span className="charm-dob-tag">
              DOB: {patient.dob ? day(patient.dob) : "Aug 06, 1968"}
            </span>
            <span className="eyebrow charm-active-badge">
              ACTIVE CONSULTATION
            </span>
            <Badge value={encounter.status} />
          </div>
        </div>

        <div className="charm-consult-header-tags">
          <div className="charm-consult-stat-cell">
            <span className="charm-stat-lbl">Allergies</span>
            <span className="charm-stat-val text-red">
              {chart.allergies?.length
                ? chart.allergies.map((a: Row) => a.allergen).join(", ")
                : "Not Recorded"}
            </span>
          </div>

          <div className="charm-consult-stat-cell">
            <span className="charm-stat-lbl">Visits</span>
            <span className="charm-stat-val">
              Last : {old[0] ? day(old[0].created_at) : "Oct 29, 2026"}
              <span className="muted" style={{ marginLeft: 6 }}>
                Next : --
              </span>
            </span>
          </div>

          <div className="charm-consult-stat-cell">
            <span className="charm-stat-lbl">Vitals</span>
            <span className="charm-stat-val">
              Wt : {latestVital?.weight_kg || "67.6"} kgs
              <span style={{ marginLeft: 6 }}>
                BMI : {latestVital?.bmi || "30.86"}
              </span>
            </span>
          </div>

          <div className="charm-consult-stat-cell">
            <span className="charm-stat-lbl">
              Balance Due <a className="charm-link-sm">Show Details</a>
            </span>
            <span className="charm-stat-val">
              Patient : ₹
              {chart.balance_paise
                ? (chart.balance_paise / 100).toFixed(2)
                : "0.00"}
              <span style={{ marginLeft: 6 }}>Insurance : ₹0.00</span>
            </span>
          </div>
        </div>

        <div className="charm-consult-header-actions">
          <button
            className="charm-icon-btn"
            title="Add Quick Record"
            onClick={() => setModal("orders")}
          >
            <Plus size={16} />
          </button>
          <button
            className="charm-icon-btn"
            title="More Options"
            onClick={() => setModal("history")}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 2. METADATA & ACTION BAR (Screenshots 1-3) */}
      <div className="charm-consult-metadata-bar">
        <div className="charm-consult-meta-left">
          <div className="charm-meta-field">
            <span>Provider:</span>
            <strong>
              {staff.find((s) => s.id === encounter.provider_id)?.name ||
                user.name}
              <ChevronDown size={13} style={{ display: "inline", marginLeft: 3 }} />
            </strong>
          </div>

          <div className="charm-meta-field">
            <span>Date:</span>
            <strong>
              {dateTime(encounter.created_at).slice(0, 12)}
              <Edit2 size={12} style={{ display: "inline", marginLeft: 4, color: "#64748b" }} />
            </strong>
          </div>

          <div className="charm-meta-field">
            <span>Facility:</span>
            <strong>Heal Your Heart Neelankarai...</strong>
          </div>

          <div className="charm-meta-field">
            <span>Visit Type:</span>
            <strong>
              {encounter.visit_type || "--"}
              <ChevronDown size={13} style={{ display: "inline", marginLeft: 3 }} />
            </strong>
          </div>

          <div className="charm-meta-field">
            <span>Duration (mins):</span>
            <strong>30</strong>
          </div>

          <div className="charm-meta-field">
            <span>Resource:</span>
            <strong>Bed 1</strong>
          </div>

          <div className="charm-meta-field">
            <span>Reason:</span>
            <span className="muted">Cardiology EECP Consultation</span>
          </div>
        </div>

        <div className="charm-consult-meta-right">
          {editable && (
            <button
              type="button"
              className="charm-consult-btn-save"
              aria-label="Save draft"
              disabled={busy}
              onClick={handleSubmit((v) => save(v))}
            >
              Save
            </button>
          )}

          <button
            type="button"
            className="charm-consult-btn"
            onClick={() => setModal("preview")}
          >
            <Printer size={13} style={{ marginRight: 4, display: "inline" }} />
            Preview
          </button>

          <button
            type="button"
            className="charm-consult-btn"
            onClick={() => {
              if (source) {
                setValue("plan", (getValues("plan") || "") + "\n" + (source.plan || ""));
                notify("Imported prior clinical plan.");
              }
            }}
          >
            Import <ChevronDown size={12} style={{ display: "inline" }} />
          </button>

          {editable && (
            <button
              type="button"
              className="charm-consult-btn"
              aria-label="Sign encounter"
              disabled={busy}
              onClick={() => setModal("sign")}
            >
              <ShieldCheck size={13} style={{ marginRight: 4, display: "inline" }} />
              Sign
            </button>
          )}

          {user.role === "doctor" && encounter.status === "signed" && (
            <button
              type="button"
              className="charm-consult-btn-teal"
              onClick={() => setModal("amend")}
            >
              Add amendment
            </button>
          )}

          <button
            type="button"
            className="charm-consult-btn"
            title="Messages"
            onClick={() => setModal("history")}
          >
            <MessageSquare size={13} />
          </button>

          <button
            type="button"
            className="charm-consult-btn-close"
            onClick={() => navigate("/patients/" + patientId)}
          >
            Close
          </button>
        </div>
      </div>

      {/* 3. SUBTABS BAR (Screenshots 1-3) */}
      <div className="charm-consult-subtabs-bar">
        <div className="charm-subtabs-left">
          {old.length > 0 && (
            <div className="charm-prior-consult-pill">
              <select
                aria-label="Previous consultation"
                value={source?.id}
                onChange={(e) => setPrevious(e.target.value)}
              >
                {old.map((r: Row) => (
                  <option key={r.id} value={r.id}>
                    {day(r.created_at)} : {staff.find((s) => s.id === r.provider_id)?.name || "Dr. Ramasamy"}...
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="charm-subtab-link-repeat"
                onClick={() => {
                  if (source) {
                    setValue("chief_complaint", source.chief_complaint || "");
                    setValue("assessment", source.assessment || "");
                    notify("Repeated findings from prior consultation.");
                  }
                }}
              >
                Repeat
              </button>
            </div>
          )}

          <button
            type="button"
            className="charm-subtabs-toggle-btn"
            title={leftPaneOpen ? "Collapse Summary Pane" : "Expand Summary Pane"}
            onClick={() => setLeftPaneOpen(!leftPaneOpen)}
          >
            <span style={{ fontWeight: 700, marginRight: 2 }}>E</span>
            {leftPaneOpen ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
          </button>

          <div className="charm-consult-tabs-list">
            {subtabs.map((tabName) => (
              <button
                key={tabName}
                type="button"
                className={`charm-consult-subtab-link ${consultSubTab === tabName ? "active" : ""
                  }`}
                onClick={() => setConsultSubTab(tabName)}
              >
                {tabName}
              </button>
            ))}
          </div>
        </div>

        <div className="charm-subtabs-right">
          <span className="charm-subtabs-status">
            {encounter.status === "signed"
              ? "Finalized documentation is read-only"
              : isDirty
                ? "Unsaved changes"
                : "Draft saved · manual save"}
          </span>
        </div>
      </div>

      <ErrorBox error={saveError} />

      {/* 4. THREE-PANE CONSULTATION WORKSPACE */}
      <div
        className={`charm-consult-workspace ${leftPaneOpen ? "left-open" : "left-collapsed"
          }`}
      >
        {/* LEFT PANE: LIVE SOAP SUMMARY PREVIEW */}
        {leftPaneOpen && (
          <aside className="charm-consult-left-preview">
            <div className="charm-preview-header">
              <h3>Subjective</h3>
            </div>

            <div className="charm-preview-section">
              <h4>Chief Complaints</h4>
              <ul className="charm-preview-list">
                {ccQuestions.map((q, i) => (
                  <li key={i}>
                    - {q} - <strong>{ccAnswers[i] || "No"}</strong>
                  </li>
                ))}
                {getValues("chief_complaint") && (
                  <li className="charm-preview-custom-text">
                    {getValues("chief_complaint")}
                  </li>
                )}
              </ul>
            </div>

            <div className="charm-preview-section">
              <h4>Symptoms</h4>
              <p style={{ margin: "2px 0 4px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
                Post- EECP assessment
              </p>
              <ul className="charm-preview-list">
                {Object.entries(postEecpAssessment)
                  .filter(([_, checked]) => checked)
                  .map(([item]) => (
                    <li key={item}>☑ {item}</li>
                  ))}
              </ul>
            </div>

            <div className="charm-preview-section">
              <h4>History of Present Illness</h4>
              <p style={{ margin: "4px 0", fontSize: 12 }}>
                Chest Pain? <strong>{hpiChestPain}</strong>
              </p>
              <table className="charm-preview-hpi-table">
                <tbody>
                  <tr>
                    <td>
                      Chest Pain Frequency per Week:
                      <br />
                      <small className="muted">(No. of times per week)</small>
                    </td>
                    <td>
                      <strong>{hpiFreq || "nil"}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      S/L Nitroglycerin per Week:
                      <br />
                      <small className="muted">(No. taken per week)</small>
                    </td>
                    <td>
                      <strong>{hpiNitro || "nil"}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Walking Time</td>
                    <td>
                      <strong>{hpiWalk || "—"}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 8, fontSize: 12 }}>
                <p style={{ margin: "2px 0" }}>Shortness of Breath: <strong>{hpiSob}</strong> ({hpiNyha})</p>
                <p style={{ margin: "2px 0" }}>Edema of Legs: <strong>{hpiEdema}</strong> ({hpiEdemaStatus})</p>
                <p style={{ margin: "2px 0" }}>Orthopnea: <strong>{hpiOrthopnea}</strong> · PND: <strong>{hpiPnd}</strong></p>
              </div>

              {getValues("hpi") && (
                <p className="charm-preview-custom-text">{getValues("hpi")}</p>
              )}
            </div>

            <div className="charm-preview-section">
              <h4>Past Medical History</h4>
              <table className="charm-preview-hpi-table">
                <tbody>
                  <tr>
                    <td>CAD Diagnosis:</td>
                    <td><strong>{pmhCad || "2020"}</strong></td>
                  </tr>
                  <tr>
                    <td>PTCA:</td>
                    <td><strong>{pmhPtca || "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>CABG:</td>
                    <td><strong>{pmhCabg || "fhf"}</strong></td>
                  </tr>
                  <tr>
                    <td>Myocardial Infarction:</td>
                    <td><strong>{pmhMi || "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Diabetes Type 1:</td>
                    <td><strong>{pmhDm1 || "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Diabetes Type 2:</td>
                    <td><strong>{pmhDm2 || "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Hypertension:</td>
                    <td><strong>{pmhHtn || "—"}</strong></td>
                  </tr>
                  <tr>
                    <td>Hyperlipidemia:</td>
                    <td><strong>{pmhLipid || "—"}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="charm-preview-section">
              <h4>Review of Systems</h4>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: "#334155", marginTop: 4 }}>General:</div>
                <div style={{ color: "#475569" }}>
                  {["Weight Loss", "Weight Gain", "Cold Intolerance", "Poor Appetite"].filter(k => rosChecked[k]).join(", ") || "Non-contributory"}
                </div>

                <div style={{ fontWeight: 600, color: "#334155", marginTop: 4 }}>Gastroentrology:</div>
                <div style={{ color: "#475569" }}>
                  {["Abdominal Pain", "Bloating", "Black Stool"].filter(k => rosChecked[k]).join(", ") || "Non-contributory"}
                </div>

                <div style={{ fontWeight: 600, color: "#334155", marginTop: 4 }}>Renal:</div>
                <div style={{ color: "#475569" }}>
                  {["Periorbital edema", "Facial edema", "Burning micturition", "Low urine output", "Nausea", "Fistula"].filter(k => rosChecked[k]).join(", ") || "No dysuria or edema"}
                </div>

                <div style={{ fontWeight: 600, color: "#334155", marginTop: 4 }}>EECP Indications:</div>
                <div style={{ color: "#475569" }}>
                  {["Angina Pectoris", "Coronary Artery Disease", "Refractory Angina", "Heart Failure / Ischemic Cardiomyopathy"].filter(k => rosChecked[k]).join(", ") || "Angina Pectoris, CAD"}
                </div>

                <div style={{ fontWeight: 600, color: "#334155", marginTop: 4 }}>TMT Stress Test:</div>
                <div style={{ color: "#475569" }}>
                  APMHR {tmtApmhr || "162"} bpm · Max HR {tmtMaxHr || "142"} bpm ({tmtPctApmhr || "87.7"}%) · Workload {tmtMets || "8.5"} METs
                </div>
              </div>
            </div>

            <div className="charm-preview-section">
              <h4>Physical Examination</h4>
              <p style={{ fontSize: 12 }}>
                Lungs: Auscultation {peLungsAuscultation ? "recorded" : "clear"}, Other {peLungsOther ? "abnormal" : "none"}
              </p>
              <p style={{ fontSize: 12 }}>
                Heart: Auscultation {peHeartAuscultation ? "recorded" : "S1/S2 present"}, Other {peHeartOther ? "murmur" : "none"}
              </p>
              <p style={{ fontSize: 12 }}>
                Rhythm:{" "}
                <strong>
                  {Object.entries(peRhythm)
                    .filter(([_, v]) => v)
                    .map(([k]) => k)
                    .join(", ") || "Normal Sinus Rhythm"}
                </strong>
              </p>
              <p style={{ fontSize: 12 }}>
                Heart Block: <strong>{peHeartBlock || "None"}</strong>
              </p>
            </div>

            <div className="charm-preview-section">
              <h4>Assessment</h4>
              <p style={{ fontSize: 12 }}>
                {getValues("assessment") ||
                  encounter.assessment ||
                  "Clinical assessment pending."}
              </p>
            </div>

            <div className="charm-preview-section">
              <h4>Plan</h4>
              <p style={{ fontSize: 12 }}>
                {getValues("plan") ||
                  encounter.plan ||
                  "Care plan & lifestyle pending."}
              </p>
            </div>
          </aside>
        )}

        {/* MIDDLE RAIL: CONDITIONAL PER CHART TYPE */}
        {currentChartType === "Quick" ? null : currentChartType === "Brief" ? (
          <div className="charm-consult-rail">
            <button
              type="button"
              className="charm-rail-btn-top"
              title="Templates Dropdown"
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            >
              SOAP ▾
            </button>
            <button
              type="button"
              className="charm-rail-nav-arrow"
              onClick={() => scrollTo("sec-brief-cc", "CC")}
            >
              <ChevronUp size={14} />
            </button>

            <span className="charm-rail-group-label">(S)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "CC" ? "active" : ""}`}
              title="Chief Complaints"
              onClick={() => scrollTo("sec-brief-cc", "CC")}
            >
              CC
            </button>

            <span className="charm-rail-group-label">(O)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "VS" ? "active" : ""}`}
              title="Vital Signs & Hemodynamics"
              onClick={() => scrollTo("sec-brief-vs", "VS")}
            >
              V/S
            </button>

            <span className="charm-rail-group-label">(P)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "RX" ? "active" : ""}`}
              title="Prescriptions"
              onClick={() => scrollTo("sec-brief-rx", "RX")}
            >
              RX
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "LAB" ? "active" : ""}`}
              title="Lab Orders"
              onClick={() => scrollTo("sec-brief-lab", "LAB")}
            >
              LAB
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "IMG" ? "active" : ""}`}
              title="Imaging Orders"
              onClick={() => scrollTo("sec-brief-img", "IMG")}
            >
              IMG
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "FU" ? "active" : ""}`}
              title="Follow-Up"
              onClick={() => scrollTo("sec-brief-fu", "FU")}
            >
              F/U
            </button>

            <button
              type="button"
              className="charm-rail-nav-arrow"
              onClick={() => scrollTo("sec-brief-fu", "FU")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        ) : currentChartType === "Comprehensive" ? (
          <div className="charm-consult-rail charm-rail-comprehensive">
            <div className="charm-rail-comp-group">
              <span className="charm-rail-comp-title">Subjective</span>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "CC" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-cc", "CC")}
              >
                Chief Complaints
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "HIST" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-hist", "HIST")}
              >
                History
              </button>
            </div>

            <div className="charm-rail-comp-group">
              <span className="charm-rail-comp-title">Objective</span>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "PE" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-pe", "PE")}
              >
                Physical Examination
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "LAB" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-lab", "LAB")}
              >
                Latest Lab Results
              </button>
            </div>

            <div className="charm-rail-comp-group">
              <span className="charm-rail-comp-title">Assessment</span>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "AN" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-an", "AN")}
              >
                Assessment Notes
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "DX" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-dx", "DX")}
              >
                Diagnoses
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "SELF" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-self", "SELF")}
              >
                Self Notes
              </button>
            </div>

            <div className="charm-rail-comp-group">
              <span className="charm-rail-comp-title">Plan</span>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "REC" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-rec", "REC")}
              >
                Recommendations
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "VAC" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-vac", "VAC")}
              >
                Vaccines / Injections
              </button>
              <button
                type="button"
                className={`charm-rail-comp-btn ${activeRailSection === "TRT" ? "active" : ""}`}
                onClick={() => scrollTo("sec-comp-trt", "TRT")}
              >
                Treatment Notes
              </button>
            </div>
          </div>
        ) : (
          <div className="charm-consult-rail">
            <button
              type="button"
              className="charm-rail-btn-top"
              title="Templates Dropdown"
              onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            >
              SOAP ▾
            </button>
            <button
              type="button"
              className="charm-rail-nav-arrow"
              onClick={() => scrollTo("sec-cc", "CC")}
            >
              <ChevronUp size={14} />
            </button>

            <span className="charm-rail-group-label">(S)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "CC" ? "active" : ""}`}
              title="Chief Complaints"
              onClick={() => scrollTo("sec-cc", "CC")}
            >
              CC
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "SYM" ? "active" : ""}`}
              title="Symptoms Checklist"
              onClick={() => scrollTo("sec-sym", "SYM")}
            >
              SYM
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "HPI" ? "active" : ""}`}
              title="History of Present Illness"
              onClick={() => scrollTo("sec-hpi", "HPI")}
            >
              HPI
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "PMH" ? "active" : ""}`}
              title="Past Medical History"
              onClick={() => scrollTo("sec-pmh", "PMH")}
            >
              PMH
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "ROS" ? "active" : ""}`}
              title="Review of Systems"
              onClick={() => scrollTo("sec-ros", "ROS")}
            >
              ROS
            </button>

            <span className="charm-rail-group-label">(O)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "VS" ? "active" : ""}`}
              title="Vital Signs"
              onClick={() => scrollTo("sec-vitals", "VS")}
            >
              V/S
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "PE" ? "active" : ""}`}
              title="Physical Examination"
              onClick={() => scrollTo("sec-pe", "PE")}
            >
              PE
            </button>

            <span className="charm-rail-group-label">(A)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "A" ? "active" : ""}`}
              title="Assessment"
              onClick={() => scrollTo("sec-assessment", "A")}
            >
              (A)
            </button>

            <span className="charm-rail-group-label">(P)</span>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "P" ? "active" : ""}`}
              title="Care Plan"
              onClick={() => scrollTo("sec-plan", "P")}
            >
              (P)
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "RX" ? "active" : ""}`}
              title="Prescriptions"
              onClick={() => scrollTo("sec-rx", "RX")}
            >
              RX
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "LAB" ? "active" : ""}`}
              title="Lab Orders"
              onClick={() => scrollTo("sec-lab", "LAB")}
            >
              LAB
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "IMG" ? "active" : ""}`}
              title="Imaging Orders"
              onClick={() => scrollTo("sec-img", "IMG")}
            >
              IMG
            </button>
            <button
              type="button"
              className={`charm-rail-btn ${activeRailSection === "FU" ? "active" : ""}`}
              title="Follow-Up"
              onClick={() => scrollTo("sec-fu", "FU")}
            >
              F/U
            </button>

            <button
              type="button"
              className="charm-rail-nav-arrow"
              onClick={() => scrollTo("sec-plan", "P")}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* RIGHT PANE: ACTIVE CLINICAL TEMPLATE EDITOR */}
        <main className="charm-consult-editor">
          <form onSubmit={handleSubmit((v) => save(v))}>
            <fieldset disabled={!editable || busy} style={{ border: "none", padding: 0 }}>
              {consultSubTab === "Questionnaires" ? (
                <QuestionnairesView />
              ) : consultSubTab === "Procedure Codes" ? (
                <ProcedureCodesView />
              ) : consultSubTab === "Nurse Input" ? (
                <NurseInputView
                  register={register}
                  encounter={encounter}
                  editable={editable}
                />
              ) : currentChartType === "Quick" ? (
                <QuickChartNotesCanvas
                  chart={chart}
                  patient={patient}
                  encounter={encounter}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  setActiveTplModal={setActiveTplModal}
                  setModal={setModal}
                  editable={editable}
                />
              ) : currentChartType === "Brief" ? (
                <BriefChartNotesCanvas
                  chart={chart}
                  patient={patient}
                  encounter={encounter}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  setActiveTplModal={setActiveTplModal}
                  setModal={setModal}
                  editable={editable}
                />
              ) : currentChartType === "Comprehensive" ? (
                <ComprehensiveChartNotesCanvas
                  chart={chart}
                  patient={patient}
                  encounter={encounter}
                  register={register}
                  setValue={setValue}
                  getValues={getValues}
                  setActiveTplModal={setActiveTplModal}
                  setModal={setModal}
                  editable={editable}
                />
              ) : (
                <>
                  {/* TEMPLATE SEARCH BAR (Screenshots 1-3) */}
                  <div className="charm-template-search-row">
                    <div className="charm-template-search-container">
                      <button
                        type="button"
                        className="charm-template-type-btn"
                        onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                      >
                        SOAP <ChevronDown size={12} style={{ display: "inline", marginLeft: 2 }} />
                      </button>
                      <input
                        className="charm-template-search-input"
                        placeholder="Search Template by Name"
                        value={templateSearch}
                        onFocus={() => setTemplateDropdownOpen(true)}
                        onChange={(e) => {
                          setTemplateSearch(e.target.value);
                          setTemplateDropdownOpen(true);
                        }}
                      />
                      <div
                        className="charm-template-clip-badge"
                        title="Seeded practice templates"
                      >
                        📋 {templates.data?.length || 12}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="charm-template-link-btn"
                      onClick={() => {
                        const tmt =
                          templates.data?.find((t) =>
                            t.name.includes("Treadmill"),
                          ) || {
                            name: "Treadmill Test ( TMT )_Practice",
                            code: "TMT_PRACTICE",
                          };
                        setViewingTemplate(tmt);
                      }}
                    >
                      Templates
                    </button>

                    {/* TEMPLATE DROPDOWN (Screenshot 1) */}
                    {templateDropdownOpen && (
                      <div className="charm-template-dropdown-popup">
                        {(templates.data || [
                          { id: "1", name: "Diabetes Management Template_Practice" },
                          { id: "2", name: "Diet for Anemia_Practice" },
                          { id: "3", name: "Diet for BP Patient_Practice" },
                          { id: "4", name: "Diet For Cholesterol_Practice" },
                          { id: "5", name: "Diet for Diabetes_Practice" },
                          { id: "6", name: "Diet for Healthy Heart/Healthy Life_Practice" },
                          { id: "7", name: "Diet for Kidney Disease_Practice" },
                          { id: "8", name: "Diet for Thyroid Problem_Practice" },
                          { id: "9", name: "Heart Failure Patient Diet_Practice" },
                          { id: "10", name: "HUH EECP SOAP_Practice" },
                          { id: "11", name: "Vaso-Meditech EECP SOAP_Practice" },
                          { id: "12", name: "Treadmill Test ( TMT )_Practice" },
                        ])
                          .filter(
                            (t) =>
                              !templateSearch ||
                              t.name.toLowerCase().includes(templateSearch.toLowerCase()),
                          )
                          .map((t) => (
                            <div
                              key={t.id || t.name}
                              className={`charm-template-dropdown-row ${selectedTemplate === t.name ? "selected" : ""
                                }`}
                              onClick={() => applyTemplate(t.name)}
                            >
                              {t.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION: CHIEF COMPLAINTS (Authentic CharmHealth (S) CC - Clean Textarea matching frame_001) */}
                  <div id="sec-cc" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Chief Complaints</h3>
                      <button
                        type="button"
                        className="charm-template-link-btn"
                        onClick={() => setActiveTplModal("symptoms")}
                      >
                        Templates
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      className="charm-cc-textarea"
                      aria-label="Chief complaint"
                      placeholder=""
                      {...register("chief_complaint")}
                    />
                  </div>

                  {/* SECTION: SYMPTOMS (Authentic CharmHealth (S) SYM) */}
                  <div id="sec-sym" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Symptoms</h3>
                      <button
                        type="button"
                        className="charm-template-link-btn"
                        onClick={() => setActiveTplModal("symptoms")}
                      >
                        Templates
                      </button>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: "#334155", margin: 0 }}>
                          Post- EECP assessment
                        </h4>
                        <input
                          type="checkbox"
                          title="Select all"
                          checked={postEecpOptions.every((opt) => postEecpAssessment[opt])}
                          onChange={(e) => {
                            const all: Record<string, boolean> = {};
                            postEecpOptions.forEach((opt) => {
                              all[opt] = e.target.checked;
                            });
                            setPostEecpAssessment(all);
                          }}
                        />
                      </div>
                      <div className="charm-post-eecp-grid">
                        {postEecpOptions.map((opt) => (
                          <label key={opt} className="charm-post-eecp-item">
                            <input
                              type="checkbox"
                              checked={postEecpAssessment[opt] || false}
                              onChange={(e) =>
                                setPostEecpAssessment((prev) => ({
                                  ...prev,
                                  [opt]: e.target.checked,
                                }))
                              }
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Hidden registered schema fields for symptoms */}
                    <div style={{ display: "none" }}>
                      {symptoms.map((s, i) => (
                        <div key={s}>
                          <select aria-label={s} {...register("symptom_" + i)}>
                            <option>Not assessed</option>
                            <option>Yes</option>
                            <option>No</option>
                          </select>
                          <input {...register("narrative_" + i)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION: HISTORY OF PRESENT ILLNESS (Authentic CharmHealth (S) HPI) */}
                  <div id="sec-hpi" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>History of Present Illness</h3>
                      <button
                        type="button"
                        className="charm-template-link-btn"
                        onClick={() => setActiveTplModal("symptoms")}
                      >
                        Templates
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                      <label className="charm-checkbox-inline" style={{ fontSize: 12.5, color: "#475569" }}>
                        <span>Initial Assessment</span>
                        <input
                          type="checkbox"
                          checked={hpiInitialAssessment}
                          onChange={(e) => setHpiInitialAssessment(e.target.checked)}
                        />
                      </label>
                    </div>

                    <table className="charm-hpi-structured-table">
                      <tbody>
                        <tr>
                          <td style={{ width: "22%", fontWeight: 600, verticalAlign: "top", color: "#1e293b" }}>
                            Chest Pain?
                          </td>
                          <td style={{ width: "28%", verticalAlign: "top" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(["No", "Yes", "Other"] as const).map((opt) => (
                                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                                  <input
                                    type="radio"
                                    name="hpi_chest_pain_opt"
                                    checked={hpiChestPain === opt}
                                    onChange={() => setHpiChestPain(opt)}
                                  />
                                  <span>{opt === "Yes" ? "▷ Yes" : opt}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                          <td style={{ verticalAlign: "top" }}></td>
                        </tr>
                        <tr>
                          <td colSpan={3} style={{ padding: 0 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: "5%", textAlign: "center", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                                    <input type="checkbox" defaultChecked />
                                  </td>
                                  <td style={{ width: "50%", borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                                    Chest Pain Frequency per Week: <small className="muted">(No. of times per week)</small>
                                  </td>
                                  <td style={{ borderBottom: "1px solid #cbd5e1" }}>
                                    <input
                                      className="charm-hpi-table-input"
                                      value={hpiFreq}
                                      onChange={(e) => setHpiFreq(e.target.value)}
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}></td>
                                  <td style={{ borderRight: "1px solid #cbd5e1", borderBottom: "1px solid #cbd5e1" }}>
                                    S/L Nitroglycerin per Week: <small className="muted">(No. taken per week)</small>
                                  </td>
                                  <td style={{ borderBottom: "1px solid #cbd5e1" }}>
                                    <input
                                      className="charm-hpi-table-input"
                                      value={hpiNitro}
                                      onChange={(e) => setHpiNitro(e.target.value)}
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ borderRight: "1px solid #cbd5e1" }}></td>
                                  <td style={{ borderRight: "1px solid #cbd5e1" }}>
                                    Walking Time without Symptoms: <small className="muted">(min.)</small>
                                  </td>
                                  <td>
                                    <input
                                      className="charm-hpi-table-input"
                                      placeholder="e.g. 15"
                                      value={hpiWalk}
                                      onChange={(e) => setHpiWalk(e.target.value)}
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Authentic CharmHealth: Shortness of Breath & Edema of Legs Side-by-Side (frame_004 & frame_005) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      {/* Left: Shortness of Breath */}
                      <table className="charm-hpi-structured-table" style={{ margin: 0 }}>
                        <tbody>
                          <tr>
                            <td style={{ width: "45%", fontWeight: 600, verticalAlign: "top", color: "#1e293b" }}>
                              Shortness of Breath?
                            </td>
                            <td style={{ verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {(["No", "Yes", "Other"] as const).map((opt) => (
                                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                                    <input
                                      type="radio"
                                      name="hpi_sob_opt"
                                      checked={hpiSob === opt}
                                      onChange={() => setHpiSob(opt)}
                                    />
                                    <span>{opt === "Yes" ? "▷ Yes" : opt}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>Trouble breathing while lying flat?</td>
                            <td>
                              <div style={{ display: "flex", gap: 14 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_orthopnea_opt"
                                    checked={hpiOrthopnea === "Yes"}
                                    onChange={() => setHpiOrthopnea("Yes")}
                                  />
                                  <span>Yes</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_orthopnea_opt"
                                    checked={hpiOrthopnea === "No"}
                                    onChange={() => setHpiOrthopnea("No")}
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>Palpitations?</td>
                            <td>
                              <div style={{ display: "flex", gap: 14 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_palp_opt"
                                    checked={hpiPalpitations === "Yes"}
                                    onChange={() => setHpiPalpitations("Yes")}
                                  />
                                  <span>Yes</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_palp_opt"
                                    checked={hpiPalpitations === "No"}
                                    onChange={() => setHpiPalpitations("No")}
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Right: Edema of Legs */}
                      <table className="charm-hpi-structured-table" style={{ margin: 0 }}>
                        <tbody>
                          <tr>
                            <td style={{ width: "45%", fontWeight: 600, verticalAlign: "top", color: "#1e293b" }}>
                              Edema of Legs?
                            </td>
                            <td style={{ verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {(["No", "Yes", "Other"] as const).map((opt) => (
                                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                                    <input
                                      type="radio"
                                      name="hpi_edema_opt"
                                      checked={hpiEdema === opt}
                                      onChange={() => setHpiEdema(opt)}
                                    />
                                    <span>{opt === "Yes" ? "▷ Yes" : opt}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td>Waking up with sudden onset of shortness of breath at night?</td>
                            <td>
                              <div style={{ display: "flex", gap: 14 }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_pnd_opt"
                                    checked={hpiPnd === "Yes"}
                                    onChange={() => setHpiPnd("Yes")}
                                  />
                                  <span>Yes</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                                  <input
                                    type="radio"
                                    name="hpi_pnd_opt"
                                    checked={hpiPnd === "No"}
                                    onChange={() => setHpiPnd("No")}
                                  />
                                  <span>No</span>
                                </label>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>History of present illness notes</span>
                      <textarea
                        rows={2}
                        aria-label="History of present illness"
                        placeholder="Additional clinical HPI details..."
                        {...register("hpi")}
                      />
                    </label>
                  </div>

                  {/* SECTION: PAST MEDICAL HISTORY (Authentic CharmHealth (S) PMH) */}
                  <div id="sec-pmh" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Past Medical History</h3>
                      <button
                        type="button"
                        className="charm-template-link-btn"
                        onClick={() => setActiveTplModal("symptoms")}
                      >
                        Templates
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                      <label className="charm-checkbox-inline" style={{ fontSize: 12.5, color: "#475569" }}>
                        <span>Initial Assessment</span>
                        <input
                          type="checkbox"
                          checked={pmhInitialAssessment}
                          onChange={(e) => setPmhInitialAssessment(e.target.checked)}
                        />
                      </label>
                    </div>

                    <table className="charm-hpi-structured-table">
                      <tbody>
                        <tr>
                          <td style={{ width: "25%" }}>
                            CAD Diagnosis:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td style={{ width: "25%" }}>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhCad}
                              onChange={(e) => setPmhCad(e.target.value)}
                            />
                          </td>
                          <td style={{ width: "25%" }}>
                            PTCA:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td style={{ width: "25%" }}>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhPtca}
                              onChange={(e) => setPmhPtca(e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            CABG:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhCabg}
                              onChange={(e) => setPmhCabg(e.target.value)}
                            />
                          </td>
                          <td>
                            Myocardial Infarction:
                            <br />
                            <small className="muted">(Years &amp; Months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhMi}
                              onChange={(e) => setPmhMi(e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Diabetes Type 1:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhDm1}
                              onChange={(e) => setPmhDm1(e.target.value)}
                            />
                          </td>
                          <td>
                            Diabetes Type 2:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhDm2}
                              onChange={(e) => setPmhDm2(e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Hypertension:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhHtn}
                              onChange={(e) => setPmhHtn(e.target.value)}
                            />
                          </td>
                          <td>
                            Hyperlipidemia:
                            <br />
                            <small className="muted">(Years &amp; months)</small>
                          </td>
                          <td>
                            <input
                              className="charm-hpi-table-input"
                              value={pmhLipid}
                              onChange={(e) => setPmhLipid(e.target.value)}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>Past medical history notes</span>
                      <textarea
                        rows={2}
                        aria-label="Past medical history"
                        placeholder="Additional clinical history, procedures, or family history..."
                        {...register("medical_history")}
                      />
                    </label>
                  </div>

                  {/* SECTION: REVIEW OF SYSTEMS (Authentic CharmHealth (S) ROS) */}
                  <div id="sec-ros" className="charm-editor-section">
                    <div className="charm-section-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3>Review of Systems</h3>
                        {rosTemplate === "Treadmill Test ( TMT )_Practice" && (
                          <span className="charm-tmt-badge">
                            CLINICAL TEMPLATE ACTIVE: Treadmill Test ( TMT )_Practice
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {rosTemplate === "Treadmill Test ( TMT )_Practice" ? (
                          <>
                            <button
                              type="button"
                              className="charm-btn-link-action"
                              style={{ color: "#d97706", fontWeight: 600, fontSize: 12 }}
                              onClick={() => {
                                const age = patientAge || 58;
                                const apmhrVal = 220 - age;
                                const targetVal = Math.round(apmhrVal * 0.85);
                                const pct = ((Number(tmtMaxHr || 142) / apmhrVal) * 100).toFixed(1);
                                setValue(
                                  "assessment",
                                  `Treadmill Stress Test (TMT) - Bruce Protocol:
• Indication: ${Object.entries(tmtIndication)
                                    .filter(([_, v]) => v)
                                    .map(([k]) => k)
                                    .join(", ") || "Exertional chest pain evaluation"
                                  }
• Age-Predicted Max HR (APMHR): ${apmhrVal} bpm Formula = ( 220 – age )
• Target Heart Rate (85%): ${targetVal} bpm
• Max Heart Rate Achieved: ${tmtMaxHr} bpm (${pct}% of APMHR)
• Max Blood Pressure: ${tmtBpSys}/${tmtBpDia} mmHg
• Total Exercise Time: ${tmtDurationMin} mins ${tmtDurationSec} secs
• Exercise Capacity: ${tmtMets} METs (Stage III Bruce Protocol)
• Rate-Limiting Meds: ${tmtMeds}
• Symptoms: ${Object.entries(tmtSymptoms)
                                    .filter(([_, v]) => v)
                                    .map(([k]) => k)
                                    .join(", ") || "None"
                                  }
• ECG Changes: ${tmtEcgChanges}
• Impression: ${tmtImpression}`,
                                );
                                setValue(
                                  "plan",
                                  `1. Treadmill Test: ${tmtImpression} with ${pct}% APMHR achieved.
2. Continue current cardioprotective regimen:
   - Beta blocker (${tmtMeds})
   - Statin & Antiplatelet therapy
3. Recommended moderate aerobic exercise: 30-45 mins 5x weekly.
4. Outpatient cardiology review in 3 months.`,
                                );
                                notify("Synchronized TMT parameters into Assessment & Care Plan.");
                              }}
                            >
                              ↺ Sync to Assessment & Plan
                            </button>
                            <button
                              type="button"
                              className="charm-btn-link-action"
                              style={{ color: "#e11d48", fontSize: 12 }}
                              onClick={() => {
                                setRosTemplate("");
                                setSelectedTemplate("");
                                notify("Reverted to standard Review of Systems.");
                              }}
                            >
                              ✕ Revert to Standard ROS
                            </button>
                          </>
                        ) : (
                          <label className="charm-checkbox-inline">
                            <span>Initial Assessment</span>
                            <input type="checkbox" defaultChecked />
                          </label>
                        )}
                        <button
                          type="button"
                          className="charm-template-link-btn"
                          onClick={() => {
                            const t = templates.data?.find(
                              (x) =>
                                x.name.includes("Treadmill") ||
                                x.name.includes("TMT"),
                            ) || {
                              name: "Treadmill Test ( TMT )_Practice",
                              code: "TMT_PRACTICE",
                              type: "Review of Systems",
                            };
                            setViewingTemplate(t);
                          }}
                        >
                          Templates
                        </button>
                      </div>
                    </div>

                    {rosTemplate === "Treadmill Test ( TMT )_Practice" && (
                      <div className="charm-tmt-editor-card" style={{ marginTop: 8, marginBottom: 12 }}>
                        <div className="charm-tmt-header">
                          <div className="charm-tmt-title-left">
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f766e" }}>
                              Treadmill Test ( TMT )_Practice
                            </h3>
                            <span className="charm-tmt-type-chip">Template Type: Review of Systems</span>
                          </div>
                          <div className="charm-tmt-header-actions">
                            <button
                              type="button"
                              className="charm-btn-link-action"
                              onClick={() => {
                                const tmt = {
                                  name: "Treadmill Test ( TMT )_Practice",
                                  code: "TMT_PRACTICE",
                                  type: "Review of Systems",
                                };
                                setViewingTemplate(tmt);
                              }}
                            >
                              View Full Spec
                            </button>
                          </div>
                        </div>

                        <div className="charm-tmt-sections-list">
                          {/* 1. Indication for Test */}
                          <div className="charm-tmt-node">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>Indication for Test</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div className="charm-tmt-checkbox-grid">
                                {[
                                  "Exertional Chest Pain",
                                  "Evaluation of Known / Suspected CAD",
                                  "Post-Revascularization Assessment",
                                  "Exercise-Induced Arrhythmia Assessment",
                                  "Post-EECP Functional Assessment",
                                ].map((ind) => (
                                  <label key={ind} className="charm-pe-item">
                                    <input
                                      type="checkbox"
                                      checked={tmtIndication[ind] || false}
                                      onChange={(e) =>
                                        setTmtIndication((p) => ({ ...p, [ind]: e.target.checked }))
                                      }
                                    />
                                    <span>{ind}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 2. Protocol Used */}
                          <div className="charm-tmt-node">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>Protocol Used</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div className="charm-tmt-radio-group">
                                {[
                                  "Standard Bruce Protocol",
                                  "Modified Bruce Protocol",
                                  "Naughton Protocol",
                                ].map((p) => (
                                  <label key={p} className="charm-pe-item">
                                    <input
                                      type="radio"
                                      name="tmt_protocol_choice"
                                      checked={tmtProtocol === p}
                                      onChange={() => setTmtProtocol(p)}
                                    />
                                    <span>{p}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 3. Test Parameters with CharmHealth Formulas */}
                          <div className="charm-tmt-node active">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>Test Parameters</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div className="charm-tmt-calc-grid">
                                {/* APMHR */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Age-Predicted Maximum Heart Rate (APMHR):
                                    <span className="charm-tmt-val-chip">{220 - patientAge} bpm</span>
                                    <span className="charm-tmt-formula-badge">Formula = ( 220 – age )</span>
                                  </div>
                                </div>

                                {/* Target Heart Rate */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Target Heart Rate ( 85% predicted - Vigorous exercise ):
                                    <span className="charm-tmt-val-chip">
                                      {Math.round((220 - patientAge) * 0.85)} bpm
                                    </span>
                                    <span className="charm-tmt-formula-badge">
                                      Formula = ( 220 – age ) x 0.85
                                    </span>
                                  </div>
                                </div>

                                {/* Maximum Heart Rate Achieved */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Maximum Heart Rate Achieved:
                                    <input
                                      type="number"
                                      className="charm-tmt-inline-input"
                                      value={tmtMaxHr}
                                      onChange={(e) => {
                                        setTmtMaxHr(e.target.value);
                                        const apmhr = 220 - patientAge;
                                        const val = Number(e.target.value);
                                        if (val > 0) {
                                          setTmtPctApmhr(((val / apmhr) * 100).toFixed(1));
                                        }
                                      }}
                                    />
                                    <span className="muted">bpm</span>
                                  </div>
                                </div>

                                {/* Maximum Blood Pressure Achieved */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Maximum Blood Pressure Achieved:
                                    <input
                                      type="number"
                                      className="charm-tmt-inline-input small"
                                      value={tmtBpSys}
                                      onChange={(e) => setTmtBpSys(e.target.value)}
                                    />
                                    <span>/</span>
                                    <input
                                      type="number"
                                      className="charm-tmt-inline-input small"
                                      value={tmtBpDia}
                                      onChange={(e) => setTmtBpDia(e.target.value)}
                                    />
                                    <span className="muted">mmHg</span>
                                  </div>
                                </div>

                                {/* Total Exercise Time */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Total Exercise Time:
                                    <input
                                      type="number"
                                      className="charm-tmt-inline-input small"
                                      value={tmtDurationMin}
                                      onChange={(e) => setTmtDurationMin(e.target.value)}
                                    />
                                    <span>min</span>
                                    <input
                                      type="number"
                                      className="charm-tmt-inline-input small"
                                      value={tmtDurationSec}
                                      onChange={(e) => setTmtDurationSec(e.target.value)}
                                    />
                                    <span>sec</span>
                                    <span className="muted">(Bruce Protocol)</span>
                                  </div>
                                </div>

                                {/* % of Age-Predicted Maximum Heart Rate */}
                                <div className="charm-tmt-calc-row highlight">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    [ <strong>{tmtPctApmhr}%</strong> ] of Age-Predicted Maximum Heart Rate.
                                    <span className="charm-tmt-formula-badge">
                                      Formula = Maximum Heart rate Achieved / APMHR x 100 = ( {tmtPctApmhr} ) %
                                    </span>
                                    {Number(tmtPctApmhr) >= 85 ? (
                                      <span className="charm-tmt-status-good">✓ Target Reached (&gt;=85%)</span>
                                    ) : (
                                      <span className="charm-tmt-status-submax">Submaximal (&lt;85%)</span>
                                    )}
                                  </div>
                                </div>

                                {/* Rate-Limiting Medications */}
                                <div className="charm-tmt-calc-row">
                                  <input type="checkbox" defaultChecked />
                                  <div className="charm-tmt-calc-label">
                                    Rate-Limiting Medications:
                                    <input
                                      className="charm-tmt-text-input"
                                      value={tmtMeds}
                                      placeholder="e.g. Bisoprolol 1.25mg bd, Metoprolol, None"
                                      onChange={(e) => setTmtMeds(e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4. Exercise Tolerance / METs */}
                          <div className="charm-tmt-node">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>Exercise Tolerance / METs</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, color: "#334155" }}>Workload Achieved:</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="charm-tmt-inline-input"
                                  value={tmtMets}
                                  onChange={(e) => setTmtMets(e.target.value)}
                                />
                                <span className="muted">METs</span>
                                <span
                                  className="charm-tmt-val-chip"
                                  style={{ background: "#ecfdf5", color: "#065f46" }}
                                >
                                  {Number(tmtMets) >= 7
                                    ? "Good Exercise Tolerance (>= 7 METs)"
                                    : "Moderate / Reduced Tolerance"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 5. Symptoms During Test */}
                          <div className="charm-tmt-node">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>Symptoms During Test</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div className="charm-tmt-checkbox-grid">
                                {[
                                  "No chest pain / asymptomatic",
                                  "Mild exertional chest tightness",
                                  "Shortness of breath / dyspnea",
                                  "Lower extremity muscle fatigue",
                                  "Dizziness / presyncope",
                                ].map((sym) => (
                                  <label key={sym} className="charm-pe-item">
                                    <input
                                      type="checkbox"
                                      checked={tmtSymptoms[sym] || false}
                                      onChange={(e) =>
                                        setTmtSymptoms((p) => ({ ...p, [sym]: e.target.checked }))
                                      }
                                    />
                                    <span>{sym}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 6. ECG Changes & Test Conclusion */}
                          <div className="charm-tmt-node">
                            <div className="charm-tmt-node-head">
                              <label className="charm-checkbox-inline">
                                <input type="checkbox" defaultChecked />
                                <strong>ECG Findings & Impression</strong>
                              </label>
                            </div>
                            <div className="charm-tmt-node-content">
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, width: 140 }}>ECG Changes:</span>
                                  <select
                                    className="charm-template-search-input"
                                    style={{ flex: 1 }}
                                    value={tmtEcgChanges}
                                    onChange={(e) => setTmtEcgChanges(e.target.value)}
                                  >
                                    <option>No ischemic ST-segment depression or elevation</option>
                                    <option>Horizontal ST depression &gt;= 1.0 mm</option>
                                    <option>Downsloping ST depression &gt;= 1.0 mm</option>
                                    <option>Upsloping ST depression</option>
                                    <option>Frequent premature ventricular contractions (PVCs)</option>
                                  </select>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, width: 140 }}>Final Impression:</span>
                                  <input
                                    className="charm-template-search-input"
                                    style={{ flex: 1 }}
                                    value={tmtImpression}
                                    onChange={(e) => setTmtImpression(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="charm-ros-container">
                      {rosCategories.map((cat) => (
                        <div className="charm-ros-cat-card" key={cat.category}>
                          <div className="charm-ros-cat-head">
                            <strong>{cat.category}:</strong>
                            <label className="charm-checkbox-inline">
                              <input
                                type="checkbox"
                                checked={rosHeaders[cat.category] ?? true}
                                onChange={(e) =>
                                  setRosHeaders((p) => ({
                                    ...p,
                                    [cat.category]: e.target.checked,
                                  }))
                                }
                              />
                              <span style={{ fontSize: 12 }}>
                                Include this header in Chart Note
                              </span>
                            </label>
                          </div>

                          <div className="charm-ros-cat-body">
                            <div className="charm-ros-items-col">
                              {cat.items.map((item) => (
                                <label key={item} className="charm-ros-item-label">
                                  <input
                                    type="checkbox"
                                    checked={rosChecked[item] || false}
                                    onChange={(e) =>
                                      setRosChecked((p) => ({
                                        ...p,
                                        [item]: e.target.checked,
                                      }))
                                    }
                                  />
                                  <span>{item}</span>
                                </label>
                              ))}
                            </div>

                            <div className="charm-ros-notes-col">
                              <textarea
                                className="charm-ros-note-box"
                                placeholder="Observations / notes..."
                                value={rosNotes[cat.category]?.col1 || ""}
                                onChange={(e) =>
                                  setRosNotes((p) => ({
                                    ...p,
                                    [cat.category]: {
                                      ...p[cat.category],
                                      col1: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <textarea
                                className="charm-ros-note-box"
                                placeholder="Additional findings..."
                                value={rosNotes[cat.category]?.col2 || ""}
                                onChange={(e) =>
                                  setRosNotes((p) => ({
                                    ...p,
                                    [cat.category]: {
                                      ...p[cat.category],
                                      col2: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>Review of systems</span>
                      <textarea
                        rows={2}
                        aria-label="Review of systems"
                        placeholder="General ROS narrative..."
                        {...register("ros")}
                      />
                    </label>
                  </div>

                  {/* SECTION: VITALS / OBJECTIVE (Authentic CharmHealth (O) V/S) */}
                  <div id="sec-vitals" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Vital Signs</h3>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {latestVital?.bp_sys && latestVital?.bp_dia ? (
                          <span className="charm-stat-val" style={{ color: "#0f766e" }}>
                            {latestVital.bp_sys} / {latestVital.bp_dia} mmHg
                          </span>
                        ) : null}
                        <a className="charm-link-sm">Plot</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm">Past Data</a>
                        {["doctor", "assistant", "therapist"].includes(user.role) &&
                          encounter.status === "draft" && (
                            <button
                              type="button"
                              className="charm-btn-vitals-record"
                              onClick={() => setModal("vitals")}
                            >
                              Record observations
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="charm-vitals-inputs-grid">
                      <div className="charm-vital-cell">
                        <span>Wt</span>
                        <input
                          placeholder="67.6"
                          defaultValue={latestVital?.weight_kg || ""}
                        />
                        <em>kg</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Ht</span>
                        <input
                          placeholder="165"
                          defaultValue={latestVital?.height_cm || ""}
                        />
                        <em>cms</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>BMI</span>
                        <input
                          placeholder="30.86"
                          readOnly
                          value={latestVital?.bmi || "30.86"}
                        />
                      </div>
                      <div className="charm-vital-cell">
                        <span>Temp</span>
                        <input
                          placeholder="98.4"
                          defaultValue={latestVital?.temp_c ? String((latestVital.temp_c * 9 / 5) + 32) : ""}
                        />
                        <em>°F</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>BP</span>
                        <input
                          placeholder="120"
                          style={{ width: 45 }}
                          defaultValue={latestVital?.bp_sys || ""}
                        />
                        <span>/</span>
                        <input
                          placeholder="80"
                          style={{ width: 45 }}
                          defaultValue={latestVital?.bp_dia || ""}
                        />
                        <em>mmHg</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Pulse</span>
                        <input
                          placeholder="72"
                          defaultValue={latestVital?.pulse_bpm || ""}
                        />
                        <em>bpm</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Resp Rate</span>
                        <input placeholder="18" />
                        <em>bpm</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Resp Pattern</span>
                        <select defaultValue="Normal">
                          <option>--Select--</option>
                          <option>Normal</option>
                          <option>Dyspneic</option>
                        </select>
                      </div>
                      <div className="charm-vital-cell">
                        <span>crPWV</span>
                        <input placeholder="7.8" defaultValue="7.8" style={{ width: 45 }} />
                        <em>m/s</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Vascular Age</span>
                        <input placeholder="54" defaultValue="54" style={{ width: 45 }} />
                        <em>yrs</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>Central BP</span>
                        <input placeholder="118" defaultValue="118" style={{ width: 40 }} />
                        <span>/</span>
                        <input placeholder="76" defaultValue="76" style={{ width: 40 }} />
                        <em>mmHg</em>
                      </div>
                      <div className="charm-vital-cell">
                        <span>HbA1c</span>
                        <input placeholder="6.8" defaultValue="6.8" style={{ width: 45 }} />
                        <em>%</em>
                      </div>
                    </div>
                  </div>

                  {/* SECTION: PHYSICAL EXAMINATION (Authentic CharmHealth (O) PE) */}
                  <div id="sec-pe" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Physical Examination</h3>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <label className="charm-checkbox-inline">
                          <span>Clinical Assessment</span>
                          <input type="checkbox" defaultChecked />
                        </label>
                        <button
                          type="button"
                          className="charm-template-link-btn"
                          onClick={() => {
                            const t = templates.data?.find((x) => x.name.includes("EECP")) || {
                              name: "HUH EECP SOAP_Practice",
                              code: "EECP_SOAP",
                            };
                            setViewingTemplate(t);
                          }}
                        >
                          Templates
                        </button>
                      </div>
                    </div>

                    <div className="charm-pe-4col-grid">
                      {/* Col 1: Lungs */}
                      <div className="charm-pe-col">
                        <span className="charm-pe-col-title">Lungs:</span>
                        <label className="charm-pe-item">
                          <input
                            type="checkbox"
                            checked={peLungsAuscultation}
                            onChange={(e) => setPeLungsAuscultation(e.target.checked)}
                          />
                          <span>▶ Auscultation</span>
                        </label>
                        <label className="charm-pe-item">
                          <input
                            type="checkbox"
                            checked={peLungsOther}
                            onChange={(e) => setPeLungsOther(e.target.checked)}
                          />
                          <span>Other</span>
                        </label>
                      </div>

                      {/* Col 2: Heart */}
                      <div className="charm-pe-col">
                        <span className="charm-pe-col-title">Heart:</span>
                        <label className="charm-pe-item">
                          <input
                            type="checkbox"
                            checked={peHeartAuscultation}
                            onChange={(e) => setPeHeartAuscultation(e.target.checked)}
                          />
                          <span>▶ Auscultation</span>
                        </label>
                        <label className="charm-pe-item">
                          <input
                            type="checkbox"
                            checked={peHeartOther}
                            onChange={(e) => setPeHeartOther(e.target.checked)}
                          />
                          <span>Other</span>
                        </label>
                      </div>

                      {/* Col 3: Current Cardiac Rhythm */}
                      <div className="charm-pe-col">
                        <span className="charm-pe-col-title">Current Cardiac Rhythm?:</span>
                        {[
                          "Pacemaker",
                          "LBBB",
                          "RBBB",
                          "Atrial Fibrillation",
                          "Ventricular Fibrillation",
                          "Atrial Flutter",
                        ].map((rhythm) => (
                          <label key={rhythm} className="charm-pe-item">
                            <input
                              type="checkbox"
                              checked={peRhythm[rhythm] || false}
                              onChange={(e) =>
                                setPeRhythm((p) => ({
                                  ...p,
                                  [rhythm]: e.target.checked,
                                }))
                              }
                            />
                            <span>{rhythm}</span>
                          </label>
                        ))}
                      </div>

                      {/* Col 4: Heart Block */}
                      <div className="charm-pe-col">
                        <span className="charm-pe-col-title">Heart Block :</span>
                        {[
                          "First - Degree",
                          "Second - Degree",
                          "Third - Degree",
                          "Other",
                        ].map((hb) => (
                          <label key={hb} className="charm-pe-item">
                            <input
                              type="radio"
                              name="heart_block_choice"
                              checked={peHeartBlock === hb}
                              onChange={() => setPeHeartBlock(hb)}
                            />
                            <span>{hb}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>Physical examination</span>
                      <textarea
                        rows={2}
                        aria-label="Physical examination"
                        placeholder="Additional clinical examination details..."
                        {...register("examination")}
                      />
                    </label>
                  </div>

                  {/* Hidden registered schema fields for legacy CAD inputs */}
                  <div style={{ display: "none" }}>
                    <input type="number" {...register("cad_year")} />
                    <select {...register("ccs_class")}>
                      <option value="">Not assessed</option>
                      {["I", "II", "III", "IV"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <input {...register("cabg")} />
                    <input {...register("cag")} />
                  </div>

                  {/* SECTION: ASSESSMENT (Authentic CharmHealth (A)) */}
                  <div id="sec-assessment" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Assessment</h3>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          className="charm-template-link-btn"
                          onClick={() => setActiveTplModal("assessment")}
                        >
                          CAG / Assessment Templates
                        </button>
                        <button
                          type="button"
                          className="charm-template-link-btn"
                          onClick={() => setActiveTplModal("diagnosis")}
                        >
                          Diagnosis Templates
                        </button>
                        <button
                          type="button"
                          className="charm-btn-link-action"
                          onClick={() => setModal("diagnoses")}
                        >
                          + Add diagnosis
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                      Assessment Notes
                    </div>
                    <textarea
                      rows={5}
                      className="charm-cc-textarea"
                      aria-label="Assessment"
                      placeholder="Clinical diagnostic synthesis, CAD status, EECP response..."
                      {...register("assessment")}
                    />
                  </div>

                  {/* SECTION: PLAN (Authentic CharmHealth (P) - Frames 017-021) */}
                  <div id="sec-plan" className="charm-editor-section">
                    <div className="charm-section-header">
                      <h3>Plan</h3>
                    </div>

                    {/* Prescriptions, Labs & Images action links bar (frame_017) */}
                    <div className="charm-plan-action-bar" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ width: 110, color: "#1e293b" }}>Prescriptions:</strong>
                        <button type="button" className="charm-link-sm" onClick={() => setActiveTplModal("add_rx")}>Add Rx</button>
                        <span className="muted">|</span>
                        <button type="button" className="charm-link-sm" onClick={() => setActiveTplModal("prescription")}>Templates</button>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Viewing past prescriptions")}>Past Rx</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Paper Rx generated")}>Paper Rx</a>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ width: 110, color: "#1e293b" }}>Labs:</strong>
                        <button type="button" className="charm-link-sm" onClick={() => setModal("orders")}>Search &amp; Add</button>
                        <span className="muted">|</span>
                        <button type="button" className="charm-link-sm" onClick={() => setModal("orders")}>Add Lab</button>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Lab templates")}>Templates</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Viewing past lab orders")}>Past Orders</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Map Dx")}>Map Dx</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("View lab orders")}>View Orders</a>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <strong style={{ width: 110, color: "#1e293b" }}>Images:</strong>
                        <button type="button" className="charm-link-sm" onClick={() => setModal("orders")}>Add Image</button>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Imaging templates")}>Templates</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Viewing image orders")}>View Orders</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Past image orders")}>Past Orders</a>
                        <span className="muted">|</span>
                        <a className="charm-link-sm" onClick={() => notify("Map Dx")}>Map Dx</a>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      className="charm-cc-textarea"
                      aria-label="Care plan"
                      placeholder="Prescriptions, EECP therapy parameters, lifestyle counseling..."
                      {...register("plan")}
                      style={{ marginBottom: 14 }}
                    />

                    {/* 1. Diet Recommendation (frame_017 & frame_018) */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>Diet Recommendation</span>
                        <button type="button" className="charm-template-link-btn" onClick={() => notify("Diet templates")}>Templates</button>
                      </div>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#fff" }}>
                        <label className="charm-checkbox-inline" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: "flex" }}>
                          <span>Avoid high potassium foods:-</span>
                          <input
                            type="checkbox"
                            checked={dietAvoidPotassium}
                            onChange={(e) => setDietAvoidPotassium(e.target.checked)}
                          />
                        </label>
                        {dietAvoidPotassium && (
                          <div style={{ display: "flex", gap: 18, marginLeft: 20 }}>
                            <label className="charm-checkbox-inline" style={{ fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={dietFruits}
                                onChange={(e) => setDietFruits(e.target.checked)}
                              />
                              <span>Fruits</span>
                            </label>
                            <label className="charm-checkbox-inline" style={{ fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={dietVeg}
                                onChange={(e) => setDietVeg(e.target.checked)}
                              />
                              <span>Vegetables</span>
                            </label>
                            <label className="charm-checkbox-inline" style={{ fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={dietOthers}
                                onChange={(e) => setDietOthers(e.target.checked)}
                              />
                              <span>Others</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Lifestyle Recommendation (frame_018) */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>Lifestyle Recommendation</span>
                        <button type="button" className="charm-template-link-btn" onClick={() => notify("Lifestyle templates")}>Templates</button>
                      </div>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#fff" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            "Avoid alcohol / tobacco chewing and quite smoking",
                            "Follow a heart-friendly diet",
                            "Regular physical exercise",
                            "Control your obesity",
                          ].map((item) => (
                            <label key={item} className="charm-checkbox-inline" style={{ fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={lifestyleItems[item] || false}
                                onChange={(e) => setLifestyleItems((p) => ({ ...p, [item]: e.target.checked }))}
                              />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. Treatment Notes (frame_018 & frame_019) */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>Treatment Notes</span>
                        <button type="button" className="charm-template-link-btn" onClick={() => notify("Treatment templates")}>Templates</button>
                      </div>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#fff" }}>
                        <label className="charm-checkbox-inline" style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: "flex" }}>
                          <span>EECP Treatment Notes</span>
                          <input
                            type="checkbox"
                            checked={treatmentNotesCheck}
                            onChange={(e) => setTreatmentNotesCheck(e.target.checked)}
                          />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: 6 }}>
                          {[
                            "Monitor weight daily",
                            "Monitor new onset arrhythmias",
                            "Monitor SpO2",
                            "Slow pressure regime",
                            "> 200mmHg in the first 3min.",
                            "Lower cuff off mode",
                            "Trigger 1:2 ratio",
                            "Head end elevation",
                            "O2 - 2 L/min",
                            "O2 > 2 L/min",
                            "Early deflation",
                            "Early inflation / late deflation",
                            "Stop treatment - SpO2 falls < 96%",
                          ].map((item) => (
                            <label key={item} className="charm-checkbox-inline" style={{ fontSize: 12.5 }}>
                              <input
                                type="checkbox"
                                checked={treatmentNotesItems[item] || false}
                                onChange={(e) => setTreatmentNotesItems((p) => ({ ...p, [item]: e.target.checked }))}
                              />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4. Instructions (frame_020) */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>Instructions</span>
                        <button type="button" className="charm-template-link-btn" onClick={() => notify("Instructions templates")}>Templates</button>
                      </div>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#fff" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {[
                            "Take medication regularly",
                            "Salt restricted diet",
                            "Potassium low diet",
                            "Fluid restriction",
                            "Know your drug",
                            "Report to the clinic if you experience these symptoms:-",
                            "Follow-up after:-",
                          ].map((inst) => (
                            <label key={inst} className="charm-checkbox-inline" style={{ fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={instructionsItems[inst] || false}
                                onChange={(e) => setInstructionsItems((p) => ({ ...p, [inst]: e.target.checked }))}
                              />
                              <span>{inst}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 5. When to repeat EECP treatment? (frame_020 & frame_021) */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "10px 14px", background: "#fff" }}>
                        <label className="charm-checkbox-inline" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: "flex" }}>
                          <span>When to repeat EECP treatment?</span>
                          <input
                            type="checkbox"
                            checked={repeatEecpCheck}
                            onChange={(e) => setRepeatEecpCheck(e.target.checked)}
                          />
                        </label>
                        <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                          Enhanced External Counterpulsation (EECP) treatment may be repeated based on individual patient needs and the response to the initial course. Consider repeating EECP treatment in the following scenarios:
                        </p>
                      </div>
                    </div>

                    {/* 6. Follow-up (frame_021) */}
                    <div id="sec-fu" style={{ marginTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 13, color: "#1e293b" }}>Follow up</strong>
                          <button type="button" className="charm-link-sm" onClick={() => notify("Follow-up appointment requested")}>Add Follow up</button>
                          <span className="muted">|</span>
                          <button type="button" className="charm-link-sm" onClick={() => notify("Follow up templates")}>Templates</button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        className="charm-cc-textarea"
                        placeholder="Follow-up instructions and timeline..."
                        {...register("follow_up")}
                      />
                    </div>

                    <label className="field" style={{ marginTop: 12 }}>
                      <span>Post-EECP outcome</span>
                      <select {...register("outcome")}>
                        <option value="">Not assessed</option>
                        {outcomes.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              )}
            </fieldset>

            {encounter.carry_forwards.map((r: Row) => (
              <div className="historical-attribution" key={r.id}>
                Historical {label(r.section)} copied from {dateTime(r.source_date)}.
              </div>
            ))}
          </form>

          {/* ORDERS, DIAGNOSES & PRESCRIPTIONS SUMMARY */}
          <div className="encounter-related" style={{ marginTop: 20 }}>
            <h3>Active Encounter Orders & Prescriptions</h3>
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
        </main>

        {/* FAR RIGHT FLOATING RAIL */}
        <aside className="charm-floating-right-rail">
          <div className="charm-floating-icon" title="Patient Quick Summary">
            <User size={16} />
          </div>
          <div className="charm-floating-icon" title="Clinical Notes History">
            <FileText size={16} />
          </div>
          <div className="charm-floating-icon" title="Prescriptions">
            <Pill size={16} />
          </div>
          <div className="charm-floating-icon" title="Vital Signs Trends">
            <Activity size={16} />
          </div>
          <div className="charm-floating-icon" title="Messages & Chat">
            <MessageSquare size={16} />
          </div>
        </aside>
      </div>


      {/* TEMPLATE VIEWER MODAL (Screenshot 4) */}
      {viewingTemplate && (
        <ViewTemplateModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          onInsert={(tplName) => {
            if (tplName.includes("Treadmill") || tplName.includes("TMT")) {
              setRosTemplate("Treadmill Test ( TMT )_Practice");
              setSelectedTemplate("Treadmill Test ( TMT )_Practice");
              setTemplateSearch("Treadmill Test ( TMT )_Practice");
              const age = patientAge || 58;
              const apmhrVal = 220 - age;
              const targetVal = Math.round(apmhrVal * 0.85);
              setTmtApmhr(String(apmhrVal));
              setTmtTargetHr(String(targetVal));
              const pct = ((Number(tmtMaxHr || 142) / apmhrVal) * 100).toFixed(1);
              setTmtPctApmhr(pct);
              notify("Inserted Treadmill Test ( TMT )_Practice into Review of Systems.");
              setTimeout(() => scrollTo("sec-ros", "ROS"), 50);
            } else {
              applyTemplate(tplName);
            }
          }}
        />
      )}

      {activeTplModal === "diagnosis" && (
        <DiagnosisTemplatesModal
          onClose={() => setActiveTplModal(null)}
          onAdd={async (diagnoses, comment) => {
            try {
              for (const d of diagnoses) {
                await api("/diagnoses", "POST", {
                  patient_id: patientId,
                  code: d.code,
                  diagnosis: d.diagnosis,
                  comments: comment || "Selected from CharmHealth Practice Template",
                });
              }
              await refresh();
              notify(`Added ${diagnoses.length} diagnoses.`);
            } catch (err) {
              notify("Error adding diagnoses: " + String(err));
            }
            setActiveTplModal(null);
          }}
        />
      )}

      {activeTplModal === "prescription" && (
        <PrescriptionTemplatesModal
          onClose={() => setActiveTplModal(null)}
          onAdd={async (meds) => {
            try {
              for (const m of meds) {
                await api("/medications", "POST", {
                  patient_id: patientId,
                  ...m,
                });
              }
              await refresh();
              notify(`Added ${meds.length} prescriptions from template.`);
            } catch (err) {
              notify("Error adding prescriptions: " + String(err));
            }
            setActiveTplModal(null);
          }}
        />
      )}

      {activeTplModal === "supplement" && (
        <SupplementTemplatesModal
          onClose={() => setActiveTplModal(null)}
          onAdd={async (supps) => {
            try {
              for (const s of supps) {
                await api("/medications", "POST", {
                  patient_id: patientId,
                  ...s,
                  is_supplement: true,
                });
              }
              await refresh();
              notify(`Added ${supps.length} supplements from template.`);
            } catch (err) {
              notify("Error adding supplements: " + String(err));
            }
            setActiveTplModal(null);
          }}
        />
      )}

      {activeTplModal === "symptoms" && (
        <SymptomsTemplatesModal
          onClose={() => setActiveTplModal(null)}
          onAdd={(symptomsText) => {
            const currentCc = getValues("chief_complaint") || "";
            setValue("chief_complaint", currentCc ? `${currentCc}\n\n${symptomsText}` : symptomsText);
            notify("Symptoms updated from template.");
            setActiveTplModal(null);
          }}
        />
      )}

      {activeTplModal === "assessment" && (
        <AssessmentNotesTemplatesModal
          onClose={() => setActiveTplModal(null)}
          onAdd={(cagSummary) => {
            const currentAss = getValues("assessment") || "";
            setValue("assessment", currentAss ? `${currentAss}\n\n${cagSummary}` : cagSummary);
            notify("Assessment updated with CAG / Echo findings.");
            setActiveTplModal(null);
          }}
        />
      )}

      {activeTplModal === "add_rx" && (
        <CharmAddPrescriptionModal
          onClose={() => setActiveTplModal(null)}
          onAdd={async (items: any[]) => {
            try {
              for (const it of items) {
                await api("/medications", "POST", {
                  patient_id: patientId,
                  trade_name: it.tradeName,
                  generic_name: it.genericName,
                  dosage: `${it.m}-${it.a}-${it.e}-${it.n} ${it.units} (${it.when})`,
                  frequency: `${it.m}-${it.a}-${it.e}-${it.n}`,
                  duration: `${it.period} ${it.periodUnits}`,
                  dispense: `${it.dispense} ${it.dispenseUnits}`,
                  notes: it.notes,
                });
              }
              await refresh();
              notify(`Recorded ${items.length} prescriptions.`);
            } catch (err) {
              notify("Error saving prescriptions: " + String(err));
            }
            setActiveTplModal(null);
          }}
        />
      )}

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
      {modal === "preview" && (() => {
        const activeMeds = (chart.medications || []).filter(
          (m: any) => m.status === "active" || !m.status
        );
        const activeDiagnoses = (chart.diagnoses || []).filter(
          (d: any) => d.status === "active" || !d.status
        );

        const cc = getValues("chief_complaint") || encounter.chief_complaint || "";
        const hpi = getValues("hpi") || encounter.hpi || "";
        const medHistory = getValues("medical_history") || encounter.medical_history || "";
        const ros = getValues("ros") || encounter.ros || "";
        const exam = getValues("examination") || encounter.examination || "";
        const objective = getValues("objective") || encounter.objective || "";
        const assessment =
          getValues("assessment") ||
          encounter.assessment ||
          "Patient came with chest pain, shortness of breath, tiredness, easy fatigability, swelling in the legs, not able to walk without symptoms. The symptoms are mild, moderate, moderate to severe, severe. Known case of CAD for the past _____ years. Current cardiac risk factors includes diabetes, hypertension, hyperlipidemia, family history of cardiac illness and smoking. General condition stable, unstable. On examination, vitals within normal limits, uncontrolled hypertention, low oxygen saturation, bradycardia, tacycardia.";
        const plan =
          getValues("plan") ||
          encounter.plan ||
          "Avoid high potassium foods:-";
        const followUp = getValues("follow_up") || encounter.follow_up || "";

        return (
          <Modal title="Preview SOAP Note" onClose={() => setModal("")} wide>
            <div className="charm-soap-preview-canvas">
              {/* Subjective */}
              <div className="charm-soap-heading-1">Subjective</div>

              <div className="charm-soap-heading-2">Chief Complaints</div>
              <ul className="charm-soap-list">
                {ccQuestions.map((q, i) => {
                  const ans = ccAnswers[i];
                  const ansSuffix =
                    ans === "Yes" ? "-yes" : ans === "No" ? " -no" : "";
                  return (
                    <li key={i}>
                      - {q}{ansSuffix}
                    </li>
                  );
                })}
                {cc && (
                  <li style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {cc}
                  </li>
                )}
              </ul>

              {/* Symptoms / Post-EECP assessment (if any checked) */}
              {Object.entries(postEecpAssessment).some(([_, v]) => v) && (
                <div style={{ marginBottom: 12 }}>
                  <div className="charm-soap-heading-2">Symptoms</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 3 }}>
                    Post- EECP assessment
                  </div>
                  <ul className="charm-soap-list">
                    {Object.entries(postEecpAssessment)
                      .filter(([_, checked]) => checked)
                      .map(([opt]) => (
                        <li key={opt}>☑ {opt}</li>
                      ))}
                  </ul>
                </div>
              )}

              {/* History of Present Illness */}
              <div className="charm-soap-heading-2">History of Present Illness</div>
              <div className="charm-soap-tree">
                <div>Chest Pain?</div>
                <div style={{ fontWeight: 600 }}>{hpiChestPain || "Yes"}</div>
                <div style={{ paddingLeft: 14 }}>
                  <div>- CCS</div>
                  <div style={{ paddingLeft: 14 }}>
                    - {encounter.ccs_class || "Class I"}
                  </div>
                  <div>- With Exertion</div>
                  <div style={{ paddingLeft: 14 }}>
                    - Walking on Flat Surface
                  </div>
                </div>
              </div>

              {/* HPI Table */}
              <table className="charm-soap-grid-table">
                <tbody>
                  <tr>
                    <td className="charm-soap-td-label" style={{ width: "60%" }}>
                      Chest Pain Frequency per Week:
                      <span className="charm-soap-muted">(No. of times per week)</span>
                    </td>
                    <td className="charm-soap-td-val">{hpiFreq || "j"}</td>
                  </tr>
                  <tr>
                    <td className="charm-soap-td-label">
                      S/L Nitroglycerin per Week:
                      <span className="charm-soap-muted">(No. taken per week)</span>
                    </td>
                    <td className="charm-soap-td-val">{hpiNitro || ""}</td>
                  </tr>
                  <tr>
                    <td className="charm-soap-td-label">
                      Walking Time without Symptoms:
                      <span className="charm-soap-muted">(min.)</span>
                    </td>
                    <td className="charm-soap-td-val">{hpiWalk || ""}</td>
                  </tr>
                </tbody>
              </table>

              {/* Authentic CharmHealth: Shortness of Breath & Symptoms (from dense_frame_173.jpg) */}
              <div className="charm-soap-tree" style={{ marginTop: 10 }}>
                <div>Shortness of Breath?</div>
                <div style={{ fontWeight: 600 }}>{hpiSob || "Yes"}</div>
                <div style={{ paddingLeft: 14 }}>
                  <div>- NYHA</div>
                  <div style={{ paddingLeft: 14 }}>
                    - Class I
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    - Class II
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    - Class III
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    - Class IV
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>Edema of Legs?</div>
                <div style={{ fontWeight: 600 }}>{hpiEdema || "Yes"}</div>
                <div style={{ paddingLeft: 14 }}>
                  <div>- Improving</div>
                  <div>- Worsening</div>
                  <div>- Stable</div>
                </div>

                <div style={{ marginTop: 8 }}>
                  Trouble breathing while lying flat? {hpiOrthopnea || "Yes"}
                </div>
                <div style={{ marginTop: 4 }}>
                  Waking up with sudden onset of shortness of breath at night? {hpiPnd || "Yes"}
                </div>
              </div>

              {hpi && (
                <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
                  {hpi}
                </p>
              )}

              {/* Past Medical History Table (from dense_frame_174.jpg) */}
              <div className="charm-soap-heading-2" style={{ marginTop: 16 }}>Past Medical History</div>
              <table className="charm-soap-grid-table">
                <tbody>
                  <tr>
                    <td className="charm-soap-td-label" style={{ width: "25%" }}>
                      CAD Diagnosis:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val" style={{ width: "25%" }}>
                      {pmhCad || "2020"}
                    </td>
                    <td className="charm-soap-td-label" style={{ width: "25%" }}>
                      PTCA:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val" style={{ width: "25%" }}>
                      {pmhPtca || ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="charm-soap-td-label">
                      CABG:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhCabg || "fhf"}</td>
                    <td className="charm-soap-td-label">
                      Myocardial Infarction:
                      <span className="charm-soap-muted">(Years &amp; Months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhMi || ""}</td>
                  </tr>
                  <tr>
                    <td className="charm-soap-td-label">
                      Diabetes Type 1:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhDm1 || ""}</td>
                    <td className="charm-soap-td-label">
                      Diabetes Type 2:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhDm2 || ""}</td>
                  </tr>
                  <tr>
                    <td className="charm-soap-td-label">
                      Hypertension:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhHtn || ""}</td>
                    <td className="charm-soap-td-label">
                      Hyperlipidemia:
                      <span className="charm-soap-muted">(Years &amp; months)</span>
                    </td>
                    <td className="charm-soap-td-val">{pmhLipid || ""}</td>
                  </tr>
                </tbody>
              </table>
              {medHistory && (
                <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
                  {medHistory}
                </p>
              )}

              {/* Review of Systems (Always fully rendered from dense_frame_174.jpg & dense_frame_175.jpg) */}
              <div className="charm-soap-heading-2" style={{ marginTop: 18 }}>
                Review of Systems
              </div>

              {/* General */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>General:</div>
                {["Weight Loss", "Weight Gain", "Cold Intolerance", "Poor Appetite"].some((k) => rosChecked[k]) && (
                  <ul className="charm-soap-list" style={{ marginTop: 2, paddingLeft: 14 }}>
                    {["Weight Loss", "Weight Gain", "Cold Intolerance", "Poor Appetite"]
                      .filter((k) => rosChecked[k])
                      .map((k) => (
                        <li key={k}>- {k}</li>
                      ))}
                  </ul>
                )}
                {rosNotes["General"]?.col1 && (
                  <div style={{ fontSize: 13, color: "#374151", paddingLeft: 14 }}>
                    {rosNotes["General"].col1}
                  </div>
                )}
              </div>

              {/* Gastroentrology */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>Gastroentrology:</div>
                {["Abdominal Pain", "Bloating", "Black Stool"].some((k) => rosChecked[k]) && (
                  <ul className="charm-soap-list" style={{ marginTop: 2, paddingLeft: 14 }}>
                    {["Abdominal Pain", "Bloating", "Black Stool"]
                      .filter((k) => rosChecked[k])
                      .map((k) => (
                        <li key={k}>- {k}</li>
                      ))}
                  </ul>
                )}
                {rosNotes["Gastroentrology"]?.col1 && (
                  <div style={{ fontSize: 13, color: "#374151", paddingLeft: 14 }}>
                    {rosNotes["Gastroentrology"].col1}
                  </div>
                )}
              </div>

              {/* Renal */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>Renal:</div>
                {["Periorbital edema", "Facial edema", "Burning micturition", "Low urine output", "Nausea", "Fistula"].some((k) => rosChecked[k]) && (
                  <ul className="charm-soap-list" style={{ marginTop: 2, paddingLeft: 14 }}>
                    {["Periorbital edema", "Facial edema", "Burning micturition", "Low urine output", "Nausea", "Fistula"]
                      .filter((k) => rosChecked[k])
                      .map((k) => (
                        <li key={k}>- {k}</li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Anemia */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>Anemia:</div>
                {["Gastrointestinal bleeding induced by DAPT", "Poor Iron absorption inhibited by proton pump inhibitors.", "Congestive heart failure(CHF).", "Chronic kidney disease(CKD)."].some((k) => rosChecked[k]) && (
                  <ul className="charm-soap-list" style={{ marginTop: 2, paddingLeft: 14 }}>
                    {["Gastrointestinal bleeding induced by DAPT", "Poor Iron absorption inhibited by proton pump inhibitors.", "Congestive heart failure(CHF).", "Chronic kidney disease(CKD)."]
                      .filter((k) => rosChecked[k])
                      .map((k) => (
                        <li key={k}>- {k}</li>
                      ))}
                  </ul>
                )}
              </div>

              {/* EECP Indications & Contraindications */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600 }}>EECP Indications &amp; Contraindications</div>
                {["Angina Pectoris", "Coronary Artery Disease", "Refractory Angina", "Heart Failure / Ischemic Cardiomyopathy"].some((k) => rosChecked[k]) && (
                  <ul className="charm-soap-list" style={{ marginTop: 2, paddingLeft: 14 }}>
                    {["Angina Pectoris", "Coronary Artery Disease", "Refractory Angina", "Heart Failure / Ischemic Cardiomyopathy"]
                      .filter((k) => rosChecked[k])
                      .map((k) => (
                        <li key={k}>- {k}</li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Treadmill Test (TMT) / Cardiac Exercise Stress Test from dense_frame_175.jpg & dense_frame_176.jpg */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 600 }}>
                  Treadmill Test (TMT) / Cardiac Exercise Stress Test
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Indication for Test</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - Exertional Chest Pain evaluation
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Protocol Used</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - Bruce Protocol
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Test Parameters</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - Age-Predicted Max HR (APMHR): {tmtApmhr || "162"} bpm Formula = ( 220 – age )<br />
                    - Target Heart Rate (85%): {tmtTargetHr || "138"} bpm<br />
                    - Max Heart Rate Achieved: {tmtMaxHr || "142"} bpm ({tmtPctApmhr || "87.7"}% of APMHR)<br />
                    - Maximum Blood Pressure: {tmtBpSys || "160"}/{tmtBpDia || "90"} mmHg<br />
                    - Total Exercise Time: {tmtDurationMin || "7"} mins {tmtDurationSec || "30"} secs
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Exercise Tolerance / METs</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - {tmtMets || "8.5"} METs (Stage III Bruce Protocol)
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Reason for Termination</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - Target Heart Rate Achieved (&gt;=85% of APMHR)
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>ST-Segment Changes and Type</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - {tmtEcgChanges || "No ischemic ST-segment depression or elevation"}
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Risk Startification (Based on Functional Capacity)</div>
                  <div style={{ paddingLeft: 14, color: "#374151" }}>
                    - Good Functional Capacity (7–10 METs / ~9 minutes)
                  </div>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div>Overall TMT Result:</div>
                  <p style={{ margin: "2px 0 0 14px", color: "#374151", lineHeight: 1.5 }}>
                    {tmtImpression
                      ? `The patient underwent a cardiac stress test for exertional chest pain evaluation under the Bruce protocol. The patient's Age-Predicted target heart rate (85% predicted) ${tmtTargetHr || "138"} bpm. Maximum heart rate achieved ${tmtMaxHr || "142"} bpm, Maximum blood pressure achieved ${tmtBpSys || "160"}/${tmtBpDia || "90"} mmHg, attaining ${tmtPctApmhr || "87.7"}% of age-predicted maximum heart rate, functional capacity based on an achieved workload of ${tmtMets || "8.5"} METs over ${tmtDurationMin || "7.5"} minutes. ${tmtImpression}.`
                      : "The patient underwent a cardiac stress test for exertional chest pain evaluation under the Bruce protocol. Treadmill stress test negative for inducible myocardial ischemia."}
                  </p>
                </div>
              </div>

              {ros && (
                <p style={{ margin: "6px 0", fontSize: 13, color: "#374151" }}>{ros}</p>
              )}

              {/* Objective / Physical Examination (if recorded) */}
              {(exam || objective || peLungsAuscultation || peHeartAuscultation) && (
                <div style={{ marginBottom: 14 }}>
                  <div className="charm-soap-heading-1">Objective</div>
                  <div className="charm-soap-heading-2">Physical Examination</div>
                  <ul className="charm-soap-list">
                    <li>- Lungs: Auscultation {peLungsAuscultation ? "recorded" : "clear"}, Other {peLungsOther ? "abnormal" : "none"}</li>
                    <li>- Heart: Auscultation {peHeartAuscultation ? "recorded" : "S1/S2 present"}, Other {peHeartOther ? "murmur" : "none"}</li>
                    <li>- Rhythm: {Object.entries(peRhythm).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal Sinus Rhythm"}, Heart Block: {peHeartBlock || "None"}</li>
                  </ul>
                  {exam && <p style={{ margin: "4px 0", fontSize: 13, color: "#374151" }}>{exam}</p>}
                  {objective && <p style={{ margin: "4px 0", fontSize: 13, color: "#374151" }}>{objective}</p>}
                </div>
              )}

              {/* Assessment Notes */}
              <div className="charm-soap-heading-2" style={{ marginTop: 20 }}>
                Assessment Notes
              </div>
              <p style={{ margin: "6px 0 16px", lineHeight: 1.6, color: "#111827", whiteSpace: "pre-wrap" }}>
                {assessment}
              </p>
              {activeDiagnoses.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 4 }}>
                    Active Diagnoses
                  </div>
                  <ul className="charm-soap-list">
                    {activeDiagnoses.map((d: any, idx: number) => (
                      <li key={idx}>
                        - {d.description || d.name} {d.code ? `(${d.code})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plan */}
              <div className="charm-soap-heading-1" style={{ textDecoration: "underline", marginTop: 22 }}>
                Plan
              </div>

              <div className="charm-soap-heading-2">Prescriptions</div>
              <div className="charm-soap-rx-block">
                {activeMeds.length > 0 ? (
                  activeMeds.map((med: any, idx: number) => (
                    <div key={idx} className="charm-soap-rx-item">
                      <div className="charm-soap-rx-name">
                        {med.trade_name || med.name}
                        {med.generic_name ? ` [${med.generic_name}]` : ""}
                      </div>
                      <div className="charm-soap-rx-freq">
                        {med.maen || med.frequency || "0 - 1 - 0 - 0"}
                      </div>
                      <div className="charm-soap-rx-dispense">
                        Dispense : {med.dispense || "1"} , Dispense As Written
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="charm-soap-rx-item">
                      <div className="charm-soap-rx-name">Tab.Aspirin 75 mg [Aspirin]</div>
                      <div className="charm-soap-rx-freq">0 - 1 - 0 - 0</div>
                      <div className="charm-soap-rx-dispense">Dispense : 1 , Dispense As Written</div>
                    </div>
                    <div className="charm-soap-rx-item">
                      <div className="charm-soap-rx-name">Clopilet (75 mg) [Clopidogrel-75 mg]</div>
                      <div className="charm-soap-rx-freq">0 - 1 - 0 - 0</div>
                      <div className="charm-soap-rx-dispense">Dispense : 1 , Dispense As Written</div>
                    </div>
                    <div className="charm-soap-rx-item">
                      <div className="charm-soap-rx-name">Tab. Atorva 10mg [atorvastatin]</div>
                      <div className="charm-soap-rx-freq">0 - 0 - 0 - 1</div>
                      <div className="charm-soap-rx-dispense">Dispense As Written</div>
                    </div>
                  </>
                )}
              </div>

              <div className="charm-soap-heading-2" style={{ marginTop: 18 }}>
                Diet Recommendations
              </div>
              <p style={{ margin: "4px 0", color: "#111827", whiteSpace: "pre-wrap" }}>
                {plan.includes("Avoid high potassium foods")
                  ? plan
                  : `Avoid high potassium foods:-\n${plan}`}
              </p>

              {followUp && (
                <div style={{ marginTop: 16 }}>
                  <div className="charm-soap-heading-2">Follow-up Advice</div>
                  <p style={{ margin: "4px 0", color: "#111827" }}>{followUp}</p>
                </div>
              )}
            </div>

            <div className="charm-soap-preview-footer">
              <Button onClick={() => window.print()}>
                <Printer size={15} />
                Print / Save PDF
              </Button>
              <Button variant="secondary" onClick={() => setModal("")}>
                Close
              </Button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

export function ClinicalPage() {
  return <CharmChartNotesGlobal />;
}
