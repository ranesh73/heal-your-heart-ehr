import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
}: {
  patientId?: string;
  plan?: Row;
  onClose: () => void;
  appointment?: Row;
}) {
  const { staff, patients, resources, refresh, notify } = useApp();
  const fields: Field[] = [
    ...(!appointment
      ? [
          {
            name: "patient_id",
            label: "Patient",
            type: "patient",
            required: true,
          },
        ]
      : []),
    {
      name: "provider_id",
      label: plan ? "Assigned therapist" : "Provider / therapist",
      type: "provider",
      required: true,
    },
    {
      name: "resource_id",
      label: "Room / EECP bed",
      type: "resource",
      required: !!plan,
    },
    {
      name: "start_at",
      label: "Start · Asia/Kolkata",
      type: "datetime-local",
      required: true,
    },
    {
      name: "duration_minutes",
      label: "Duration · minutes",
      type: "number",
      min: 5,
      max: 1440,
      required: true,
    },
    ...(!appointment
      ? [
          { name: "visit_type", label: "Visit type", required: true },
          {
            name: "mode",
            label: "Appointment mode",
            options: ["In person", "Phone", "Video"],
            required: true,
          },
          {
            name: "repeat_count",
            label: "Number of appointments",
            type: "number",
            min: 1,
            max: 100,
            required: true,
          },
          {
            name: "interval_days",
            label: "Repeat every · days",
            type: "number",
            min: 1,
            max: 365,
            required: true,
          },
          { name: "skip_sundays", label: "Skip Sundays", type: "checkbox" },
        ]
      : []),
    {
      name: "reason",
      label: "Reason / scheduling note",
      type: "textarea",
      required: !!appointment,
    },
  ];
  const initial = appointment
    ? {
        provider_id: appointment.provider_id,
        resource_id: appointment.resource_id,
        start_at: new Date(
          new Date(appointment.start_at).getTime() + 330 * 60000,
        )
          .toISOString()
          .slice(0, 16),
        duration_minutes:
          (new Date(appointment.end_at).getTime() -
            new Date(appointment.start_at).getTime()) /
          60000,
        reason: "",
      }
    : {
        patient_id: patientId || "",
        provider_id: plan?.therapist_id || "",
        start_at: today() + "T09:00",
        duration_minutes: plan ? 60 : 30,
        visit_type: plan ? "EECP session" : "New consultation",
        mode: "In person",
        repeat_count: plan
          ? Math.max(1, plan.session_count - plan.scheduled)
          : 1,
        interval_days: 1,
        skip_sundays: true,
      };
  return (
    <Modal
      title={
        appointment
          ? "Reschedule appointment"
          : plan
            ? "Schedule EECP sessions"
            : "Book an appointment"
      }
      description="Availability and patient, provider, and bed conflicts are checked together. Recurring bookings save as one transaction."
      onClose={onClose}
      wide
    >
      <DynamicForm
        fields={fields}
        initial={initial}
        choices={{
          patient: patients,
          provider: staff.filter((s) =>
            plan
              ? s.id === plan.therapist_id
              : ["doctor", "therapist"].includes(s.role),
          ),
          resource: resources.filter((r) => !plan || r.kind === "EECP bed"),
        }}
        onSubmit={async (data) => {
          data.start_at = toISO(data.start_at);
          data.resource_id = data.resource_id || null;
          if (appointment) {
            data.version = appointment.version;
            await api(
              "/appointments/" + appointment.id + "/reschedule",
              "POST",
              data,
            );
          } else {
            data.plan_id = plan?.id || null;
            await api("/appointments", "POST", data);
          }
          await refresh();
          notify(
            appointment
              ? "Appointment rescheduled. Record history retained."
              : "Appointment booking saved.",
          );
          onClose();
        }}
        submit={appointment ? "Reschedule" : "Confirm booking"}
      />
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
      wide
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
