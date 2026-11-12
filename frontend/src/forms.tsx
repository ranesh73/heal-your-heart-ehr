import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, branch, Field, Row, today, toISO } from "./api";
import { useApp } from "./context";
import { Modal, DynamicForm, ErrorBox, Button } from "./ui";

export function PatientForm({
  onClose,
  onSaved,
  patient,
}: {
  onClose: () => void;
  onSaved: (p: Row) => void;
  patient?: Row;
}) {
  const { facilities, staff, refresh } = useApp();
  const [selected, setSelected] = useState<string[]>(
    patient?.facility_ids || [branch],
  );
  const fields: Field[] = [
    { name: "first_name", label: "First name", required: true },
    { name: "last_name", label: "Last name", required: true },
    { name: "dob", label: "Date of birth", type: "date", required: true },
    {
      name: "sex",
      label: "Sex",
      type: "select",
      options: ["Female", "Male", "Other", "Unknown"],
      required: true,
    },
    { name: "provider_id", label: "Assigned clinician", type: "doctor" },
    { name: "phone", label: "Mobile phone" },
    { name: "email", label: "Email", type: "email" },
    { name: "blood_group", label: "Blood group" },
    {
      name: "residency",
      label: "Residency",
      options: ["Local", "Outstation", "NRI", "Foreign"],
      required: true,
    },
    ...[
      "address",
      "area",
      "city",
      "district",
      "state",
      "postal_code",
      "emergency_name",
      "emergency_phone",
      "referral_source",
    ].map((k) => ({ name: k, label: k.replaceAll("_", " ") })),
    {
      name: "communication_opt_in",
      label: "Patient opted in to future external communication",
      type: "checkbox",
    },
    {
      name: "duplicate_reason",
      label: "Duplicate review override reason (only if prompted)",
      type: "textarea",
    },
  ];
  return (
    <Modal
      title={patient ? "Edit patient demographics" : "Register a patient"}
      onClose={onClose}
      wide
    >
      <DynamicForm
        fields={fields}
        initial={{ residency: "Local", state: "Tamil Nadu", ...patient }}
        choices={{ doctor: staff.filter((s) => s.role === "doctor") }}
        onSubmit={async (values) => {
          const allowed = Object.fromEntries(
            fields.map((f) => [
              f.name,
              values[f.name] ?? (f.type === "checkbox" ? false : ""),
            ]),
          );
          if (!allowed.provider_id) allowed.provider_id = null;
          const data = await api(
            "/patients" +
              (patient ? "/" + patient.id + "?version=" + patient.version : ""),
            patient ? "PUT" : "POST",
            { ...allowed, facility_ids: selected },
          );
          await refresh();
          onSaved(data);
        }}
        submit={patient ? "Save demographics" : "Register & open chart"}
        footer="External communication remains disabled."
      >
        <div className="branch-checks">
          <strong>Branch access</strong>
          {facilities.map((f) => (
            <label key={f.id}>
              <input
                type="checkbox"
                checked={selected.includes(f.id)}
                disabled={
                  f.id === branch || patient?.facility_ids.includes(f.id)
                }
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, f.id]
                      : selected.filter((x) => x !== f.id),
                  )
                }
              />
              {f.name}
            </label>
          ))}
        </div>
      </DynamicForm>
    </Modal>
  );
}

