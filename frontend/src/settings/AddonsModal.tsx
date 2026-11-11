import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Plug,
  X,
  MessageCircle,
  Calendar,
  CreditCard,
  FlaskConical,
  Activity,
  PhoneCall,
  Sparkles,
  MessageSquare,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../context";

interface AddonItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  status: "connected" | "enabled" | "available";
  badgeText: string;
}

const INITIAL_ADDONS: AddonItem[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Integration",
    category: "Communication",
    description: "Official Meta WhatsApp Cloud API for automated appointment reminders, PDF lab delivery, and direct patient chat.",
    icon: MessageCircle,
    status: "connected",
    badgeText: "Connected",
  },
  {
    id: "gcal",
    name: "Google Calendar Integration",
    category: "Scheduling",
    description: "Bi-directional synchronization of clinician shift availability, consultations and off-duty blocks with Google Calendar.",
    icon: Calendar,
    status: "connected",
    badgeText: "Connected",
  },
  {
    id: "razorpay",
    name: "Payment Gateway (Razorpay)",
    category: "Billing & Finance",
    description: "Instant UPI QR code generation, online payment links, netbanking and debit/credit card settlement.",
    icon: CreditCard,
    status: "enabled",
    badgeText: "Configured",
  },
  {
    id: "lab-integration",
    name: "Lab Integration",
    category: "Diagnostics",
    description: "Automated HL7/LIMS bi-directional order exchange and result ingestion with Metropolis, Quest and Lal Pathlabs.",
    icon: FlaskConical,
    status: "available",
    badgeText: "Available",
  },
  {
    id: "ecg-integration",
    name: "ECG Integration",
    category: "Medical Devices",
    description: "Direct Bluetooth and USB DICOM streaming from 12-lead resting ECG machines and telemetry monitors into patient chart notes.",
    icon: Activity,
    status: "connected",
    badgeText: "Connected",
  },
  {
    id: "sms-notifications",
    name: "SMS Notifications",
    category: "Communication",
    description: "Transactional DLT-registered SMS routes for clinic appointments, OTP logins and prescription collection alerts.",
    icon: MessageSquare,
    status: "enabled",
    badgeText: "Active",
  },
  {
    id: "ai-assistant",
    name: "AI Clinical Assistant",
    category: "Clinical Intelligence",
    description: "Specialized cardiology scribe: dictation transcription, automated SOAP note drafting and drug-interaction screening.",
    icon: Sparkles,
    status: "enabled",
    badgeText: "Active",
  },
  {
    id: "telehealth",
    name: "Telehealth Integration",
    category: "Virtual Care",
    description: "High-definition HIPAA-compliant video consultation rooms with waiting lobby, screen sharing and multi-party calling.",
    icon: PhoneCall,
    status: "connected",
    badgeText: "Ready",
  },
];

export function AddonsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notify } = useApp();
  const [addons, setAddons] = useState<AddonItem[]>(INITIAL_ADDONS);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const toggleAddon = (id: string) => {
    setAddons((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus =
            item.status === "available" ? "connected" : "available";
          const nextBadge =
            nextStatus === "connected" ? "Connected" : "Available";
          notify(
            `${item.name} ${
              nextStatus === "connected" ? "connected and enabled" : "disabled"
            }.`
          );
          return { ...item, status: nextStatus, badgeText: nextBadge };
        }
        return item;
      })
    );
  };

  const filtered = addons.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "connected")
      return a.status === "connected" || a.status === "enabled";
    if (activeTab === "available") return a.status === "available";
    return true;
  });

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal wide addons-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-head">
            <div className="flex items-center gap-2">
              <div className="charm-addon-plug-pill">
                <Plug size={18} className="text-slate-800" />
              </div>
              <div>
                <Dialog.Title>Add-ons & Integrations</Dialog.Title>
                <Dialog.Description>
                  Extend Heal Your Heart EHR with certified diagnostic, communication and clinical integrations
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="button ghost" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="addons-modal-body">
            {/* Search and Tabs toolbar */}
            <div className="addons-filter-bar">
              <div className="addons-search-wrap">
                <Search size={15} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search available add-ons & connectors…"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="addons-search-input"
                />
              </div>

              <div className="addons-tabs">
                <button
                  type="button"
                  className={`addons-tab-btn ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  All ({addons.length})
                </button>
                <button
                  type="button"
                  className={`addons-tab-btn ${activeTab === "connected" ? "active" : ""}`}
                  onClick={() => setActiveTab("connected")}
                >
                  Active ({addons.filter((a) => a.status !== "available").length})
                </button>
                <button
                  type="button"
                  className={`addons-tab-btn ${activeTab === "available" ? "active" : ""}`}
                  onClick={() => setActiveTab("available")}
                >
                  Marketplace ({addons.filter((a) => a.status === "available").length})
                </button>
              </div>
            </div>

            {/* Grid of Addons */}
            <div className="addons-grid">
              {filtered.map((item) => {
                const Icon = item.icon;
                const isConnected = item.status !== "available";
                return (
                  <div key={item.id} className="addon-card">
                    <div className="addon-card-head">
                      <div className="addon-icon-box">
                        <Icon size={22} className="text-teal-700" />
                      </div>
                      <div className="addon-head-meta">
                        <span className="addon-category-tag">{item.category}</span>
                        <h4 className="addon-title">{item.name}</h4>
                      </div>
                      <span className={`addon-status-pill ${item.status}`}>
                        {item.badgeText}
                      </span>
                    </div>

                    <p className="addon-desc">{item.description}</p>

                    <div className="addon-card-foot">
                      <button
                        type="button"
                        onClick={() => toggleAddon(item.id)}
                        className={`addon-action-btn ${isConnected ? "disconnect" : "connect"}`}
                      >
                        {isConnected ? (
                          <>
                            <Check size={13} />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <Plug size={13} />
                            <span>Connect</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="addon-config-btn"
                        onClick={() =>
                          notify(
                            `${item.name} configuration settings opened.`
                          )
                        }
                      >
                        <span>Configure</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-footer flex justify-between items-center">
            <span className="text-xs text-muted">
              8 Certified Health Integrations Installed
            </span>
            <button type="button" className="button secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
