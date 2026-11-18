import React, { useEffect, useRef, useState } from "react";
import { Download, Edit2, ExternalLink, Printer, Save, X } from "lucide-react";
import { api, download, Row } from "./api";
import { useApp } from "./context";
import "./discharge-summary.css";

const CLINIC_LOGO_URL = "/assets/dashboard/heal_your_heart_clinic_logo.png";

const REPORT_TABLE_DEFINITIONS: Record<string, string[]> = {
  "Lipid Profile Investigation": ["Cholesterol", "LDL/HDL Ratio", "LDL Cholesterol", "Triglycerides", "HDL Cholesterol"],
  "Echo Investigation": ["EF", "LVESV", "LVESD", "LVEDV", "LVEDD"],
  "Basic Metabolic Panel": ["Glucose(fasting)", "Sodium", "Potassium", "Chloride", "Bicarbonate", "Urea", "Creatinine"],
  "Vitals": ["Weight", "Walking Time", "CCS", "BP", "HR", "Area", "Peak"],
  "SphygmoCor Investigation": ["Aortic SP", "Aortic PP", "AP", "Alx", "Ejection Duration", "SEVR"],
  "Other Investigation": ["INR", "BNP", "TSH", "CRP", "HbA1C", "Free T3", "Free T4"],
  "Symptomatic Improvement": ["Symptoms", "Exercise Tolerance"],
};

function formatDisplayDate(value?: string): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(parsed);
    }
  }
  return value;
}

