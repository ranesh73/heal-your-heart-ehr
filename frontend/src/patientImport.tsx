import React, { useState, useRef } from "react";
import { Info, X, Download, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { api, download, Row } from "./api";
import { useApp } from "./context";

interface ImportPatientsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportPatientsModal({ onClose, onSuccess }: ImportPatientsModalProps) {
  const { notify } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    total: number;
    errors: string[];
    skipped_records?: { row: number; name: string; reason: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Please select a valid CSV (.csv) file.");
        setFile(null);
        return;
      }
      setError("");
      setFile(selected);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await download("/patients/import/template", "patient_import_template.csv");
    } catch (err: any) {
      setError(err?.message || "Failed to download CSV template");
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await api("/patients/import", "POST", formData);
      setResult(data);
      notify(`Import complete: ${data.imported} patients created`);
    } catch (err: any) {
      setError(err?.message || "Failed to import patients");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="charm-modal-backdrop" onClick={onClose}>
      <div className="charm-import-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="charm-import-modal-header">
          <h3 className="charm-import-modal-title">Import Patients</h3>
          <button type="button" className="charm-import-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="charm-import-modal-body">
          {/* Instructions Box matching Charm frame 19 */}
          <div className="charm-import-instructions-box">
            <div className="charm-import-info-icon-col">
              <Info size={18} color="#64748b" />
            </div>
            <div className="charm-import-instructions-content">
              <p className="charm-import-lead-text">
                Please select a Comma Separated Values file with data arranged in below format.
              </p>
              <div className="charm-import-format-spec">
                Patient Record ID, First Name, Last Name, Gender, Date Of Birth(mm/dd/yyyy), Email,
                Home Phone, Mobile Phone, Work Phone, AddressLine1, AddressLine2, City, Country, State,
                Zip Code, Caregiver First Name, Caregiver Last Name.
              </div>
              <p className="charm-import-req-note">
                Patient Record ID, First Name, Last Name, Gender, Date Of Birth should not be empty.
              </p>
              <p className="charm-import-warning-note">
                *You can only import a maximum of 500 patients.
              </p>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="charm-template-download-link"
                  onClick={handleDownloadTemplate}
                >
                  <Download size={13} style={{ marginRight: 4 }} />
                  Download Sample CSV Template
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="charm-form-error-banner" style={{ marginTop: 12 }}>
              <X size={14} onClick={() => setError("")} style={{ cursor: "pointer", marginRight: 6 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Result Summary */}
          {result && (
            <div className="charm-import-summary-card">
              <div className="charm-import-summary-row">
                <CheckCircle size={18} color="#16a34a" />
                <strong>{result.imported} patients successfully imported.</strong>
              </div>
              {result.skipped > 0 && (
                <div className="charm-import-summary-row charm-skipped-row">
                  <AlertTriangle size={18} color="#d97706" />
                  <span>{result.skipped} duplicate patient records were skipped.</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="charm-import-errors-list">
                  <strong>Issues encountered:</strong>
                  <ul>
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* File Picker Row matching Charm frame 19 */}
          {!result && (
            <div className="charm-import-file-row">
              <span className="charm-import-file-label">Select a csv file:</span>
              <div className="charm-import-file-controls">
                <button
                  type="button"
                  className="charm-choose-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>
                <span className="charm-file-selected-text">
                  {file ? file.name : "No file selected"}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Buttons */}
        <div className="charm-import-modal-footer">
          {result ? (
            <button
              type="button"
              className="charm-btn-orange"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="charm-btn-orange"
                disabled={!file || uploading}
                onClick={handleImport}
              >
                {uploading ? "Importing..." : "Import"}
              </button>
              <button
                type="button"
                className="charm-btn-secondary"
                disabled={uploading}
                onClick={onClose}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