export function AppointmentForm({
  patientId,
  plan,
  onClose,
  appointment,
  initialStart,
  initialProviderId,
  initialResourceId,
  initialDuration,
}: {
  patientId?: string;
  plan?: Row;
  onClose: () => void;
  appointment?: Row;
  initialStart?: string;
  initialProviderId?: string;
  initialResourceId?: string;
  initialDuration?: number;
}) {
  const { staff, patients, resources, facilities, refresh, notify } = useApp();
  const qc = useQueryClient();

  const [selPatient, setSelPatient] = useState(patientId || appointment?.patient_id || "");
  const [providerId, setProviderId] = useState(
    appointment?.provider_id || initialProviderId || plan?.therapist_id || (staff.find((s) => ["doctor", "therapist"].includes(s.role))?.id || "")
  );
  const [resourceId, setResourceId] = useState(appointment?.resource_id || initialResourceId || "");
  const [startAt, setStartAt] = useState(
    appointment
      ? new Date(new Date(appointment.start_at).getTime() + 330 * 60000).toISOString().slice(0, 16)
      : initialStart || (today() + "T09:00")
  );
  const [duration, setDuration] = useState<number>(
    appointment
      ? (new Date(appointment.end_at).getTime() - new Date(appointment.start_at).getTime()) / 60000
      : initialDuration || (plan ? 60 : 30)
  );
  const [visitType, setVisitType] = useState(
    appointment?.visit_type || (plan ? "EECP session" : "Cardiology Consultation")
  );
  const [mode, setMode] = useState(appointment?.mode || "In person");
  const [apptStatus, setApptStatus] = useState(appointment?.status || "confirmed");
  const [periodType, setPeriodType] = useState<"single" | "period">(plan ? "period" : "single");
  const [repeatCount, setRepeatCount] = useState<number>(
    plan ? Math.max(1, plan.session_count - plan.scheduled) : 1
  );
  const [intervalDays, setIntervalDays] = useState<number>(1);
  const [skipSundays, setSkipSundays] = useState(true);
  const [reason, setReason] = useState(appointment?.reason || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string>("");

  // Dynamic Appointment Statuses synchronized from Settings & localStorage
  const [availableStatuses, setAvailableStatuses] = useState<{ id: string; name: string; color: string }[]>(() => {
    try {
      const saved = localStorage.getItem("hyh_appointment_statuses");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "1", name: "Confirmed", color: "#10b981" },
      { id: "2", name: "Checked in", color: "#3b82f6" },
      { id: "3", name: "Completed", color: "#059669" },
      { id: "4", name: "Cancelled", color: "#ef4444" },
      { id: "5", name: "No show", color: "#f59e0b" },
      { id: "6", name: "Absent", color: "#64748b" },
      { id: "7", name: "Admission", color: "#8b5cf6" },
      { id: "8", name: "Consultation / Demo", color: "#06b6d4" },
      { id: "9", name: "Consulted", color: "#14b8a6" },
      { id: "10", name: "Diabetic / HT Management", color: "#ec4899" },
      { id: "11", name: "Discharge", color: "#6366f1" },
      { id: "12", name: "EECP Treatment 1st Day", color: "#f97316" },
      { id: "13", name: "EECP Treatment 20 Sessions 1st Day", color: "#d946ef" },
      { id: "14", name: "EECP Treatment Completed", color: "#22c55e" },
      { id: "15", name: "EECP Treatment Started", color: "#84cc16" },
    ];
  });

  // Dynamic Visit Types synchronized from Settings & localStorage
  const [availableVisitTypes, setAvailableVisitTypes] = useState<{ id: string; name: string; mode?: string; duration?: number; color?: string }[]>(() => {
    try {
      const saved = localStorage.getItem("hyh_visit_types");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: "vt1", name: "Cardiology Consultation", duration: 30 },
      { id: "vt2", name: "EECP session", duration: 60 },
      { id: "vt3", name: "EECP Treatment", duration: 60 },
      { id: "vt4", name: "Follow-up Visit", duration: 20 },
      { id: "vt5", name: "New Patient Visit", duration: 45 },
      { id: "vt6", name: "Telehealth Video Consult", duration: 30 },
      { id: "vt7", name: "Walk-in visits", duration: 20 },
      { id: "vt8", name: "EECP 15th Day Review", duration: 30 },
    ];
  });

  useEffect(() => {
    api<any[]>("/calendar/appointment-statuses")
      .then((data) => {
        if (data && data.length > 0) {
          setAvailableStatuses(data);
          localStorage.setItem("hyh_appointment_statuses", JSON.stringify(data));
        }
      })
      .catch(() => {});

    api<any[]>("/calendar/visit-types")
      .then((data) => {
        if (data && data.length > 0) {
          setAvailableVisitTypes(data);
          localStorage.setItem("hyh_visit_types", JSON.stringify(data));
        }
      })
      .catch(() => {});

    const onStatusUpdate = () => {
      try {
        const saved = localStorage.getItem("hyh_appointment_statuses");
        if (saved) setAvailableStatuses(JSON.parse(saved));
      } catch {}
    };
    const onVisitTypeUpdate = () => {
      try {
        const saved = localStorage.getItem("hyh_visit_types");
        if (saved) setAvailableVisitTypes(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("hyh_appointment_statuses_updated", onStatusUpdate);
    window.addEventListener("hyh_visit_types_updated", onVisitTypeUpdate);
    return () => {
      window.removeEventListener("hyh_appointment_statuses_updated", onStatusUpdate);
      window.removeEventListener("hyh_visit_types_updated", onVisitTypeUpdate);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!selPatient && !patientId) {
      setErr("Please select a patient.");
      return;
    }
    if (!providerId) {
      setErr("Please select a provider.");
      return;
    }
    if (plan && !resourceId) {
      setErr("EECP requires an assigned bed.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        patient_id: patientId || selPatient,
        provider_id: providerId,
        resource_id: resourceId || null,
        start_at: toISO(startAt),
        duration_minutes: Number(duration),
        reason: reason || undefined,
      };

      if (appointment) {
        payload.version = appointment.version;
        await api("/appointments/" + appointment.id + "/reschedule", "POST", payload);
      } else {
        payload.visit_type = visitType;
        payload.mode = mode;
        payload.repeat_count = periodType === "period" ? Number(repeatCount) : Number(repeatCount) || 1;
        payload.interval_days = Number(intervalDays);
        payload.skip_sundays = skipSundays;
        payload.plan_id = plan?.id || null;
        await api("/appointments", "POST", payload);
      }

      await refresh();
      await qc.refetchQueries({ queryKey: ["chart"] });
      notify(appointment ? "Appointment rescheduled." : "Appointment booking confirmed.");
      onClose();
    } catch (ex: any) {
      setErr(ex?.detail || ex?.message || "Failed to schedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={appointment ? "Reschedule Appointment" : "New Appointment"}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="charm-new-appointment-layout">
        {err && <div className="error-box" style={{ gridColumn: "1 / -1" }}>{err}</div>}

        {/* LEFT COLUMN: Main Scheduling Fields */}
        <div className="charm-appt-col-left">
          <div className="charm-form-row">
            <label className="charm-field-label">Facility</label>
            <select className="charm-field-input" defaultValue={facilities?.[0]?.id}>
              {(facilities || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} - {f.code || "HUH001"}
                </option>
              ))}
            </select>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Category</label>
            <div className="charm-radio-group">
              <label><input type="radio" name="cat" defaultChecked /> Appointment</label>
              <label><input type="radio" name="cat" /> Other Events</label>
              <label><input type="radio" name="cat" /> Waiting List</label>
            </div>
          </div>

          {!patientId && !appointment && (
            <div className="charm-form-row">
              <label className="charm-field-label">Patient *</label>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                <select
                  aria-label="Patient"
                  className="charm-field-input"
                  value={selPatient}
                  onChange={(e) => setSelPatient(e.target.value)}
                  required
                >
                  <option value="">Search by Name / Record ID / Mobile Phone</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.mrn}) - {p.phone || "No phone"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={{
                    background: "#f59e0b",
                    color: "#fff",
                    border: 0,
                    borderRadius: 4,
                    width: 32,
                    height: 32,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="charm-form-row">
            <label className="charm-field-label">Provider / therapist *</label>
            <select
              aria-label="Provider / therapist"
              className="charm-field-input"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              required
            >
              <option value="">--Select--</option>
              {staff
                .filter((s) => (plan ? s.id === plan.therapist_id : ["doctor", "therapist"].includes(s.role)))
                .map((s) => (
                  <option key={s.id} value={s.id} label={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Status</label>
            <select
              aria-label="Status"
              className="charm-field-input"
              value={apptStatus}
              onChange={(e) => setApptStatus(e.target.value)}
            >
              {availableStatuses.map((st) => {
                const val = st.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <option key={st.id || st.name} value={val}>
                    {st.name}
                  </option>
                );
              })}
              {/* Fallback if current appointment has a status not yet in list */}
              {apptStatus &&
                !availableStatuses.some(
                  (st) =>
                    st.name.toLowerCase().replace(/\s+/g, "-") ===
                    apptStatus.toLowerCase().replace(/\s+/g, "-")
                ) && <option value={apptStatus}>{apptStatus}</option>}
            </select>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Visit Type</label>
            <select
              aria-label="Visit type"
              className="charm-field-input"
              value={visitType}
              onChange={(e) => {
                const vtName = e.target.value;
                setVisitType(vtName);
                const found = availableVisitTypes.find((vt) => vt.name === vtName);
                if (found?.duration) {
                  setDuration(found.duration);
                }
                if (found?.mode) {
                  if (found.mode.toLowerCase().includes("video")) setMode("Video");
                  else if (found.mode.toLowerCase().includes("phone")) setMode("Phone");
                  else setMode("In person");
                }
              }}
            >
              {availableVisitTypes.map((vt) => (
                <option key={vt.id || vt.name} value={vt.name}>
                  {vt.name} {vt.duration ? `(${vt.duration} min)` : ""}
                </option>
              ))}
              {/* Fallback if current appointment has a visit type not in list */}
              {visitType &&
                !availableVisitTypes.some((vt) => vt.name === visitType) && (
                  <option value={visitType}>{visitType}</option>
                )}
            </select>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Room / EECP bed</label>
            <select
              aria-label="Room / EECP bed"
              className="charm-field-input"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required={!!plan}
            >
              <option value="">--Select--</option>
              {resources
                .filter((r) => !plan || r.kind === "EECP bed")
                .map((r) => (
                  <option key={r.id} value={r.id} label={r.name}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Appointment Mode</label>
            <div className="charm-radio-group">
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "In person"}
                  onChange={() => setMode("In person")}
                />{" "}
                In Person
              </label>
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "Phone"}
                  onChange={() => setMode("Phone")}
                />{" "}
                Phone Call
              </label>
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "Video"}
                  onChange={() => setMode("Video")}
                />{" "}
                Video Consult
              </label>
            </div>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Appointment For</label>
            <div className="charm-radio-group">
              <label>
                <input
                  type="radio"
                  name="period"
                  checked={periodType === "single"}
                  onChange={() => setPeriodType("single")}
                />{" "}
                Single Date
              </label>
              <label>
                <input
                  type="radio"
                  name="period"
                  checked={periodType === "period"}
                  onChange={() => setPeriodType("period")}
                />{" "}
                Period
              </label>
            </div>
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Start · Asia/Kolkata *</label>
            <input
              aria-label="Start · Asia/Kolkata"
              type="datetime-local"
              className="charm-field-input"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Duration · minutes *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                aria-label="Duration · minutes"
                type="number"
                min={5}
                max={1440}
                className="charm-field-input"
                style={{ width: 100 }}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: 12, color: "#64748b" }}>minutes</span>
            </div>
          </div>

          {periodType === "period" && (
            <>
              <div className="charm-form-row">
                <label className="charm-field-label">Number of appointments *</label>
                <input
                  aria-label="Number of appointments"
                  type="number"
                  min={1}
                  max={100}
                  className="charm-field-input"
                  style={{ width: 100 }}
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="charm-form-row">
                <label className="charm-field-label">Repeat every · days *</label>
                <input
                  aria-label="Repeat every · days"
                  type="number"
                  min={1}
                  max={365}
                  className="charm-field-input"
                  style={{ width: 100 }}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  required
                />
              </div>

              <div className="charm-form-row">
                <label className="charm-field-label">Skip Sundays</label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input
                    aria-label="Skip Sundays"
                    type="checkbox"
                    checked={skipSundays}
                    onChange={(e) => setSkipSundays(e.target.checked)}
                  />{" "}
                  Exclude Sundays from schedule
                </label>
              </div>
            </>
          )}

          <div className="charm-form-row">
            <label className="charm-field-label">Reason</label>
            <textarea
              aria-label="Reason / scheduling note"
              className="charm-field-input"
              rows={2}
              placeholder="Reason / clinical indication"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="charm-form-row">
            <label className="charm-field-label">Message to Patient</label>
            <textarea
              className="charm-field-input"
              rows={2}
              placeholder="Instructions or notes sent to patient"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Questionnaires & Consent Forms */}
        <div className="charm-appt-col-right">
          <div className="charm-qbox-title">Questionnaires / Consent Forms</div>
          <div className="charm-qbox-list">
            <label className="charm-qbox-item">
              <input type="checkbox" defaultChecked />
              <span>Are you a candidate for EECP therapy?</span>
            </label>
            <label className="charm-qbox-item">
              <input type="checkbox" defaultChecked />
              <span>Consent for Vaso-Meditech EECP Treatment</span>
            </label>
            <label className="charm-qbox-item">
              <input type="checkbox" />
              <span>Minnesota Living with Heart Failure Questionnaire</span>
            </label>
            <label className="charm-qbox-item">
              <input type="checkbox" />
              <span>Telehealth Consent Form</span>
            </label>
          </div>

          <div className="charm-qbox-footer">
            <span>Consent Forms (Documents)</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="charm-appt-footer">
          <button
            type="submit"
            disabled={submitting}
            className="charm-btn-confirm"
          >
            {submitting ? "Saving..." : (appointment ? "Reschedule" : "Confirm booking")}
          </button>
          <button
            type="button"
            className="charm-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RecordForm({
  kind,
  patientId,
  encounterId,
  planId,
  onClose,
  initial = {},
}: {
  kind: string;
  patientId?: string;
  encounterId?: string;
  planId?: string;
  onClose: () => void;
  initial?: Row;
}) {
  const { metadata, patients, staff, refresh, notify } = useApp();
  const plans = useQuery({
    queryKey: ["plans", branch],
    queryFn: () => api<Row[]>("/eecp/plans"),
    enabled: kind === "weekly",
  });
  const fields: Field[] = [
    ...(!patientId
      ? [
          {
            name: "patient_id",
            label: "Patient",
            type: "patient",
            required: true,
          },
        ]
      : []),
    ...(metadata.record_fields?.[kind] || []),
  ];
  const isWide = ["weekly"].includes(kind);
  return (
    <Modal
      title={
        "Add " +
        ({
          weekly: "weekly EECP assessment",
          entries: "patient record",
          medications: "draft prescription",
        }[kind] || kind)
      }
      description={
        kind === "medications"
          ? "Development prescription only. No external transmission."
          : undefined
      }
      onClose={onClose}
      wide={isWide}
    >
      <DynamicForm
        fields={fields}
        initial={{
          ...Object.fromEntries(
            fields.filter((f) => f.options).map((f) => [f.name, f.options![0]]),
          ),
          ...initial,
          plan_id: planId || initial.plan_id,
        }}
        choices={{
          patient: patients,
          staff,
          plan: (plans.data || []).filter(
            (p) => !patientId || p.patient_id === patientId,
          ),
        }}
        onSubmit={async (data) => {
          const allowed: Row = {};
          for (const f of fields)
            if (data[f.name] !== undefined) allowed[f.name] = data[f.name];
          allowed.patient_id = patientId || data.patient_id;
          if (encounterId) allowed.encounter_id = encounterId;
          await api("/records/" + kind, "POST", allowed);
          await refresh();
          notify("Record saved to the patient chart.");
          onClose();
        }}
      />
    </Modal>
  );
}

export function UploadForm({
  patientId,
  onClose,
  orderId,
}: {
  patientId: string;
  onClose: () => void;
  orderId?: string;
}) {
  const { refresh, notify } = useApp();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Upload patient document"
      description="PDF, PNG or JPEG · maximum 10 MB · authenticated access only"
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setBusy(true);
          try {
            const data = new FormData();
            data.set("patient_id", patientId);
            data.set("title", title);
            data.set("file", file);
            if (orderId) data.set("order_id", orderId);
            await api("/documents", "POST", data);
            await refresh();
            notify("Document uploaded.");
            onClose();
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Document title</span>
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="upload-zone">
          <span>Select report or consent document</span>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            required
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        <ErrorBox error={error} />
        <div className="form-footer">
          <small>Stored outside the public web directory.</small>
          <Button disabled={busy}>Upload document</Button>
        </div>
      </form>
    </Modal>
  );
}