export function ClinicLetterhead({
  facility,
  phonePrefix = "Phone: ",
}: {
  facility?: Row;
  phonePrefix?: string;
}) {
  const name = facility?.name || "Heal Your Heart Neelankarai";
  const addressLines: string[] = Array.isArray(facility?.address_lines) && facility.address_lines.length > 0
    ? facility.address_lines
    : [
        facility?.address ||
          "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar, Neelankarai, Chennai, Tamil Nadu - 600115",
      ];
  const phone = facility?.phone || "9003070065";

  return (
    <header className="discharge-letterhead">
      <div className="hyh-clinic-logo-block">
        <img
          src={CLINIC_LOGO_URL}
          alt="Heal Your Heart - Vaso-Meditech (EECP Center)"
          className="hyh-clinic-logo-img"
        />
        <div className="hyh-clinic-logo-unit">A unit of Vaso-Meditech Pvt Ltd</div>
      </div>
      <address className="discharge-facility-address">
        <div style={{ fontWeight: "bold" }}>{name}</div>
        {addressLines.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
        {phone && (
          <div>
            {phonePrefix}
            {phone}
          </div>
        )}
      </address>
    </header>
  );
}

function InlineValue({
  value,
  editing,
  onChange,
  label,
}: {
  value: string | number | undefined;
  editing: boolean;
  onChange: (value: string) => void;
  label: string;
}) {
  return editing ? (
    <input
      className="discharge-inline-input"
      aria-label={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ) : (
    <span className="discharge-inline-value">{value || "____"}</span>
  );
}

export function DischargeSummaryViewer({
  consultationId,
  onClose,
}: {
  consultationId: string;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [report, setReport] = useState<Row>();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Row>(`/consultations/${consultationId}/discharge-summary`)
      .then((data) => {
        if (!active) return;
        const tables = { ...(data.investigation_tables || {}) };
        for (const [title, parameters] of Object.entries(REPORT_TABLE_DEFINITIONS)) {
          if (!tables[title] || !Array.isArray(tables[title]) || tables[title].length === 0) {
            tables[title] = parameters.map((p) => ({ parameter: p, pre: "", post: "" }));
          } else {
            const existingMap = new Map(tables[title].map((r: any) => [r.parameter, r]));
            tables[title] = parameters.map((p) => existingMap.get(p) || { parameter: p, pre: "", post: "" });
          }
        }
        data.investigation_tables = tables;
        setReport(data);
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [consultationId]);

  const change = (section: string, key: string, value: string) => {
    setReport((current) =>
      current && {
        ...current,
        [section]: { ...current[section], [key]: value },
      },
    );
  };

  const save = async () => {
    if (!report) return;
    setSaving(true);
    setError("");
    try {
      const saved = await api<Row>(
        `/consultations/${consultationId}/discharge-summary`,
        "PUT",
        { version: report.version, report_data_json: report },
      );
      setReport(saved);
      setEditing(false);
      notify("Discharge summary saved.");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(false);
    }
  };

  const setNarrative = (key: string, value: string) => {
    setReport((current) =>
      current && {
        ...current,
        narrative_values: { ...current.narrative_values, [key]: value },
      },
    );
  };

  const patient = report?.patient_information || {};
  const treatment = report?.treatment_information || {};
  const narrative = report?.narrative_values || {};

  return (
    <div className="discharge-viewer-backdrop">
      <section
        className="discharge-summary-print-root"
        role="dialog"
        aria-modal="true"
        aria-label="Discharge Summary"
      >
        <div className="discharge-summary-toolbar">
          <div className="discharge-summary-toolbar-title">
            <button type="button" className="discharge-icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Discharge Summary</span>
          </div>
          <div className="discharge-summary-toolbar-actions">
            {editing ? (
              <>
                <button type="button" className="discharge-action-button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="button" className="discharge-action-button primary" onClick={save} disabled={saving}>
                  <Save size={15} /> {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button type="button" className="discharge-action-button" onClick={() => setEditing(true)}>
                <Edit2 size={15} /> Edit
              </button>
            )}
            <button type="button" className="discharge-action-button" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        <div className="discharge-viewer-scroll">
          {error && <div className="discharge-error">{error}</div>}
          {loading ? (
            <div className="discharge-loading">Loading discharge summary...</div>
          ) : report ? (
            <article className="discharge-document">
              <ClinicLetterhead facility={report.facility} phonePrefix="P : " />
              <div className="discharge-divider-line" />

              <h1 className="discharge-document-title">Discharge Summary</h1>

              <section className="discharge-section">
                <div className="discharge-section-heading">Patient Information</div>
                <div className="discharge-patient-rows">
                  <div>Registration No: {patient.registration_no || "—"}</div>
                  <div>Name: {patient.name || "—"}</div>
                  <div className="discharge-patient-demographics">
                    <span>Date Of Birth: {formatDisplayDate(patient.date_of_birth)}</span>
                    <span>Age: {patient.age ? `${patient.age} Years` : "—"}</span>
                    <span>Gender: {patient.gender || "—"}</span>
                  </div>
                </div>
              </section>
              <div className="discharge-section-divider" />

              <section className="discharge-section">
                <div className="discharge-section-heading">Treatment Information</div>
                <div className="discharge-treatment-grid">
                  <div className="discharge-treatment-col">
                    <div>Physician : {treatment.physician || report.provider_name || "—"}</div>
                    <div>From: {formatDisplayDate(treatment.from || report.visit_date)}</div>
                    <div>
                      Sponsor:{" "}
                      {editing ? (
                        <input
                          className="discharge-field-input"
                          value={treatment.sponsor || ""}
                          onChange={(e) => change("treatment_information", "sponsor", e.target.value)}
                        />
                      ) : (
                        <span>{treatment.sponsor || "____"}</span>
                      )}
                    </div>
                  </div>
                  <div className="discharge-treatment-col">
                    <div>
                      Total Treatment Hrs :{" "}
                      {editing ? (
                        <input
                          className="discharge-field-input"
                          value={treatment.total_treatment_hrs || ""}
                          onChange={(e) => change("treatment_information", "total_treatment_hrs", e.target.value)}
                        />
                      ) : (
                        <span>{treatment.total_treatment_hrs || "____"}</span>
                      )}
                    </div>
                    <div>
                      To:{" "}
                      {editing ? (
                        <input
                          className="discharge-field-input"
                          value={treatment.to || ""}
                          onChange={(e) => change("treatment_information", "to", e.target.value)}
                        />
                      ) : (
                        <span>{treatment.to || "____"}</span>
                      )}
                    </div>
                    <div>
                      Requested Amount:{" "}
                      {editing ? (
                        <input
                          className="discharge-field-input"
                          value={treatment.requested_amount || ""}
                          onChange={(e) => change("treatment_information", "requested_amount", e.target.value)}
                        />
                      ) : (
                        <span>{treatment.requested_amount || "____"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              <div className="discharge-section-divider" />

              <section className="discharge-section">
                <div className="discharge-section-heading">Diagnosis</div>
                {report.diagnoses?.length ? (
                  <ul className="discharge-bullet-list">
                    {report.diagnoses.map((item: Row, index: number) => (
                      <li key={`${item.code}-${index}`}>
                        • {item.description}
                        {item.code ? ` [${item.code}]` : ""}.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="discharge-plain-text">• Not recorded.</p>
                )}
              </section>
              <div className="discharge-section-divider" />

              <section className="discharge-section">
                <div className="discharge-section-heading">Procedure Done</div>
                {editing ? (
                  <input
                    className="discharge-full-input"
                    value={report.procedure_done || ""}
                    onChange={(event) => setReport({ ...report, procedure_done: event.target.value })}
                  />
                ) : (
                  <p className="discharge-plain-text">
                    {report.procedure_done || "Vaso-Meditech Enhanced External Counter Pulsation (EECP) Treatment"}
                  </p>
                )}
              </section>
              <div className="discharge-section-divider" />

              <section className="discharge-section">
                <div className="discharge-section-heading">Brief History</div>
                {editing ? (
                  <textarea
                    className="discharge-full-textarea"
                    value={report.brief_history || ""}
                    onChange={(event) => setReport({ ...report, brief_history: event.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="discharge-plain-text">
                    {report.brief_history || "Patient presented for completion course of external counterpulsation therapy."}
                  </p>
                )}
              </section>

              <section className="discharge-section">
                <div className="discharge-section-heading">Vaso-Meditech EECP Treatment Narrative</div>
                <p className="discharge-narrative">
                  The patient underwent Vaso-Meditech EECP treatment for a total of [
                  <InlineValue value={narrative.sessions} editing={editing} label="Treatment sessions" onChange={(value) => setNarrative("sessions", value)} />
                  ] sessions, [
                  {editing ? (
                    <select
                      className="discharge-inline-input"
                      aria-label="Hours per day"
                      value={narrative.hours_per_day || ""}
                      onChange={(event) => setNarrative("hours_per_day", event.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="one">one</option>
                      <option value="two">two</option>
                    </select>
                  ) : (
                    <span className="discharge-inline-value">{narrative.hours_per_day || "____"}</span>
                  )}
                  ] hours sessions per day. The patient's heart rate was monitored closely throughout the entire course of the treatment. The patient's heart rate remains within the range of [
                  <InlineValue value={narrative.heart_rate_min} editing={editing} label="Minimum heart rate" onChange={(value) => setNarrative("heart_rate_min", value)} />
                  ] to [
                  <InlineValue value={narrative.heart_rate_max} editing={editing} label="Maximum heart rate" onChange={(value) => setNarrative("heart_rate_max", value)} />
                  ] beats per minute. His blood pressure average was [
                  <InlineValue value={narrative.blood_pressure_average} editing={editing} label="Average blood pressure" onChange={(value) => setNarrative("blood_pressure_average", value)} />
                  ] mmHg during the complete course of EECP treatment.
                  <br />
                  <br />
                  The patient attained a diastolic augmentation of P-value [
                  <InlineValue value={narrative.phase_one_p_value} editing={editing} label="First phase P-value" onChange={(value) => setNarrative("phase_one_p_value", value)} />
                  ] and A-value [
                  <InlineValue value={narrative.phase_one_a_value} editing={editing} label="First phase A-value" onChange={(value) => setNarrative("phase_one_a_value", value)} />
                  ] on average during the first phase of the treatment and attained diastolic augmentation of P-value [
                  <InlineValue value={narrative.phase_two_p_value} editing={editing} label="Second phase P-value" onChange={(value) => setNarrative("phase_two_p_value", value)} />
                  ] and A-value [
                  <InlineValue value={narrative.phase_two_a_value} editing={editing} label="Second phase A-value" onChange={(value) => setNarrative("phase_two_a_value", value)} />
                  ] during the second phase of the treatment. During the diastolic phase of the cardiac cycle, standard pressure of [
                  <InlineValue value={narrative.lower_extremity_pressure} editing={editing} label="Lower-extremity pressure" onChange={(value) => setNarrative("lower_extremity_pressure", value)} />
                  ] mmHg is applied in the lower extremities.
                  <br />
                  <br />
                  His arterial pressure wave and oxygen saturation were monitored continuously by non-invasive finger plethysmography. The afterload reduction was monitored during the treatment by observing the reduction in the systolic waveform amplitude compared to the control strip taken without counterpulsation. In addition, the patient's oxygen saturation was monitored throughout the treatment. The oxygen of [
                  <InlineValue value={narrative.oxygen_flow} editing={editing} label="Oxygen flow" onChange={(value) => setNarrative("oxygen_flow", value)} />
                  ] ltr/min was administered during the treatment due to a drop in saturation. O2 saturation was maintained at [
                  <InlineValue value={narrative.oxygen_saturation} editing={editing} label="Oxygen saturation" onChange={(value) => setNarrative("oxygen_saturation", value)} />
                  ] % during the treatment. The treatment period was uneventful.
                </p>
              </section>

              <section className="discharge-section">
                <div className="discharge-section-heading">Medication Information</div>
                {report.medications?.length ? (
                  <ul className="discharge-bullet-list">
                    {report.medications.map((item: Row, index: number) => (
                      <li key={`${item.name}-${index}`}>
                        • {item.name} ({item.dose})-{item.schedule}, Dispense: {item.dispense}
                        {item.pharmacy_note ? `, Note to pharmacy: ${item.pharmacy_note}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="discharge-plain-text">Not recorded.</p>
                )}
              </section>

              <section className="discharge-section">
                <div className="discharge-section-heading">Investigation Reports</div>
                {Object.entries(report.investigation_tables || {}).map(([title, rows]: [string, any]) => (
                  <div className="discharge-investigation-block" key={title}>
                    <div className="discharge-investigation-title">{title}</div>
                    <table className="discharge-investigation-table">
                      <thead>
                        <tr>
                          <th style={{ width: "42%" }}>Parameter</th>
                          <th style={{ width: "29%" }}>Pre EECP</th>
                          <th style={{ width: "29%" }}>Post EECP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((item: Row, index: number) => (
                          <tr key={`${item.parameter}-${index}`}>
                            <td style={{ fontWeight: 500 }}>{item.parameter}</td>
                            {(["pre", "post"] as const).map((field) => (
                              <td key={field}>
                                {editing ? (
                                  <input
                                    className="discharge-table-input"
                                    aria-label={`${item.parameter} ${field} EECP`}
                                    value={item[field] ?? ""}
                                    onChange={(event) => {
                                      const tables = {
                                        ...report.investigation_tables,
                                        [title]: rows.map((value: Row, rowIndex: number) =>
                                          rowIndex === index ? { ...value, [field]: event.target.value } : value,
                                        ),
                                      };
                                      setReport({ ...report, investigation_tables: tables });
                                    }}
                                  />
                                ) : (
                                  <span>{item[field] || ""}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>

              <section className="discharge-section">
                <div className="discharge-section-heading">Patient Education</div>
                {editing ? (
                  <textarea
                    className="discharge-full-textarea"
                    value={report.patient_education || ""}
                    onChange={(event) => setReport({ ...report, patient_education: event.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="discharge-plain-text">
                    {report.patient_education ||
                      "Continue heart-healthy lifestyle, low-sodium diet, regular aerobic exercise, and adherence to prescribed medications. Report any recurrent chest tightness or dyspnea immediately."}
                  </p>
                )}
              </section>

              <footer className="discharge-signature-footer">
                <div>Date: {formatDisplayDate(report.visit_date)}</div>
                <div style={{ textAlign: "center", minWidth: 200 }}>
                  <div style={{ fontWeight: "bold" }}>Doctor Incharge</div>
                  <div style={{ margin: "2px 0" }}>{report.provider_name || "Dr. Ramasamy S"}</div>
                  <div>EECP Consultant</div>
                </div>
              </footer>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ClinicalSummaryViewer({
  consultationId,
  onClose,
}: {
  consultationId: string;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [data, setData] = useState<Row>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<Row>(`/consultations/${consultationId}/clinical-summary`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [consultationId]);

  const handleDownloadPdf = async () => {
    try {
      await download(
        `/consultations/${consultationId}/export/clinical-summary`,
        `clinical-summary-${data?.patient?.mrn || consultationId}.pdf`,
      );
    } catch (cause) {
      notify(`Unable to download Clinical Summary PDF: ${String(cause)}`);
    }
  };

  return (
    <div className="discharge-viewer-backdrop">
      <section
        className="discharge-summary-print-root"
        role="dialog"
        aria-modal="true"
        aria-label="Clinical Summary"
      >
        <div className="discharge-summary-toolbar">
          <div className="discharge-summary-toolbar-title">
            <button type="button" className="discharge-icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Clinical Summary (Patient Summary)</span>
          </div>
          <div className="discharge-summary-toolbar-actions">
            <button type="button" className="discharge-action-button" onClick={() => void handleDownloadPdf()}>
              <Download size={15} /> Download PDF
            </button>
            <button type="button" className="discharge-action-button primary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>

        <div className="discharge-viewer-scroll">
          {error && <div className="discharge-error">{error}</div>}
          {loading ? (
            <div className="discharge-loading">Loading Clinical Summary...</div>
          ) : data ? (
            <article className="discharge-document">
              <div className="clinical-summary-top-row">
                <h1 className="clinical-summary-title">Clinical Summary</h1>
                <button
                  type="button"
                  className="clinical-summary-print-link no-print"
                  onClick={() => window.print()}
                >
                  Print
                </button>
              </div>

              <ClinicLetterhead facility={data.facility} phonePrefix="Phone: " />

              <div className="clinical-summary-meta-grid">
                <div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Patient</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">{data.patient?.name || "—"}</span>
                  </div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Record ID</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">{data.patient?.mrn || "—"}</span>
                  </div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Age / Gender</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">
                      {data.patient?.age || "—"} / {data.patient?.gender_lower || data.patient?.gender || "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Provider</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">{data.provider?.name || "—"}</span>
                  </div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Medical Reg No</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">{data.provider?.regn_no || "—"}</span>
                  </div>
                  <div className="clinical-summary-meta-row">
                    <span className="clinical-summary-meta-label">Date</span>
                    <span>:</span>
                    <span className="clinical-summary-meta-value">{data.visit?.date_display || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="clinical-summary-banner">Chief Complaints</div>
              <div className="discharge-plain-text">
                {data.chief_complaints?.length ? (
                  data.chief_complaints.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">History of Present Illness</div>
              {data.hpi?.structured ? (
                <div className="discharge-plain-text">
                  <div>Chest Pain? {data.hpi.chest_pain || "No"}</div>
                  <table className="clinical-summary-table" style={{ maxWidth: 480 }}>
                    <tbody>
                      {(data.hpi.table || []).map((rowItem: Row, idx: number) => (
                        <tr key={idx}>
                          <td style={{ width: "52%", whiteSpace: "pre-line" }}>{rowItem.label}</td>
                          <td style={{ width: "48%" }}>{rowItem.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(data.hpi.questions || []).map(([q, a]: [string, string], idx: number) => (
                    <div key={idx}>
                      {q} {a}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="discharge-plain-text">{data.hpi?.raw || "Not recorded."}</div>
              )}

              <div className="clinical-summary-banner">Past Medical History</div>
              {data.pmh?.structured && data.pmh.grid?.length ? (
                <table className="clinical-summary-table" style={{ maxWidth: 640 }}>
                  <tbody>
                    {data.pmh.grid.map((rowItem: Row, idx: number) => (
                      <tr key={idx}>
                        <td style={{ width: "25%", whiteSpace: "pre-line" }}>{rowItem.name1}</td>
                        <td style={{ width: "25%" }}>{rowItem.val1}</td>
                        <td style={{ width: "25%", whiteSpace: "pre-line" }}>{rowItem.name2}</td>
                        <td style={{ width: "25%" }}>{rowItem.val2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="discharge-plain-text">{data.pmh?.raw || "Not recorded."}</div>
              )}

              <div className="clinical-summary-banner">Review of Systems</div>
              <div className="discharge-plain-text">
                {data.ros?.length ? (
                  data.ros.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Health Vitals</div>
              <div className="discharge-plain-text">
                {data.vitals?.height && <div><strong>Height:</strong> {data.vitals.height}</div>}
                {data.vitals?.weight && <div><strong>Weight:</strong> {data.vitals.weight}</div>}
                {data.vitals?.bmi && <div><strong>BMI:</strong> {data.vitals.bmi}</div>}
                {data.vitals?.bp && <div><strong>BP:</strong> {data.vitals.bp}</div>}
                {data.vitals?.pulse_rate && <div><strong>Pulse Rate:</strong> {data.vitals.pulse_rate}</div>}
                {data.vitals?.spo2 && <div><strong>SPO2:</strong> {data.vitals.spo2}</div>}
                {!data.vitals?.height && !data.vitals?.weight && !data.vitals?.bp && (
                  <div>{data.vitals?.raw || "Not recorded."}</div>
                )}
              </div>

              <div className="clinical-summary-banner">Physical Examination</div>
              <div className="discharge-plain-text">
                {data.physical_examination?.length ? (
                  data.physical_examination.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Assessment Notes</div>
              <div className="discharge-plain-text" style={{ whiteSpace: "pre-line" }}>
                {data.assessment_notes || "Not recorded."}
              </div>

              <div className="clinical-summary-banner">Diagnoses</div>
              <div className="discharge-plain-text">
                {data.diagnoses?.length ? (
                  data.diagnoses.map((d: Row, idx: number) => (
                    <div key={idx}>
                      • {d.description}
                      {d.code ? ` [${d.code}]` : ""}
                    </div>
                  ))
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Rx</div>
              <table className="clinical-summary-table">
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>Medication</th>
                    <th style={{ width: "22%" }}>Dosage (M-A-E-N)</th>
                    <th style={{ width: "16%" }}>Period</th>
                    <th style={{ width: "30%" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prescriptions?.length ? (
                    data.prescriptions.map((med: Row, idx: number) => (
                      <tr key={idx}>
                        <td>{med.display_name}</td>
                        <td>{med.schedule || "—"}</td>
                        <td>{med.period || "—"}</td>
                        <td>{med.notes || ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Not recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="clinical-summary-banner">Lifestyle</div>
              <div className="discharge-plain-text">
                {data.lifestyle?.length ? (
                  data.lifestyle.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Imaging</div>
              <div className="discharge-plain-text">
                {data.imaging?.length ? (
                  data.imaging.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Treatment Notes</div>
              <div className="discharge-plain-text">
                {data.treatment_notes?.length ? (
                  data.treatment_notes.map((line: string, idx: number) => <div key={idx}>{line}</div>)
                ) : (
                  <div>Not recorded.</div>
                )}
              </div>

              <div className="clinical-summary-banner">Follow up</div>
              <table className="clinical-summary-table">
                <thead>
                  <tr>
                    <th style={{ width: "24%" }}>Type</th>
                    <th style={{ width: "54%" }}>Notes</th>
                    <th style={{ width: "22%" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.follow_up?.length ? (
                    data.follow_up.map((fu: Row, idx: number) => (
                      <tr key={idx}>
                        <td>{fu.type}</td>
                        <td>{fu.notes}</td>
                        <td>{fu.date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>Not recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="clinical-summary-signature">
                <div style={{ marginBottom: 4 }}>____________________________</div>
                <div style={{ fontWeight: 700 }}>{data.provider?.name || "Dr. Ramasamy S"}</div>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function PdfReportModal({
  title,
  pdfUrl,
  filename,
  onClose,
}: {
  title: string;
  pdfUrl: string;
  filename: string;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="discharge-viewer-backdrop">
      <section
        className="discharge-summary-print-root"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="discharge-summary-toolbar">
          <div className="discharge-summary-toolbar-title">
            <button type="button" className="discharge-icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          </div>
          <div className="discharge-summary-toolbar-actions">
            <button
              type="button"
              className="discharge-action-button"
              onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink size={15} /> Open Tab
            </button>
            <button type="button" className="discharge-action-button" onClick={handleDownload}>
              <Download size={15} /> Download PDF
            </button>
            <button type="button" className="discharge-action-button primary" onClick={handlePrint}>
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
        <div className="discharge-viewer-scroll pdf-mode">
          <iframe ref={iframeRef} src={pdfUrl} title={title} className="pdf-preview-frame" />
        </div>
      </section>
    </div>
  );
}
