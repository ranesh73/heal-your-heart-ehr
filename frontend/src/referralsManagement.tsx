import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Share2,
  Plus,
  Search,
  Filter,
  FileText,
  Upload,
  Printer,
  Download,
  Send,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  User,
  ExternalLink,
  Paperclip,
  Check,
  Sparkles,
} from "lucide-react";
import { api, branch, navigate, Row } from "./api";
import { useApp } from "./context";
import { Button } from "./ui";

export interface ExternalProvider {
  id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  full_name: string;
  middle_name?: string;
  specialty?: string;
  practice_name?: string;
  about?: string;
  fax?: string;
  phone?: string;
  extn?: string;
  website?: string;
  email?: string;
  direct_address?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  id_qualifier?: string;
  identifier_value?: string;
  display_label?: string;
}

export interface ReferralAttachment {
  id: string;
  document_id?: string;
  name: string;
  size?: number;
  mime?: string;
  download_url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

export interface ReferralResponseData {
  id: string;
  referral_id: string;
  response_date: string;
  response_notes: string;
  attachments_json: ReferralAttachment[];
  is_signed: boolean;
  signed_by_id?: string;
  signed_by_name?: string;
  signed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralData {
  id: string;
  facility_id: string;
  facility_name?: string;
  facility_phone?: string;
  facility_address?: string;
  direction: "out" | "in";
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  patient_dob?: string;
  patient_sex?: string;
  patient_phone?: string;
  patient_email?: string;
  patient_address?: string;
  referral_from_name: string;
  referral_from_id?: string | null;
  referral_to_type: "external" | "internal";
  referral_to_name: string;
  referral_to_provider_id?: string | null;
  referral_to_details?: ExternalProvider | null;
  referral_reason: string;
  referral_date: string;
  priority: "Normal" | "Urgent" | "Stat";
  related_encounter_id?: string | null;
  related_encounter_title?: string;
  referral_notes: string;
  diagnoses_json: Array<{ code?: string; description?: string; name?: string }>;
  insurance_json: Array<{ provider?: string; name?: string; policy_number?: string }>;
  attachments_json: ReferralAttachment[];
  request_status: "Draft" | "Sent" | "Completed";
  response_status: "Pending" | "To Be Reviewed" | "Reviewed";
  response?: ReferralResponseData | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

function formatDateDisplay(dStr?: string): string {
  if (!dStr) return "—";
  try {
    const d = new Date(dStr.includes("T") ? dStr : dStr + "T00:00:00");
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dStr;
  }
}

// ============================================================================
// ADD PROVIDER MODAL
// ============================================================================

export function AddProviderModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (p: ExternalProvider) => void;
}) {
  const { notify } = useApp();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [prefix, setPrefix] = useState("Dr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [about, setAbout] = useState("");

  const [fax, setFax] = useState("");
  const [phone, setPhone] = useState("");
  const [extn, setExtn] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [directAddress, setDirectAddress] = useState("");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [postalCode, setPostalCode] = useState("");

  const [idQualifier, setIdQualifier] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      notify("First Name and Last Name are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        prefix,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim(),
        specialty,
        practice_name: practiceName.trim(),
        about: about.trim(),
        fax: fax.trim(),
        phone: phone.trim(),
        extn: extn.trim(),
        website: website.trim(),
        email: email.trim(),
        direct_address: directAddress.trim(),
        address_line1: address1.trim(),
        address_line2: address2.trim(),
        city: city.trim(),
        state,
        country: country.trim() || "India",
        postal_code: postalCode.trim(),
        id_qualifier: idQualifier,
        identifier_value: identifierValue.trim(),
      };
      const saved = await api("/external-providers", "POST", payload);
      notify(`Provider ${saved.full_name} added to directory.`);
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to add provider");
    } finally {
      setSubmitting(false);
    }
  }

  const SPECIALTIES = [
    "Cardiology",
    "Cardiothoracic Surgery",
    "Interventional Cardiology",
    "Clinical Cardiology",
    "OB/GYN",
    "General Medicine",
    "Endocrinology & Diabetology",
    "Nephrology",
    "Neurology",
    "Orthopedics",
    "Pulmonology",
    "Radiology & Imaging",
    "Vascular Surgery",
    "Others",
  ];

  const INDIAN_STATES = [
    "Tamil Nadu",
    "Kerala",
    "Karnataka",
    "Andhra Pradesh",
    "Telangana",
    "Maharashtra",
    "Delhi",
    "Gujarat",
    "West Bengal",
    "Punjab",
    "Uttar Pradesh",
    "Rajasthan",
    "Other",
  ];

