import React, { useState, useRef, useEffect } from "react";
import { Camera, Calendar, Check, Upload as UploadIcon, X, Plus } from "lucide-react";
import { api, branch, Row } from "./api";
import { useApp } from "./context";
import { PatientPhotoChooserModal, CameraCaptureModal } from "./PatientPhotoCapture";

export const COUNTRY_DIAL_CODES: Record<string, string> = {
  "India": "+91",
  "United States": "+1",
  "Canada": "+1",
  "United Kingdom": "+44",
  "United Arab Emirates": "+971",
  "Singapore": "+65",
  "Malaysia": "+60",
  "Sri Lanka": "+94",
  "Saudi Arabia": "+966",
  "Qatar": "+974",
  "Kuwait": "+965",
  "Oman": "+968",
  "Bahrain": "+973",
  "Australia": "+61",
  "Germany": "+49",
  "France": "+33",
  "New Zealand": "+64",
  "Bangladesh": "+880",
  "Nepal": "+977",
  "Maldives": "+960",
  "Other": "+91",
};

export const COUNTRIES_LIST = [
  "India",
  "United States",
  "Canada",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Malaysia",
  "Sri Lanka",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Australia",
  "Germany",
  "France",
  "New Zealand",
  "Bangladesh",
  "Nepal",
  "Maldives",
  "Other",
];

interface AddPatientViewProps {
  onCancel: () => void;
  onSaved: (p: Row, openChart?: boolean) => void;
  initialPatient?: Row;
}

