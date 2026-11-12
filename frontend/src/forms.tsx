import { useState, useMemo, useRef, useEffect } from "react";
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

export function QuickNewPatientView({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (p: Row) => void;
}) {
  const { facilities, refresh, notify } = useApp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthMonth, setBirthMonth] = useState("01");
  const [birthDay, setBirthDay] = useState("01");
  const [birthYear, setBirthYear] = useState("1990");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Chennai");
  const [district, setDistrict] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");
  const [country, setCountry] = useState("India");
  const [postalCode, setPostalCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [facilityIds, setFacilityIds] = useState<string[]>(() => [facilities?.[0]?.id || ""]);
  const [sendPhr, setSendPhr] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and Last name are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let finalDob = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
      if (age.trim()) {
        const y = new Date().getFullYear() - parseInt(age, 10);
        finalDob = `${y}-01-01`;
      }
      const selectedFacs = facilityIds.filter(Boolean);
      const targetFacs = selectedFacs.length ? selectedFacs : [facilities?.[0]?.id || ""];
      const created = await api<Row>("/patients", "POST", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob: finalDob,
        sex: gender,
        facility_ids: targetFacs,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: addr1.trim() ? (addr2.trim() ? `${addr1.trim()}, ${addr2.trim()}` : addr1.trim()) : undefined,
        area: area.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        residency: "Local",
        communication_opt_in: sendPhr,
      });
      await refresh();
      notify(`Patient created: ${created.name}`);
      onCreated(created);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to register patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="charm-quick-patient-view">
      <div className="charm-quick-patient-header-bar">
        <button
          type="button"
          className="charm-quick-patient-back-btn"
          onClick={onCancel}
        >
          ← New Patient Details
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="charm-form-row">
          <label className="charm-field-label">First Name *</label>
          <input
            type="text"
            className="charm-field-input"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Last Name *</label>
          <input
            type="text"
            className="charm-field-input"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Date of Birth *</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <select
              className="charm-field-input"
              style={{ width: 85 }}
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
            >
              {[
                { v: "01", l: "Jan" }, { v: "02", l: "Feb" }, { v: "03", l: "Mar" },
                { v: "04", l: "Apr" }, { v: "05", l: "May" }, { v: "06", l: "Jun" },
                { v: "07", l: "Jul" }, { v: "08", l: "Aug" }, { v: "09", l: "Sep" },
                { v: "10", l: "Oct" }, { v: "11", l: "Nov" }, { v: "12", l: "Dec" }
              ].map((m) => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
            <select
              className="charm-field-input"
              style={{ width: 65 }}
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
            >
              {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className="charm-field-input"
              style={{ width: 75 }}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            >
              {Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: "#64748b" }}>(OR)</span>
            <span style={{ fontSize: 12, color: "#475569" }}>Age:</span>
            <input
              type="number"
              min={1}
              max={120}
              placeholder="Age"
              className="charm-field-input"
              style={{ width: 60 }}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>Year(s)</span>
          </div>
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Gender</label>
          <div className="charm-radio-group">
            <label>
              <input
                type="radio"
                name="quick-sex"
                checked={gender === "Male"}
                onChange={() => setGender("Male")}
              />{" "}
              Male
            </label>
            <label>
              <input
                type="radio"
                name="quick-sex"
                checked={gender === "Female"}
                onChange={() => setGender("Female")}
              />{" "}
              Female
            </label>
            <label>
              <input
                type="radio"
                name="quick-sex"
                checked={gender === "Other"}
                onChange={() => setGender("Other")}
              />{" "}
              Other
            </label>
          </div>
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Address Line1</label>
          <input
            type="text"
            className="charm-field-input"
            value={addr1}
            onChange={(e) => setAddr1(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Address Line2</label>
          <input
            type="text"
            className="charm-field-input"
            value={addr2}
            onChange={(e) => setAddr2(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Area</label>
          <input
            type="text"
            className="charm-field-input"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">City</label>
          <input
            type="text"
            className="charm-field-input"
            placeholder="Search by Postal Code"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">District</label>
          <input
            type="text"
            className="charm-field-input"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">State</label>
          <select
            className="charm-field-input"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Kerala">Kerala</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
          </select>
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Country</label>
          <select
            className="charm-field-input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="India">India</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="UAE">UAE</option>
            <option value="Singapore">Singapore</option>
          </select>
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Postal Code</label>
          <input
            type="text"
            className="charm-field-input"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Email *</label>
          <input
            type="email"
            className="charm-field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Mobile Phone</label>
          <input
            type="tel"
            className="charm-field-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label">Facilities</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(facilities || []).map((f) => (
              <label key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={facilityIds.includes(f.id)}
                  onChange={(e) => {
                    if (e.target.checked) setFacilityIds((prev) => [...prev, f.id]);
                    else setFacilityIds((prev) => prev.filter((id) => id !== f.id));
                  }}
                />
                <span>{f.name} ({f.code || "HUH"})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="charm-form-row">
          <label className="charm-field-label"></label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1e293b" }}>
            <input
              type="checkbox"
              checked={sendPhr}
              onChange={(e) => setSendPhr(e.target.checked)}
            />
            Send PHR invitation
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, paddingLeft: 140, paddingBottom: 24 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              padding: "6px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {submitting ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "#e2e8f0",
              color: "#334155",
              border: "none",
              borderRadius: 4,
              padding: "6px 16px",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
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

  const [showQuickNewPatient, setShowQuickNewPatient] = useState(false);

  // Patient selection and live search
  const [selPatient, setSelPatient] = useState(patientId || appointment?.patient_id || "");
  const [patientQuery, setPatientQuery] = useState(() => {
    const targetId = patientId || appointment?.patient_id;
    if (targetId) {
      const p = patients.find((pt) => pt.id === targetId);
      return p ? `${p.name} (${p.mrn})` : "";
    }
    return "";
  });
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Provider and resource
  const [providerId, setProviderId] = useState(
    appointment?.provider_id || initialProviderId || plan?.therapist_id || (staff.find((s) => ["doctor", "therapist"].includes(s.role))?.id || "")
  );
  const [resourceId, setResourceId] = useState(appointment?.resource_id || initialResourceId || "");

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

  // Date and Time (Authentic CharmHealth separate controls)
  const initDateTime = useMemo(() => {
    if (appointment?.start_at) return new Date(new Date(appointment.start_at).getTime() + 330 * 60000);
    if (initialStart) return new Date(initialStart);
    return new Date();
  }, [appointment, initialStart]);

  const [selDate, setSelDate] = useState(() => {
    const y = initDateTime.getFullYear();
    const m = String(initDateTime.getMonth() + 1).padStart(2, "0");
    const d = String(initDateTime.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const [startHour, setStartHour] = useState(() => {
    const h = initDateTime.getHours();
    const h12 = h % 12 || 12;
    return String(h12).padStart(2, "0");
  });
  const [startMin, setStartMin] = useState(() => {
    const m = initDateTime.getMinutes();
    const rounded = Math.floor(m / 5) * 5;
    return String(rounded).padStart(2, "0");
  });
  const [startAmpm, setStartAmpm] = useState<"AM" | "PM">(() => (initDateTime.getHours() >= 12 ? "PM" : "AM"));

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
  const [allowOverlap, setAllowOverlap] = useState(true);
  const [reason, setReason] = useState(appointment?.reason || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string>("");

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Filter patients by name, MRN, phone
  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return patients.slice(0, 15);
    return patients.filter((p) => {
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchMrn = (p.mrn || "").toLowerCase().includes(q);
      const matchPhone = (p.phone || "").toLowerCase().includes(q);
      return matchName || matchMrn || matchPhone;
    }).slice(0, 20);
  }, [patients, patientQuery]);

  // Display date format: e.g. "Nov 12, 2026"
  const formattedDisplayDate = useMemo(() => {
    if (!selDate) return "";
    const [y, m, d] = selDate.split("-").map(Number);
    if (!y || !m || !d) return selDate;
    const dt = new Date(y, m - 1, d);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[dt.getMonth()]} ${String(dt.getDate()).padStart(2, "0")}, ${dt.getFullYear()}`;
  }, [selDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    let targetPatientId = selPatient || patientId;
    if (!targetPatientId && patientQuery.trim()) {
      const q = patientQuery.trim().toLowerCase();
      const match = patients.find(
        (p) =>
          (p.name || "").toLowerCase() === q ||
          (p.mrn || "").toLowerCase() === q ||
          `${p.name} (${p.mrn})`.toLowerCase() === q ||
          (p.name || "").toLowerCase().includes(q)
      );
      if (match) {
        targetPatientId = match.id;
        setSelPatient(match.id);
      }
    }
    if (!targetPatientId) {
      setErr("Please select a patient.");
      const pInput = document.querySelector<HTMLInputElement>(".charm-patient-search-input");
      if (pInput) {
        pInput.focus();
        pInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
      // Calculate start_at timestamp
      let h24 = parseInt(startHour, 10);
      if (startAmpm === "PM" && h24 < 12) h24 += 12;
      if (startAmpm === "AM" && h24 === 12) h24 = 0;
      const [year, month, day] = selDate.split("-");
      const localTimeString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${String(h24).padStart(2, "0")}:${startMin.padStart(2, "0")}:00+05:30`;

      const payload: any = {
        patient_id: targetPatientId,
        provider_id: providerId,
        resource_id: resourceId || null,
        start_at: toISO(localTimeString),
        duration_minutes: Number(duration),
        reason: reason || undefined,
        allow_overlap: allowOverlap,
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
      title={
        showQuickNewPatient
          ? "New Appointment"
          : appointment
          ? "Reschedule Appointment"
          : "New Appointment"
      }
      onClose={onClose}
      wide
    >
      {showQuickNewPatient ? (
        <QuickNewPatientView
          onCancel={() => setShowQuickNewPatient(false)}
          onCreated={(created) => {
            setSelPatient(created.id);
            setPatientQuery(`${created.name} (${created.mrn})`);
            setShowQuickNewPatient(false);
          }}
        />
      ) : (
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
                <div className="charm-patient-search-container" ref={patientDropdownRef}>
                  <div className="charm-patient-search-input-wrap">
                    <input
                      type="text"
                      className="charm-patient-search-input"
                      placeholder="Search by Name / Record ID / Mobile Phone"
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setSelPatient("");
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      required={!selPatient}
                      style={!selPatient && !patientId && err ? { borderColor: "#ef4444", boxShadow: "0 0 0 1px #ef4444" } : undefined}
                    />
                    {patientQuery && (
                      <button
                        type="button"
                        className="charm-patient-clear-btn"
                        onClick={() => {
                          setPatientQuery("");
                          setSelPatient("");
                          setShowPatientDropdown(true);
                        }}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

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
                      flexShrink: 0,
                    }}
                    title="Add New Patient"
                    onClick={() => setShowQuickNewPatient(true)}
                  >
                    +
                  </button>

                  {/* Dynamic Dropdown List */}
                  {showPatientDropdown && (
                    <div className="charm-patient-search-dropdown">
                      {filteredPatients.length === 0 ? (
                        <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>
                          No matching patients found.
                        </div>
                      ) : (
                        filteredPatients.map((p) => (
                          <div
                            key={p.id}
                            className={`charm-patient-search-item ${selPatient === p.id ? "selected" : ""}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelPatient(p.id);
                              setPatientQuery(`${p.name} (${p.mrn})`);
                              setShowPatientDropdown(false);
                            }}
                            onClick={() => {
                              setSelPatient(p.id);
                              setPatientQuery(`${p.name} (${p.mrn})`);
                              setShowPatientDropdown(false);
                            }}
                          >
                            <span className="charm-patient-search-item-name">{p.name}</span>
                            <span className="charm-patient-search-item-sub">
                              Record ID: {p.mrn} {p.phone ? `• Ph: ${p.phone}` : ""} {p.dob ? `• DOB: ${p.dob}` : ""}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="charm-form-row">
              <label className="charm-field-label">Provider *</label>
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
              <label className="charm-field-label">Resource</label>
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

            {/* APPOINTMENT MODE (Horizontal Radio Group - CharmHealth Frame 055 & 070) */}
            <div className="charm-form-row">
              <label className="charm-field-label">Appointment Mode</label>
              <div className="charm-radio-group">
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "In person" || mode === "In Person"}
                    onChange={() => setMode("In person")}
                  />{" "}
                  In Person
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "Phone" || mode === "Phone Call"}
                    onChange={() => setMode("Phone")}
                  />{" "}
                  Phone Call
                </label>
                <label>
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === "Video" || mode === "Video Consult"}
                    onChange={() => setMode("Video")}
                  />{" "}
                  Video Consult
                </label>
              </div>
            </div>

            {/* APPOINTMENT FOR (Horizontal Radio Group - CharmHealth Frame 055 & 070) */}
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

            {/* Date Selection (Authentic CharmHealth Formatted Date & Picker) */}
            <div className="charm-form-row">
              <label className="charm-field-label">Date</label>
              <div className="charm-date-input-wrap" ref={datePickerRef}>
                <input
                  type="text"
                  readOnly
                  className="charm-date-display-input"
                  value={formattedDisplayDate}
                  onClick={() => setShowDatePicker((prev) => !prev)}
                />
                <button
                  type="button"
                  className="charm-date-icon-btn"
                  onClick={() => setShowDatePicker((prev) => !prev)}
                  title="Choose Date"
                >
                  📅
                </button>

                {showDatePicker && (
                  <div className="charm-datepicker-popover">
                    <div className="charm-dp-header">
                      <button
                        type="button"
                        className="charm-dp-nav-btn"
                        onClick={() => {
                          const [curY, curM] = selDate.split("-").map(Number);
                          const prevD = new Date(curY, curM - 2, 1);
                          setSelDate(`${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}-01`);
                        }}
                      >
                        &lt;
                      </button>
                      <div className="charm-dp-title">
                        <select
                          className="charm-dp-select"
                          value={selDate.split("-")[1]}
                          onChange={(e) => {
                            const parts = selDate.split("-");
                            setSelDate(`${parts[0]}-${e.target.value}-${parts[2] || "01"}`);
                          }}
                        >
                          {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((mn, idx) => (
                            <option key={mn} value={String(idx + 1).padStart(2, "0")}>{mn}</option>
                          ))}
                        </select>
                        <select
                          className="charm-dp-select"
                          value={selDate.split("-")[0]}
                          onChange={(e) => {
                            const parts = selDate.split("-");
                            setSelDate(`${e.target.value}-${parts[1] || "01"}-${parts[2] || "01"}`);
                          }}
                        >
                          {Array.from({ length: 15 }, (_, i) => String(2020 + i)).map((yr) => (
                            <option key={yr} value={yr}>{yr}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="charm-dp-nav-btn"
                        onClick={() => {
                          const [curY, curM] = selDate.split("-").map(Number);
                          const nextD = new Date(curY, curM, 1);
                          setSelDate(`${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-01`);
                        }}
                      >
                        &gt;
                      </button>
                    </div>
                    <div className="charm-dp-weekdays">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>
                    <div className="charm-dp-grid">
                      {(() => {
                        const [curY, curM, curD] = selDate.split("-").map(Number);
                        const firstDay = new Date(curY, curM - 1, 1).getDay();
                        const totalDays = new Date(curY, curM, 0).getDate();
                        const cells = [];
                        for (let i = 0; i < firstDay; i++) {
                          cells.push(<div key={`empty-${i}`} className="charm-dp-day empty" />);
                        }
                        for (let day = 1; day <= totalDays; day++) {
                          const isSel = day === curD;
                          cells.push(
                            <div
                              key={day}
                              className={`charm-dp-day ${isSel ? "selected" : ""}`}
                              onClick={() => {
                                setSelDate(`${curY}-${String(curM).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
                                setShowDatePicker(false);
                              }}
                            >
                              {day}
                            </div>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <div className="charm-dp-footer">
                      <button
                        type="button"
                        className="charm-dp-link"
                        onClick={() => {
                          const t = new Date();
                          const y = t.getFullYear();
                          const m = String(t.getMonth() + 1).padStart(2, "0");
                          const d = String(t.getDate()).padStart(2, "0");
                          setSelDate(`${y}-${m}-${d}`);
                          setShowDatePicker(false);
                        }}
                      >
                        Today
                      </button>
                      <button type="button" className="charm-dp-link" onClick={() => setShowDatePicker(false)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Start Time Selectors (Authentic CharmHealth HH : MM AM/PM (Asia/Kolkata)) */}
            <div className="charm-form-row">
              <label className="charm-field-label">Start Time *</label>
              <div className="charm-time-row-controls">
                <select
                  className="charm-time-select"
                  style={{ width: "62px", flexShrink: 0 }}
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                >
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span style={{ fontWeight: 600, color: "#64748b" }}>:</span>
                <select
                  className="charm-time-select"
                  style={{ width: "62px", flexShrink: 0 }}
                  value={startMin}
                  onChange={(e) => setStartMin(e.target.value)}
                >
                  {["00","05","10","15","20","25","30","35","40","45","50","55"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className="charm-time-select"
                  style={{ width: "68px", flexShrink: 0 }}
                  value={startAmpm}
                  onChange={(e) => setStartAmpm(e.target.value as "AM" | "PM")}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
                <span className="charm-timezone-label">(Asia/Kolkata)</span>
              </div>
            </div>

            <div className="charm-form-row">
              <label className="charm-field-label">Duration *</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  aria-label="Duration - minutes"
                  type="number"
                  min={5}
                  max={1440}
                  className="charm-field-input"
                  style={{ width: 80 }}
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
                  <label className="charm-field-label">Repeat every - days *</label>
                  <input
                    aria-label="Repeat every - days"
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
          <div className="charm-appt-footer" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            {err && (
              <div className="error-box" style={{ width: "100%", margin: 0 }}>
                {err}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={submitting}
                className="charm-btn-confirm"
              >
                {submitting ? "Saving..." : (appointment ? "Reschedule" : "Confirm")}
              </button>
              <button
                type="button"
                className="charm-btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
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
      description="PDF, PNG or JPEG - maximum 10 MB - authenticated access only"
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