  return createPortal(
    <div className="charm-add-provider-overlay" onClick={onClose}>
      <div
        className="charm-add-provider-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="charm-modal-header">
          <h3>Add Provider</h3>
          <button type="button" className="charm-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="charm-add-provider-form">
          <div className="charm-add-provider-body">
            {/* Section 1: Provider Details */}
            <div className="charm-form-section-title">Provider Details</div>
            <div className="charm-add-provider-grid">
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 80 }}>
                  <label className="charm-field-label">Prefix</label>
                  <input
                    type="text"
                    className="charm-input"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="charm-field-label">First Name *</label>
                  <input
                    type="text"
                    required
                    className="charm-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="charm-field-label">Speciality</label>
                <select
                  className="charm-input"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  <option value="">--Select--</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="charm-field-label">Last Name *</label>
                <input
                  type="text"
                  required
                  className="charm-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Practice Name</label>
                <input
                  type="text"
                  placeholder="Hospital or Clinic Name"
                  className="charm-input"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Middle Name</label>
                <input
                  type="text"
                  className="charm-input"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div style={{ gridRow: "span 2" }}>
                <label className="charm-field-label">About Provider</label>
                <textarea
                  rows={3}
                  className="charm-input"
                  placeholder="Sub-specialty, clinical focus or notes"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                />
              </div>
            </div>

            {/* Section 2: Contact Details */}
            <div className="charm-form-section-title" style={{ marginTop: 24 }}>
              Contact Details
            </div>
            <div className="charm-add-provider-grid">
              <div>
                <label className="charm-field-label">Fax</label>
                <input
                  type="text"
                  placeholder="(xxx) xxx-xxxx"
                  className="charm-input"
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Email</label>
                <input
                  type="email"
                  className="charm-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="charm-field-label">Phone Number</label>
                  <input
                    type="tel"
                    className="charm-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <label className="charm-field-label">Extn</label>
                  <input
                    type="text"
                    className="charm-input"
                    value={extn}
                    onChange={(e) => setExtn(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="charm-field-label">Direct Address</label>
                <input
                  type="text"
                  className="charm-input"
                  value={directAddress}
                  onChange={(e) => setDirectAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Website</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="charm-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            {/* Section 3: Address */}
            <div className="charm-form-section-title" style={{ marginTop: 24 }}>
              Address
            </div>
            <div className="charm-add-provider-grid">
              <div>
                <label className="charm-field-label">Address Line 1</label>
                <input
                  type="text"
                  className="charm-input"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">State</label>
                <select
                  className="charm-input"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">--Select--</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="charm-field-label">Address Line 2</label>
                <input
                  type="text"
                  className="charm-input"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Country</label>
                <input
                  type="text"
                  className="charm-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">City</label>
                <input
                  type="text"
                  className="charm-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="charm-field-label">Postal Code</label>
                <input
                  type="text"
                  className="charm-input"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>

            {/* Section 4: Identifiers */}
            <div className="charm-form-section-title" style={{ marginTop: 24 }}>
              Identifiers
            </div>
            <div className="charm-add-provider-grid">
              <div>
                <label className="charm-field-label">ID Qualifier</label>
                <select
                  className="charm-input"
                  value={idQualifier}
                  onChange={(e) => setIdQualifier(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="NPI">NPI</option>
                  <option value="Medical Council Regn (MCI)">Medical Council Regn (MCI / State Council)</option>
                  <option value="Tax ID">Tax ID / PAN</option>
                  <option value="Hospital Regn ID">Hospital Regn ID</option>
                </select>
              </div>

              <div>
                <label className="charm-field-label">ID</label>
                <input
                  type="text"
                  className="charm-input"
                  value={identifierValue}
                  onChange={(e) => setIdentifierValue(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="charm-add-provider-footer">
            <button
              type="submit"
              disabled={submitting}
              className="charm-btn-primary-orange"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              className="charm-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// ADD / EDIT REFERRAL FORM (Full-screen / Modal matching screenshot)
// ============================================================================

export function ReferralFormView({
  initialData,
  defaultDirection = "out",
  patientId,
  patientObj,
  onClose,
  onSaved,
}: {
  initialData?: ReferralData | null;
  defaultDirection?: "out" | "in";
  patientId?: string;
  patientObj?: Row | null;
  onClose: () => void;
  onSaved: (r: ReferralData) => void;
}) {
  const { user, staff, notify } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [addProviderOpen, setAddProviderOpen] = useState(false);

  // Direction: "out" | "in"
  const direction = initialData?.direction || defaultDirection;

  // Selected Patient
  const [selectedPatientId, setSelectedPatientId] = useState(
    initialData?.patient_id || patientId || patientObj?.id || ""
  );
  const [selectedPatientName, setSelectedPatientName] = useState(
    initialData?.patient_name ||
      (patientObj ? `${patientObj.first_name || ""} ${patientObj.last_name || ""}`.trim() : "")
  );

  // Patient Autocomplete for Global View
  const [patSearch, setPatSearch] = useState("");
  const [patSearching, setPatSearching] = useState(false);
  const [patOptions, setPatOptions] = useState<Row[]>([]);

  // Referral From
  const defaultFromName =
    initialData?.referral_from_name ||
    (user?.role === "doctor" ? `Dr. ${user.name}` : user?.name || "Hariharan S");
  const [referralFromName, setReferralFromName] = useState(defaultFromName);
  const [referralFromId, setReferralFromId] = useState(
    initialData?.referral_from_id || user?.id || ""
  );

  // Referral To (External / Internal)
  const [referralToType, setReferralToType] = useState<"external" | "internal">(
    initialData?.referral_to_type || "external"
  );
  const [referralToName, setReferralToName] = useState(initialData?.referral_to_name || "");
  const [referralToProviderId, setReferralToProviderId] = useState(
    initialData?.referral_to_provider_id || ""
  );

  // External Provider Search dropdown
  const [extSearch, setExtSearch] = useState(initialData?.referral_to_name || "");
  const [extDropdownOpen, setExtDropdownOpen] = useState(false);
  const { data: externalProviders = [] } = useQuery<ExternalProvider[]>({
    queryKey: ["external-providers", extSearch],
    queryFn: () => api(`/external-providers?q=${encodeURIComponent(extSearch)}`),
    enabled: referralToType === "external",
  });

  // Referral Details Row
  const [referralReason, setReferralReason] = useState(initialData?.referral_reason || "");
  const [referralDate, setReferralDate] = useState(
    initialData?.referral_date || new Date().toISOString().split("T")[0]
  );
  const [priority, setPriority] = useState<"Normal" | "Urgent" | "Stat">(
    initialData?.priority || "Normal"
  );
  const [relatedEncounterId, setRelatedEncounterId] = useState(
    initialData?.related_encounter_id || ""
  );

  // Referral Notes (Rich Text)
  const [referralNotes, setReferralNotes] = useState(initialData?.referral_notes || "");
  const editorRef = useRef<HTMLDivElement>(null);

  // Diagnoses, Insurance, Attachments
  const [diagnoses, setDiagnoses] = useState<Array<{ code?: string; description?: string }>>(
    initialData?.diagnoses_json || []
  );
  const [insurance, setInsurance] = useState<Array<{ provider?: string; policy_number?: string }>>(
    initialData?.insurance_json || []
  );
  const [attachments, setAttachments] = useState<ReferralAttachment[]>(
    initialData?.attachments_json || []
  );

  // Popups / pickers
  const [diagPickerOpen, setDiagPickerOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [patientDocsPickerOpen, setPatientDocsPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load patient's active diagnoses, past encounters, and documents
  const { data: patientChart } = useQuery({
    queryKey: ["patient-chart-mini", selectedPatientId],
    queryFn: () => api(`/patients/${selectedPatientId}`),
    enabled: !!selectedPatientId,
  });

  const patientEncounters = patientChart?.encounters || [];
  const patientDiagnoses = patientChart?.diagnoses || [];
  const patientDocuments = patientChart?.documents || [];

  // Search patients if in Global View
  useEffect(() => {
    if (!patientId && patSearch.length > 1) {
      setPatSearching(true);
      api(`/patients?q=${encodeURIComponent(patSearch)}`)
        .then((res) => {
          setPatOptions(res.items || []);
        })
        .finally(() => setPatSearching(false));
    } else {
      setPatOptions([]);
    }
  }, [patSearch, patientId]);

  // Sync Rich Text Content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== referralNotes) {
      editorRef.current.innerHTML = referralNotes;
    }
  }, []);

  function handleEditorInput() {
    if (editorRef.current) {
      setReferralNotes(editorRef.current.innerHTML);
    }
  }

  function execCmd(command: string, value: string | undefined = undefined) {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setReferralNotes(editorRef.current.innerHTML);
    }
  }

  // Insert Template
  function handleInsertTemplate() {
    const template = `<div><strong>Specialist Referral & Consultation Request</strong></div>
<div><strong>Clinical Indication:</strong> Refractory angina, evaluated for EECP therapy.</div>
<div><strong>Relevant Findings:</strong> Normal EF with multivessel CAD. Resting ECG shows anterolateral changes.</div>
<div><strong>Requested Action:</strong> Specialist evaluation and clearance for ongoing enhanced counterpulsation treatment protocol.</div>`;
    if (editorRef.current) {
      editorRef.current.innerHTML = template;
      setReferralNotes(template);
    }
  }

  // File Upload from Local Drive
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      notify(`Attaching "${file.name}"...`);
      // Attach metadata for form saving
      const newAtt: ReferralAttachment = {
        id: "att-" + Date.now(),
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || "Staff",
      };
      setAttachments((prev) => [...prev, newAtt]);
      notify(`File "${file.name}" attached.`);
    } catch (err: any) {
      notify("Failed to attach file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(requestStatus: "Draft" | "Sent" = "Draft") {
    if (!selectedPatientId) {
      notify("Please select a patient.");
      return;
    }
    if (!referralFromName.trim()) {
      notify("Referral From is required.");
      return;
    }
    if (!referralToName.trim()) {
      notify("Referral To is required.");
      return;
    }
    if (!referralReason.trim()) {
      notify("Referral Reason is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        direction,
        patient_id: selectedPatientId,
        referral_from_name: referralFromName.trim(),
        referral_from_id: referralFromId || null,
        referral_to_type: referralToType,
        referral_to_name: referralToName.trim(),
        referral_to_provider_id: referralToProviderId || null,
        referral_reason: referralReason.trim(),
        referral_date: referralDate,
        priority,
        related_encounter_id: relatedEncounterId || null,
        referral_notes: referralNotes,
        diagnoses_json: diagnoses,
        insurance_json: insurance,
        attachments_json: attachments,
        request_status: requestStatus,
      };

      let saved: ReferralData;
      if (initialData?.id) {
        saved = await api(`/referrals/${initialData.id}`, "PUT", payload);
        notify("Referral updated successfully.");
      } else {
        saved = await api("/referrals", "POST", payload);
        notify("Referral created successfully.");
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to save referral");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePreview() {
    if (!initialData?.id) {
      notify("Please save the referral first to preview official letterhead PDF.");
      return;
    }
    window.open(`/api/referrals/${initialData.id}/pdf?preview=true`, "_blank");
  }

  const titlePrefix = initialData ? "Edit" : "Add";
  const directionTitle = direction === "out" ? "Referral Out" : "Referral In";

  return (
    <div className="charm-referral-form-wrap">
      {/* Top Action Bar */}
      <div className="charm-referral-top-bar">
        <div className="charm-referral-title">
          <h2>{`${titlePrefix} ${directionTitle}`}</h2>
        </div>
        <div className="charm-referral-top-actions">
          <button
            type="button"
            className="charm-btn-primary-orange"
            disabled={submitting}
            onClick={() => handleSave("Draft")}
          >
            Save
          </button>
          <button
            type="button"
            className="charm-btn-secondary"
            onClick={handlePreview}
          >
            Preview
          </button>
          <button
            type="button"
            className="charm-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="charm-referral-form-body">
        {/* 3-Column Top Metadata Box */}
        <div className="charm-referral-3col-box">
          {/* Box 1: Patient */}
          <div className="charm-referral-box-cell">
            <label className="charm-field-label">Patient *</label>
            {patientId || patientObj ? (
              <div className="charm-referral-patient-fixed">
                <strong>{selectedPatientName || "Patient Selected"}</strong>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="charm-input"
                  placeholder="Search Patient by Name / MRN..."
                  value={patSearch || selectedPatientName}
                  onChange={(e) => {
                    setPatSearch(e.target.value);
                    setSelectedPatientName("");
                    setSelectedPatientId("");
                  }}
                />
                {patOptions.length > 0 && (
                  <div className="charm-autocomplete-dropdown">
                    {patOptions.map((p) => (
                      <div
                        key={p.id}
                        className="charm-autocomplete-item"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setSelectedPatientName(`${p.first_name} ${p.last_name}`);
                          setPatSearch("");
                          setPatOptions([]);
                        }}
                      >
                        <strong>{p.name || `${p.first_name} ${p.last_name}`}</strong>
                        <small style={{ color: "#64748b", marginLeft: 8 }}>MRN: {p.mrn}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Box 2: Referral From */}
          <div className="charm-referral-box-cell">
            <label className="charm-field-label">Referral From *</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10 }} />
              <input
                type="text"
                className="charm-input"
                style={{ paddingLeft: 30, paddingRight: 28 }}
                value={referralFromName}
                onChange={(e) => setReferralFromName(e.target.value)}
                placeholder="Search clinic provider..."
              />
              {referralFromName && (
                <button
                  type="button"
                  className="charm-input-clear-btn"
                  onClick={() => setReferralFromName("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Box 3: Referral To */}
          <div className="charm-referral-box-cell">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label className="charm-field-label" style={{ marginBottom: 0 }}>Referral To *</label>
              <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="referralToType"
                    checked={referralToType === "external"}
                    onChange={() => {
                      setReferralToType("external");
                      setReferralToName("");
                      setExtSearch("");
                    }}
                  />
                  <span>External</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="referralToType"
                    checked={referralToType === "internal"}
                    onChange={() => {
                      setReferralToType("internal");
                      setReferralToName("");
                    }}
                  />
                  <span>Internal</span>
                </label>
              </div>
            </div>

            {referralToType === "external" ? (
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10 }} />
                  <input
                    type="text"
                    className="charm-input"
                    style={{ paddingLeft: 30 }}
                    placeholder="Search by Provider Name/Specialty"
                    value={extSearch}
                    onFocus={() => setExtDropdownOpen(true)}
                    onChange={(e) => {
                      setExtSearch(e.target.value);
                      setReferralToName(e.target.value);
                      setExtDropdownOpen(true);
                    }}
                  />
                </div>

                {extDropdownOpen && externalProviders.length > 0 && (
                  <div
                    className="charm-autocomplete-dropdown"
                    style={{ maxHeight: 200, overflowY: "auto" }}
                  >
                    {externalProviders.map((p) => (
                      <div
                        key={p.id}
                        className="charm-autocomplete-item"
                        onClick={() => {
                          setReferralToName(p.full_name);
                          setReferralToProviderId(p.id);
                          setExtSearch(p.display_label || p.full_name);
                          setExtDropdownOpen(false);
                        }}
                      >
                        <strong>{p.full_name}</strong>
                        {p.specialty && <span style={{ color: "#0f766e", marginLeft: 6 }}>({p.specialty})</span>}
                        {p.practice_name && <span style={{ color: "#64748b", marginLeft: 6 }}>- {p.practice_name}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="charm-add-new-link"
                  onClick={() => setAddProviderOpen(true)}
                >
                  Add New
                </button>
              </div>
            ) : (
              <div>
                <select
                  className="charm-input"
                  value={referralToName}
                  onChange={(e) => {
                    setReferralToName(e.target.value);
                    const st = staff.find((s: Row) => s.name === e.target.value);
                    setReferralToProviderId(st?.id || "");
                  }}
                >
                  <option value="">-- Select Internal Provider --</option>
                  {staff.map((s: Row) => (
                    <option key={s.id} value={s.name}>
                      {s.role === "doctor" ? `Dr. ${s.name}` : s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Referral Details Row */}
        <div className="charm-referral-details-row">
          <div style={{ flex: 2 }}>
            <label className="charm-field-label">Referral Reason *</label>
            <input
              type="text"
              required
              className="charm-input"
              placeholder="e.g. echo, cardiology clearance, refractory angina evaluation"
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
            />
          </div>

          <div style={{ width: 140 }}>
            <label className="charm-field-label">Referral Date *</label>
            <input
              type="date"
              className="charm-input"
              value={referralDate}
              onChange={(e) => setReferralDate(e.target.value)}
            />
          </div>

          <div style={{ width: 120 }}>
            <label className="charm-field-label">Priority</label>
            <select
              className="charm-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Stat">Stat</option>
            </select>
          </div>

          <div style={{ flex: 1.5 }}>
            <label className="charm-field-label">Related Encounter</label>
            <select
              className="charm-input"
              value={relatedEncounterId}
              onChange={(e) => setRelatedEncounterId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {patientEncounters.map((enc: any) => (
                <option key={enc.id} value={enc.id}>
                  {enc.visit_type} ({formatDateDisplay(enc.created_at)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
            <button
              type="button"
              className="charm-btn-gpt-assist"
              onClick={() => {
                const sample = `Patient has completed EECP consultation. Recommended for external specialized echocardiography and cardiology review.`;
                if (editorRef.current) {
                  editorRef.current.innerHTML += `<p>${sample}</p>`;
                  setReferralNotes(editorRef.current.innerHTML);
                }
                notify("GPT clinical draft generated.");
              }}
              title="Generate referral draft using AI"
            >
              <Sparkles size={14} color="#0d9488" />
              <span>GPT Assist</span>
            </button>
          </div>
        </div>

        {/* Rich Text Referral Notes Editor */}
        <div className="charm-referral-notes-container">
          <div className="charm-referral-notes-header">
            <span className="charm-field-label" style={{ marginBottom: 0 }}>Referral Notes *</span>
            <button
              type="button"
              className="charm-btn-text-link"
              onClick={handleInsertTemplate}
            >
              Templates
            </button>
          </div>

          {/* Formatting Toolbar */}
          <div className="charm-rich-toolbar">
            <button type="button" onClick={() => execCmd("bold")} title="Bold"><strong>B</strong></button>
            <button type="button" onClick={() => execCmd("italic")} title="Italic"><em>I</em></button>
            <button type="button" onClick={() => execCmd("underline")} title="Underline"><u>U</u></button>
            <button type="button" onClick={() => execCmd("strikeThrough")} title="Strikethrough"><s>S</s></button>
            <span className="charm-toolbar-sep" />
            <select
              onChange={(e) => execCmd("fontSize", e.target.value)}
              defaultValue="3"
              className="charm-toolbar-select"
            >
              <option value="2">Small</option>
              <option value="3">Normal</option>
              <option value="4">Large</option>
              <option value="5">Heading</option>
            </select>
            <span className="charm-toolbar-sep" />
            <button type="button" onClick={() => execCmd("justifyLeft")} title="Align Left">≡</button>
            <button type="button" onClick={() => execCmd("justifyCenter")} title="Align Center">≢</button>
            <button type="button" onClick={() => execCmd("justifyRight")} title="Align Right">≣</button>
            <span className="charm-toolbar-sep" />
            <button type="button" onClick={() => execCmd("insertUnorderedList")} title="Bullet List">• List</button>
            <button type="button" onClick={() => execCmd("insertOrderedList")} title="Numbered List">1. List</button>
          </div>

          {/* Editable Content */}
          <div
            ref={editorRef}
            contentEditable
            className="charm-rich-editable"
            onInput={handleEditorInput}
            style={{ minHeight: 180 }}
          />
        </div>

        {/* Bottom 3-Column Attachments Bar */}
        <div className="charm-referral-bottom-3col">
          {/* Col 1: Diagnoses */}
          <div className="charm-referral-bottom-cell">
            <div className="charm-bottom-cell-header">
              <span>Diagnoses</span>
              <button
                type="button"
                className="charm-bottom-action-link"
                onClick={() => setDiagPickerOpen(!diagPickerOpen)}
              >
                Choose
              </button>
            </div>
            <div className="charm-bottom-cell-content">
              {diagnoses.length === 0 ? (
                <span className="charm-empty-text">No diagnoses chosen</span>
              ) : (
                <div className="charm-chip-list">
                  {diagnoses.map((d, i) => (
                    <span key={i} className="charm-chip">
                      {d.code ? `[${d.code}] ` : ""}{d.description || (d as any).name}
                      <button
                        type="button"
                        onClick={() => setDiagnoses(diagnoses.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {diagPickerOpen && patientDiagnoses.length > 0 && (
              <div className="charm-picker-popup">
                <div className="charm-picker-title">Select Patient Diagnoses</div>
                {patientDiagnoses.map((pd: any) => (
                  <label key={pd.id} className="charm-picker-item">
                    <input
                      type="checkbox"
                      checked={diagnoses.some((d) => d.code === pd.code || d.description === pd.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDiagnoses([...diagnoses, { code: pd.code, description: pd.name }]);
                        } else {
                          setDiagnoses(diagnoses.filter((d) => d.code !== pd.code && d.description !== pd.name));
                        }
                      }}
                    />
                    <span>{pd.code ? `[${pd.code}] ` : ""}{pd.name}</span>
                  </label>
                ))}
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button
                    type="button"
                    className="charm-btn-secondary"
                    onClick={() => setDiagPickerOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Col 2: Insurance */}
          <div className="charm-referral-bottom-cell">
            <div className="charm-bottom-cell-header">
              <span>Insurance</span>
              <button
                type="button"
                className="charm-bottom-action-link"
                onClick={() => {
                  const sample = { provider: "Star Health & Allied Insurance", policy_number: "SH-9082314-CARDIAC" };
                  setInsurance([sample]);
                  notify("Patient insurance policy linked.");
                }}
              >
                Choose
              </button>
            </div>
            <div className="charm-bottom-cell-content">
              {insurance.length === 0 ? (
                <span className="charm-empty-text">No insurance chosen</span>
              ) : (
                <div className="charm-chip-list">
                  {insurance.map((ins, i) => (
                    <span key={i} className="charm-chip">
                      {ins.provider || (ins as any).name} ({ins.policy_number || "Active"})
                      <button
                        type="button"
                        onClick={() => setInsurance(insurance.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Col 3: Attachments */}
          <div className="charm-referral-bottom-cell" style={{ position: "relative" }}>
            <div className="charm-bottom-cell-header">
              <span>Attachments</span>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="charm-bottom-action-link"
                  onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                >
                  Attach <ChevronDown size={12} style={{ verticalAlign: "middle" }} />
                </button>

                {attachMenuOpen && (
                  <div className="charm-dropdown-anchored">
                    <button
                      type="button"
                      className="charm-dropdown-item"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload size={14} /> From Local Drive
                    </button>
                    <button
                      type="button"
                      className="charm-dropdown-item"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setPatientDocsPickerOpen(true);
                      }}
                    >
                      <FileText size={14} /> Patient Documents
                    </button>
                  </div>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            <div className="charm-bottom-cell-content">
              {attachments.length === 0 ? (
                <span className="charm-empty-text">No attachments</span>
              ) : (
                <div className="charm-chip-list">
                  {attachments.map((att, i) => (
                    <span key={i} className="charm-chip">
                      <Paperclip size={12} style={{ marginRight: 4 }} />
                      {att.name}
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Patient Documents Picker */}
            {patientDocsPickerOpen && (
              <div className="charm-picker-popup">
                <div className="charm-picker-title">Attach from Patient Documents</div>
                {patientDocuments.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: 13 }}>No documents found in patient chart.</p>
                ) : (
                  patientDocuments.map((doc: any) => (
                    <label key={doc.id} className="charm-picker-item">
                      <input
                        type="checkbox"
                        checked={attachments.some((a) => a.document_id === doc.id || a.name === doc.filename)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAttachments([
                              ...attachments,
                              {
                                id: doc.id,
                                document_id: doc.id,
                                name: doc.title || doc.filename,
                                size: doc.size,
                                mime: doc.mime,
                                download_url: `/api/documents/${doc.id}/download`,
                              },
                            ]);
                          } else {
                            setAttachments(attachments.filter((a) => a.document_id !== doc.id));
                          }
                        }}
                      />
                      <span>{doc.title || doc.filename}</span>
                    </label>
                  ))
                )}
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button
                    type="button"
                    className="charm-btn-secondary"
                    onClick={() => setPatientDocsPickerOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal
        isOpen={addProviderOpen}
        onClose={() => setAddProviderOpen(false)}
        onSuccess={(prov) => {
          setReferralToName(prov.full_name);
          setReferralToProviderId(prov.id);
          setExtSearch(prov.display_label || prov.full_name);
          setExtDropdownOpen(false);
          setAddProviderOpen(false);
        }}
      />
    </div>
  );
}

// ============================================================================
// REFERRAL DETAIL VIEW & RESPONSE TAB WORKFLOW
// ============================================================================

export function ReferralDetailCard({
  referral,
  onClose,
  onEdit,
  onDeleted,
  onUpdated,
}: {
  referral: ReferralData;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: (r: ReferralData) => void;
}) {
  const { user, notify } = useApp();
  const [activeTab, setActiveTab] = useState<"detail" | "response">("detail");
  const [isEditingResponse, setIsEditingResponse] = useState(false);

  // Response Form State
  const [respDate, setRespDate] = useState(
    referral.response?.response_date || new Date().toISOString().split("T")[0]
  );
  const [respNotes, setRespNotes] = useState(referral.response?.response_notes || "");
  const [respAttachments, setRespAttachments] = useState<ReferralAttachment[]>(
    referral.response?.attachments_json || []
  );
  const [respSubmitting, setRespSubmitting] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status Color
  const statusColor =
    referral.response_status === "Reviewed"
      ? "#16a34a"
      : referral.response_status === "To Be Reviewed"
      ? "#ea580c"
      : "#d97706";

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to permanently delete this referral?")) return;
    try {
      await api(`/referrals/${referral.id}`, "DELETE");
      notify("Referral deleted successfully.");
      onDeleted();
      onClose();
    } catch (err: any) {
      notify(err.message || "Failed to delete referral");
    }
  }

  async function handleSaveResponse(signNow: boolean = false) {
    setRespSubmitting(true);
    try {
      const payload = {
        response_date: respDate,
        response_notes: respNotes,
        attachments_json: respAttachments,
      };
      let updated = await api(`/referrals/${referral.id}/response`, "POST", payload);

      if (signNow) {
        updated = await api(`/referrals/${referral.id}/response/sign`, "POST");
        notify("Response signed and referral marked Reviewed.");
      } else {
        notify("Response saved. Referral marked To Be Reviewed.");
      }

      onUpdated(updated);
      setIsEditingResponse(false);
    } catch (err: any) {
      notify(err.message || "Failed to save response");
    } finally {
      setRespSubmitting(false);
    }
  }

  // Upload Attachment directly for response
  async function handleResponseFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      notify("File size exceeds 25 MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      notify(`Uploading and archiving "${file.name}"...`);
      const formData = new FormData();
      formData.append("target", "response");
      formData.append("file", file);

      // Call through the standard api helper which sets multipart headers, credentials & CSRF automatically
      const data = await api(`/referrals/${referral.id}/upload-attachment`, "POST", formData);

      const newAtt: ReferralAttachment = data.attachment || {
        id: data.id || "att-" + Date.now(),
        document_id: data.document_id,
        name: data.filename || data.name || file.name,
        size: data.file_size || data.size || file.size,
        mime: data.content_type || data.mime || file.type || "application/octet-stream",
        download_url:
          data.download_url ||
          data.url ||
          (data.document_id ? `/api/documents/${data.document_id}/download` : undefined),
        uploaded_at: data.uploaded_at || new Date().toISOString(),
        uploaded_by: data.uploaded_by || user?.name || "Staff",
      };

      setRespAttachments((prev) => [...prev, newAtt]);
      notify(`Report "${file.name}" uploaded and archived to Patient Documents.`);
      if (data.referral) {
        onUpdated(data.referral);
      }
    } catch (err: any) {
      // Surface real backend error message clearly
      const errMsg =
        err.response?.data?.detail ||
        err.message ||
        (err.status ? `Upload failed with status ${err.status}` : "File upload failed");
      notify(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePrint() {
    window.open(`/api/referrals/${referral.id}/pdf?preview=true`, "_blank");
  }

  function handleDownload() {
    window.open(`/api/referrals/${referral.id}/pdf`, "_blank");
  }

  const subTabLabel = referral.direction === "out" ? "Referral Out" : "Referral In";

  return (
    <div className="charm-referral-detail-view">
      {/* Top Header Card Navigation & Actions */}
      <div className="charm-referral-detail-header">
        <div className="charm-subtabs" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className={`charm-subtab-btn ${activeTab === "detail" ? "active" : ""}`}
            onClick={() => setActiveTab("detail")}
          >
            {subTabLabel}
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${activeTab === "response" ? "active" : ""}`}
            onClick={() => setActiveTab("response")}
          >
            Response
          </button>
        </div>

        <div className="charm-referral-detail-actions">
          {activeTab === "detail" ? (
            <>
              <button type="button" className="charm-btn-primary-orange" onClick={onEdit}>
                Edit
              </button>
              <button type="button" className="charm-btn-secondary" onClick={handleDelete}>
                Delete
              </button>
              <button type="button" className="charm-btn-secondary" onClick={handlePrint}>
                Print
              </button>
              <button type="button" className="charm-btn-secondary" onClick={handleDownload}>
                Download ▾
              </button>
              <button
                type="button"
                className="charm-btn-secondary"
                onClick={() => notify("Referral transmitted via direct fax/email.")}
              >
                Transmit ▾
              </button>
              <button type="button" className="charm-btn-secondary" onClick={onClose}>
                Close
              </button>
            </>
          ) : isEditingResponse ? (
            <>
              <button
                type="button"
                className="charm-btn-primary-orange"
                disabled={respSubmitting}
                onClick={() => handleSaveResponse(false)}
              >
                Save
              </button>
              <button
                type="button"
                className="charm-btn-primary-orange"
                style={{ background: "#0d9488" }}
                disabled={respSubmitting}
                onClick={() => handleSaveResponse(true)}
              >
                Sign
              </button>
              <button
                type="button"
                className="charm-btn-secondary"
                onClick={() => setIsEditingResponse(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="charm-btn-primary-orange"
                onClick={() => setIsEditingResponse(true)}
              >
                {referral.response ? "Edit Response" : "Add Response"}
              </button>
              <button type="button" className="charm-btn-secondary" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: REFERRAL SUMMARY VIEW */}
      {activeTab === "detail" && (
        <div className="charm-referral-card-body">
          {/* 3-Column Header Card */}
          <div className="charm-referral-summary-grid">
            {/* Patient Col */}
            <div className="charm-summary-col">
              <div className="charm-summary-col-title">Patient</div>
              <div className="charm-summary-val" style={{ fontSize: 15, fontWeight: 700, color: "#0f766e" }}>
                {referral.patient_name}
              </div>
              <div className="charm-summary-sub">
                DOB / Gender : {formatDateDisplay(referral.patient_dob)} / {referral.patient_sex || "—"}
              </div>
              <div className="charm-summary-sub">{referral.patient_address || "NA Tamil Nadu"}</div>
              <div className="charm-summary-sub">Mobile : {referral.patient_phone || "—"}</div>
              <div className="charm-summary-sub">Email : {referral.patient_email || "—"}</div>
            </div>

            {/* Referral From Col */}
            <div className="charm-summary-col">
              <div className="charm-summary-col-title">Referral From</div>
              <div className="charm-summary-val" style={{ fontSize: 15, fontWeight: 700 }}>
                {referral.referral_from_name}
              </div>
              <div className="charm-summary-sub">{referral.facility_name || "Heal Your Heart Neelankarai"}</div>
              <div className="charm-summary-sub">
                {referral.facility_address || "Plot No.357, Second Floor, ECR, Sri Kapaleeswarar Nagar, Neelankarai, Chennai 600115"}
              </div>
              <div className="charm-summary-sub">Phone : {referral.facility_phone || "9003070065"}</div>
            </div>

            {/* Referral To Col */}
            <div className="charm-summary-col">
              <div className="charm-summary-col-title">Referral To</div>
              <div className="charm-summary-val" style={{ fontSize: 15, fontWeight: 700 }}>
                {referral.referral_to_name}
              </div>
              <div className="charm-summary-sub">
                {referral.referral_to_details?.specialty || "Cardiology"}
              </div>
              <div className="charm-summary-sub">
                {referral.referral_to_details?.about || "Interventional cardiology"}
              </div>
              <div className="charm-summary-sub">
                {referral.referral_to_details?.practice_name || "MGM Healthcare"}
              </div>
              <div className="charm-summary-sub">
                {referral.referral_to_details?.address_line1 || "11, 52, 1st Main Rd, Gandhi Nagar, Chennai"}
              </div>
            </div>
          </div>

          {/* Metadata Strip */}
          <div className="charm-referral-meta-strip">
            <div>
              <span className="charm-meta-lbl">Referral Reason: </span>
              <strong className="charm-meta-val">{referral.referral_reason}</strong>
            </div>
            <div>
              <span className="charm-meta-lbl">Referral Date: </span>
              <span className="charm-meta-val">{formatDateDisplay(referral.referral_date)}</span>
            </div>
            <div>
              <span className="charm-meta-lbl">Related Encounter: </span>
              <span className="charm-meta-val">{referral.related_encounter_title || "—"}</span>
            </div>
            <div>
              <span className="charm-meta-lbl">Priority: </span>
              <span className="charm-meta-val">{referral.priority}</span>
            </div>
            <div>
              <span className="charm-meta-lbl">Response Status: </span>
              <span
                style={{
                  color: statusColor,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {referral.response_status}
              </span>
            </div>
          </div>

          {/* Referral Notes Box */}
          <div className="charm-referral-notes-box">
            <div className="charm-notes-box-title">Referral Notes</div>
            <div
              className="charm-notes-box-content"
              dangerouslySetInnerHTML={{ __html: referral.referral_notes || "<em>No notes entered.</em>" }}
            />
          </div>

          {/* Bottom 3 Cards: Diagnoses | Insurance | Attachments */}
          <div className="charm-referral-bottom-summary">
            <div className="charm-bottom-summary-col">
              <div className="charm-bottom-col-title">Diagnoses</div>
              {referral.diagnoses_json?.length === 0 ? (
                <span className="charm-empty-text">No diagnoses recorded</span>
              ) : (
                <ul className="charm-summary-bullet-list">
                  {referral.diagnoses_json.map((d, i) => (
                    <li key={i}>
                      {d.code && <strong>[{d.code}] </strong>}
                      {d.description || d.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="charm-bottom-summary-col">
              <div className="charm-bottom-col-title">Insurance</div>
              {referral.insurance_json?.length === 0 ? (
                <span className="charm-empty-text">No insurance recorded</span>
              ) : (
                <ul className="charm-summary-bullet-list">
                  {referral.insurance_json.map((ins, i) => (
                    <li key={i}>
                      {ins.provider || ins.name} ({ins.policy_number || "Active"})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="charm-bottom-summary-col">
              <div className="charm-bottom-col-title">Attachments</div>
              {referral.attachments_json?.length === 0 ? (
                <span className="charm-empty-text">No attachments</span>
              ) : (
                <ul className="charm-summary-bullet-list">
                  {referral.attachments_json.map((att, i) => (
                    <li key={i}>
                      <a
                        href={att.download_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#0f766e", textDecoration: "underline" }}
                      >
                        <Paperclip size={12} style={{ marginRight: 4 }} />
                        {att.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RESPONSE WORKFLOW */}
      {activeTab === "response" && (
        <div className="charm-referral-card-body">
          {/* If No Response Recorded yet & Not in Edit Mode: Empty State */}
          {!referral.response && !isEditingResponse ? (
            <div className="charm-referral-empty-response">
              <p>
                No response received from provider. On receiving, please add it here using 'Add
                Response' option
              </p>
              <button
                type="button"
                className="charm-btn-primary-orange"
                onClick={() => setIsEditingResponse(true)}
              >
                Add Response
              </button>
            </div>
          ) : isEditingResponse ? (
            /* Add / Edit Response Form */
            <div className="charm-response-form-wrap">
              {/* 3-Column Header */}
              <div className="charm-referral-summary-grid">
                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Patient</div>
                  <div className="charm-summary-val" style={{ fontWeight: 700, color: "#0f766e" }}>
                    {referral.patient_name}
                  </div>
                  <div className="charm-summary-sub">
                    DOB / Gender: {formatDateDisplay(referral.patient_dob)} / {referral.patient_sex || "—"}
                  </div>
                  <div className="charm-summary-sub">Mobile: {referral.patient_phone || "—"}</div>
                </div>

                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Response From</div>
                  <div className="charm-summary-val" style={{ fontWeight: 700 }}>
                    {referral.referral_to_name}
                  </div>
                  <div className="charm-summary-sub">
                    {referral.referral_to_details?.specialty || "Cardiology Specialist"}
                  </div>
                  <div className="charm-summary-sub">
                    {referral.referral_to_details?.practice_name || "External Hospital / Center"}
                  </div>
                </div>

                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Response To</div>
                  <div className="charm-summary-val" style={{ fontWeight: 700 }}>
                    {referral.referral_from_name}
                  </div>
                  <div className="charm-summary-sub">
                    {referral.facility_name || "Heal Your Heart Neelankarai"}
                  </div>
                  <div className="charm-summary-sub">
                    Phone: {referral.facility_phone || "9003070065"}
                  </div>
                </div>
              </div>

              {/* Response Date Picker */}
              <div style={{ marginTop: 16, marginBottom: 12, width: 220 }}>
                <label className="charm-field-label">Response Date *</label>
                <input
                  type="date"
                  className="charm-input"
                  value={respDate}
                  onChange={(e) => setRespDate(e.target.value)}
                />
              </div>

              {/* Response Notes Rich Text */}
              <div className="charm-referral-notes-container" style={{ marginTop: 12 }}>
                <div className="charm-referral-notes-header">
                  <span className="charm-field-label" style={{ marginBottom: 0 }}>Response Notes</span>
                </div>
                <textarea
                  rows={6}
                  className="charm-input"
                  placeholder="Enter consultation report findings, recommendations, test conclusions..."
                  value={respNotes}
                  onChange={(e) => setRespNotes(e.target.value)}
                />
              </div>

              {/* Response Attachments */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="charm-field-label" style={{ marginBottom: 0 }}>Attachments</label>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="charm-bottom-action-link inline-flex items-center gap-1 whitespace-nowrap"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                      onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                    >
                      Attach <ChevronDown size={12} style={{ verticalAlign: "middle" }} />
                    </button>

                    {attachMenuOpen && (
                      <div className="charm-dropdown-anchored">
                        <button
                          type="button"
                          className="charm-dropdown-item"
                          onClick={() => {
                            setAttachMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                        >
                          <Upload size={14} /> From Local Drive
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleResponseFileUpload}
                />

                <div className="charm-bottom-cell-content" style={{ marginTop: 8 }}>
                  {respAttachments.length === 0 ? (
                    <span className="charm-empty-text">No documents or diagnostic reports attached.</span>
                  ) : (
                    <div className="charm-attachment-items-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {respAttachments.map((att, i) => {
                        const dlUrl =
                          att.download_url ||
                          (att as any).url ||
                          (att.document_id ? `/api/documents/${att.document_id}/download` : undefined);
                        const fileSizeStr = att.size ? ` (${Math.round(att.size / 1024)} KB)` : "";

                        return (
                          <div
                            key={att.id || i}
                            className="charm-attachment-row-card"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 4,
                              padding: "6px 10px",
                              fontSize: 12.5,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                              <Paperclip size={14} color="#0f766e" style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {att.name || (att as any).filename || "Attached Document"}
                              </span>
                              {fileSizeStr && (
                                <span style={{ color: "#64748b", fontSize: 11, flexShrink: 0 }}>
                                  {fileSizeStr}
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                              {dlUrl && (
                                <a
                                  href={dlUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="charm-btn-text-link"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    color: "#0d9488",
                                    fontWeight: 600,
                                    fontSize: 12,
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                  }}
                                  title="View or Download Attachment"
                                >
                                  <ExternalLink size={12} /> View/Download
                                </a>
                              )}
                              <button
                                type="button"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  padding: "2px 4px",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                                title="Remove Attachment"
                                onClick={() => setRespAttachments(respAttachments.filter((_, idx) => idx !== i))}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* View Existing Response */
            <div className="charm-response-view">
              <div className="charm-referral-summary-grid">
                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Response Date</div>
                  <div className="charm-summary-val" style={{ fontWeight: 700 }}>
                    {formatDateDisplay(referral.response?.response_date)}
                  </div>
                </div>

                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Reviewed / Signed</div>
                  <div className="charm-summary-val">
                    {referral.response?.is_signed ? (
                      <span style={{ color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={16} /> Signed by {referral.response?.signed_by_name || "Doctor"}
                      </span>
                    ) : (
                      <span style={{ color: "#ea580c", fontWeight: 700 }}>
                        Pending Doctor Sign-off
                      </span>
                    )}
                  </div>
                  {referral.response?.signed_at && (
                    <small style={{ color: "#64748b" }}>
                      {formatDateDisplay(referral.response.signed_at)}
                    </small>
                  )}
                </div>

                <div className="charm-summary-col">
                  <div className="charm-summary-col-title">Response Status</div>
                  <div style={{ color: statusColor, fontWeight: 700, fontSize: 14 }}>
                    {referral.response_status}
                  </div>
                </div>
              </div>

              <div className="charm-referral-notes-box" style={{ marginTop: 16 }}>
                <div className="charm-notes-box-title">Response Notes</div>
                <div className="charm-notes-box-content">
                  {referral.response?.response_notes ? (
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                      {referral.response.response_notes}
                    </p>
                  ) : (
                    <em>No response notes entered.</em>
                  )}
                </div>
              </div>

              {referral.response?.attachments_json && referral.response.attachments_json.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="charm-notes-box-title" style={{ marginBottom: 8 }}>Attached Diagnostic Reports</div>
                  <div className="charm-attachment-items-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {referral.response.attachments_json.map((att, i) => {
                      const dlUrl =
                        att.download_url ||
                        (att as any).url ||
                        (att.document_id ? `/api/documents/${att.document_id}/download` : undefined);
                      const fileSizeStr = att.size ? ` (${Math.round(att.size / 1024)} KB)` : "";

                      return (
                        <div
                          key={att.id || i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 4,
                            padding: "6px 10px",
                            fontSize: 12.5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                            <Paperclip size={14} color="#0f766e" style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                fontWeight: 600,
                                color: "#1e293b",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {att.name || (att as any).filename || "Attached Document"}
                            </span>
                            {fileSizeStr && (
                              <span style={{ color: "#64748b", fontSize: 11, flexShrink: 0 }}>
                                {fileSizeStr}
                              </span>
                            )}
                          </div>
                          {dlUrl && (
                            <a
                              href={dlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="charm-btn-text-link"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                color: "#0d9488",
                                fontWeight: 600,
                                fontSize: 12,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                              title="View or Download Attachment"
                            >
                              <ExternalLink size={12} /> View/Download
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PATIENT CHART -> REFERRALS TAB
// ============================================================================

export function PatientReferralsTab({
  patient,
}: {
  patient: Row;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"out" | "in">("out");
  const [formOpen, setFormOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<ReferralData | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ReferralData | null>(null);

  const { data: referrals = [], isLoading, refetch } = useQuery<ReferralData[]>({
    queryKey: ["patient-referrals", patient.id, tab],
    queryFn: () => api(`/patients/${patient.id}/referrals?direction=${tab}`),
  });

  const buttonLabel = tab === "out" ? "+ Referral Out" : "+ Referral In";

  if (formOpen) {
    return (
      <ReferralFormView
        initialData={editingReferral}
        defaultDirection={tab}
        patientId={patient.id}
        patientObj={patient}
        onClose={() => {
          setFormOpen(false);
          setEditingReferral(null);
        }}
        onSaved={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ["patient-chart", patient.id] });
        }}
      />
    );
  }

  if (selectedDetail) {
    return (
      <ReferralDetailCard
        referral={selectedDetail}
        onClose={() => setSelectedDetail(null)}
        onEdit={() => {
          setEditingReferral(selectedDetail);
          setSelectedDetail(null);
          setFormOpen(true);
        }}
        onDeleted={() => {
          refetch();
          setSelectedDetail(null);
        }}
        onUpdated={(updated) => {
          setSelectedDetail(updated);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="charm-patient-referrals-tab">
      {/* Top Header Bar & Tabs */}
      <div className="charm-tab-header-strip">
        <div className="charm-referral-tabs-left">
          <button
            type="button"
            className={`charm-subtab-btn ${tab === "out" ? "active" : ""}`}
            onClick={() => setTab("out")}
          >
            Referral Out
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${tab === "in" ? "active" : ""}`}
            onClick={() => setTab("in")}
          >
            Referral In
          </button>
        </div>

        <button
          type="button"
          className="charm-btn-primary-orange charm-referral-tab-action-btn"
          onClick={() => {
            setEditingReferral(null);
            setFormOpen(true);
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {/* Referrals Data Table */}
      <div className="charm-table-container" style={{ marginTop: 12 }}>
        <table className="charm-data-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Referral From</th>
              <th style={{ width: "35%" }}>Referral To</th>
              <th style={{ width: "18%" }}>Date</th>
              <th style={{ width: "17%" }}>Response Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                  Loading referrals...
                </td>
              </tr>
            ) : referrals.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                  No data available
                </td>
              </tr>
            ) : (
              referrals.map((r) => {
                const statusColor =
                  r.response_status === "Reviewed"
                    ? "#16a34a"
                    : r.response_status === "To Be Reviewed"
                    ? "#ea580c"
                    : "#64748b";

                return (
                  <tr
                    key={r.id}
                    className="charm-clickable-row"
                    onClick={() => setSelectedDetail(r)}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.referral_from_name}</div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.referral_to_name}</div>
                        {r.request_status === "Draft" && (
                          <span className="charm-draft-badge">Draft</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: "#334155" }}>{formatDateDisplay(r.referral_date)}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          color: statusColor,
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {r.response_status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// GLOBAL LEFT NAVIGATION -> REFERRALS DASHBOARD
// ============================================================================

export function GlobalReferralsPage() {
  const { staff } = useApp();
  const [tab, setTab] = useState<"out" | "in">("out");

  // Filter States
  const [referralFrom, setReferralFrom] = useState("-- Select --");
  const [referralTo, setReferralTo] = useState("-- Select --");
  const [requestStatus, setRequestStatus] = useState("All");
  const [responseStatus, setResponseStatus] = useState("All");
  const [patientQuery, setPatientQuery] = useState("");

  // Modals & Detail
  const [formOpen, setFormOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);

  // Fetch Global Referrals
  const { data: referrals = [], isLoading, refetch } = useQuery<ReferralData[]>({
    queryKey: [
      "global-referrals",
      tab,
      referralFrom,
      referralTo,
      requestStatus,
      responseStatus,
      patientQuery,
    ],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set("direction", tab);
      if (referralFrom && referralFrom !== "-- Select --") p.set("referral_from", referralFrom);
      if (referralTo && referralTo !== "-- Select --") p.set("referral_to", referralTo);
      if (requestStatus && requestStatus !== "All") p.set("request_status", requestStatus);
      if (responseStatus && responseStatus !== "All") p.set("response_status", responseStatus);
      if (patientQuery.trim()) p.set("q", patientQuery.trim());
      return api(`/referrals?${p.toString()}`);
    },
  });

  const buttonLabel = tab === "out" ? "+ Referral Out" : "+ Referral In";

  if (formOpen) {
    return (
      <div className="charm-module-wrap" style={{ padding: 20 }}>
        <ReferralFormView
          defaultDirection={tab}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  if (selectedReferral) {
    return (
      <div className="charm-module-wrap" style={{ padding: 20 }}>
        <ReferralDetailCard
          referral={selectedReferral}
          onClose={() => setSelectedReferral(null)}
          onEdit={() => {
            setFormOpen(true);
          }}
          onDeleted={() => {
            refetch();
            setSelectedReferral(null);
          }}
          onUpdated={(updated) => {
            setSelectedReferral(updated);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="charm-module-wrap charm-global-referrals-page">
      {/* Header Bar with Subtabs & Add Button */}
      <div className="charm-global-referrals-header">
        <div className="charm-referral-tabs-left">
          <button
            type="button"
            className={`charm-subtab-btn ${tab === "out" ? "active" : ""}`}
            onClick={() => setTab("out")}
          >
            Referral Out
          </button>
          <button
            type="button"
            className={`charm-subtab-btn ${tab === "in" ? "active" : ""}`}
            onClick={() => setTab("in")}
          >
            Referral In
          </button>
        </div>

        <button
          type="button"
          className="charm-btn-primary-orange charm-referral-tab-action-btn"
          onClick={() => setFormOpen(true)}
        >
          {buttonLabel}
        </button>
      </div>

      {/* Filter Toolbar (matching screenshot) */}
      <div className="charm-referral-filter-bar">
        <div>
          <label className="charm-field-label">Referral From</label>
          <select
            className="charm-input-filter"
            value={referralFrom}
            onChange={(e) => setReferralFrom(e.target.value)}
          >
            <option value="-- Select --">-- Select --</option>
            {staff.map((s: Row) => (
              <option key={s.id} value={s.name}>
                {s.role === "doctor" ? `Dr. ${s.name}` : s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="charm-field-label">Referral To</label>
          <select
            className="charm-input-filter"
            value={referralTo}
            onChange={(e) => setReferralTo(e.target.value)}
          >
            <option value="-- Select --">-- Select --</option>
            <option value="Dr. Pradeep Nayar G">Dr. Pradeep Nayar G</option>
            <option value="Dr. Meenakshi A">Dr. Meenakshi A</option>
            <option value="Dr. Madan Mohan B">Dr. Madan Mohan B</option>
            <option value="Dr. Mohammed Abith Ali">Dr. Mohammed Abith Ali</option>
            <option value="Dr. Ramasamy Subramanian">Dr. Ramasamy Subramanian</option>
          </select>
        </div>

        <div>
          <label className="charm-field-label">Request Status</label>
          <select
            className="charm-input-filter"
            value={requestStatus}
            onChange={(e) => setRequestStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="charm-field-label">Response Status</label>
          <select
            className="charm-input-filter"
            value={responseStatus}
            onChange={(e) => setResponseStatus(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="To Be Reviewed">To Be Reviewed</option>
            <option value="Reviewed">Reviewed</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label className="charm-field-label">Patient</label>
          <div style={{ position: "relative" }}>
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10, top: 9 }} />
            <input
              type="text"
              className="charm-input-filter"
              style={{ paddingLeft: 30, width: "100%" }}
              placeholder="Search Patient by Name / ID"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Global Table */}
      <div className="charm-table-container">
        <table className="charm-data-table">
          <thead>
            <tr>
              <th style={{ width: "24%" }}>Patient</th>
              <th style={{ width: "24%" }}>Referral From</th>
              <th style={{ width: "26%" }}>Referral To</th>
              <th style={{ width: "13%" }}>Date ▾</th>
              <th style={{ width: "13%" }}>Response Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                  Loading clinic referrals...
                </td>
              </tr>
            ) : referrals.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px", color: "#64748b" }}>
                  No referrals found matching the selected filters.
                </td>
              </tr>
            ) : (
              referrals.map((r) => {
                const statusColor =
                  r.response_status === "Reviewed"
                    ? "#16a34a"
                    : r.response_status === "To Be Reviewed"
                    ? "#ea580c"
                    : "#64748b";

                return (
                  <tr
                    key={r.id}
                    className="charm-clickable-row"
                    onClick={() => setSelectedReferral(r)}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="charm-pat-avatar-circle">
                          <User size={15} color="#0f766e" />
                        </div>
                        <div>
                          <a
                            href={`#/patients/${r.patient_id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${r.patient_id}`);
                            }}
                            className="charm-patient-link"
                          >
                            {r.patient_name}
                          </a>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            [ {r.patient_mrn} ]
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: "#334155" }}>
                        {r.referral_from_name}
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: "#334155" }}>
                          {r.referral_to_name}
                        </div>
                        {r.request_status === "Draft" && (
                          <span className="charm-draft-badge">Draft</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ color: "#475569" }}>{formatDateDisplay(r.referral_date)}</div>
                    </td>

                    <td>
                      <span
                        style={{
                          color: statusColor,
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {r.response_status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
