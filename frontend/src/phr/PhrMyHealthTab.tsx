import React from "react";
import {
  Calendar,
  MessageSquare,
  ClipboardList,
  Bell,
  Activity,
  Share2,
  Receipt,
  DollarSign,
  FileText,
  Pill,
  FlaskConical,
  ImageIcon,
  Info,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";

interface PhrMyHealthTabProps {
  onOpenAppointments: () => void;
  onOpenMessages: () => void;
  onOpenQuestionnaire: () => void;
  onOpenReminders: () => void;
  onOpenWellness: () => void;
  onOpenShareSections: () => void;
  onOpenBilling: () => void;
  onOpenDocuments: () => void;
  onOpenPrescriptions: () => void;
  onOpenLabs: () => void;
  onOpenImages: () => void;
  onOpenUsefulInfo: () => void;
  onOpenAbout: () => void;
  customMenu?: Record<string, boolean>;
}

export function PhrMyHealthTab({
  onOpenAppointments,
  onOpenMessages,
  onOpenQuestionnaire,
  onOpenReminders,
  onOpenWellness,
  onOpenShareSections,
  onOpenBilling,
  onOpenDocuments,
  onOpenPrescriptions,
  onOpenLabs,
  onOpenImages,
  onOpenUsefulInfo,
  onOpenAbout,
  customMenu = {},
}: PhrMyHealthTabProps) {
  // Check if item is enabled (defaults to true if unspecified)
  const isEnabled = (key: string) => customMenu[key] !== false;

  const renderRow = (icon: React.ReactNode, title: string, subtitle: string, onClick: () => void) => (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 16px",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
        background: "#ffffff",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2563eb",
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <ChevronRight size={18} color="#cbd5e1" />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>
      {/* SECTION 1: ENGAGEMENT */}
      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 8,
          paddingLeft: 4,
        }}>
          Engagement
        </div>
        <div style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          {isEnabled("appointments") && renderRow(<Calendar size={18} />, "Appointments", "Upcoming visits and scheduling", onOpenAppointments)}
          {isEnabled("messages") && renderRow(<MessageSquare size={18} />, "Messages", "Secure inbox with your cardiology team", onOpenMessages)}
          {isEnabled("questionnaire") && renderRow(<ClipboardList size={18} />, "Questionnaire", "Intake forms and EECP evaluations", onOpenQuestionnaire)}
          {isEnabled("reminders") && renderRow(<Bell size={18} />, "Reminders", "Medication and appointment recall alerts", onOpenReminders)}
          {isEnabled("wellness") && renderRow(<Activity size={18} />, "Wellness", "Daily activity & cardiac rehab goals", onOpenWellness)}
          {isEnabled("share_sections") && renderRow(<Share2 size={18} />, "Share Sections", "Clinical diagnoses, allergies, vitals & notes", onOpenShareSections)}
        </div>
      </div>

      {/* SECTION 2: BILLING */}
      {isEnabled("invoices") && (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
            paddingLeft: 4,
          }}>
            Billing
          </div>
          <div style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}>
            {renderRow(<Receipt size={18} />, "Invoices & Receipts", "View consultation and EECP payment receipts", onOpenBilling)}
          </div>
        </div>
      )}

      {/* SECTION 3: RECORDS */}
      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 8,
          paddingLeft: 4,
        }}>
          Records
        </div>
        <div style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          {isEnabled("documents") && renderRow(<FileText size={18} />, "Documents", "Clinic documents & patient uploaded files", onOpenDocuments)}
          {isEnabled("prescriptions") && renderRow(<Pill size={18} />, "Prescriptions", "Active heart medications & refill requests", onOpenPrescriptions)}
          {isEnabled("labs") && renderRow(<FlaskConical size={18} />, "Labs", "Biomarkers, blood chemistry & lipid panels", onOpenLabs)}
          {isEnabled("images") && renderRow(<ImageIcon size={18} />, "Images", "ECG, 2D Echo & SphygmoCor reports", onOpenImages)}
        </div>
      </div>

      {/* SECTION 4: RESOURCES */}
      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          marginBottom: 8,
          paddingLeft: 4,
        }}>
          Resources
        </div>
        <div style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}>
          {isEnabled("useful_info") && renderRow(<Info size={18} />, "Useful Info", "Emergency contacts, clinic hours & heart health tips", onOpenUsefulInfo)}
          {isEnabled("about") && renderRow(<HeartHandshake size={18} />, "About", "About Heal Your Heart & Vaso-Meditech EECP Centers", onOpenAbout)}
        </div>
      </div>
    </div>
  );
}
