import { useState } from "react";
import { X, Plus, Trash2, Check } from "lucide-react";
import { Row } from "./api";
import { formatDoctorName } from "./clinicalWorkflows";

// ==========================================
// 1. DIAGNOSIS TEMPLATES MODAL (Frame 008, 012)
// ==========================================
export function DiagnosisTemplatesModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (diagnoses: { code: string; diagnosis: string }[], comment?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"D_copy" | "Vasomeditech EECP Diagnosis">("D_copy");
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");

  const templatesData: Record<string, { code: string; name: string }[]> = {
    D_copy: [
      { code: "41702007", name: "CAD - Coronary artery disease" },
      { code: "I25.9", name: "Chronic ischemic heart disease" },
      { code: "I25.118", name: "Stable angina" },
      { code: "I20.9", name: "stable angina" },
      { code: "I20.8", name: "Microvascular angina" },
      { code: "I20.0", name: "Unstable angina" },
      { code: "I25.2", name: "ECG: old myocardial infarction" },
    ],
    "Vasomeditech EECP Diagnosis": [
      { code: "I42.0", name: "DCM - Dilated cardiomyopathy" },
      { code: "E08.9", name: "MRDM" },
      { code: "I82.409", name: "DVT - Deep vein thrombosis" },
      { code: "373144005", name: "Single vessel coronary artery disease" },
      { code: "373145006", name: "Double vessel coronary artery disease" },
      { code: "373146007", name: "Triple vessel coronary artery disease" },
      { code: "I50.9", name: "Refractory heart failure" },
      { code: "I25.5", name: "Ischemic cardiomyopathy" },
    ],
  };

  const currentList = templatesData[activeTab] || [];

  const handleToggle = (code: string) => {
    setCheckedMap((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const next: Record<string, boolean> = { ...checkedMap };
    currentList.forEach((item) => {
      next[item.code] = checked;
    });
    setCheckedMap(next);
  };

  const allSelected = currentList.length > 0 && currentList.every((item) => checkedMap[item.code]);

  const handleAdd = () => {
    const selected: { code: string; diagnosis: string }[] = [];
    Object.entries(templatesData).forEach(([_, list]) => {
      list.forEach((item) => {
        if (checkedMap[item.code]) {
          selected.push({ code: item.code, diagnosis: item.name });
        }
      });
    });
    onAdd(selected, comment);
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-tpl-split-modal" onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Diagnosis Templates</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-tpl-body">
          {/* Left Sidebar */}
          <div className="charm-tpl-sidebar">
            <div className="charm-tpl-group-title">PRACTICE TEMPLATES</div>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "D_copy" ? "active" : ""}`}
              onClick={() => setActiveTab("D_copy")}
            >
              D_copy
            </button>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "Vasomeditech EECP Diagnosis" ? "active" : ""}`}
              onClick={() => setActiveTab("Vasomeditech EECP Diagnosis")}
            >
              Vasomeditech EECP Diagnosis
            </button>

            <div className="charm-tpl-group-title" style={{ marginTop: 24 }}>MY TEMPLATES</div>
            <div className="charm-tpl-empty-sub">No personal templates</div>
          </div>

          {/* Right Content */}
          <div className="charm-tpl-main">
            <div className="charm-tpl-table-wrap">
              <table className="charm-tpl-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                    </th>
                    <th>Diagnosis</th>
                    <th style={{ width: 140 }}>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((item) => (
                    <tr
                      key={item.code}
                      className={checkedMap[item.code] ? "row-selected" : ""}
                      onClick={() => handleToggle(item.code)}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={Boolean(checkedMap[item.code])}
                          onChange={() => handleToggle(item.code)}
                        />
                      </td>
                      <td>{item.name}</td>
                      <td><code className="charm-code-pill">{item.code}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="charm-tpl-comments-row">
              <label>Comments</label>
              <textarea
                rows={2}
                placeholder="Additional diagnostic rationale or staging notes..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="charm-tpl-footer">
              <button type="button" className="charm-btn-orange" onClick={handleAdd}>
                Add
              </button>
              <button type="button" className="charm-btn-default" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. PRESCRIPTION TEMPLATES MODAL (Frame 022, 030)
// ==========================================
export function PrescriptionTemplatesModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (prescriptions: any[]) => void;
}) {
  const [activeTab, setActiveTab] = useState("HUH - Medication List_copy");
  const [selectedMeds, setSelectedMeds] = useState<Record<string, boolean>>({
    lipcv: true,
  });

  const medsList = [
    {
      id: "chymo",
      tradeName: "TRYPSIN-CHYMOTRYPSIN [ CHYMOTHAL FORT TAB ]",
      genericName: "Trypsin-Chymotrypsin",
      inv: 5,
      m: "1", a: "0", e: "0", n: "0",
      units: "Tablet",
      when: "Before Meals",
      period: "5",
      periodUnits: "Day(s)",
      dispense: "15",
      substitution: true,
      notes: "Take 30 mins before food for inflammation reduction.",
    },
    {
      id: "lipcv",
      tradeName: "ATORVASTATIN 20 + CLOPIDOGREL 75 [ LIPIDATOR CV 20/75 ]",
      genericName: "Atorvastatin 20mg + Clopidogrel 75mg",
      inv: 12,
      m: "1", a: "0", e: "0", n: "0",
      units: "Capsule",
      when: "After Dinner",
      period: "30",
      periodUnits: "Day(s)",
      dispense: "30",
      substitution: true,
      notes: "Cardioprotective dual statin & antiplatelet therapy for CAD.",
    },
    {
      id: "lipa",
      tradeName: "ATORVASTATIN 10 MG + ASPIRIN 150 MG [ LIPIDATOR A 10/150 ]",
      genericName: "Atorvastatin 10mg + Aspirin 150mg",
      inv: 8,
      m: "0", a: "0", e: "0", n: "1",
      units: "Capsule",
      when: "After Dinner",
      period: "30",
      periodUnits: "Day(s)",
      dispense: "30",
      substitution: true,
      notes: "Secondary prevention of atherosclerotic cardiovascular disease.",
    },
    {
      id: "meto",
      tradeName: "METOPROLOL SUCCINATE 25 MG [ METOPROL-XL 25 ]",
      genericName: "Metoprolol Succinate Extended Release 25mg",
      inv: 20,
      m: "1", a: "0", e: "0", n: "0",
      units: "Tablet",
      when: "After Breakfast",
      period: "30",
      periodUnits: "Day(s)",
      dispense: "30",
      substitution: false,
      notes: "Cardioselective beta-1 adrenergic blocker for heart rate control.",
    },
    {
      id: "rosu",
      tradeName: "ROSUVASTATIN 10 MG [ ROSUVAS 10 ]",
      genericName: "Rosuvastatin Calcium 10mg",
      inv: 15,
      m: "0", a: "0", e: "0", n: "1",
      units: "Tablet",
      when: "At Bedtime",
      period: "30",
      periodUnits: "Day(s)",
      dispense: "30",
      substitution: true,
      notes: "HMG-CoA reductase inhibitor for lipid management.",
    },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const next: Record<string, boolean> = {};
    medsList.forEach((m) => {
      next[m.id] = checked;
    });
    setSelectedMeds(next);
  };

  const allSelected = medsList.length > 0 && medsList.every((m) => selectedMeds[m.id]);

  const handleAdd = () => {
    const result = medsList
      .filter((m) => selectedMeds[m.id])
      .map((m) => ({
        trade_name: m.tradeName,
        drug_name: m.tradeName,
        generic_name: m.genericName,
        morning: m.m,
        afternoon: m.a,
        evening: m.e,
        night: m.n,
        dose: `${m.m}-${m.a}-${m.e}-${m.n}`,
        dosage: `${m.m}-${m.a}-${m.e}-${m.n}`,
        route: "Oral",
        frequency: "Once daily",
        period: m.period,
        dispense: m.dispense,
        quantity: Number(m.dispense) || 30,
        instructions: m.notes,
        substitution_allowed: m.substitution,
      }));
    onAdd(result);
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-tpl-split-modal" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Prescription Templates</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-tpl-body">
          {/* Left Sidebar */}
          <div className="charm-tpl-sidebar" style={{ width: 220 }}>
            <div className="charm-tpl-group-title">PRACTICE TEMPLATES</div>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "HUH - Medication List_copy" ? "active" : ""}`}
              onClick={() => setActiveTab("HUH - Medication List_copy")}
            >
              HUH - Medication List_copy
            </button>

            <div className="charm-tpl-group-title" style={{ marginTop: 24 }}>MY TEMPLATES</div>
            <div className="charm-tpl-empty-sub">No personal templates</div>
          </div>

          {/* Right Content */}
          <div className="charm-tpl-main">
            <div className="charm-tpl-select-all-bar">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
                Select All
              </label>
            </div>

            <div className="charm-tpl-rx-cards-scroll">
              {medsList.map((m) => (
                <div key={m.id} className="charm-tpl-rx-card">
                  <div className="charm-tpl-rx-card-head">
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedMeds[m.id])}
                        onChange={(e) => setSelectedMeds((p) => ({ ...p, [m.id]: e.target.checked }))}
                      />
                      <span>{m.tradeName}</span>
                    </label>
                    {m.inv > 0 && <span className="charm-inv-chip">Inv {m.inv}</span>}
                  </div>

                  <div className="charm-tpl-rx-fields-grid">
                    <div className="charm-dose-col">
                      <span className="charm-sub-lbl">Dosage</span>
                      <div className="charm-man-dose-boxes">
                        <div>
                          <small>Morn</small>
                          <input defaultValue={m.m} />
                        </div>
                        <div>
                          <small>Aft</small>
                          <input defaultValue={m.a} />
                        </div>
                        <div>
                          <small>Eve</small>
                          <input defaultValue={m.e} />
                        </div>
                        <div>
                          <small>Night</small>
                          <input defaultValue={m.n} />
                        </div>
                      </div>
                    </div>

                    <div className="charm-field-col">
                      <span className="charm-sub-lbl">Units</span>
                      <select defaultValue={m.units}>
                        <option>Tablet</option>
                        <option>Capsule</option>
                        <option>Syrup</option>
                        <option>Injection</option>
                      </select>
                    </div>

                    <div className="charm-field-col">
                      <span className="charm-sub-lbl">When</span>
                      <select defaultValue={m.when}>
                        <option>Before Meals</option>
                        <option>After Meals</option>
                        <option>After Breakfast</option>
                        <option>After Dinner</option>
                        <option>At Bedtime</option>
                      </select>
                    </div>
                  </div>

                  <div className="charm-tpl-rx-secondary-grid">
                    <div>
                      <span className="charm-sub-lbl">Period</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input defaultValue={m.period} style={{ width: 50 }} />
                        <select defaultValue={m.periodUnits} style={{ width: 80 }}>
                          <option>Day(s)</option>
                          <option>Week(s)</option>
                          <option>Month(s)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="charm-sub-lbl">Dispense</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input defaultValue={m.dispense} style={{ width: 60 }} />
                        <select defaultValue="Units" style={{ width: 80 }}>
                          <option>-- Select --</option>
                          <option>Units</option>
                          <option>Strips</option>
                          <option>Bottles</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                        <input type="checkbox" defaultChecked={m.substitution} />
                        <span>Substitution allowed</span>
                      </label>
                    </div>
                  </div>

                  <div className="charm-tpl-notes-box">
                    <span className="charm-sub-lbl">Additional Notes</span>
                    <input defaultValue={m.notes} style={{ width: "100%", padding: "4px 8px", fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="charm-tpl-footer">
              <button type="button" className="charm-btn-orange" onClick={handleAdd}>
                Add
              </button>
              <button type="button" className="charm-btn-default" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. SUPPLEMENT TEMPLATES MODAL (Frame 036)
// ==========================================
export function SupplementTemplatesModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (supplements: any[]) => void;
}) {
  const [activeTab, setActiveTab] = useState("Syrub / oint / vit");
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({
    dup: true,
  });

  const supplementsList = [
    {
      id: "dup",
      name: "Duphalac Fiber oral soln 200 ml solution [ Manufactured ]",
      route: "Oral",
      dosage: "1",
      units: "tablespoon",
      freq: "As needed",
      when: "At Bedtime",
      duration: "1 day(s)",
      weaning: "",
      comment: "Lactulose bowel regulator post-procedure.",
    },
    {
      id: "coq10",
      name: "CoQ10 Ubiquinol 100mg Capsule",
      route: "Oral",
      dosage: "1",
      units: "capsule",
      freq: "Once daily",
      when: "After Breakfast",
      duration: "30 day(s)",
      weaning: "",
      comment: "Mitochondrial bioenergetic support for cardiac muscle during EECP.",
    },
    {
      id: "arginine",
      name: "L-Arginine 1000mg Sachet",
      route: "Oral",
      dosage: "1",
      units: "sachet",
      freq: "Twice daily",
      when: "Before Meals",
      duration: "35 day(s)",
      weaning: "",
      comment: "Nitric oxide precursor to augment shear stress vasodilatation.",
    },
    {
      id: "omega3",
      name: "Omega-3 Fatty Acids 1000mg (EPA 300mg / DHA 200mg)",
      route: "Oral",
      dosage: "1",
      units: "capsule",
      freq: "Once daily",
      when: "After Dinner",
      duration: "30 day(s)",
      weaning: "",
      comment: "Triglyceride lowering and vascular endothelial anti-inflammatory support.",
    },
  ];

  const handleAdd = () => {
    const result = supplementsList
      .filter((s) => selectedMap[s.id])
      .map((s) => ({
        trade_name: s.name,
        generic_name: s.name,
        dosage: `${s.dosage} ${s.units}`,
        frequency: s.freq,
        when: s.when,
        route: s.route,
        period: s.duration,
        instructions: s.comment,
        is_supplement: true,
      }));
    onAdd(result);
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-tpl-split-modal" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Supplement Templates</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-tpl-body">
          {/* Left Sidebar */}
          <div className="charm-tpl-sidebar" style={{ width: 220 }}>
            <div className="charm-tpl-group-title">PRACTICE TEMPLATES</div>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "Syrub / oint / vit" ? "active" : ""}`}
              onClick={() => setActiveTab("Syrub / oint / vit")}
            >
              Syrub / oint / vit
            </button>

            <div className="charm-tpl-group-title" style={{ marginTop: 24 }}>MY TEMPLATES</div>
            <div className="charm-tpl-empty-sub">No personal templates</div>
          </div>

          {/* Right Content */}
          <div className="charm-tpl-main">
            <div className="charm-tpl-select-all-bar">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={supplementsList.every((s) => selectedMap[s.id])}
                  onChange={(e) => {
                    const c = e.target.checked;
                    const next: Record<string, boolean> = {};
                    supplementsList.forEach((s) => (next[s.id] = c));
                    setSelectedMap(next);
                  }}
                />
                Select All
              </label>
            </div>

            <div className="charm-tpl-rx-cards-scroll">
              {supplementsList.map((s) => (
                <div key={s.id} className="charm-tpl-rx-card">
                  <div className="charm-tpl-rx-card-head">
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedMap[s.id])}
                        onChange={(e) => setSelectedMap((p) => ({ ...p, [s.id]: e.target.checked }))}
                      />
                      <span>{s.name}</span>
                    </label>
                  </div>

                  <div className="charm-tpl-rx-fields-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <span className="charm-sub-lbl">Manufacturer</span>
                      <select defaultValue="--Select--">
                        <option>--Select--</option>
                        <option>Abbott Healthcare</option>
                        <option>Sun Pharma</option>
                        <option>Dr. Reddy's</option>
                      </select>
                    </div>
                    <div>
                      <span className="charm-sub-lbl">Route</span>
                      <select defaultValue={s.route}>
                        <option>Oral</option>
                        <option>Topical</option>
                        <option>Sublingual</option>
                      </select>
                    </div>
                  </div>

                  <div className="charm-tpl-rx-secondary-grid" style={{ gridTemplateColumns: "80px 110px 130px 130px 1fr" }}>
                    <div>
                      <span className="charm-sub-lbl">Dosage</span>
                      <input defaultValue={s.dosage} style={{ width: "100%" }} />
                    </div>
                    <div>
                      <span className="charm-sub-lbl">Units</span>
                      <select defaultValue={s.units}>
                        <option>tablespoon</option>
                        <option>capsule</option>
                        <option>sachet</option>
                        <option>tablet</option>
                        <option>bottle</option>
                      </select>
                    </div>
                    <div>
                      <span className="charm-sub-lbl">Frequency</span>
                      <select defaultValue={s.freq}>
                        <option>As needed</option>
                        <option>Once daily</option>
                        <option>Twice daily</option>
                        <option>Once weekly</option>
                      </select>
                    </div>
                    <div>
                      <span className="charm-sub-lbl">When</span>
                      <select defaultValue={s.when}>
                        <option>At Bedtime</option>
                        <option>After Breakfast</option>
                        <option>Before Meals</option>
                        <option>After Dinner</option>
                      </select>
                    </div>
                    <div>
                      <span className="charm-sub-lbl">Duration</span>
                      <input defaultValue={s.duration} style={{ width: "100%" }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                    <div>
                      <span className="charm-sub-lbl">Weaning Schedule</span>
                      <textarea rows={2} defaultValue={s.weaning} placeholder="Optional tapering notes..." />
                    </div>
                    <div>
                      <span className="charm-sub-lbl">Comment</span>
                      <textarea rows={2} defaultValue={s.comment} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="charm-tpl-footer">
              <button type="button" className="charm-btn-orange" onClick={handleAdd}>
                Add
              </button>
              <button type="button" className="charm-btn-default" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. SYMPTOMS TEMPLATES MODAL (Frame 045)
// ==========================================
export function SymptomsTemplatesModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState("HUH EECP SOAP_Practice - SYMP");
  const [preview, setPreview] = useState("");
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({
    "The patient maintain the benefits.": true,
    "Walking distance increased without angina": true,
    "Chest pain improved (> 80% relief)": true,
  });

  const symptomChecklist: Record<string, string[]> = {
    "HUH EECP SOAP_Practice - SYMP": [
      "The patient maintain the benefits.",
      "Mild increase in the symptoms compared to post-EECP",
      "Recurrent symptoms to pre-EECP level.",
      "Symptoms improved better than post EECP level.",
      "Major adverse cardiac event.",
      "Chest pain improved (> 80% relief)",
      "Dyspnea NYHA class improved (Class III to Class I)",
      "Walking distance increased without angina (> 1 km)",
      "Nitroglycerin consumption reduced to nil",
    ],
    "Diabetes Management Template_Practice - SYMP": [
      "Polyuria / Polydipsia absent",
      "No hypoglycemia episodes reported",
      "Postprandial glycemic control adequate",
      "No paresthesia or peripheral neuropathy symptoms",
    ],
    Symptoms: [
      "No exertional dyspnea",
      "No pedal edema or orthopnea",
      "Resting palpitations resolved",
      "Exercise tolerance good (> 7 METs)",
    ],
    "Vaso-Meditech EECP SOAP - SYMP": [
      "Optimal diastolic augmentation achieved (> 1.2 D/S ratio)",
      "Good cuff skin tolerance without bruising",
      "Hemodynamically stable pre- and post-session",
      "Completed 1-hour session without discomfort",
    ],
  };

  const currentItems = symptomChecklist[activeTab] || [];

  const handleToggle = (item: string) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      const selected = Object.entries(next).filter(([_, v]) => v).map(([k]) => `• ${k}`);
      setPreview(selected.join("\n"));
      return next;
    });
  };

  const handleOk = () => {
    const selected = Object.entries(checkedMap).filter(([_, v]) => v).map(([k]) => `• ${k}`);
    onAdd(preview || selected.join("\n"));
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-tpl-split-modal" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Symptoms Templates</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-tpl-preview-banner">
          <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4, display: "block" }}>
            Notes Preview
          </label>
          <textarea
            rows={3}
            value={preview || Object.entries(checkedMap).filter(([_, v]) => v).map(([k]) => `• ${k}`).join("\n")}
            onChange={(e) => setPreview(e.target.value)}
            placeholder="Selected symptoms will be formatted here..."
          />
        </div>

        <div className="charm-tpl-body" style={{ minHeight: 300 }}>
          {/* Left Sidebar */}
          <div className="charm-tpl-sidebar" style={{ width: 280 }}>
            <div className="charm-tpl-group-title">Templates</div>
            {Object.keys(symptomChecklist).map((t) => (
              <button
                key={t}
                type="button"
                className={`charm-tpl-tab-item ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="charm-tpl-main">
            <div className="charm-tpl-checklist-scroll">
              {currentItems.map((item) => (
                <label key={item} className="charm-tpl-check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(checkedMap[item])}
                    onChange={() => handleToggle(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div className="charm-tpl-footer">
              <button type="button" className="charm-btn-orange" onClick={handleOk}>
                OK
              </button>
              <button type="button" className="charm-btn-default" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. ASSESSMENT NOTES TEMPLATES MODAL (Coronary Angiography)
// ==========================================
export function AssessmentNotesTemplatesModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (notes: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"CAG" | "Echo" | "EECP">("CAG");
  const [stenosis, setStenosis] = useState<Record<string, string>>({
    LAD: "75%",
    LCx: "50%",
    OM1: "70%",
    OM2: "0%",
    RCA: "90%",
    PDA: "0%",
  });
  const [ef, setEf] = useState("50%");
  const [rentrop, setRentrop] = useState("Grade 2");

  const vessels = ["LAD", "LCx", "OM1", "OM2", "RCA", "PDA"];
  const pctOptions = ["0%", "25%", "50%", "70%", "75%", "90%", "100% (CTO)"];

  const handleAdd = () => {
    let report = "";
    if (activeTab === "CAG") {
      report = `Coronary Angiography (CAG) Findings:
• Vessel Stenosis:
  - LAD (Left Anterior Descending): ${stenosis.LAD || "None"}
  - LCx (Left Circumflex): ${stenosis.LCx || "None"}
  - OM1 (Obtuse Marginal 1): ${stenosis.OM1 || "None"}
  - OM2 (Obtuse Marginal 2): ${stenosis.OM2 || "None"}
  - RCA (Right Coronary Artery): ${stenosis.RCA || "None"}
  - PDA (Posterior Descending Artery): ${stenosis.PDA || "None"}
• Collateral Circulation: Rentrop ${rentrop}
• LV Ejection Fraction: ${ef}
• Clinical Impression: Multi-vessel coronary artery disease with ischemic burden suitable for EECP non-invasive revascularization.`;
    } else if (activeTab === "Echo") {
      report = `2D Echocardiogram & Doppler Findings:
• LV Ejection Fraction (LVEF): ${ef}
• Left Ventricular Internal Dimensions: Normal
• Regional Wall Motion Abnormality: Inferior / anterior hypokinesia
• Diastolic Dysfunction: Grade I (Impaired Relaxation)
• Valves: Mild MR, no AS, no AR
• Estimated RVSP: 28 mmHg (No pulmonary hypertension)`;
    } else {
      report = `EECP Clinical Assessment & Hemodynamic Progress:
• Baseline CCS Angina: Class III
• Post-Treatment CCS Angina: Class I
• Counterpulsation D/S Augmentation Ratio: > 1.2
• Carotid-Radial Pulse Wave Velocity (crPWV): 7.8 m/sec
• Vascular Age Estimation: Improved by 6 years
• Clinical Status: Significant collateral flow induction and symptom relief.`;
    }
    onAdd(report);
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-tpl-split-modal" style={{ maxWidth: 840 }} onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Assessment Notes Templates</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-tpl-body">
          {/* Left Sidebar */}
          <div className="charm-tpl-sidebar" style={{ width: 260 }}>
            <div className="charm-tpl-group-title">PRACTICE TEMPLATES</div>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "CAG" ? "active" : ""}`}
              onClick={() => setActiveTab("CAG")}
            >
              Coronary Angiography (CAG)
            </button>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "Echo" ? "active" : ""}`}
              onClick={() => setActiveTab("Echo")}
            >
              2D Echocardiogram & Doppler
            </button>
            <button
              type="button"
              className={`charm-tpl-tab-item ${activeTab === "EECP" ? "active" : ""}`}
              onClick={() => setActiveTab("EECP")}
            >
              EECP Hemodynamics & Progress
            </button>
          </div>

          {/* Right Content */}
          <div className="charm-tpl-main">
            {activeTab === "CAG" && (
              <div className="charm-cag-matrix-wrap">
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a" }}>
                  Coronary Vessel Stenosis Evaluation
                </h4>
                <div className="charm-cag-grid">
                  {vessels.map((v) => (
                    <div key={v} className="charm-cag-vessel-row">
                      <strong style={{ width: 60, fontSize: 12 }}>{v}</strong>
                      <select
                        value={stenosis[v] || "0%"}
                        onChange={(e) => setStenosis((p) => ({ ...p, [v]: e.target.value }))}
                        style={{ flex: 1, padding: "4px 8px", fontSize: 12 }}
                      >
                        {pctOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                  <div>
                    <span className="charm-sub-lbl">Collateral Grade (Rentrop)</span>
                    <select value={rentrop} onChange={(e) => setRentrop(e.target.value)}>
                      <option>Grade 0 (No filling of collateral channels)</option>
                      <option>Grade 1 (Side branches filled)</option>
                      <option>Grade 2 (Partial main vessel filled)</option>
                      <option>Grade 3 (Complete main vessel filled)</option>
                    </select>
                  </div>
                  <div>
                    <span className="charm-sub-lbl">Estimated LVEF</span>
                    <select value={ef} onChange={(e) => setEf(e.target.value)}>
                      <option>60% (Normal)</option>
                      <option>55% (Normal)</option>
                      <option>50% (Mild LV dysfunction)</option>
                      <option>45% (Mild LV dysfunction)</option>
                      <option>40% (Moderate LV dysfunction)</option>
                      <option>35% (Moderate-Severe)</option>
                      <option>&lt; 30% (Severe LV dysfunction)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Echo" && (
              <div style={{ padding: 12 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a" }}>
                  Echocardiography Assessment
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span className="charm-sub-lbl">Ejection Fraction (LVEF)</span>
                    <input defaultValue="50%" onChange={(e) => setEf(e.target.value)} />
                  </div>
                  <div>
                    <span className="charm-sub-lbl">Diastolic Dysfunction</span>
                    <select defaultValue="Grade I (Impaired Relaxation)">
                      <option>Normal diastolic filling</option>
                      <option>Grade I (Impaired Relaxation)</option>
                      <option>Grade II (Pseudonormal)</option>
                      <option>Grade III (Restrictive)</option>
                    </select>
                  </div>
                  <div>
                    <span className="charm-sub-lbl">Wall Motion Abnormality</span>
                    <select defaultValue="Inferior / Anterior Hypokinesia">
                      <option>None (Normal wall motion)</option>
                      <option>Inferior / Anterior Hypokinesia</option>
                      <option>Anterior Wall Hypokinesia</option>
                      <option>Global Hypokinesia</option>
                    </select>
                  </div>
                  <div>
                    <span className="charm-sub-lbl">Valvular Function</span>
                    <input defaultValue="Mild Mitral Regurgitation, No AS/AR" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "EECP" && (
              <div style={{ padding: 12 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a" }}>
                  EECP Hemodynamic Response
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span className="charm-sub-lbl">Baseline Angina Class</span>
                    <select defaultValue="CCS Class III">
                      <option>CCS Class I</option>
                      <option>CCS Class II</option>
                      <option>CCS Class III</option>
                      <option>CCS Class IV</option>
                    </select>
                  </div>
                  <div>
                    <span className="charm-sub-lbl">Post-Session Angina Class</span>
                    <select defaultValue="CCS Class I">
                      <option>CCS Class I</option>
                      <option>CCS Class II</option>
                      <option>CCS Class III</option>
                    </select>
                  </div>
                  <div>
                    <span className="charm-sub-lbl">D/S Augmentation Ratio</span>
                    <input defaultValue="1.35" />
                  </div>
                  <div>
                    <span className="charm-sub-lbl">crPWV (Pulse Wave Velocity)</span>
                    <input defaultValue="7.8 m/sec" />
                  </div>
                </div>
              </div>
            )}

            <div className="charm-tpl-footer">
              <button type="button" className="charm-btn-orange" onClick={handleAdd}>
                Add
              </button>
              <button type="button" className="charm-btn-default" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. ADD PRESCRIPTION MODAL (Frame 018)
// ==========================================
export function AddPrescriptionModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (prescriptions: any[]) => void;
}) {
  const [items, setItems] = useState<any[]>([
    {
      id: "1",
      tradeName: "",
      genericName: "",
      m: "1", a: "0", e: "0", n: "0",
      units: "-- Select --",
      when: "-- Select --",
      dosageMode: "Default",
      period: "30",
      periodUnits: "Day(s)",
      dispense: "30",
      dispenseUnits: "-- Select --",
      substitution: true,
      notes: "",
    },
  ]);

  const addMore = () => {
    setItems((p) => [
      ...p,
      {
        id: String(Date.now()),
        tradeName: "",
        genericName: "",
        m: "0", a: "0", e: "0", n: "1",
        units: "-- Select --",
        when: "-- Select --",
        dosageMode: "Default",
        period: "30",
        periodUnits: "Day(s)",
        dispense: "30",
        dispenseUnits: "-- Select --",
        substitution: true,
        notes: "",
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((p) => p.filter((x) => x.id !== id));
  };

  const updateRow = (id: string, key: string, value: any) => {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  };

  const handleSave = () => {
    const valid = items
      .filter((x) => x.tradeName.trim())
      .map((x) => ({
        trade_name: x.tradeName,
        drug_name: x.tradeName,
        generic_name: x.genericName || x.tradeName,
        morning: x.m,
        afternoon: x.a,
        evening: x.e,
        night: x.n,
        dose: `${x.m}-${x.a}-${x.e}-${x.n}`,
        dosage: `${x.m}-${x.a}-${x.e}-${x.n}`,
        route: "Oral",
        frequency: "Once daily",
        period: x.period,
        dispense: x.dispense,
        quantity: Number(x.dispense) || 30,
        instructions: x.notes,
        substitution_allowed: x.substitution,
      }));
    if (valid.length > 0) {
      onAdd(valid);
    }
    onClose();
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-add-rx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>Add Prescription</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-add-rx-body">
          {items.map((row, idx) => (
            <div key={row.id} className="charm-add-rx-block">
              {idx > 0 && <hr className="charm-divider" />}
              <div className="charm-add-rx-top-line">
                <div style={{ flex: 2 }}>
                  <label>Trade Name</label>
                  <input
                    placeholder="Enter Trade Name"
                    value={row.tradeName}
                    onChange={(e) => updateRow(row.id, "tradeName", e.target.value)}
                  />
                </div>

                <div className="charm-dose-inputs-cluster">
                  <div>
                    <label>Morning</label>
                    <input value={row.m} onChange={(e) => updateRow(row.id, "m", e.target.value)} />
                  </div>
                  <div>
                    <label>Afternoon</label>
                    <input value={row.a} onChange={(e) => updateRow(row.id, "a", e.target.value)} />
                  </div>
                  <div>
                    <label>Evening</label>
                    <input value={row.e} onChange={(e) => updateRow(row.id, "e", e.target.value)} />
                  </div>
                  <div>
                    <label>Night</label>
                    <input value={row.n} onChange={(e) => updateRow(row.id, "n", e.target.value)} />
                  </div>
                </div>

                <div style={{ width: 110 }}>
                  <label>Units</label>
                  <select value={row.units} onChange={(e) => updateRow(row.id, "units", e.target.value)}>
                    <option>-- Select --</option>
                    <option>Tablet</option>
                    <option>Capsule</option>
                    <option>Syrup</option>
                    <option>Injection</option>
                  </select>
                </div>

                <div style={{ width: 110 }}>
                  <label>When</label>
                  <select value={row.when} onChange={(e) => updateRow(row.id, "when", e.target.value)}>
                    <option>--Select--</option>
                    <option>Before Meals</option>
                    <option>After Meals</option>
                    <option>After Breakfast</option>
                    <option>After Dinner</option>
                    <option>At Bedtime</option>
                  </select>
                </div>

                <div className="charm-dosage-toggle-col">
                  <label>Dosage</label>
                  <div className="charm-pill-toggle">
                    <button
                      type="button"
                      className={row.dosageMode === "Default" ? "active" : ""}
                      onClick={() => updateRow(row.id, "dosageMode", "Default")}
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      className={row.dosageMode === "Custom" ? "active" : ""}
                      onClick={() => updateRow(row.id, "dosageMode", "Custom")}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    className="charm-trash-btn"
                    title="Remove item"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="charm-add-rx-second-line">
                <div style={{ flex: 2 }}>
                  <label>Generic Name</label>
                  <input
                    placeholder="Enter Generic Name"
                    value={row.genericName}
                    onChange={(e) => updateRow(row.id, "genericName", e.target.value)}
                  />
                </div>

                <div style={{ width: 140 }}>
                  <label>Period</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      style={{ width: 50 }}
                      value={row.period}
                      onChange={(e) => updateRow(row.id, "period", e.target.value)}
                    />
                    <select
                      style={{ width: 85 }}
                      value={row.periodUnits}
                      onChange={(e) => updateRow(row.id, "periodUnits", e.target.value)}
                    >
                      <option>Day(s)</option>
                      <option>Week(s)</option>
                      <option>Month(s)</option>
                    </select>
                  </div>
                </div>

                <div style={{ width: 140 }}>
                  <label>Dispense</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      style={{ width: 50 }}
                      value={row.dispense}
                      onChange={(e) => updateRow(row.id, "dispense", e.target.value)}
                    />
                    <select
                      style={{ width: 85 }}
                      value={row.dispenseUnits}
                      onChange={(e) => updateRow(row.id, "dispenseUnits", e.target.value)}
                    >
                      <option>-- Select --</option>
                      <option>Units</option>
                      <option>Strips</option>
                      <option>Bottles</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={row.substitution}
                      onChange={(e) => updateRow(row.id, "substitution", e.target.checked)}
                    />
                    <span>Substitution allowed</span>
                  </label>
                </div>
              </div>

              <div className="charm-add-rx-third-line">
                <label>Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional clinician instructions..."
                  value={row.notes}
                  onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <button type="button" className="charm-link-btn" onClick={addMore}>
              <Plus size={14} style={{ marginRight: 4 }} /> Add more
            </button>
          </div>
        </div>

        <div className="charm-tpl-footer">
          <button type="button" className="charm-btn-orange" onClick={handleSave}>
            Add
          </button>
          <button type="button" className="charm-btn-default" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. NEW ENCOUNTER MODAL (Frame 001, 002)
// ==========================================
export function NewEncounterModal({
  patient,
  staff,
  onClose,
  onCreate,
}: {
  patient: Row;
  staff: Row[];
  onClose: () => void;
  onCreate: (payload: {
    facility: string;
    provider_id: string;
    date: string;
    visit_type: string;
    mode: string;
    chart_type: string;
  }) => void;
}) {
  const [facility, setFacility] = useState("Heal Your Heart Neelankarai");
  const [providerId, setProviderId] = useState(
    staff.find((s) => s.role === "doctor")?.id || staff[0]?.id || ""
  );
  const [encDate, setEncDate] = useState(new Date().toISOString().slice(0, 10));
  const [visitType, setVisitType] = useState("EECP On-going Visit");
  const [consultationMode, setConsultationMode] = useState<"In Person" | "Phone Call" | "Video Consult">(
    "Video Consult"
  );
  const [chartType, setChartType] = useState<"Quick" | "Brief" | "Comprehensive" | "SOAP Template">(
    "SOAP Template"
  );

  const practiceVisitTypes = [
    "--Select--",
    "EECP Demo",
    "EECP On-going Visit",
    "EECP Treatment 20 Sessions",
    "EECP Treatment Completed",
    "EECP Treatment Insurance",
    "EECP Treatment Started",
    "Follow-up Visit",
    "New Patient Visit",
    "Ongoing Hospital Admission",
    "Ongoing consultation",
    "Ongoing HUH Admission",
    "Other EECP centers",
    "Patient Discontinued",
    "Patient Expired",
    "Telehealth",
    "Walk-in (Follow-up Visit)",
    "Walk-in (New Patient Visit)",
  ];

  const handleCreate = () => {
    onCreate({
      facility,
      provider_id: providerId,
      date: encDate,
      visit_type: visitType === "--Select--" ? "Follow-up Visit" : visitType,
      mode: consultationMode,
      chart_type: chartType,
    });
  };

  return (
    <div className="charm-view-modal-backdrop" onClick={onClose}>
      <div className="charm-new-enc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="charm-tpl-header">
          <h2>New Encounter</h2>
          <button type="button" className="charm-view-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="charm-new-enc-body">
          <div className="charm-form-row">
            <label>Facility *</label>
            <select value={facility} onChange={(e) => setFacility(e.target.value)}>
              <option value="Heal Your Heart Neelankarai">Heal Your Heart Neelankarai</option>
              <option value="Heal Your Heart Royapettah">Heal Your Heart Royapettah</option>
              <option value="Heal Your Heart Manapakkam">Heal Your Heart Manapakkam</option>
            </select>
          </div>

          <div className="charm-form-row">
            <label>Consultation with *</label>
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              {staff
                .filter((s) => ["doctor", "therapist", "admin"].includes(s.role))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDoctorName(s.name)}
                  </option>
                ))}
            </select>
          </div>

          <div className="charm-form-row">
            <label>Date *</label>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                value={encDate}
                onChange={(e) => setEncDate(e.target.value)}
              />
            </div>
          </div>

          <div className="charm-form-row">
            <label>Visit Type</label>
            <select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
              {practiceVisitTypes.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
          </div>

          <div className="charm-form-row">
            <label>Consultation Mode *</label>
            <div className="charm-radio-group">
              <label>
                <input
                  type="radio"
                  name="consultationMode"
                  checked={consultationMode === "In Person"}
                  onChange={() => setConsultationMode("In Person")}
                />
                <span>In Person</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="consultationMode"
                  checked={consultationMode === "Phone Call"}
                  onChange={() => setConsultationMode("Phone Call")}
                />
                <span>Phone Call</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="consultationMode"
                  checked={consultationMode === "Video Consult"}
                  onChange={() => setConsultationMode("Video Consult")}
                />
                <span>Video Consult</span>
              </label>
            </div>
          </div>

          <div className="charm-form-row">
            <label>Chart Type *</label>
            <div className="charm-radio-group">
              <label>
                <input
                  type="radio"
                  name="chartType"
                  checked={chartType === "Quick"}
                  onChange={() => setChartType("Quick")}
                />
                <span>Quick</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="chartType"
                  checked={chartType === "Brief"}
                  onChange={() => setChartType("Brief")}
                />
                <span>Brief</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="chartType"
                  checked={chartType === "Comprehensive"}
                  onChange={() => setChartType("Comprehensive")}
                />
                <span>Comprehensive</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="chartType"
                  checked={chartType === "SOAP Template"}
                  onChange={() => setChartType("SOAP Template")}
                />
                <span style={{ color: "#ea580c", fontWeight: 700 }}>SOAP Template</span>
              </label>
            </div>
          </div>
        </div>

        <div className="charm-tpl-footer">
          <button type="button" className="charm-btn-orange" onClick={handleCreate}>
            Create
          </button>
          <button type="button" className="charm-btn-default" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

