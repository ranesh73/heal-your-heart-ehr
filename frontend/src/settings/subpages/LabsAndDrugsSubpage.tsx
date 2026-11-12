import React, { useState } from "react";
import { Plus, Check, Save, Search, FlaskConical, Pill, Trash2, X } from "lucide-react";
import { api } from "../../api";

interface LabsAndDrugsSubpageProps {
  type: "customize-labs" | "manage-supplements-drugs";
}

interface LabItem {
  id: string;
  name: string;
  category: string;
  normalRange: string;
  units: string;
}

interface DrugItem {
  id: string;
  name: string;
  dosage: string;
  active: boolean;
}

const DEFAULT_LABS: LabItem[] = [
  { id: "l1", name: "High-Sensitivity Troponin-I (hs-cTnI)", category: "Cardiac Biomarkers", normalRange: "< 0.04", units: "ng/mL" },
  { id: "l2", name: "NT-proBNP (N-terminal Pro-B-type Natriuretic Peptide)", category: "Heart Failure", normalRange: "< 125", units: "pg/mL" },
  { id: "l3", name: "Lipid Profile - Low Density Lipoprotein (LDL)", category: "Lipid Panel", normalRange: "< 70", units: "mg/dL" },
  { id: "l4", name: "Lipid Profile - High Density Lipoprotein (HDL)", category: "Lipid Panel", normalRange: "> 40", units: "mg/dL" },
  { id: "l5", name: "Lipid Profile - Total Triglycerides", category: "Lipid Panel", normalRange: "< 150", units: "mg/dL" },
  { id: "l6", name: "Glycated Hemoglobin (HbA1c)", category: "Glycemic Control", normalRange: "< 5.7", units: "%" },
  { id: "l7", name: "Serum Creatinine", category: "Renal Function", normalRange: "0.7 - 1.2", units: "mg/dL" },
  { id: "l8", name: "High-Sensitivity C-Reactive Protein (hs-CRP)", category: "Inflammation", normalRange: "< 1.0", units: "mg/L" },
];

const DEFAULT_DRUGS: DrugItem[] = [
  { id: "d1", name: "Aspirin", dosage: "75 mg", active: true },
  { id: "d2", name: "Clopidogrel (Plavix)", dosage: "75 mg", active: true },
  { id: "d3", name: "Atorvastatin (Lipitor)", dosage: "40 mg", active: true },
  { id: "d4", name: "Rosuvastatin (Crestor)", dosage: "20 mg", active: true },
  { id: "d5", name: "Metoprolol Succinate ER", dosage: "50 mg", active: true },
  { id: "d6", name: "Carvedilol", dosage: "12.5 mg", active: true },
  { id: "d7", name: "Ramipril (Altace)", dosage: "5 mg", active: true },
  { id: "d8", name: "Telmisartan", dosage: "40 mg", active: true },
  { id: "d9", name: "Nitroglycerin Controlled Release", dosage: "2.6 mg", active: true },
  { id: "d10", name: "Ivabradine (Corlanor)", dosage: "5 mg", active: true },
  { id: "d11", name: "Ranolazine (Ranexa)", dosage: "500 mg", active: true },
  { id: "d12", name: "Coenzyme Q10 (Ubiquinone)", dosage: "100 mg", active: true },
  { id: "d13", name: "L-Arginine (Nitric Oxide Booster)", dosage: "3000 mg", active: true },
];

