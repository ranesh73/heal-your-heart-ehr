import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  Printer,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Activity,
  Plus,
  Trash2,
  PieChart as PieIcon,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";

// ============================================================================
// Types
// ============================================================================

export type AnalyticsSectionId =
  // Consultations
  | "consultations-month-day"
  | "consultations-visit-type"
  | "consultations-mode"
  | "consultations-provider"
  // Appointments
  | "appointments-month-day"
  | "appointments-visit-type"
  | "appointments-mode"
  | "appointments-status"
  | "appointments-provider"
  | "appointments-avg-time"
  | "appointments-booking-assistant"
  // Patients
  | "patients-registration"
  | "patients-demographics"
  | "patients-phr"
  | "patients-pcp"
  | "patients-referring-provider"
  | "patients-care-team"
  // Medical Records
  | "records-diagnoses"
  | "records-prescriptions"
  | "records-vaccines"
  | "records-lab-tests"
  | "records-supplements"
  // Others
  | "others-feedback";

interface DrilldownState {
  module: "consultations" | "appointments" | "patients";
  title: string;
  month?: string;
  series?: string;
  provider?: string;
  category?: string;
  facility: string;
  period: string;
}

// Colors for 12 months matching screenshots
const MONTH_COLORS: Record<string, string> = {
  Jan: "#4A90E2",
  Feb: "#9B59B6",
  Mar: "#1ABC9C",
  Apr: "#9C27B0",
  May: "#D4A5A5",
  Jun: "#E67E22",
  Jul: "#2ECC71",
  Aug: "#E91E63",
  Sep: "#F1C40F",
  Oct: "#5DADE2",
  Nov: "#BB8FCE",
  Dec: "#27AE60",
};

// 20 distinguishable colors for stacked categories
const PALETTE = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#14B8A6", "#6366F1", "#84CC16", "#06B6D4",
  "#D97706", "#F97316", "#A855F7", "#059669", "#E11D48",
  "#2563EB", "#7C3AED", "#475569", "#0284C7", "#64748B"
];

// ============================================================================
// Clinical Analytics Main Component
// ============================================================================

