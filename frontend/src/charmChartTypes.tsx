import React, { useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Table as TableIcon,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  Check,
  Activity,
  Heart,
  Pill,
  Clock,
  Sparkles,
} from "lucide-react";
import { Row, day, dateTime } from "./api";
import { Badge } from "./ui";

// ============================================================================
// 1. RICH TEXT TOOLBAR (Matching CharmHealth frame_060_300.0s.png)
// ============================================================================
export function RichTextToolbar() {
  return (
    <div className="charm-rich-toolbar">
      <button type="button" className="charm-toolbar-btn bold" title="Bold">
        B
      </button>
      <button type="button" className="charm-toolbar-btn italic" title="Italic">
        I
      </button>
      <button type="button" className="charm-toolbar-btn underline" title="Underline">
        U
      </button>
      <button type="button" className="charm-toolbar-btn" title="Strikethrough">
        <s>S</s>
      </button>
      <select className="charm-toolbar-select" title="Font Family" defaultValue="Arial">
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
      </select>
      <select className="charm-toolbar-select" title="Font Size" defaultValue="10">
        <option value="8">8</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
        <option value="14">14</option>
      </select>
      <button type="button" className="charm-toolbar-btn" title="Text Color">
        <span style={{ color: "#000000", fontWeight: 700 }}>A</span>
      </button>
      <button type="button" className="charm-toolbar-btn" title="Bullet List">
        <List size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Numbered List">
        <ListOrdered size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Insert Link">
        <LinkIcon size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Blockquote">
        <Quote size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Insert Table">
        <TableIcon size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Align Left">
        <AlignLeft size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Align Center">
        <AlignCenter size={13} />
      </button>
      <button type="button" className="charm-toolbar-btn" title="Align Right">
        <AlignRight size={13} />
      </button>
    </div>
  );
}

