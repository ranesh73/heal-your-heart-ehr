import React, { useState } from "react";
import { Check, ShieldCheck, Sparkles, AlertCircle, FileText } from "lucide-react";
import { api } from "../../api";

interface DsiRule {
  id: string;
  name: string;
  source: string;
  status: boolean;
  category: "Evidence-Based" | "Predictive";
}

const DEFAULT_DSI_RULES: DsiRule[] = [
  { id: "dsi-1", name: "High-Sensitivity Troponin Elevation Protocol", source: "ACC / AHA Guidelines", status: true, category: "Evidence-Based" },
  { id: "dsi-2", name: "Dual Antiplatelet Therapy (DAPT) Post-Stent Duration Alert", source: "ESC Guidelines", status: true, category: "Evidence-Based" },
  { id: "dsi-3", name: "Statin-Associated Muscle Symptoms & Statin Intolerance Check", source: "National Lipid Association", status: true, category: "Evidence-Based" },
  { id: "dsi-4", name: "EECP Therapy Candidacy for Refractory Angina (CCS Class II-IV)", source: "International EECP Registry (IEPR)", status: true, category: "Evidence-Based" },
  { id: "dsi-5", name: "30-Day Heart Failure Readmission Risk Stratifier", source: "Predictive ML Model (v3.2)", status: true, category: "Predictive" },
  { id: "dsi-6", name: "Contrast-Induced Nephropathy Risk Alert for Pre-CAG Lab", source: "Predictive ML Model (v2.8)", status: true, category: "Predictive" },
];

export function DsiSubpage() {
  const [rules, setRules] = useState<DsiRule[]>(() => {
    const saved = localStorage.getItem("hyh_dsi_rules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DSI_RULES;
  });

  const [activeTab, setActiveTab] = useState<"evidence" | "predictive" | "feedback">("evidence");
  const [savedNotice, setSavedNotice] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, status: !r.status } : r));
      localStorage.setItem("hyh_dsi_rules", JSON.stringify(updated));
      api("/admin/settings/consultation/dsi", "PUT", { rules: updated }).catch(() => {});
      return updated;
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const evidenceRules = rules.filter((r) => r.category === "Evidence-Based");
  const predictiveRules = rules.filter((r) => r.category === "Predictive");

  return (
    <div className="charm-settings-form-container">
      {savedNotice && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Decision Support rules updated and saved automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box mb-4">
        <h2 className="text-[17px] font-bold text-slate-800">
          Decision Support Interventions (DSI)
        </h2>
        <p className="text-[13px] text-slate-600">
          Configure evidence-based guidelines and predictive clinical alerts displayed during patient consultations and encounter note writing.
        </p>

        <div className="flex gap-4 mt-3 border-b border-slate-200">
          <button
            type="button"
            className={`pb-2 text-xs font-bold transition-all border-b-2 ${
              activeTab === "evidence"
                ? "border-[#166eb8] text-[#166eb8]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("evidence")}
          >
            Evidence-Based DSI ({evidenceRules.length})
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-bold transition-all border-b-2 ${
              activeTab === "predictive"
                ? "border-[#166eb8] text-[#166eb8]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("predictive")}
          >
            Predictive DSI ({predictiveRules.length})
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-bold transition-all border-b-2 ${
              activeTab === "feedback"
                ? "border-[#166eb8] text-[#166eb8]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("feedback")}
          >
            Feedback Report
          </button>
        </div>
      </div>

      {activeTab === "feedback" ? (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <FileText size={32} className="mx-auto text-slate-400 mb-2" />
          <h3 className="font-bold text-slate-700 text-sm">No Active DSI Overrides Reported</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Clinician feedback reports regarding alert overrides and guideline dismissals are aggregated weekly.
          </p>
        </div>
      ) : (
        <div className="charm-settings-table-wrapper">
          <table className="charm-settings-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Intervention Name</th>
                <th style={{ width: "35%" }}>Clinical Evidence Source</th>
                <th style={{ width: "20%", textAlign: "center" }}>Active Status</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "evidence" ? evidenceRules : predictiveRules).map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong className="text-slate-800 text-[13px]">{r.name}</strong>
                  </td>
                  <td className="text-slate-600 text-[12.5px]">{r.source}</td>
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleRule(r.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        r.status
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {r.status ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
