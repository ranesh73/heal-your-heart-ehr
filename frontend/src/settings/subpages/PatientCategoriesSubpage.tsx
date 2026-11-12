import React, { useState, useEffect } from "react";
import { Plus, Check, Edit2, Trash2, X, Save } from "lucide-react";
import { api } from "../../api";

interface PatientCategoriesSubpageProps {
  type: "categories" | "referral-source";
}

interface CategoryItem {
  id: string;
  name: string;
  count: number;
  description: string;
}

interface ReferralSourceItem {
  id: string;
  name: string;
  type: string;
  contact: string;
  status: string;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat-1", name: "Angina", count: 2621, description: "Chronic stable angina pectoris under active EECP treatment protocol" },
  { id: "cat-2", name: "Heart Failure", count: 989, description: "Ischemic & non-ischemic cardiomyopathy with reduced ejection fraction (HFrEF)" },
  { id: "cat-3", name: "Risk Factor Modification", count: 389, description: "Hypertension, dyslipidemia, metabolic syndrome & diabetes mellitus" },
  { id: "cat-4", name: "Wellness", count: 534, description: "Preventive cardiology, athletic vascular conditioning & lifestyle care" },
  { id: "cat-5", name: "International", count: 56, description: "Medical travel, NRI patients & overseas cardiac care coordination" },
];

const DEFAULT_REFERRAL_SOURCES: ReferralSourceItem[] = [
  { id: "ref-1", name: "Balamurugan", type: "Internal Specialist", contact: "+91 94440 23456", status: "Active" },
  { id: "ref-2", name: "Apollo Specialty Hospitals - Dr. Sundar", type: "External Cardiologist", contact: "+91 44 2829 0200", status: "Active" },
  { id: "ref-3", name: "Fortis Malar - Cardiac Unit", type: "Hospital Referral", contact: "+91 44 4289 2222", status: "Active" },
  { id: "ref-4", name: "Patient Word of Mouth / Alumni", type: "Organic", contact: "N/A", status: "Active" },
];