// ============================================================================
// 2. QUICK CONSULTATION CANVAS (video_235038 frame_003_015.0s.png)
// ============================================================================
export function QuickChartNotesCanvas({
  chart,
  patient,
  encounter,
  register,
  setValue,
  getValues,
  setActiveTplModal,
  setModal,
  editable,
}: {
  chart: Row;
  patient: Row;
  encounter: Row;
  register: any;
  setValue: (k: string, v: any) => void;
  getValues: (k: string) => any;
  setActiveTplModal: (m: any) => void;
  setModal: (m: string) => void;
  editable: boolean;
}) {
  const prescriptions = (chart.medications || []).filter((m: Row) => !m.is_supplement);
  const supplements = (chart.medications || []).filter((m: Row) => m.is_supplement);
  const vaccines = chart.vaccines || [];
  const injections = chart.injections || [];
  const labs = (chart.orders || []).filter((o: Row) => o.kind === "lab");
  const images = (chart.orders || []).filter((o: Row) => o.kind === "imaging");
  const diagnoses = chart.diagnoses || [];

  return (
    <div className="charm-quick-canvas" style={{ padding: "16px 20px" }}>
      {/* 1. Consult Notes */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Consult Notes</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("symptoms")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <textarea
            className="charm-comp-textarea"
            rows={6}
            placeholder="Document clinical consultation notes, presenting issues, and physician examination findings..."
            style={{ borderTop: "1px solid #cbd5e1", borderRadius: 4, minHeight: 120 }}
            {...register("consult_notes")}
          />
        </div>
      </div>

      {/* 2. Dx Codes */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Dx Codes</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("diagnosis")}
            >
              Add Dx
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("diagnosis")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("diagnosis")}
            >
              Past Dx
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {diagnoses.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {diagnoses.map((d: Row) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        background: "#0284c7",
                        color: "#fff",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {d.code}
                    </span>
                    <strong style={{ fontSize: 13, color: "#1e293b" }}>{d.diagnosis}</strong>
                    {d.comments && (
                      <span className="muted" style={{ fontSize: 11 }}>
                        ({d.comments})
                      </span>
                    )}
                  </div>
                  <span className="muted" style={{ fontSize: 11 }}>
                    {d.created_at ? day(d.created_at) : "Active"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No diagnoses added for this encounter. Click <strong>Add Dx</strong> or{" "}
              <strong>Templates</strong> to insert.
            </p>
          )}
        </div>
      </div>

      {/* 3. Prescriptions */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Prescriptions</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("add_rx")}
            >
              Add Rx
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("prescription")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("prescription")}
            >
              Past Rx
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => window.print()}
            >
              Paper Rx
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {prescriptions.length > 0 ? (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b" }}>
                  <th style={{ padding: "6px 8px" }}>Trade Name</th>
                  <th style={{ padding: "6px 8px" }}>Generic Name</th>
                  <th style={{ padding: "6px 8px" }}>Dosage & Frequency</th>
                  <th style={{ padding: "6px 8px" }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((m: Row) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{m.trade_name || m.name}</td>
                    <td style={{ padding: "6px 8px", color: "#475569" }}>
                      {m.generic_name || m.brand || "—"}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      {m.dosage} {m.frequency ? `(${m.frequency})` : ""}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{m.duration || "Day(s)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No medications recorded. Click <strong>Add Rx</strong> or <strong>Templates</strong> to prescribe.
            </p>
          )}
        </div>
      </div>

      {/* 4. Supplements */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Supplements</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("supplement")}
            >
              Add Suppl
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("supplement")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("supplement")}
            >
              Past Suppl
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {supplements.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {supplements.map((s: Row) => (
                <div
                  key={s.id}
                  style={{
                    padding: "6px 10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <strong>{s.trade_name || s.name}</strong> — {s.dosage} ({s.frequency}) for {s.duration}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No supplements listed. Click <strong>Add Suppl</strong> or <strong>Templates</strong> to add cardiovascular nutritional support.
            </p>
          )}
        </div>
      </div>

      {/* 5. Vaccines */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Vaccines</h4>
          <div className="charm-quick-sec-actions">
            <span className="charm-quick-sec-action-link" style={{ cursor: "default" }}>
              Vaccine Chart ▾
            </span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("vaccines")}
            >
              Add Vaccine
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("vaccines")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {vaccines.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {vaccines.map((v: Row) => (
                <div
                  key={v.id}
                  style={{
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <strong>{v.vaccine_name || v.name}</strong> — Dose: {v.dose || "1"} | Given: {v.administered_at ? day(v.administered_at) : "Today"}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No vaccines recorded. Click <strong>Add Vaccine</strong> to record immunization history.
            </p>
          )}
        </div>
      </div>

      {/* 6. Injections */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Injections</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("injections")}
            >
              Add Injection
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("injections")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("injections")}
            >
              Past Injections
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {injections.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {injections.map((inj: Row) => (
                <div
                  key={inj.id}
                  style={{
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <strong>{inj.name}</strong> — {inj.dose} ({inj.route}) | Lot: {inj.lot_number || "—"}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No clinical injections administered for this visit.
            </p>
          )}
        </div>
      </div>

      {/* 7. Labs */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Labs</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Search & Add
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Add Lab
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Past Orders
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              View Orders
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {labs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {labs.map((l: Row) => (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>{l.name || l.description}</strong>
                    {l.instructions && <span className="muted"> — {l.instructions}</span>}
                  </div>
                  <Badge value={l.status || "Ordered"} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No laboratory tests ordered. Click <strong>Add Lab</strong> to order (e.g. Complete Lipid Panel, HbA1c, Renal Function).
            </p>
          )}
        </div>
      </div>

      {/* 8. Images */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Images</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Add Image
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              View Orders
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Past Orders
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {images.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {images.map((im: Row) => (
                <div
                  key={im.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>{im.name || im.description}</strong>
                    {im.instructions && <span className="muted"> — {im.instructions}</span>}
                  </div>
                  <Badge value={im.status || "Ordered"} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No imaging studies ordered (e.g. 2D Echocardiogram, Coronary CT Angiography, Chest X-Ray).
            </p>
          )}
        </div>
      </div>

      {/* 9. Follow up */}
      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Follow up</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                setValue("follow_up", "Review in 2 weeks with repeat fasting lipid profile and resting ECG.");
              }}
            >
              Add Follow up
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                setValue(
                  "follow_up",
                  "Review after completing 35 EECP sessions. Repeat Treadmill Stress Test (Bruce Protocol) and 2D Echocardiography.",
                );
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <textarea
            className="charm-comp-textarea"
            rows={3}
            placeholder="Document follow-up intervals, lifestyle guidance, and return precautions..."
            style={{ borderTop: "1px solid #cbd5e1", borderRadius: 4, minHeight: 70 }}
            {...register("follow_up")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. BRIEF CONSULTATION CANVAS (video_233414 frame_015.jpg)
// ============================================================================
export function BriefChartNotesCanvas({
  chart,
  patient,
  encounter,
  register,
  setValue,
  getValues,
  setActiveTplModal,
  setModal,
  editable,
}: {
  chart: Row;
  patient: Row;
  encounter: Row;
  register: any;
  setValue: (k: string, v: any) => void;
  getValues: (k: string) => any;
  setActiveTplModal: (m: any) => void;
  setModal: (m: string) => void;
  editable: boolean;
}) {
  const [crpwv, setCrpwv] = useState("7.8");
  const [vascAge, setVascAge] = useState("52");
  const [centralSys, setCentralSys] = useState("118");
  const [centralDia, setCentralDia] = useState("76");
  const [hba1c, setHba1c] = useState("6.8");
  const [cfpwv, setCfpwv] = useState("8.4");

  const prescriptions = (chart.medications || []).filter((m: Row) => !m.is_supplement);
  const labs = (chart.orders || []).filter((o: Row) => o.kind === "lab");
  const images = (chart.orders || []).filter((o: Row) => o.kind === "imaging");

  return (
    <div className="charm-brief-canvas" style={{ padding: "16px 20px" }}>
      {/* 1. Chief Complaints (S) */}
      <div id="sec-brief-cc" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Chief Complaints</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("symptoms")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <textarea
            className="charm-comp-textarea"
            rows={4}
            placeholder="Enter brief chief complaints and primary reason for visit..."
            style={{ borderTop: "1px solid #cbd5e1", borderRadius: 4, minHeight: 80 }}
            {...register("chief_complaint")}
          />
        </div>
      </div>

      {/* 2. Vital Signs & Hemodynamics (O) */}
      <div id="sec-brief-vs" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Vital Signs & Hemodynamics</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("vitals")}
            >
              + Add Vitals
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {/* Authentic Hemodynamics Grid from frame_015.jpg */}
          <div className="charm-brief-vs-grid">
            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">
                Carotid-radial pulse wave velocity (crPWV)
              </label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={crpwv}
                  onChange={(e) => setCrpwv(e.target.value)}
                  placeholder="e.g. 7.8"
                />
                <span className="charm-brief-metric-unit">m/sec</span>
              </div>
            </div>

            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">Vascular Age</label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={vascAge}
                  onChange={(e) => setVascAge(e.target.value)}
                  placeholder="e.g. 52"
                />
                <span className="charm-brief-metric-unit">yrs</span>
              </div>
            </div>

            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">Central Systolic</label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={centralSys}
                  onChange={(e) => setCentralSys(e.target.value)}
                  placeholder="e.g. 118"
                />
                <span className="charm-brief-metric-unit">mmHg</span>
              </div>
            </div>

            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">Central Diastolic</label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={centralDia}
                  onChange={(e) => setCentralDia(e.target.value)}
                  placeholder="e.g. 76"
                />
                <span className="charm-brief-metric-unit">mmHg</span>
              </div>
            </div>

            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">HbA1c</label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={hba1c}
                  onChange={(e) => setHba1c(e.target.value)}
                  placeholder="e.g. 6.8"
                />
                <span className="charm-brief-metric-unit">%</span>
              </div>
            </div>

            <div className="charm-brief-metric-box">
              <label className="charm-brief-metric-label">(cfPWV)</label>
              <div className="charm-brief-metric-input-wrap">
                <input
                  type="text"
                  value={cfpwv}
                  onChange={(e) => setCfpwv(e.target.value)}
                  placeholder="e.g. 8.4"
                />
                <span className="charm-brief-metric-unit">m/sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Prescriptions (P) */}
      <div id="sec-brief-rx" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Prescriptions</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("add_rx")}
            >
              Add Rx
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("prescription")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("prescription")}
            >
              Past Rx
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => window.print()}
            >
              Paper Rx
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {prescriptions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {prescriptions.map((m: Row) => (
                <div
                  key={m.id}
                  style={{
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <strong>{m.trade_name || m.name}</strong> — {m.dosage} ({m.frequency})
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No medications added. Click <strong>Add Rx</strong> or <strong>Templates</strong>.
            </p>
          )}
        </div>
      </div>

      {/* 4. Labs */}
      <div id="sec-brief-lab" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Labs</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Search & Add
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Add Lab
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Past Orders
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {labs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {labs.map((l: Row) => (
                <div key={l.id} style={{ fontSize: 12 }}>
                  <strong>{l.name || l.description}</strong> ({l.status})
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No lab orders for this brief encounter.
            </p>
          )}
        </div>
      </div>

      {/* 5. Images */}
      <div id="sec-brief-img" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Images</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Add Image
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("orders")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {images.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {images.map((im: Row) => (
                <div key={im.id} style={{ fontSize: 12 }}>
                  <strong>{im.name || im.description}</strong> ({im.status})
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No imaging orders.
            </p>
          )}
        </div>
      </div>

      {/* 6. Follow up */}
      <div id="sec-brief-fu" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Follow up</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                setValue("follow_up", "Review in 2 weeks.");
              }}
            >
              Add Follow up
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                setValue("follow_up", "Follow up after 10 sessions of EECP.");
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <textarea
            className="charm-comp-textarea"
            rows={3}
            placeholder="Follow-up instructions..."
            style={{ borderTop: "1px solid #cbd5e1", borderRadius: 4, minHeight: 70 }}
            {...register("follow_up")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. COMPREHENSIVE CONSULTATION CANVAS (video_235038 frame_060_300.0s.png)
// ============================================================================
export function ComprehensiveChartNotesCanvas({
  chart,
  patient,
  encounter,
  register,
  setValue,
  getValues,
  setActiveTplModal,
  setModal,
  editable,
}: {
  chart: Row;
  patient: Row;
  encounter: Row;
  register: any;
  setValue: (k: string, v: any) => void;
  getValues: (k: string) => any;
  setActiveTplModal: (m: any) => void;
  setModal: (m: string) => void;
  editable: boolean;
}) {
  const diagnoses = chart.diagnoses || [];
  const vaccines = chart.vaccines || [];
  const injections = chart.injections || [];

  return (
    <div className="charm-comp-canvas" style={{ padding: "16px 20px" }}>
      {/* 1. Subjective: Chief Complaints */}
      <div id="sec-comp-cc" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Chief Complaints</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("symptoms")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={5}
            placeholder="Detailed subjective clinical complaints, chronicity, severity, radiation, aggravating/relieving factors..."
            {...register("chief_complaint")}
          />
        </div>
      </div>

      {/* 2. Subjective: History */}
      <div id="sec-comp-hist" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">History of Present Illness</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                const cur = getValues("hpi") || "";
                setValue(
                  "hpi",
                  cur +
                    "\nKnown case of Coronary Artery Disease. Patient reports exertional chest tightness resolving with rest / sublingual nitrates. No resting orthopnea or paroxysmal nocturnal dyspnea.",
                );
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={4}
            placeholder="Elaborate HPI details, functional impact, and symptom trajectory..."
            {...register("hpi")}
          />
        </div>

        <div className="charm-quick-sec-header" style={{ borderTop: "1px solid #e2e8f0" }}>
          <h4 className="charm-quick-sec-title">Past Medical History</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                const cur = getValues("medical_history") || "";
                setValue(
                  "medical_history",
                  cur +
                    "\nPast cardiac interventions: CAG, PTCA/Stenting. Comorbidities: Type 2 Diabetes Mellitus, Essential Systemic Hypertension, Dyslipidemia.",
                );
              }}
            >
              Past History | Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={4}
            placeholder="Surgical history, prior revascularization, cardiovascular risk factors, family history..."
            {...register("medical_history")}
          />
        </div>
      </div>

      {/* 3. Objective: Physical Examination */}
      <div id="sec-comp-pe" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Physical Examination</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                const cur = getValues("examination") || "";
                setValue(
                  "examination",
                  cur +
                    "\nGeneral: Conscious, oriented, afebrile, no pallor, no pedal edema.\nCVS: S1, S2 heard, no murmurs, regular rhythm.\nRespiratory: Bilateral normal vesicular breath sounds, no added sounds.\nAbdomen: Soft, non-tender, no organomegaly.\nPeripheral pulses: Well felt bilaterally in radial, femoral, and dorsalis pedis.",
                );
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={5}
            placeholder="Head-to-toe clinical examination findings, cardiovascular auscultation, respiratory assessment, peripheral pulses..."
            {...register("examination")}
          />
        </div>
      </div>

      {/* 4. Objective: Latest Lab Results */}
      <div id="sec-comp-lab" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Latest Lab Results</h4>
          <div className="charm-quick-sec-actions">
            <span className="charm-quick-sec-action-link" onClick={() => setModal("orders")}>
              Recent Labs | View Cumulative
            </span>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "6px 8px" }}>Test Name</th>
                <th style={{ padding: "6px 8px" }}>Observed Value</th>
                <th style={{ padding: "6px 8px" }}>Biological Reference Range</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>HbA1c (Glycated Hemoglobin)</td>
                <td style={{ padding: "6px 8px", color: "#ea580c", fontWeight: 700 }}>6.8 %</td>
                <td style={{ padding: "6px 8px", color: "#64748b" }}>{"< 5.7 (Normal), 5.7 - 6.4 (Prediabetes)"}</td>
                <td style={{ padding: "6px 8px" }}><Badge value="Suboptimal" /></td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>Total Cholesterol</td>
                <td style={{ padding: "6px 8px" }}>174 mg/dL</td>
                <td style={{ padding: "6px 8px", color: "#64748b" }}>{"< 200 mg/dL"}</td>
                <td style={{ padding: "6px 8px" }}><Badge value="Optimal" /></td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>Serum Triglycerides</td>
                <td style={{ padding: "6px 8px", color: "#ea580c", fontWeight: 700 }}>188 mg/dL</td>
                <td style={{ padding: "6px 8px", color: "#64748b" }}>{"< 150 mg/dL"}</td>
                <td style={{ padding: "6px 8px" }}><Badge value="Borderline High" /></td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>Serum Creatinine</td>
                <td style={{ padding: "6px 8px" }}>0.9 mg/dL</td>
                <td style={{ padding: "6px 8px", color: "#64748b" }}>0.7 - 1.2 mg/dL</td>
                <td style={{ padding: "6px 8px" }}><Badge value="Normal" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Assessment: Assessment Notes */}
      <div id="sec-comp-an" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Assessment Notes</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("assessment")}
            >
              CAG / Echo Templates
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("assessment")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={5}
            placeholder="Clinical assessment synthesis, CAD progression status, ischemic burden, hemodynamics, and EECP response..."
            {...register("assessment")}
          />
        </div>
      </div>

      {/* 6. Assessment: Diagnoses */}
      <div id="sec-comp-dx" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Diagnoses</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("diagnosis")}
            >
              + Add Diagnosis
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setActiveTplModal("diagnosis")}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {diagnoses.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {diagnoses.map((d: Row) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        background: "#0284c7",
                        color: "#fff",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {d.code}
                    </span>
                    <strong style={{ fontSize: 13 }}>{d.diagnosis}</strong>
                  </div>
                  <Badge value="Primary" />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No diagnoses recorded. Click <strong>+ Add Diagnosis</strong> to map ICD-10 conditions.
            </p>
          )}
        </div>
      </div>

      {/* 7. Assessment: Self Notes */}
      <div id="sec-comp-self" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Self Notes</h4>
          <div className="charm-quick-sec-actions">
            <span className="muted" style={{ fontSize: 11 }}>Private Clinician Notes</span>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={3}
            placeholder="Confidential clinician observations, personal treatment considerations, and review reminders..."
            {...register("consult_notes")}
          />
        </div>
      </div>

      {/* 8. Plan: Recommendations */}
      <div id="sec-comp-rec" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Recommendations</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                const cur = getValues("plan") || "";
                setValue(
                  "plan",
                  cur +
                    "\nDiet: Low sodium, low saturated fat diet. Avoid high potassium foods.\nPhysical Activity: Supervised walking 30 minutes daily after full course of EECP.\nEECP Regimen: Daily 1-hour external counterpulsation sessions for 35 total treatments.",
                );
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={4}
            placeholder="Lifestyle counseling, dietary guidelines, physical activity prescription..."
            {...register("plan")}
          />
        </div>
      </div>

      {/* 9. Plan: Vaccines / Injections */}
      <div id="sec-comp-vac" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Vaccines / Injections</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("vaccines")}
            >
              + Add Vaccine
            </button>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => setModal("injections")}
            >
              + Add Injection
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          {vaccines.length === 0 && injections.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              No vaccines or clinical injections administered for this encounter.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {vaccines.map((v: Row) => (
                <div key={v.id} style={{ fontSize: 12 }}>
                  <strong>Vaccine:</strong> {v.vaccine_name || v.name} ({v.dose})
                </div>
              ))}
              {injections.map((inj: Row) => (
                <div key={inj.id} style={{ fontSize: 12 }}>
                  <strong>Injection:</strong> {inj.name} ({inj.dose}, {inj.route})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 10. Plan: Treatment Notes */}
      <div id="sec-comp-trt" className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Treatment Notes</h4>
          <div className="charm-quick-sec-actions">
            <button
              type="button"
              className="charm-quick-sec-action-link"
              onClick={() => {
                setValue(
                  "treatment_notes",
                  "EECP Counterpulsation Treatment Protocol:\n- Applied sequential pneumatic compression cuffs to calves (240 mmHg), lower thighs (260 mmHg), and upper thighs/buttocks (280 mmHg).\n- Synchronized deflation precisely prior to cardiac systole via R-wave sensing.\n- Target Diastolic Augmentation Ratio achieved: 1.25 : 1.\n- Patient tolerated therapy with no muscle soreness, ecchymosis, or paresthesias.",
                );
              }}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="charm-quick-sec-body">
          <RichTextToolbar />
          <textarea
            className="charm-comp-textarea"
            rows={4}
            placeholder="Document detailed procedure settings, counterpulsation parameters, treatment response, and clinician sign-off..."
            {...register("treatment_notes")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. NURSE INPUT VIEW (Comprehensive Tab 2)
// ============================================================================
export function NurseInputView({
  register,
  encounter,
  editable,
}: {
  register: any;
  encounter: Row;
  editable: boolean;
}) {
  const [skinCheck, setSkinCheck] = useState(true);
  const [cuffPlacement, setCuffPlacement] = useState(true);
  const [ecgSignal, setEcgSignal] = useState(true);
  const [plethWave, setPlethWave] = useState(true);

  return (
    <div style={{ padding: "20px 24px" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Pre-Treatment Nursing & Technical Checklist
      </h3>

      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Patient Safety & Sensor Verification</h4>
        </div>
        <div className="charm-quick-sec-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={skinCheck}
                onChange={(e) => setSkinCheck(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              Skin integrity inspected at calf, lower thigh, and upper thigh cuff placement areas.
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cuffPlacement}
                onChange={(e) => setCuffPlacement(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              Sequential pneumatic cuffs positioned securely with appropriate overlapping and snugness.
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ecgSignal}
                onChange={(e) => setEcgSignal(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              ECG leads attached with stable R-wave trigger for exact diastolic inflation timing.
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={plethWave}
                onChange={(e) => setPlethWave(e.target.checked)}
                style={{ accentColor: "#0284c7" }}
              />
              Finger photoplethysmograph sensor attached with sharp dicrotic notch visualization.
            </label>
          </div>
        </div>
      </div>

      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Nurse Clinical Notes</h4>
        </div>
        <div className="charm-quick-sec-body">
          <textarea
            className="charm-comp-textarea"
            rows={5}
            placeholder="Record nurse observations, session tolerance, patient vitals before/during/after EECP, and comfort remarks..."
            style={{ borderTop: "1px solid #cbd5e1", borderRadius: 4 }}
            {...register("nurse_notes")}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. QUESTIONNAIRES VIEW (Tab 1 for all encounter types)
// ============================================================================
export function QuestionnairesView() {
  const [ccsClass, setCcsClass] = useState("II");
  const [nyhaClass, setNyhaClass] = useState("II");
  const [anginaFreq, setAnginaFreq] = useState("1-2 times / week");
  const [nitroUse, setNitroUse] = useState("1 tablet / week");
  const [walkDist, setWalkDist] = useState("500 meters without stopping");

  return (
    <div style={{ padding: "20px 24px" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Cardiovascular Functional Status & Quality of Life Questionnaire
      </h3>

      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Canadian Cardiovascular Society (CCS) Angina Grading</h4>
        </div>
        <div className="charm-quick-sec-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {[
              { id: "I", label: "Class I: Ordinary physical activity does not cause angina (only strenuous, rapid or prolonged exertion)." },
              { id: "II", label: "Class II: Slight limitation of ordinary activity (angina occurs on walking > 2 blocks or climbing > 1 flight of stairs)." },
              { id: "III", label: "Class III: Marked limitation of ordinary physical activity (angina occurs on walking 1-2 blocks or climbing 1 flight)." },
              { id: "IV", label: "Class IV: Inability to perform any physical activity without discomfort (angina may be present at rest)." },
            ].map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="ccsGrading"
                  checked={ccsClass === c.id}
                  onChange={() => setCcsClass(c.id)}
                  style={{ accentColor: "#0284c7", marginTop: 3 }}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="charm-quick-section">
        <div className="charm-quick-sec-header">
          <h4 className="charm-quick-sec-title">Symptom Frequency & Exercise Tolerance</h4>
        </div>
        <div className="charm-quick-sec-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Chest Pain Frequency
              </label>
              <input
                type="text"
                value={anginaFreq}
                onChange={(e) => setAnginaFreq(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Sublingual Nitroglycerin Usage
              </label>
              <input
                type="text"
                value={nitroUse}
                onChange={(e) => setNitroUse(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Walking Distance Without Angina
              </label>
              <input
                type="text"
                value={walkDist}
                onChange={(e) => setWalkDist(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 4 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. PROCEDURE CODES VIEW (Tab 3 for all encounter types)
// ============================================================================
export function ProcedureCodesView() {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([
    "92971",
  ]);

  const codes = [
    {
      code: "92971",
      title: "External counterpulsation (EECP), per treatment session",
      category: "Cardiology Therapeutic Services",
      fee: "₹2,500.00",
      typicalUnits: "1 Session",
    },
    {
      code: "93000",
      title: "Electrocardiogram, routine ECG with at least 12 leads; with interpretation and report",
      category: "Diagnostic Cardiology",
      fee: "₹650.00",
      typicalUnits: "1 Test",
    },
    {
      code: "93306",
      title: "Echocardiography, transthoracic, real-time with image documentation (2D), includes M-mode and Doppler",
      category: "Diagnostic Ultrasound",
      fee: "₹3,200.00",
      typicalUnits: "1 Study",
    },
    {
      code: "93015",
      title: "Cardiovascular stress test using maximal or submaximal treadmill (Bruce Protocol)",
      category: "Cardiovascular Stress Testing",
      fee: "₹2,800.00",
      typicalUnits: "1 Test",
    },
  ];

  const toggle = (c: string) => {
    setSelectedCodes((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Clinical Procedure Codes (CPT)
        </h3>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          Selected: <strong>{selectedCodes.length}</strong> codes
        </span>
      </div>

      <div className="charm-quick-section">
        <div className="charm-quick-sec-body" style={{ padding: 0 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "8px 12px", width: 40 }}>Select</th>
                <th style={{ padding: "8px 12px", width: 90 }}>CPT Code</th>
                <th style={{ padding: "8px 12px" }}>Description</th>
                <th style={{ padding: "8px 12px", width: 180 }}>Category</th>
                <th style={{ padding: "8px 12px", width: 100 }}>Standard Fee</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const checked = selectedCodes.includes(c.code);
                return (
                  <tr
                    key={c.code}
                    onClick={() => toggle(c.code)}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: checked ? "#f0fdf4" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        style={{ accentColor: "#0284c7" }}
                      />
                    </td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#0284c7" }}>
                      {c.code}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>
                      {c.title}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#64748b", fontSize: 12 }}>
                      {c.category}
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      {c.fee}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

