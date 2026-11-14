import React, { useState, useEffect } from "react";
import { Button, Loading, Empty, ErrorBox } from "../ui";
import { api } from "../api";
import {
  FileText,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Calendar,
} from "lucide-react";

export function ReportsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"reports" | "history">("reports");
  const [selectedReport, setSelectedReport] = useState("received-list");

  // Date range
  const todayStr = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const defaultFromStr = threeMonthsAgo.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(defaultFromStr);
  const [toDate, setToDate] = useState(todayStr);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const reportTypes = [
    {
      id: "received-list",
      label: "Received List Report",
      desc: "This report shows the list of inventory added in any selected time period.",
    },
    {
      id: "stock-flow",
      label: "Stock Flow Report",
      desc: "This report shows received list and dispensed list of the products in any selected time period.",
    },
    {
      id: "by-product",
      label: "Inventory Report (by Product)",
      desc: "This report shows the current available quantity in each product.",
    },
    {
      id: "by-batch",
      label: "Inventory Report",
      desc: "This report shows the current available quantity in each batch number.",
    },
    {
      id: "reorder-level",
      label: "Reorder Level Report",
      desc: "This report provides the list of items which is nearing its reorder levels. Fresh orders can be placed to stock-up the inventory.",
    },
    {
      id: "reorder-by-supplier",
      label: "Reorder Level Report By Supplier",
      desc: "This report provides the list of items which is nearing its reorder levels. Fresh orders can be placed to stock-up the inventory.",
    },
    {
      id: "expiry",
      label: "Inventory Expiry Report",
      desc: "This report provides the list of batches nearing expiry or expired.",
    },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setExportMessage(null);
    try {
      const data = await api<any>(`/inventory/reports/${selectedReport}?from_date=${fromDate}&to_date=${toDate}`);
      setReportData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api<any[]>("/inventory/reports/export-history");
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load export history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "reports") {
      fetchReport();
    } else {
      fetchHistory();
    }
  }, [selectedReport, activeSubTab]);

  // Compute month difference
  const isOverThreeMonths = () => {
    if (!fromDate || !toDate) return false;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return diffMonths > 3;
  };

  const downloadCSV = (rows: any[], filename: string) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const val = row[h] === null || row[h] === undefined ? "" : String(row[h]);
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(",")
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    const isOverLimit = isOverThreeMonths();
    const rows = reportData?.rows || [];
    const repObj = reportTypes.find((r) => r.id === selectedReport);
    const repName = repObj?.label || selectedReport;

    if (isOverLimit) {
      // Schedule export
      try {
        await api("/inventory/reports/export-history", "POST", {
          report_name: repName,
          date_range: `${fromDate} to ${toDate}`,
          status: "Ready",
          record_count: rows.length,
        });
        setExportMessage(
          `Date range exceeds 3 months. Your export "${repName}" has been queued and is available in "Report Export History".`
        );
      } catch (err) {
        setError(err);
      }
    } else {
      // Direct Download
      downloadCSV(rows, `${selectedReport}-${fromDate}-to-${toDate}`);
      // Record export in history for audit
      try {
        await api("/inventory/reports/export-history", "POST", {
          report_name: repName,
          date_range: `${fromDate} to ${toDate}`,
          status: "Downloaded",
          record_count: rows.length,
        });
      } catch (e) {
        // non-blocking
      }
    }
  };

  return (
    <div>
      {/* Sub-tab navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setActiveSubTab("reports")}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: activeSubTab === "reports" ? "#0d9488" : "#cbd5e1",
            background: activeSubTab === "reports" ? "#f0fdfa" : "#ffffff",
            color: activeSubTab === "reports" ? "#0f766e" : "#475569",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid",
            borderColor: activeSubTab === "history" ? "#0d9488" : "#cbd5e1",
            background: activeSubTab === "history" ? "#f0fdfa" : "#ffffff",
            color: activeSubTab === "history" ? "#0f766e" : "#475569",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Reports Export History
        </button>
      </div>

      {/* Information Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 6,
          padding: "10px 14px",
          color: "#0369a1",
          fontSize: 13,
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0, color: "#0284c7" }} />
        <span>
          Reports with a period of three months can be exported directly. For reports with period exceeding three months, the export will be scheduled and the report can be exported from &apos;Report Export History&apos; section.
        </span>
      </div>

      {activeSubTab === "reports" ? (
        <div>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
              background: "#ffffff",
              padding: 14,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>
                  Select Report
                </label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                >
                  {reportTypes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>

              <div style={{ alignSelf: "flex-end" }}>
                <Button variant="secondary" onClick={fetchReport}>
                  Apply Filter
                </Button>
              </div>
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <Button variant="primary" onClick={handleExport} disabled={loading || !reportData?.rows?.length}>
                <Download size={15} style={{ marginRight: 6 }} />
                {isOverThreeMonths() ? "Schedule Export (> 3 mo)" : "Download CSV"}
              </Button>
            </div>
          </div>

          {/* Active Report Description Sub-header */}
          <div style={{ marginBottom: 14, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
            <strong>{reportTypes.find((r) => r.id === selectedReport)?.label}:</strong>{" "}
            <em>{reportTypes.find((r) => r.id === selectedReport)?.desc}</em>
          </div>

          <ErrorBox error={error} />

          {exportMessage && (
            <div
              style={{
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: 8,
                padding: "12px 16px",
                color: "#0f766e",
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} />
              {exportMessage}
            </div>
          )}

          {/* Report Data Preview Table */}
          {loading ? (
            <Loading />
          ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
            <Empty
              title="No records found for this report and period"
              body="Check your date range filter or select another report type."
            />
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  {reportTypes.find((r) => r.id === selectedReport)?.label}
                </span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Total Records: <strong>{reportData.count}</strong>
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    {Object.keys(reportData.rows[0])
                      .filter((k) => k !== "id")
                      .map((k) => (
                        <th key={k} style={{ padding: "10px 12px", textTransform: "capitalize" }}>
                          {k.replace(/_/g, " ")}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {Object.keys(row)
                        .filter((k) => k !== "id")
                        .map((k) => (
                          <td key={k} style={{ padding: "10px 12px", color: "#334155" }}>
                            {row[k] === null || row[k] === undefined ? "—" : String(row[k])}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* History Sub-tab */
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              background: "#ffffff",
              padding: 14,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 16, color: "#0f172a" }}>Report Export History</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Audit log and scheduled downloads for inventory reports.
              </p>
            </div>
            <Button variant="secondary" onClick={fetchHistory}>
              Refresh History
            </Button>
          </div>

          {historyLoading ? (
            <Loading />
          ) : history.length === 0 ? (
            <Empty
              title="No exports requested yet"
              body="When you export or schedule reports, your download requests will be archived here."
            />
          ) : (
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "12px 14px" }}>Report Name</th>
                    <th style={{ padding: "12px 14px" }}>Requested By</th>
                    <th style={{ padding: "12px 14px" }}>Date Range</th>
                    <th style={{ padding: "12px 14px" }}>Record Count</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0f172a" }}>
                        {h.report_name}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        {h.requested_by_name || "Staff"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#64748b" }}>
                        {h.date_range || "—"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#334155" }}>
                        {h.record_count}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontWeight: 600,
                            background: "#ccfbf1",
                            color: "#0f766e",
                          }}
                        >
                          {h.status || "Ready"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#64748b" }}>
                        {h.created_at ? new Date(h.created_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