export function AddPatientView({ onCancel, onSaved, initialPatient }: AddPatientViewProps) {
  const { facilities, refresh, notify } = useApp();
  const isEditMode = !!initialPatient;

  // Basic Information
  const [firstName, setFirstName] = useState(initialPatient?.first_name || "");
  const [lastName, setLastName] = useState(initialPatient?.last_name || "");
  const [dobMode, setDobMode] = useState<"dob" | "age">("dob");
  const [dob, setDob] = useState(initialPatient?.dob || "");
  const [age, setAge] = useState(() => {
    if (initialPatient?.dob) {
      try {
        const birthYear = new Date(initialPatient.dob).getFullYear();
        const currentYear = new Date().getFullYear();
        return String(currentYear - birthYear);
      } catch {
        return "";
      }
    }
    return "";
  });
  const [sex, setSex] = useState(initialPatient?.sex || initialPatient?.gender || "Male");
  const [pronouns, setPronouns] = useState(initialPatient?.pronouns || "");
  const [facilityIds, setFacilityIds] = useState<string[]>(() => {
    if (initialPatient?.facility_ids && initialPatient.facility_ids.length > 0) {
      return initialPatient.facility_ids;
    }
    return [branch || facilities[0]?.id || ""];
  });

  // Patient IDs (3 rows by default)
  const [patientIds, setPatientIds] = useState([
    { type: "", number: "", fileName: "" },
    { type: "", number: "", fileName: "" },
    { type: "", number: "", fileName: "" },
  ]);

  // Contact Details & Country Dial Codes
  const [addressLine1, setAddressLine1] = useState(initialPatient?.address || "");
  const [addressLine2, setAddressLine2] = useState("");
  const [area, setArea] = useState(initialPatient?.area || "");
  const [city, setCity] = useState(initialPatient?.city || "");
  const [district, setDistrict] = useState(initialPatient?.district || "");
  const [state, setState] = useState(initialPatient?.state || "Tamil Nadu");
  const [country, setCountry] = useState(initialPatient?.country || "India");
  const [postalCode, setPostalCode] = useState(initialPatient?.postal_code || "");

  // Phone numbers with extracted or default dial code
  const initialDialCode = COUNTRY_DIAL_CODES[initialPatient?.country || "India"] || "+91";
  const [mobileDialCode, setMobileDialCode] = useState(() => {
    if (initialPatient?.phone && initialPatient.phone.startsWith("+")) {
      const match = initialPatient.phone.match(/^(\+\d{1,4})/);
      return match ? match[1] : initialDialCode;
    }
    return initialDialCode;
  });
  const [homeDialCode, setHomeDialCode] = useState(initialDialCode);

  const [mobilePhone, setMobilePhone] = useState(() => {
    if (initialPatient?.phone) {
      return initialPatient.phone.replace(/^\+\d{1,4}\s*/, "").trim();
    }
    return "";
  });
  const [homePhone, setHomePhone] = useState("");
  const [email, setEmail] = useState(initialPatient?.email || "");

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState(initialPatient?.emergency_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialPatient?.emergency_phone || "");

  // Patient Preferences
  const [preferredComm, setPreferredComm] = useState("");
  const [emailNotifications, setEmailNotifications] = useState<"yes" | "no">("yes");
  const [textNotifications, setTextNotifications] = useState<"yes" | "no">("yes");

  // PHR Registration
  const [phrInvitation, setPhrInvitation] = useState<"patient" | "representative" | "not_required">("patient");
  const isEmailRequired = phrInvitation === "patient" || phrInvitation === "representative";

  // Additional Information
  const [category, setCategory] = useState(initialPatient?.category || "");
  const [outstation, setOutstation] = useState(initialPatient?.residency === "Outstation" ? "Yes" : "");
  const [nri, setNri] = useState(initialPatient?.residency === "NRI" ? "Yes" : "");
  const [foreignCitizen, setForeignCitizen] = useState(initialPatient?.residency === "Foreign" ? "Yes" : "");
  const [insurance, setInsurance] = useState(initialPatient?.insurance || "");
  const [insuranceStatus, setInsuranceStatus] = useState(initialPatient?.insurance_status || "");
  const [bloodGroup, setBloodGroup] = useState(initialPatient?.blood_group || "");

  // How did you hear about us
  const [referralSource, setReferralSource] = useState(initialPatient?.referral_source || "");
  const [specificSource, setSpecificSource] = useState("");

  // Avatar & Camera
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialPatient?.photo_url || null);
  const [showPhotoChooser, setShowPhotoChooser] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateReason, setDuplicateReason] = useState("");

  // Update country and automatically sync phone dial code prefix box
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const code = COUNTRY_DIAL_CODES[newCountry] || "+91";
    setMobileDialCode(code);
    setHomeDialCode(code);
  };

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdUploadClick = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const handleIdFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const updated = [...patientIds];
      updated[index].fileName = file.name;
      setPatientIds(updated);
    }
  };

  const handleAddIdRow = () => {
    setPatientIds([...patientIds, { type: "", number: "", fileName: "" }]);
  };

  const handleFacilityToggle = (fId: string) => {
    if (facilityIds.includes(fId)) {
      if (facilityIds.length > 1) {
        setFacilityIds(facilityIds.filter((id) => id !== fId));
      }
    } else {
      setFacilityIds([...facilityIds, fId]);
    }
  };

  const computeDob = (): string => {
    if (dobMode === "age") {
      const parsedAge = parseInt(age, 10);
      if (!isNaN(parsedAge) && parsedAge > 0) {
        const year = new Date().getFullYear() - parsedAge;
        return `${year}-01-01`;
      }
      return `${new Date().getFullYear() - 30}-01-01`;
    }
    if (!dob.trim()) {
      return `${new Date().getFullYear() - 30}-01-01`;
    }
    if (dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y.padStart(4, "2000")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }
    return dob;
  };

  // Combine dial code with raw phone number cleanly without duplicates
  const combinePhoneWithCode = (code: string, number: string): string => {
    const cleanNum = number.trim();
    if (!cleanNum) return "";
    if (cleanNum.startsWith("+")) return cleanNum;
    const cleanCode = code.trim();
    if (!cleanCode) return cleanNum;
    const rawDigits = cleanCode.replace("+", "").trim();
    if (cleanNum.startsWith(rawDigits) && cleanNum.length > rawDigits.length + 5) {
      return `+${cleanNum}`;
    }
    return `${cleanCode} ${cleanNum}`;
  };

  const handleSubmit = async (openChartAfterSave: boolean) => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First Name and Last Name are required.");
      return;
    }
    if (dobMode === "dob" && !dob.trim()) {
      setError("Date of birth is required.");
      return;
    }
    if (dobMode === "age" && !age.trim()) {
      setError("Age is required.");
      return;
    }

    // Conditional Email Validation based on PHR Registration selection
    if (isEmailRequired) {
      if (!email.trim()) {
        setError(
          "Email Address is required when PHR invitation is enabled ('To Patient' or 'To Patient Representative'). Select 'Not Required' if the patient has no email."
        );
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address for PHR invitation.");
        return;
      }
    }

    setError("");
    setSubmitting(true);

    try {
      const finalDob = computeDob();
      const fullAddress = [addressLine1.trim(), addressLine2.trim()].filter(Boolean).join(", ");
      const fullReferral = [referralSource, specificSource].filter(Boolean).join(" - ");

      const finalMobile = combinePhoneWithCode(mobileDialCode, mobilePhone);
      const finalHome = combinePhoneWithCode(homeDialCode, homePhone);
      const effectivePhone = finalMobile || finalHome || undefined;

      // Determine residency
      let residency: "Local" | "Outstation" | "NRI" | "Foreign" = "Local";
      if (foreignCitizen.trim()) residency = "Foreign";
      else if (nri.trim()) residency = "NRI";
      else if (outstation.trim()) residency = "Outstation";

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob: finalDob,
        sex: sex,
        facility_ids: facilityIds.length ? facilityIds : [branch],
        phone: effectivePhone,
        email: email.trim() || undefined,
        photo_data: avatarPreview || undefined,
        send_phr_invitation: phrInvitation,
        address: fullAddress || undefined,
        area: area.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        blood_group: bloodGroup || undefined,
        residency: residency,
        emergency_name: emergencyName.trim() || undefined,
        emergency_phone: emergencyPhone.trim() || undefined,
        referral_source: fullReferral || undefined,
        communication_opt_in: phrInvitation === "patient" && emailNotifications === "yes",
        duplicate_reason: duplicateReason.trim() || undefined,
      };

      if (isEditMode && initialPatient) {
        const updated = await api<Row>(
          `/patients/${initialPatient.id}?version=${initialPatient.version}`,
          "PUT",
          payload
        );
        // Upload photo if new data URL
        if (avatarPreview && avatarPreview.startsWith("data:") && avatarPreview !== initialPatient.photo_url) {
          try {
            await api(`/patients/${initialPatient.id}/photo`, "POST", { photo_data: avatarPreview });
          } catch (pErr) {
            console.warn("Photo upload warning:", pErr);
          }
        }
        await refresh();
        notify(`Patient demographics updated: ${updated.name}`);
        onSaved(updated, false);
      } else {
        const created = await api<Row>("/patients", "POST", payload);
        // If PHR invitation is enabled, ensure PHR account is active
        if (isEmailRequired && created.email) {
          try {
            await api(`/patients/${created.id}/phr-access/enable`, "POST");
          } catch (phrErr) {
            console.warn("Auto-enabling PHR access note:", phrErr);
          }
        }
        await refresh();
        notify(`Patient created: ${created.name}`);
        onSaved(created, openChartAfterSave);
      }
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to save patient information");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="charm-add-patient-page">
      {/* Top Action Header Bar */}
      <div className="charm-add-patient-header-bar">
        <h2 className="charm-add-patient-title">
          {isEditMode ? "Edit Patient Demographics" : "Add Patient"}
        </h2>
        <div className="charm-add-patient-actions">
          <button
            type="button"
            className="charm-btn-orange"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            {submitting ? "Saving..." : isEditMode ? "Save Demographics" : "Add"}
          </button>
          {!isEditMode && (
            <button
              type="button"
              className="charm-btn-secondary"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
            >
              Add and Open
            </button>
          )}
          <button
            type="button"
            className="charm-btn-secondary"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="charm-form-error-banner">
          <X size={16} onClick={() => setError("")} style={{ cursor: "pointer", marginRight: 6 }} />
          <span>{error}</span>
        </div>
      )}

      {error.toLowerCase().includes("duplicate") && (
        <div
          style={{
            margin: "10px 24px 0 24px",
            padding: 12,
            background: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: 4,
          }}
        >
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: "#92400e",
              display: "block",
              marginBottom: 4,
            }}
          >
            Duplicate Review Override Reason (required if proceeding):
          </label>
          <input
            type="text"
            className="charm-input"
            placeholder="e.g. Identity verified via ID; distinct patient"
            value={duplicateReason}
            onChange={(e) => setDuplicateReason(e.target.value)}
          />
        </div>
      )}

      {/* Main 3-Column Grid Container */}
      <div className="charm-add-patient-grid">
        {/* ================= COLUMN 1: Basic Information ================= */}
        <div className="charm-patient-column">
          <div className="charm-section-header">Basic Information</div>

          {/* Avatar Upload & Live Camera Trigger */}
          <div className="charm-avatar-container">
            <div
              className="charm-avatar-circle"
              onClick={() => setShowPhotoChooser(true)}
              title="Click to Capture Photo with Live Camera or Upload from Device"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Patient Avatar" className="charm-avatar-img" />
              ) : (
                <svg
                  className="charm-avatar-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              <div className="charm-camera-badge" title="Live Camera / Upload Photo">
                <Camera size={14} color="#ffffff" />
              </div>
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarFileSelected}
            />
          </div>

          {/* Photo Chooser Modal */}
          <PatientPhotoChooserModal
            isOpen={showPhotoChooser}
            onClose={() => setShowPhotoChooser(false)}
            onOpenLiveCamera={() => setShowCameraModal(true)}
            onOpenDeviceUpload={() => avatarInputRef.current?.click()}
            onRemovePhoto={() => setAvatarPreview(null)}
            hasPhoto={!!avatarPreview}
          />

          {/* Live Camera Modal */}
          <CameraCaptureModal
            isOpen={showCameraModal}
            onClose={() => setShowCameraModal(false)}
            onPhotoAccepted={(dataUrl) => setAvatarPreview(dataUrl)}
            onFallbackToUpload={() => avatarInputRef.current?.click()}
          />

          {/* First Name */}
          <div className="charm-field-group">
            <label className="charm-label">
              First Name <span className="charm-required">*</span>
            </label>
            <input
              type="text"
              className="charm-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          {/* Last Name */}
          <div className="charm-field-group">
            <label className="charm-label">
              Last Name <span className="charm-required">*</span>
            </label>
            <input
              type="text"
              className="charm-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {/* DOB / Age Toggle Row */}
          <div className="charm-field-group">
            <div className="charm-dob-toggle-row">
              <div className="charm-pill-toggle">
                <button
                  type="button"
                  className={`charm-pill-btn ${dobMode === "dob" ? "active" : ""}`}
                  onClick={() => setDobMode("dob")}
                >
                  DOB
                </button>
                <button
                  type="button"
                  className={`charm-pill-btn ${dobMode === "age" ? "active" : ""}`}
                  onClick={() => setDobMode("age")}
                >
                  Age
                </button>
              </div>

              {dobMode === "dob" ? (
                <div className="charm-date-input-wrap">
                  <input
                    type="text"
                    className="charm-input"
                    placeholder="dd/mm/yyyy"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                  <Calendar size={15} className="charm-cal-icon" />
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    className="charm-input"
                    placeholder="Age in years"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min={0}
                    max={130}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sex */}
          <div className="charm-field-group">
            <label className="charm-label">
              Sex <span className="charm-required">*</span>
            </label>
            <select
              className="charm-select"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          {/* Pronouns */}
          <div className="charm-field-group">
            <label className="charm-label">Pronouns</label>
            <select
              className="charm-select"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="He/Him">He / Him / His</option>
              <option value="She/Her">She / Her / Hers</option>
              <option value="They/Them">They / Them / Theirs</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Facilities Multi-Select Box */}
          <div className="charm-field-group">
            <label className="charm-label">Facilities</label>
            <div className="charm-facilities-checklist">
              {facilities.map((fac) => {
                const checked = facilityIds.includes(fac.id);
                return (
                  <label key={fac.id} className="charm-facility-checkbox-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleFacilityToggle(fac.id)}
                    />
                    <span>
                      {fac.name} - {fac.code}001
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Patient IDs */}
          <div className="charm-section-header" style={{ marginTop: 20 }}>
            Patient IDs
          </div>
          <div className="charm-patient-ids-list">
            {patientIds.map((item, idx) => (
              <div key={idx} className="charm-id-row">
                <select
                  className="charm-select charm-id-type"
                  value={item.type}
                  onChange={(e) => {
                    const updated = [...patientIds];
                    updated[idx].type = e.target.value;
                    setPatientIds(updated);
                  }}
                >
                  <option value="">-- Select --</option>
                  <option value="Aadhaar">Aadhaar</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driving License">Driving License</option>
                  <option value="National ID">National ID</option>
                </select>
                <input
                  type="text"
                  className="charm-input charm-id-number"
                  placeholder=""
                  value={item.number}
                  onChange={(e) => {
                    const updated = [...patientIds];
                    updated[idx].number = e.target.value;
                    setPatientIds(updated);
                  }}
                />
                <button
                  type="button"
                  className="charm-id-upload-btn"
                  onClick={() => handleIdUploadClick(idx)}
                >
                  {item.fileName ? "Uploaded" : "Upload"}
                </button>
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[idx] = el;
                  }}
                  style={{ display: "none" }}
                  onChange={(e) => handleIdFileChange(idx, e)}
                />
              </div>
            ))}
            <button
              type="button"
              className="charm-text-link"
              onClick={handleAddIdRow}
              style={{ marginTop: 6, display: "inline-block" }}
            >
              More
            </button>
          </div>
        </div>

        {/* ================= COLUMN 2: Contact Details & Preferences ================= */}
        <div className="charm-patient-column">
          <div className="charm-section-header">Contact Details</div>

          {/* Address Line 1 */}
          <div className="charm-field-group">
            <label className="charm-label">Address Line 1</label>
            <input
              type="text"
              className="charm-input"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>

          {/* Address Line 2 */}
          <div className="charm-field-group">
            <label className="charm-label">Address Line 2</label>
            <input
              type="text"
              className="charm-input"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>

          {/* Area */}
          <div className="charm-field-group">
            <label className="charm-label">Area</label>
            <input
              type="text"
              className="charm-input"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          {/* City */}
          <div className="charm-field-group">
            <label className="charm-label">City</label>
            <input
              type="text"
              className="charm-input"
              placeholder="Search by Postal Code"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* District */}
          <div className="charm-field-group">
            <label className="charm-label">District</label>
            <select
              className="charm-select"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="Chennai">Chennai</option>
              <option value="Chengalpattu">Chengalpattu</option>
              <option value="Kanchipuram">Kanchipuram</option>
              <option value="Thiruvallur">Thiruvallur</option>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Madurai">Madurai</option>
              <option value="Tiruchirappalli">Tiruchirappalli</option>
              <option value="Salem">Salem</option>
              <option value="Tirunelveli">Tirunelveli</option>
              <option value="Vellore">Vellore</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* State */}
          <div className="charm-field-group">
            <label className="charm-label">State</label>
            <select
              className="charm-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Telangana">Telangana</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
              <option value="Gujarat">Gujarat</option>
              <option value="West Bengal">West Bengal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Country - Connected dynamically to Dialing Code Box */}
          <div className="charm-field-group">
            <label className="charm-label">Country</label>
            <select
              className="charm-select"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              {COUNTRIES_LIST.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>
          </div>

          {/* Postal Code */}
          <div className="charm-field-group">
            <label className="charm-label">Postal Code</label>
            <input
              type="text"
              className="charm-input"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          {/* Mobile Phone with Unified Country Dial Code Box & P badge */}
          <div className="charm-field-group">
            <label className="charm-label">Mobile Phone</label>
            <div className="charm-phone-input-wrap">
              <div className="charm-phone-unified-group">
                <input
                  type="text"
                  className="charm-dial-code-box"
                  value={mobileDialCode}
                  onChange={(e) => setMobileDialCode(e.target.value)}
                  placeholder="+91"
                  title="Country Dialing Code (auto-updates with Country)"
                />
                <input
                  type="tel"
                  className="charm-phone-number-box"
                  placeholder="Mobile number"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
              <span className="charm-badge-p" title="Primary Mobile">
                P
              </span>
            </div>
          </div>

          {/* Home Phone with Unified Country Dial Code Box & P badge */}
          <div className="charm-field-group">
            <label className="charm-label">Home Phone</label>
            <div className="charm-phone-input-wrap">
              <div className="charm-phone-unified-group">
                <input
                  type="text"
                  className="charm-dial-code-box"
                  value={homeDialCode}
                  onChange={(e) => setHomeDialCode(e.target.value)}
                  placeholder="+91"
                  title="Country Dialing Code (auto-updates with Country)"
                />
                <input
                  type="tel"
                  className="charm-phone-number-box"
                  placeholder="Home phone number"
                  value={homePhone}
                  onChange={(e) => setHomePhone(e.target.value)}
                />
              </div>
              <span className="charm-badge-p" title="Primary Home Phone">
                P
              </span>
            </div>
          </div>

          {/* Email - Conditional Asterisk & Validation based on PHR Registration */}
          <div className="charm-field-group">
            <label className="charm-label">
              Email {isEmailRequired && <span className="charm-required">*</span>}
            </label>
            <input
              type="email"
              className="charm-input"
              placeholder={isEmailRequired ? "Required for PHR invitation" : "Optional"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Emergency Contact */}
          <div className="charm-section-header" style={{ marginTop: 20 }}>
            Emergency Contact
          </div>
          <div className="charm-field-group">
            <label className="charm-label">Contact Name</label>
            <input
              type="text"
              className="charm-input"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
          </div>
          <div className="charm-field-group">
            <label className="charm-label">Contact Number</label>
            <input
              type="tel"
              className="charm-input"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>

          {/* Patient Preferences */}
          <div className="charm-section-header" style={{ marginTop: 20 }}>
            Patient Preferences
          </div>
          <div className="charm-field-group">
            <label className="charm-label">Preferred Communication</label>
            <select
              className="charm-select"
              value={preferredComm}
              onChange={(e) => setPreferredComm(e.target.value)}
            >
              <option value="">--Select--</option>
              <option value="Mobile Phone">Mobile Phone</option>
              <option value="Email">Email</option>
              <option value="Home Phone">Home Phone</option>
              <option value="SMS">SMS</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>
          <div className="charm-field-group">
            <div className="charm-radio-inline-row">
              <span className="charm-label" style={{ width: 140 }}>
                Email Notifications
              </span>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="emailNotifs"
                  checked={emailNotifications === "yes"}
                  onChange={() => setEmailNotifications("yes")}
                />
                Yes
              </label>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="emailNotifs"
                  checked={emailNotifications === "no"}
                  onChange={() => setEmailNotifications("no")}
                />
                No
              </label>
            </div>
          </div>
          <div className="charm-field-group">
            <div className="charm-radio-inline-row">
              <span className="charm-label" style={{ width: 140 }}>
                Text Notifications
              </span>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="textNotifs"
                  checked={textNotifications === "yes"}
                  onChange={() => setTextNotifications("yes")}
                />
                Yes
              </label>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="textNotifs"
                  checked={textNotifications === "no"}
                  onChange={() => setTextNotifications("no")}
                />
                No
              </label>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3: PHR Registration & Additional Info ================= */}
        <div className="charm-patient-column">
          <div className="charm-section-header">PHR Registration</div>

          {/* Send PHR invitation */}
          <div className="charm-field-group">
            <label className="charm-label">Send PHR invitation</label>
            <div className="charm-radio-stack">
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="phr"
                  checked={phrInvitation === "patient"}
                  onChange={() => setPhrInvitation("patient")}
                />
                To Patient
              </label>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="phr"
                  checked={phrInvitation === "representative"}
                  onChange={() => setPhrInvitation("representative")}
                />
                To Patient Representative
              </label>
              <label className="charm-radio-label">
                <input
                  type="radio"
                  name="phr"
                  checked={phrInvitation === "not_required"}
                  onChange={() => setPhrInvitation("not_required")}
                />
                Not Required
              </label>
            </div>
          </div>

          {/* Additional Information */}
          <div className="charm-section-header" style={{ marginTop: 20 }}>
            Additional Information
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Category</label>
            <select
              className="charm-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="General">General</option>
              <option value="VIP">VIP</option>
              <option value="Senior Citizen">Senior Citizen</option>
              <option value="Executive">Executive</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Outstation</label>
            <input
              type="text"
              className="charm-input"
              value={outstation}
              onChange={(e) => setOutstation(e.target.value)}
            />
          </div>

          <div className="charm-field-group">
            <label className="charm-label">NRI</label>
            <input
              type="text"
              className="charm-input"
              value={nri}
              onChange={(e) => setNri(e.target.value)}
            />
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Foreign Citizen</label>
            <input
              type="text"
              className="charm-input"
              value={foreignCitizen}
              onChange={(e) => setForeignCitizen(e.target.value)}
            />
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Insurance</label>
            <input
              type="text"
              className="charm-input"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
            />
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Insurance Status</label>
            <input
              type="text"
              className="charm-input"
              value={insuranceStatus}
              onChange={(e) => setInsuranceStatus(e.target.value)}
            />
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Blood Group</label>
            <select
              className="charm-select"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          {/* How did you hear about us */}
          <div className="charm-section-header" style={{ marginTop: 20 }}>
            How did you hear about us
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Source</label>
            <select
              className="charm-select"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="Doctor Referral">Doctor Referral</option>
              <option value="Google Search">Google Search</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Friend/Family">Friend / Family</option>
              <option value="Social Media">Social Media</option>
              <option value="Camp / Event">Camp / Event</option>
              <option value="Corporate Referral">Corporate Referral</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="charm-field-group">
            <label className="charm-label">Specific Source</label>
            <select
              className="charm-select"
              value={specificSource}
              onChange={(e) => setSpecificSource(e.target.value)}
            >
              <option value="">-- Select --</option>
              <option value="Dr. Ramesh">Dr. Ramesh</option>
              <option value="Dr. Sivaram">Dr. Sivaram</option>
              <option value="Website">Website</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Word of Mouth">Word of Mouth</option>
              <option value="Neighbourhood Referral">Neighbourhood Referral</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
