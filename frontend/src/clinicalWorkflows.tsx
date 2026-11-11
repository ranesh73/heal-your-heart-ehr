import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  Row,
  dateTime,
  day,
  today,
  branch,
} from "./api";
import { useApp } from "./context";
import { Modal, Button, Badge } from "./ui";
import {
  Pill,
  Syringe,
  ShieldAlert,
  Activity,
  LineChart,
  Search,
  Plus,
  Trash2,
  Edit2,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  X,
  Check,
} from "lucide-react";

export function formatDoctorName(name?: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.startsWith("Dr.") || trimmed.startsWith("Dr ")) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

// ============================================================================
// 1. MEDICATIONS & SUPPLEMENTS WORKFLOW (CharmHealth Frame 38 & 42)
// ============================================================================

interface PrescriptionDraftItem {
  drug_name: string;
  dosage: string;
  dose_unit: string;
  route: string;
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
  timing_when: string;
  period_count: number;
  period_unit: string;
  dispense_count: number;
  dispense_unit: string;
  refills: number;
  daw: boolean;
  start_date: string;
  end_date: string;
  instructions: string;
  is_supplement: boolean;
  default_dosage: boolean;
}

const defaultDraftItem = (isSupplement = false): PrescriptionDraftItem => {
  const d = new Date();
  const start = d.toISOString().slice(0, 10);
  const endD = new Date(d.getTime() + 30 * 24 * 60 * 60 * 1000);
  const end = endD.toISOString().slice(0, 10);
  return {
    drug_name: "",
    dosage: "1",
    dose_unit: "Tablet",
    route: "Oral",
    morning: "1",
    afternoon: "0",
    evening: "1",
    night: "0",
    timing_when: "After food",
    period_count: 30,
    period_unit: "Days",
    dispense_count: 60,
    dispense_unit: "Tablets",
    refills: 0,
    daw: false,
    start_date: start,
    end_date: end,
    instructions: "",
    is_supplement: isSupplement,
    default_dosage: true,
  };
};

