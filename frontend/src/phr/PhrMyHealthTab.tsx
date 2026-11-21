import React from "react";
import {
  Calendar,
  Mail,
  HelpCircle,
  Bell,
  Heart,
  Share2,
  FileSpreadsheet,
  Receipt,
  FileText,
  Pill,
  FlaskConical,
  Activity,
  Info,
  Building2,
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
}: PhrMyHealthTabProps) {
  const renderItem = (
    icon: React.ReactNode,
    iconBg: string,
    title: string,
    onClick: () => void,
    isLast: boolean = false
  ) => (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid #F1F5F9",
        cursor: "pointer",
        background: "#FFFFFF",
        transition: "background 0.12s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "#1E293B",
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </span>
      </div>
      <ChevronRight size={18} color="#CBD5E1" />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: 90 }}>
      {/* 1. ENGAGEMENT */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          ENGAGEMENT
        </div>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
            border: "1px solid #F1F5F9",
          }}
        >
          {renderItem(<Calendar size={19} />, "#38BDF8", "Appointments", onOpenAppointments)}
          {renderItem(<Mail size={19} />, "#4ADE80", "Messages", onOpenMessages)}
          {renderItem(<HelpCircle size={19} />, "#F43F5E", "Questionnaire", onOpenQuestionnaire)}
          {renderItem(<Bell size={19} />, "#FB923C", "Reminders", onOpenReminders)}
          {renderItem(<Heart size={19} />, "#818CF8", "Wellness", onOpenWellness)}
          {renderItem(<Share2 size={19} />, "#34D399", "Share Sections", onOpenShareSections, true)}
        </div>
      </div>

      {/* 2. BILLING */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          BILLING
        </div>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
            border: "1px solid #F1F5F9",
          }}
        >
          {renderItem(<FileSpreadsheet size={19} />, "#EAB308", "Invoices", onOpenBilling)}
          {renderItem(<Receipt size={19} />, "#F87171", "Receipts", onOpenBilling, true)}
        </div>
      </div>

      {/* 3. RECORDS */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          RECORDS
        </div>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
            border: "1px solid #F1F5F9",
          }}
        >
          {renderItem(<FileText size={19} />, "#10B981", "Documents", onOpenDocuments)}
          {renderItem(<Pill size={19} />, "#F59E0B", "Prescriptions", onOpenPrescriptions)}
          {renderItem(<FlaskConical size={19} />, "#FB923C", "Labs", onOpenLabs)}
          {renderItem(<Activity size={19} />, "#2DD4BF", "Images", onOpenImages, true)}
        </div>
      </div>

      {/* 4. RESOURCES */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#64748B",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          RESOURCES
        </div>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
            border: "1px solid #F1F5F9",
          }}
        >
          {renderItem(<Info size={19} />, "#EC4899", "Useful Info", onOpenUsefulInfo)}
          {renderItem(<Building2 size={19} />, "#94A3B8", "About", onOpenAbout, true)}
        </div>
      </div>
    </div>
  );
}