export function ClinicalAnalyticsPage() {
  const { notify } = useApp();
  const [topTab, setTopTab] = useState<"default" | "custom">("default");
  const [activeReport, setActiveReport] = useState<AnalyticsSectionId>("consultations-month-day");

  // Filters
  const [facility, setFacility] = useState<string>("All");
  const [provider, setProvider] = useState<string>("All");
  const [period, setPeriod] = useState<string>("2026");

  // Interactive Legend Toggling: Set of category series keys that are hidden
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Drilldown state (null when showing chart)
  const [drilldown, setDrilldown] = useState<DrilldownState | null>(null);

  // Reset drilldown and hidden series on report change
  function handleReportChange(rep: AnalyticsSectionId) {
    setActiveReport(rep);
    setDrilldown(null);
    setHiddenSeries(new Set());
  }

  // Load facilities and providers metadata
  const { data: meta } = useQuery({
    queryKey: ["analytics-meta"],
    queryFn: () => api("/analytics/meta"),
    staleTime: 5 * 60 * 1000,
  });

  const facilities = meta?.facilities || [
    "All",
    "Heal Your Heart Neelankarai",
    "Heal Your Heart Royapettah",
    "4R Health & Wellness",
    "Heal Your Heart Manapakkam",
    "Heal Your Heart Madurai",
    "Heal Your Heart Tirunelveli",
  ];

  const providers = meta?.providers || ["All"];
  const periods = meta?.years || ["2026", "2025", "2024"];

  // Toggle category on legend click
  function toggleSeries(label: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  // Print Report Handler
  function handlePrint() {
    window.print();
  }

  // Export current report handler
  function handleExportReport() {
    let exportUrl = "";
    if (activeReport.startsWith("consultations")) {
      exportUrl = `/api/analytics/consultations/drilldown?format=csv&facility=${encodeURIComponent(facility)}&year=${encodeURIComponent(period)}`;
    } else if (activeReport.startsWith("appointments")) {
      exportUrl = `/api/analytics/appointments/drilldown?format=csv&facility=${encodeURIComponent(facility)}&year=${encodeURIComponent(period)}`;
    } else {
      exportUrl = `/api/analytics/patients/drilldown?format=csv&facility=${encodeURIComponent(facility)}`;
    }
    window.open(exportUrl, "_blank");
  }

  return (
    <div className="charm-analytics-root">
      {/* Top Header Bar with Tabs */}
      <div className="charm-analytics-top-nav">
        <div className="charm-analytics-tabs-group">
          <button
            type="button"
            className={`charm-analytics-tab-btn ${topTab === "default" ? "active" : ""}`}
            onClick={() => setTopTab("default")}
          >
            Default Reports
          </button>
          <button
            type="button"
            className={`charm-analytics-tab-btn ${topTab === "custom" ? "active" : ""}`}
            onClick={() => setTopTab("custom")}
          >
            Custom Reports
          </button>
        </div>
      </div>

      {topTab === "custom" ? (
        <CustomReportsBuilder />
      ) : (
        <div className="charm-analytics-workspace">
          {/* Left Report Menu Sidebar */}
          <aside className="charm-analytics-sidebar">
            {/* Consultations */}
            <div className="charm-analytics-nav-group">
              <div className="charm-analytics-group-title">Consultations</div>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "consultations-month-day" ? "active" : ""}`}
                onClick={() => handleReportChange("consultations-month-day")}
              >
                By Month/Day
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "consultations-visit-type" ? "active" : ""}`}
                onClick={() => handleReportChange("consultations-visit-type")}
              >
                By Visit Type
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "consultations-mode" ? "active" : ""}`}
                onClick={() => handleReportChange("consultations-mode")}
              >
                By Mode
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "consultations-provider" ? "active" : ""}`}
                onClick={() => handleReportChange("consultations-provider")}
              >
                By Provider
              </button>
            </div>

            {/* Appointments */}
            <div className="charm-analytics-nav-group">
              <div className="charm-analytics-group-title">Appointments</div>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-month-day" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-month-day")}
              >
                By Month/Day
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-visit-type" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-visit-type")}
              >
                By Visit Type
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-mode" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-mode")}
              >
                By Mode
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-status" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-status")}
              >
                By Status
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-provider" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-provider")}
              >
                By Provider
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-avg-time" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-avg-time")}
              >
                Average Time per Status
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "appointments-booking-assistant" ? "active" : ""}`}
                onClick={() => handleReportChange("appointments-booking-assistant")}
              >
                Automated Booking Assistant
              </button>
            </div>

            {/* Patients */}
            <div className="charm-analytics-nav-group">
              <div className="charm-analytics-group-title">Patients</div>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-registration" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-registration")}
              >
                By Registration
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-demographics" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-demographics")}
              >
                By Demographics
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-phr" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-phr")}
              >
                By PHR Usage
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-pcp" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-pcp")}
              >
                By Primary Care Physician
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-referring-provider" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-referring-provider")}
              >
                By Referring Provider
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "patients-care-team" ? "active" : ""}`}
                onClick={() => handleReportChange("patients-care-team")}
              >
                By In-house Care Team
              </button>
            </div>

            {/* Medical Records */}
            <div className="charm-analytics-nav-group">
              <div className="charm-analytics-group-title">Medical Records</div>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "records-diagnoses" ? "active" : ""}`}
                onClick={() => handleReportChange("records-diagnoses")}
              >
                Top 20 Diagnoses
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "records-prescriptions" ? "active" : ""}`}
                onClick={() => handleReportChange("records-prescriptions")}
              >
                Top 20 Prescriptions
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "records-vaccines" ? "active" : ""}`}
                onClick={() => handleReportChange("records-vaccines")}
              >
                Top 20 Vaccines
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "records-lab-tests" ? "active" : ""}`}
                onClick={() => handleReportChange("records-lab-tests")}
              >
                Top 20 Lab Tests
              </button>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "records-supplements" ? "active" : ""}`}
                onClick={() => handleReportChange("records-supplements")}
              >
                Top 20 Supplements
              </button>
            </div>

            {/* Others */}
            <div className="charm-analytics-nav-group">
              <div className="charm-analytics-group-title">Others</div>
              <button
                type="button"
                className={`charm-analytics-nav-item ${activeReport === "others-feedback" ? "active" : ""}`}
                onClick={() => handleReportChange("others-feedback")}
              >
                Patient Feedback
              </button>
            </div>
          </aside>

          {/* Right Main Canvas */}
          <main className="charm-analytics-canvas">
            {drilldown ? (
              <DrilldownView drilldown={drilldown} onBack={() => setDrilldown(null)} />
            ) : (
              <>
                {/* Dynamic Filter Strip & Action Icons */}
                <div className="charm-analytics-filter-strip">
                  <div className="charm-analytics-filters-left">
                    <div className="charm-filter-field">
                      <label>Facility</label>
                      <select
                        value={facility}
                        onChange={(e) => setFacility(e.target.value)}
                        className="charm-select-sm"
                      >
                        {facilities.map((f: string) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="charm-filter-field">
                      <label>Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="charm-select-sm"
                      >
                        {providers.map((p: string) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="charm-filter-field">
                      <label>Period</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="charm-select-sm"
                      >
                        {periods.map((yr: string) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="charm-analytics-actions-right">
                    <button
                      type="button"
                      className="charm-icon-btn"
                      title="Print Report"
                      onClick={handlePrint}
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      type="button"
                      className="charm-icon-btn"
                      title="Export CSV"
                      onClick={handleExportReport}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                {/* Report Content View */}
                <div className="charm-analytics-content-view">
                  <ReportViewRenderer
                    reportId={activeReport}
                    facility={facility}
                    provider={provider}
                    period={period}
                    hiddenSeries={hiddenSeries}
                    onToggleSeries={toggleSeries}
                    onDrilldown={(dd) => setDrilldown(dd)}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Report View Renderer Component
// ============================================================================

function ReportViewRenderer({
  reportId,
  facility,
  provider,
  period,
  hiddenSeries,
  onToggleSeries,
  onDrilldown,
}: {
  reportId: AnalyticsSectionId;
  facility: string;
  provider: string;
  period: string;
  hiddenSeries: Set<string>;
  onToggleSeries: (series: string) => void;
  onDrilldown: (dd: DrilldownState) => void;
}) {
  // Determine API endpoint
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({
      facility,
      provider,
      period,
    });
    switch (reportId) {
      case "consultations-month-day":
        return `/analytics/consultations/by-month-day?${params}`;
      case "consultations-visit-type":
        return `/analytics/consultations/by-visit-type?${params}`;
      case "consultations-mode":
        return `/analytics/consultations/by-mode?${params}`;
      case "consultations-provider":
        return `/analytics/consultations/by-provider?${params}`;

      case "appointments-month-day":
        return `/analytics/appointments/by-month-day?${params}`;
      case "appointments-visit-type":
        return `/analytics/appointments/by-visit-type?${params}`;
      case "appointments-mode":
        return `/analytics/appointments/by-mode?${params}`;
      case "appointments-status":
        return `/analytics/appointments/by-status?${params}`;
      case "appointments-provider":
        return `/analytics/appointments/by-provider?${params}`;
      case "appointments-avg-time":
        return `/analytics/appointments/average-time-per-status?${params}`;
      case "appointments-booking-assistant":
        return `/analytics/appointments/automated-booking-assistant?${params}`;

      case "patients-registration":
        return `/analytics/patients/by-registration?${params}`;
      case "patients-demographics":
        return `/analytics/patients/by-demographics?category=all&${params}`;
      case "patients-phr":
        return `/analytics/patients/by-phr-usage?${params}`;
      case "patients-pcp":
        return `/analytics/patients/by-pcp?${params}`;
      case "patients-referring-provider":
        return `/analytics/patients/by-referring-provider?${params}`;
      case "patients-care-team":
        return `/analytics/patients/by-care-team?${params}`;

      case "records-diagnoses":
        return `/analytics/medical-records/top-20-diagnoses?${params}`;
      case "records-prescriptions":
        return `/analytics/medical-records/top-20-prescriptions?${params}`;
      case "records-vaccines":
        return `/analytics/medical-records/top-20-vaccines?${params}`;
      case "records-lab-tests":
        return `/analytics/medical-records/top-20-lab-tests?${params}`;
      case "records-supplements":
        return `/analytics/medical-records/top-20-supplements?${params}`;

      case "others-feedback":
        return `/analytics/patient-feedback?${params}`;

      default:
        return `/analytics/consultations/by-month-day?${params}`;
    }
  }, [reportId, facility, provider, period]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics-report", queryUrl],
    queryFn: () => api(queryUrl),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="charm-analytics-loading">
        <RefreshCw className="charm-spin" size={24} />
        <span>Loading report data...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="charm-analytics-error">
        <AlertCircle size={24} color="#EF4444" />
        <span>Failed to load report: {(error as any)?.message || "Unknown error"}</span>
      </div>
    );
  }

  if (!data) return null;

  // 1. Consultations / Appointments / Patients By Month/Day (Vertical Bar)
  if (
    reportId === "consultations-month-day" ||
    reportId === "appointments-month-day" ||
    reportId === "patients-registration"
  ) {
    const isAppt = reportId === "appointments-month-day";
    const isPatient = reportId === "patients-registration";
    const moduleName = isAppt ? "appointments" : isPatient ? "patients" : "consultations";

    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <VerticalBarChart
          data={data.data || []}
          yLabel={data.y_label || (isAppt ? "Appointment Count" : isPatient ? "Patient Count" : "Encounter Count")}
          xLabel={data.x_label || "Month"}
          onBarClick={(item) =>
            onDrilldown({
              module: moduleName,
              title: `${data.title} - ${item.month} ${period}`,
              month: item.month,
              facility,
              period,
            })
          }
        />
      </div>
    );
  }

  // 2. Stacked Bar Charts: By Visit Type, By Mode, By Status
  if (
    reportId === "consultations-visit-type" ||
    reportId === "consultations-mode" ||
    reportId === "appointments-visit-type" ||
    reportId === "appointments-mode" ||
    reportId === "appointments-status"
  ) {
    const isAppt = reportId.startsWith("appointments");
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <StackedBarChart
          series={data.series || []}
          data={data.data || []}
          yLabel={data.y_label || (isAppt ? "Appointment Count" : "Encounter Count")}
          xLabel={data.x_label || "Month"}
          hiddenSeries={hiddenSeries}
          onToggleSeries={onToggleSeries}
          onSegmentClick={(month, seriesKey) =>
            onDrilldown({
              module: isAppt ? "appointments" : "consultations",
              title: `${data.title} - ${seriesKey} (${month} ${period})`,
              month,
              series: seriesKey,
              facility,
              period,
            })
          }
        />
      </div>
    );
  }

  // 3. Horizontal Ranked Bar Charts: By Provider, Medical Records
  if (
    reportId === "consultations-provider" ||
    reportId === "appointments-provider" ||
    reportId === "patients-pcp" ||
    reportId === "patients-referring-provider" ||
    reportId === "patients-care-team" ||
    reportId === "records-diagnoses" ||
    reportId === "records-prescriptions" ||
    reportId === "records-vaccines" ||
    reportId === "records-lab-tests" ||
    reportId === "records-supplements"
  ) {
    const isProvider = reportId.includes("provider") || reportId.includes("pcp") || reportId.includes("care-team");
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <HorizontalRankedBarChart
          data={data.data || []}
          isProvider={isProvider}
          total={data.total}
          onBarClick={(item) =>
            onDrilldown({
              module: reportId.startsWith("appointments")
                ? "appointments"
                : reportId.startsWith("patients")
                ? "patients"
                : "consultations",
              title: `${data.title} - ${item.name || item.provider || item.referring_provider || item.member}`,
              provider: item.name || item.provider || item.referring_provider || item.member,
              facility,
              period,
            })
          }
        />
      </div>
    );
  }

  // 4. Demographics 4-Row Dashboard
  if (reportId === "patients-demographics") {
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">Patients By Demographics</h2>
        <DemographicsDashboard data={data} onDrilldown={onDrilldown} facility={facility} period={period} />
      </div>
    );
  }

  // 5. PHR Usage
  if (reportId === "patients-phr") {
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <PHRUsageView data={data} />
      </div>
    );
  }

  // 6. Average Time per Status
  if (reportId === "appointments-avg-time") {
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <AverageTimeChart data={data.data || []} />
      </div>
    );
  }

  // 7. Automated Booking Assistant
  if (reportId === "appointments-booking-assistant") {
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <BookingAssistantDashboard data={data} />
      </div>
    );
  }

  // 8. Patient Feedback
  if (reportId === "others-feedback") {
    return (
      <div className="charm-report-canvas-inner">
        <h2 className="charm-report-heading">{data.title}</h2>
        <PatientFeedbackView data={data} />
      </div>
    );
  }

  return <div>Report view not implemented.</div>;
}

// ============================================================================
// SVG Chart: Vertical Monthly Bar Chart
// ============================================================================

function VerticalBarChart({
  data,
  yLabel,
  xLabel,
  onBarClick,
}: {
  data: Array<{ month: string; count: number }>;
  yLabel: string;
  xLabel: string;
  onBarClick?: (item: { month: string; count: number }) => void;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const maxVal = useMemo(() => {
    const rawMax = Math.max(...data.map((d) => d.count), 10);
    // round up to clean ceiling (e.g., 700)
    return Math.ceil(rawMax / 100) * 100;
  }, [data]);

  const height = 360;
  const width = 880;
  const padLeft = 60;
  const padBottom = 40;
  const padTop = 30;
  const padRight = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const barSlotW = chartW / Math.max(data.length, 1);
  const barW = Math.min(24, barSlotW * 0.45);

  // Y axis ticks
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(Math.round);

  return (
    <div className="charm-chart-wrapper" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="charm-chart-svg"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {/* Y Axis Grid Lines & Labels */}
        {yTicks.map((tick) => {
          const y = padTop + chartH - (tick / maxVal) * chartH;
          return (
            <g key={tick} className="charm-grid-row">
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="2 2"
              />
              <text
                x={padLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#64748B"
              >
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Y Axis Title */}
        <text
          x={-(padTop + chartH / 2)}
          y={18}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize={11}
          fontWeight={500}
          fill="#64748B"
        >
          {yLabel}
        </text>

        {/* Bottom X-Axis Baseline */}
        <line
          x1={padLeft}
          y1={padTop + chartH}
          x2={width - padRight}
          y2={padTop + chartH}
          stroke="#CBD5E1"
          strokeWidth={1}
        />

        {/* Bars */}
        {data.map((item, idx) => {
          const barH = (item.count / maxVal) * chartH;
          const x = padLeft + idx * barSlotW + (barSlotW - barW) / 2;
          const y = padTop + chartH - barH;
          const color = MONTH_COLORS[item.month] || "#4A90E2";

          return (
            <g
              key={item.month}
              className="charm-bar-group"
              style={{ cursor: "pointer" }}
              onClick={() => onBarClick?.(item)}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.parentElement as any)?.getBoundingClientRect();
                setTooltip({
                  x: x + barW / 2,
                  y: y - 10,
                  text: `${item.month}: ${item.count.toLocaleString()} visits`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Value centered on top of bar */}
              {item.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={600}
                  fill="#334155"
                >
                  {item.count}
                </text>
              )}

              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 1)}
                fill={color}
                rx={1}
                className="charm-bar-rect"
              />

              {/* X Axis Month Label */}
              <text
                x={x + barW / 2}
                y={padTop + chartH + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#475569"
              >
                {item.month}
              </text>
            </g>
          );
        })}

        {/* X Axis Title */}
        <text
          x={padLeft + chartW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={500}
          fill="#64748B"
        >
          {xLabel}
        </text>
      </svg>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="charm-chart-tooltip"
          style={{
            position: "absolute",
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SVG Chart: Stacked Vertical Bar Chart with Interactive Legend
// ============================================================================

function StackedBarChart({
  series,
  data,
  yLabel,
  xLabel,
  hiddenSeries,
  onToggleSeries,
  onSegmentClick,
}: {
  series: string[];
  data: Array<{ month: string; values: Record<string, number>; total: number }>;
  yLabel: string;
  xLabel: string;
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesKey: string) => void;
  onSegmentClick?: (month: string, seriesKey: string) => void;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  // Map series names to fixed colors
  const seriesColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    series.forEach((s, idx) => {
      map[s] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [series]);

  // Recalculate totals and maximum based on active (non-hidden) series
  const { monthTotals, maxVal } = useMemo(() => {
    let max = 100;
    const totals: Record<string, number> = {};

    data.forEach((d) => {
      let t = 0;
      Object.entries(d.values || {}).forEach(([k, v]) => {
        if (!hiddenSeries.has(k)) {
          t += v;
        }
      });
      totals[d.month] = t;
      if (t > max) max = t;
    });

    const step = max > 1000 ? 500 : max > 500 ? 100 : 50;
    const roundedMax = Math.ceil(max / step) * step;
    return { monthTotals: totals, maxVal: roundedMax };
  }, [data, hiddenSeries]);

  const height = 400;
  const width = 880;
  const padLeft = 60;
  const padBottom = 40;
  const padTop = 30;
  const padRight = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const barSlotW = chartW / Math.max(data.length, 1);
  const barW = Math.min(26, barSlotW * 0.48);

  const yTicks = [0, maxVal * 0.2, maxVal * 0.4, maxVal * 0.6, maxVal * 0.8, maxVal].map(Math.round);

  return (
    <div className="charm-stacked-chart-container">
      <div className="charm-chart-wrapper" style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="charm-chart-svg"
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          {/* Y Axis Grid Lines */}
          {yTicks.map((tick) => {
            const y = padTop + chartH - (tick / maxVal) * chartH;
            return (
              <g key={tick} className="charm-grid-row">
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="#64748B"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Y Axis Title */}
          <text
            x={-(padTop + chartH / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="#64748B"
          >
            {yLabel}
          </text>

          {/* Baseline */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#CBD5E1"
            strokeWidth={1}
          />

          {/* Month Bars with Stacked Segments */}
          {data.map((item, mIdx) => {
            const x = padLeft + mIdx * barSlotW + (barSlotW - barW) / 2;
            let currentBottom = padTop + chartH;

            // Render each active series segment
            return (
              <g key={item.month}>
                {series.map((sKey) => {
                  if (hiddenSeries.has(sKey)) return null;
                  const val = item.values?.[sKey] || 0;
                  if (val <= 0) return null;

                  const segH = (val / maxVal) * chartH;
                  const segY = currentBottom - segH;
                  currentBottom = segY;

                  const color = seriesColorMap[sKey] || "#3B82F6";
                  const showLabel = segH >= 15;

                  return (
                    <g
                      key={sKey}
                      style={{ cursor: "pointer" }}
                      onClick={() => onSegmentClick?.(item.month, sKey)}
                      onMouseEnter={() => {
                        setTooltip({
                          x: x + barW / 2,
                          y: segY + segH / 2,
                          text: `${item.month} - ${sKey}: ${val.toLocaleString()}`,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <rect
                        x={x}
                        y={segY}
                        width={barW}
                        height={segH}
                        fill={color}
                        className="charm-stacked-seg"
                      />
                      {showLabel && (
                        <text
                          x={x + barW / 2}
                          y={segY + segH / 2 + 3.5}
                          textAnchor="middle"
                          fontSize={9.5}
                          fontWeight={600}
                          fill="#FFFFFF"
                          style={{ pointerEvents: "none" }}
                        >
                          {val}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* X Axis Month Label */}
                <text
                  x={x + barW / 2}
                  y={padTop + chartH + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#475569"
                >
                  {item.month}
                </text>
              </g>
            );
          })}

          {/* X Axis Title */}
          <text
            x={padLeft + chartW / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize={11}
            fontWeight={500}
            fill="#64748B"
          >
            {xLabel}
          </text>
        </svg>

        {/* Floating Tooltip */}
        {tooltip && (
          <div
            className="charm-chart-tooltip"
            style={{
              position: "absolute",
              left: `${(tooltip.x / width) * 100}%`,
              top: `${(tooltip.y / height) * 100}%`,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Interactive Legend Below Chart */}
      <div className="charm-interactive-legend">
        {series.map((sKey) => {
          const isHidden = hiddenSeries.has(sKey);
          const color = seriesColorMap[sKey] || "#3B82F6";

          return (
            <button
              type="button"
              key={sKey}
              className={`charm-legend-chip ${isHidden ? "hidden" : ""}`}
              onClick={() => onToggleSeries(sKey)}
              title={isHidden ? `Click to show ${sKey}` : `Click to hide ${sKey}`}
            >
              <span
                className="charm-legend-chip-color"
                style={{
                  backgroundColor: isHidden ? "#CBD5E1" : color,
                }}
              />
              <span
                className="charm-legend-chip-label"
                style={{
                  textDecoration: isHidden ? "line-through" : "none",
                  color: isHidden ? "#94A3B8" : "#334155",
                }}
              >
                {sKey}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// SVG Chart: Horizontal Ranked Bar Chart
// ============================================================================

function HorizontalRankedBarChart({
  data,
  isProvider,
  total,
  onBarClick,
}: {
  data: Array<any>;
  isProvider?: boolean;
  total?: number;
  onBarClick?: (item: any) => void;
}) {
  const maxVal = useMemo(() => {
    return Math.max(...data.map((d) => d.count || 0), 1);
  }, [data]);

  return (
    <div className="charm-ranked-bars-list">
      {data.map((item, idx) => {
        const name = item.name || item.provider || item.referring_provider || item.member || "";
        const code = item.icd10 || item.generic || item.cvx || item.loinc || item.dosage || "";
        const count = item.count || 0;
        const pct = item.pct || (total ? ((count / total) * 100).toFixed(1) : "");
        const barPct = (count / maxVal) * 100;

        return (
          <div
            key={name + idx}
            className="charm-ranked-bar-row"
            onClick={() => onBarClick?.(item)}
            style={{ cursor: "pointer" }}
          >
            <div className="charm-ranked-bar-meta">
              <span className="charm-ranked-bar-rank">#{item.rank || idx + 1}</span>
              <span className="charm-ranked-bar-name" title={name}>
                {name}
              </span>
              {code && <span className="charm-ranked-bar-code">({code})</span>}
            </div>

            <div className="charm-ranked-bar-track">
              <div
                className="charm-ranked-bar-fill"
                style={{
                  width: `${barPct}%`,
                  backgroundColor: PALETTE[idx % PALETTE.length],
                }}
              />
            </div>

            <div className="charm-ranked-bar-count">
              <span className="count-num">{count.toLocaleString()}</span>
              {pct && <span className="count-pct">({pct}%)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Donut Chart Component
// ============================================================================

function DonutChart({
  title,
  data,
  onClickSlice,
}: {
  title: string;
  data: Array<{ label: string; count: number; pct?: number }>;
  onClickSlice?: (item: { label: string; count: number }) => void;
}) {
  const total = useMemo(() => data.reduce((acc, d) => acc + d.count, 0), [data]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate slice angles
  const slices = useMemo(() => {
    let currentAngle = -Math.PI / 2; // start from top
    return data.map((d, idx) => {
      const sliceAngle = total > 0 ? (d.count / total) * 2 * Math.PI : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const rOuter = 70;
      const rInner = 44;
      const cx = 90;
      const cy = 90;

      const x1 = cx + rOuter * Math.cos(startAngle);
      const y1 = cy + rOuter * Math.sin(startAngle);
      const x2 = cx + rOuter * Math.cos(endAngle);
      const y2 = cy + rOuter * Math.sin(endAngle);

      const x3 = cx + rInner * Math.cos(endAngle);
      const y3 = cy + rInner * Math.sin(endAngle);
      const x4 = cx + rInner * Math.cos(startAngle);
      const y4 = cy + rInner * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return {
        ...d,
        color: PALETTE[idx % PALETTE.length],
        pathData,
      };
    });
  }, [data, total]);

  return (
    <div className="charm-donut-card">
      <div className="charm-donut-title">{title}</div>
      <div className="charm-donut-flex">
        <svg viewBox="0 0 180 180" className="charm-donut-svg">
          {slices.map((slice, idx) => (
            <path
              key={slice.label}
              d={slice.pathData}
              fill={slice.color}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              style={{
                cursor: "pointer",
                opacity: hoveredIndex === null || hoveredIndex === idx ? 1 : 0.6,
                transform: hoveredIndex === idx ? "scale(1.03)" : "scale(1)",
                transformOrigin: "90px 90px",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onClickSlice?.(slice)}
            />
          ))}
          {/* Donut Center Count */}
          <text x="90" y="86" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0F172A">
            {total.toLocaleString()}
          </text>
          <text x="90" y="102" textAnchor="middle" fontSize="10" fill="#64748B">
            Total
          </text>
        </svg>

        {/* Donut Legend */}
        <div className="charm-donut-legend">
          {slices.map((slice, idx) => (
            <div
              key={slice.label}
              className={`charm-donut-legend-row ${hoveredIndex === idx ? "hovered" : ""}`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onClickSlice?.(slice)}
              style={{ cursor: "pointer" }}
            >
              <span className="donut-color-dot" style={{ backgroundColor: slice.color }} />
              <span className="donut-label" title={slice.label}>
                {slice.label}
              </span>
              <span className="donut-val">{slice.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Category B: Patients Demographics 4-Row Dashboard
// ============================================================================

function DemographicsDashboard({
  data,
  onDrilldown,
  facility,
  period,
}: {
  data: any;
  onDrilldown: (dd: DrilldownState) => void;
  facility: string;
  period: string;
}) {
  return (
    <div className="charm-demographics-grid">
      {/* Row 1: Donut Charts (Age, Sex, Country) */}
      <div className="charm-demo-row-3">
        <DonutChart
          title="Age Distribution"
          data={data.age || []}
          onClickSlice={(s) =>
            onDrilldown({
              module: "patients",
              title: `Patients By Age - ${s.label}`,
              category: s.label,
              facility,
              period,
            })
          }
        />
        <DonutChart
          title="Sex Distribution"
          data={data.sex || []}
          onClickSlice={(s) =>
            onDrilldown({
              module: "patients",
              title: `Patients By Sex - ${s.label}`,
              category: s.label,
              facility,
              period,
            })
          }
        />
        <DonutChart
          title="Country Distribution"
          data={data.country || []}
          onClickSlice={(s) =>
            onDrilldown({
              module: "patients",
              title: `Patients By Country - ${s.label}`,
              category: s.label,
              facility,
              period,
            })
          }
        />
      </div>

      {/* Row 2: Horizontal Bars (State, City) */}
      <div className="charm-demo-row-2">
        <div className="charm-card-panel">
          <div className="charm-panel-header">State Distribution</div>
          <HorizontalRankedBarChart
            data={data.state || []}
            total={data.total}
            onBarClick={(item) =>
              onDrilldown({
                module: "patients",
                title: `Patients In State - ${item.label}`,
                category: item.label,
                facility,
                period,
              })
            }
          />
        </div>

        <div className="charm-card-panel">
          <div className="charm-panel-header">City Distribution</div>
          <HorizontalRankedBarChart
            data={data.city || []}
            total={data.total}
            onBarClick={(item) =>
              onDrilldown({
                module: "patients",
                title: `Patients In City - ${item.label}`,
                category: item.label,
                facility,
                period,
              })
            }
          />
        </div>
      </div>

      {/* Row 3: Horizontal Bars (District, Category) */}
      <div className="charm-demo-row-2">
        <div className="charm-card-panel">
          <div className="charm-panel-header">District Distribution</div>
          <HorizontalRankedBarChart
            data={data.district || []}
            total={data.total}
            onBarClick={(item) =>
              onDrilldown({
                module: "patients",
                title: `Patients In District - ${item.label}`,
                category: item.label,
                facility,
                period,
              })
            }
          />
        </div>

        <div className="charm-card-panel">
          <div className="charm-panel-header">Clinical Program Category</div>
          <HorizontalRankedBarChart
            data={data.category_breakdown || data.category || []}
            total={data.total}
            onBarClick={(item) =>
              onDrilldown({
                module: "patients",
                title: `Patients In Category - ${item.label}`,
                category: item.label,
                facility,
                period,
              })
            }
          />
        </div>
      </div>

      {/* Row 4: Donut Charts (Blood Group, Source) */}
      <div className="charm-demo-row-2">
        <DonutChart
          title="Blood Group"
          data={data.blood_group || []}
          onClickSlice={(s) =>
            onDrilldown({
              module: "patients",
              title: `Patients By Blood Group - ${s.label}`,
              category: s.label,
              facility,
              period,
            })
          }
        />
        <DonutChart
          title="Patient Referral Source"
          data={data.source || []}
          onClickSlice={(s) =>
            onDrilldown({
              module: "patients",
              title: `Patients By Source - ${s.label}`,
              category: s.label,
              facility,
              period,
            })
          }
        />
      </div>
    </div>
  );
}

// ============================================================================
// PHR Usage View
// ============================================================================

function PHRUsageView({ data }: { data: any }) {
  const kpis = data.kpis || {};
  return (
    <div className="charm-phr-wrap">
      <div className="charm-kpi-grid-4">
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Registered on PHR</div>
          <div className="charm-kpi-val">{(kpis.total_registered_phr || 742).toLocaleString()}</div>
        </div>
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Active Last 30 Days</div>
          <div className="charm-kpi-val" style={{ color: "#00A896" }}>
            {(kpis.active_30_days || 489).toLocaleString()}
          </div>
        </div>
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Invitations Sent</div>
          <div className="charm-kpi-val">{(kpis.invitations_sent || 1120).toLocaleString()}</div>
        </div>
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Adoption Rate</div>
          <div className="charm-kpi-val" style={{ color: "#3B82F6" }}>
            {kpis.adoption_rate_pct || 66.3}%
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <DonutChart
          title="PHR Portal Adoption"
          data={[
            { label: "Active Users", count: kpis.active_30_days || 489 },
            { label: "Registered / Inactive", count: (kpis.total_registered_phr || 742) - (kpis.active_30_days || 489) },
            { label: "Unregistered Patients", count: 378 },
          ]}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Average Time per Status View
// ============================================================================

function AverageTimeChart({ data }: { data: any[] }) {
  const maxMins = useMemo(() => {
    return Math.max(...data.map((d) => Math.max(d.target_minutes || 0, d.actual_minutes || 0)), 60);
  }, [data]);

  return (
    <div className="charm-avg-time-container">
      <div className="charm-time-legend">
        <span className="legend-item">
          <span className="dot target" /> Target Duration (Minutes)
        </span>
        <span className="legend-item">
          <span className="dot actual" /> Actual Duration (Minutes)
        </span>
      </div>

      <div className="charm-time-bars-list">
        {data.map((item) => (
          <div key={item.status} className="charm-time-row">
            <div className="time-status-label">{item.status}</div>

            <div className="time-tracks-pair">
              {/* Target Bar */}
              <div className="time-track">
                <div
                  className="time-fill target"
                  style={{ width: `${(item.target_minutes / maxMins) * 100}%` }}
                />
                <span className="time-val">{item.target_minutes}m</span>
              </div>

              {/* Actual Bar */}
              <div className="time-track">
                <div
                  className="time-fill actual"
                  style={{
                    width: `${(item.actual_minutes / maxMins) * 100}%`,
                    backgroundColor: item.actual_minutes > item.target_minutes ? "#EF4444" : "#10B981",
                  }}
                />
                <span className="time-val">{item.actual_minutes}m</span>
              </div>
            </div>

            <div className="time-variance">
              <span
                className={`variance-pill ${item.variance > 0 ? "negative" : "positive"}`}
              >
                {item.variance > 0 ? `+${item.variance}m` : `${item.variance}m`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Automated Booking Assistant View
// ============================================================================

function BookingAssistantDashboard({ data }: { data: any }) {
  const kpis = data.kpis || {};
  const funnel = data.funnel || [];
  const hourly = data.hourly_breakdown || [];

  return (
    <div className="charm-booking-assistant-wrap">
      {/* 3 KPI Cards */}
      <div className="charm-kpi-grid-3">
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Total Booking Attempts</div>
          <div className="charm-kpi-val">{(kpis.total_attempts || 1240).toLocaleString()}</div>
        </div>
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Self-Service Success Rate</div>
          <div className="charm-kpi-val" style={{ color: "#10B981" }}>
            {kpis.success_rate || "84.2%"}
          </div>
        </div>
        <div className="charm-kpi-card">
          <div className="charm-kpi-label">Average Booking Time</div>
          <div className="charm-kpi-val" style={{ color: "#3B82F6" }}>
            {kpis.avg_duration || "1.8 mins"}
          </div>
        </div>
      </div>

      {/* Booking Funnel */}
      <div className="charm-card-panel" style={{ marginTop: 20 }}>
        <div className="charm-panel-header">Booking Conversion Funnel</div>
        <div className="charm-funnel-steps">
          {funnel.map((step: any, idx: number) => (
            <div key={step.stage} className="charm-funnel-step-box">
              <div className="funnel-step-num">Step {idx + 1}</div>
              <div className="funnel-step-label">{step.stage}</div>
              <div className="funnel-step-val">{step.count.toLocaleString()}</div>
              {step.conversion && <div className="funnel-step-pct">{step.conversion}% converted</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Activity Chart */}
      <div className="charm-card-panel" style={{ marginTop: 20 }}>
        <div className="charm-panel-header">Hourly Booking Volume</div>
        <div className="charm-hourly-bars">
          {hourly.map((h: any) => (
            <div key={h.hour} className="charm-hourly-col">
              <div
                className="charm-hourly-bar"
                style={{ height: `${Math.min(100, (h.count / 150) * 100)}%` }}
                title={`${h.hour}: ${h.count} bookings`}
              />
              <span className="charm-hourly-label">{h.hour}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Patient Feedback View
// ============================================================================

function PatientFeedbackView({ data }: { data: any }) {
  const nps = data.nps || { score: 78, promoters: 84, passives: 10, detractors: 6 };
  const categories = data.categories || [];
  const comments = data.comments || [];

  return (
    <div className="charm-feedback-wrap">
      {/* NPS Score Card & Dimension Ratings */}
      <div className="charm-feedback-top-grid">
        <div className="charm-nps-card">
          <div className="charm-nps-title">Net Promoter Score (NPS)</div>
          <div className="charm-nps-number">{nps.score}</div>
          <div className="charm-nps-breakdown">
            <span style={{ color: "#10B981" }}>Promoters: {nps.promoters}%</span>
            <span style={{ color: "#F59E0B" }}>Passives: {nps.passives}%</span>
            <span style={{ color: "#EF4444" }}>Detractors: {nps.detractors}%</span>
          </div>
        </div>

        <div className="charm-ratings-card">
          <div className="charm-ratings-title">Care Quality Dimensions</div>
          <div className="charm-ratings-list">
            {categories.map((c: any) => (
              <div key={c.name} className="charm-rating-row">
                <span className="rating-name">{c.name}</span>
                <div className="rating-bar-wrap">
                  <div
                    className="rating-bar-fill"
                    style={{ width: `${(c.rating / 5) * 100}%` }}
                  />
                </div>
                <span className="rating-num">{c.rating} / 5.0</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verbatim Feedback Comments */}
      <div className="charm-card-panel" style={{ marginTop: 24 }}>
        <div className="charm-panel-header">Recent Patient Comments & Reviews</div>
        <div className="charm-comments-list">
          {comments.map((cm: any) => (
            <div key={cm.id} className="charm-comment-card">
              <div className="charm-comment-top">
                <span className="comment-initials">{cm.patient_initials}</span>
                <span className="comment-date">{cm.date}</span>
                <span className="comment-rating">{"★".repeat(cm.rating)}</span>
                <span className={`comment-sentiment ${cm.sentiment.toLowerCase()}`}>
                  {cm.sentiment}
                </span>
              </div>
              <div className="comment-text">"{cm.comment}"</div>
              <div className="comment-category">Area: {cm.category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Drilldown View (Table with sorting, search, pagination & CSV export)
// ============================================================================

function DrilldownView({
  drilldown,
  onBack,
}: {
  drilldown: DrilldownState;
  onBack: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query url
  const drilldownUrl = useMemo(() => {
    const p = new URLSearchParams({
      facility: drilldown.facility,
      period: drilldown.period,
      page: String(page),
      limit: String(limit),
    });
    if (drilldown.month) p.set("month", drilldown.month);
    if (drilldown.series) p.set("series", drilldown.series);
    if (drilldown.provider) p.set("provider", drilldown.provider);
    if (drilldown.category) p.set("category", drilldown.category);
    return `/analytics/${drilldown.module}/drilldown?${p.toString()}`;
  }, [drilldown, page, limit]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["drilldown-records", drilldownUrl],
    queryFn: () => api(drilldownUrl),
  });

  const records: any[] = data?.records || [];
  const totalRecords: number = data?.total || 0;
  const totalPages = Math.ceil(totalRecords / limit) || 1;

  // Filter records locally by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) =>
      Object.values(r).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [records, searchTerm]);

  // CSV Export Trigger
  function handleDownloadCSV() {
    const csvUrl = `/api${drilldownUrl}&format=csv`;
    window.open(csvUrl, "_blank");
  }

  // Determine Columns dynamically from first record
  const columns = useMemo(() => {
    if (records.length === 0) {
      if (drilldown.module === "consultations") {
        return ["Date", "Provider", "Patient Name", "Record ID", "Visit Type"];
      }
      if (drilldown.module === "appointments") {
        return ["Date", "Provider", "Patient Name", "Status", "Visit Type", "Start Time"];
      }
      return ["Date", "Patient ID", "Patient Name", "Gender", "City", "State"];
    }
    // Show top 6 most relevant columns for readability
    const priority = [
      "Date", "Consultation Date", "Appointment Date", "Registered Date",
      "Provider", "Consulting Provider",
      "Patient Name", "Name",
      "Record ID", "Patient ID", "MRN",
      "Visit Type", "Status", "Mode",
      "Age", "Gender", "City"
    ];
    const allKeys = Object.keys(records[0]);
    const sorted = allKeys.filter((k) => priority.includes(k));
    const rest = allKeys.filter((k) => !priority.includes(k));
    return [...sorted, ...rest].slice(0, 6);
  }, [records, drilldown.module]);

  return (
    <div className="charm-drilldown-canvas">
      {/* Top Header Strip: Back Arrow, Title, CSV Export */}
      <div className="charm-drilldown-header">
        <button
          type="button"
          className="charm-btn-back"
          onClick={onBack}
          title="Back to Charts"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <h2 className="charm-drilldown-title">{drilldown.title}</h2>

        <button
          type="button"
          className="charm-btn-export-csv"
          onClick={handleDownloadCSV}
        >
          <Download size={14} />
          <span>Export as CSV</span>
        </button>
      </div>

      {/* Search and Record Count Bar */}
      <div className="charm-drilldown-toolbar">
        <div className="charm-search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="charm-search-input"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="charm-drilldown-count">
          Showing {filteredRecords.length} of {totalRecords.toLocaleString()} records
        </div>
      </div>

      {/* Drilldown Records Table */}
      <div className="charm-drilldown-table-wrap">
        <table className="charm-data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: 32 }}>
                  Loading records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => {
                    const val = row[col] || "";
                    if (col === "Patient Name" || col === "Name") {
                      const patId = row["Patient ID"] || row["id"] || row["Record ID"];
                      return (
                        <td key={col}>
                          <a
                            href={patId ? `/patients/${patId}` : "#"}
                            className="charm-patient-link"
                            onClick={(e) => {
                              if (!patId) e.preventDefault();
                            }}
                          >
                            {val}
                          </a>
                        </td>
                      );
                    }
                    return <td key={col}>{val}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="charm-drilldown-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="charm-page-btn"
        >
          Previous
        </button>
        <span className="charm-page-info">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="charm-page-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Custom Reports Module (12 ChARM Standard Reports + 4 EECP Center Reports)
// ============================================================================

export type CustomReportSlug =
  // Standard 12
  | "patient-statistics"
  | "patient-followup"
  | "recall-report"
  | "prescription-report"
  | "vaccinations"
  | "lab-orders"
  | "lab-results"
  | "flowsheet-report"
  | "treatment-plan-report"
  | "implanted-devices"
  | "patient-feedback"
  | "whatsapp-report"
  // EECP Center 4
  | "demo-conversion-report"
  | "three-month-post-eecp-milestone"
  | "patient-health-outcomes"
  | "eecp-active-course-dropoff";

interface CustomReportMeta {
  slug: CustomReportSlug;
  title: string;
  category: "standard" | "eecp";
  buttonText?: string;
}

const CUSTOM_REPORTS_LIST: CustomReportMeta[] = [
  // 12 Standard Reports
  { slug: "patient-statistics", title: "Patient Statistics", category: "standard" },
  { slug: "patient-followup", title: "Patient Followup", category: "standard" },
  { slug: "recall-report", title: "Recall Report", category: "standard" },
  { slug: "prescription-report", title: "Prescription Report", category: "standard" },
  { slug: "vaccinations", title: "Vaccinations", category: "standard" },
  { slug: "lab-orders", title: "Lab Orders", category: "standard", buttonText: "Show Report" },
  { slug: "lab-results", title: "Lab Results", category: "standard" },
  { slug: "flowsheet-report", title: "Flowsheet Report", category: "standard" },
  { slug: "treatment-plan-report", title: "Treatment Plan Report", category: "standard" },
  { slug: "implanted-devices", title: "Implanted Devices", category: "standard" },
  { slug: "patient-feedback", title: "Patient Feedback", category: "standard" },
  { slug: "whatsapp-report", title: "WhatsApp Report", category: "standard" },
  // 4 EECP Center Reports
  { slug: "demo-conversion-report", title: "Demo Conversion Report (Treatment Started vs. Not Started)", category: "eecp" },
  { slug: "three-month-post-eecp-milestone", title: "3-Month Post-EECP Milestone & Follow-Up Report", category: "eecp" },
  { slug: "patient-health-outcomes", title: "Patient Health & Clinical Outcomes Report (Pre vs. Post EECP)", category: "eecp" },
  { slug: "eecp-active-course-dropoff", title: "EECP Active Course & Drop-Off Tracker", category: "eecp" },
];

function CustomReportsBuilder() {
  const { notify } = useApp();
  const [selectedSlug, setSelectedSlug] = useState<CustomReportSlug>("patient-statistics");
  const [running, setRunning] = useState(false);
  const [reportResult, setReportResult] = useState<{
    title: string;
    total_count: number;
    columns: string[];
    rows: any[];
  } | null>(null);

  // Search, sorting and pagination for results table
  const [tableSearch, setTableSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Filter states
  const [filters, setFilters] = useState<Record<string, any>>({
    status: "Active",
    provider: "All",
    facility: "All",
    months: "3",
    date_preset: "This Month",
    conversion_status: "All Demo Patients",
    milestone_window: "Completed 3 Months This Month",
    condition: "All",
    course_type: "All",
    direction: "All",
    template_type: "All",
    flowsheet: "Vaso-Meditech EECP Daily Chart",
    entries: "all",
  });

  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false);

  function updateFilter(key: string, val: any) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  // Reset filters when switching reports
  function handleSelectReport(slug: CustomReportSlug) {
    setSelectedSlug(slug);
    setReportResult(null);
    setTableSearch("");
    setCurrentPage(1);
    setShowAdditionalFilters(false);
  }

  const currentReportMeta = useMemo(
    () => CUSTOM_REPORTS_LIST.find((r) => r.slug === selectedSlug) || CUSTOM_REPORTS_LIST[0],
    [selectedSlug]
  );

  // Generate Report
  async function handleGenerate() {
    setRunning(true);
    try {
      const res = await api(`/analytics/custom-reports/${selectedSlug}`, "POST", {
        filters,
        export_format: "json",
      });
      setReportResult({
        title: res.title || currentReportMeta.title,
        total_count: res.total_count || res.rows?.length || 0,
        columns: res.columns || [],
        rows: res.rows || [],
      });
      setCurrentPage(1);
      notify(`Generated ${res.total_count || res.rows?.length || 0} records.`);
    } catch (err: any) {
      notify(err.message || "Failed to generate report");
    } finally {
      setRunning(false);
    }
  }

  // Export to CSV
  function handleExportCSV() {
    const params = new URLSearchParams();
    params.set("export_format", "csv");
    const downloadUrl = `/api/analytics/custom-reports/${selectedSlug}?${params.toString()}`;
    
    fetch(downloadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters, export_format: "csv" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        notify("CSV downloaded successfully.");
      })
      .catch((err) => {
        notify(err.message || "CSV download failed");
      });
  }

  // Print Report
  function handlePrint() {
    window.print();
  }

  // Filtered & Sorted rows for table
  const processedRows = useMemo(() => {
    if (!reportResult) return [];
    let list = [...reportResult.rows];

    // Search filter
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortCol) {
      list.sort((a, b) => {
        const va = String(a[sortCol] || "");
        const vb = String(b[sortCol] || "");
        const cmp = va.localeCompare(vb, undefined, { numeric: true });
        return sortAsc ? cmp : -cmp;
      });
    }

    return list;
  }, [reportResult, tableSearch, sortCol, sortAsc]);

  const totalPages = Math.ceil(processedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedRows.slice(start, start + rowsPerPage);
  }, [processedRows, currentPage]);

  const FACILITIES = [
    "All",
    "Heal Your Heart Neelankarai",
    "Heal Your Heart Royapettah",
    "4R Health & Wellness",
    "Heal Your Heart Manapakkam",
    "Heal Your Heart Madurai",
    "Heal Your Heart Tirunelveli",
  ];

  const PROVIDERS = [
    "All",
    "Dr Ramasamy S",
    "Dr Elakkiya M",
    "Ibahal Roshan NM",
    "Aksharra P",
    "Dr Ebineah Joel",
    "Dr Raja Ganesh R",
  ];

  return (
    <div className="charm-custom-reports-workspace">
      {/* Printable Letterhead (visible only on @media print) */}
      <div className="charm-print-letterhead">
        <div className="print-clinic-name">HEAL YOUR HEART - VASO-MEDITECH CLINIC</div>
        <div className="print-clinic-sub">Non-Invasive Cardiology & EECP Treatment Centers</div>
        <div className="print-report-name">{currentReportMeta.title}</div>
        <div className="print-report-meta">
          Date: {new Date().toLocaleDateString()} | Generated by Heal Your Heart EHR
        </div>
      </div>

      {/* Left Sidebar */}
      <aside className="charm-custom-sidebar">
        {/* Standard Reports */}
        <div className="charm-custom-nav-group">
          {CUSTOM_REPORTS_LIST.filter((r) => r.category === "standard").map((rep) => (
            <button
              key={rep.slug}
              type="button"
              className={`charm-custom-nav-item ${selectedSlug === rep.slug ? "active" : ""}`}
              onClick={() => handleSelectReport(rep.slug)}
            >
              {rep.title}
            </button>
          ))}
        </div>

        {/* Specialized EECP Center Reports Header */}
        <div className="charm-custom-eecp-header">
          <span>Heal Your Heart EECP Center Reports</span>
        </div>

        {/* EECP Center Reports */}
        <div className="charm-custom-nav-group">
          {CUSTOM_REPORTS_LIST.filter((r) => r.category === "eecp").map((rep) => (
            <button
              key={rep.slug}
              type="button"
              className={`charm-custom-nav-item eecp-item ${selectedSlug === rep.slug ? "active" : ""}`}
              onClick={() => handleSelectReport(rep.slug)}
            >
              {rep.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Right Canvas */}
      <main className="charm-custom-canvas">
        {/* Filter Form Card */}
        <div className="charm-custom-filter-card">
          <h2 className="charm-custom-canvas-title">{currentReportMeta.title}</h2>

          {/* Form specific to selected slug */}
          <div className="charm-custom-form-body">
            {/* 1. Patient Statistics */}
            {selectedSlug === "patient-statistics" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-section-heading">Demographics</div>
                <div className="charm-cr-2col-grid">
                  {/* Left Column */}
                  <div className="charm-cr-field-row">
                    <label>Age</label>
                    <select
                      className="charm-cr-select"
                      value={filters.age || "--Select--"}
                      onChange={(e) => updateFilter("age", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="0-14">0-14</option>
                      <option value="15-24">15-24</option>
                      <option value="25-39">25-39</option>
                      <option value="40-59">40-59</option>
                      <option value="60-79">60-79</option>
                      <option value="80+">80+</option>
                    </select>
                  </div>

                  {/* Right Column */}
                  <div className="charm-cr-field-row">
                    <label>Date of Birth</label>
                    <div style={{ display: "flex", gap: 8, flex: 1 }}>
                      <select
                        className="charm-cr-select"
                        value={filters.dob_month || "--"}
                        onChange={(e) => updateFilter("dob_month", e.target.value)}
                      >
                        <option value="--">--</option>
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="charm-cr-select"
                        value={filters.dob_day || "--"}
                        onChange={(e) => updateFilter("dob_day", e.target.value)}
                      >
                        <option value="--">--</option>
                        {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Smoking Status</label>
                    <select
                      className="charm-cr-select"
                      value={filters.smoking_status || "--Select--"}
                      onChange={(e) => updateFilter("smoking_status", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Current every day smoker">Current every day smoker</option>
                      <option value="Current some day smoker">Current some day smoker</option>
                      <option value="Former smoker">Former smoker</option>
                      <option value="Never smoker">Never smoker</option>
                      <option value="Smoker, current status unknown">Smoker, current status unknown</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Marital Status</label>
                    <select
                      className="charm-cr-select"
                      value={filters.marital_status || "--Select--"}
                      onChange={(e) => updateFilter("marital_status", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Gender</label>
                    <select
                      className="charm-cr-select"
                      value={filters.gender || "--Select--"}
                      onChange={(e) => updateFilter("gender", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Blood Group</label>
                    <select
                      className="charm-cr-select"
                      value={filters.blood_group || "--Select--"}
                      onChange={(e) => updateFilter("blood_group", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Patient Category</label>
                    <select
                      className="charm-cr-select"
                      value={filters.patient_category || "-- Select --"}
                      onChange={(e) => updateFilter("patient_category", e.target.value)}
                    >
                      <option value="-- Select --">-- Select --</option>
                      <option value="Angina">Angina</option>
                      <option value="Heart Failure">Heart Failure</option>
                      <option value="Wellness">Wellness</option>
                      <option value="Risk Factor Modification">Risk Factor Modification</option>
                      <option value="International">International</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>In-house Care Team</label>
                    <select
                      className="charm-cr-select"
                      value={filters.inhouse_care_team || "-- Select --"}
                      onChange={(e) => updateFilter("inhouse_care_team", e.target.value)}
                    >
                      <option value="-- Select --">-- Select --</option>
                      <option value="Dr Ramasamy S">Dr Ramasamy S</option>
                      <option value="Dr Elakkiya M">Dr Elakkiya M</option>
                      <option value="Aksharra P">Aksharra P (Lead Therapist)</option>
                      <option value="Ibahal Roshan NM">Ibahal Roshan NM</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Source</label>
                    <select
                      className="charm-cr-select"
                      value={filters.source || "--Select--"}
                      onChange={(e) => updateFilter("source", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Social Network-Youtube">Social Network-Youtube</option>
                      <option value="Friend">Friend</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Social Network-Google">Social Network-Google</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Newspaper">Newspaper</option>
                      <option value="TV">TV</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Specific Source</label>
                    <select
                      className="charm-cr-select"
                      value={filters.specific_source || "--Select--"}
                      onChange={(e) => updateFilter("specific_source", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Cardiologist Referral">Cardiologist Referral</option>
                      <option value="Previous EECP Patient">Previous EECP Patient</option>
                      <option value="Google Search">Google Search</option>
                      <option value="YouTube Video">YouTube Video</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Status</label>
                    <select
                      className="charm-cr-select"
                      value={filters.status || "Active"}
                      onChange={(e) => updateFilter("status", e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="All">All</option>
                    </select>
                  </div>
                </div>

                {/* Provider & Appointment */}
                <div className="charm-cr-section-heading" style={{ marginTop: 18 }}>Provider & Appointment</div>
                <div className="charm-cr-2col-grid">
                  <div className="charm-cr-field-row">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Appointment</label>
                    <select
                      className="charm-cr-select"
                      value={filters.appointment || "--Select--"}
                      onChange={(e) => updateFilter("appointment", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Has Appointments">Has Appointments</option>
                      <option value="No Appointments">No Appointments</option>
                      <option value="Upcoming Appointment">Upcoming Appointment</option>
                    </select>
                  </div>
                </div>

                {/* Card on File */}
                <div className="charm-cr-section-heading" style={{ marginTop: 18 }}>Card on File & Recurring Profile Information</div>
                <div className="charm-cr-2col-grid">
                  <div className="charm-cr-field-row">
                    <label>Has Card on File <Info size={13} style={{ display: "inline", color: "#94A3B8" }} /></label>
                    <select
                      className="charm-cr-select"
                      value={filters.has_card || "--Select--"}
                      onChange={(e) => updateFilter("has_card", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Has Recurring Profile <Info size={13} style={{ display: "inline", color: "#94A3B8" }} /></label>
                    <select
                      className="charm-cr-select"
                      value={filters.has_recurring || "--Select--"}
                      onChange={(e) => updateFilter("has_recurring", e.target.value)}
                    >
                      <option value="--Select--">--Select--</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                {/* Medical History */}
                <div className="charm-cr-section-heading" style={{ marginTop: 18 }}>Medical History</div>
                <div className="charm-cr-field-row" style={{ marginBottom: 12 }}>
                  <label>Diagnosis</label>
                  <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                    <select
                      className="charm-cr-select"
                      style={{ width: 100 }}
                      value={filters.diagnosis_match || "is"}
                      onChange={(e) => updateFilter("diagnosis_match", e.target.value)}
                    >
                      <option value="is">is</option>
                      <option value="contains">contains</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search by name [or] code"
                      className="charm-cr-input"
                      value={filters.diagnosis || ""}
                      onChange={(e) => updateFilter("diagnosis", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>in past</span>
                    <input
                      type="text"
                      style={{ width: 50 }}
                      className="charm-cr-input"
                      value={filters.diagnosis_months || ""}
                      onChange={(e) => updateFilter("diagnosis_months", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>month(s)</span>
                  </div>
                </div>

                <div className="charm-cr-field-row">
                  <label>Medication</label>
                  <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Search"
                      className="charm-cr-input"
                      value={filters.medication || ""}
                      onChange={(e) => updateFilter("medication", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>in past</span>
                    <input
                      type="text"
                      style={{ width: 50 }}
                      className="charm-cr-input"
                      value={filters.medication_months || ""}
                      onChange={(e) => updateFilter("medication_months", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>month(s)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Patient Followup */}
            {selectedSlug === "patient-followup" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-field-row" style={{ marginBottom: 16 }}>
                  <label style={{ width: 220 }}>Patients did not come for consultation in last</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      className="charm-cr-input"
                      style={{ width: 80 }}
                      value={filters.months || "3"}
                      onChange={(e) => updateFilter("months", e.target.value)}
                    />
                    <span style={{ fontSize: 13, color: "#475569" }}>months</span>
                  </div>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 16 }}>
                  <label style={{ width: 220 }}>Provider</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 240 }}
                    value={filters.provider || "All"}
                    onChange={(e) => updateFilter("provider", e.target.value)}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="charm-cr-toggle-link"
                  onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                >
                  <ChevronDown
                    size={14}
                    style={{
                      transform: showAdditionalFilters ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  />
                  <span>Apply Additional Filters</span>
                </button>

                {showAdditionalFilters && (
                  <div className="charm-cr-collapsible-panel">
                    <div className="charm-cr-field-row">
                      <label>With active Diagnosis</label>
                      <input
                        type="text"
                        placeholder="e.g. I20.9 Angina"
                        className="charm-cr-input"
                        value={filters.active_diagnosis || ""}
                        onChange={(e) => updateFilter("active_diagnosis", e.target.value)}
                      />
                    </div>
                    <div className="charm-cr-field-row" style={{ marginTop: 10 }}>
                      <label>Exclude Visit Types</label>
                      <select
                        className="charm-cr-select"
                        value={filters.exclude_visit_type || ""}
                        onChange={(e) => updateFilter("exclude_visit_type", e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="Admission">Admission</option>
                        <option value="Telehealth">Telehealth</option>
                        <option value="Walk-in">Walk-in</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Recall Report */}
            {selectedSlug === "recall-report" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Recall Type</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 320 }}
                    value={filters.recall_type || "All"}
                    onChange={(e) => updateFilter("recall_type", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Post-EECP 3-Month Check">Post-EECP 3-Month Check</option>
                    <option value="Lipid & Blood Sugar Review">Lipid & Blood Sugar Review</option>
                    <option value="Cardiology Annual Consultation">Cardiology Annual Consultation</option>
                    <option value="Holter/ECG Follow-up">Holter/ECG Follow-up</option>
                    <option value="EECP Maintenance Booster">EECP Maintenance Booster</option>
                  </select>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Recall Status</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 320 }}
                    value={filters.recall_status || "All"}
                    onChange={(e) => updateFilter("recall_status", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Pending Call">Pending Call</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Left Voicemail">Left Voicemail</option>
                    <option value="Declined">Declined</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Due Date</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.due_from || ""}
                      onChange={(e) => updateFilter("due_from", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.due_to || ""}
                      onChange={(e) => updateFilter("due_to", e.target.value)}
                    />
                  </div>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Created Date</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.created_from || ""}
                      onChange={(e) => updateFilter("created_from", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.created_to || ""}
                      onChange={(e) => updateFilter("created_to", e.target.value)}
                    />
                  </div>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Provider</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 320 }}
                    value={filters.provider || "All"}
                    onChange={(e) => updateFilter("provider", e.target.value)}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 4. Prescription Report */}
            {selectedSlug === "prescription-report" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "All"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Prescriber</label>
                    <select
                      className="charm-cr-select"
                      value={filters.prescriber || "All"}
                      onChange={(e) => updateFilter("prescriber", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Patient</label>
                    <input
                      type="text"
                      placeholder="Search Patient by Name / ID"
                      className="charm-cr-input"
                      style={{ width: 200 }}
                      value={filters.patient || ""}
                      onChange={(e) => updateFilter("patient", e.target.value)}
                    />
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Date Range</label>
                    <select
                      className="charm-cr-select"
                      value={filters.date_preset || "Previous Month"}
                      onChange={(e) => updateFilter("date_preset", e.target.value)}
                    >
                      <option value="This Month">This Month</option>
                      <option value="Previous Month">Previous Month</option>
                      <option value="Last 3 Months">Last 3 Months</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="charm-cr-field-row">
                  <label>Drug Name</label>
                  <input
                    type="text"
                    placeholder="Search Drug by Name"
                    className="charm-cr-input"
                    style={{ maxWidth: 300 }}
                    value={filters.drug_name || ""}
                    onChange={(e) => updateFilter("drug_name", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* 5. Vaccinations */}
            {selectedSlug === "vaccinations" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 100 }}>Period</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_from || ""}
                      onChange={(e) => updateFilter("period_from", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_to || ""}
                      onChange={(e) => updateFilter("period_to", e.target.value)}
                    />
                    <button
                      type="button"
                      className="charm-cr-link-inline"
                      style={{ marginLeft: 16 }}
                      onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                    >
                      Apply Additional Filters
                    </button>
                  </div>
                </div>

                {showAdditionalFilters && (
                  <div className="charm-cr-collapsible-panel">
                    <div className="charm-cr-2col-grid">
                      <div className="charm-cr-field-row">
                        <label>Vaccine</label>
                        <input
                          type="text"
                          placeholder="Search vaccine"
                          className="charm-cr-input"
                          value={filters.vaccine || ""}
                          onChange={(e) => updateFilter("vaccine", e.target.value)}
                        />
                      </div>
                      <div className="charm-cr-field-row">
                        <label>Status</label>
                        <select
                          className="charm-cr-select"
                          value={filters.vaccine_status || "All"}
                          onChange={(e) => updateFilter("vaccine_status", e.target.value)}
                        >
                          <option value="All">All</option>
                          <option value="Administered">Administered</option>
                          <option value="Historical">Historical</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Lab Orders */}
            {selectedSlug === "lab-orders" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <div className="charm-cr-inline-field">
                    <label>Filter</label>
                    <select
                      className="charm-cr-select"
                      value={filters.lab_filter || "Ordered Date"}
                      onChange={(e) => updateFilter("lab_filter", e.target.value)}
                    >
                      <option value="Ordered Date">Ordered Date</option>
                      <option value="Lab Tests">Lab Tests</option>
                      <option value="Panels">Panels</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Date Range</label>
                    <select
                      className="charm-cr-select"
                      value={filters.date_preset || "This Month"}
                      onChange={(e) => updateFilter("date_preset", e.target.value)}
                    >
                      <option value="This Month">This Month</option>
                      <option value="Previous Month">Previous Month</option>
                      <option value="This Quarter">This Quarter</option>
                      <option value="This Year">This Year</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>From</label>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.from_date || "2026-11-01"}
                      onChange={(e) => updateFilter("from_date", e.target.value)}
                    />
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>To</label>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.to_date || "2026-11-20"}
                      onChange={(e) => updateFilter("to_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. Lab Results */}
            {selectedSlug === "lab-results" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <div className="charm-cr-inline-field">
                    <label>Filter</label>
                    <select
                      className="charm-cr-select"
                      value={filters.result_filter || "Result Tests"}
                      onChange={(e) => updateFilter("result_filter", e.target.value)}
                    >
                      <option value="Result Tests">Result Tests</option>
                      <option value="Abnormal Results">Abnormal Results</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Date Range</label>
                    <select
                      className="charm-cr-select"
                      value={filters.date_preset || "This Month"}
                      onChange={(e) => updateFilter("date_preset", e.target.value)}
                    >
                      <option value="This Month">This Month</option>
                      <option value="Previous Month">Previous Month</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 8. Flowsheet Report */}
            {selectedSlug === "flowsheet-report" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 120 }}>Flowsheet</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 320 }}
                    value={filters.flowsheet || "Vaso-Meditech EECP Daily Chart"}
                    onChange={(e) => updateFilter("flowsheet", e.target.value)}
                  >
                    <option value="-- Select --">-- Select --</option>
                    <option value="Vaso-Meditech EECP Daily Chart">Vaso-Meditech EECP Daily Chart</option>
                    <option value="Vaso-Meditech EECP Weekly Chart">Vaso-Meditech EECP Weekly Chart</option>
                    <option value="Sphygmocor Report">Sphygmocor Report</option>
                    <option value="Vaso-Meditech Blood Sugar Chart">Vaso-Meditech Blood Sugar Chart</option>
                  </select>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 120 }}>Period</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_from || "2026-10-21"}
                      onChange={(e) => updateFilter("period_from", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_to || "2026-11-20"}
                      onChange={(e) => updateFilter("period_to", e.target.value)}
                    />
                  </div>
                </div>

                <div className="charm-cr-field-row">
                  <label style={{ width: 120 }}>Entries</label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <label className="charm-cr-radio-label">
                      <input
                        type="radio"
                        name="entries"
                        checked={filters.entries !== "flagged"}
                        onChange={() => updateFilter("entries", "all")}
                      />
                      <span>All Entries</span>
                    </label>
                    <label className="charm-cr-radio-label">
                      <input
                        type="radio"
                        name="entries"
                        checked={filters.entries === "flagged"}
                        onChange={() => updateFilter("entries", "flagged")}
                      />
                      <span>Flagged Entries</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 9. Treatment Plan Report */}
            {selectedSlug === "treatment-plan-report" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Plan Name *</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 340 }}
                    value={filters.plan_name || "-- Select --"}
                    onChange={(e) => updateFilter("plan_name", e.target.value)}
                  >
                    <option value="-- Select --">-- Select --</option>
                    <option value="EECP 35 Sessions">EECP 35 Sessions Intensive Protocol</option>
                    <option value="EECP 20 Sessions">EECP 20 Sessions Maintenance Course</option>
                    <option value="CAD/CHF/MVD">CAD / Angina Comprehensive Care</option>
                    <option value="DM-HTN">DM-HTN Cardio-Metabolic Protocol</option>
                    <option value="Hyperlipidemia Management">Hyperlipidemia Management</option>
                  </select>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Status</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 220 }}
                    value={filters.plan_status || "All"}
                    onChange={(e) => updateFilter("plan_status", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="charm-cr-field-row">
                  <label style={{ width: 140 }}>Period *</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_from || "2026-10-20"}
                      onChange={(e) => updateFilter("period_from", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.period_to || "2026-11-20"}
                      onChange={(e) => updateFilter("period_to", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10. Implanted Devices */}
            {selectedSlug === "implanted-devices" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-2col-grid">
                  <div className="charm-cr-field-row">
                    <label>GMDN PT Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Stent or Pacemaker"
                      className="charm-cr-input"
                      value={filters.gmdn_pt_name || ""}
                      onChange={(e) => updateFilter("gmdn_pt_name", e.target.value)}
                    />
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Implant Date</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="date"
                        className="charm-cr-input"
                        value={filters.implant_from || ""}
                        onChange={(e) => updateFilter("implant_from", e.target.value)}
                      />
                      <span>To</span>
                      <input
                        type="date"
                        className="charm-cr-input"
                        value={filters.implant_to || ""}
                        onChange={(e) => updateFilter("implant_to", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Batch / Lot Number</label>
                    <input
                      type="text"
                      className="charm-cr-input"
                      value={filters.batch_lot || ""}
                      onChange={(e) => updateFilter("batch_lot", e.target.value)}
                    />
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Status</label>
                    <select
                      className="charm-cr-select"
                      value={filters.device_status || "All"}
                      onChange={(e) => updateFilter("device_status", e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Brand Name</label>
                    <input
                      type="text"
                      className="charm-cr-input"
                      value={filters.brand_name || ""}
                      onChange={(e) => updateFilter("brand_name", e.target.value)}
                    />
                  </div>

                  <div className="charm-cr-field-row">
                    <label>Company name</label>
                    <input
                      type="text"
                      className="charm-cr-input"
                      value={filters.company || ""}
                      onChange={(e) => updateFilter("company", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 11. Patient Feedback */}
            {selectedSlug === "patient-feedback" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                  <div className="charm-cr-inline-field">
                    <label>Feedback Form</label>
                    <select
                      className="charm-cr-select"
                      value={filters.feedback_form || "Vaso-Meditech Feedback Form"}
                      onChange={(e) => updateFilter("feedback_form", e.target.value)}
                    >
                      <option value="-- Select --">-- Select --</option>
                      <option value="Vaso-Meditech Feedback Form">Vaso-Meditech Feedback Form</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "Heal Your Heart Neelankarai"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Period</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="date"
                        className="charm-cr-input"
                        value={filters.period_from || "2026-10-21"}
                        onChange={(e) => updateFilter("period_from", e.target.value)}
                      />
                      <span>To</span>
                      <input
                        type="date"
                        className="charm-cr-input"
                        value={filters.period_to || "2026-11-20"}
                        onChange={(e) => updateFilter("period_to", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 12. WhatsApp Report */}
            {selectedSlug === "whatsapp-report" && (
              <div className="charm-cr-form-wrap">
                <div className="charm-cr-section-heading">Message Filters</div>
                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Patient Search</label>
                  <input
                    type="text"
                    placeholder="Enter Patient Name or Record Id"
                    className="charm-cr-input"
                    style={{ maxWidth: 300 }}
                    value={filters.patient_search || ""}
                    onChange={(e) => updateFilter("patient_search", e.target.value)}
                  />
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Incoming/Outgoing</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 200 }}
                    value={filters.direction || "All"}
                    onChange={(e) => updateFilter("direction", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Incoming">Incoming</option>
                    <option value="Outgoing">Outgoing</option>
                  </select>
                </div>

                <div className="charm-cr-field-row" style={{ marginBottom: 14 }}>
                  <label style={{ width: 140 }}>Template Type</label>
                  <select
                    className="charm-cr-select"
                    style={{ maxWidth: 200 }}
                    value={filters.template_type || "All"}
                    onChange={(e) => updateFilter("template_type", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Utility">Utility</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Authentication">Authentication</option>
                  </select>
                </div>

                <div className="charm-cr-field-row">
                  <label style={{ width: 140 }}>Date Range</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.from_date || ""}
                      onChange={(e) => updateFilter("from_date", e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: "#64748B" }}>To</span>
                    <input
                      type="date"
                      className="charm-cr-input"
                      value={filters.to_date || ""}
                      onChange={(e) => updateFilter("to_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 13. EECP: Demo Conversion Report */}
            {selectedSlug === "demo-conversion-report" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="charm-cr-inline-field">
                    <label>Period</label>
                    <select
                      className="charm-cr-select"
                      value={filters.period_preset || "Last 6 Months"}
                      onChange={(e) => updateFilter("period_preset", e.target.value)}
                    >
                      <option value="Last 3 Months">Last 3 Months</option>
                      <option value="Last 6 Months">Last 6 Months (Default)</option>
                      <option value="Last 1 Year">Last 1 Year</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Conversion Status</label>
                    <select
                      className="charm-cr-select"
                      style={{ fontWeight: 600, color: "#0D9488" }}
                      value={filters.conversion_status || "All Demo Patients"}
                      onChange={(e) => updateFilter("conversion_status", e.target.value)}
                    >
                      <option value="All Demo Patients">All Demo Patients</option>
                      <option value="Treatment Started">Treatment Started (Converted)</option>
                      <option value="Treatment Not Started">Treatment Not Started (Pending / Drop-off)</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "All"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 14. EECP: 3-Month Post-EECP Milestone & Follow-Up */}
            {selectedSlug === "three-month-post-eecp-milestone" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="charm-cr-inline-field">
                    <label>Milestone Window</label>
                    <select
                      className="charm-cr-select"
                      style={{ maxWidth: 260 }}
                      value={filters.milestone_window || "Completed 3 Months This Month"}
                      onChange={(e) => updateFilter("milestone_window", e.target.value)}
                    >
                      <option value="Completed 3 Months This Month">Completed 3 Months This Month</option>
                      <option value="Due Today / ±7 Days">Due Today / ±7 Days</option>
                      <option value="Overdue > 3 Months without Reassessment">Overdue &gt; 3 Months without Reassessment</option>
                      <option value="Custom Target Date">Custom Target Date</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Reassessment Booked?</label>
                    <select
                      className="charm-cr-select"
                      value={filters.reassessment_status || "All"}
                      onChange={(e) => updateFilter("reassessment_status", e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="Not Yet Scheduled">Not Yet Scheduled (Pending Call)</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "All"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 15. EECP: Patient Health & Clinical Outcomes Report */}
            {selectedSlug === "patient-health-outcomes" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="charm-cr-inline-field">
                    <label>Health Condition / Comorbidity</label>
                    <select
                      className="charm-cr-select"
                      style={{ maxWidth: 280 }}
                      value={filters.condition || "All"}
                      onChange={(e) => updateFilter("condition", e.target.value)}
                    >
                      <option value="All">All Conditions</option>
                      <option value="CAD">CAD (Coronary Artery Disease)</option>
                      <option value="Heart Failure">Heart Failure / Low EF</option>
                      <option value="Diabetes Mellitus">Diabetes Mellitus (DM)</option>
                      <option value="Hypertension">Hypertension (HTN)</option>
                      <option value="Hyperlipidemia">Hyperlipidemia</option>
                      <option value="Post-CABG">Post-PTCA / Post-CABG</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>NYHA / CCS Class</label>
                    <select
                      className="charm-cr-select"
                      value={filters.nyha_class || "All"}
                      onChange={(e) => updateFilter("nyha_class", e.target.value)}
                    >
                      <option value="All">All Classes</option>
                      <option value="Class I">Class I</option>
                      <option value="Class II">Class II</option>
                      <option value="Class III">Class III</option>
                      <option value="Class IV">Class IV</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "All"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 16. EECP: Active Course & Drop-Off Tracker */}
            {selectedSlug === "eecp-active-course-dropoff" && (
              <div className="charm-cr-form-wrap">
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="charm-cr-inline-field">
                    <label>Course Type</label>
                    <select
                      className="charm-cr-select"
                      value={filters.course_type || "All"}
                      onChange={(e) => updateFilter("course_type", e.target.value)}
                    >
                      <option value="All">All Courses</option>
                      <option value="20 Sessions">20 Sessions (Maintenance)</option>
                      <option value="35 Sessions">35 Sessions (Intensive)</option>
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Facility</label>
                    <select
                      className="charm-cr-select"
                      value={filters.facility || "All"}
                      onChange={(e) => updateFilter("facility", e.target.value)}
                    >
                      {FACILITIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="charm-cr-inline-field">
                    <label>Provider</label>
                    <select
                      className="charm-cr-select"
                      value={filters.provider || "All"}
                      onChange={(e) => updateFilter("provider", e.target.value)}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <label className="charm-cr-checkbox-label" style={{ marginLeft: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!filters.dropoff_flag_only}
                      onChange={(e) => updateFilter("dropoff_flag_only", e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: "#B91C1C" }}>
                      Show Drop-off Flagged Only (&gt; 5 Days Absence)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div style={{ marginTop: 22 }}>
              <button
                type="button"
                className="charm-btn-primary-orange"
                style={{ padding: "8px 24px", fontSize: 13, fontWeight: 600 }}
                disabled={running}
                onClick={handleGenerate}
              >
                {running ? "Generating..." : currentReportMeta.buttonText || "Generate"}
              </button>
            </div>
          </div>
        </div>

        {/* Results Container */}
        {reportResult && (
          <div className="charm-custom-results-container">
            {/* Header bar */}
            <div className="charm-custom-results-header">
              <div className="charm-results-meta">
                <span className="charm-results-title">{reportResult.title}</span>
                <span className="charm-results-badge">
                  Total: {reportResult.total_count.toLocaleString()} records
                </span>
              </div>

              <div className="charm-results-actions">
                <div className="charm-search-input-wrap" style={{ width: 220 }}>
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    className="charm-search-input"
                    placeholder="Search in results..."
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="charm-btn-secondary"
                  onClick={handleExportCSV}
                  title="Export full details to CSV"
                >
                  <Download size={14} />
                  <span>Export as CSV</span>
                </button>

                <button
                  type="button"
                  className="charm-btn-secondary"
                  onClick={handlePrint}
                  title="Print report with clinic letterhead"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="charm-drilldown-table-wrap">
              <table className="charm-data-table">
                <thead>
                  <tr>
                    {reportResult.columns.map((col) => {
                      const isSorted = sortCol === col;
                      return (
                        <th
                          key={col}
                          onClick={() => {
                            if (isSorted) {
                              setSortAsc(!sortAsc);
                            } else {
                              setSortCol(col);
                              setSortAsc(true);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span>{col}</span>
                            {isSorted && (
                              <span style={{ fontSize: 10 }}>{sortAsc ? "▲" : "▼"}</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={reportResult.columns.length}
                        style={{ textAlign: "center", padding: 32, color: "#94A3B8" }}
                      >
                        No matching records found for these filter settings.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <tr key={idx}>
                        {reportResult.columns.map((col) => {
                          const val = row[col] ?? "";
                          const isPatientName = col === "Patient Name";
                          const recordId = row["Record ID"] || row["Record Id"];

                          if (isPatientName) {
                            return (
                              <td key={col}>
                                <a
                                  href={`/patients/${recordId || idx}`}
                                  className="charm-patient-link"
                                >
                                  {val}
                                </a>
                              </td>
                            );
                          }

                          if (col === "Attendance Status" || col === "Conversion Status") {
                            const isFlagged = String(val).includes("Flagged") || String(val).includes("Not Started");
                            return (
                              <td key={col}>
                                <span
                                  className={`charm-status-pill ${isFlagged ? "flagged" : "good"}`}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          }

                          return <td key={col}>{val}</td>;
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="charm-drilldown-pagination">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="charm-page-btn"
              >
                Previous
              </button>
              <span className="charm-page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="charm-page-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
