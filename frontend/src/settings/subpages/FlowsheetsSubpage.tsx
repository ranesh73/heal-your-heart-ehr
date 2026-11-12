import React, { useState } from "react";
import { Plus, Check, Save, Activity, Trash2, GripVertical, CheckSquare } from "lucide-react";
import { api } from "../../api";

interface FlowsheetsSubpageProps {
  type: "flowsheets" | "preferences";
}

interface FlowsheetComponent {
  id: string;
  type: "Heading" | "Instructions" | "Vitals" | "Labs" | "Questionnaire" | "Custom Param";
  label: string;
}

interface PreferenceItem {
  id: string;
  label: string;
  checked: boolean;
}

const DEFAULT_FLOWSHEET_COMPONENTS: FlowsheetComponent[] = [
  { id: "c1", type: "Heading", label: "Daily EECP Session Hemodynamics" },
  { id: "c2", type: "Instructions", label: "Record pre-treatment blood pressure and pulse oximetry before applying pneumatic cuffs." },
  { id: "c3", type: "Vitals", label: "Blood Pressure (Pre & Post), Heart Rate, SpO2 %, Augmentation Ratio (D/S)" },
  { id: "c4", type: "Custom Param", label: "EECP Cuff Inflation Pressure (PSI: 240-280 mmHg)" },
  { id: "c5", type: "Custom Param", label: "Treatment Duration (Minutes: 60 mins)" },
];

const DEFAULT_PREFERENCES = [
  { id: "share_goals", label: "Share Treatment Goals with Patient via Portal", checked: true },
  { id: "share_milestones", label: "Share EECP Session Milestones (Hour 1 to Hour 35)", checked: true },
  { id: "share_lifestyle", label: "Share Prescribed Cardiac Lifestyle & Walking Guidelines", checked: true },
  { id: "share_diet", label: "Share Sodium & Saturated Fat Dietary Recommendations", checked: true },
  { id: "log_bp", label: "Allow Patient to self-log Morning & Evening Blood Pressure", checked: true },
  { id: "log_sugar", label: "Allow Patient to log Fasting & Postprandial Blood Glucose", checked: true },
];

export function FlowsheetsSubpage({ type }: FlowsheetsSubpageProps) {
  const [flowsheetName, setFlowsheetName] = useState("EECP Therapy Progress Flowsheet");
  const [components, setComponents] = useState<FlowsheetComponent[]>(() => {
    const saved = localStorage.getItem("hyh_flowsheet_components");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_FLOWSHEET_COMPONENTS;
  });

  const [preferences, setPreferences] = useState<PreferenceItem[]>(() => {
    const saved = localStorage.getItem("hyh_trackers_preferences");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_PREFERENCES;
  });

  const [savedNotice, setSavedNotice] = useState(false);

  const addComponent = (compType: FlowsheetComponent["type"]) => {
    const newComp: FlowsheetComponent = {
      id: `c-${Date.now()}`,
      type: compType,
      label: `New ${compType} Component`,
    };
    setComponents((prev) => [...prev, newComp]);
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c))
    );
  };

  const handleSaveFlowsheet = async () => {
    localStorage.setItem("hyh_flowsheet_components", JSON.stringify(components));
    try {
      await api("/admin/settings/health-trackers/flowsheets", "PUT", {
        name: flowsheetName,
        components,
      });
    } catch {}
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleTogglePref = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, checked: !p.checked } : p))
    );
  };

  const handleSavePreferences = async () => {
    localStorage.setItem("hyh_trackers_preferences", JSON.stringify(preferences));
    try {
      await api("/admin/settings/health-trackers/preferences", "PUT", {
        preferences,
      });
    } catch {}
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  if (type === "preferences") {
    return (
      <div className="charm-settings-form-container">
        {savedNotice && (
          <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
            <Check size={16} />
            <span>Preferences saved and updated automatically!</span>
          </div>
        )}

        <div className="charm-form-header-box flex justify-between items-center mb-4">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">
              Treatment Plan Preferences
            </h2>
            <p className="text-[13px] text-slate-600">
              Choose which sections of the patient&apos;s cardiovascular treatment plan and EECP milestones are automatically shared to the PHR portal.
            </p>
          </div>

          <button
            type="button"
            className="charm-btn-orange-new"
            onClick={handleSavePreferences}
          >
            <Save size={14} />
            <span>Save Preferences</span>
          </button>
        </div>

        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          {preferences.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded hover:border-slate-300 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={p.checked}
                onChange={() => handleTogglePref(p.id)}
                className="rounded text-[#166eb8] w-4 h-4"
              />
              <span className="text-[13.5px] font-medium text-slate-800">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="charm-settings-form-container">
      {savedNotice && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Flowsheet structure saved and updated automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">
            Flowsheets Configuration
          </h2>
          <p className="text-[13px] text-slate-600">
            Design structured longitudinal data tracking sheets for recurring EECP treatment sessions and cardiac vitals.
          </p>
        </div>

        <button
          type="button"
          className="charm-btn-orange-new"
          onClick={handleSaveFlowsheet}
        >
          <Save size={14} />
          <span>Save Flowsheet</span>
        </button>
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
          Flowsheet Name
        </label>
        <input
          type="text"
          value={flowsheetName}
          onChange={(e) => setFlowsheetName(e.target.value)}
          className="charm-input-text w-full max-w-md font-semibold text-slate-800"
        />
      </div>

      {/* Available Components Strip (Matching recording) */}
      <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-2">
          Add Components to Flowsheet
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              "Heading",
              "Instructions",
              "Vitals",
              "Labs",
              "Questionnaire",
              "Custom Param",
            ] as const
          ).map((cType) => (
            <button
              key={cType}
              type="button"
              onClick={() => addComponent(cType)}
              className="px-3 py-1.5 bg-white text-[#166eb8] hover:bg-blue-50 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={13} />
              <span>{cType}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Component List */}
      <div className="space-y-2">
        {components.map((comp, idx) => (
          <div
            key={comp.id}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm"
          >
            <GripVertical size={16} className="text-slate-400" />
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-[#166eb8] uppercase w-24 text-center">
              {comp.type}
            </span>
            <input
              type="text"
              value={comp.label}
              onChange={(e) => updateLabel(comp.id, e.target.value)}
              className="charm-input-text flex-1 text-sm font-medium"
            />
            <button
              type="button"
              onClick={() => removeComponent(comp.id)}
              className="text-slate-400 hover:text-red-600 p-1"
              title="Remove component"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
