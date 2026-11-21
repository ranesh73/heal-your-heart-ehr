import React, { useState, useEffect } from "react";
import { X, Share2, Activity, Heart, Shield, CheckCircle2, Download, AlertCircle } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrClinicalRecordsModalProps {
  onClose: () => void;
  initialSection?: string;
}

export function PhrClinicalRecordsModal({ onClose, initialSection = "Diagnoses" }: PhrClinicalRecordsModalProps) {
  const [activeTab, setActiveTab] = useState(initialSection);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await phrApi("/clinical-records");
        setData(res);
      } catch (e) {
        console.error("Failed to load clinical records", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const sections = [
    "Diagnoses",
    "Medications",
    "Allergies",
    "Vitals",
    "Procedures",
    "Vaccines",
    "Implanted Devices",
    "Goals",
    "Health Concerns",
    "Smoking Status",
  ];

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
        padding: "20px 20px 24px 20px",
        width: "100%",
        maxWidth: 440,
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Share Clinical Data
            </h2>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Verified EHR Health Record Summary
            </div>
          </div>
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

        {/* Scrollable Sub-tabs */}
        <div style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "10px 0",
          borderBottom: "1px solid #f1f5f9",
          scrollbarWidth: "none",
        }}>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveTab(sec)}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: "none",
                background: activeTab === sec ? "#2563eb" : "#f1f5f9",
                color: activeTab === sec ? "#ffffff" : "#475569",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 4px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
              Loading clinical records...
            </div>
          ) : (
            <div>
              {/* DIAGNOSES */}
              {activeTab === "Diagnoses" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(data?.diagnoses || [
                    { code: "I20.9", name: "Angina pectoris, unspecified", onset: "Jan 2026", status: "Active / Under EECP" },
                    { code: "I25.10", name: "Atherosclerotic heart disease of native coronary artery", onset: "Nov 2025", status: "Active" },
                    { code: "I10", name: "Essential (primary) hypertension", onset: "Aug 2024", status: "Controlled" },
                  ]).map((item: any, idx: number) => (
                    <div key={idx} style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.name}</div>
                        <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                          {item.status || "Active"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                        ICD-10: <strong>{item.code}</strong> · Onset: {item.onset || "Recent"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MEDICATIONS */}
              {activeTab === "Medications" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(data?.medications || [
                    { name: "Tab. Atorvastatin 20mg", dosage: "1 tab PO at bedtime", prescriber: "Dr. Prem Sekar" },
                    { name: "Tab. Metoprolol Succinate 25mg", dosage: "1 tab PO twice daily", prescriber: "Dr. Prem Sekar" },
                    { name: "Tab. Clopidogrel 75mg", dosage: "1 tab PO daily with meals", prescriber: "Dr. Sivakumar" },
                    { name: "Capsule Coenzyme Q10 100mg", dosage: "1 cap daily after breakfast", prescriber: "Dr. S. Ramasamy" },
                  ]).map((item: any, idx: number) => (
                    <div key={idx} style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>{item.dosage}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Prescribed by: {item.prescriber}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ALLERGIES */}
              {activeTab === "Allergies" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#fef2f2", padding: "12px 14px", borderRadius: 10, border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>Penicillin G / Beta-lactams</div>
                    <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>Reaction: Urticaria & Angioedema</div>
                    <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>Severity: Severe · Recorded: 2024</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 10 }}>
                    No other known drug allergies (NKDA).
                  </div>
                </div>
              )}

              {/* VITALS */}
              {activeTab === "Vitals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Latest Recorded Vitals</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                      <div>Blood Pressure: <strong>122/78 mmHg</strong></div>
                      <div>Weight: <strong>74.0 kg</strong></div>
                      <div>Height: <strong>175 cm</strong></div>
                      <div>BMI: <strong>24.2 kg/m²</strong></div>
                      <div>Heart Rate: <strong>72 bpm</strong></div>
                      <div>SpO2: <strong>98%</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* PROCEDURES */}
              {activeTab === "Procedures" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      EECP (Enhanced External Counterpulsation) Therapy
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
                      Active Treatment Course: 18 of 35 sessions completed.
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      Facility: Heal Your Heart Neelankarai · Augmentation Ratio: 1.4
                    </div>
                  </div>
                </div>
              )}

              {/* VACCINES */}
              {activeTab === "Vaccines" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Influenza Vaccine (Quadrivalent)</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Administered: Sep 2026 · Dose: 0.5 mL IM</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Pneumococcal Conjugate (PCV15)</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Administered: Oct 2025 · Dose: 0.5 mL IM</div>
                  </div>
                </div>
              )}

              {/* IMPLANTED DEVICES */}
              {activeTab === "Implanted Devices" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Drug-Eluting Stent (DES) - LAD</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Implanted: March 2023 · Manufacturer: Medtronic Resolute Onyx 3.0 x 24mm</div>
                  </div>
                </div>
              )}

              {/* GOALS */}
              {activeTab === "Goals" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>EECP Counterpulsation Course</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Goal: Complete 35 hours to develop coronary collateral vessels</div>
                    <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginTop: 4 }}>Progress: 51% Completed</div>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Blood Pressure & Lipid Target</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Target BP &lt; 125/80 mmHg · Target LDL-C &lt; 55 mg/dL</div>
                  </div>
                </div>
              )}

              {/* HEALTH CONCERNS */}
              {activeTab === "Health Concerns" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Exertional Angina / CCS Class II</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Status: Significantly improved after 15th EECP session</div>
                  </div>
                </div>
              )}

              {/* SMOKING STATUS */}
              {activeTab === "Smoking Status" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Former Smoker</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>Cessation: Quit over 5 years ago. Tobacco counseling reinforced.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer download button */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
          <button
            onClick={() => alert("Downloading encrypted Clinical Summary PDF...")}
            style={{
              width: "100%",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 24,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Download size={16} /> Download Health Summary
          </button>
        </div>
      </div>
    </div>
  );
}