export function AddPrescriptionModal({
  patientId,
  isSupplementDefault = false,
  onClose,
  onSaved,
}: {
  patientId: string;
  isSupplementDefault?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { staff, user, notify } = useApp();
  const [items, setItems] = useState<PrescriptionDraftItem[]>([
    defaultDraftItem(isSupplementDefault),
  ]);
  const [providerId, setProviderId] = useState(
    user?.role === "doctor"
      ? user.id
      : staff.find((s) => s.role === "doctor")?.id || user.id
  );
  const [pharmacyNotes, setPharmacyNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Catalogs query
  const { data: catalogs = [] } = useQuery<Row[]>({
    queryKey: ["catalogs", "medication", searchQuery],
    queryFn: () =>
      api<Row[]>(
        `/catalogs?kind=medication${
          searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
        }`
      ),
    staleTime: 60000,
  });

  const updateItem = (index: number, updates: Partial<PrescriptionDraftItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const next = { ...copy[index], ...updates };
      // auto-update dispense count if morning/afternoon/evening/night or period changed
      if (
        updates.morning !== undefined ||
        updates.afternoon !== undefined ||
        updates.evening !== undefined ||
        updates.night !== undefined ||
        updates.period_count !== undefined
      ) {
        const m = parseFloat(next.morning) || 0;
        const a = parseFloat(next.afternoon) || 0;
        const e = parseFloat(next.evening) || 0;
        const n = parseFloat(next.night) || 0;
        const dailyTotal = m + a + e + n;
        const days =
          next.period_unit === "Weeks"
            ? next.period_count * 7
            : next.period_unit === "Months"
            ? next.period_count * 30
            : next.period_count;
        next.dispense_count = Math.ceil(dailyTotal * days) || 30;
      }
      copy[index] = next;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = (asSupplement = false) => {
    setItems((prev) => [...prev, defaultDraftItem(asSupplement)]);
  };

  const handleSave = async (printAfter = false) => {
    setError(null);
    for (let i = 0; i < items.length; i++) {
      if (!items[i].drug_name.trim()) {
        setError(`Please enter or select a drug name for item #${i + 1}`);
        return;
      }
    }
    setSaving(true);
    try {
      for (const it of items) {
        const maen = `${it.morning || "0"}-${it.afternoon || "0"}-${
          it.evening || "0"
        }-${it.night || "0"}`;
        const directions = `${it.dosage} ${it.dose_unit} ${it.route} (${maen}) ${
          it.timing_when
        }${it.instructions ? ". " + it.instructions : ""}`;
        await api("/records/medications", "POST", {
          patient_id: patientId,
          drug_name: it.drug_name,
          dosage: `${it.dosage} ${it.dose_unit}`,
          route: it.route,
          morning: it.morning,
          afternoon: it.afternoon,
          evening: it.evening,
          night: it.night,
          maen,
          timing_when: it.timing_when,
          dose_unit: it.dose_unit,
          dispense_unit: it.dispense_unit,
          period: `${it.period_count} ${it.period_unit}`,
          dispense: `${it.dispense_count} ${it.dispense_unit}`,
          refills: it.refills,
          daw: it.daw,
          start_date: it.start_date,
          end_date: it.end_date,
          directions,
          instructions: it.instructions,
          is_supplement: it.is_supplement,
          provider_id: providerId,
          status: "active",
        });
      }
      notify(`Successfully prescribed ${items.length} item(s)`);
      onSaved();
      if (printAfter) {
        window.print();
      }
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        isSupplementDefault
          ? "Prescribe Dietary Supplements"
          : "Add Prescriptions"
      }
      description="Prescribe medications and supplements with discrete M-A-E-N timing, DAW controls, and pharmacy instructions."
      onClose={onClose}
      wide
    >
      <div className="charm-rx-modal">
        {error && (
          <div className="charm-alert charm-alert-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="charm-rx-header-row">
          <div className="charm-form-group">
            <label>Prescribing Clinician</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="charm-select"
            >
              {staff
                .filter((s) => s.role === "doctor" || s.id === user.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDoctorName(s.name)} ({s.specialty || "Cardiologist"})
                  </option>
                ))}
            </select>
          </div>
          <div className="charm-form-group">
            <label>Pharmacy Notes / Intra-Office Instructions</label>
            <input
              type="text"
              placeholder="e.g. Dispense 1-month supply. Brand Telma required."
              value={pharmacyNotes}
              onChange={(e) => setPharmacyNotes(e.target.value)}
              className="charm-input"
            />
          </div>
        </div>

        <div className="charm-rx-items-list">
          {items.map((item, idx) => (
            <div key={idx} className="charm-rx-card">
              <div className="charm-rx-card-head">
                <span className="charm-rx-num">#{idx + 1}</span>
                <span className="charm-rx-card-title">
                  {item.is_supplement ? "Dietary Supplement" : "Prescription Medication"}
                </span>
                <label className="charm-toggle-label">
                  <input
                    type="checkbox"
                    checked={item.is_supplement}
                    onChange={(e) =>
                      updateItem(idx, { is_supplement: e.target.checked })
                    }
                  />
                  Supplement
                </label>
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className="charm-btn-icon-danger"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  title="Remove this medication"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Drug Autocomplete Search */}
              <div className="charm-rx-drug-row">
                <div className="charm-autocomplete-wrap" style={{ flex: 2 }}>
                  <label>Drug Name / Formulation *</label>
                  <div className="charm-input-search-box">
                    <Search size={15} className="charm-search-icon" />
                    <input
                      type="text"
                      className="charm-input"
                      placeholder="Type drug name (e.g. Telma, Rosuva gold, Diamicron)..."
                      value={item.drug_name}
                      onFocus={() => {
                        setActiveSearchIdx(idx);
                        setSearchQuery(item.drug_name);
                      }}
                      onChange={(e) => {
                        updateItem(idx, { drug_name: e.target.value });
                        setSearchQuery(e.target.value);
                      }}
                    />
                  </div>
                  {activeSearchIdx === idx && catalogs.length > 0 && (
                    <div className="charm-autocomplete-dropdown">
                      {catalogs.slice(0, 8).map((cat) => (
                        <div
                          key={cat.id}
                          className="charm-autocomplete-item"
                          onMouseDown={() => {
                            updateItem(idx, {
                              drug_name: cat.name,
                              instructions: cat.instructions || item.instructions,
                            });
                            setActiveSearchIdx(null);
                          }}
                        >
                          <strong>{cat.name}</strong>
                          <span className="charm-autocomplete-sub">
                            {cat.code ? `[${cat.code}] ` : ""}
                            {cat.notes || "Cardiology formulary"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Dose Qty</label>
                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) => updateItem(idx, { dosage: e.target.value })}
                    className="charm-input"
                    placeholder="e.g. 1, 500, 20"
                  />
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Dose Unit</label>
                  <select
                    value={item.dose_unit}
                    onChange={(e) =>
                      updateItem(idx, {
                        dose_unit: e.target.value,
                        dispense_unit: e.target.value + "s",
                      })
                    }
                    className="charm-select"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="Puff">Puff</option>
                    <option value="Drop">Drop</option>
                    <option value="Sachet">Sachet</option>
                  </select>
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Route</label>
                  <select
                    value={item.route}
                    onChange={(e) => updateItem(idx, { route: e.target.value })}
                    className="charm-select"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Sublingual">Sublingual</option>
                    <option value="Inhalation">Inhalation</option>
                    <option value="Topical">Topical</option>
                    <option value="Subcutaneous">Subcutaneous</option>
                    <option value="Intravenous">Intravenous</option>
                  </select>
                </div>
              </div>

              {/* Discrete M-A-E-N Frequency & Timing */}
              <div className="charm-rx-maen-row">
                <div className="charm-maen-box">
                  <span className="charm-maen-title">Timing (M - A - E - N):</span>
                  <div className="charm-maen-inputs">
                    <div className="charm-maen-col">
                      <small>M (Morn)</small>
                      <input
                        type="text"
                        value={item.morning}
                        onChange={(e) => updateItem(idx, { morning: e.target.value })}
                        className="charm-maen-input"
                      />
                    </div>
                    <span className="charm-maen-sep">-</span>
                    <div className="charm-maen-col">
                      <small>A (Noon)</small>
                      <input
                        type="text"
                        value={item.afternoon}
                        onChange={(e) =>
                          updateItem(idx, { afternoon: e.target.value })
                        }
                        className="charm-maen-input"
                      />
                    </div>
                    <span className="charm-maen-sep">-</span>
                    <div className="charm-maen-col">
                      <small>E (Eve)</small>
                      <input
                        type="text"
                        value={item.evening}
                        onChange={(e) => updateItem(idx, { evening: e.target.value })}
                        className="charm-maen-input"
                      />
                    </div>
                    <span className="charm-maen-sep">-</span>
                    <div className="charm-maen-col">
                      <small>N (Night)</small>
                      <input
                        type="text"
                        value={item.night}
                        onChange={(e) => updateItem(idx, { night: e.target.value })}
                        className="charm-maen-input"
                      />
                    </div>
                  </div>
                  <div className="charm-maen-presets">
                    <button
                      type="button"
                      className="charm-pill-btn"
                      onClick={() =>
                        updateItem(idx, {
                          morning: "1",
                          afternoon: "0",
                          evening: "0",
                          night: "0",
                        })
                      }
                    >
                      OD (1-0-0-0)
                    </button>
                    <button
                      type="button"
                      className="charm-pill-btn"
                      onClick={() =>
                        updateItem(idx, {
                          morning: "1",
                          afternoon: "0",
                          evening: "1",
                          night: "0",
                        })
                      }
                    >
                      BD (1-0-1-0)
                    </button>
                    <button
                      type="button"
                      className="charm-pill-btn"
                      onClick={() =>
                        updateItem(idx, {
                          morning: "1",
                          afternoon: "1",
                          evening: "1",
                          night: "0",
                        })
                      }
                    >
                      TDS (1-1-1-0)
                    </button>
                    <button
                      type="button"
                      className="charm-pill-btn"
                      onClick={() =>
                        updateItem(idx, {
                          morning: "0",
                          afternoon: "0",
                          evening: "0",
                          night: "1",
                        })
                      }
                    >
                      HS (0-0-0-1)
                    </button>
                  </div>
                </div>

                <div className="charm-form-group" style={{ flex: 1.2 }}>
                  <label>When</label>
                  <select
                    value={item.timing_when}
                    onChange={(e) =>
                      updateItem(idx, { timing_when: e.target.value })
                    }
                    className="charm-select"
                  >
                    <option value="After food">After food (Post-prandial)</option>
                    <option value="Before food">Before food (Pre-prandial)</option>
                    <option value="With food">With food</option>
                    <option value="At bedtime">At bedtime (Bedtime)</option>
                    <option value="Empty stomach">Empty stomach</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                </div>
              </div>

              {/* Period, Dispense, Refill & DAW */}
              <div className="charm-rx-dispense-row">
                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Period (Duration)</label>
                  <div className="charm-input-group">
                    <input
                      type="number"
                      min={1}
                      value={item.period_count}
                      onChange={(e) =>
                        updateItem(idx, {
                          period_count: parseInt(e.target.value) || 1,
                        })
                      }
                      className="charm-input"
                    />
                    <select
                      value={item.period_unit}
                      onChange={(e) =>
                        updateItem(idx, { period_unit: e.target.value })
                      }
                      className="charm-select"
                    >
                      <option value="Days">Days</option>
                      <option value="Weeks">Weeks</option>
                      <option value="Months">Months</option>
                    </select>
                  </div>
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Dispense Qty</label>
                  <div className="charm-input-group">
                    <input
                      type="number"
                      min={1}
                      value={item.dispense_count}
                      onChange={(e) =>
                        updateItem(idx, {
                          dispense_count: parseInt(e.target.value) || 1,
                        })
                      }
                      className="charm-input"
                    />
                    <input
                      type="text"
                      value={item.dispense_unit}
                      onChange={(e) =>
                        updateItem(idx, { dispense_unit: e.target.value })
                      }
                      className="charm-input"
                      placeholder="Units"
                    />
                  </div>
                </div>

                <div className="charm-form-group" style={{ flex: 0.8 }}>
                  <label>Refills</label>
                  <select
                    value={item.refills}
                    onChange={(e) =>
                      updateItem(idx, { refills: parseInt(e.target.value) || 0 })
                    }
                    className="charm-select"
                  >
                    <option value={0}>0 (No refills)</option>
                    <option value={1}>1 Refill</option>
                    <option value={2}>2 Refills</option>
                    <option value={3}>3 Refills</option>
                    <option value={5}>5 Refills</option>
                  </select>
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={item.start_date}
                    onChange={(e) => updateItem(idx, { start_date: e.target.value })}
                    className="charm-input"
                  />
                </div>

                <div className="charm-form-group" style={{ flex: 1 }}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={item.end_date}
                    onChange={(e) => updateItem(idx, { end_date: e.target.value })}
                    className="charm-input"
                  />
                </div>

                <div
                  className="charm-form-group"
                  style={{
                    flex: 1.2,
                    display: "flex",
                    alignItems: "center",
                    paddingTop: 18,
                  }}
                >
                  <label className="charm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={item.daw}
                      onChange={(e) => updateItem(idx, { daw: e.target.checked })}
                    />
                    <span>
                      <strong>DAW</strong> (Dispense As Written)
                    </span>
                  </label>
                </div>
              </div>

              {/* Patient Instructions */}
              <div className="charm-rx-instructions-row">
                <label>Patient Instructions / Special Directions</label>
                <input
                  type="text"
                  placeholder="e.g. Take with a full glass of warm water. Monitor blood pressure weekly."
                  value={item.instructions}
                  onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                  className="charm-input"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="charm-rx-add-more-row">
          <button
            type="button"
            className="charm-link-btn"
            onClick={() => addItem(false)}
          >
            <Plus size={15} /> Add Another Medication
          </button>
          <button
            type="button"
            className="charm-link-btn"
            onClick={() => addItem(true)}
          >
            <Plus size={15} /> Add Dietary Supplement
          </button>
        </div>

        <div className="charm-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Printer size={15} style={{ marginRight: 6 }} /> Save & Print Rx
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? "Saving Prescriptions..." : "Save Prescriptions"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function DiscontinueModal({
  medication,
  onClose,
  onSaved,
}: {
  medication: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useApp();
  const [reason, setReason] = useState("Course Completed");
  const [stopDate, setStopDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api(`/records/medications/${medication.id}/status`, "POST", {
        status: "discontinued",
        version: medication.version,
      });
      // also update note with discontinue reason
      await api(`/records/medications/${medication.id}`, "PUT", {
        end_date: stopDate,
        instructions: medication.instructions
          ? `${medication.instructions} [Discontinued on ${stopDate}: ${reason}. ${notes}]`
          : `Discontinued on ${stopDate}: ${reason}. ${notes}`,
      });
      notify("Medication marked as discontinued");
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to discontinue medication");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Discontinue Medication: ${medication.drug_name || medication.trade_name || "Medication"}`}
      description="Mark this medication as discontinued in the patient's active chart. Full history is preserved."
      onClose={onClose}
    >
      <div className="charm-form-grid" style={{ padding: 18 }}>
        <div className="charm-form-group">
          <label>Discontinuation Date</label>
          <input
            type="date"
            value={stopDate}
            onChange={(e) => setStopDate(e.target.value)}
            className="charm-input"
          />
        </div>
        <div className="charm-form-group">
          <label>Discontinuation Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="charm-select"
          >
            <option value="Course Completed">Course Completed</option>
            <option value="Adverse Reaction / Intolerance">
              Adverse Reaction / Intolerance
            </option>
            <option value="Ineffective Therapy">Ineffective Therapy</option>
            <option value="Switched Medication">Switched Medication</option>
            <option value="Cost / Insurance Issue">Cost / Insurance Issue</option>
            <option value="Patient Non-Compliant">Patient Non-Compliant</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="charm-form-group" style={{ gridColumn: "1 / -1" }}>
          <label>Clinical Notes</label>
          <textarea
            rows={3}
            placeholder="Document rationale, substitute drug prescribed, or adverse signs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="charm-input"
          />
        </div>
      </div>
      <div className="charm-modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={saving}>
          {saving ? "Discontinuing..." : "Confirm Discontinue"}
        </Button>
      </div>
    </Modal>
  );
}

export function PrintPrescriptionModal({
  patient,
  medications,
  onClose,
}: {
  patient: Row;
  medications: Row[];
  onClose: () => void;
}) {
  const { staff, user } = useApp();
  const activeMedications = medications.filter((m) => m.status === "active");

  return (
    <Modal
      title="Print Prescription Slip"
      description="Preview and print official clinic prescription sheet."
      onClose={onClose}
      wide
    >
      <div className="charm-print-container" id="charm-printable-rx">
        <div className="charm-rx-paper">
          <div className="charm-rx-paper-header">
            <div>
              <h2 style={{ margin: 0, color: "#006699", fontSize: 20 }}>
                HEAL YOUR HEART
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 12,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Vaso-Meditech Advanced EECP Heart Treatment Centre
              </p>
              <small style={{ color: "#475569" }}>
                Licensed Cardiology & Non-Invasive EECP Day-Care Clinic · Chennai
              </small>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#475569" }}>
              <strong>Date:</strong> {day(today())}
              <br />
              <strong>Rx ID:</strong> RX-{patient.mrn || "HEAL"}-
              {new Date().getTime().toString().slice(-4)}
            </div>
          </div>

          <div className="charm-rx-patient-box">
            <div className="charm-rx-pat-col">
              <strong>Patient:</strong> {patient.name}
            </div>
            <div className="charm-rx-pat-col">
              <strong>MRN:</strong> {patient.mrn || "—"}
            </div>
            <div className="charm-rx-pat-col">
              <strong>Age / Sex:</strong> {patient.age || "—"} yrs /{" "}
              {patient.sex || "—"}
            </div>
            <div className="charm-rx-pat-col">
              <strong>Phone:</strong> {patient.phone || "—"}
            </div>
          </div>

          <div className="charm-rx-body">
            <div className="charm-rx-symbol">℞</div>
            <table className="charm-rx-table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Drug Name & Strength</th>
                  <th style={{ width: "20%" }}>Dosage / Timing (M-A-E-N)</th>
                  <th style={{ width: "20%" }}>When & Route</th>
                  <th style={{ width: "15%" }}>Duration / Qty</th>
                  <th style={{ width: "10%" }}>DAW</th>
                </tr>
              </thead>
              <tbody>
                {activeMedications.map((m, idx) => (
                  <tr key={m.id || idx}>
                    <td>
                      <strong>{m.drug_name || m.trade_name || "Medication"}</strong>
                      {(m.dosage || m.dose) && (
                        <span style={{ fontSize: 11, color: "#475569", marginLeft: 6 }}>
                          · {m.dosage || m.dose}
                        </span>
                      )}
                      {m.instructions && (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                          {m.instructions}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="charm-badge charm-badge-maen">
                        {m.maen ||
                          `${m.morning || 0}-${m.afternoon || 0}-${
                            m.evening || 0
                          }-${m.night || 0}`}
                      </span>
                      <div style={{ fontSize: 11, marginTop: 2 }}>{m.dosage}</div>
                    </td>
                    <td>
                      {m.timing_when || "After food"}
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {m.route || "Oral"}
                      </div>
                    </td>
                    <td>
                      {m.period || "30 Days"}
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Disp: {m.dispense || "30"}
                      </div>
                    </td>
                    <td>
                      {m.daw ? (
                        <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                          DAW
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="charm-rx-footer-box">
            <div style={{ fontSize: 11, color: "#64748b" }}>
              * Please take medications exactly as prescribed. Do not stop abruptly.
              <br />* For emergencies or adverse symptoms, call clinic emergency
              hotline.
            </div>
            <div className="charm-rx-sig-box">
              <div style={{ borderBottom: "1px solid #94a3b8", width: 180, marginBottom: 4 }} />
              <strong>{formatDoctorName(user.name)}</strong>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Cardiologist / EECP Specialist
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="charm-modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={15} style={{ marginRight: 6 }} /> Print Prescription
        </Button>
      </div>
    </Modal>
  );
}

export function MedicationsSection({
  patient,
  medications = [],
  writable,
  onRefresh,
}: {
  patient: Row;
  medications: Row[];
  writable: boolean;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"Medications" | "Supplements">("Medications");
  const [statusFilter, setStatusFilter] = useState<"active" | "discontinued" | "all">("active");
  const [modal, setModal] = useState<"" | "add" | "supplement" | "discontinue" | "print">("");
  const [selectedMed, setSelectedMed] = useState<Row | null>(null);

  const filteredMeds = useMemo(() => {
    return medications.filter((m) => {
      // supplement filter
      const isSupp = !!m.is_supplement;
      if (subTab === "Supplements" && !isSupp) return false;
      if (subTab === "Medications" && isSupp) return false;
      // status filter
      if (statusFilter === "active" && m.status !== "active") return false;
      if (statusFilter === "discontinued" && m.status !== "discontinued") return false;
      return true;
    });
  }, [medications, subTab, statusFilter]);

  const activeCount = medications.filter((m) => m.status === "active" && !m.is_supplement).length;
  const suppCount = medications.filter((m) => m.status === "active" && m.is_supplement).length;

  return (
    <div className="charm-clinical-section">
      {/* Subtabs & Action Bar */}
      <div className="charm-section-header">
        <div className="charm-subtabs">
          <button
            type="button"
            className={`charm-subtab-btn ${subTab === "Medications" ? "active" : ""}`}
            onClick={() => setSubTab("Medications")}
          >
            <Pill size={15} /> Medications ({activeCount})
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${subTab === "Supplements" ? "active" : ""}`}
            onClick={() => setSubTab("Supplements")}
          >
            <Activity size={15} /> Supplements ({suppCount})
          </button>
        </div>

        <div className="charm-actions-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="charm-select-sm"
          >
            <option value="active">Active {subTab}</option>
            <option value="discontinued">Discontinued</option>
            <option value="all">All Records</option>
          </select>

          <Button
            variant="secondary"
            onClick={() => setModal("print")}
            title="Print Rx"
          >
            <Printer size={14} style={{ marginRight: 4 }} /> Print Rx
          </Button>

          {writable && (
            <>
              <Button
                variant="secondary"
                onClick={() => setModal("supplement")}
                title="Add Supplement"
              >
                Supplement
              </Button>
              <Button
                variant="primary"
                onClick={() => setModal("add")}
                title="Prescribe Medication"
                aria-label="+ Medication"
              >
                <Plus size={15} style={{ marginRight: 4 }} /> Medication
              </Button>
            </>
          )}
        </div>
      </div>

      {/* CharmHealth Medications Table */}
      <div className="charm-table-card">
        <table className="charm-data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" aria-label="Select all" />
              </th>
              <th>Drug Details</th>
              <th>Timing & Directions</th>
              <th>Period & Dispense</th>
              <th>Dates</th>
              <th>Prescribed By</th>
              <th>Status</th>
              {writable && <th style={{ width: 100, textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredMeds.length === 0 ? (
              <tr>
                <td colSpan={writable ? 8 : 7} className="charm-empty-cell">
                  <div className="charm-empty-state">
                    <Pill size={28} className="charm-empty-icon" />
                    <strong>No {subTab.toLowerCase()} found</strong>
                    <p>
                      {statusFilter === "active"
                        ? `No active ${subTab.toLowerCase()} recorded for this patient.`
                        : `No ${statusFilter} ${subTab.toLowerCase()} records.`}
                    </p>
                    {writable && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          setModal(subTab === "Supplements" ? "supplement" : "add")
                        }
                      >
                        <Plus size={15} style={{ marginRight: 4 }} /> Add {subTab === "Supplements" ? "Supplement" : "Medication"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredMeds.map((med) => (
                <tr key={med.id} className={med.status === "discontinued" ? "charm-row-dimmed" : ""}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${med.drug_name || med.trade_name || "Medication"}`} />
                  </td>
                  <td>
                    <div className="charm-drug-cell">
                      <div className="charm-drug-title">
                        <span className="charm-rx-tag">℞</span>
                        <strong className="charm-drug-main-name">
                          {med.drug_name || med.trade_name || med.name || "Prescribed Medication"}
                        </strong>
                        {med.daw && <span className="charm-daw-badge">DAW</span>}
                        {med.is_supplement && (
                          <span className="charm-supp-badge">SUPPLEMENT</span>
                        )}
                      </div>
                      {med.generic_name && (
                        <div className="charm-drug-generic">
                          {med.generic_name}
                        </div>
                      )}
                      <div className="charm-drug-sub">
                        {(med.dosage || med.dose) ? `${med.dosage || med.dose} · ` : ""}Route: {med.route || "Oral"}
                      </div>
                      {med.instructions && (
                        <div className="charm-drug-instructions">
                          {med.instructions}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="charm-timing-cell">
                      <span className="charm-maen-badge">
                        {med.maen ||
                          `${med.morning || 0}-${med.afternoon || 0}-${
                            med.evening || 0
                          }-${med.night || 0}`}
                      </span>
                      <span className="charm-timing-when">
                        {med.timing_when || "After food"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="charm-dispense-cell">
                      <div>
                        <strong>{med.period || (med.duration_days ? `${med.duration_days} Days` : "30 Days")}</strong>
                      </div>
                      <div className="charm-text-muted">
                        Disp: {med.dispense || (med.quantity ? `${med.quantity} ${med.dispense_unit || "Tablets"}` : "—")} · Refills: {med.refills ?? 0}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="charm-dates-cell">
                      <div>Start: {med.start_date ? day(med.start_date) : "—"}</div>
                      <div className="charm-text-muted">
                        End: {med.end_date ? day(med.end_date) : "—"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="charm-text-primary">
                      {med.provider_name ? formatDoctorName(med.provider_name) : "Cardiology Team"}
                    </div>
                    <small className="charm-text-muted">
                      {med.created_at ? day(med.created_at) : "—"}
                    </small>
                  </td>
                  <td>
                    <Badge value={med.status || "active"} />
                  </td>
                  {writable && (
                    <td style={{ textAlign: "right" }}>
                      <div className="charm-action-buttons">
                        {med.status === "active" && (
                          <button
                            type="button"
                            className="charm-btn-icon"
                            title="Discontinue Medication"
                            onClick={() => {
                              setSelectedMed(med);
                              setModal("discontinue");
                            }}
                          >
                            <X size={15} style={{ color: "#e11d48" }} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="charm-btn-icon-danger"
                          title="Delete Record"
                          onClick={async () => {
                            if (confirm(`Delete ${med.drug_name || med.trade_name || "Medication"}?`)) {
                              await api(`/records/medications/${med.id}`, "DELETE");
                              onRefresh();
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal === "add" && (
        <AddPrescriptionModal
          patientId={patient.id}
          isSupplementDefault={false}
          onClose={() => setModal("")}
          onSaved={onRefresh}
        />
      )}

      {modal === "supplement" && (
        <AddPrescriptionModal
          patientId={patient.id}
          isSupplementDefault={true}
          onClose={() => setModal("")}
          onSaved={onRefresh}
        />
      )}

      {modal === "discontinue" && selectedMed && (
        <DiscontinueModal
          medication={selectedMed}
          onClose={() => {
            setModal("");
            setSelectedMed(null);
          }}
          onSaved={onRefresh}
        />
      )}

      {modal === "print" && (
        <PrintPrescriptionModal
          patient={patient}
          medications={medications}
          onClose={() => setModal("")}
        />
      )}
    </div>
  );
}

// ============================================================================
// 2. INJECTIONS ADMINISTRATION WORKFLOW (CharmHealth Frame 60)
// ============================================================================

export function AddInjectionModal({
  patientId,
  onClose,
  onSaved,
}: {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { staff, user, notify } = useApp();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("2.5 mg / 0.5 ml");
  const [route, setRoute] = useState("Subcutaneous (SC)");
  const [site, setSite] = useState("Abdomen - Upper Left");
  const [lotNumber, setLotNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [frequency, setFrequency] = useState("Once / Stat");
  const [period, setPeriod] = useState("1 Day");
  const [administeredBy, setAdministeredBy] = useState(user.id);
  const [administeredAt, setAdministeredAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [nurseNotes, setNurseNotes] = useState("");
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState("administered");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Injection formulary catalog
  const { data: catalogs = [] } = useQuery<Row[]>({
    queryKey: ["catalogs", "injection", searchQuery],
    queryFn: () =>
      api<Row[]>(
        `/catalogs?kind=injection${
          searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
        }`
      ),
    staleTime: 60000,
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please specify the injection or product name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/records/injections", "POST", {
        patient_id: patientId,
        name,
        dosage,
        route,
        site,
        lot_number: lotNumber,
        expiration_date: expirationDate || null,
        frequency,
        period,
        administered_by: administeredBy,
        administered_at: administeredAt ? administeredAt + ":00+05:30" : null,
        nurse_notes: nurseNotes,
        comments,
        status,
      });
      notify("Injection administration recorded successfully.");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to record injection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add Injection"
      description="Record injection administration with batch/lot tracking, anatomical site, and nurse notes."
      onClose={onClose}
      wide
    >
      <div className="charm-modal-form">
        {error && (
          <div className="charm-alert charm-alert-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="charm-form-grid">
          {/* Drug name with autocomplete */}
          <div className="charm-form-group charm-autocomplete-wrap" style={{ gridColumn: "1 / -1" }}>
            <label>Medication / Product Name *</label>
            <div className="charm-input-search-box">
              <Search size={15} className="charm-search-icon" />
              <input
                type="text"
                placeholder="Search or enter injection name (e.g. Fondaflo 2.5, Clexane, Tresiba)..."
                value={name}
                onFocus={() => {
                  setShowDropdown(true);
                  setSearchQuery(name);
                }}
                onChange={(e) => {
                  setName(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="charm-input"
              />
            </div>
            {showDropdown && catalogs.length > 0 && (
              <div className="charm-autocomplete-dropdown">
                {catalogs.map((cat) => (
                  <div
                    key={cat.id}
                    className="charm-autocomplete-item"
                    onMouseDown={() => {
                      setName(cat.name);
                      if (cat.notes) setDosage(cat.notes);
                      setShowDropdown(false);
                    }}
                  >
                    <strong>{cat.name}</strong>
                    <span className="charm-autocomplete-sub">
                      {cat.code ? `[${cat.code}] ` : ""}
                      {cat.notes || "Cardiology Injection"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="charm-form-group">
            <label>Dosage & Strength *</label>
            <input
              type="text"
              placeholder="e.g. 2.5 mg / 0.5 ml, 10 units"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Route *</label>
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="charm-select"
            >
              <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
              <option value="Intramuscular (IM)">Intramuscular (IM)</option>
              <option value="Intravenous (IV)">Intravenous (IV)</option>
              <option value="Intradermal (ID)">Intradermal (ID)</option>
              <option value="IV Infusion">IV Infusion</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Administration Site *</label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="charm-select"
            >
              <option value="Deltoid - Left">Deltoid - Left</option>
              <option value="Deltoid - Right">Deltoid - Right</option>
              <option value="Gluteal - Left">Gluteal - Left</option>
              <option value="Gluteal - Right">Gluteal - Right</option>
              <option value="Abdomen - Upper Left">Abdomen - Upper Left</option>
              <option value="Abdomen - Upper Right">Abdomen - Upper Right</option>
              <option value="Abdomen - Lower Left">Abdomen - Lower Left</option>
              <option value="Abdomen - Lower Right">Abdomen - Lower Right</option>
              <option value="Vastus Lateralis - Left">Vastus Lateralis - Left</option>
              <option value="Vastus Lateralis - Right">Vastus Lateralis - Right</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Batch / Lot Number</label>
            <input
              type="text"
              placeholder="e.g. LOT-FND-8821A"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Expiration Date</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="charm-select"
            >
              <option value="Once / Stat">Once / Stat</option>
              <option value="Daily">Daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Weekly">Weekly</option>
              <option value="PRN (As Needed)">PRN (As Needed)</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Period / Duration</label>
            <input
              type="text"
              placeholder="e.g. 1 Day, 5 Days"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Administered Date & Time</label>
            <input
              type="datetime-local"
              value={administeredAt}
              onChange={(e) => setAdministeredAt(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Administered By</label>
            <select
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              className="charm-select"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div className="charm-form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="charm-select"
            >
              <option value="administered">Administered (Given)</option>
              <option value="ordered">Ordered (Pending Administration)</option>
            </select>
          </div>

          <div className="charm-form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Nurse Notes & Injection Reaction Observations</label>
            <textarea
              rows={2}
              placeholder="e.g. Injected into left deltoid without resistance. No redness, swelling, or immediate adverse reaction noted. Patient tolerated well."
              value={nurseNotes}
              onChange={(e) => setNurseNotes(e.target.value)}
              className="charm-input"
            />
          </div>
        </div>

        <div className="charm-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Recording Injection..." : "Record Injection"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function InjectionsSection({
  patient,
  injections = [],
  writable,
  onRefresh,
}: {
  patient: Row;
  injections: Row[];
  writable: boolean;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"Injections" | "Injection Orders">("Injections");
  const [modal, setModal] = useState<"" | "add">("");

  const filtered = useMemo(() => {
    if (subTab === "Injection Orders") {
      return injections.filter((i) => i.status === "ordered");
    }
    return injections;
  }, [injections, subTab]);

  return (
    <div className="charm-clinical-section">
      <div className="charm-section-header">
        <div className="charm-subtabs">
          <button
            type="button"
            className={`charm-subtab-btn ${subTab === "Injections" ? "active" : ""}`}
            onClick={() => setSubTab("Injections")}
          >
            <Syringe size={15} /> Injections ({injections.length})
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${
              subTab === "Injection Orders" ? "active" : ""
            }`}
            onClick={() => setSubTab("Injection Orders")}
          >
            <FileText size={15} /> Injection Orders (
            {injections.filter((i) => i.status === "ordered").length})
          </button>
        </div>

        <div className="charm-actions-group">
          <Button variant="secondary" onClick={() => alert("Injection protocol templates: Fondaflo SC, Clexane DVT Prophylaxis, Insulin Titration.")}>
            Templates
          </Button>
          {writable && (
            <Button variant="primary" onClick={() => setModal("add")} aria-label="+ Injection">
              <Plus size={15} style={{ marginRight: 4 }} /> Injection
            </Button>
          )}
        </div>
      </div>

      <div className="charm-table-card">
        <table className="charm-data-table">
          <thead>
            <tr>
              <th>Administered Date / Time</th>
              <th>Medication & Dosage</th>
              <th>Route & Site</th>
              <th>Batch / Lot & Expiry</th>
              <th>Administered By</th>
              <th>Status</th>
              <th>Nurse Notes</th>
              {writable && <th style={{ width: 80, textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={writable ? 8 : 7} className="charm-empty-cell">
                  <div className="charm-empty-state">
                    <Syringe size={28} className="charm-empty-icon" />
                    <strong>No injections recorded</strong>
                    <p>Injections, subcutaneous anticoagulants, and infusions appear here.</p>
                    {writable && (
                      <Button variant="primary" onClick={() => setModal("add")}>
                        <Plus size={15} style={{ marginRight: 4 }} /> Add Injection
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inj) => (
                <tr key={inj.id}>
                  <td>
                    <div>
                      <strong>
                        {inj.administered_at
                          ? dateTime(inj.administered_at)
                          : inj.created_at
                          ? dateTime(inj.created_at)
                          : "—"}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <div className="charm-drug-cell">
                      <strong className="charm-drug-main-name">{inj.name || inj.product_name || "Injection"}</strong>
                      <div className="charm-drug-sub">{inj.dosage || inj.dose || ""}</div>
                      {inj.frequency && (
                        <span className="charm-pill-tag">{inj.frequency}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <strong>{inj.route}</strong>
                    </div>
                    <div className="charm-text-muted">{inj.site || "—"}</div>
                  </td>
                  <td>
                    <div>Lot: {inj.lot_number || "—"}</div>
                    <small className="charm-text-muted">
                      Exp: {inj.expiration_date ? day(inj.expiration_date) : "—"}
                    </small>
                  </td>
                  <td>
                    <div>{inj.administered_by_name ? formatDoctorName(inj.administered_by_name) : "Nurse Staff"}</div>
                    <small className="charm-text-muted">
                      {inj.administered_by_role || "Staff"}
                    </small>
                  </td>
                  <td>
                    <Badge value={inj.status || "administered"} />
                  </td>
                  <td>
                    <div className="charm-notes-cell" title={inj.nurse_notes || ""}>
                      {inj.nurse_notes || "—"}
                    </div>
                  </td>
                  {writable && (
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="charm-btn-icon-danger"
                        title="Delete record"
                        onClick={async () => {
                          if (confirm(`Delete injection record for ${inj.name}?`)) {
                            await api(`/records/injections/${inj.id}`, "DELETE");
                            onRefresh();
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal === "add" && (
        <AddInjectionModal
          patientId={patient.id}
          onClose={() => setModal("")}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ============================================================================
// 3. VACCINES & IMMUNIZATIONS WORKFLOW (CharmHealth Frame 74 & 84)
// ============================================================================

export function AddVaccineModal({
  patientId,
  initialMode = "administered",
  onClose,
  onSaved,
}: {
  patientId: string;
  initialMode?: "administered" | "historical" | "ordered";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { staff, user, notify } = useApp();
  const [name, setName] = useState("");
  const [cvxCode, setCvxCode] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [doseInSeries, setDoseInSeries] = useState("Annual Booster");
  const [dosage, setDosage] = useState("0.5 ml");
  const [route, setRoute] = useState("Intramuscular (IM)");
  const [site, setSite] = useState("Deltoid - Left");
  const [administeredBy, setAdministeredBy] = useState(user.id);
  const [orderedBy, setOrderedBy] = useState(
    staff.find((s) => s.role === "doctor")?.id || user.id
  );
  const [administeredAt, setAdministeredAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [visGivenDate, setVisGivenDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Vaccines catalog
  const { data: catalogs = [] } = useQuery<Row[]>({
    queryKey: ["catalogs", "vaccine", searchQuery],
    queryFn: () =>
      api<Row[]>(
        `/catalogs?kind=vaccine${
          searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
        }`
      ),
    staleTime: 60000,
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please select or enter the vaccine name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/records/vaccines", "POST", {
        patient_id: patientId,
        name,
        cvx_code: cvxCode,
        manufacturer,
        lot_number: lotNumber,
        expiration_date: expirationDate || null,
        dose_in_series: doseInSeries,
        dosage,
        route,
        site,
        administered_by: administeredBy,
        ordered_by: orderedBy,
        administered_at: administeredAt ? administeredAt + ":00+05:30" : null,
        vis_given_date: visGivenDate || null,
        notes,
        status,
      });
      notify("Vaccination record successfully stored.");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to record vaccine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        status === "historical"
          ? "Add Historical Vaccine"
          : status === "ordered"
          ? "Order Vaccine"
          : "Add Vaccine"
      }
      description="Record CDC/CVX-coded immunizations with lot numbers, VIS documentation, and dose series."
      onClose={onClose}
      wide
    >
      <div className="charm-modal-form">
        {error && (
          <div className="charm-alert charm-alert-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="charm-mode-selector">
          <button
            type="button"
            className={`charm-mode-pill ${status === "administered" ? "active" : ""}`}
            onClick={() => setStatus("administered")}
          >
            Administer Now
          </button>
          <button
            type="button"
            className={`charm-mode-pill ${status === "historical" ? "active" : ""}`}
            onClick={() => setStatus("historical")}
          >
            Historical Record
          </button>
          <button
            type="button"
            className={`charm-mode-pill ${status === "ordered" ? "active" : ""}`}
            onClick={() => setStatus("ordered")}
          >
            Order Vaccine
          </button>
        </div>

        <div className="charm-form-grid">
          {/* Autocomplete Vaccine */}
          <div className="charm-form-group charm-autocomplete-wrap" style={{ gridColumn: "1 / -1" }}>
            <label>Vaccine Name / CVX *</label>
            <div className="charm-input-search-box">
              <Search size={15} className="charm-search-icon" />
              <input
                type="text"
                placeholder="Search or enter vaccine name (e.g. Influenza quadrivalent, PCV20, PPSV23, Tdap)..."
                value={name}
                onFocus={() => {
                  setShowDropdown(true);
                  setSearchQuery(name);
                }}
                onChange={(e) => {
                  setName(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className="charm-input"
              />
            </div>
            {showDropdown && catalogs.length > 0 && (
              <div className="charm-autocomplete-dropdown">
                {catalogs.map((cat) => (
                  <div
                    key={cat.id}
                    className="charm-autocomplete-item"
                    onMouseDown={() => {
                      setName(cat.name);
                      if (cat.code) setCvxCode(cat.code);
                      if (cat.notes) setManufacturer(cat.notes);
                      setShowDropdown(false);
                    }}
                  >
                    <strong>{cat.name}</strong>
                    <span className="charm-autocomplete-sub">
                      {cat.code ? `[CVX: ${cat.code}] ` : ""}
                      {cat.notes || "Adult Immunization"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="charm-form-group">
            <label>CVX Code</label>
            <input
              type="text"
              placeholder="e.g. 150, 216, 33"
              value={cvxCode}
              onChange={(e) => setCvxCode(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Manufacturer</label>
            <input
              type="text"
              placeholder="e.g. Sanofi Pasteur, Pfizer, GSK"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Lot / Batch Number</label>
            <input
              type="text"
              placeholder="e.g. UJ8902A"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Expiration Date</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Dose in Series</label>
            <select
              value={doseInSeries}
              onChange={(e) => setDoseInSeries(e.target.value)}
              className="charm-select"
            >
              <option value="Single Dose (1 of 1)">Single Dose (1 of 1)</option>
              <option value="Dose 1 of 2">Dose 1 of 2</option>
              <option value="Dose 2 of 2">Dose 2 of 2</option>
              <option value="Annual Booster">Annual Booster</option>
              <option value="Booster 1">Booster 1</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Dose Amount</label>
            <input
              type="text"
              placeholder="e.g. 0.5 ml"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Route</label>
            <select
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              className="charm-select"
            >
              <option value="Intramuscular (IM)">Intramuscular (IM)</option>
              <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
              <option value="Intranasal">Intranasal</option>
              <option value="Oral">Oral</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Administration Site</label>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="charm-select"
            >
              <option value="Deltoid - Left">Deltoid - Left</option>
              <option value="Deltoid - Right">Deltoid - Right</option>
              <option value="Anterolateral Thigh - Left">
                Anterolateral Thigh - Left
              </option>
              <option value="Anterolateral Thigh - Right">
                Anterolateral Thigh - Right
              </option>
              <option value="Nasal Mucosa">Nasal Mucosa</option>
            </select>
          </div>

          <div className="charm-form-group">
            <label>Administered Date & Time</label>
            <input
              type="datetime-local"
              value={administeredAt}
              onChange={(e) => setAdministeredAt(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group">
            <label>Administered By</label>
            <select
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              className="charm-select"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDoctorName(s.name)} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div className="charm-form-group">
            <label>Ordered By (Clinician)</label>
            <select
              value={orderedBy}
              onChange={(e) => setOrderedBy(e.target.value)}
              className="charm-select"
            >
              {staff
                .filter((s) => s.role === "doctor" || s.id === user.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDoctorName(s.name)}
                  </option>
                ))}
            </select>
          </div>

          <div className="charm-form-group">
            <label>VIS Date Provided</label>
            <input
              type="date"
              value={visGivenDate}
              onChange={(e) => setVisGivenDate(e.target.value)}
              className="charm-input"
            />
          </div>

          <div className="charm-form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Adverse Reaction / Clinical Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. VIS information sheet handed to patient. No immediate acute allergic symptoms observed during 15-min waiting window."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="charm-input"
            />
          </div>
        </div>

        <div className="charm-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving Vaccine..." : "Record Vaccine"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function VaccinesSection({
  patient,
  vaccines = [],
  writable,
  onRefresh,
}: {
  patient: Row;
  vaccines: Row[];
  writable: boolean;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"Vaccine" | "Vaccine Orders">("Vaccine");
  const [modal, setModal] = useState<"" | "administered" | "historical" | "ordered">("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    if (subTab === "Vaccine Orders") {
      return vaccines.filter((v) => v.status === "ordered");
    }
    return vaccines;
  }, [vaccines, subTab]);

  return (
    <div className="charm-clinical-section">
      <div className="charm-section-header">
        <div className="charm-subtabs">
          <button
            type="button"
            className={`charm-subtab-btn ${subTab === "Vaccine" ? "active" : ""}`}
            onClick={() => setSubTab("Vaccine")}
          >
            <ShieldAlert size={15} /> Vaccines ({vaccines.length})
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${
              subTab === "Vaccine Orders" ? "active" : ""
            }`}
            onClick={() => setSubTab("Vaccine Orders")}
          >
            <FileText size={15} /> Vaccine Orders (
            {vaccines.filter((v) => v.status === "ordered").length})
          </button>
        </div>

        <div className="charm-actions-group">
          <Button
            variant="secondary"
            onClick={() =>
              alert("Recommended Cardiology Immunizations:\n1. Influenza Quadrivalent (Annual)\n2. Pneumococcal (PCV20 / PPSV23)\n3. COVID-19 Booster\n4. Tdap (Every 10 years)")
            }
          >
            Vaccine Chart
          </Button>

          {writable && (
            <div style={{ position: "relative" }}>
              <Button
                variant="primary"
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
              >
                <Plus size={15} style={{ marginRight: 4 }} /> Add ▾
              </Button>
              {plusMenuOpen && (
                <div
                  className="charm-dropdown-menu"
                  onMouseLeave={() => setPlusMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="charm-dropdown-item"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setModal("administered");
                    }}
                  >
                    Add Current Vaccine
                  </button>
                  <button
                    type="button"
                    className="charm-dropdown-item"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setModal("historical");
                    }}
                  >
                    Add Historical Vaccine
                  </button>
                  <button
                    type="button"
                    className="charm-dropdown-item"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setModal("ordered");
                    }}
                  >
                    Add Vaccine Order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="charm-table-card">
        <table className="charm-data-table">
          <thead>
            <tr>
              <th>Vaccine Name & CVX</th>
              <th>Administered Date / Time</th>
              <th>Dose in Series</th>
              <th>Route & Site</th>
              <th>Lot / Exp</th>
              <th>Administered By</th>
              <th>Status</th>
              {writable && <th style={{ width: 80, textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={writable ? 8 : 7} className="charm-empty-cell">
                  <div className="charm-empty-state">
                    <ShieldAlert size={28} className="charm-empty-icon" />
                    <strong>No vaccines recorded</strong>
                    <p>Cardiology and routine adult immunizations appear here.</p>
                    {writable && (
                      <Button variant="primary" onClick={() => setModal("administered")}>
                        <Plus size={15} style={{ marginRight: 4 }} /> Add Current Vaccine
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="charm-drug-cell">
                      <strong className="charm-drug-main-name">{v.name || v.vaccine_name || "Vaccine"}</strong>
                      <div className="charm-drug-sub">
                        {v.cvx_code ? `CVX: ${v.cvx_code} · ` : ""}
                        {v.manufacturer || "Adult Immunization"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>
                      {v.administered_at
                        ? dateTime(v.administered_at)
                        : v.created_at
                        ? dateTime(v.created_at)
                        : "—"}
                    </strong>
                  </td>
                  <td>
                    <div>{v.dose_in_series || "Single Dose"}</div>
                    <small className="charm-text-muted">{v.dosage || v.dose || "0.5 ml"}</small>
                  </td>
                  <td>
                    <div>{v.route}</div>
                    <small className="charm-text-muted">{v.site || "—"}</small>
                  </td>
                  <td>
                    <div>Lot: {v.lot_number || "—"}</div>
                    <small className="charm-text-muted">
                      Exp: {v.expiration_date ? day(v.expiration_date) : "—"}
                    </small>
                  </td>
                  <td>
                    <div>{v.administered_by_name ? formatDoctorName(v.administered_by_name) : "Clinical Team"}</div>
                  </td>
                  <td>
                    <Badge value={v.status || "administered"} />
                  </td>
                  {writable && (
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="charm-btn-icon-danger"
                        title="Delete vaccine record"
                        onClick={async () => {
                          if (confirm(`Delete vaccine record for ${v.name}?`)) {
                            await api(`/records/vaccines/${v.id}`, "DELETE");
                            onRefresh();
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <AddVaccineModal
          patientId={patient.id}
          initialMode={modal}
          onClose={() => setModal("")}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ============================================================================
// 4. VITALS OBSERVATIONS WORKFLOW (CharmHealth Frame 54)
// ============================================================================

export function AddVitalsModal({
  patientId,
  encounterId,
  onClose,
  onSaved,
}: {
  patientId: string;
  encounterId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useApp();
  const [observedAt, setObservedAt] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );

  // Height & Weight units
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft_in">("cm");
  const [heightCm, setHeightCm] = useState<string>("172");
  const [heightFt, setHeightFt] = useState<string>("5");
  const [heightIn, setHeightIn] = useState<string>("8");

  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightKg, setWeightKg] = useState<string>("74");
  const [weightLbs, setWeightLbs] = useState<string>("163");

  // Blood Pressure
  const [bpSys, setBpSys] = useState<string>("124");
  const [bpDia, setBpDia] = useState<string>("78");
  const [bpPosition, setBpPosition] = useState<string>("Sitting");
  const [bpSite, setBpSite] = useState<string>("Left Arm");

  // Pulse & Respiration
  const [pulse, setPulse] = useState<string>("72");
  const [pulseRhythm, setPulseRhythm] = useState<string>("Regular");
  const [respiration, setRespiration] = useState<string>("16");
  const [respirationPattern, setRespirationPattern] = useState<string>("Normal");

  // SpO2 & Temp
  const [spo2, setSpo2] = useState<string>("98");
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");
  const [tempVal, setTempVal] = useState<string>("98.4");
  const [tempSite, setTempSite] = useState<string>("Oral");
  const [painScore, setPainScore] = useState<number>(0);

  // Specialized EECP & Cardiology Vitals
  const [centralSys, setCentralSys] = useState<string>("118");
  const [centralDia, setCentralDia] = useState<string>("76");
  const [crPwv, setCrPwv] = useState<string>("7.8");
  const [cfPwv, setCfPwv] = useState<string>("8.2");
  const [vascularAge, setVascularAge] = useState<string>("54");
  const [aix, setAix] = useState<string>("24");
  const [bloodSugar, setBloodSugar] = useState<string>("110");
  const [bloodSugarContext, setBloodSugarContext] = useState<string>("Fasting");
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute Height in CM
  const calculatedHeightCm = useMemo(() => {
    if (heightUnit === "cm") {
      return parseFloat(heightCm) || 0;
    }
    const ft = parseFloat(heightFt) || 0;
    const inch = parseFloat(heightIn) || 0;
    return Math.round((ft * 12 + inch) * 2.54);
  }, [heightUnit, heightCm, heightFt, heightIn]);

  // Compute Weight in KG
  const calculatedWeightKg = useMemo(() => {
    if (weightUnit === "kg") {
      return parseFloat(weightKg) || 0;
    }
    const lbs = parseFloat(weightLbs) || 0;
    return Math.round((lbs * 0.453592) * 10) / 10;
  }, [weightUnit, weightKg, weightLbs]);

  // Dynamic Live BMI Calculation
  const computedBmi = useMemo(() => {
    if (calculatedHeightCm > 0 && calculatedWeightKg > 0) {
      const hM = calculatedHeightCm / 100;
      const b = calculatedWeightKg / (hM * hM);
      return Math.round(b * 10) / 10;
    }
    return 0;
  }, [calculatedHeightCm, calculatedWeightKg]);

  const bmiClassification = useMemo(() => {
    if (!computedBmi) return null;
    if (computedBmi < 18.5) return { label: "Underweight", color: "#d97706" };
    if (computedBmi < 25) return { label: "Normal Weight", color: "#16a34a" };
    if (computedBmi < 30) return { label: "Overweight", color: "#ea580c" };
    return { label: "Obese (Class I/II)", color: "#dc2626" };
  }, [computedBmi]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Row = {
        patient_id: patientId,
        observed_at: observedAt ? observedAt + ":00+05:30" : null,
        height_cm: calculatedHeightCm || null,
        weight_kg: calculatedWeightKg || null,
        bmi: computedBmi || null,
        bp_sys: parseInt(bpSys) || null,
        bp_dia: parseInt(bpDia) || null,
        pulse_bpm: parseInt(pulse) || null,
        spo2_pct: parseInt(spo2) || null,
        temp_f:
          tempUnit === "F"
            ? parseFloat(tempVal) || null
            : Math.round(((parseFloat(tempVal) * 9) / 5 + 32) * 10) / 10 || null,
        pain_scale: painScore,
        resp_rate: parseInt(respiration) || null,
        central_bp_sys: parseInt(centralSys) || null,
        central_bp_dia: parseInt(centralDia) || null,
        cr_pwv: parseFloat(crPwv) || null,
        cf_pwv: parseFloat(cfPwv) || null,
        vascular_age: parseInt(vascularAge) || null,
        augmentation_index: parseFloat(aix) || null,
        blood_sugar: parseInt(bloodSugar) || null,
        blood_sugar_context: bloodSugarContext,
        notes: notes
          ? `${notes} [BP: ${bpPosition}, ${bpSite}; Pulse: ${pulseRhythm}; Temp: ${tempSite}]`
          : `BP: ${bpPosition}, ${bpSite}; Pulse: ${pulseRhythm}; Temp: ${tempSite}`,
      };
      if (encounterId) payload.encounter_id = encounterId;

      await api("/records/vitals", "POST", payload);
      notify("Vitals observations saved successfully.");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save vitals");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add Vitals Observation"
      description="Record multi-metric vitals with live dynamic BMI auto-calculation and cardiology hemodynamics."
      onClose={onClose}
      wide
    >
      <div className="charm-modal-form">
        {error && (
          <div className="charm-alert charm-alert-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="charm-vitals-datetime-bar">
          <div className="charm-form-group">
            <label>Observation Timestamp *</label>
            <input
              type="datetime-local"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              className="charm-input"
            />
          </div>

          {/* Dynamic Live BMI Card */}
          <div className="charm-live-bmi-card">
            <div>
              <span className="charm-live-bmi-label">Calculated BMI</span>
              <div className="charm-live-bmi-val">
                {computedBmi > 0 ? computedBmi.toFixed(1) : "—"}
                <small>kg/m²</small>
              </div>
            </div>
            {bmiClassification && (
              <span
                className="charm-bmi-pill"
                style={{ backgroundColor: bmiClassification.color }}
              >
                {bmiClassification.label}
              </span>
            )}
          </div>
        </div>

        <div className="charm-vitals-groups">
          {/* Physical Measurements */}
          <div className="charm-vitals-panel">
            <h4 className="charm-vitals-group-title">Height & Weight</h4>
            <div className="charm-form-grid">
              <div className="charm-form-group">
                <div className="charm-label-row">
                  <label>Height</label>
                  <div className="charm-toggle-btns">
                    <button
                      type="button"
                      className={`charm-mini-btn ${heightUnit === "cm" ? "active" : ""}`}
                      onClick={() => setHeightUnit("cm")}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={`charm-mini-btn ${heightUnit === "ft_in" ? "active" : ""}`}
                      onClick={() => setHeightUnit("ft_in")}
                    >
                      ft / in
                    </button>
                  </div>
                </div>
                {heightUnit === "cm" ? (
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="charm-input"
                    placeholder="cm"
                  />
                ) : (
                  <div className="charm-input-group">
                    <input
                      type="number"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      className="charm-input"
                      placeholder="ft"
                    />
                    <input
                      type="number"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      className="charm-input"
                      placeholder="in"
                    />
                  </div>
                )}
              </div>

              <div className="charm-form-group">
                <div className="charm-label-row">
                  <label>Weight</label>
                  <div className="charm-toggle-btns">
                    <button
                      type="button"
                      className={`charm-mini-btn ${weightUnit === "kg" ? "active" : ""}`}
                      onClick={() => setWeightUnit("kg")}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={`charm-mini-btn ${weightUnit === "lbs" ? "active" : ""}`}
                      onClick={() => setWeightUnit("lbs")}
                    >
                      lbs
                    </button>
                  </div>
                </div>
                {weightUnit === "kg" ? (
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="charm-input"
                    placeholder="kg"
                  />
                ) : (
                  <input
                    type="number"
                    step="0.1"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                    className="charm-input"
                    placeholder="lbs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Blood Pressure & Hemodynamics */}
          <div className="charm-vitals-panel">
            <h4 className="charm-vitals-group-title">Blood Pressure & Position</h4>
            <div className="charm-form-grid">
              <div className="charm-form-group">
                <label>BP (Systolic / Diastolic) *</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    placeholder="Sys (120)"
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-maen-sep">/</span>
                  <input
                    type="number"
                    placeholder="Dia (80)"
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">mmHg</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>Position & Site</label>
                <div className="charm-input-group">
                  <select
                    value={bpPosition}
                    onChange={(e) => setBpPosition(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Sitting">Sitting</option>
                    <option value="Standing">Standing</option>
                    <option value="Supine">Supine</option>
                  </select>
                  <select
                    value={bpSite}
                    onChange={(e) => setBpSite(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Left Arm">Left Arm</option>
                    <option value="Right Arm">Right Arm</option>
                    <option value="Left Wrist">Left Wrist</option>
                    <option value="Right Wrist">Right Wrist</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pulse, Respiration & SpO2 */}
          <div className="charm-vitals-panel">
            <h4 className="charm-vitals-group-title">Pulse, Respiration & Oxygen</h4>
            <div className="charm-form-grid">
              <div className="charm-form-group">
                <label>Pulse (Heart Rate)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="charm-input"
                    placeholder="bpm"
                  />
                  <select
                    value={pulseRhythm}
                    onChange={(e) => setPulseRhythm(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Irregular">Irregular</option>
                    <option value="Arrhythmia">Arrhythmia</option>
                    <option value="Tachycardic">Tachycardic</option>
                    <option value="Bradycardic">Bradycardic</option>
                  </select>
                </div>
              </div>

              <div className="charm-form-group">
                <label>SpO₂ Oxygen Saturation</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">% (Room Air)</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>Respiration Rate</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    value={respiration}
                    onChange={(e) => setRespiration(e.target.value)}
                    className="charm-input"
                    placeholder="breaths/min"
                  />
                  <select
                    value={respirationPattern}
                    onChange={(e) => setRespirationPattern(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Shallow">Shallow</option>
                    <option value="Labored">Labored</option>
                    <option value="Tachypneic">Tachypneic</option>
                  </select>
                </div>
              </div>

              <div className="charm-form-group">
                <div className="charm-label-row">
                  <label>Temperature</label>
                  <div className="charm-toggle-btns">
                    <button
                      type="button"
                      className={`charm-mini-btn ${tempUnit === "F" ? "active" : ""}`}
                      onClick={() => setTempUnit("F")}
                    >
                      °F
                    </button>
                    <button
                      type="button"
                      className={`charm-mini-btn ${tempUnit === "C" ? "active" : ""}`}
                      onClick={() => setTempUnit("C")}
                    >
                      °C
                    </button>
                  </div>
                </div>
                <div className="charm-input-group">
                  <input
                    type="number"
                    step="0.1"
                    value={tempVal}
                    onChange={(e) => setTempVal(e.target.value)}
                    className="charm-input"
                  />
                  <select
                    value={tempSite}
                    onChange={(e) => setTempSite(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Axillary">Axillary</option>
                    <option value="Tympanic">Tympanic</option>
                    <option value="Temporal">Temporal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pain Score */}
          <div className="charm-vitals-panel">
            <h4 className="charm-vitals-group-title">Pain Severity (0 - 10 Numeric Scale)</h4>
            <div className="charm-pain-scale">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`charm-pain-btn ${painScore === num ? "active" : ""}`}
                  style={{
                    backgroundColor:
                      painScore === num
                        ? num === 0
                          ? "#16a34a"
                          : num <= 3
                          ? "#ca8a04"
                          : num <= 6
                          ? "#ea580c"
                          : "#dc2626"
                        : undefined,
                  }}
                  onClick={() => setPainScore(num)}
                >
                  {num}
                </button>
              ))}
              <span className="charm-pain-label">
                {painScore === 0
                  ? "No Pain"
                  : painScore <= 3
                  ? "Mild Pain"
                  : painScore <= 6
                  ? "Moderate Pain"
                  : "Severe Pain"}
              </span>
            </div>
          </div>

          {/* Cardiology & Sphygmocor Parameters */}
          <div className="charm-vitals-panel charm-vitals-panel-cardio">
            <h4 className="charm-vitals-group-title">
              <Activity size={15} style={{ marginRight: 6, color: "#0284c7" }} />
              Cardiology & Sphygmocor Hemodynamics
            </h4>
            <div className="charm-form-grid">
              <div className="charm-form-group">
                <label>Central BP (Sys / Dia)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    value={centralSys}
                    onChange={(e) => setCentralSys(e.target.value)}
                    className="charm-input"
                    placeholder="Sys"
                  />
                  <span className="charm-maen-sep">/</span>
                  <input
                    type="number"
                    value={centralDia}
                    onChange={(e) => setCentralDia(e.target.value)}
                    className="charm-input"
                    placeholder="Dia"
                  />
                  <span className="charm-input-addon">mmHg</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>crPWV (Pulse Wave Velocity)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    step="0.1"
                    value={crPwv}
                    onChange={(e) => setCrPwv(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">m/s</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>cfPWV (Aortic PWV)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    step="0.1"
                    value={cfPwv}
                    onChange={(e) => setCfPwv(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">m/s</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>Estimated Vascular Age</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    value={vascularAge}
                    onChange={(e) => setVascularAge(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">Years</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>Augmentation Index (AIx)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    step="0.1"
                    value={aix}
                    onChange={(e) => setAix(e.target.value)}
                    className="charm-input"
                  />
                  <span className="charm-input-addon">%</span>
                </div>
              </div>

              <div className="charm-form-group">
                <label>Blood Sugar (Glucose)</label>
                <div className="charm-input-group">
                  <input
                    type="number"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    className="charm-input"
                  />
                  <select
                    value={bloodSugarContext}
                    onChange={(e) => setBloodSugarContext(e.target.value)}
                    className="charm-select"
                  >
                    <option value="Fasting">Fasting (FBS)</option>
                    <option value="Post-Prandial">Post-Prandial (PPBS)</option>
                    <option value="Random">Random (RBS)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="charm-form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Clinician Notes / Remarks</label>
            <input
              type="text"
              placeholder="e.g. Pre-EECP session vitals. Patient comfortable, resting seated for 10 minutes prior."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="charm-input"
            />
          </div>
        </div>

        <div className="charm-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving Vitals..." : "Save Vitals Observation"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function VitalsSection({
  patient,
  vitals = [],
  writable,
  onRefresh,
}: {
  patient: Row;
  vitals: Row[];
  writable: boolean;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<"" | "add">("");

  return (
    <div className="charm-clinical-section">
      <div className="charm-section-header">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Vitals Observations ({vitals.length})
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            Longitudinal vital signs, hemodynamic records, and dynamic BMI assessments.
          </p>
        </div>

        <div className="charm-actions-group">
          {writable && (
            <Button variant="primary" onClick={() => setModal("add")}>
              <Plus size={15} style={{ marginRight: 4 }} /> Record Vitals
            </Button>
          )}
        </div>
      </div>

      <div className="charm-table-card">
        <table className="charm-data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Blood Pressure</th>
              <th>Pulse</th>
              <th>SpO₂</th>
              <th>Weight / Height</th>
              <th>BMI</th>
              <th>Temp / Pain</th>
              <th>Cardiology Markers</th>
              {writable && <th style={{ width: 80, textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {vitals.length === 0 ? (
              <tr>
                <td colSpan={writable ? 9 : 8} className="charm-empty-cell">
                  <div className="charm-empty-state">
                    <Activity size={28} className="charm-empty-icon" />
                    <strong>No vitals recorded</strong>
                    <p>Clinical vitals observations recorded for this patient will appear here.</p>
                    {writable && (
                      <Button variant="primary" onClick={() => setModal("add")}>
                        <Plus size={15} style={{ marginRight: 4 }} /> Record Vitals
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              vitals.map((v) => {
                const sysHigh = v.bp_sys && v.bp_sys >= 140;
                const diaHigh = v.bp_dia && v.bp_dia >= 90;
                const pulseHigh = v.pulse_bpm && v.pulse_bpm >= 100;
                const spo2Low = v.spo2_pct && v.spo2_pct < 95;

                return (
                  <tr key={v.id}>
                    <td>
                      <strong>
                        {v.observed_at
                          ? dateTime(v.observed_at)
                          : v.created_at
                          ? dateTime(v.created_at)
                          : "—"}
                      </strong>
                    </td>
                    <td>
                      <div className="charm-bp-cell">
                        <span
                          className={`charm-bp-val ${
                            sysHigh || diaHigh ? "charm-text-alert" : ""
                          }`}
                        >
                          {v.bp_sys}/{v.bp_dia}
                        </span>
                        <small className="charm-text-muted">mmHg</small>
                      </div>
                    </td>
                    <td>
                      <div
                        className={pulseHigh ? "charm-text-alert" : "charm-text-primary"}
                      >
                        <strong>{v.pulse_bpm || "—"}</strong>{" "}
                        <small className="charm-text-muted">bpm</small>
                      </div>
                    </td>
                    <td>
                      <div
                        className={spo2Low ? "charm-text-alert" : "charm-text-primary"}
                      >
                        <strong>{v.spo2_pct ? `${v.spo2_pct}%` : "—"}</strong>
                      </div>
                    </td>
                    <td>
                      <div>
                        {v.weight_kg ? `${v.weight_kg} kg` : "—"}
                        {v.height_cm ? ` / ${v.height_cm} cm` : ""}
                      </div>
                    </td>
                    <td>
                      {v.bmi ? (
                        <span
                          className={`charm-badge ${
                            v.bmi >= 30
                              ? "charm-badge-danger"
                              : v.bmi >= 25
                              ? "charm-badge-warning"
                              : "charm-badge-success"
                          }`}
                        >
                          {v.bmi}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div>{v.temp_f ? `${v.temp_f} °F` : "—"}</div>
                      <small className="charm-text-muted">
                        Pain: {v.pain_scale ?? 0}/10
                      </small>
                    </td>
                    <td>
                      <div style={{ fontSize: 11 }}>
                        {v.central_bp_sys && (
                          <div>
                            C-BP: <strong>{v.central_bp_sys}/{v.central_bp_dia}</strong>
                          </div>
                        )}
                        {v.cr_pwv && <div>crPWV: {v.cr_pwv} m/s</div>}
                        {v.vascular_age && <div>Vasc Age: {v.vascular_age} y</div>}
                        {v.blood_sugar && (
                          <div>
                            Glucose: {v.blood_sugar} mg/dL ({v.blood_sugar_context || "RBS"})
                          </div>
                        )}
                      </div>
                    </td>
                    {writable && (
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="charm-btn-icon-danger"
                          title="Delete vitals entry"
                          onClick={async () => {
                            if (confirm("Delete this vitals record?")) {
                              await api(`/records/vitals/${v.id}`, "DELETE");
                              onRefresh();
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modal === "add" && (
        <AddVitalsModal
          patientId={patient.id}
          onClose={() => setModal("")}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ============================================================================
// 5. FLOWSHEET & INTERACTIVE TREND CHARTS (CharmHealth Frames 18–26)
// ============================================================================

export interface FlowsheetMetric {
  id: string;
  label: string;
  unit: string;
  normalRange?: [number, number];
  getValue: (row: Row) => number | null;
}

const FLOWSHEET_TEMPLATES: Record<
  string,
  { title: string; metrics: FlowsheetMetric[] }
> = {
  daily: {
    title: "Vaso-Meditech EECP Daily Chart",
    metrics: [
      {
        id: "bp_sys",
        label: "Systolic Blood Pressure",
        unit: "mmHg",
        normalRange: [90, 120],
        getValue: (r) => (r.bp_sys ? Number(r.bp_sys) : null),
      },
      {
        id: "bp_dia",
        label: "Diastolic Blood Pressure",
        unit: "mmHg",
        normalRange: [60, 80],
        getValue: (r) => (r.bp_dia ? Number(r.bp_dia) : null),
      },
      {
        id: "pulse",
        label: "Pulse / Heart Rate",
        unit: "bpm",
        normalRange: [60, 100],
        getValue: (r) => (r.pulse_bpm ? Number(r.pulse_bpm) : null),
      },
      {
        id: "spo2",
        label: "Oxygen Saturation (SpO₂)",
        unit: "%",
        normalRange: [95, 100],
        getValue: (r) => (r.spo2_pct ? Number(r.spo2_pct) : null),
      },
      {
        id: "weight",
        label: "Weight",
        unit: "kg",
        normalRange: [50, 90],
        getValue: (r) => (r.weight_kg ? Number(r.weight_kg) : null),
      },
      {
        id: "bmi",
        label: "Body Mass Index (BMI)",
        unit: "kg/m²",
        normalRange: [18.5, 24.9],
        getValue: (r) => (r.bmi ? Number(r.bmi) : null),
      },
    ],
  },
  sphygmocor: {
    title: "Sphygmocor Cardiovascular Report",
    metrics: [
      {
        id: "central_sys",
        label: "Central Systolic BP",
        unit: "mmHg",
        normalRange: [90, 120],
        getValue: (r) => (r.central_bp_sys ? Number(r.central_bp_sys) : null),
      },
      {
        id: "central_dia",
        label: "Central Diastolic BP",
        unit: "mmHg",
        normalRange: [60, 80],
        getValue: (r) => (r.central_bp_dia ? Number(r.central_bp_dia) : null),
      },
      {
        id: "cr_pwv",
        label: "crPWV (Pulse Wave Velocity)",
        unit: "m/s",
        normalRange: [5.0, 9.0],
        getValue: (r) => (r.cr_pwv ? Number(r.cr_pwv) : null),
      },
      {
        id: "cf_pwv",
        label: "cfPWV (Aortic Stiffness)",
        unit: "m/s",
        normalRange: [5.0, 10.0],
        getValue: (r) => (r.cf_pwv ? Number(r.cf_pwv) : null),
      },
      {
        id: "vascular_age",
        label: "Estimated Vascular Age",
        unit: "years",
        getValue: (r) => (r.vascular_age ? Number(r.vascular_age) : null),
      },
      {
        id: "aix",
        label: "Augmentation Index (AIx)",
        unit: "%",
        normalRange: [10, 30],
        getValue: (r) => (r.augmentation_index ? Number(r.augmentation_index) : null),
      },
    ],
  },
  sugar: {
    title: "Vaso-Meditech Blood Sugar Chart",
    metrics: [
      {
        id: "sugar",
        label: "Blood Glucose Level",
        unit: "mg/dL",
        normalRange: [70, 140],
        getValue: (r) => (r.blood_sugar ? Number(r.blood_sugar) : null),
      },
      {
        id: "weight",
        label: "Weight",
        unit: "kg",
        normalRange: [50, 90],
        getValue: (r) => (r.weight_kg ? Number(r.weight_kg) : null),
      },
      {
        id: "bp_sys",
        label: "Systolic BP",
        unit: "mmHg",
        normalRange: [90, 120],
        getValue: (r) => (r.bp_sys ? Number(r.bp_sys) : null),
      },
    ],
  },
};

export function InteractiveTrendChartModal({
  metric,
  data,
  onClose,
}: {
  metric: FlowsheetMetric;
  data: { date: string; value: number }[];
  onClose: () => void;
}) {
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("ALL");
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Filter data by selected date range
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];
    if (range === "ALL") return data;
    const now = new Date();
    const daysMap = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    const cutoff = new Date(now.getTime() - daysMap[range] * 24 * 60 * 60 * 1000);
    return data.filter((d) => new Date(d.date) >= cutoff);
  }, [data, range]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    return { min, max, avg: avg.toFixed(1), latest };
  }, [filteredData]);

  // SVG Chart Layout Calculations
  const svgWidth = 720;
  const svgHeight = 280;
  const padding = { top: 30, right: 30, bottom: 45, left: 60 };
  const innerW = svgWidth - padding.left - padding.right;
  const innerH = svgHeight - padding.top - padding.bottom;

  const { points, polylinePath, yMin, yMax, yTicks } = useMemo(() => {
    if (filteredData.length === 0) {
      return { points: [], polylinePath: "", yMin: 0, yMax: 100, yTicks: [] };
    }
    const values = filteredData.map((d) => d.value);
    let valMin = Math.min(...values);
    let valMax = Math.max(...values);
    if (metric.normalRange) {
      valMin = Math.min(valMin, metric.normalRange[0]);
      valMax = Math.max(valMax, metric.normalRange[1]);
    }
    const margin = (valMax - valMin) * 0.15 || 5;
    const yMinCalc = Math.floor(valMin - margin);
    const yMaxCalc = Math.ceil(valMax + margin);

    const step = (yMaxCalc - yMinCalc) / 4;
    const yTicksCalc = [
      yMinCalc,
      Math.round(yMinCalc + step),
      Math.round(yMinCalc + step * 2),
      Math.round(yMinCalc + step * 3),
      yMaxCalc,
    ];

    const pts = filteredData.map((d, i) => {
      const x =
        padding.left +
        (filteredData.length === 1
          ? innerW / 2
          : (i / (filteredData.length - 1)) * innerW);
      const y =
        padding.top +
        innerH -
        ((d.value - yMinCalc) / (yMaxCalc - yMinCalc)) * innerH;
      return { ...d, x, y };
    });

    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return {
      points: pts,
      polylinePath: path,
      yMin: yMinCalc,
      yMax: yMaxCalc,
      yTicks: yTicksCalc,
    };
  }, [filteredData, metric, innerW, innerH, padding]);

  return (
    <Modal
      title={`Longitudinal Trend: ${metric.label}`}
      description={`Interactive visual trend history and reference ranges for ${metric.label} (${metric.unit}).`}
      onClose={onClose}
      wide
    >
      <div className="charm-trend-modal-content">
        {/* Controls & Range Selector */}
        <div className="charm-trend-header-bar">
          <div className="charm-trend-stats-summary">
            {stats && (
              <>
                <div className="charm-stat-pill">
                  <small>Latest</small>
                  <strong>
                    {stats.latest} {metric.unit}
                  </strong>
                </div>
                <div className="charm-stat-pill">
                  <small>Average</small>
                  <strong>
                    {stats.avg} {metric.unit}
                  </strong>
                </div>
                <div className="charm-stat-pill">
                  <small>Min</small>
                  <strong>
                    {stats.min} {metric.unit}
                  </strong>
                </div>
                <div className="charm-stat-pill">
                  <small>Max</small>
                  <strong>
                    {stats.max} {metric.unit}
                  </strong>
                </div>
              </>
            )}
          </div>

          <div className="charm-range-buttons">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`charm-range-btn ${range === r ? "active" : ""}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Line Chart Canvas */}
        <div className="charm-svg-chart-container">
          {filteredData.length === 0 ? (
            <div className="charm-chart-empty">
              No observation readings recorded in this time range.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="charm-trend-svg"
            >
              {/* Normal Reference Range Shading */}
              {metric.normalRange && (
                <rect
                  x={padding.left}
                  y={
                    padding.top +
                    innerH -
                    ((metric.normalRange[1] - yMin) / (yMax - yMin)) * innerH
                  }
                  width={innerW}
                  height={
                    ((metric.normalRange[1] - metric.normalRange[0]) /
                      (yMax - yMin)) *
                    innerH
                  }
                  fill="rgba(34, 197, 94, 0.08)"
                  stroke="rgba(34, 197, 94, 0.2)"
                  strokeDasharray="4 4"
                />
              )}

              {/* Gridlines & Y-Axis Ticks */}
              {yTicks.map((tickVal, idx) => {
                const yPos =
                  padding.top +
                  innerH -
                  ((tickVal - yMin) / (yMax - yMin)) * innerH;
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={svgWidth - padding.right}
                      y2={yPos}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 10}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#64748b"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis labels */}
              {points.map((p, idx) => {
                if (
                  idx === 0 ||
                  idx === points.length - 1 ||
                  idx === Math.floor(points.length / 2)
                ) {
                  return (
                    <text
                      key={idx}
                      x={p.x}
                      y={svgHeight - 14}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#64748b"
                    >
                      {day(p.date)}
                    </text>
                  );
                }
                return null;
              })}

              {/* Area Gradient */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area under curve */}
              {points.length > 1 && (
                <path
                  d={`${polylinePath} L ${points[points.length - 1].x} ${
                    padding.top + innerH
                  } L ${points[0].x} ${padding.top + innerH} Z`}
                  fill="url(#chartGradient)"
                />
              )}

              {/* Trend Polyline */}
              <path
                d={polylinePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint?.date === p.date ? 6 : 4}
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  className="charm-chart-point"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Tooltip on hover */}
              {hoveredPoint && (
                <g>
                  <rect
                    x={Math.min(hoveredPoint.x - 55, svgWidth - 130)}
                    y={Math.max(hoveredPoint.y - 45, 10)}
                    width="110"
                    height="35"
                    rx="4"
                    fill="#1e293b"
                    opacity="0.92"
                  />
                  <text
                    x={Math.min(hoveredPoint.x, svgWidth - 75)}
                    y={Math.max(hoveredPoint.y - 30, 25)}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {hoveredPoint.value} {metric.unit}
                  </text>
                  <text
                    x={Math.min(hoveredPoint.x, svgWidth - 75)}
                    y={Math.max(hoveredPoint.y - 16, 39)}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9.5"
                  >
                    {day(hoveredPoint.date)}
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>

        <div className="charm-trend-footer-legend">
          <div className="charm-legend-item">
            <span className="charm-legend-line" />
            <span>Observed Reading</span>
          </div>
          {metric.normalRange && (
            <div className="charm-legend-item">
              <span className="charm-legend-box" />
              <span>
                Target Range ({metric.normalRange[0]} - {metric.normalRange[1]}{" "}
                {metric.unit})
              </span>
            </div>
          )}
        </div>

        <div className="charm-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FlowsheetSection({
  patient,
  vitals = [],
  writable,
  onRefresh,
}: {
  patient: Row;
  vitals: Row[];
  writable: boolean;
  onRefresh: () => void;
}) {
  const [templateKey, setTemplateKey] = useState<"daily" | "sphygmocor" | "sugar">(
    "daily"
  );
  const [selectedMetric, setSelectedMetric] = useState<FlowsheetMetric | null>(
    null
  );
  const [trendData, setTrendData] = useState<{ date: string; value: number }[]>(
    []
  );

  const currentTemplate = FLOWSHEET_TEMPLATES[templateKey];

  // Sort observation rows chronologically (earliest to latest for trend, or right-to-left)
  const sortedVitals = useMemo(() => {
    return [...vitals].sort((a, b) => {
      const da = new Date(a.observed_at || a.created_at || 0).getTime();
      const db = new Date(b.observed_at || b.created_at || 0).getTime();
      return da - db;
    });
  }, [vitals]);

  // Handle open trend chart
  const openTrendChart = (metric: FlowsheetMetric) => {
    const pts: { date: string; value: number }[] = [];
    for (const r of sortedVitals) {
      const val = metric.getValue(r);
      if (val !== null && !isNaN(val)) {
        pts.push({
          date: r.observed_at || r.created_at,
          value: val,
        });
      }
    }
    setSelectedMetric(metric);
    setTrendData(pts);
  };

  return (
    <div className="charm-flowsheet-container">
      {/* Template selector header */}
      <div className="charm-flowsheet-header">
        <div className="charm-flowsheet-title-group">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Serial Flowsheet Matrix
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
            Longitudinal multi-parameter matrix tracking with inline interactive trend charts.
          </p>
        </div>

        <div className="charm-flowsheet-controls">
          <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
            Flowsheet Template:
          </label>
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value as any)}
            className="charm-select-sm"
          >
            <option value="daily">Vaso-Meditech EECP Daily Chart</option>
            <option value="sphygmocor">Sphygmocor Cardiovascular Report</option>
            <option value="sugar">Vaso-Meditech Blood Sugar Chart</option>
          </select>
        </div>
      </div>

      {/* Horizontal Flowsheet Matrix Table */}
      <div className="charm-table-card charm-flowsheet-card">
        <div className="charm-flowsheet-scroll">
          <table className="charm-flowsheet-matrix">
            <thead>
              <tr>
                <th className="charm-matrix-sticky-header">
                  Clinical Parameter / Metric
                </th>
                <th style={{ width: 80, textAlign: "center" }}>Unit</th>
                <th style={{ width: 90, textAlign: "center" }}>Trend</th>
                {sortedVitals.length === 0 ? (
                  <th style={{ textAlign: "center" }}>Observation Sessions</th>
                ) : (
                  sortedVitals.map((v, idx) => (
                    <th key={v.id || idx} className="charm-matrix-col-header">
                      <div>Session #{idx + 1}</div>
                      <small>
                        {day(v.observed_at || v.created_at)}
                      </small>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {currentTemplate.metrics.map((metric) => (
                <tr key={metric.id}>
                  <td className="charm-matrix-sticky-col">
                    <strong>{metric.label}</strong>
                    {metric.normalRange && (
                      <span className="charm-matrix-range">
                        [{metric.normalRange[0]} - {metric.normalRange[1]}]
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", color: "#64748b", fontSize: 12 }}>
                    {metric.unit}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="charm-trend-btn"
                      onClick={() => openTrendChart(metric)}
                      title={`View interactive trend chart for ${metric.label}`}
                    >
                      <TrendingUp size={14} style={{ marginRight: 3 }} /> 📈
                    </button>
                  </td>
                  {sortedVitals.length === 0 ? (
                    <td style={{ textAlign: "center", color: "#94a3b8" }}>—</td>
                  ) : (
                    sortedVitals.map((v, idx) => {
                      const val = metric.getValue(v);
                      const isAlert =
                        val !== null &&
                        metric.normalRange &&
                        (val < metric.normalRange[0] || val > metric.normalRange[1]);
                      return (
                        <td
                          key={v.id || idx}
                          className={`charm-matrix-val-cell ${
                            isAlert ? "charm-matrix-alert" : ""
                          }`}
                        >
                          {val !== null ? val : "—"}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMetric && (
        <InteractiveTrendChartModal
          metric={selectedMetric}
          data={trendData}
          onClose={() => {
            setSelectedMetric(null);
            setTrendData([]);
          }}
        />
      )}
    </div>
  );
}

