import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api, Row } from "../../api";

interface AddFacilityPageProps {
  initialData?: Row | null;
  onBack: () => void;
  onSaved: () => void;
}

export function AddFacilityPage({
  initialData,
  onBack,
  onSaved,
}: AddFacilityPageProps) {
  const isEdit = Boolean(initialData?.id);

  // Extract address lines if present
  const rawAddr = initialData?.address || "";
  const lines = rawAddr.split("\n").filter(Boolean);
  const addr1 = lines[0] || initialData?.address || "";

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    code: initialData?.code || "",
    addressLine1: addr1,
    addressLine2: "",
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    zipCode: "600115",
    timeZone: "Asia/Kolkata",
    contactPerson: "",
    officePhone: initialData?.phone || "9003070065",
    mobilePhone: initialData?.mobile || "9003070064",
    fax: "",
    email: "contact@healyourheart.in",
    website: "https://healyourheart.in",
    facilityMapLink: "",
    taxId: "AAACH1234F",
    taxonomyCode: "",
    cliaNumber: "",
    latitude: "12.9467",
    longitude: "80.2520",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Facility Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const fullAddress = [
      formData.addressLine1,
      formData.addressLine2,
      `${formData.city}, ${formData.state} - ${formData.zipCode}`,
    ]
      .filter(Boolean)
      .join(", ");

    const payload = {
      name: formData.name,
      code: formData.code || formData.name.slice(0, 4).toUpperCase().replace(/\s/g, ""),
      address: fullAddress,
      phone: formData.officePhone,
      mobile: formData.mobilePhone,
      active: true,
    };

    try {
      if (isEdit && initialData?.id) {
        await api(`/admin/facilities/${initialData.id}`, "PUT", payload);
      } else {
        await api("/admin/facilities", "POST", payload);
      }
      onSaved();
      onBack();
    } catch (err: any) {
      setError(err.message || "Failed to save facility.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="charm-add-facility-wrap">
      {/* Title Strip with Back Arrow */}
      <div className="charm-subpage-header">
        <button
          type="button"
          className="charm-settings-back-arrow-btn"
          title="Back to Facility List"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
        </button>
        <h2>{isEdit ? "Edit Facility" : "Add Facility"}</h2>
      </div>

      {error && <div className="charm-form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="charm-add-facility-form">
        <div className="charm-form-two-col">
          {/* Left Column */}
          <div className="charm-form-col">
            <div className="charm-form-group">
              <label>
                Facility Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter facility name"
              />
            </div>

            <div className="charm-form-group">
              <label>Facility Code</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. HUH007"
              />
            </div>

            <div className="charm-form-group">
              <label>
                Address Line 1 <span className="req">*</span>
              </label>
              <input
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                required
                placeholder="Street address, building, suite"
              />
            </div>

            <div className="charm-form-group">
              <label>Address Line 2</label>
              <input
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Area, landmark"
              />
            </div>

            <div className="charm-form-group">
              <label>
                City <span className="req">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="charm-form-group">
              <label>
                State <span className="req">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
              >
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Kerala">Kerala</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Alabama">Alabama</option>
                <option value="California">California</option>
                <option value="New York">New York</option>
                <option value="Texas">Texas</option>
              </select>
            </div>

            <div className="charm-form-group">
              <label>
                Country <span className="req">*</span>
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Singapore">Singapore</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
              </select>
            </div>

            <div className="charm-form-group">
              <label>
                Zip Code <span className="req">*</span>
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
              />
            </div>

            <div className="charm-form-group">
              <label>
                Time Zone <span className="req">*</span>
              </label>
              <select
                name="timeZone"
                value={formData.timeZone}
                onChange={handleChange}
                required
              >
                <option value="Asia/Kolkata">(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                <option value="America/New_York">(GMT-05:00) Eastern Time (US & Canada)</option>
                <option value="America/Chicago">(GMT-06:00) Central Time (US & Canada)</option>
                <option value="America/Los_Angeles">(GMT-08:00) Pacific Time (US & Canada)</option>
                <option value="UTC">(GMT+00:00) UTC</option>
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="charm-form-col">
            <div className="charm-form-group">
              <label>Contact Person Name</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Office Phone</label>
              <input
                type="text"
                name="officePhone"
                value={formData.officePhone}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Mobile Phone</label>
              <input
                type="text"
                name="mobilePhone"
                value={formData.mobilePhone}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Fax</label>
              <input
                type="text"
                name="fax"
                value={formData.fax}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Facility Map Link</label>
              <input
                type="text"
                name="facilityMapLink"
                value={formData.facilityMapLink}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Tax ID</label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Taxonomy Code</label>
              <input
                type="text"
                name="taxonomyCode"
                value={formData.taxonomyCode}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>CLIA #</label>
              <input
                type="text"
                name="cliaNumber"
                value={formData.cliaNumber}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Latitude</label>
              <input
                type="text"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
              />
            </div>

            <div className="charm-form-group">
              <label>Longitude</label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="charm-form-actions-strip">
          <button
            type="submit"
            className="charm-btn-orange"
            disabled={submitting}
          >
            {submitting ? "Saving…" : isEdit ? "Update" : "Add"}
          </button>
          <button
            type="button"
            className="charm-btn-cancel"
            onClick={onBack}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

