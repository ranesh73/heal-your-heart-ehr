import React, { useState } from "react";
import { X, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrDocumentUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_CATEGORIES = [
  "ECG / Echo Report",
  "Diagnostic Lab Results",
  "Cardiology Discharge Summary",
  "Prescription / External Medical Note",
  "Insurance / ID Proof",
];

export function PhrDocumentUploadModal({ onClose, onSuccess }: PhrDocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a document or image to upload");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("category", category);

      await phrApi("/documents/upload", "POST", formData, true);
      setUploaded(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        background: "#ffffff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: "20px 24px 30px 24px",
        width: "100%",
        maxWidth: 440,
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
            Upload Medical Record
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {uploaded ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}>
              <Check size={28} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              Document Uploaded!
            </h3>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Your file has been added to your patient chart and shared with your care team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* File Drop Area */}
            <label style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 16px",
              border: "2px dashed #cbd5e1",
              borderRadius: 12,
              background: "#f8fafc",
              cursor: "pointer",
              textAlign: "center",
            }}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Upload size={22} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                {file ? file.name : "Tap to browse or take a photo"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, JPEG or PNG up to 25 MB"}
              </div>
            </label>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Document Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Previous 2D Echo or Lab Report"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Record Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background: "#f8fafc",
                }}
              >
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              style={{
                width: "100%",
                background: file ? "#2563eb" : "#94a3b8",
                color: "#ffffff",
                border: "none",
                borderRadius: 24,
                padding: "13px 0",
                fontSize: 15,
                fontWeight: 700,
                cursor: file ? "pointer" : "default",
                marginTop: 6,
                boxShadow: file ? "0 3px 10px rgba(37,99,235,0.25)" : "none",
              }}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
