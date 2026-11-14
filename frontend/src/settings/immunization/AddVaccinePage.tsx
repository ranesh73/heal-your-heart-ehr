import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, AlertCircle, Save } from "lucide-react";
import { api } from "../../api";

interface VISRecord {
  id: string;
  name: string;
  published_date: string;
  code?: string;
}

interface AddVaccinePageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function AddVaccinePage({ onBack, onSuccess }: AddVaccinePageProps) {
  // Left Column fields
  const [vaccineName, setVaccineName] = useState("");
  const [description, setDescription] = useState("");
  const [dose, setDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("mL");
  const [duration, setDuration] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [selectedVisIds, setSelectedVisIds] = useState<string[]>([]);

  // Right Column fields
  const [cvxCode, setCvxCode] = useState("");
  const [route, setRoute] = useState("--");
  const [dosesCount, setDosesCount] = useState("");
  const [schedule, setSchedule] = useState("");
  const [billingCode, setBillingCode] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);

  // VIS statements from DB
  const [visList, setVisList] = useState<VISRecord[]>([]);
  const [loadingVis, setLoadingVis] = useState(true);

  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<VISRecord[]>("/settings/immunization/vis");
        setVisList(data || []);
      } catch (e: any) {
        console.error("Failed to load VIS statements:", e);
      } finally {
        setLoadingVis(false);
      }
    })();
  }, []);

  const handleToggleVis = (visId: string) => {
    setSelectedVisIds((prev) =>
      prev.includes(visId) ? prev.filter((id) => id !== visId) : [...prev, visId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName.trim()) {
      setError("Vaccine Name is mandatory.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api("/settings/immunization/vaccines", "POST", {
        vaccine_name: vaccineName.trim(),
        description: description.trim(),
        dose: dose.trim(),
        dose_unit: doseUnit,
        duration_of_protection: duration.trim(),
        diagnosis_code: diagnosisCode.trim(),
        vis_ids: selectedVisIds,
        cvx_code: cvxCode.trim(),
        route: route === "--" ? "" : route,
        doses_count: dosesCount ? parseInt(dosesCount, 10) || 1 : 1,
        schedule: schedule.trim(),
        billing_code: billingCode.trim(),
        emergency: isEmergency,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to add vaccine.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Header with Back Arrow */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#475569",
            cursor: "pointer",
          }}
          title="Return to Vaccine Listing"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700 }}>
          Add Vaccine
        </h2>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "10px 14px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Form */}
      <form onSubmit={handleSave} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginBottom: 24 }}>
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 1. Vaccine Name * */}
            <div>
              <label style={labelStyle}>
                Vaccine Name <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Vaccine Name"
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* 2. Vaccine Description */}
            <div>
              <label style={labelStyle}>Vaccine Description</label>
              <textarea
                placeholder="Enter Vaccine Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* 3. Dose */}
            <div>
              <label style={labelStyle}>Dose</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Dose amount (e.g. 0.5)"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <select
                  value={doseUnit}
                  onChange={(e) => setDoseUnit(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="mL">mL</option>
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                  <option value="units">units</option>
                  <option value="doses">doses</option>
                </select>
              </div>
            </div>

            {/* 4. Duration of Protection */}
            <div>
              <label style={labelStyle}>Duration of Protection</label>
              <input
                type="text"
                placeholder="Enter Duration of Protection"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 5. Diagnosis Code */}
            <div>
              <label style={labelStyle}>Diagnosis Code</label>
              <input
                type="text"
                placeholder="Enter Diagnosis Code"
                value={diagnosisCode}
                onChange={(e) => setDiagnosisCode(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 6. Vaccine Information Statement(s) */}
            <div>
              <label style={labelStyle}>Vaccine Information Statement(s)</label>
              <div
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  maxHeight: 180,
                  overflowY: "auto",
                  padding: 8,
                  background: "#f8fafc",
                }}
              >
                {loadingVis ? (
                  <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>Loading statements...</div>
                ) : visList.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>No VIS records found.</div>
                ) : (
                  visList.map((vis) => (
                    <label
                      key={vis.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12,
                        color: "#334155",
                        background: selectedVisIds.includes(vis.id) ? "#e0f2fe" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedVisIds.includes(vis.id)}
                        onChange={() => handleToggleVis(vis.id)}
                      />
                      <span style={{ fontWeight: selectedVisIds.includes(vis.id) ? 600 : 400 }}>
                        {vis.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 1. CVX Code */}
            <div>
              <label style={labelStyle}>CVX Code</label>
              <input
                type="text"
                placeholder="Enter CVX Code"
                value={cvxCode}
                onChange={(e) => setCvxCode(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 2. Route */}
            <div>
              <label style={labelStyle}>Route</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                style={inputStyle}
              >
                <option value="--">--</option>
                <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                <option value="Intradermal (ID)">Intradermal (ID)</option>
                <option value="Oral (PO)">Oral (PO)</option>
                <option value="Intranasal (IN)">Intranasal (IN)</option>
              </select>
            </div>

            {/* 3. Number of Doses */}
            <div>
              <label style={labelStyle}>Number of Doses</label>
              <input
                type="text"
                placeholder="Enter Number of Dose"
                value={dosesCount}
                onChange={(e) => setDosesCount(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 4. Immunization Schedule */}
            <div>
              <label style={labelStyle}>Immunization Schedule</label>
              <input
                type="text"
                placeholder="Enter Immunization Schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 5. Billing Code */}
            <div>
              <label style={labelStyle}>Billing Code</label>
              <input
                type="text"
                placeholder="Enter Billing Code"
                value={billingCode}
                onChange={(e) => setBillingCode(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* 6. Disaster or public health emergency */}
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                />
                Disaster or public health emergency
              </label>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div style={{ display: "flex", gap: 12, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 22px",
              background: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            {saving ? "Saving..." : "Add"}
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "8px 18px",
              background: "#ffffff",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              fontWeight: 600,
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  fontSize: 13,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  color: "#0f172a",
  background: "#ffffff",
  outline: "none",
};

