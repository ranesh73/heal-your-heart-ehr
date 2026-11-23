import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Upload,
  Check,
  MoreHorizontal,
  X,
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  FlaskConical,
  Paperclip,
  Download,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";

// Known standard laboratory reference ranges dictionary for auto-population (matching CharmHealth compendium)
const KNOWN_LAB_RANGES: Record<string, { min?: number; max?: number; text?: string; unit?: string }> = {
  // Electrolytes & Minerals
  "calcium": { min: 8.6, max: 10.2, unit: "mg/dL" },
  "magnesium": { min: 1.6, max: 2.6, unit: "mg/dL" },
  "phosphorous": { min: 2.5, max: 4.5, unit: "mg/dL" },
  "sodium": { min: 135.0, max: 145.0, unit: "mEq/L" },
  "potassium": { min: 3.5, max: 5.0, unit: "mEq/L" },
  "pottasium": { min: 3.5, max: 5.0, unit: "mEq/L" },
  "chloride": { min: 96.0, max: 106.0, unit: "mEq/L" },
  "bicarbonate": { min: 22.0, max: 29.0, unit: "mEq/L" },

  // Iron Profile (matching Frame 14)
  "serum iron": { min: 65.0, max: 174.0, text: "Male: 65-174", unit: "ug/dL" },
  "serum ferritin": { min: 24.0, max: 336.0, text: "Male: 24-336", unit: "ng/ml" },
  "total iron binding capacity": { min: 225.0, max: 535.0, text: "Male: 225-535", unit: "ug/dL" },
  "transferrin saturation": { min: 20.0, max: 50.0, unit: "%" },

  // Renal Function (matching Frame 24)
  "blood urea nitrogen": { min: 7.0, max: 20.0, unit: "mg/dL" },
  "bun-blood urea nitrogen": { min: 7.0, max: 20.0, unit: "mg/dL" },
  "creatinine": { min: 0.7, max: 1.3, unit: "mg/dL" },
  "creatinine serum": { min: 0.7, max: 1.3, unit: "mg/dL" },
  "urea serum": { min: 13.0, max: 43.0, unit: "mg/dL" },
  "urea": { min: 13.0, max: 43.0, unit: "mg/dL" },
  "bun/sr.creatinine ratio": { min: 9.1, max: 23.1, unit: "Ratio" },
  "bun / sr. creatinine ratio": { min: 9.1, max: 23.1, unit: "Ratio" },
  "bun creatinine ratio": { min: 9.1, max: 23.1, unit: "Ratio" },
  "uric acid": { min: 4.2, max: 7.3, unit: "mg/dL" },
  "egfr": { min: 60.0, text: "less than 60 is abnormal", unit: "ml/min/1.73m2" },
  "cystain c": { min: 0.5, max: 1.0, unit: "mg/dl" },
  "cystatin c": { min: 0.5, max: 1.0, unit: "mg/dl" },
  "urine microalbumin": { text: "< 30 mg/L", unit: "mg/L" },
  "urine creatinine": { min: 22.0, max: 328.0, text: "22-328 mg/dL", unit: "mg/dL" },
  "micro albumin creatinine ratio": { text: "< 30 mg/g", unit: "mg/g" },

  // Lipid Profile (matching Frame 20)
  "total cholesterol": { min: 130.0, max: 200.0, unit: "mg/dL" },
  "hdl cholesterol": { min: 40.0, max: 60.0, unit: "mg/dL" },
  "ldl cholesterol": { min: 0.0, max: 100.0, unit: "mg/dL" },
  "vldl cholesterol": { min: 2.0, max: 30.0, unit: "mg/dL" },
  "triglyceride": { min: 50.0, max: 150.0, unit: "mg/dL" },
  "triglycerides": { min: 50.0, max: 150.0, unit: "mg/dL" },
  "tc / hdl ratio": { min: 3.0, max: 5.0, unit: "Ratio" },
  "ldl / hdl ratio": { min: 1.5, max: 3.5, unit: "Ratio" },

  // Complete Hemogram / CBC
  "haemoglobin": { min: 13.0, max: 17.0, unit: "g/dL" },
  "haemoglobin-hb": { min: 13.0, max: 17.0, unit: "g/dL" },
  "hemoglobin": { min: 13.0, max: 17.0, unit: "g/dL" },
  "hematocrit(pcv)": { min: 30.0, max: 40.0, unit: "%" },
  "pcv": { min: 30.0, max: 40.0, unit: "%" },
  "total wbc count": { min: 4000.0, max: 10000.0, unit: "cells/cumm" },
  "neutrophils": { min: 40.0, max: 80.0, unit: "%" },
  "lymphocytes": { min: 20.0, max: 40.0, unit: "%" },
  "eosinophils": { min: 1.0, max: 6.0, unit: "%" },
  "monocytes": { min: 2.0, max: 10.0, unit: "%" },
  "basophils": { text: "<2", unit: "%" },
  "platelet count": { min: 150000, max: 450000, unit: "cells/cumm" },
  "red cell distribution width sd": { min: 39.0, max: 46.0, unit: "fL" },
  "red cell distribution width cv": { min: 11.5, max: 14.5, unit: "%" },

  // Cardiac Biomarkers & Risk Markers
  "cardiac troponin i": { min: 0.0, max: 0.04, text: "< 0.04 ng/mL", unit: "ng/mL" },
  "nt-probnp": { min: 0.0, max: 125.0, text: "< 125 pg/mL", unit: "pg/mL" },
  "hs c-reactive protein": { text: "<1.0 mg/L (Low Risk)", unit: "mg/L" },
  "hs c-reactive protein (hscrp)": { text: "<1.0 mg/L (Low Risk)", unit: "mg/L" },
  "hs-crp": { text: "<1.0 mg/L (Low Risk)", unit: "mg/L" },
  "apolipoprotein-a1": { min: 111.0, max: 184.0, unit: "mg/dL" },
  "apolipoprotein-b": { min: 81.0, max: 156.0, unit: "mg/dL" },
  "apo b/apo a1 ratio": { min: 0.35, max: 1.0, unit: "Ratio" },
  "apob/apo a1 ratio": { min: 0.35, max: 1.0, unit: "Ratio" },
  "lipoprotein": { text: "<30 mg/dL", unit: "mg/dL" },
  "lipoprotein-a": { text: "<30 mg/dL", unit: "mg/dL" },
  "homocysteine": { min: 5.0, max: 15.0, unit: "umol/L" },

  // Diabetes & Metabolic
  "fasting blood sugar": { min: 70.0, max: 100.0, unit: "mg/dL" },
  "postprandial blood sugar": { min: 70.0, max: 140.0, unit: "mg/dL" },
  "postprandial sugar": { min: 70.0, max: 140.0, unit: "mg/dL" },
  "hba1c": { min: 4.0, max: 5.6, unit: "%" },
  "average blood glucose": { min: 70.0, max: 126.0, unit: "mg/dL" },

  // Thyroid Function Profile
  "tsh": { min: 0.4, max: 4.2, unit: "uIU/mL" },
  "free t3": { min: 2.3, max: 4.2, unit: "pg/mL" },
  "free t4": { min: 0.8, max: 1.8, unit: "ng/dL" },

  // Liver Function Profile (LFT)
  "total bilirubin": { min: 0.2, max: 1.2, unit: "mg/dL" },
  "direct bilirubin": { min: 0.0, max: 0.3, unit: "mg/dL" },
  "sgot / ast": { min: 10.0, max: 40.0, unit: "U/L" },
  "sgpt / alt": { min: 7.0, max: 56.0, unit: "U/L" },
  "alkaline phosphatase": { min: 44.0, max: 147.0, unit: "U/L" },
  "total protein": { min: 6.0, max: 8.3, unit: "g/dL" },
  "albumin serum": { min: 3.5, max: 5.5, unit: "g/dL" },
};

// Default panel analytes mapping for comprehensive compendium fallback
const DEFAULT_PANEL_PARAMETERS: Record<string, { name: string; unit: string; minRef?: number; maxRef?: number; textRef?: string }[]> = {
  "iron profile": [
    { name: "Serum Iron", unit: "ug/dL", minRef: 65, maxRef: 174, textRef: "Male: 65-174" },
    { name: "Serum Ferritin", unit: "ng/ml", minRef: 24, maxRef: 336, textRef: "Male: 24-336" },
    { name: "Total Iron Binding Capacity", unit: "ug/dL", minRef: 225, maxRef: 535, textRef: "Male: 225-535" },
    { name: "Transferrin Saturation", unit: "%", minRef: 20, maxRef: 50 },
  ],
  "renal function": [
    { name: "Blood Urea Nitrogen", unit: "mg/dL", minRef: 7, maxRef: 20 },
    { name: "Creatinine Serum", unit: "mg/dL", minRef: 0.7, maxRef: 1.3 },
    { name: "Urea Serum", unit: "mg/dL", minRef: 13, maxRef: 43 },
    { name: "BUN/Sr.Creatinine Ratio", unit: "Ratio", minRef: 9.1, maxRef: 23.1 },
    { name: "Uric Acid", unit: "mg/dL", minRef: 4.2, maxRef: 7.3 },
    { name: "eGFR", unit: "ml/min/1.73m2", minRef: 60, textRef: "less than 60 is abnormal" },
    { name: "Cystain C", unit: "mg/dl", minRef: 0.5, maxRef: 1.0 },
  ],
  "lipid profile": [
    { name: "Total Cholesterol", unit: "mg/dL", minRef: 130, maxRef: 200 },
    { name: "HDL Cholesterol", unit: "mg/dL", minRef: 40, maxRef: 60 },
    { name: "LDL Cholesterol", unit: "mg/dL", maxRef: 100 },
    { name: "VLDL Cholesterol", unit: "mg/dL", minRef: 2, maxRef: 30 },
    { name: "Triglycerides", unit: "mg/dL", minRef: 50, maxRef: 150 },
  ],
  "complete hemogram": [
    { name: "Haemoglobin", unit: "g/dL", minRef: 13.0, maxRef: 17.0 },
    { name: "Hematocrit(PCV)", unit: "%", minRef: 30.0, maxRef: 40.0 },
    { name: "Total WBC Count", unit: "cells/cumm", minRef: 4000, maxRef: 10000 },
    { name: "Neutrophils", unit: "%", minRef: 40, maxRef: 80 },
    { name: "Lymphocytes", unit: "%", minRef: 20, maxRef: 40 },
    { name: "Eosinophils", unit: "%", minRef: 1, maxRef: 6 },
    { name: "Monocytes", unit: "%", minRef: 2, maxRef: 10 },
    { name: "Basophils", unit: "%", textRef: "<2" },
    { name: "Platelet Count", unit: "cells/cumm", minRef: 150000, maxRef: 450000 },
    { name: "Red Cell Distribution Width SD", unit: "fL", minRef: 39, maxRef: 46 },
    { name: "Red Cell Distribution Width CV", unit: "%", minRef: 11.5, maxRef: 14.5 },
  ],
  "electrolytes": [
    { name: "Sodium", unit: "mEq/L", minRef: 135, maxRef: 145 },
    { name: "Potassium", unit: "mEq/L", minRef: 3.5, maxRef: 5.0 },
    { name: "Chloride", unit: "mEq/L", minRef: 96, maxRef: 106 },
    { name: "Bicarbonate", unit: "mEq/L", minRef: 22, maxRef: 29 },
  ],
  "bone marker": [
    { name: "Calcium", unit: "mg/dL", minRef: 8.6, maxRef: 10.2 },
    { name: "Magnesium", unit: "mg/dL", minRef: 1.6, maxRef: 2.6 },
    { name: "Phosphorous", unit: "mg/dL", minRef: 2.5, maxRef: 4.5 },
  ],
  "cardiac risk marker": [
    { name: "Cardiac Troponin I", unit: "ng/mL", maxRef: 0.04, textRef: "< 0.04 ng/mL" },
    { name: "NT-proBNP", unit: "pg/mL", maxRef: 125, textRef: "< 125 pg/mL" },
    { name: "hs-CRP", unit: "mg/L", maxRef: 1.0, textRef: "< 1.0 mg/L (Low Risk)" },
    { name: "Apolipoprotein-A1", unit: "mg/dL", minRef: 111, maxRef: 184 },
    { name: "Apolipoprotein-B", unit: "mg/dL", minRef: 81, maxRef: 156 },
    { name: "Apo B/Apo A1 Ratio", unit: "Ratio", minRef: 0.35, maxRef: 1.0 },
    { name: "Lipoprotein-A", unit: "mg/dL", textRef: "<30 mg/dL" },
    { name: "Homocysteine", unit: "umol/L", minRef: 5, maxRef: 15 },
  ],
  "diabetic": [
    { name: "Fasting Blood Sugar", unit: "mg/dL", minRef: 70, maxRef: 100 },
    { name: "Postprandial Blood Sugar", unit: "mg/dL", minRef: 70, maxRef: 140 },
    { name: "HbA1c", unit: "%", minRef: 4.0, maxRef: 5.6 },
  ],
  "thyroid": [
    { name: "TSH", unit: "uIU/mL", minRef: 0.4, maxRef: 4.2 },
    { name: "Free T3", unit: "pg/mL", minRef: 2.3, maxRef: 4.2 },
    { name: "Free T4", unit: "ng/dL", minRef: 0.8, maxRef: 1.8 },
  ],
  "liver function": [
    { name: "Total Bilirubin", unit: "mg/dL", minRef: 0.2, maxRef: 1.2 },
    { name: "Direct Bilirubin", unit: "mg/dL", minRef: 0.0, maxRef: 0.3 },
    { name: "SGOT / AST", unit: "U/L", minRef: 10, maxRef: 40 },
    { name: "SGPT / ALT", unit: "U/L", minRef: 7, maxRef: 56 },
    { name: "Alkaline Phosphatase", unit: "U/L", minRef: 44, maxRef: 147 },
    { name: "Total Protein", unit: "g/dL", minRef: 6.0, maxRef: 8.3 },
    { name: "Albumin Serum", unit: "g/dL", minRef: 3.5, maxRef: 5.5 },
  ],
};

export interface AnalyteItem {
  name: string;
  result: string;
  unit: string;
  minRef?: number;
  maxRef?: number;
  textRef?: string;
  interpretation: string; // '-', 'Normal', 'Low', 'High', 'Abnormal'
  comments: string;
}

// Helper to resolve primary lab name from order
export function getOrderLabName(order: Row): string {
  if (order.order_metadata) {
    try {
      const meta = JSON.parse(order.order_metadata);
      if (meta.template_name) return meta.template_name;
      if (meta.primary_lab) return meta.primary_lab;
    } catch { }
  }
  if (order.name && order.name.includes(" · ")) {
    return order.name.split(" · ")[0].trim();
  }
  return "HUH-Cardio Diabetic";
}

// Helper to parse tests array from order
export function getOrderTests(order: Row): string[] {
  if (order.order_metadata) {
    try {
      const meta = JSON.parse(order.order_metadata);
      if (Array.isArray(meta.tests) && meta.tests.length > 0) {
        return meta.tests;
      }
      if (meta.template_name) {
        if (meta.template_name.includes(" & ")) return meta.template_name.split(" & ").map((s: string) => s.trim());
        if (meta.template_name.includes(" · ")) return [meta.template_name.split(" · ")[1].trim()];
        return [meta.template_name];
      }
    } catch { }
  }
  if (order.name) {
    if (order.name.includes(" · ")) {
      const afterDot = order.name.split(" · ")[1].trim().replace(/\s*\(\+\d+\s*tests?\)/i, "");
      return [afterDot];
    }
    if (order.name.includes(" & ")) {
      return order.name.split(" & ").map((s: string) => s.trim());
    }
    return [order.name];
  }
  return ["Routine Diagnostic Evaluation"];
}

// Helper to resolve parameter definitions for any test with multi-level fallback
export function getTestAnalytes(tName: string, labCatalogs: Row[] = []): AnalyteItem[] {
  const normTarget = tName.toLowerCase().replace(/^(huh\s*[-–—]?\s*|huh-cd-)/i, "").trim();

  // 1. Check catalogs
  const matchedCatalog = labCatalogs.find((c) => {
    const cName = c.name.toLowerCase().replace(/^(huh\s*[-–—]?\s*|huh-cd-)/i, "").trim();
    return cName.includes(normTarget) || normTarget.includes(cName);
  });

  let rawParams: any[] = [];
  if (matchedCatalog?.content) {
    try {
      const parsed = JSON.parse(matchedCatalog.content);
      if (Array.isArray(parsed.parameters) && parsed.parameters.length > 0) {
        rawParams = parsed.parameters.map((p: any) =>
          typeof p === "string" ? { name: p, unit: "" } : p
        );
      }
    } catch { }
  }

  // 2. Check DEFAULT_PANEL_PARAMETERS fallback
  if (rawParams.length === 0) {
    for (const [panelKey, defs] of Object.entries(DEFAULT_PANEL_PARAMETERS)) {
      if (normTarget.includes(panelKey) || panelKey.includes(normTarget)) {
        rawParams = defs;
        break;
      }
    }
  }

  // 3. Fallback to generic analyte if completely unknown
  if (rawParams.length === 0) {
    rawParams = [{ name: tName, unit: "" }];
  }

  return rawParams.map((p) => {
    const pKey = p.name.toLowerCase().trim();
    const refDict = KNOWN_LAB_RANGES[pKey] || {};
    return {
      name: p.name,
      result: "",
      unit: p.unit || refDict.unit || "",
      minRef: refDict.min ?? p.minRef,
      maxRef: refDict.max ?? p.maxRef,
      textRef: refDict.text || p.reference_range || p.textRef || "",
      interpretation: "-",
      comments: "",
    };
  });
}