export function LabsAndDrugsSubpage({ type }: LabsAndDrugsSubpageProps) {
  const [labs, setLabs] = useState<LabItem[]>(() => {
    const saved = localStorage.getItem("hyh_custom_labs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_LABS;
  });

  const [drugs, setDrugs] = useState<DrugItem[]>(() => {
    const saved = localStorage.getItem("hyh_managed_drugs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DRUGS;
  });

  const [search, setSearch] = useState("");
  const [showLabModal, setShowLabModal] = useState(false);
  const [newLabName, setNewLabName] = useState("");
  const [newLabCategory, setNewLabCategory] = useState("Cardiac Biomarkers");
  const [newLabRange, setNewLabRange] = useState("");
  const [newLabUnits, setNewLabUnits] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToggleDrug = (id: string) => {
    setDrugs((prev) => {
      const updated = prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d));
      localStorage.setItem("hyh_managed_drugs", JSON.stringify(updated));
      api("/admin/settings/rx/manage-supplements-drugs", "PUT", { drugs: updated }).catch(() => {});
      return updated;
    });
  };

  const handleAddLab = async () => {
    if (!newLabName.trim()) return;
    const newLab: LabItem = {
      id: `lab-${Date.now()}`,
      name: newLabName.trim(),
      category: newLabCategory,
      normalRange: newLabRange.trim() || "Normal",
      units: newLabUnits.trim() || "-",
    };
    const updated = [...labs, newLab];
    setLabs(updated);
    localStorage.setItem("hyh_custom_labs", JSON.stringify(updated));
    try {
      await api("/admin/settings/lab-image/customize-labs", "PUT", { labs: updated });
    } catch {}

    setShowLabModal(false);
    setNewLabName("");
    setNewLabRange("");
    setNewLabUnits("");
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleDeleteLab = async (id: string) => {
    if (!confirm("Are you sure you want to remove this lab test?")) return;
    const updated = labs.filter((l) => l.id !== id);
    setLabs(updated);
    localStorage.setItem("hyh_custom_labs", JSON.stringify(updated));
    try {
      await api("/admin/settings/lab-image/customize-labs", "PUT", { labs: updated });
    } catch {}
  };

  const filteredLabs = labs.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDrugs = drugs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (type === "manage-supplements-drugs") {
    return (
      <div className="charm-settings-form-container">
        <div className="charm-form-header-box flex justify-between items-center mb-4">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">
              Manage Supplements and Drugs
            </h2>
            <p className="text-[13px] text-slate-600">
              Enable active medications and cardiovascular supplements available for 1-click clinical prescribing during encounter chart notes.
            </p>
          </div>

          <div className="w-64">
            <input
              type="text"
              placeholder="Search drugs or supplements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="charm-input-text w-full text-xs"
            />
          </div>
        </div>

        <div className="charm-settings-table-wrapper">
          <table className="charm-settings-table">
            <thead>
              <tr>
                <th style={{ width: "8%", textAlign: "center" }}>Active</th>
                <th style={{ width: "45%" }}>Medication / Supplement Name</th>
                <th style={{ width: "25%" }}>Standard Dosage</th>
                <th style={{ width: "22%" }}>Prescribing Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrugs.map((d) => (
                <tr key={d.id}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={d.active}
                      onChange={() => handleToggleDrug(d.id)}
                      className="rounded text-[#166eb8] w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td>
                    <strong className="text-slate-800 text-[13px]">{d.name}</strong>
                  </td>
                  <td className="text-slate-600 text-[12.5px]">{d.dosage}</td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        d.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {d.active ? "Available in Rx Quick Pick" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="charm-settings-form-container">
      {savedNotice && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Lab test catalog updated and saved automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">
            Customize Labs & Tests
          </h2>
          <p className="text-[13px] text-slate-600">
            Configure laboratory tests, reference ranges, and units for diagnostic lab orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search lab tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="charm-input-text w-48 text-xs"
          />

          <button
            type="button"
            className="charm-btn-orange-new"
            onClick={() => setShowLabModal(true)}
          >
            <Plus size={14} />
            <span>+ New Lab</span>
          </button>
        </div>
      </div>

      <div className="charm-settings-table-wrapper">
        <table className="charm-settings-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Test Name</th>
              <th style={{ width: "25%" }}>Diagnostic Category</th>
              <th style={{ width: "20%" }}>Standard Reference Range</th>
              <th style={{ width: "10%" }}>Units</th>
              <th style={{ width: "10%", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLabs.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong className="text-[#166eb8] text-[13px]">{l.name}</strong>
                </td>
                <td className="text-slate-700 text-[12.5px]">{l.category}</td>
                <td className="text-slate-600 text-[12px] font-mono">{l.normalRange}</td>
                <td className="text-slate-600 text-[12px]">{l.units}</td>
                <td className="text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteLab(l.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Lab Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-[15px]">New Lab Test</h3>
              <button
                type="button"
                onClick={() => setShowLabModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Lab Test Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Serum Homocysteine"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="charm-input-text w-full"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Category
                </label>
                <select
                  value={newLabCategory}
                  onChange={(e) => setNewLabCategory(e.target.value)}
                  className="charm-select w-full"
                >
                  <option value="Cardiac Biomarkers">Cardiac Biomarkers</option>
                  <option value="Heart Failure">Heart Failure</option>
                  <option value="Lipid Panel">Lipid Panel</option>
                  <option value="Glycemic Control">Glycemic Control</option>
                  <option value="Renal Function">Renal Function</option>
                  <option value="Inflammation">Inflammation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                    Normal Range
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. < 15"
                    value={newLabRange}
                    onChange={(e) => setNewLabRange(e.target.value)}
                    className="charm-input-text w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                    Units
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. µmol/L"
                    value={newLabUnits}
                    onChange={(e) => setNewLabUnits(e.target.value)}
                    className="charm-input-text w-full"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setShowLabModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="charm-btn-orange-new"
                onClick={handleAddLab}
              >
                <Save size={13} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

