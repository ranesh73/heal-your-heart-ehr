import React, { useState, useRef } from "react";
import { Camera, Calendar, Check, Upload as UploadIcon, X, Plus } from "lucide-react";
import { api, branch, Row } from "./api";
import { useApp } from "./context";

interface AddPatientViewProps {
  onCancel: () => void;
  onSaved: (p: Row, openChart?: boolean) => void;
}

export function AddPatientView({ onCancel, onSaved }: AddPatientViewProps) {
  const { facilities, refresh, notify } = useApp();

  // Basic Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobMode, setDobMode] = useState<"dob" | "age">("dob");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("Male");
  const [pronouns, setPronouns] = useState("");
  const [facilityIds, setFacilityIds] = useState<string[]>(() => [branch || facilities[0]?.id || ""]);
  
  // Patient IDs (3 rows by default)
  const [patientIds, setPatientIds] = useState([
    { type: "", number: "", fileName: "" },
    { type: "", number: "", fileName: "" },
    { type: "", number: "", fileName: "" },
  ]);

  // Contact Details
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [country, setCountry] = useState("India");
  const [postalCode, setPostalCode] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [email, setEmail] = useState("");

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Patient Preferences
  const [preferredComm, setPreferredComm] = useState("");
  const [emailNotifications, setEmailNotifications] = useState<"yes" | "no">("yes");
  const [textNotifications, setTextNotifications] = useState<"yes" | "no">("yes");

  // PHR Registration
  const [phrInvitation, setPhrInvitation] = useState<"patient" | "representative" | "not_required">("patient");

  // Additional Information
  const [category, setCategory] = useState("");
  const [outstation, setOutstation] = useState("");
  const [nri, setNri] = useState("");
  const [foreignCitizen, setForeignCitizen] = useState("");
  const [insurance, setInsurance] = useState("");
  const [insuranceStatus, setInsuranceStatus] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  // How did you hear about us
  const [referralSource, setReferralSource] = useState("");
  const [specificSource, setSpecificSource] = useState("");

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateReason, setDuplicateReason] = useState("");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // dob is entered as dd/mm/yyyy or yyyy-mm-dd
    if (!dob.trim()) {
      return `${new Date().getFullYear() - 30}-01-01`;
    }
    if (dob.includes("/")) {
      const parts = dob.split("/");
      if (parts.length === 3) {
        // dd/mm/yyyy -> yyyy-mm-dd
        const [d, m, y] = parts;
        return `${y.padStart(4, "2000")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }
    return dob;
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

    setError("");
    setSubmitting(true);

    try {
      const finalDob = computeDob();
      const fullAddress = [addressLine1.trim(), addressLine2.trim()].filter(Boolean).join(", ");
      const fullReferral = [referralSource, specificSource].filter(Boolean).join(" - ");
      const effectivePhone = mobilePhone.trim() || homePhone.trim() || undefined;

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

      const created = await api<Row>("/patients", "POST", payload);
      await refresh();
      notify(`Patient created: ${created.name}`);
      onSaved(created, openChartAfterSave);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to register patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="charm-add-patient-page">
      {/* Top Action Header Bar */}
      <div className="charm-add-patient-header-bar">
        <h2 className="charm-add-patient-title">Add Patient</h2>
        <div className="charm-add-patient-actions">
          <button
            type="button"
            className="charm-btn-orange"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            {submitting ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            className="charm-btn-secondary"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
          >
            Add and Open
          </button>
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
        <div style={{ margin: "10px 24px 0 24px", padding: 12, background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: 4 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#92400e", display: "block", marginBottom: 4 }}>
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

          {/* Avatar Upload */}
          <div className="charm-avatar-container">
            <div
              className="charm-avatar-circle"
              onClick={() => avatarInputRef.current?.click()}
              title="Upload Patient Photo"
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
              <div className="charm-camera-badge">
                <Camera size={14} color="#ffffff" />
              </div>
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* First Name */}
          <div className="charm-field-group">
            <label className="charm-label">
              First Name <span className="charm-required">*</span>
              <span className="charm-purple-tag" title="Charm EHR Identifier">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#8b5cf6">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
            </label>
            <input
              type="text"
              className="charm-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder=""
              required
            />
          </div>

          {/* Last Name */}
          <div className="charm-field-group">
            <label className="charm-label">
              Last Name <span className="charm-required">*</span>
              <span className="charm-purple-tag" title="Charm EHR Identifier">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#8b5cf6">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
            </label>
            <input
              type="text"
              className="charm-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder=""
              required
            />
          </div>

          {/* DOB / Age Toggle */}
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
              <span className="charm-required">*</span>

              {dobMode === "dob" ? (
                <div className="charm-dob-input-wrap">
                  <input
                    type="text"
                    className="charm-input"
                    placeholder="dd/mm/yyyy"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                  <label className="charm-cal-icon-btn">
                    <Calendar size={15} color="#64748b" />
                    <input
                      type="date"
                      style={{ opacity: 0, position: "absolute", width: 0, height: 0 }}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [y, m, d] = e.target.value.split("-");
                          setDob(`${d}/${m}/${y}`);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  max="125"
                  className="charm-input"
                  placeholder="Years"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={{ width: "120px" }}
                />
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

          {/* Country */}
          <div className="charm-field-group">
            <label className="charm-label">Country</label>
            <select
              className="charm-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="Singapore">Singapore</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Other">Other</option>
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

          {/* Mobile Phone with P badge */}
          <div className="charm-field-group">
            <label className="charm-label">Mobile Phone</label>
            <div className="charm-phone-input-wrap">
              <input
                type="tel"
                className="charm-input"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
              />
              <span className="charm-badge-p" title="Primary Mobile">
                P
              </span>
            </div>
          </div>

          {/* Home Phone with P badge */}
          <div className="charm-field-group">
            <label className="charm-label">Home Phone</label>
            <div className="charm-phone-input-wrap">
              <input
                type="tel"
                className="charm-input"
                value={homePhone}
                onChange={(e) => setHomePhone(e.target.value)}
              />
              <span className="charm-badge-p" title="Primary Home Phone">
                P
              </span>
            </div>
          </div>

          {/* Email */}
          <div className="charm-field-group">
            <label className="charm-label">
              Email <span className="charm-required">*</span>
            </label>
            <input
              type="email"
              className="charm-input"
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