export function PatientCategoriesSubpage({ type }: PatientCategoriesSubpageProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem("hyh_patient_categories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CATEGORIES;
  });

  const [referralSources, setReferralSources] = useState<ReferralSourceItem[]>(() => {
    const saved = localStorage.getItem("hyh_patient_referral_sources");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_REFERRAL_SOURCES;
  });

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [typeInput, setTypeInput] = useState("Specialist");
  const [savedNotice, setSavedNotice] = useState(false);

  // Load from backend
  useEffect(() => {
    if (type === "categories") {
      api<any>("/settings/patient/categories")
        .then((res) => {
          if (res && res.data && Array.isArray(res.data.items)) {
            setCategories(res.data.items);
            localStorage.setItem("hyh_patient_categories", JSON.stringify(res.data.items));
          }
        })
        .catch(() => {});
    } else {
      api<any>("/settings/patient/referral-source")
        .then((res) => {
          if (res && res.data && Array.isArray(res.data.items)) {
            setReferralSources(res.data.items);
            localStorage.setItem("hyh_patient_referral_sources", JSON.stringify(res.data.items));
          }
        })
        .catch(() => {});
    }
  }, [type]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNameInput("");
    setDescInput("");
    setTypeInput("Specialist");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) return;

    if (type === "categories") {
      let updated: CategoryItem[];
      if (editingItem) {
        updated = categories.map((c) =>
          c.id === editingItem.id ? { ...c, name: nameInput, description: descInput } : c
        );
      } else {
        const newItem: CategoryItem = {
          id: `cat-${Date.now()}`,
          name: nameInput.trim(),
          count: 0,
          description: descInput.trim(),
        };
        updated = [...categories, newItem];
      }
      setCategories(updated);
      localStorage.setItem("hyh_patient_categories", JSON.stringify(updated));
      try {
        await api("/admin/settings/patient/categories", "PUT", { items: updated });
      } catch {}
    } else {
      let updated: ReferralSourceItem[];
      if (editingItem) {
        updated = referralSources.map((r) =>
          r.id === editingItem.id
            ? { ...r, name: nameInput, type: typeInput, contact: descInput }
            : r
        );
      } else {
        const newItem: ReferralSourceItem = {
          id: `ref-${Date.now()}`,
          name: nameInput.trim(),
          type: typeInput,
          contact: descInput.trim() || "+91 90000 00000",
          status: "Active",
        };
        updated = [...referralSources, newItem];
      }
      setReferralSources(updated);
      localStorage.setItem("hyh_patient_referral_sources", JSON.stringify(updated));
      try {
        await api("/admin/settings/patient/referral-source", "PUT", { items: updated });
      } catch {}
    }

    setShowModal(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this item?")) return;
    if (type === "categories") {
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      localStorage.setItem("hyh_patient_categories", JSON.stringify(updated));
      try {
        await api("/admin/settings/patient/categories", "PUT", { items: updated });
      } catch {}
    } else {
      const updated = referralSources.filter((r) => r.id !== id);
      setReferralSources(updated);
      localStorage.setItem("hyh_patient_referral_sources", JSON.stringify(updated));
      try {
        await api("/admin/settings/patient/referral-source", "PUT", { items: updated });
      } catch {}
    }
  };

  return (
    <div className="charm-settings-form-container">
      {savedNotice && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-sm flex items-center gap-2">
          <Check size={16} />
          <span>Saved and updated automatically!</span>
        </div>
      )}

      <div className="charm-form-header-box flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800">
            {type === "categories" ? "Patient Categories" : "Specific Referral Source"}
          </h2>
          <p className="text-[13px] text-slate-600">
            {type === "categories"
              ? "Segment cardiac patients into clinical risk and therapy categories for tailored care protocols."
              : "Manage physicians, hospitals, and partner channels referring cardiac patients for EECP treatment."}
          </p>
        </div>

        <button
          type="button"
          className="charm-btn-orange-new"
          onClick={handleOpenAdd}
        >
          <Plus size={14} />
          <span>{type === "categories" ? "+ New Category" : "+ New Specific Source"}</span>
        </button>
      </div>

      <div className="charm-settings-table-wrapper">
        <table className="charm-settings-table">
          <thead>
            {type === "categories" ? (
              <tr>
                <th style={{ width: "25%" }}>Category Name</th>
                <th style={{ width: "15%", textAlign: "center" }}>Active Patients</th>
                <th style={{ width: "45%" }}>Clinical Description</th>
                <th style={{ width: "15%", textAlign: "center" }}>Actions</th>
              </tr>
            ) : (
              <tr>
                <th style={{ width: "30%" }}>Source Name</th>
                <th style={{ width: "25%" }}>Source Type</th>
                <th style={{ width: "20%" }}>Contact Info</th>
                <th style={{ width: "10%", textAlign: "center" }}>Status</th>
                <th style={{ width: "15%", textAlign: "center" }}>Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {type === "categories"
              ? categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong className="text-[#166eb8] text-[13px]">{c.name}</strong>
                    </td>
                    <td className="text-center font-bold text-slate-700">
                      <span className="px-2 py-0.5 bg-blue-50 text-[#166eb8] rounded border border-blue-200">
                        {c.count.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-slate-600 text-[12.5px]">{c.description}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          className="text-[#166eb8] hover:underline text-xs"
                          onClick={() => {
                            setEditingItem(c);
                            setNameInput(c.name);
                            setDescInput(c.description);
                            setShowModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline text-xs"
                          onClick={() => handleDelete(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : referralSources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong className="text-[#166eb8] text-[13px]">{r.name}</strong>
                    </td>
                    <td className="text-slate-700 text-[12.5px]">{r.type}</td>
                    <td className="text-slate-600 text-[12px]">{r.contact}</td>
                    <td className="text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          className="text-[#166eb8] hover:underline text-xs"
                          onClick={() => {
                            setEditingItem(r);
                            setNameInput(r.name);
                            setTypeInput(r.type);
                            setDescInput(r.contact);
                            setShowModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-600 hover:underline text-xs"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-[15px]">
                {editingItem ? "Edit" : "New"}{" "}
                {type === "categories" ? "Patient Category" : "Referral Source"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={type === "categories" ? "e.g. Post-CABG Rehab" : "e.g. Dr. Balamurugan"}
                  className="charm-input-text w-full"
                />
              </div>

              {type === "referral-source" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                    Source Type
                  </label>
                  <select
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    className="charm-select w-full"
                  >
                    <option value="Internal Specialist">Internal Specialist</option>
                    <option value="External Cardiologist">External Cardiologist</option>
                    <option value="Hospital Referral">Hospital Referral</option>
                    <option value="Diagnostic Center">Diagnostic Center</option>
                    <option value="Organic / Alumni">Organic / Alumni</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                  {type === "categories" ? "Description" : "Contact / Address"}
                </label>
                <textarea
                  rows={3}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder={
                    type === "categories"
                      ? "Brief clinical criteria or treatment notes..."
                      : "Clinic phone, email, or hospital details..."
                  }
                  className="charm-textarea w-full text-sm"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="charm-btn-orange-new"
                onClick={handleSave}
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

