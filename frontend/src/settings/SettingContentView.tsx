import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Check,
  Search,
  Sliders,
  Save,
  RotateCcw,
  ShieldCheck,
  Building,
  UserCheck,
  Calendar,
  CreditCard,
  Activity,
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import {
  SettingCategory,
  SettingOption,
} from "./settingsData";

interface SettingContentViewProps {
  category: SettingCategory;
  option: SettingOption;
  onSelectOption: (opt: SettingOption) => void;
  onBack: () => void;
}

export function SettingContentView({
  category,
  option,
  onSelectOption,
  onBack,
}: SettingContentViewProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    option.fields?.forEach((f) => {
      initial[f.key] = f.defaultValue;
    });
    return initial;
  });

  const [savedNotice, setSavedNotice] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSavedNotice(true);
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = "Changes saved successfully";
      document.body.appendChild(toast);
      setTimeout(() => {
        toast?.remove();
      }, 3000);
    }
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Specific clinical practice datasets for Heal Your Heart
  const facilityBranches = [
    { id: "1", name: "4R Health & Wellness", phone: "Mobile : 9003070064\nOffice Phone : 9003070065", address: "No.357, First floor, Shri kapaleeswar nagar, Neelankarai, Chennai" },
    { id: "2", name: "Dr.S.Ramasamy (Reg No:60626)", phone: "Mobile : 9003070065\nOffice Phone : 9003070065", address: "Plot No.357, First Floor, ECR, Sri Kapaleeswarar Nagar, Neelankarai, Chennai" },
    { id: "3", name: "Dr.S.Ramasamy (Royapettah)", phone: "Mobile : 9003070065", address: "No 155,156 GP Road, Mount Road, Chennai" },
    { id: "4", name: "Heal Your Heart - Manapakkam - HUH003", phone: "Mobile : 9003070064\nOffice Phone : 9003070065", address: "3/249, J Krishna Enclave, Manapakkam Main Road, Chennai" },
    { id: "5", name: "Heal Your Heart Neelankarai - HUH001", phone: "Mobile : 9003070065\nOffice Phone : 9003070065", address: "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar, Neelankarai, Chennai" },
    { id: "6", name: "Heal Your Heart Royapettah - HUH002", phone: "Mobile : 9003070065\nOffice Phone : 8939996958", address: "Sundar Krishna Complex, First Floor, No.155/156, GP Lane, Off Anna Salai, Chennai" },
    { id: "7", name: "Heal Your Heart-Madurai - 005", phone: "Office Phone : 9003070065", address: "No 28, Velayudham Pillai Street, Goripalayam, Madurai" },
    { id: "8", name: "Heal Your Heart-Tirunelveli - 004", phone: "Office Phone : 9003070065", address: "9L, Madurai Road, Thilak Nagar, Tirunelveli" },
    { id: "9", name: "Heal Your Heart - Krishnagiri - HUH006", phone: "Mobile : 9848881262\nOffice Phone : 9003070065", address: "No 545, TNHB Phase II, Wahab Nagar, Kathujuganapalli, Krishnagiri" },
  ];

  const facilityMembers = [
    { id: "m1", name: "Dr. S. Ramasamy", role: "Medical Director & Chief Cardiologist", email: "director@healyourheart.com", phone: "+91 90030 70065", status: "Active" },
    { id: "m2", name: "Dr. A. Sharma", role: "Cardiology Consultant", email: "doctor@demo.local", phone: "+91 98840 12345", status: "Active" },
    { id: "m3", name: "Priya Nathan", role: "Senior EECP Therapist", email: "therapist@demo.local", phone: "+91 94440 67890", status: "Active" },
    { id: "m4", name: "Deepa Rajan", role: "Billing & Accounts Officer", email: "billing@demo.local", phone: "+91 97770 11223", status: "Active" },
    { id: "m5", name: "Suresh Kumar", role: "Clinic Receptionist", email: "reception@demo.local", phone: "+91 91110 55443", status: "Active" },
  ];

  const facilityResources = [
    { id: "r1", name: "EECP Bed 01 - Vasomedical Lumenair", type: "EECP System", location: "Neelankarai · Bay A", status: "Operational" },
    { id: "r2", name: "EECP Bed 02 - Vasomedical Lumenair", type: "EECP System", location: "Neelankarai · Bay B", status: "Operational" },
    { id: "r3", name: "EECP Bed 03 - Vasomedical Lumenair", type: "EECP System", location: "Royapettah · Bay 1", status: "Operational" },
    { id: "r4", name: "EECP Bed 04 - Vasomedical Lumenair", type: "EECP System", location: "Royapettah · Bay 2", status: "Operational" },
    { id: "r5", name: "Consultation Chamber 101", type: "Consultation Suite", location: "Neelankarai · 1st Floor", status: "Operational" },
    { id: "r6", name: "Echo / TMT Diagnostic Suite", type: "Diagnostic Room", location: "Neelankarai · Ground Floor", status: "Operational" },
  ];

  const procedureCodes = [
    { code: "99204", desc: "Initial Comprehensive Cardiology Consultation", tariff: "₹ 1,500.00", tax: "0% Healthcare", type: "Consultation" },
    { code: "99213", desc: "Follow-up Focused Cardiology Review", tariff: "₹ 800.00", tax: "0% Healthcare", type: "Consultation" },
    { code: "93798", desc: "Enhanced External Counterpulsation (EECP) 1-Hour Session", tariff: "₹ 3,500.00", tax: "0% Healthcare", type: "Therapy" },
    { code: "93000", desc: "12-Lead Electrocardiogram (ECG) with Physician Report", tariff: "₹ 600.00", tax: "0% Healthcare", type: "Diagnostic" },
    { code: "93306", desc: "Comprehensive 2D Transthoracic Echocardiography with Doppler", tariff: "₹ 3,000.00", tax: "0% Healthcare", type: "Diagnostic" },
    { code: "HYH-PKG35", desc: "35-Session Full Course EECP Natural Bypass Package", tariff: "₹ 95,000.00", tax: "0% Healthcare", type: "Package" },
  ];

  const auditTrails = [
    { time: "2026-11-11 13:45:10", user: "Dr. S. Ramasamy", action: "Sign Encounter Note", target: "Patient #HYH-00104 · Isaac", ip: "127.0.0.1" },
    { time: "2026-11-11 13:20:04", user: "Priya Nathan", action: "Record EECP Daily Vitals", target: "Patient #HYH-00104 (Session 14)", ip: "127.0.0.1" },
    { time: "2026-11-11 12:55:18", user: "Deepa Rajan", action: "Generate Invoice #INV-2026-0089", target: "Patient #HYH-00104 · 35 Session Package", ip: "127.0.0.1" },
    { time: "2026-11-11 11:30:22", user: "Suresh Kumar", action: "Check-in Appointment", target: "Patient #HYH-00105 · Prema", ip: "127.0.0.1" },
  ];

  return (
    <div className="charm-in-card-settings-view">
      {/* 2. Action Bar with Context Subtitle & Primary Button */}
      <div className="charm-settings-subhead-strip">
        <div className="charm-settings-practice-title">
          <span>Practice Name : </span>
          <strong>Heal Your Heart</strong>
          <span className="text-slate-400 mx-2">·</span>
          <span className="text-slate-600 text-[13px]">{category.name} &gt; {option.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="text-emerald-700 text-[12px] flex items-center gap-1 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <Check size={14} /> Saved successfully
            </span>
          )}

          {option.id === "facility-list" && (
            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={handleSave}
            >
              <Plus size={15} />
              <span>New Facility</span>
            </button>
          )}

          {option.id === "facility-members" && (
            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={handleSave}
            >
              <Plus size={15} />
              <span>Add Member</span>
            </button>
          )}

          {option.id === "facility-resources" && (
            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={handleSave}
            >
              <Plus size={15} />
              <span>Add Resource</span>
            </button>
          )}

          {option.id === "procedure-codes" && (
            <button
              type="button"
              className="charm-btn-orange-new"
              onClick={handleSave}
            >
              <Plus size={15} />
              <span>Add Procedure Code</span>
            </button>
          )}

          {option.fields && option.fields.length > 0 && (
            <button
              type="button"
              className="charm-btn-primary-action"
              onClick={handleSave}
            >
              <Save size={14} />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Body Content Based on Option */}
      <div className="charm-settings-option-body">
        {/* VIEW 1: Facility List Table */}
        {option.id === "facility-list" && (
          <div className="charm-settings-table-wrapper">
            <table className="charm-settings-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Name</th>
                  <th style={{ width: "32%" }}>Contact Details</th>
                  <th style={{ width: "34%" }}>Address</th>
                  <th style={{ width: "6%", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilityBranches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong className="text-[#166EB8] hover:underline cursor-pointer">
                        {b.name}
                      </strong>
                    </td>
                    <td className="whitespace-pre-line text-slate-700 text-[12.5px]">
                      {b.phone}
                    </td>
                    <td className="text-slate-700 text-[12.5px]">
                      {b.address}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="charm-table-more-btn"
                        title="More Actions"
                        onClick={() =>
                          setActionMenuOpen(actionMenuOpen === b.id ? null : b.id)
                        }
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: Facility Members Table */}
        {option.id === "facility-members" && (
          <div className="charm-settings-table-wrapper">
            <table className="charm-settings-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Clinical / Operational Role</th>
                  <th>Email Address</th>
                  <th>Contact Phone</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilityMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong className="text-[#166EB8] cursor-pointer hover:underline">
                        {m.name}
                      </strong>
                    </td>
                    <td className="text-slate-700 font-medium">{m.role}</td>
                    <td className="text-slate-600">{m.email}</td>
                    <td className="text-slate-600">{m.phone}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        {m.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button type="button" className="charm-table-more-btn">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: Facility Resources Table */}
        {option.id === "facility-resources" && (
          <div className="charm-settings-table-wrapper">
            <table className="charm-settings-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Resource Classification</th>
                  <th>Assigned Location</th>
                  <th>Operating Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilityResources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong className="text-[#166EB8]">{r.name}</strong>
                    </td>
                    <td className="text-slate-700">{r.type}</td>
                    <td className="text-slate-600">{r.location}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button type="button" className="charm-table-more-btn">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 4: Procedure Codes Table */}
        {option.id === "procedure-codes" && (
          <div className="charm-settings-table-wrapper">
            <table className="charm-settings-table">
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Service Code</th>
                  <th style={{ width: "45%" }}>Service Description</th>
                  <th style={{ width: "15%" }}>Category</th>
                  <th style={{ width: "14%" }}>Standard Tariff</th>
                  <th style={{ width: "14%" }}>Tax Structure</th>
                </tr>
              </thead>
              <tbody>
                {procedureCodes.map((c) => (
                  <tr key={c.code}>
                    <td>
                      <span className="font-mono font-bold text-[#166EB8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {c.code}
                      </span>
                    </td>
                    <td className="text-slate-800 font-medium">{c.desc}</td>
                    <td className="text-slate-600">{c.type}</td>
                    <td className="font-bold text-slate-800">{c.tariff}</td>
                    <td className="text-slate-500 text-[12px]">{c.tax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 5: Audit Trails */}
        {option.id === "audit-trails" && (
          <div className="charm-settings-table-wrapper">
            <table className="charm-settings-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User / Clinician</th>
                  <th>Clinical Action</th>
                  <th>Target Record</th>
                  <th>Client IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditTrails.map((a, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-slate-600 text-[12px]">{a.time}</td>
                    <td><strong className="text-slate-800">{a.user}</strong></td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {a.action}
                      </span>
                    </td>
                    <td className="text-slate-700">{a.target}</td>
                    <td className="font-mono text-slate-500 text-[12px]">{a.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 6: Configurable Parameters & Form Fields for All Settings */}
        {(!["facility-list", "facility-members", "facility-resources", "procedure-codes", "audit-trails"].includes(option.id) || (option.fields && option.fields.length > 0)) && (
          <div className="charm-settings-form-container">
            <div className="charm-form-header-box">
              <h2 className="text-[16px] font-bold text-slate-800 mb-1">
                {option.name}
              </h2>
              <p className="text-[12.5px] text-slate-600">
                {option.description}
              </p>
            </div>

            <div className="charm-form-grid">
              {option.fields?.map((f) => {
                const val = formData[f.key];
                return (
                  <div key={f.key} className="charm-field-group">
                    <label className="charm-field-label">
                      {f.label}
                    </label>

                    {f.type === "toggle" && (
                      <div className="flex items-center gap-3 mt-1">
                        <label className="charm-toggle-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) =>
                              handleFieldChange(f.key, e.target.checked)
                            }
                          />
                          <span className="charm-toggle-slider" />
                        </label>
                        <span className="text-[13px] text-slate-700">
                          {val ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    )}

                    {f.type === "text" && (
                      <input
                        type="text"
                        className="charm-input-text"
                        value={val || ""}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      />
                    )}

                    {f.type === "number" && (
                      <input
                        type="number"
                        className="charm-input-text"
                        value={val ?? 0}
                        onChange={(e) =>
                          handleFieldChange(f.key, Number(e.target.value))
                        }
                      />
                    )}

                    {f.type === "select" && (
                      <select
                        className="charm-select"
                        value={val || ""}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      >
                        {f.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {f.type === "textarea" && (
                      <textarea
                        className="charm-textarea"
                        rows={3}
                        value={val || ""}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                      />
                    )}

                    {f.description && (
                      <span className="text-[11.5px] text-slate-400 mt-1 block">
                        {f.description}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