// Helper to generate & download official Lab Report PDF (matching CharmHealth Frame 32)
export function exportOrderAsPdf(order: Row, patient?: Row, staffList: Row[] = []) {
  const pName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : (order.patient_name || "Patient");
  const pMrn = patient?.mrn || order.patient_mrn || `HYN-MR-${order.patient_id?.slice(0, 6) || "000000"}`;
  const pDob = patient?.dob || order.patient_dob || "1968-01-12";
  const pSex = patient?.sex || order.patient_sex || "Male";
  const doctor = staffList.find((s) => s.id === order.author_id || s.id === order.reviewed_by)?.name || order.ordered_by || "Dr. Ramasamy S";
  const labRef = order.lab_ref || `00020${order.id?.slice(0, 3) || "733"}`;
  const values: any[] = order.values || [];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${pName}_TestDetails</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { color: #0f766e; font-size: 20px; font-weight: bold; margin: 0; }
    .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 13px; margin-bottom: 20px; }
    .meta-label { color: #64748b; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
    .meta-val { font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    th { background: #f1f5f9; color: #334155; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
    .flag-high, .flag-low { color: #dc2626; font-weight: bold; }
    .flag-normal { color: #16a34a; font-weight: 600; }
    .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">HEAL YOUR HEART CLINIC</div>
      <div class="subtitle">Cardiovascular Care & Diagnostics · Neelankarai, Chennai</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 700; color: #0f172a;">LABORATORY TEST REPORT</div>
      <div style="font-size: 12px; color: #64748b;">Ref: ${labRef} · ${order.ordered_date || "Today"}</div>
    </div>
  </div>

  <div class="meta-box">
    <div><div class="meta-label">Patient</div><div class="meta-val">${pName}</div></div>
    <div><div class="meta-label">MRN</div><div class="meta-val">${pMrn}</div></div>
    <div><div class="meta-label">DOB / Sex</div><div class="meta-val">${pDob} (${pSex})</div></div>
    <div><div class="meta-label">Clinician</div><div class="meta-val">${doctor}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Test / Parameter</th>
        <th style="width: 16%;">Result</th>
        <th style="width: 14%;">Unit</th>
        <th style="width: 24%;">Reference Range</th>
        <th style="width: 18%;">Interpretation</th>
      </tr>
    </thead>
    <tbody>
      ${values.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#94a3b8;">No test values recorded.</td></tr>` :
      values.map((v) => {
        const interp = v.interpretation || "-";
        const isAbn = ["low", "high", "abnormal"].includes(interp.toLowerCase());
        return `<tr>
            <td style="font-weight: 600;">${v.parameter || v.test_name}</td>
            <td class="${isAbn ? 'flag-high' : ''}">${v.value}</td>
            <td style="color:#64748b;">${v.unit || "-"}</td>
            <td style="color:#64748b;">${v.reference_range || "-"}</td>
            <td class="${isAbn ? 'flag-high' : 'flag-normal'}">${interp}</td>
          </tr>`;
      }).join("")
    }
    </tbody>
  </table>

  <div class="footer">
    <div>Report Electronically Generated · Confidential Medical Record</div>
    <div>Approved By: ${doctor}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const filename = `${pName.replace(/\s+/g, "_")}_TestDetails.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface CharmLabOrdersProps {
  patientId?: string;
  encounterId?: string;
  isGlobal?: boolean;
}

export function CharmLabOrders({ patientId, encounterId, isGlobal }: CharmLabOrdersProps) {
  const { user, staff, patients, notify } = useApp();
  const queryClient = useQueryClient();

  const isGlobalMode = !patientId || !!isGlobal;

  // Navigation & View Modes: in global mode, default to results (matching CharmHealth Frame 5)
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "results">(isGlobalMode ? "results" : "orders");
  const [viewMode, setViewMode] = useState<
    "list" | "add_order" | "edit_order" | "add_lab_result" | "edit_lab_result" | "import_result" | "print_view"
  >("list");
  const [selectedOrder, setSelectedOrder] = useState<Row | null>(null);
  const [plotOrder, setPlotOrder] = useState<Row | null>(null);

  // Filters & Search for Orders
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending_partial");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filters & Search for Results
  const [filterReviewer, setFilterReviewer] = useState<string>("all");
  const [filterResultStatus, setFilterResultStatus] = useState<string>("unsigned");
  const [resultSearchQuery, setResultSearchQuery] = useState<string>("");

  // Table State
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openResultMenuId, setOpenResultMenuId] = useState<string | null>(null);

  // Secondary Modals
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);
  const [specimenOrder, setSpecimenOrder] = useState<Row | null>(null);
  const [specimenData, setSpecimenData] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: "08:30",
    type: "Blood (Serum)",
    site: "Left antecubital fossa",
    volume: "5 mL",
    container: "Gold top (SST gel separator)",
    fasting: true,
  });
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeOrder, setBarcodeOrder] = useState<Row | null>(null);
  const [viewReportModalOrder, setViewReportModalOrder] = useState<Row | null>(null);
  const [selectOrderForResultsModal, setSelectOrderForResultsModal] = useState<boolean>(false);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["orders", branch],
    queryFn: () => api<Row[]>("/records/orders"),
  });

  const labCatalogsQuery = useQuery({
    queryKey: ["catalogs", "lab_test", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=lab_test"),
  });

  const labTemplatesQuery = useQuery({
    queryKey: ["catalogs", "lab_template", branch],
    queryFn: () => api<Row[]>("/catalogs?kind=lab_template"),
  });

  const orders = ordersQuery.data || [];
  const labCatalogs = labCatalogsQuery.data || [];
  const labTemplates = labTemplatesQuery.data || [];

  // Filter for Lab orders: clinic-wide if global, or patient-specific if patientId is provided
  const activeLabOrders = useMemo(() => {
    return orders.filter((o) => {
      const isLab = o.kind ? o.kind.toLowerCase() === "lab" : true;
      if (!isLab) return false;
      if (!isGlobalMode && patientId) {
        return o.patient_id === patientId;
      }
      return true;
    });
  }, [orders, patientId, isGlobalMode]);

  // Apply listing filters for Lab Orders tab
  const filteredOrders = useMemo(() => {
    return activeLabOrders.filter((o) => {
      // Provider filter
      if (filterProvider !== "all") {
        const authorMatch = o.author_id === filterProvider || o.reviewed_by === filterProvider;
        if (!authorMatch) return false;
      }
      // Status filter
      const st = (o.status || "Pending").toLowerCase();
      if (filterStatus === "pending_partial") {
        if (!["pending", "partial", "ordered"].includes(st)) return false;
      } else if (filterStatus === "pending") {
        if (!["pending", "ordered"].includes(st)) return false;
      } else if (filterStatus === "partial") {
        if (st !== "partial") return false;
      } else if (filterStatus === "completed") {
        if (!["completed", "resulted", "reviewed"].includes(st)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const p = patients.find((x) => x.id === o.patient_id);
        const pName = (p ? `${p.first_name || ""} ${p.last_name || ""} ${p.mrn || ""}` : (o.patient_name || "") + " " + (o.patient_mrn || "")).toLowerCase();
        const refMatch = (o.lab_ref || "").toLowerCase().includes(q);
        const nameMatch = (o.name || "").toLowerCase().includes(q);
        const metaMatch = (o.order_metadata || "").toLowerCase().includes(q);
        const notesMatch = (o.instructions || "").toLowerCase().includes(q);
        const patMatch = pName.includes(q);
        if (!refMatch && !nameMatch && !metaMatch && !notesMatch && !patMatch) return false;
      }
      return true;
    });
  }, [activeLabOrders, filterProvider, filterStatus, searchQuery, patients]);

  // Apply listing filters for Lab Results tab (matching CharmHealth Frame 5)
  const filteredResultOrders = useMemo(() => {
    return activeLabOrders.filter((o) => {
      // Must have results/values or resulted/partial/completed/reviewed status
      const hasValues = (o.values && o.values.length > 0) || ["partial", "completed", "resulted", "reviewed"].includes((o.status || "").toLowerCase());
      if (!hasValues) return false;

      // Reviewer filter
      if (filterReviewer !== "all") {
        const reviewerMatch = o.reviewed_by === filterReviewer || o.author_id === filterReviewer;
        if (!reviewerMatch) return false;
      }

      // Result Status filter: "unsigned" vs "signed" vs "all"
      const st = (o.status || "").toLowerCase();
      const isSigned = st === "reviewed" || st === "signed";
      if (filterResultStatus === "unsigned" && isSigned) return false;
      if (filterResultStatus === "signed" && !isSigned) return false;

      // Search query
      if (resultSearchQuery.trim()) {
        const q = resultSearchQuery.toLowerCase();
        const p = patients.find((x) => x.id === o.patient_id);
        const pName = (p ? `${p.first_name || ""} ${p.last_name || ""} ${p.mrn || ""}` : (o.patient_name || "") + " " + (o.patient_mrn || "")).toLowerCase();
        const refMatch = (o.lab_ref || "").toLowerCase().includes(q);
        const nameMatch = (o.name || "").toLowerCase().includes(q);
        const metaMatch = (o.order_metadata || "").toLowerCase().includes(q);
        const valuesMatch = (o.values || []).some((v: any) =>
          (v.parameter || "").toLowerCase().includes(q) || (v.test_name || "").toLowerCase().includes(q)
        );
        const patMatch = pName.includes(q);
        if (!refMatch && !nameMatch && !metaMatch && !valuesMatch && !patMatch) return false;
      }
      return true;
    });
  }, [activeLabOrders, filterReviewer, filterResultStatus, resultSearchQuery, patients]);

  // Helpers
  const getPatientData = (patientIdOrOrder: string | Row) => {
    const pid = typeof patientIdOrOrder === "string" ? patientIdOrOrder : patientIdOrOrder.patient_id;
    const p = patients.find((x) => x.id === pid);
    const pName = p ? `${p.first_name} ${p.last_name}` : (typeof patientIdOrOrder === "object" ? patientIdOrOrder.patient_name || "Patient" : "Patient");
    const pMrn = p?.mrn || (typeof patientIdOrOrder === "object" ? patientIdOrOrder.patient_mrn : "") || "4R 0017";
    const initial = p ? `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}` : "PT";
    return { id: pid, name: pName, mrn: pMrn, initial };
  };

  const isOrderAbnormal = (order: Row): boolean => {
    const vals: any[] = order.values || [];
    return vals.some((v) => ["low", "high", "abnormal"].includes((v.interpretation || "").toLowerCase()));
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".charm-menu-container")) {
        setOpenMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Helper to check if a specific test within an order has resulted values
  const isTestResulted = (order: Row, testName: string): boolean => {
    const values: any[] = order.values || [];
    if (values.length === 0) return false;
    return values.some(
      (v) => (v.test_name && v.test_name.toLowerCase() === testName.toLowerCase()) || values.length > 0
    );
  };

  // Status badge renderer matching CharmHealth
  const renderStatusBadge = (status: string) => {
    const s = (status || "Pending").toLowerCase();
    if (s === "pending" || s === "ordered") {
      return (
        <span style={{ color: "#ea580c", fontWeight: 600, fontSize: "0.85rem" }}>
          Pending
        </span>
      );
    }
    if (s === "partial") {
      return (
        <span style={{ color: "#0d9488", fontWeight: 600, fontSize: "0.85rem" }}>
          Partial
        </span>
      );
    }
    if (s === "completed" || s === "resulted") {
      return (
        <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.85rem" }}>
          Completed
        </span>
      );
    }
    if (s === "reviewed") {
      return (
        <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "0.85rem" }}>
          Reviewed
        </span>
      );
    }
    return <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{status}</span>;
  };

  // Formatter for clinician name
  const getProviderName = (userId?: string) => {
    if (!userId) return user.name;
    const s = staff.find((x) => x.id === userId);
    return s?.name || user.name;
  };

  return (
    <div className="charm-lab-module" style={{ background: "#ffffff", minHeight: "650px", padding: "16px 20px" }}>
      {/* 1. TOP SUBTABS & MAIN ACTIONS BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "28px" }}>
          <button
            type="button"
            className="charm-lab-subtab"
            style={{
              background: "none",
              border: "none",
              fontSize: "1rem",
              fontWeight: activeSubTab === "results" ? 700 : 500,
              color: activeSubTab === "results" ? "#0f172a" : "#64748b",
              borderBottom: activeSubTab === "results" ? "2.5px solid #0d9488" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => {
              setActiveSubTab("results");
              setViewMode("list");
            }}
          >
            Lab Results
          </button>
          <button
            type="button"
            className="charm-lab-subtab"
            style={{
              background: "none",
              border: "none",
              fontSize: "1rem",
              fontWeight: activeSubTab === "orders" ? 700 : 500,
              color: activeSubTab === "orders" ? "#0f172a" : "#64748b",
              borderBottom: activeSubTab === "orders" ? "2.5px solid #0d9488" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => {
              setActiveSubTab("orders");
              setViewMode("list");
            }}
          >
            Lab Orders
          </button>
        </div>

        {viewMode === "list" && activeSubTab === "orders" && (
          <button
            type="button"
            className="charm-btn-teal"
            style={{
              backgroundColor: "#00838f",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onClick={() => setViewMode("add_order")}
          >
            <Plus size={15} />
            Lab Order
          </button>
        )}

        {viewMode === "list" && activeSubTab === "results" && (
          <button
            type="button"
            className="charm-btn-orange bg-[#0B6E75] hover:bg-[#09595F] text-white"
            style={{
              backgroundColor: "#0B6E75",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onClick={() => setViewMode("add_lab_result")}
          >
            <Plus size={15} />
            Lab Result
          </button>
        )}
      </div>

      {/* 2. RENDER SUB-VIEWS */}
      {viewMode === "add_order" && (
        <AddLabOrderScreen
          patientId={patientId}
          encounterId={encounterId}
          labCatalogs={labCatalogs}
          labTemplates={labTemplates}
          allOrders={orders}
          initialOrder={null}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab order created successfully.");
          }}
        />
      )}

      {viewMode === "edit_order" && selectedOrder && (
        <AddLabOrderScreen
          patientId={patientId || selectedOrder.patient_id}
          encounterId={encounterId || selectedOrder.encounter_id}
          labCatalogs={labCatalogs}
          labTemplates={labTemplates}
          allOrders={orders}
          initialOrder={selectedOrder}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab order updated successfully.");
          }}
        />
      )}

      {viewMode === "add_lab_result" && (
        <AddLabResultScreen
          patientId={patientId}
          labCatalogs={labCatalogs}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab result created successfully.");
          }}
        />
      )}

      {viewMode === "edit_lab_result" && selectedOrder && (
        <EditLabResultScreen
          order={selectedOrder}
          labCatalogs={labCatalogs}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab result updated successfully.");
          }}
        />
      )}

      {viewMode === "import_result" && selectedOrder && (
        <ImportResultsScreen
          order={selectedOrder}
          labCatalogs={labCatalogs}
          onCancel={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            setViewMode("list");
            setSelectedOrder(null);
            notify("Lab results imported successfully.");
          }}
        />
      )}

      {viewMode === "print_view" && selectedOrder && (
        <PrintRequisitionView
          order={selectedOrder}
          patientId={patientId}
          onClose={() => {
            setViewMode("list");
            setSelectedOrder(null);
          }}
        />
      )}

      {/* 3. LISTING VIEW (LAB ORDERS TAB) */}
      {viewMode === "list" && activeSubTab === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Ordered By</div>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "140px",
                }}
              >
                <option value="all">All</option>
                {staff
                  .filter((s) => ["doctor", "assistant"].includes(s.role))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Order Status</div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "150px",
                }}
              >
                <option value="pending_partial">Pending / Partial</option>
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: "340px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Search</div>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "9px", top: "8px", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder={isGlobalMode ? "Search Patient by Name / ID" : "Search by Lab Name"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 10px 5px 28px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  {isGlobalMode && (
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: "22%" }}>
                      Patient <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                    </th>
                  )}
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: isGlobalMode ? "28%" : "35%" }}>Tests</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Lab Ref.# <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Ordered By</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Ordered On <span style={{ fontSize: "0.75rem", color: "#0d9488" }}>▾</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Result Interpretation</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={isGlobalMode ? 7 : 6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      No lab orders found. Click <strong>+ Lab Order</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const testList = getOrderTests(order);
                    const isExpanded = !!expandedRows[order.id];
                    const visibleTests = isExpanded ? testList : testList.slice(0, 2);
                    const remainingCount = testList.length - 2;

                    return (
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          verticalAlign: "top",
                        }}
                      >
                        {isGlobalMode && (
                          <td style={{ padding: "12px 14px" }}>
                            {(() => {
                              const pat = getPatientData(order);
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "50%",
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      color: "#0f766e",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {pat.initial}
                                  </div>
                                  <div>
                                    <a
                                      href={`#/patients/${pat.id}`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(`/patients/${pat.id}`);
                                      }}
                                      style={{
                                        color: "#0284c7",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                        fontSize: "0.85rem",
                                        display: "block",
                                      }}
                                    >
                                      {pat.name}
                                    </a>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                      [ {pat.mrn} ]
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {/* Tests with checkmarks and expansion */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {visibleTests.map((tName, idx) => {
                              const resulted = isTestResulted(order, tName);
                              return (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ color: "#1e293b" }}>{tName}</span>
                                  {resulted && (
                                    <Check size={14} style={{ color: "#16a34a", strokeWidth: 3 }} />
                                  )}
                                </div>
                              );
                            })}

                            {!isExpanded && remainingCount > 0 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "2px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: true }))}
                              >
                                {remainingCount} More..
                              </button>
                            )}

                            {isExpanded && testList.length > 2 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "4px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: false }))}
                              >
                                Less
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Lab Ref.# */}
                        <td style={{ padding: "12px 14px", color: "#334155", fontFamily: "monospace" }}>
                          {order.lab_ref || `00020${order.id.slice(0, 3)}`}
                        </td>

                        {/* Ordered By */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {getProviderName(order.author_id)}
                        </td>

                        {/* Ordered On */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {order.ordered_date ||
                            (order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "Today")}
                        </td>

                        {/* Result Interpretation */}
                        <td style={{ padding: "12px 14px" }}>
                          {renderStatusBadge(order.status)}
                        </td>

                        {/* 10-Item Action Menu */}
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          <div className="charm-menu-container" style={{ position: "relative", display: "inline-block" }}>
                            <button
                              type="button"
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "4px 7px",
                                cursor: "pointer",
                                color: "#475569",
                              }}
                              className="charm-order-actions-btn"
                              title="Order Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === order.id ? null : order.id);
                              }}
                            >
                              <MoreHorizontal size={15} />
                            </button>

                            {openMenuId === order.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "28px",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                                  width: "190px",
                                  zIndex: 100,
                                  textAlign: "left",
                                  padding: "4px 0",
                                }}
                              >
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 600,
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("import_result");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Import Results
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("edit_order");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Edit Lab Order
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("print_view");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Print Lab Order
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("print_view");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Export as PDF
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    notify(`Requisition notification SMS sent to registered mobile.`);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Share by SMS
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setSpecimenOrder(order);
                                    setSpecimenModalOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Specimen Details
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#334155",
                                  }}
                                  onClick={() => {
                                    setBarcodeOrder(order);
                                    setBarcodeModalOpen(true);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Print Test Specimen Label
                                </button>
                                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }} />
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#16a34a",
                                  }}
                                  onClick={async () => {
                                    await api(`/records/orders/${order.id}/status`, "POST", {
                                      status: "Completed",
                                      version: order.version,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                                    setOpenMenuId(null);
                                    notify("Order marked as Completed.");
                                  }}
                                >
                                  Mark as Completed
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "6px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#dc2626",
                                  }}
                                  onClick={async () => {
                                    await api(`/records/orders/${order.id}/status`, "POST", {
                                      status: "Expired",
                                      version: order.version,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                                    setOpenMenuId(null);
                                    notify("Order marked as Expired.");
                                  }}
                                >
                                  Mark as Expired
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. LAB RESULTS TAB */}
      {viewMode === "list" && activeSubTab === "results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Results Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Reviewer</div>
              <select
                value={filterReviewer}
                onChange={(e) => setFilterReviewer(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "140px",
                }}
              >
                <option value="all">All</option>
                {staff
                  .filter((s) => ["doctor", "assistant"].includes(s.role))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Status</div>
              <select
                value={filterResultStatus}
                onChange={(e) => setFilterResultStatus(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  minWidth: "150px",
                }}
              >
                <option value="unsigned">Unsigned</option>
                <option value="all">All</option>
                <option value="signed">Signed</option>
              </select>
            </div>

            <div style={{ flex: 1, maxWidth: "340px" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Search</div>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: "9px", top: "8px", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder={isGlobalMode ? "Search Patient by Name / ID" : "Search by Test / Lab Name"}
                  value={resultSearchQuery}
                  onChange={(e) => setResultSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 10px 5px 28px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Results Data Table */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  {isGlobalMode && (
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: "22%" }}>
                      Patient <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>⇅</span>
                    </th>
                  )}
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155", width: isGlobalMode ? "28%" : "35%" }}>Tests</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Lab</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>
                    Date <span style={{ fontSize: "0.75rem", color: "#0d9488" }}>▾</span>
                  </th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "#334155" }}>Param Interpretation</th>
                  <th style={{ padding: "10px 14px", width: "40px", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredResultOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isGlobalMode ? 6 : 5}
                      style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
                    >
                      No laboratory results available matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredResultOrders.map((order) => {
                    const testList = getOrderTests(order);
                    const isExpanded = !!expandedRows[order.id];
                    const visibleTests = isExpanded ? testList : testList.slice(0, 2);
                    const remainingCount = testList.length - 2;
                    const isMenuOpen = openMenuId === order.id;
                    const pat = getPatientData(order);
                    const isAbnormal = isOrderAbnormal(order);

                    return (
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        {/* Patient Column */}
                        {isGlobalMode && (
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  background: "#e0f2fe",
                                  color: "#0284c7",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {pat.initial}
                              </div>
                              <div>
                                <a
                                  href={`#/patients/${pat.id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(`/patients/${pat.id}`);
                                  }}
                                  style={{
                                    color: "#0284c7",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    fontSize: "0.85rem",
                                    display: "block",
                                  }}
                                >
                                  {pat.name}
                                </a>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                  [ {pat.mrn} ]
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Tests with checkmarks and expansion */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {visibleTests.map((tName, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ color: "#1e293b" }}>{tName}</span>
                                <Check size={14} style={{ color: "#16a34a", strokeWidth: 3 }} />
                              </div>
                            ))}

                            {!isExpanded && remainingCount > 0 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "2px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: true }))}
                              >
                                {remainingCount} More..
                              </button>
                            )}

                            {isExpanded && testList.length > 2 && (
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0284c7",
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  textAlign: "left",
                                  marginTop: "4px",
                                }}
                                onClick={() => setExpandedRows((prev) => ({ ...prev, [order.id]: false }))}
                              >
                                Less
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Lab name */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {getOrderLabName(order)}
                        </td>

                        {/* Date */}
                        <td style={{ padding: "12px 14px", color: "#334155" }}>
                          {order.ordered_date ||
                            (order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-") : "10-26-2026")}
                        </td>

                        {/* Param Interpretation */}
                        <td style={{ padding: "12px 14px" }}>
                          {isAbnormal ? (
                            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.85rem" }}>
                              Abnormal
                            </span>
                          ) : (
                            <span style={{ color: "#334155", fontWeight: 600, fontSize: "0.85rem" }}>
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Three-dot action menu */}
                        <td style={{ padding: "12px 10px", textAlign: "center", position: "relative" }}>
                          <div className="charm-menu-container" style={{ display: "inline-block" }}>
                            <button
                              type="button"
                              className="charm-action-btn"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#64748b",
                                borderRadius: "4px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(isMenuOpen ? null : order.id);
                              }}
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {isMenuOpen && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "28px",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "4px",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                                  width: "180px",
                                  zIndex: 100,
                                  textAlign: "left",
                                  padding: "4px 0",
                                }}
                              >
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 500,
                                  }}
                                  onClick={async () => {
                                    try {
                                      await api(`/orders/${order.id}/review`, "POST", { version: order.version });
                                      queryClient.invalidateQueries({ queryKey: ["orders"] });
                                      setOpenMenuId(null);
                                      notify("Lab result successfully reviewed and signed.");
                                    } catch (err: any) {
                                      alert(err.message || "Unable to sign lab result");
                                    }
                                  }}
                                >
                                  Review
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 500,
                                  }}
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setViewMode("edit_lab_result");
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Edit Lab Result
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 500,
                                  }}
                                  onClick={() => {
                                    const patientObj = patients.find((p) => p.id === order.patient_id);
                                    exportOrderAsPdf(order, patientObj, staff);
                                    setOpenMenuId(null);
                                    notify("Exporting lab result PDF report...");
                                  }}
                                >
                                  Export as PDF
                                </button>
                                <button
                                  type="button"
                                  className="charm-menu-item"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "7px 14px",
                                    background: "none",
                                    border: "none",
                                    textAlign: "left",
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                    color: "#0f172a",
                                    fontWeight: 500,
                                  }}
                                  onClick={() => {
                                    setPlotOrder(order);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  Plot
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SPECIMEN DETAILS MODAL */}
      {specimenModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "500px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Specimen Details</h3>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Collection Date</label>
                  <input
                    type="date"
                    value={specimenData.date}
                    onChange={(e) => setSpecimenData({ ...specimenData, date: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Collection Time</label>
                  <input
                    type="time"
                    value={specimenData.time}
                    onChange={(e) => setSpecimenData({ ...specimenData, time: e.target.value })}
                    style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Specimen Type</label>
                <select
                  value={specimenData.type}
                  onChange={(e) => setSpecimenData({ ...specimenData, type: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                >
                  <option value="Blood (Serum)">Blood (Serum)</option>
                  <option value="Blood (Whole EDTA)">Blood (Whole EDTA)</option>
                  <option value="Blood (Plasma Citrate)">Blood (Plasma Citrate)</option>
                  <option value="Urine (Spot)">Urine (Spot)</option>
                  <option value="Urine (24-Hour)">Urine (24-Hour)</option>
                  <option value="Sputum">Sputum</option>
                </select>
              </div>

              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Container / Tube</label>
                <input
                  type="text"
                  value={specimenData.container}
                  onChange={(e) => setSpecimenData({ ...specimenData, container: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="fasting-cb"
                  checked={specimenData.fasting}
                  onChange={(e) => setSpecimenData({ ...specimenData, fasting: e.target.checked })}
                />
                <label htmlFor="fasting-cb" style={{ color: "#334155", cursor: "pointer" }}>
                  12-hour Overnight Fasting Verified
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSpecimenModalOpen(false);
                  notify("Specimen details updated.");
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Specimen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BARCODE LABEL MODAL */}
      {barcodeModalOpen && barcodeOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "420px",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>Specimen Tube Label Preview</h3>
              <button
                type="button"
                onClick={() => setBarcodeModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                border: "2px dashed #94a3b8",
                padding: "14px",
                borderRadius: "4px",
                background: "#fafafa",
                fontFamily: "monospace",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>HEAL YOUR HEART CLINIC</div>
              <div style={{ fontSize: "0.85rem" }}>REF: {barcodeOrder.lab_ref || `00020${barcodeOrder.id.slice(0, 3)}`}</div>
              <div style={{ fontSize: "0.85rem" }}>TEST: {getOrderTests(barcodeOrder)[0] || barcodeOrder.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                DATE: {new Date().toLocaleDateString()} · TUBE: SST (Gold)
              </div>
              <div style={{ marginTop: "10px", textAlign: "center", letterSpacing: "4px", fontWeight: 700 }}>
                |||| | ||||| || |||||| | |||
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setBarcodeModalOpen(false);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  background: "#ea580c",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 7. VIEW LAB RESULTS REPORT MODAL */}
      {viewReportModalOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "720px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>Diagnostic Lab Report</h3>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: (viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "#dcfce7" : "#fef3c7",
                      color: (viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "#16a34a" : "#d97706",
                    }}
                  >
                    {(viewReportModalOrder.status || "").toLowerCase() === "reviewed" ? "Reviewed / Signed" : "Unsigned / Pending Review"}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
                  Ref.#: <strong style={{ fontFamily: "monospace", color: "#334155" }}>{viewReportModalOrder.lab_ref || `00020${viewReportModalOrder.id.slice(0, 3)}`}</strong> · Lab: <strong>{getOrderLabName(viewReportModalOrder)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewReportModalOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Patient Details strip */}
            {(() => {
              const p = getPatientData(viewReportModalOrder);
              return (
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "4px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "0.83rem", marginBottom: "16px" }}>
                  <div><span style={{ color: "#64748b" }}>Patient:</span> <strong style={{ color: "#0f172a" }}>{p.name}</strong></div>
                  <div><span style={{ color: "#64748b" }}>MRN:</span> <strong style={{ color: "#0f172a" }}>{p.mrn}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Ordered Date:</span> <strong style={{ color: "#0f172a" }}>{viewReportModalOrder.ordered_date || "Today"}</strong></div>
                </div>
              );
            })()}

            {/* Parameter Results Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "16px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Parameter</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Result</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Unit</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Reference Interval</th>
                  <th style={{ padding: "8px 10px", color: "#334155" }}>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {(!viewReportModalOrder.values || viewReportModalOrder.values.length === 0) ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                      No structured parameter results recorded yet.
                    </td>
                  </tr>
                ) : (
                  viewReportModalOrder.values.map((v: any, idx: number) => {
                    const isAbn = ["low", "high", "abnormal"].includes((v.interpretation || "").toLowerCase());
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: isAbn ? "#fff5f5" : "transparent" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#1e293b" }}>{v.parameter}</td>
                        <td style={{ padding: "8px 10px", fontWeight: isAbn ? 700 : 500, color: isAbn ? "#dc2626" : "#0f172a" }}>
                          {v.value}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#64748b" }}>{v.unit || "-"}</td>
                        <td style={{ padding: "8px 10px", color: "#475569" }}>{v.reference_range || "-"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          {v.interpretation ? (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background: isAbn ? "#fee2e2" : "#f1f5f9",
                                color: isAbn ? "#dc2626" : "#475569",
                                border: isAbn ? "1px solid #dc2626" : "none",
                              }}
                            >
                              {v.interpretation}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(viewReportModalOrder);
                  setViewMode("print_view");
                  setViewReportModalOrder(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <Printer size={15} /> Print Requisition
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                {(viewReportModalOrder.status || "").toLowerCase() !== "reviewed" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api(`/records/orders/${viewReportModalOrder.id}/status`, "POST", {
                        status: "Reviewed",
                        version: viewReportModalOrder.version,
                      });
                      queryClient.invalidateQueries({ queryKey: ["orders"] });
                      setViewReportModalOrder(null);
                      notify("Results signed and approved.");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Review & Sign Off
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewReportModalOrder(null)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLOT MODAL (TRENDS & VISUALIZATION) */}
      {plotOrder && (
        <PlotModal
          order={plotOrder}
          patient={patients.find((p) => p.id === plotOrder.patient_id)}
          allOrders={orders}
          onClose={() => setPlotOrder(null)}
        />
      )}

      {/* 8. SELECT LAB ORDER FOR RESULTS ENTRY MODAL */}
      {selectOrderForResultsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "720px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "20px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Enter Laboratory Results</h3>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                  Select an active requisition to enter or import laboratory test results
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectOrderForResultsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    {isGlobalMode && <th style={{ padding: "8px 12px", color: "#334155" }}>Patient</th>}
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Lab Ref.#</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Tests</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Ordered Date</th>
                    <th style={{ padding: "8px 12px", color: "#334155" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#334155" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLabOrders.filter((o) => ["pending", "partial", "ordered"].includes((o.status || "").toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={isGlobalMode ? 6 : 5} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                        No pending requisitions awaiting results entry.
                      </td>
                    </tr>
                  ) : (
                    activeLabOrders
                      .filter((o) => ["pending", "partial", "ordered"].includes((o.status || "").toLowerCase()))
                      .map((ord) => {
                        const pat = getPatientData(ord);
                        const tests = getOrderTests(ord);
                        return (
                          <tr key={ord.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {isGlobalMode && (
                              <td style={{ padding: "8px 12px" }}>
                                <strong style={{ color: "#0f172a" }}>{pat.name}</strong>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>[ {pat.mrn} ]</div>
                              </td>
                            )}
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#334155" }}>
                              {ord.lab_ref || `00020${ord.id.slice(0, 3)}`}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#1e293b" }}>{tests.join(", ")}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b" }}>{ord.ordered_date || "Today"}</td>
                            <td style={{ padding: "8px 12px" }}>{renderStatusBadge(ord.status)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setSelectOrderForResultsModal(false);
                                  setViewMode("import_result");
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: "4px",
                                  border: "none",
                                  background: "#ea580c",
                                  color: "#fff",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                }}
                              >
                                Enter Results
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setSelectOrderForResultsModal(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODAL: SEARCH & ADD LAB TESTS
// ==========================================
function SearchAndAddTestsModal({
  labCatalogs,
  orderedItems,
  onClose,
  onAdd,
}: {
  labCatalogs: Row[];
  orderedItems: { labName: string; testName: string }[];
  onClose: () => void;
  onAdd: (tests: { labName: string; testName: string }[]) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});

  const existingSet = useMemo(() => new Set(orderedItems.map((x) => x.testName.toLowerCase())), [orderedItems]);

  const categories = useMemo(() => [
    "All",
    "HUH Lab Tests",
    "BioChemistry",
    "Clinical Pathology",
    "Endocrinology",
    "Haematology",
    "Microbiology",
  ], []);

  // Filtered test catalog items
  const displayItems = useMemo(() => {
    return labCatalogs.filter((c) => {
      // Category filter
      if (selectedCategory !== "All") {
        const cat = c.group || (c.name.includes(" · ") ? c.name.split(" · ")[0] : "");
        if (!cat.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const n = c.name.toLowerCase();
        const contentStr = (c.content || "").toLowerCase();
        if (!n.includes(q) && !contentStr.includes(q)) return false;
      }
      return true;
    });
  }, [labCatalogs, selectedCategory, searchQuery]);

  const handleToggle = (key: string) => {
    setSelectedTests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    const toAdd: { labName: string; testName: string }[] = [];
    displayItems.forEach((c) => {
      if (selectedTests[c.id]) {
        let labName = c.group || "HUH Lab Tests";
        let testName = c.name;
        if (c.name.includes(" · ")) {
          const parts = c.name.split(" · ");
          labName = parts[0].trim();
          testName = parts[1].trim();
        }
        toAdd.push({ labName, testName });
      }
    });

    if (toAdd.length === 0) {
      alert("Please select at least one test to add.");
      return;
    }
    onAdd(toAdd);
  };

  const selectedCount = Object.values(selectedTests).filter(Boolean).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "6px",
          width: "760px",
          maxWidth: "95vw",
          height: "580px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Search & Add Lab Tests</h3>
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Search individual clinical tests and panels across laboratory compendiums</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={20} />
          </button>
        </div>

        {/* Top search & category tabs */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "9px", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search by test name, analyte or panel (e.g. Troponin, CBC, Lipid...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "6px 10px 6px 32px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: "160px" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Item List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {displayItems.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
              No tests found matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {displayItems.map((c) => {
                const parts = c.name.includes(" · ") ? c.name.split(" · ") : ["HUH Lab Tests", c.name];
                const labName = parts[0].trim();
                const testName = parts[1].trim();
                const isAlreadyAdded = existingSet.has(testName.toLowerCase());
                const isChecked = !!selectedTests[c.id];

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (!isAlreadyAdded) handleToggle(c.id);
                    }}
                    style={{
                      border: isChecked ? "1.5px solid #0284c7" : "1px solid #e2e8f0",
                      borderRadius: "4px",
                      padding: "10px 14px",
                      background: isChecked ? "#f0f9ff" : isAlreadyAdded ? "#f8fafc" : "#ffffff",
                      cursor: isAlreadyAdded ? "not-allowed" : "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: isAlreadyAdded ? 0.65 : 1,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem" }}>{testName}</span>
                        <span style={{ fontSize: "0.72rem", background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: "3px" }}>
                          {labName}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isAlreadyAdded ? (
                        <span style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>Added ✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleToggle(c.id)}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Selected: <strong style={{ color: "#0284c7" }}>{selectedCount}</strong> tests
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "6px 14px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              style={{ padding: "6px 16px", borderRadius: "4px", border: "none", background: "#ea580c", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
            >
              Add Selected Tests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL: PAST LAB ORDERS
// ==========================================
function PastLabOrdersModal({
  patientId,
  allOrders,
  onClose,
  onReorder,
}: {
  patientId: string;
  allOrders: Row[];
  onClose: () => void;
  onReorder: (tests: { labName: string; testName: string }[]) => void;
}) {
  const past = allOrders.filter((o) => o.patient_id === patientId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "6px",
          width: "680px",
          maxWidth: "95vw",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Past Lab Orders</h3>
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Previous laboratory requisitions recorded for this patient</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={18} />
          </button>
        </div>

        {past.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No past lab orders found for this patient.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "8px 10px" }}>Ordered Date</th>
                <th style={{ padding: "8px 10px" }}>Lab Ref</th>
                <th style={{ padding: "8px 10px" }}>Tests</th>
                <th style={{ padding: "8px 10px" }}>Status</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {past.map((ord) => {
                let testList: string[] = [ord.name];
                if (ord.order_metadata) {
                  try {
                    const m = JSON.parse(ord.order_metadata);
                    if (Array.isArray(m.tests) && m.tests.length > 0) testList = m.tests;
                  } catch { }
                }
                return (
                  <tr key={ord.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", color: "#64748b" }}>{ord.ordered_date || "Past"}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{ord.lab_ref || "-"}</td>
                    <td style={{ padding: "8px 10px", color: "#0f172a" }}>{testList.join(", ")}</td>
                    <td style={{ padding: "8px 10px" }}>{ord.status}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const items = testList.map((t) => ({ labName: "HUH Lab Tests", testName: t }));
                          onReorder(items);
                        }}
                        style={{ padding: "4px 10px", borderRadius: "3px", border: "1px solid #0284c7", background: "#f0f9ff", color: "#0284c7", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                      >
                        + Re-order
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <button type="button" onClick={onClose} style={{ padding: "6px 14px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL: PLOT PARAMETER TRENDS
// ==========================================
function PlotModal({
  order,
  patient,
  allOrders,
  onClose,
}: {
  order: Row;
  patient?: Row;
  allOrders: Row[];
  onClose: () => void;
}) {
  const pName = patient ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() : (order.patient_name || "Patient");
  const pMrn = patient?.mrn || order.patient_mrn || "MRN-000000";

  // Gather all lab values for this patient across all orders
  const patientOrders = allOrders.filter((o) => o.patient_id === order.patient_id && o.values && o.values.length > 0);

  // Extract unique parameter names
  const availableParams = useMemo(() => {
    const set = new Set<string>();
    patientOrders.forEach((ord) => {
      (ord.values || []).forEach((v: any) => {
        if (v.parameter) set.add(v.parameter);
      });
    });
    if (set.size === 0) {
      ["Total Cholesterol", "LDL Cholesterol", "Serum Iron", "Blood Urea Nitrogen", "Serum Creatinine", "eGFR", "Haemoglobin"].forEach((p) => set.add(p));
    }
    return Array.from(set);
  }, [patientOrders]);

  const [selectedParam, setSelectedParam] = useState<string>(availableParams[0] || "Total Cholesterol");

  // Collect trend points for selectedParam
  const points = useMemo(() => {
    const list: { date: string; value: number; unit: string; interp: string }[] = [];
    patientOrders.forEach((ord) => {
      const v = (ord.values || []).find((x: any) => x.parameter?.toLowerCase() === selectedParam.toLowerCase());
      if (v) {
        const num = parseFloat(v.value);
        if (!isNaN(num)) {
          list.push({
            date: ord.ordered_date || "Oct 14, 2026",
            value: num,
            unit: v.unit || "",
            interp: v.interpretation || "Normal",
          });
        }
      }
    });
    if (list.length === 0) {
      const pKey = selectedParam.toLowerCase();
      const ref = KNOWN_LAB_RANGES[pKey] || { min: 50, max: 150, unit: "mg/dL" };
      const mid = ref.min && ref.max ? (ref.min + ref.max) / 2 : 100;
      return [
        { date: "Oct 14, 2026", value: Math.round(mid * 0.95), unit: ref.unit || "mg/dL", interp: "Normal" },
        { date: "Nov 06, 2026", value: Math.round(mid * 1.15), unit: ref.unit || "mg/dL", interp: "High" },
      ];
    }
    return list;
  }, [patientOrders, selectedParam]);

  const refInfo = KNOWN_LAB_RANGES[selectedParam.toLowerCase()] || {};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "6px",
          width: "680px",
          maxWidth: "95vw",
          padding: "24px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Parameter Trend Plot</h3>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
              {pName} · [ {pMrn} ]
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Parameter Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Analyte Parameter:</label>
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: "220px" }}
          >
            {availableParams.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* SVG Chart */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "20px", marginBottom: "20px" }}>
          <svg viewBox="0 0 500 200" style={{ width: "100%", height: "200px" }}>
            <line x1="40" y1="20" x2="480" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1="40" y1="80" x2="480" y2="80" stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1="40" y1="170" x2="480" y2="170" stroke="#94a3b8" />

            {refInfo.min !== undefined && refInfo.max !== undefined && (
              <rect x="40" y="60" width="440" height="70" fill="rgba(22, 163, 74, 0.08)" />
            )}

            {points.map((pt, i) => {
              const x = 80 + i * (360 / Math.max(points.length - 1, 1));
              const y = 170 - Math.min(Math.max((pt.value / 300) * 140, 20), 150);
              const nextPt = points[i + 1];
              const nextX = 80 + (i + 1) * (360 / Math.max(points.length - 1, 1));
              const nextY = nextPt ? 170 - Math.min(Math.max((nextPt.value / 300) * 140, 20), 150) : 0;
              const isAbn = ["low", "high", "abnormal"].includes(pt.interp.toLowerCase());

              return (
                <g key={i}>
                  {nextPt && (
                    <line x1={x} y1={y} x2={nextX} y2={nextY} stroke="#0284c7" strokeWidth="2.5" />
                  )}
                  <circle cx={x} cy={y} r="5" fill={isAbn ? "#dc2626" : "#0284c7"} stroke="#fff" strokeWidth="2" />
                  <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill={isAbn ? "#dc2626" : "#0f172a"}>
                    {pt.value} {pt.unit}
                  </text>
                  <text x={x} y="190" textAnchor="middle" fontSize="10" fill="#64748b">
                    {pt.date}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "6px 16px", borderRadius: "4px", background: "#f1f5f9", border: "1px solid #cbd5e1", fontSize: "0.85rem", cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN: ADD / EDIT LAB ORDER REQUISITION BUILDER
// ==========================================
function AddLabOrderScreen({
  patientId,
  encounterId,
  labCatalogs,
  labTemplates,
  allOrders = [],
  initialOrder = null,
  onCancel,
  onSaved,
}: {
  patientId?: string;
  encounterId?: string;
  labCatalogs: Row[];
  labTemplates: Row[];
  allOrders?: Row[];
  initialOrder?: Row | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, staff, patients } = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialOrder?.patient_id || patientId || patients[0]?.id || ""
  );
  const [orderedDate, setOrderedDate] = useState<string>(
    initialOrder?.ordered_date || "Nov 06, 2026"
  );
  const [orderedBy, setOrderedBy] = useState<string>(
    initialOrder?.author_id || user.id
  );
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [searchAddModalOpen, setSearchAddModalOpen] = useState(false);
  const [pastOrdersModalOpen, setPastOrdersModalOpen] = useState(false);
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);
  const [isAddingTestsLoading, setIsAddingTestsLoading] = useState(false);
  const [isSavingLoading, setIsSavingLoading] = useState(false);

  // Ordered tests list
  const [orderedItems, setOrderedItems] = useState<{ labName: string; testName: string }[]>(() => {
    if (initialOrder) {
      const tests = getOrderTests(initialOrder);
      const primaryLab = getOrderLabName(initialOrder);
      return tests.map((t: string) => ({ labName: primaryLab, testName: t }));
    }
    return [];
  });

  // Notes
  const [noteLabPatient, setNoteLabPatient] = useState(
    initialOrder?.notes_lab_patient || initialOrder?.instructions || ""
  );
  const [notesIntraOffice, setNotesIntraOffice] = useState(
    initialOrder?.notes_intra_office || ""
  );

  const handleRemoveItem = (index: number) => {
    setOrderedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTests = (testsToAdd: { labName: string; testName: string }[]) => {
    setTemplateModalOpen(false);
    setSearchAddModalOpen(false);
    setPastOrdersModalOpen(false);
    setIsAddingTestsLoading(true);
    setTimeout(() => {
      setOrderedItems((prev) => {
        const existing = new Set(prev.map((x) => x.testName.toLowerCase()));
        const unique = testsToAdd.filter((x) => !existing.has(x.testName.toLowerCase()));
        return [...prev, ...unique];
      });
      setIsAddingTestsLoading(false);
    }, 300);
  };

  const handleSaveOrder = async () => {
    const effPatientId = patientId || selectedPatientId;
    if (!effPatientId) {
      alert("Please select a patient for this lab order.");
      return;
    }
    if (orderedItems.length === 0) {
      alert("Please add at least one test to the order.");
      return;
    }
    setIsSavingLoading(true);
    try {
      const primaryLab = orderedItems[0].labName;
      const testNames = orderedItems.map((x) => x.testName);
      const title = `${primaryLab} · ${testNames[0]}${testNames.length > 1 ? ` (+${testNames.length - 1} tests)` : ""}`;

      if (initialOrder) {
        // UPDATE EXISTING ORDER
        await api(`/records/orders/${initialOrder.id}`, "PUT", {
          name: title,
          ordered_date: orderedDate,
          notes_lab_patient: noteLabPatient,
          notes_intra_office: notesIntraOffice,
          instructions: noteLabPatient,
          version: initialOrder.version,
          order_metadata: JSON.stringify({
            primary_lab: primaryLab,
            tests: testNames,
            notes_lab_patient: noteLabPatient,
            notes_intra_office: notesIntraOffice,
          }),
        });
      } else {
        // CREATE NEW ORDER
        await api("/records/orders", "POST", {
          patient_id: effPatientId,
          encounter_id: encounterId || null,
          kind: "Lab",
          name: title,
          ordered_date: orderedDate,
          status: "Pending",
          notes_lab_patient: noteLabPatient,
          notes_intra_office: notesIntraOffice,
          instructions: noteLabPatient,
          order_metadata: JSON.stringify({
            primary_lab: primaryLab,
            tests: testNames,
            notes_lab_patient: noteLabPatient,
            notes_intra_office: notesIntraOffice,
          }),
        });
      }
      onSaved();
    } catch (err: any) {
      alert(err.message || (initialOrder ? "Failed to update lab order." : "Failed to create lab order."));
      setIsSavingLoading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {(isAddingTestsLoading || isSavingLoading) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Loading...</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>
          {initialOrder ? "Edit Lab Order" : "Add Lab Order"}
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={isSavingLoading}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {initialOrder ? "Update Order" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Form Controls Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          padding: "12px 0",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: "16px",
          fontSize: "0.85rem",
        }}
      >
        {initialOrder ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#334155", fontWeight: 600 }}>Patient</span>
            <span
              style={{
                padding: "5px 10px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {(() => {
                const p = patients.find((x) => x.id === initialOrder.patient_id);
                return p ? `${p.first_name} ${p.last_name} (${p.mrn})` : initialOrder.patient_name || "Patient";
              })()}
            </span>
          </div>
        ) : !patientId ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#334155", fontWeight: 600 }}>Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{
                padding: "5px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.85rem",
                minWidth: "180px",
              }}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.mrn})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#334155" }}>Ordered Date</span>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
            <input
              type="text"
              value={orderedDate}
              onChange={(e) => setOrderedDate(e.target.value)}
              style={{ border: "none", padding: "5px 8px", fontSize: "0.85rem", width: "110px", outline: "none" }}
            />
            <span style={{ padding: "0 6px", color: "#64748b" }}>
              <Calendar size={15} />
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#334155" }}>Ordered By</span>
          <select
            value={orderedBy}
            onChange={(e) => setOrderedBy(e.target.value)}
            style={{
              padding: "5px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              minWidth: "160px",
            }}
          >
            {staff
              .filter((s) => ["doctor", "assistant"].includes(s.role))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Action Links Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          fontSize: "0.85rem",
          color: "#0284c7",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={() => setSearchAddModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer", fontWeight: 600 }}
        >
          Search & Add
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer", fontWeight: 600 }}
        >
          Templates
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => setSpecimenModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Specimen Details
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={() => setPastOrdersModalOpen(true)}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          Past Lab Orders
        </button>
        <span style={{ color: "#94a3b8" }}>/</span>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: "none", border: "none", color: "#0284c7", padding: 0, cursor: "pointer" }}
        >
          View Orders
        </button>
      </div>

      {/* Selection count header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
          Selected Tests: <strong style={{ color: "#0f766e" }}>{orderedItems.length}</strong>
        </span>
        {orderedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setOrderedItems([])}
            style={{ background: "none", border: "none", color: "#dc2626", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Ordered Tests Table */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "4px", marginBottom: "20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
              <th style={{ padding: "9px 14px", fontWeight: 600, color: "#334155", width: "40%" }}>Lab Name</th>
              <th style={{ padding: "9px 14px", fontWeight: 600, color: "#334155", width: "50%" }}>Test(s)</th>
              <th style={{ padding: "9px 14px", textAlign: "right" }}></th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                  No tests ordered. Click <strong style={{ color: "#0284c7" }}>Search & Add</strong> or <strong style={{ color: "#0284c7" }}>Templates</strong> above to add tests.
                </td>
              </tr>
            ) : (
              orderedItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "9px 14px", color: "#1e293b" }}>{item.labName}</td>
                  <td style={{ padding: "9px 14px", color: "#0f172a" }}>{item.testName}</td>
                  <td style={{ padding: "9px 14px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                      title="Remove test"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dual Note Textareas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Note to Lab / Patient
          </label>
          <textarea
            rows={4}
            value={noteLabPatient}
            onChange={(e) => setNoteLabPatient(e.target.value)}
            placeholder="e.g. 12-hour overnight fasting required; draw prior to morning dose..."
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
              Intra Office Notes
            </label>
            <span style={{ fontSize: "0.75rem", color: "#dc2626", fontStyle: "italic" }}>
              Notes not shared with patient.
            </span>
          </div>
          <textarea
            rows={4}
            value={notesIntraOffice}
            onChange={(e) => setNotesIntraOffice(e.target.value)}
            placeholder="Internal coordination notes (e.g. sample stored in rack B; alert Dr. on arrival)..."
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Search & Add Modal */}
      {searchAddModalOpen && (
        <SearchAndAddTestsModal
          labCatalogs={labCatalogs}
          orderedItems={orderedItems}
          onClose={() => setSearchAddModalOpen(false)}
          onAdd={handleAddTests}
        />
      )}

      {/* Templates Modal */}
      {templateModalOpen && (
        <TemplatesModal
          labCatalogs={labCatalogs}
          labTemplates={labTemplates}
          onClose={() => setTemplateModalOpen(false)}
          onAdd={handleAddTests}
        />
      )}

      {/* Past Orders Modal */}
      {pastOrdersModalOpen && (
        <PastLabOrdersModal
          patientId={patientId || selectedPatientId}
          allOrders={allOrders}
          onClose={() => setPastOrdersModalOpen(false)}
          onReorder={handleAddTests}
        />
      )}

      {/* Specimen Details Modal */}
      {specimenModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "#ffffff", borderRadius: "6px", width: "480px", padding: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>Specimen Details</h3>
              <button type="button" onClick={() => setSpecimenModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Specimen Type</label>
                <select defaultValue="Blood (Serum)" style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                  <option value="Blood (Serum)">Blood (Serum)</option>
                  <option value="Blood (Whole EDTA)">Blood (Whole EDTA)</option>
                  <option value="Blood (Plasma Citrate)">Blood (Plasma Citrate)</option>
                  <option value="Urine (Spot)">Urine (Spot)</option>
                  <option value="Urine (24-Hour)">Urine (24-Hour)</option>
                </select>
              </div>
              <div>
                <label style={{ color: "#475569", display: "block", marginBottom: "4px" }}>Tube Container</label>
                <input type="text" defaultValue="Gold top (SST gel separator)" style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input type="checkbox" id="fasting-check" defaultChecked />
                <label htmlFor="fasting-check" style={{ color: "#334155" }}>12-hour Overnight Fasting Required</label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button type="button" onClick={() => setSpecimenModalOpen(false)} style={{ padding: "6px 14px", borderRadius: "4px", border: "none", background: "#ea580c", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODAL: TEMPLATES (PRACTICE & MY TEMPLATES)
// ==========================================
function TemplatesModal({
  labCatalogs,
  labTemplates,
  onClose,
  onAdd,
}: {
  labCatalogs: Row[];
  labTemplates: Row[];
  onClose: () => void;
  onAdd: (tests: { labName: string; testName: string }[]) => void;
}) {
  const practiceList = useMemo(() => [
    "AFB Sputum",
    "Allergy Profile",
    "Anemia Profile",
    "Blood Group",
    "eGFR",
    "Heart Failure Plus",
    "HUH - EECP Routine",
    "HUH - EECP Routine Out",
    "HUH-Cardio Diabetic",
    "HUH-CD Diabetic Routine",
    "HUH-CD-Diabetic",
    "Lab Orders",
    "Master Health Checkup",
  ], []);

  const [selectedTemplateName, setSelectedTemplateName] = useState("HUH-Cardio Diabetic");
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});

  const activeTemplateData = useMemo(() => {
    const found = labTemplates.find((t) => t.name === selectedTemplateName);
    if (found?.content) {
      try {
        return JSON.parse(found.content);
      } catch { }
    }
    if (selectedTemplateName === "HUH-Cardio Diabetic") {
      return {
        category: "HUH-Cardio Diabetic",
        tests: [
          "HUH-CD-Bone Marker",
          "HUH-CD-Cardiac Risk Marker",
          "HUH-CD-Complete Hemogram",
          "HUH-CD-Diabetes",
          "HUH-CD-Electrolytes",
          "HUH-CD-Free Thyroid",
          "HUH-CD-Gout Marker",
          "HUH-CD-Iron Deficiency Profile",
          "HUH-CD-Kidney Microvascular",
          "HUH-CD-Lipid Profile",
          "HUH-CD-Liver Function Test",
          "HUH-CD-Pancreas Profile",
          "HUH-CD-Renal Function Test",
          "HUH-CD-Trace Micronutrients",
          "HUH-CD-Urine Routine",
          "HUH-CD-Vitamins",
        ],
      };
    }
    if (selectedTemplateName === "AFB Sputum") {
      return { category: "Microbiology", tests: ["AFB Suptum"] };
    }
    return {
      category: selectedTemplateName,
      tests: ["Test Panel A", "Test Panel B", "Test Panel C"],
    };
  }, [selectedTemplateName, labTemplates]);

  const testList: string[] = activeTemplateData.tests || [];
  const categoryName: string = activeTemplateData.category || selectedTemplateName;

  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return testList;
    return testList.filter((t) => t.toLowerCase().includes(testSearch.toLowerCase()));
  }, [testList, testSearch]);

  const handleToggleTest = (name: string) => {
    setSelectedTests((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const allChecked = filteredTests.length > 0 && filteredTests.every((t) => !!selectedTests[t]);
  const handleToggleAll = () => {
    const nextState = !allChecked;
    const update = { ...selectedTests };
    filteredTests.forEach((t) => {
      update[t] = nextState;
    });
    setSelectedTests(update);
  };

  const handleAddClicked = () => {
    const toAdd = testList
      .filter((t) => !!selectedTests[t])
      .map((t) => ({ labName: categoryName, testName: t }));

    if (toAdd.length === 0) {
      alert("Please select at least one test from the template.");
      return;
    }
    onAdd(toAdd);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "6px",
          width: "900px",
          maxWidth: "95vw",
          height: "560px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#334155" }}>
            Templates added under &apos;Settings &gt; Templates &gt; Lab Record&apos; are listed here.{" "}
            <a href="#/settings" style={{ color: "#0284c7", textDecoration: "none" }}>
              Create new template
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Templates Modal"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left Pane: Practice & My Templates */}
          <div
            style={{
              width: "250px",
              borderRight: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
              Practice Templates
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {practiceList.map((name) => {
                const isActive = selectedTemplateName === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateName(name);
                      setSelectedTests({});
                    }}
                    style={{
                      background: isActive ? "#ffffff" : "transparent",
                      border: "none",
                      borderLeft: isActive ? "3px solid #0d9488" : "3px solid transparent",
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: "0.82rem",
                      color: isActive ? "#0d9488" : "#334155",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                padding: "12px 14px 6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "#64748b",
                borderTop: "1px solid #e2e8f0",
                marginTop: "10px",
              }}
            >
              My Templates
            </div>
            <div style={{ padding: "4px 14px 10px", fontSize: "0.78rem", color: "#94a3b8" }}>
              (Personal saved templates)
            </div>
          </div>

          {/* Right Pane: Test Selector */}
          <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={allChecked} onChange={handleToggleAll} />
                <span>Select All</span>
              </label>

              <div style={{ position: "relative", width: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "8px", top: "7px", color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by Test Name or Code"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px 4px 26px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={handleToggleAll}
                />
                <span style={{ color: "#0f172a" }}>{categoryName}</span>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px 16px",
                fontSize: "0.82rem",
              }}
            >
              {filteredTests.map((tName) => {
                const checked = !!selectedTests[tName];
                return (
                  <label
                    key={tName}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "7px",
                      cursor: "pointer",
                      lineHeight: "1.25",
                      color: checked ? "#0f172a" : "#334155",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleTest(tName)}
                      style={{ marginTop: "2px" }}
                    />
                    <span>{tName}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={handleAddClicked}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel Templates Modal"
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PARSING HELPERS FOR LAB RESULT IMPORT
// ==========================================
function parseCsvResults(csvText: string): Array<{
  test_name: string;
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  interpretation: string;
  comments: string;
}> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  };

  const parsedLines = lines.map(parseLine);
  if (parsedLines.length === 0) return [];

  const firstRow = parsedLines[0].map((h) => h.toLowerCase());
  let hasHeader = false;
  let testIdx = -1;
  let paramIdx = -1;
  let valIdx = -1;
  let unitIdx = -1;
  let refIdx = -1;
  let interpIdx = -1;
  let commIdx = -1;

  firstRow.forEach((h, i) => {
    if (h.includes("test") || h.includes("panel")) testIdx = i;
    else if (h.includes("param") || h.includes("analyte") || h.includes("name")) paramIdx = i;
    else if (h.includes("val") || h.includes("result")) valIdx = i;
    else if (h.includes("unit")) unitIdx = i;
    else if (h.includes("ref") || h.includes("range")) refIdx = i;
    else if (h.includes("interp") || h.includes("flag")) interpIdx = i;
    else if (h.includes("comm") || h.includes("note")) commIdx = i;
  });

  if (paramIdx !== -1 || valIdx !== -1) {
    hasHeader = true;
  }

  if (!hasHeader) {
    testIdx = 0;
    paramIdx = 1;
    valIdx = 2;
    unitIdx = 3;
    refIdx = 4;
    interpIdx = 5;
    commIdx = 6;
  } else {
    if (testIdx === -1) testIdx = 0;
    if (paramIdx === -1) paramIdx = 1;
    if (valIdx === -1) valIdx = 2;
  }

  const startRow = hasHeader ? 1 : 0;
  const results: Array<{
    test_name: string;
    parameter: string;
    value: string;
    unit: string;
    reference_range: string;
    interpretation: string;
    comments: string;
  }> = [];

  for (let r = startRow; r < parsedLines.length; r++) {
    const row = parsedLines[r];
    if (row.length < 2) continue;
    const testName = (testIdx >= 0 && row[testIdx]) ? row[testIdx] : "";
    const paramName = (paramIdx >= 0 && row[paramIdx]) ? row[paramIdx] : (row[0] || "");
    const val = (valIdx >= 0 && row[valIdx]) ? row[valIdx] : "";
    const unit = (unitIdx >= 0 && row[unitIdx]) ? row[unitIdx] : "";
    const ref = (refIdx >= 0 && row[refIdx]) ? row[refIdx] : "";
    let interp = (interpIdx >= 0 && row[interpIdx]) ? row[interpIdx] : "";
    const comm = (commIdx >= 0 && row[commIdx]) ? row[commIdx] : "";

    if (!paramName && !val) continue;

    if (!interp || interp === "-") {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        const nums = ref.match(/[-+]?[0-9]*\.?[0-9]+/g);
        if (nums && nums.length >= 2) {
          const low = parseFloat(nums[0]);
          const high = parseFloat(nums[1]);
          if (!isNaN(low) && !isNaN(high)) {
            if (num < low) interp = "Low";
            else if (num > high) interp = "High";
            else interp = "Normal";
          }
        }
      }
    }

    results.push({
      test_name: testName,
      parameter: paramName,
      value: val,
      unit,
      reference_range: ref,
      interpretation: interp || "Normal",
      comments: comm,
    });
  }

  return results;
}

function parseJsonResults(jsonText: string): Array<{
  test_name: string;
  parameter: string;
  value: string;
  unit: string;
  reference_range: string;
  interpretation: string;
  comments: string;
}> {
  try {
    const parsed = JSON.parse(jsonText);
    const rawList = Array.isArray(parsed) ? parsed : (parsed.values || parsed.results || parsed.analytes || []);
    if (!Array.isArray(rawList)) return [];

    return rawList.map((item: any) => ({
      test_name: item.test_name || item.test || item.panel || "",
      parameter: item.parameter || item.name || item.analyte || "",
      value: String(item.value ?? item.result ?? ""),
      unit: item.unit || item.units || "",
      reference_range: item.reference_range || item.range || item.reference || "",
      interpretation: item.interpretation || item.flag || "Normal",
      comments: item.comments || item.notes || "",
    })).filter((x) => x.parameter || x.value);
  } catch {
    return [];
  }
}

// ==========================================
// SCREEN: IMPORT LAB RESULTS (AUTHENTIC CHARMHEALTH LAB ORDERS ACTION)
// ==========================================
function ImportResultsScreen({
  order,
  labCatalogs,
  onCancel,
  onSaved,
}: {
  order: Row;
  labCatalogs: Row[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, staff, patients, notify } = useApp();
  const [resultDate, setResultDate] = useState("Nov 06, 2026");
  const [resultTime, setResultTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [specimenSource, setSpecimenSource] = useState("Blood (Serum)");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null);
  const [panelComments, setPanelComments] = useState<Record<string, string>>({});
  const [groupComments, setGroupComments] = useState("");
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [specimenModalOpen, setSpecimenModalOpen] = useState(false);

  // Context: patient and doctor
  const patient = useMemo(() => patients.find((p) => p.id === order.patient_id), [patients, order.patient_id]);
  const clinician = useMemo(() => {
    const s = staff.find((st) => st.id === order.author_id);
    if (s) return s.name.startsWith("Dr.") ? s.name : `Dr. ${s.name}`;
    return order.ordered_by || "Dr. Prem Sekar";
  }, [staff, order]);

  // Robust test names extraction from order
  const [testNames, setTestNames] = useState<string[]>(() => {
    if (order.order_metadata) {
      try {
        const meta = JSON.parse(order.order_metadata);
        if (Array.isArray(meta.tests) && meta.tests.length > 0) return meta.tests;
        if (meta.template_name) {
          if (meta.template_name.includes(" & ")) return meta.template_name.split(" & ").map((s: string) => s.trim());
          if (meta.template_name.includes(" · ")) return [meta.template_name.split(" · ")[1].trim()];
          return [meta.template_name];
        }
      } catch { }
    }
    if (order.name) {
      if (order.name.includes(" · ")) {
        const afterDot = order.name.split(" · ")[1].trim().replace(/\s*\(\+\d+\s*tests?\)/i, "");
        return [afterDot];
      }
      if (order.name.includes(" & ")) {
        return order.name.split(" & ").map((s: string) => s.trim());
      }
      return [order.name];
    }
    return ["HUH - Routine Diagnostic Evaluation"];
  });

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [analyteState, setAnalyteState] = useState<Record<string, AnalyteItem[]>>({});

  // Initialize analyte state from existing values or standard parameters for this order
  useEffect(() => {
    const existingValues: any[] = order.values || [];
    const initial: Record<string, AnalyteItem[]> = {};

    testNames.forEach((tName: string) => {
      const defaultItems = getTestAnalytes(tName, labCatalogs);
      initial[tName] = defaultItems.map((item) => {
        const exist = existingValues.find(
          (v) => v.parameter?.toLowerCase() === item.name.toLowerCase() && (!v.test_name || v.test_name === tName)
        );
        return {
          ...item,
          result: exist?.value || "",
          interpretation: exist?.interpretation || item.interpretation || "-",
          comments: exist?.comments || "",
        };
      });
    });

    setAnalyteState(initial);
  }, [order, testNames, labCatalogs]);

  // Handle Result input change with live auto-interpretation & red border on abnormal
  const handleResultChange = (tName: string, idx: number, val: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const target = { ...items[idx], result: val };

      if (val.trim() === "") {
        target.interpretation = "-";
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (target.minRef !== undefined && num < target.minRef) {
            target.interpretation = "Low";
          } else if (target.maxRef !== undefined && num > target.maxRef) {
            target.interpretation = "High";
          } else if (target.minRef !== undefined || target.maxRef !== undefined) {
            target.interpretation = "Normal";
          }
        }
      }

      items[idx] = target;
      return { ...prev, [tName]: items };
    });
  };

  const handleInterpretationChange = (tName: string, idx: number, interp: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], interpretation: interp };
      return { ...prev, [tName]: items };
    });
  };

  const handleCommentsChange = (tName: string, idx: number, comm: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], comments: comm };
      return { ...prev, [tName]: items };
    });
  };

  const handleAddParameter = (tName: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const newItem: AnalyteItem = {
        name: `Additional Param ${items.length + 1}`,
        result: "",
        unit: "",
        minRef: undefined,
        maxRef: undefined,
        textRef: "",
        interpretation: "-",
        comments: "",
      };
      return { ...prev, [tName]: [...items, newItem] };
    });
  };

  const handleRemoveParameter = (tName: string, idx: number) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items.splice(idx, 1);
      return { ...prev, [tName]: items };
    });
  };

  const handleParamNameChange = (tName: string, idx: number, name: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], name };
      return { ...prev, [tName]: items };
    });
  };

  const handleParamUnitChange = (tName: string, idx: number, unit: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], unit };
      return { ...prev, [tName]: items };
    });
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = ["Test Name", "Parameter", "Result Value", "Unit", "Reference Range", "Interpretation", "Comments"];
    const rows: string[][] = [];

    testNames.forEach((tName) => {
      const items = getTestAnalytes(tName, labCatalogs);
      items.forEach((item) => {
        const refStr = item.minRef !== undefined && item.maxRef !== undefined
          ? `${item.minRef} - ${item.maxRef}`
          : (item.textRef || "");
        rows.push([
          `"${tName}"`,
          `"${item.name}"`,
          `""`,
          `"${item.unit || ""}"`,
          `"${refStr}"`,
          `"Normal"`,
          `""`,
        ]);
      });
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lab_Result_Template_${order.lab_ref || "Requisition"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Sample CSV template downloaded.");
  };

  // Process imported results from file
  const handleApplyImportedRows = (
    importedRows: Array<{
      test_name: string;
      parameter: string;
      value: string;
      unit: string;
      reference_range: string;
      interpretation: string;
      comments: string;
    }>
  ) => {
    setAnalyteState((prev) => {
      const nextState = { ...prev };
      let matchedCount = 0;
      let addedCount = 0;

      importedRows.forEach((row) => {
        let targetPanel = testNames.find(
          (t) => t.toLowerCase() === row.test_name.toLowerCase()
        );
        if (!targetPanel && testNames.length > 0) {
          targetPanel = testNames.find((t) =>
            row.test_name && (t.toLowerCase().includes(row.test_name.toLowerCase()) || row.test_name.toLowerCase().includes(t.toLowerCase()))
          ) || testNames[0];
        }
        if (!targetPanel) targetPanel = row.test_name || "Diagnostic Evaluation";

        if (!nextState[targetPanel]) {
          nextState[targetPanel] = [];
        }

        const existingIdx = nextState[targetPanel].findIndex(
          (p) => p.name.toLowerCase() === row.parameter.toLowerCase()
        );

        if (existingIdx >= 0) {
          matchedCount++;
          nextState[targetPanel][existingIdx] = {
            ...nextState[targetPanel][existingIdx],
            result: row.value,
            unit: row.unit || nextState[targetPanel][existingIdx].unit,
            textRef: row.reference_range || nextState[targetPanel][existingIdx].textRef,
            interpretation: row.interpretation || nextState[targetPanel][existingIdx].interpretation,
            comments: row.comments || nextState[targetPanel][existingIdx].comments,
          };
        } else {
          addedCount++;
          const nums = row.reference_range.match(/[-+]?[0-9]*\.?[0-9]+/g);
          let minRef: number | undefined;
          let maxRef: number | undefined;
          if (nums && nums.length >= 2) {
            minRef = parseFloat(nums[0]);
            maxRef = parseFloat(nums[1]);
          }
          nextState[targetPanel].push({
            name: row.parameter,
            result: row.value,
            unit: row.unit,
            minRef,
            maxRef,
            textRef: row.reference_range,
            interpretation: row.interpretation || "Normal",
            comments: row.comments,
          });
        }
      });

      setImportNotice(
        `✓ File parsed successfully: ${importedRows.length} analyte results processed (${matchedCount} matched to ordered parameters${addedCount > 0 ? `, ${addedCount} added` : ""}).`
      );
      return nextState;
    });
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    const fname = file.name.toLowerCase();

    if (fname.endsWith(".pdf")) {
      setUploadedPdfFile(file);
      setImportNotice(
        `📄 Diagnostic PDF report "${file.name}" (${(file.size / 1024).toFixed(1)} KB) attached. It will be securely archived in Patient Documents and linked to order ${order.lab_ref || ""}.`
      );
      return;
    }

    if (fname.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseJsonResults(text);
        if (rows.length === 0) {
          alert("Could not parse JSON. Ensure it contains an array of analyte objects with 'parameter' and 'value'.");
          return;
        }
        handleApplyImportedRows(rows);
      };
      reader.readAsText(file);
      return;
    }

    // Default: CSV / TXT
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsvResults(text);
      if (rows.length === 0) {
        alert("Could not find any readable rows in the uploaded CSV. Please check formatting or download the sample template.");
        return;
      }
      handleApplyImportedRows(rows);
    };
    reader.readAsText(file);
  };

  // Completed tests count
  const completedTestCount = useMemo(() => {
    let count = 0;
    Object.entries(analyteState).forEach(([_, items]) => {
      if (items.length > 0 && items.some((x) => x.result.trim() !== "")) {
        count++;
      }
    });
    return count;
  }, [analyteState]);

  // Genuine Save & Upload results
  const handleSaveAll = async (forceStatus?: string) => {
    setIsSaving(true);
    try {
      const payloadValues: any[] = [];
      let totalTestsWithResults = 0;

      Object.entries(analyteState).forEach(([tName, items]) => {
        let hasAny = false;
        items.forEach((item) => {
          if (item.result.trim() !== "") {
            hasAny = true;
            payloadValues.push({
              test_name: tName,
              parameter: item.name,
              value: item.result.trim(),
              unit: item.unit || "",
              reference_range:
                item.minRef !== undefined && item.maxRef !== undefined
                  ? `Min ${item.minRef} - Max ${item.maxRef}`
                  : item.textRef || "",
              interpretation: item.interpretation || "Normal",
              comments: item.comments || "",
            });
          }
        });
        if (hasAny) totalTestsWithResults++;
      });

      if (payloadValues.length === 0) {
        alert("Please upload a laboratory result file or enter at least one parameter result before saving.");
        setIsSaving(false);
        return;
      }

      let nextStatus = forceStatus || "Completed";
      if (!forceStatus) {
        if (totalTestsWithResults === testNames.length && testNames.length > 0) {
          nextStatus = "Completed";
        } else if (totalTestsWithResults > 0) {
          nextStatus = "Partial";
        }
      }

      // 1. Post structured results to backend
      await api(`/orders/${order.id}/result`, "POST", {
        version: order.version,
        status: nextStatus,
        result: `Imported results for ${totalTestsWithResults} of ${testNames.length} laboratory test panels.${groupComments ? ` ${groupComments}` : ""}`,
        values: payloadValues,
      });

      // 2. Upload PDF document if attached
      if (uploadedPdfFile) {
        const formData = new FormData();
        formData.append("patient_id", order.patient_id);
        formData.append("title", `Lab Result Report - ${testNames[0] || "Laboratory"}`);
        formData.append("order_id", order.id);
        formData.append("file", uploadedPdfFile);
        await api("/documents", "POST", formData);
      }

      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to import laboratory results.");
      setIsSaving(false);
    }
  };

  const labName = getOrderLabName(order) || "Diagnostic Laboratory";

  return (
    <div style={{ position: "relative" }}>
      {isSaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.8)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600 }}>
            Importing and persisting laboratory results...
          </span>
        </div>
      )}

      {/* Top Header Bar matching CharmHealth reference Frame 12 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>
          Import Lab Result
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => handleSaveAll("Completed")}
            disabled={isSaving}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 20px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 16px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Order Context Bar matching CharmHealth Frame 12 */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          padding: "12px 18px",
          marginBottom: "16px",
          fontSize: "0.85rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Left: Clinician, Date, Lab */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
              <div>
                <span style={{ color: "#64748b" }}>Ordered By : </span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{clinician}</span>
              </div>
              <div>
                <span style={{ color: "#64748b" }}>Ordered On : </span>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>{order.ordered_date || "11-Nov-2026"}</span>
              </div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Lab Name : </span>
              <span style={{ color: "#0f172a", fontWeight: 600 }}>{labName}</span>
            </div>
          </div>

          {/* Right: Tests count, Specimen details link, Result Date Time */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ color: "#64748b" }}>
                No of Tests : <strong style={{ color: "#0f172a" }}>{testNames.length}</strong>
              </span>
              <span style={{ color: "#64748b" }}>
                Completed : <strong style={{ color: "#0f172a" }}>{completedTestCount}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Specimen Details
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#64748b" }}>Result Date Time</span>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                <input
                  type="text"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                  style={{ border: "none", padding: "4px 8px", fontSize: "0.85rem", width: "105px", outline: "none" }}
                />
                <span style={{ padding: "0 6px", color: "#64748b" }}>
                  <Calendar size={14} />
                </span>
              </div>
              <input
                type="text"
                placeholder="hh:mm"
                value={resultTime}
                onChange={(e) => setResultTime(e.target.value)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "0.85rem",
                  width: "70px",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Patient line */}
        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 700 }}>
            Patient
          </span>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>
            {patient ? `${patient.first_name} ${patient.last_name}` : order.patient_name || "Patient"}
          </span>
          <span style={{ color: "#0284c7", fontSize: "0.82rem", fontWeight: 600 }}>
            [{patient?.mrn || order.patient_mrn || "HYN-MR"}]
          </span>
          <span style={{ color: "#94a3b8" }}>·</span>
          <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
            Lab Ref: <strong>{order.lab_ref || "20261104"}</strong>
          </span>
        </div>
      </div>

      {/* DEDICATED FILE IMPORT & UPLOAD CARD */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          padding: "16px 20px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Upload size={18} color="#ea580c" />
            <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>
              Import External Laboratory Results File
            </h3>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "4px",
              border: "1px solid #0284c7",
              background: "#f0f9ff",
              color: "#0284c7",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            Download Sample CSV Template
          </button>
        </div>

        <p style={{ margin: "0 0 12px 0", fontSize: "0.82rem", color: "#64748b" }}>
          Upload instrument data files or laboratory diagnostic reports (<strong>.CSV</strong>, <strong>.JSON</strong>, <strong>.PDF</strong>, or <strong>.TXT</strong>). Analytes will be automatically parsed, matched against the tests ordered for this requisition, and flagged for clinician review.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          style={{
            border: isDragging ? "2px dashed #ea580c" : "2px dashed #cbd5e1",
            borderRadius: "6px",
            background: isDragging ? "#fff7ed" : "#f8fafc",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onClick={() => {
            const input = document.getElementById("charm-import-file-input") as HTMLInputElement;
            if (input) input.click();
          }}
        >
          <input
            id="charm-import-file-input"
            type="file"
            accept=".csv,.json,.pdf,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <Upload size={28} color="#94a3b8" style={{ marginBottom: "6px" }} />
          <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
            Click to browse or drag and drop laboratory result file
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>
            Supports CSV analyzer spreadsheets, JSON laboratory feeds, and PDF diagnostic reports
          </div>
        </div>

        {/* Uploaded File Chip & Validation Notification */}
        {uploadedFile && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "4px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534" }}>
                  {uploadedFile.name}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "8px" }}>
                  ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadedFile(null);
                setUploadedPdfFile(null);
                setImportNotice(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                fontSize: "0.82rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Remove
            </button>
          </div>
        )}

        {importNotice && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "0.82rem",
              color: "#166534",
              fontWeight: 500,
            }}
          >
            {importNotice}
          </div>
        )}
      </div>

      {/* ANALYTE RESULTS PREVIEW AND CONFIRMATION TABLES */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {testNames.map((tName) => {
          const items = analyteState[tName] || [];
          const isCollapsed = !!collapsedCards[tName];

          return (
            <div
              key={tName}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  background: "#f8fafc",
                  borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setCollapsedCards((prev) => ({ ...prev, [tName]: !prev[tName] }))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#64748b" }}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    {tName}
                  </span>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {items.length} Analytes
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem" }}>
                    <span style={{ color: "#64748b" }}>Specimen:</span>
                    <select
                      value={specimenSource}
                      onChange={(e) => setSpecimenSource(e.target.value)}
                      style={{
                        padding: "3px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.82rem",
                        background: "#fff",
                      }}
                    >
                      <option value="Blood (Serum)">Blood (Serum)</option>
                      <option value="Whole Blood">Whole Blood</option>
                      <option value="Plasma">Plasma</option>
                      <option value="Urine">Urine</option>
                      <option value="Saliva">Saliva</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              {!isCollapsed && (
                <div style={{ padding: "14px 16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", color: "#64748b" }}>
                        <th style={{ padding: "6px 8px", width: "22%" }}>Name</th>
                        <th style={{ padding: "6px 8px", width: "14%" }}>Result</th>
                        <th style={{ padding: "6px 8px", width: "10%" }}>Unit</th>
                        <th style={{ padding: "6px 8px", width: "18%" }}>Reference</th>
                        <th style={{ padding: "6px 8px", width: "14%" }}>Interpretation</th>
                        <th style={{ padding: "6px 8px", width: "18%" }}>Comments</th>
                        <th style={{ padding: "6px 8px", width: "4%", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const isAbnormal = ["low", "high", "abnormal"].includes(item.interpretation.toLowerCase());
                        const refDisplay =
                          item.textRef ||
                          (item.minRef !== undefined && item.maxRef !== undefined
                            ? `${item.minRef} - ${item.maxRef}`
                            : "-");

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleParamNameChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  background: "transparent",
                                  fontWeight: 600,
                                  color: "#0f172a",
                                  fontSize: "0.85rem",
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={item.result}
                                onChange={(e) => handleResultChange(tName, idx, e.target.value)}
                                placeholder="Value..."
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  fontSize: "0.85rem",
                                  fontWeight: isAbnormal ? 700 : 500,
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => handleParamUnitChange(tName, idx, e.target.value)}
                                placeholder="Unit"
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.85rem",
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px 8px", color: "#64748b" }}>
                              <span style={{ fontSize: "0.82rem" }}>{refDisplay}</span>
                            </td>
                            <td style={{ padding: "8px 8px" }}>
                              <select
                                value={item.interpretation}
                                onChange={(e) => handleInterpretationChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.85rem",
                                  fontWeight: isAbnormal ? 700 : 500,
                                  color: isAbnormal ? "#dc2626" : item.interpretation === "Normal" ? "#16a34a" : "#334155",
                                }}
                              >
                                <option value="-">-</option>
                                <option value="Normal">Normal</option>
                                <option value="Low">Low</option>
                                <option value="High">High</option>
                                <option value="Abnormal">Abnormal</option>
                              </select>
                            </td>
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={item.comments}
                                onChange={(e) => handleCommentsChange(tName, idx, e.target.value)}
                                placeholder="Comment..."
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.85rem",
                                }}
                              />
                            </td>
                            <td style={{ padding: "8px 8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveParameter(tName, idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#94a3b8",
                                  cursor: "pointer",
                                  padding: "2px",
                                }}
                                title="Remove parameter"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <button
                    type="button"
                    onClick={() => handleAddParameter(tName)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0284c7",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "8px 0 0 0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Plus size={14} />
                    Additional Parameter
                  </button>

                  <div style={{ marginTop: "12px" }}>
                    <textarea
                      rows={1}
                      value={panelComments[tName] || ""}
                      onChange={(e) => setPanelComments((prev) => ({ ...prev, [tName]: e.target.value }))}
                      placeholder={`Notes for ${tName}...`}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Group Comments */}
      <div style={{ marginTop: "18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "14px 18px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
          Overall Clinical / Laboratory Assessment Comments
        </label>
        <textarea
          rows={3}
          value={groupComments}
          onChange={(e) => setGroupComments(e.target.value)}
          placeholder="Overall laboratory assessment comments..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #cbd5e1",
            fontSize: "0.85rem",
            resize: "vertical",
          }}
        />
      </div>

      {/* Bottom Actions Bar */}
      <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: "#ffffff",
            color: "#334155",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 18px",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSaveAll("Partial")}
          disabled={isSaving}
          style={{
            backgroundColor: "#f1f5f9",
            color: "#334155",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 18px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Import as Partial
        </button>
        <button
          type="button"
          onClick={() => handleSaveAll("Completed")}
          disabled={isSaving}
          style={{
            backgroundColor: "#ea580c",
            color: "#ffffff",
            border: "none",
            borderRadius: "4px",
            padding: "8px 24px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Import & Complete Order
        </button>
      </div>

      {/* Specimen Details Modal */}
      {specimenModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "6px",
              width: "500px",
              maxWidth: "92vw",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>
                Specimen Collection Details
              </h3>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#334155", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div><strong>Requisition:</strong> {order.lab_ref || "20261104"}</div>
              <div><strong>Patient:</strong> {patient ? `${patient.first_name} ${patient.last_name}` : order.patient_name}</div>
              <div><strong>Specimen Type:</strong> {specimenSource}</div>
              <div><strong>Collection Site:</strong> Left antecubital fossa</div>
              <div><strong>Container:</strong> Gold Top (SST gel separator)</div>
              <div><strong>Volume:</strong> 5 mL</div>
              <div><strong>Fasting Status:</strong> Overnight 12h fasting confirmed</div>
            </div>
            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSpecimenModalOpen(false)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SCREEN: EDIT LAB RESULT (AUTHENTIC CHARMHEALTH PARITY - RESULTS TAB)
// ==========================================
function EditLabResultScreen({
  order,
  labCatalogs,
  onCancel,
  onSaved,
}: {
  order: Row;
  labCatalogs: Row[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, notify } = useApp();
  const [resultDate, setResultDate] = useState("Nov 06, 2026");
  const [resultTime, setResultTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [specimenSource, setSpecimenSource] = useState("Blood (Serum)");
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null);
  const [panelComments, setPanelComments] = useState<Record<string, string>>({});
  const [groupComments, setGroupComments] = useState("");

  // Robust test names extraction - never returns empty
  const [testNames, setTestNames] = useState<string[]>(() => {
    if (order.order_metadata) {
      try {
        const meta = JSON.parse(order.order_metadata);
        if (Array.isArray(meta.tests) && meta.tests.length > 0) return meta.tests;
        if (meta.template_name) {
          if (meta.template_name.includes(" & ")) return meta.template_name.split(" & ").map((s: string) => s.trim());
          if (meta.template_name.includes(" · ")) return [meta.template_name.split(" · ")[1].trim()];
          return [meta.template_name];
        }
      } catch { }
    }
    if (order.name) {
      if (order.name.includes(" · ")) {
        const afterDot = order.name.split(" · ")[1].trim().replace(/\s*\(\+\d+\s*tests?\)/i, "");
        return [afterDot];
      }
      if (order.name.includes(" & ")) {
        return order.name.split(" & ").map((s: string) => s.trim());
      }
      return [order.name];
    }
    return ["HUH - Routine Diagnostic Evaluation"];
  });

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [analyteState, setAnalyteState] = useState<Record<string, AnalyteItem[]>>({});

  // Initialize analyte state from existing values or auto-populated clinical parameters
  useEffect(() => {
    const existingValues: any[] = order.values || [];
    const initial: Record<string, AnalyteItem[]> = {};

    testNames.forEach((tName: string) => {
      const defaultItems = getTestAnalytes(tName, labCatalogs);
      initial[tName] = defaultItems.map((item) => {
        const exist = existingValues.find(
          (v) => v.parameter?.toLowerCase() === item.name.toLowerCase() && (!v.test_name || v.test_name === tName)
        );
        return {
          ...item,
          result: exist?.value || "",
          interpretation: exist?.interpretation || item.interpretation || "-",
          comments: exist?.comments || "",
        };
      });
    });

    setAnalyteState(initial);
  }, [order, testNames, labCatalogs]);

  // Handle Result input change with live auto-interpretation & red border on abnormal
  const handleResultChange = (tName: string, idx: number, val: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const target = { ...items[idx], result: val };

      if (val.trim() === "") {
        target.interpretation = "-";
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (target.minRef !== undefined && num < target.minRef) {
            target.interpretation = "Low";
          } else if (target.maxRef !== undefined && num > target.maxRef) {
            target.interpretation = "High";
          } else if (target.minRef !== undefined || target.maxRef !== undefined) {
            target.interpretation = "Normal";
          }
        }
      }

      items[idx] = target;
      return { ...prev, [tName]: items };
    });
  };

  const handleInterpretationChange = (tName: string, idx: number, interp: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], interpretation: interp };
      return { ...prev, [tName]: items };
    });
  };

  const handleCommentsChange = (tName: string, idx: number, comm: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], comments: comm };
      return { ...prev, [tName]: items };
    });
  };

  // Add custom parameter row (+ Additional Parameter)
  const handleAddParameter = (tName: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const newItem: AnalyteItem = {
        name: `Additional Param ${items.length + 1}`,
        result: "",
        unit: "",
        minRef: undefined,
        maxRef: undefined,
        textRef: "",
        interpretation: "-",
        comments: "",
      };
      return { ...prev, [tName]: [...items, newItem] };
    });
  };

  const handleParamNameChange = (tName: string, idx: number, name: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], name };
      return { ...prev, [tName]: items };
    });
  };

  const handleParamUnitChange = (tName: string, idx: number, unit: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], unit };
      return { ...prev, [tName]: items };
    });
  };

  // Remove panel from order
  const handleRemoveTest = (tName: string) => {
    if (testNames.length <= 1) {
      alert("At least one test panel is required.");
      return;
    }
    setTestNames((prev) => prev.filter((t) => t !== tName));
  };

  // Calculate completed tests count
  const completedTestCount = useMemo(() => {
    let count = 0;
    Object.entries(analyteState).forEach(([_, items]) => {
      if (items.length > 0 && items.every((x) => x.result.trim() !== "")) {
        count++;
      }
    });
    return count;
  }, [analyteState]);

  // Genuine Save & Upload results
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payloadValues: any[] = [];
      let totalTestsWithResults = 0;

      Object.entries(analyteState).forEach(([tName, items]) => {
        let hasAny = false;
        items.forEach((item) => {
          if (item.result.trim() !== "") {
            hasAny = true;
            payloadValues.push({
              test_name: tName,
              parameter: item.name,
              value: item.result.trim(),
              unit: item.unit || "",
              reference_range:
                item.minRef !== undefined && item.maxRef !== undefined
                  ? `Min ${item.minRef} - Max ${item.maxRef}`
                  : item.textRef || "",
              interpretation: item.interpretation,
              comments: item.comments || "",
            });
          }
        });
        if (hasAny) totalTestsWithResults++;
      });

      let nextStatus = "Pending";
      if (totalTestsWithResults === testNames.length && testNames.length > 0) {
        nextStatus = "Completed";
      } else if (totalTestsWithResults > 0) {
        nextStatus = "Partial";
      }

      // 1. Post structured results to backend
      await api(`/orders/${order.id}/result`, "POST", {
        version: order.version,
        status: nextStatus,
        result: `Entered results for ${totalTestsWithResults} of ${testNames.length} laboratory test panels.${groupComments ? ` ${groupComments}` : ""}`,
        values: payloadValues,
      });

      // 2. Upload PDF document if selected
      if (uploadedPdfFile) {
        const formData = new FormData();
        formData.append("patient_id", order.patient_id);
        formData.append("title", `Lab Result Report - ${testNames[0] || "Laboratory"}`);
        formData.append("order_id", order.id);
        formData.append("file", uploadedPdfFile);
        await api("/documents", "POST", formData);
      }

      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save results.");
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {isSaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Saving laboratory results...</span>
        </div>
      )}

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>Edit Lab Result</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 18px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Update
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Top Fields Grid (matching CharmHealth Frame 14) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: "14px", columnGap: "16px", alignItems: "center", fontSize: "0.88rem" }}>
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Lab Name</div>
          <div>
            <strong style={{ color: "#0f172a" }}>
              {order.name.includes(" · ") ? order.name.split(" · ")[0] : "HUH Lab Tests"}
            </strong>
          </div>

          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>
            Tests <span style={{ color: "#dc2626" }}>*</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {testNames.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontSize: "0.82rem",
                  color: "#334155",
                }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => handleRemoveTest(t)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
                  title="Remove test"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Import PDF</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: "0.82rem",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Choose File
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadedPdfFile(file);
                    notify(`Selected laboratory document "${file.name}"`);
                  }
                }}
              />
            </label>
            <span style={{ fontSize: "0.82rem", color: uploadedPdfFile ? "#16a34a" : "#64748b", fontWeight: uploadedPdfFile ? 600 : 400 }}>
              {uploadedPdfFile ? `${uploadedPdfFile.name} (Attached ✓)` : "No files selected"}
            </span>
          </div>

          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Specimen Source</div>
          <div>
            <input
              type="text"
              value={specimenSource}
              onChange={(e) => setSpecimenSource(e.target.value)}
              placeholder="Enter Specimen Source"
              style={{ width: "320px", padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        {/* Metadata Strip */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", marginTop: "16px", paddingTop: "12px", fontSize: "0.83rem" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            <div><span style={{ color: "#64748b" }}>Ordered By:</span> <strong style={{ color: "#1e293b" }}>{order.ordered_by || user.name}</strong></div>
            <div><span style={{ color: "#64748b" }}>Ordered On:</span> <strong style={{ color: "#1e293b" }}>{order.ordered_date || "Today"}</strong></div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <div><span style={{ color: "#64748b" }}>No of Tests:</span> <strong style={{ color: "#1e293b" }}>{testNames.length}</strong></div>
            <div><span style={{ color: "#64748b" }}>Completed:</span> <strong style={{ color: "#1e293b" }}>{completedTestCount}</strong></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748b" }}>Result Date:</span>
              <input
                type="text"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                style={{ width: "95px", padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: "3px", fontSize: "0.8rem" }}
              />
              <input
                type="text"
                placeholder="hh:mm"
                value={resultTime}
                onChange={(e) => setResultTime(e.target.value)}
                style={{ width: "55px", padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: "3px", fontSize: "0.8rem" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE TEST CARDS (Matching CharmHealth Frame 14, 20, 24) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {testNames.map((tName: string) => {
          const isCollapsed = !!collapsedCards[tName];
          const items = analyteState[tName] || [];
          const isTestComplete = items.length > 0 && items.every((x) => x.result.trim() !== "");

          return (
            <div
              key={tName}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{tName}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isTestComplete ? "#16a34a" : "#ea580c",
                    }}
                  >
                    [ {isTestComplete ? "Completed" : "Pending"} ]
                  </span>
                  <button
                    type="button"
                    onClick={() => setCollapsedCards((prev) => ({ ...prev, [tName]: !prev[tName] }))}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {/* Card Subheader & Table */}
              {!isCollapsed && (
                <div style={{ padding: "14px" }}>
                  {/* Analyte Parameter Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Name</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "14%" }}>Result</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "10%" }}>Unit</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Reference</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "16%" }}>Interpretation</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "16%" }}>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((analyte, idx) => {
                        const isAbnormal = ["Low", "High", "Abnormal"].includes(analyte.interpretation);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                            {/* Name */}
                            <td style={{ padding: "8px 8px", color: "#1e293b", fontWeight: 500 }}>
                              <input
                                type="text"
                                value={analyte.name}
                                onChange={(e) => handleParamNameChange(tName, idx, e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", border: "none", background: "transparent", fontWeight: 600, color: "#0f172a", outline: "none" }}
                              />
                            </td>

                            {/* Result Input (turns RED BORDER on Low/High) */}
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={analyte.result}
                                onChange={(e) => handleResultChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.85rem",
                                  outline: "none",
                                }}
                              />
                            </td>

                            {/* Unit */}
                            <td style={{ padding: "8px 8px", color: "#64748b" }}>
                              <input
                                type="text"
                                value={analyte.unit}
                                onChange={(e) => handleParamUnitChange(tName, idx, e.target.value)}
                                style={{ width: "100%", padding: "3px 4px", border: "none", background: "transparent", color: "#64748b", outline: "none", fontSize: "0.82rem" }}
                              />
                            </td>

                            {/* Reference: Min/Max or Text with Range/Custom link */}
                            <td style={{ padding: "8px 8px" }}>
                              {analyte.minRef !== undefined || analyte.maxRef !== undefined ? (
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Min</span>
                                      <input
                                        type="text"
                                        readOnly
                                        value={analyte.minRef ?? ""}
                                        style={{
                                          width: "48px",
                                          padding: "3px 4px",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "3px",
                                          fontSize: "0.8rem",
                                          background: "#f8fafc",
                                          color: "#334155",
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Max</span>
                                      <input
                                        type="text"
                                        readOnly
                                        value={analyte.maxRef ?? ""}
                                        style={{
                                          width: "52px",
                                          padding: "3px 4px",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "3px",
                                          fontSize: "0.8rem",
                                          background: "#f8fafc",
                                          color: "#334155",
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: "2px", cursor: "pointer" }}>Custom</div>
                                </div>
                              ) : (
                                <div>
                                  <textarea
                                    readOnly
                                    rows={1}
                                    value={analyte.textRef || ""}
                                    style={{
                                      width: "100%",
                                      padding: "3px 6px",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "3px",
                                      fontSize: "0.78rem",
                                      background: "#f8fafc",
                                      color: "#334155",
                                      resize: "none",
                                    }}
                                  />
                                  <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: "2px", cursor: "pointer" }}>Range</div>
                                </div>
                              )}
                            </td>

                            {/* Param Interpretation Dropdown (turns RED BORDER on Low/High!) */}
                            <td style={{ padding: "8px 8px" }}>
                              <select
                                value={analyte.interpretation}
                                onChange={(e) => handleInterpretationChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 6px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.82rem",
                                  outline: "none",
                                }}
                              >
                                <option value="-">-</option>
                                <option value="Normal">Normal</option>
                                <option value="Low">Low</option>
                                <option value="High">High</option>
                                <option value="Abnormal">Abnormal</option>
                              </select>
                            </td>

                            {/* Comments */}
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={analyte.comments}
                                onChange={(e) => handleCommentsChange(tName, idx, e.target.value)}
                                placeholder=""
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.8rem",
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* + Additional Parameter */}
                  <div style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => handleAddParameter(tName)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0284c7",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      + Additional Parameter
                    </button>
                  </div>

                  {/* Panel Comments */}
                  <div style={{ marginTop: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      Comments
                    </label>
                    <textarea
                      rows={2}
                      value={panelComments[tName] || ""}
                      onChange={(e) => setPanelComments({ ...panelComments, [tName]: e.target.value })}
                      placeholder="Notes specific to this test panel..."
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Group Comments */}
      <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "16px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
          Group Comments
        </label>
        <textarea
          rows={3}
          value={groupComments}
          onChange={(e) => setGroupComments(e.target.value)}
          placeholder="Overall laboratory assessment comments..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #cbd5e1",
            fontSize: "0.85rem",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}

// ==========================================
// SCREEN: ADD LAB RESULT (AUTHENTIC CHARMHEALTH FRAME 42 / 50 PARITY)
// ==========================================
function AddLabResultScreen({
  patientId,
  labCatalogs,
  onCancel,
  onSaved,
}: {
  patientId?: string;
  labCatalogs: Row[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user, staff, patients, notify } = useApp();
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || patients[0]?.id || "");
  const [reviewerId, setReviewerId] = useState<string>(user.id);
  const [dateTime, setDateTime] = useState<string>("Nov 16, 2026");
  const [timeVal, setTimeVal] = useState<string>("");
  const [selectedLabName, setSelectedLabName] = useState<string>("HUH Lab Tests");
  const [selectedTests, setSelectedTests] = useState<string[]>(["HUH-Iron Profile Test", "HUH - Complete Hemogram"]);
  const [specimenSource, setSpecimenSource] = useState<string>("Blood (Serum)");
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("Routine");
  const [testSearchInput, setTestSearchInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [panelComments, setPanelComments] = useState<Record<string, string>>({});
  const [groupComments, setGroupComments] = useState<string>("");
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // 17+ Lab categories (matching CharmHealth Frame 42 & 46)
  const labCategories = useMemo(() => [
    "--Select--",
    "BioChemistry",
    "Clinical Pathology",
    "Endocrinology",
    "Haematology",
    "HUH Blood Group",
    "HUH Lab Tests",
    "HUH-Cardio Diabetic",
    "HUH-CD-Cardiac Risk Markers",
    "HUH-CD-Diabetic",
    "HUH-CD-Diabetic Routine",
    "HUH-CD-Electrolyte",
    "HUH-CD-Free Thyroid Function",
    "HUH-CD-Gout Marker",
    "HUH-CD-Haematolgy",
    "HUH-CD-Iron Deficiency Profile",
    "HUH-CD-Lipid Profile",
    "HUH-CD-Liver Function Test",
    "HUH-CD-Mineral Screen",
    "HUH-CD-Pancreas Profile",
    "HUH-CD-Renal Function Test",
    "HUH-CD-Renal Microvascular Function Test",
    "HUH-CD-Urine Routine",
  ], []);

  // Analyte parameters state
  const [analyteState, setAnalyteState] = useState<Record<string, AnalyteItem[]>>({});

  // Initialize analytes whenever selectedTests changes
  useEffect(() => {
    setAnalyteState((prev) => {
      const next: Record<string, AnalyteItem[]> = {};
      selectedTests.forEach((tName) => {
        if (prev[tName]) {
          next[tName] = prev[tName];
        } else {
          next[tName] = getTestAnalytes(tName, labCatalogs);
        }
      });
      return next;
    });
  }, [selectedTests, labCatalogs]);

  const handleRemoveTest = (tName: string) => {
    setSelectedTests((prev) => prev.filter((t) => t !== tName));
  };

  const handleAddTest = (tName: string) => {
    const clean = tName.trim();
    if (!clean || selectedTests.includes(clean)) return;
    setSelectedTests((prev) => [...prev, clean]);
    setTestSearchInput("");
  };

  // Result change & auto-interpretation
  const handleResultChange = (tName: string, idx: number, val: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const target = { ...items[idx], result: val };

      if (val.trim() === "") {
        target.interpretation = "-";
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          if (target.minRef !== undefined && num < target.minRef) {
            target.interpretation = "Low";
          } else if (target.maxRef !== undefined && num > target.maxRef) {
            target.interpretation = "High";
          } else if (target.minRef !== undefined || target.maxRef !== undefined) {
            target.interpretation = "Normal";
          }
        }
      }

      items[idx] = target;
      return { ...prev, [tName]: items };
    });
  };

  const handleInterpretationChange = (tName: string, idx: number, interp: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], interpretation: interp };
      return { ...prev, [tName]: items };
    });
  };

  const handleCommentsChange = (tName: string, idx: number, comm: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], comments: comm };
      return { ...prev, [tName]: items };
    });
  };

  const handleAddParameter = (tName: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      const newItem: AnalyteItem = {
        name: `Additional Param ${items.length + 1}`,
        result: "",
        unit: "",
        minRef: undefined,
        maxRef: undefined,
        textRef: "",
        interpretation: "-",
        comments: "",
      };
      return { ...prev, [tName]: [...items, newItem] };
    });
  };

  const handleParamNameChange = (tName: string, idx: number, name: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], name };
      return { ...prev, [tName]: items };
    });
  };

  const handleParamUnitChange = (tName: string, idx: number, unit: string) => {
    setAnalyteState((prev) => {
      const items = [...(prev[tName] || [])];
      items[idx] = { ...items[idx], unit };
      return { ...prev, [tName]: items };
    });
  };

  // Submit Brand New Lab Result
  const handleSaveResult = async () => {
    const effPid = patientId || selectedPatientId;
    if (!effPid) {
      alert("Please select a patient.");
      return;
    }
    if (selectedTests.length === 0) {
      alert("Please select at least one test panel.");
      return;
    }

    setIsSaving(true);
    try {
      const primaryLab = selectedLabName && selectedLabName !== "--Select--" ? selectedLabName : "HUH Lab Tests";
      const title = `${primaryLab} · ${selectedTests[0]}${selectedTests.length > 1 ? ` (+${selectedTests.length - 1} tests)` : ""}`;

      // 1. Create order
      const newOrder = await api<Row>("/records/orders", "POST", {
        patient_id: effPid,
        kind: "Lab",
        name: title,
        ordered_date: dateTime,
        status: "Completed",
        notes_lab_patient: "",
        notes_intra_office: groupComments,
        instructions: `Specimen Source: ${specimenSource} · Tag: ${selectedTag}`,
        order_metadata: JSON.stringify({
          primary_lab: primaryLab,
          tests: selectedTests,
          specimen: { source: specimenSource, date: dateTime, time: timeVal },
          tag: selectedTag,
        }),
      });

      // 2. Format analytes payload
      const payloadValues: any[] = [];
      Object.entries(analyteState).forEach(([tName, items]) => {
        items.forEach((item) => {
          if (item.result.trim() !== "") {
            payloadValues.push({
              test_name: tName,
              parameter: item.name,
              value: item.result.trim(),
              unit: item.unit || "",
              reference_range:
                item.minRef !== undefined && item.maxRef !== undefined
                  ? `Min ${item.minRef} - Max ${item.maxRef}`
                  : item.textRef || "",
              interpretation: item.interpretation,
              comments: item.comments || "",
            });
          }
        });
      });

      // 3. Post structured results to backend
      if (newOrder?.id && payloadValues.length > 0) {
        await api(`/orders/${newOrder.id}/result`, "POST", {
          version: newOrder.version || 1,
          status: "Completed",
          result: `Entered results for ${selectedTests.length} laboratory test panels.${groupComments ? ` ${groupComments}` : ""}`,
          values: payloadValues,
        });
      }

      // 4. Upload PDF document if attached
      if (newOrder?.id && uploadedPdfFile) {
        const formData = new FormData();
        formData.append("patient_id", effPid);
        formData.append("title", `Lab Result Report - ${selectedTests[0] || "Laboratory"}`);
        formData.append("order_id", newOrder.id);
        formData.append("file", uploadedPdfFile);
        await api("/documents", "POST", formData);
      }

      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to create lab result.");
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {isSaving && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.75)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #cbd5e1",
              borderTopColor: "#ea580c",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Saving laboratory result...</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 600 }}>Add Lab Result</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSaveResult}
            disabled={isSaving}
            style={{
              backgroundColor: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "7px 20px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "7px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Top Form Grid (Matching Frame 42 / 50) */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "20px 24px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: "16px", columnGap: "16px", alignItems: "center", fontSize: "0.88rem" }}>
          {/* Patient */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>
            Patient <span style={{ color: "#dc2626" }}>*</span>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "320px" }}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.mrn})
                </option>
              ))}
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#475569", fontWeight: 500 }}>Reviewer <span style={{ color: "#dc2626" }}>*</span></span>
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "220px" }}
              >
                {staff
                  .filter((s) => ["doctor", "assistant"].includes(s.role))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Time */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Date Time</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff" }}>
              <input
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                style={{ border: "none", padding: "6px 8px", fontSize: "0.85rem", width: "110px", outline: "none" }}
              />
              <span style={{ padding: "0 6px", color: "#64748b" }}>
                <Calendar size={15} />
              </span>
            </div>
            <input
              type="text"
              placeholder="hh:mm"
              value={timeVal}
              onChange={(e) => setTimeVal(e.target.value)}
              style={{ width: "65px", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </div>

          {/* Lab Name */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>
            Lab Name <span style={{ color: "#dc2626" }}>*</span>
          </div>
          <div>
            <select
              value={selectedLabName}
              onChange={(e) => setSelectedLabName(e.target.value)}
              style={{ width: "320px", padding: "6px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              {labCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tests */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>
            Tests <span style={{ color: "#dc2626" }}>*</span>
          </div>
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "6px 10px", minHeight: "42px" }}>
              {selectedTests.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "0.82rem",
                    color: "#334155",
                  }}
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTest(t)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                placeholder={selectedTests.length === 0 ? "Enter test name..." : "Add another test..."}
                value={testSearchInput}
                onChange={(e) => setTestSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTest(testSearchInput);
                  }
                }}
                style={{ border: "none", outline: "none", fontSize: "0.85rem", minWidth: "140px", flex: 1 }}
              />
            </div>
            {/* Quick Suggestions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap", fontSize: "0.75rem", color: "#64748b" }}>
              <span>Quick add:</span>
              {["HUH-Iron Profile Test", "HUH - Complete Hemogram", "HUH - Lipid Profile", "HUH - Renal Function", "HUH - Electrolytes"].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddTest(q)}
                  style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  + {q}
                </button>
              ))}
            </div>
          </div>

          {/* Specimen Source */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Specimen Source</div>
          <div>
            <input
              type="text"
              value={specimenSource}
              onChange={(e) => setSpecimenSource(e.target.value)}
              placeholder="Enter Specimen Source"
              style={{ width: "320px", padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </div>

          {/* Import PDF & Tags */}
          <div style={{ color: "#475569", fontWeight: 500, textAlign: "right" }}>Import PDF</div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: "0.82rem",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                Choose File
                <input
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedPdfFile(file);
                      notify(`Selected laboratory document "${file.name}"`);
                    }
                  }}
                />
              </label>
              <span style={{ fontSize: "0.82rem", color: uploadedPdfFile ? "#16a34a" : "#64748b", fontWeight: uploadedPdfFile ? 600 : 400 }}>
                {uploadedPdfFile ? `${uploadedPdfFile.name} (Attached ✓)` : "No file selected"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#475569", fontWeight: 500 }}>Tags</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", width: "160px" }}
              >
                <option value="Routine">Routine</option>
                <option value="Stat">Stat</option>
                <option value="Fasting">Fasting</option>
                <option value="Pre-op">Pre-op</option>
                <option value="Post-op">Post-op</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* COLLAPSIBLE ANALYTE PANELS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {selectedTests.map((tName: string) => {
          const isCollapsed = !!collapsedCards[tName];
          const items = analyteState[tName] || [];
          const isTestComplete = items.length > 0 && items.every((x) => x.result.trim() !== "");

          return (
            <div
              key={tName}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: isCollapsed ? "none" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{tName}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: isTestComplete ? "#16a34a" : "#ea580c",
                    }}
                  >
                    [ {isTestComplete ? "Completed" : "Pending"} ]
                  </span>
                  <button
                    type="button"
                    onClick={() => setCollapsedCards((prev) => ({ ...prev, [tName]: !prev[tName] }))}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {/* Card Table */}
              {!isCollapsed && (
                <div style={{ padding: "14px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Name</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "14%" }}>Result</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "10%" }}>Unit</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "22%" }}>Reference</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "16%" }}>Interpretation</th>
                        <th style={{ padding: "6px 8px", fontWeight: 600, width: "16%" }}>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((analyte, idx) => {
                        const isAbnormal = ["Low", "High", "Abnormal"].includes(analyte.interpretation);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f8fafc" }}>
                            {/* Name */}
                            <td style={{ padding: "8px 8px", color: "#1e293b", fontWeight: 500 }}>
                              <input
                                type="text"
                                value={analyte.name}
                                onChange={(e) => handleParamNameChange(tName, idx, e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", border: "none", background: "transparent", fontWeight: 600, color: "#0f172a", outline: "none" }}
                              />
                            </td>

                            {/* Result Input (turns RED BORDER on Low/High) */}
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={analyte.result}
                                onChange={(e) => handleResultChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.85rem",
                                  outline: "none",
                                }}
                              />
                            </td>

                            {/* Unit */}
                            <td style={{ padding: "8px 8px", color: "#64748b" }}>
                              <input
                                type="text"
                                value={analyte.unit}
                                onChange={(e) => handleParamUnitChange(tName, idx, e.target.value)}
                                style={{ width: "100%", padding: "3px 4px", border: "none", background: "transparent", color: "#64748b", outline: "none", fontSize: "0.82rem" }}
                              />
                            </td>

                            {/* Reference */}
                            <td style={{ padding: "8px 8px" }}>
                              {analyte.minRef !== undefined || analyte.maxRef !== undefined ? (
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Min</span>
                                      <input
                                        type="text"
                                        readOnly
                                        value={analyte.minRef ?? ""}
                                        style={{
                                          width: "48px",
                                          padding: "3px 4px",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "3px",
                                          fontSize: "0.8rem",
                                          background: "#f8fafc",
                                          color: "#334155",
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Max</span>
                                      <input
                                        type="text"
                                        readOnly
                                        value={analyte.maxRef ?? ""}
                                        style={{
                                          width: "52px",
                                          padding: "3px 4px",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "3px",
                                          fontSize: "0.8rem",
                                          background: "#f8fafc",
                                          color: "#334155",
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: "2px", cursor: "pointer" }}>Custom</div>
                                </div>
                              ) : (
                                <div>
                                  <textarea
                                    readOnly
                                    rows={1}
                                    value={analyte.textRef || ""}
                                    style={{
                                      width: "100%",
                                      padding: "3px 6px",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "3px",
                                      fontSize: "0.78rem",
                                      background: "#f8fafc",
                                      color: "#334155",
                                      resize: "none",
                                    }}
                                  />
                                  <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: "2px", cursor: "pointer" }}>Range</div>
                                </div>
                              )}
                            </td>

                            {/* Interpretation */}
                            <td style={{ padding: "8px 8px" }}>
                              <select
                                value={analyte.interpretation}
                                onChange={(e) => handleInterpretationChange(tName, idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "5px 6px",
                                  borderRadius: "4px",
                                  border: isAbnormal ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                                  backgroundColor: isAbnormal ? "#fff5f5" : "#ffffff",
                                  color: isAbnormal ? "#dc2626" : "#0f172a",
                                  fontWeight: isAbnormal ? 700 : 400,
                                  fontSize: "0.82rem",
                                  outline: "none",
                                }}
                              >
                                <option value="-">-</option>
                                <option value="Normal">Normal</option>
                                <option value="Low">Low</option>
                                <option value="High">High</option>
                                <option value="Abnormal">Abnormal</option>
                              </select>
                            </td>

                            {/* Comments */}
                            <td style={{ padding: "8px 8px" }}>
                              <input
                                type="text"
                                value={analyte.comments}
                                onChange={(e) => handleCommentsChange(tName, idx, e.target.value)}
                                placeholder=""
                                style={{
                                  width: "100%",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.8rem",
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* + Additional Parameter */}
                  <div style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => handleAddParameter(tName)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0284c7",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      + Additional Parameter
                    </button>
                  </div>

                  {/* Panel Comments */}
                  <div style={{ marginTop: "12px" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      Comments
                    </label>
                    <textarea
                      rows={2}
                      value={panelComments[tName] || ""}
                      onChange={(e) => setPanelComments({ ...panelComments, [tName]: e.target.value })}
                      placeholder="Notes specific to this test panel..."
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Group Comments */}
      <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "16px" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
          Group Comments
        </label>
        <textarea
          rows={3}
          value={groupComments}
          onChange={(e) => setGroupComments(e.target.value)}
          placeholder="Overall laboratory assessment comments..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "4px",
            border: "1px solid #cbd5e1",
            fontSize: "0.85rem",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}


// ==========================================
// PRINTABLE REQUISITION VIEW
// ==========================================
function PrintRequisitionView({
  order,
  patientId,
  onClose,
}: {
  order: Row;
  patientId?: string;
  onClose: () => void;
}) {
  const { patients, staff } = useApp();
  const pid = patientId || order.patient_id;
  const patient = patients.find((p) => p.id === pid);

  const tests = useMemo(() => {
    if (order.order_metadata) {
      try {
        const m = JSON.parse(order.order_metadata);
        if (Array.isArray(m.tests)) return m.tests;
      } catch { }
    }
    return [order.name];
  }, [order]);

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            backgroundColor: "#ea580c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Printer size={16} /> Print Requisition
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Back to Orders
        </button>
      </div>

      <div
        id="requisition-printable"
        style={{
          border: "1px solid #000",
          padding: "30px",
          fontFamily: "Arial, sans-serif",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: "14px", marginBottom: "20px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", textTransform: "uppercase" }}>Heal Your Heart Clinic</h1>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>Diagnostic & EECP Center · Tamil Nadu</div>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>Phone: +91 44 2449 0000 · Reg: HYH-CL-TN01</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>LABORATORY REQUISITION</h2>
            <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>
              REF: {order.lab_ref || `00020${order.id.slice(0, 3)}`}
            </div>
            <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Date: {order.ordered_date || "Nov 06, 2026"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", fontSize: "0.9rem" }}>
          <div>
            <div><strong>Patient Name:</strong> {patient?.name || `${patient?.first_name || ""} ${patient?.last_name || ""}`}</div>
            <div><strong>MRN:</strong> {patient?.mrn || "HYN-MR-000001"}</div>
            <div><strong>DOB / Age / Sex:</strong> {patient?.dob || "1968-01-12"} ({patient?.sex || "Male"})</div>
          </div>
          <div>
            <div><strong>Ordering Clinician:</strong> {staff.find((s) => s.id === order.author_id)?.name || "Dr. Ananya Demo"}</div>
            <div><strong>Clinical Priority:</strong> Routine</div>
            <div><strong>Status:</strong> {order.status}</div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "0.95rem", borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "10px" }}>
            ORDERED LABORATORY PANELS ({tests.length})
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "6px" }}>#</th>
                <th style={{ padding: "6px" }}>Panel Name</th>
                <th style={{ padding: "6px" }}>Specimen Required</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((tName: string, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px" }}>{i + 1}</td>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{tName}</td>
                  <td style={{ padding: "6px" }}>Blood (Serum) / EDTA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {order.notes_lab_patient && (
          <div style={{ marginBottom: "24px", fontSize: "0.85rem" }}>
            <strong>Special Instructions / Patient Preparation:</strong>
            <div style={{ border: "1px solid #ddd", padding: "8px", marginTop: "4px", borderRadius: "3px" }}>
              {order.notes_lab_patient}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", fontSize: "0.85rem" }}>
          <div>
            <div>Phlebotomist Signature: _________________________</div>
            <div style={{ marginTop: "4px" }}>Date & Time: ________________________________</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>Clinician Signature: _________________________</div>
            <div style={{ marginTop: "4px" }}>Dr. Ananya Demo, M.D.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
