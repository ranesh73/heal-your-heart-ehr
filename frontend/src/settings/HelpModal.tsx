import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  HelpCircle,
  X,
  BookOpen,
  HelpCircle as FaqIcon,
  LifeBuoy,
  AlertTriangle,
  FileQuestion,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../context";

export function HelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, notify } = useApp();
  const [activeTab, setActiveTab] = useState<
    "center" | "guide" | "faq" | "support" | "issue"
  >("center");

  // Support Form State
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportPriority, setSupportPriority] = useState("normal");
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Issue Form State
  const [issueTitle, setIssueTitle] = useState("");
  const [issueModule, setIssueModule] = useState("Consultations & Charting");
  const [issueDetails, setIssueDetails] = useState("");
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How do I document a 35-Session EECP Counterpulsation Treatment Plan?",
      a: "Navigate to Patients > [Select Patient] > EECP Treatment Plan tab. Click 'Start EECP Plan', select 35 sessions, specify pre-treatment cuff pressure (typically 260-300 mmHg) and gating rhythm. Each session logs daily vitals, cuff pressure, and therapist progress notes automatically.",
    },
    {
      q: "Where do I track Central Blood Pressure and Arterial Stiffness (PWV)?",
      a: "In any Encounter or Patient Chart Overview, open the Vitals section. Enter Radial Augmentation Index, cf-PWV (carotid-femoral), cr-PWV (carotid-radial), and central aortic pressures. The EHR calculates the Vascular Age delta automatically.",
    },
    {
      q: "How do I sign and lock a clinical consultation chart?",
      a: "Once you have completed the Subjective, Objective, Assessment and Plan (SOAP) sections, click 'Sign Chart' at the top-right of the encounter editor. Enter your 4-digit clinician PIN. Signed charts are stamped with an immutable SHA-256 digest.",
    },
    {
      q: "Can I customize the SOAP Note template for cardiology follow-ups?",
      a: "Yes! Open Settings > Templates > Practice Templates or My Templates. You can create modular templates with pre-configured Chief Complaints, cardiac examination checkboxes, and standard medication orders.",
    },
    {
      q: "How do I switch active clinical branches across Chennai and Tamil Nadu?",
      a: "Use the Facility selector in the top-right header (next to your profile). Select Neelankarai, Royapettah, Manapakkam, Tirunelveli, or Madurai to immediately filter all patients, schedules, and billing registers for that clinic.",
    },
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) {
      notify("Please provide a subject and message description.");
      return;
    }
    setSupportSubmitted(true);
    notify("Support ticket submitted! Ticket ID: HYH-SUP-" + Math.floor(1000 + Math.random() * 9000));
    setTimeout(() => {
      setSupportSubmitted(false);
      setSupportSubject("");
      setSupportMessage("");
    }, 3000);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle || !issueDetails) {
      notify("Please fill in the incident title and details.");
      return;
    }
    setIssueSubmitted(true);
    notify("Incident report logged and routed to clinical engineering team.");
    setTimeout(() => {
      setIssueSubmitted(false);
      setIssueTitle("");
      setIssueDetails("");
    }, 3000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal wide help-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="modal-head">
            <div className="flex items-center gap-2">
              <div className="charm-help-icon-pill">
                <HelpCircle size={18} className="text-slate-800" />
              </div>
              <div>
                <Dialog.Title>Help & Support Center</Dialog.Title>
                <Dialog.Description>
                  Guides, FAQs, documentation and technical support for Heal Your Heart EHR
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="button ghost" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="help-modal-layout">
            {/* Sidebar Navigation */}
            <aside className="help-sidebar-tabs">
              <button
                type="button"
                className={`help-nav-item ${activeTab === "center" ? "active" : ""}`}
                onClick={() => setActiveTab("center")}
              >
                <LifeBuoy size={16} />
                <span>Help Center</span>
              </button>
              <button
                type="button"
                className={`help-nav-item ${activeTab === "guide" ? "active" : ""}`}
                onClick={() => setActiveTab("guide")}
              >
                <BookOpen size={16} />
                <span>User Guide</span>
              </button>
              <button
                type="button"
                className={`help-nav-item ${activeTab === "faq" ? "active" : ""}`}
                onClick={() => setActiveTab("faq")}
              >
                <FaqIcon size={16} />
                <span>Frequently Asked Questions</span>
              </button>
              <button
                type="button"
                className={`help-nav-item ${activeTab === "support" ? "active" : ""}`}
                onClick={() => setActiveTab("support")}
              >
                <FileQuestion size={16} />
                <span>Contact Support</span>
              </button>
              <button
                type="button"
                className={`help-nav-item ${activeTab === "issue" ? "active" : ""}`}
                onClick={() => setActiveTab("issue")}
              >
                <AlertTriangle size={16} />
                <span>Report an Issue</span>
              </button>
            </aside>

            {/* Main Content Area */}
            <div className="help-content-area">
              {activeTab === "center" && (
                <div className="help-center-view">
                  <div className="help-hero-box">
                    <h3>Heal Your Heart Clinical Knowledgebase</h3>
                    <p>
                      Learn how to navigate clinical charts, schedule 35-session EECP courses, analyze arterial stiffness trends, and manage multi-facility cardiology practice operations.
                    </p>
                  </div>

                  <div className="help-cards-grid">
                    <div className="help-quick-card">
                      <div className="help-card-icon-wrap cardiology">
                        <BookOpen size={20} />
                      </div>
                      <h4>Cardiology & Consultations</h4>
                      <p>
                        Master the 3-pane encounter editor, SOAP charting, vital sign trend analyses, and digital prescription writing.
                      </p>
                      <button
                        type="button"
                        className="help-link-btn"
                        onClick={() => setActiveTab("guide")}
                      >
                        Explore Guide →
                      </button>
                    </div>

                    <div className="help-quick-card">
                      <div className="help-card-icon-wrap eecp">
                        <LifeBuoy size={20} />
                      </div>
                      <h4>EECP Therapy Protocols</h4>
                      <p>
                        Comprehensive reference for cuff pressure titration, ECG gating synchrony, contraindications, and course completion.
                      </p>
                      <button
                        type="button"
                        className="help-link-btn"
                        onClick={() => setActiveTab("faq")}
                      >
                        Read Protocols →
                      </button>
                    </div>

                    <div className="help-quick-card">
                      <div className="help-card-icon-wrap labs">
                        <FileQuestion size={20} />
                      </div>
                      <h4>Diagnostics & Lab Orders</h4>
                      <p>
                        Electronic lab order placement, dual note documentation, custom image reporting for Echo and CAG studies.
                      </p>
                      <button
                        type="button"
                        className="help-link-btn"
                        onClick={() => setActiveTab("faq")}
                      >
                        View Lab FAQ →
                      </button>
                    </div>

                    <div className="help-quick-card">
                      <div className="help-card-icon-wrap billing">
                        <AlertTriangle size={20} />
                      </div>
                      <h4>Billing & Ledger Management</h4>
                      <p>
                        Procedure code tariffs, multi-session package bundles, Razorpay instant payment links, and GST invoices.
                      </p>
                      <button
                        type="button"
                        className="help-link-btn"
                        onClick={() => setActiveTab("support")}
                      >
                        Ask Finance →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "guide" && (
                <div className="help-guide-view">
                  <h3>Heal Your Heart EHR · User Workflow Guide</h3>
                  <p className="text-muted text-xs mb-4">
                    Step-by-step instructions for clinical and administrative staff.
                  </p>

                  <div className="guide-steps-list">
                    <div className="guide-step-card">
                      <span className="guide-step-badge">Step 1</span>
                      <div>
                        <h4>Patient Intake & Demographics Registration</h4>
                        <p>
                          Click the <strong>+ Add Patient</strong> button in the top bar. Enter the patient&apos;s full name, phone number, date of birth, and biological sex. The system automatically issues a branch-coded Medical Record Number (MRN).
                        </p>
                      </div>
                    </div>

                    <div className="guide-step-card">
                      <span className="guide-step-badge">Step 2</span>
                      <div>
                        <h4>Clinical Consultation & 3-Pane Charting</h4>
                        <p>
                          Open the patient chart and start a consultation. Use the left pane for chronological clinical history, the center pane for SOAP documentation (HPI, ROS, Objective, Assessment, Plan), and the right pane for instant prescription and diagnostic orders.
                        </p>
                      </div>
                    </div>

                    <div className="guide-step-card">
                      <span className="guide-step-badge">Step 3</span>
                      <div>
                        <h4>EECP Course Scheduling & Resource Management</h4>
                        <p>
                          Navigate to the Calendar &gt; Resource Bed View. Select an available EECP room (e.g. EECP Room 01 through 13). Book 1-hour sessions with auto-incrementing session numbers across the 35-session plan.
                        </p>
                      </div>
                    </div>

                    <div className="guide-step-card">
                      <span className="guide-step-badge">Step 4</span>
                      <div>
                        <h4>Billing Ledger & Invoice Generation</h4>
                        <p>
                          In the Billing module, assign package bundles (e.g. EECP 35-Session Package). Generate GST-compliant invoices and send instant WhatsApp payment links powered by Razorpay.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "faq" && (
                <div className="help-faq-view">
                  <h3>Frequently Asked Questions</h3>
                  <p className="text-muted text-xs mb-4">
                    Answers to common cardiology workflow, EECP tracking, and software questions.
                  </p>

                  <div className="faq-accordion-list">
                    {faqs.map((faq, idx) => {
                      const isExpanded = expandedFaq === idx;
                      return (
                        <div key={idx} className="faq-item">
                          <button
                            type="button"
                            className="faq-question-btn"
                            onClick={() =>
                              setExpandedFaq(isExpanded ? null : idx)
                            }
                          >
                            <span>{faq.q}</span>
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="faq-answer-panel">
                              <p>{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "support" && (
                <div className="help-support-view">
                  <h3>Contact Practice Technical Support</h3>
                  <p className="text-muted text-xs mb-4">
                    Our dedicated clinical informatics engineering team responds within 15 minutes during operating hours.
                  </p>

                  {supportSubmitted ? (
                    <div className="support-success-card">
                      <CheckCircle2 size={32} className="text-emerald-600 mb-2" />
                      <h4>Support Ticket Received</h4>
                      <p>
                        We have logged your ticket and notified the on-duty engineer. A confirmation has been dispatched to <strong>{user?.email || "doctor@demo.local"}</strong>.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSupportSubmit} className="support-form">
                      <div className="field">
                        <span>Staff Member & Role</span>
                        <input
                          type="text"
                          disabled
                          value={`${user?.name || "Dr. Ananya"} (${user?.role || "doctor"})`}
                          className="bg-slate-50"
                        />
                      </div>

                      <div className="field">
                        <span>Subject</span>
                        <input
                          type="text"
                          placeholder="Brief summary of inquiry or assistance needed"
                          value={supportSubject}
                          onChange={(e) => setSupportSubject(e.target.value)}
                          required
                        />
                      </div>

                      <div className="field">
                        <span>Priority Level</span>
                        <select
                          value={supportPriority}
                          onChange={(e) => setSupportPriority(e.target.value)}
                        >
                          <option value="low">Low (General question / feature inquiry)</option>
                          <option value="normal">Normal (Routine practice configuration)</option>
                          <option value="urgent">Urgent (Encounter signing or billing blockage)</option>
                        </select>
                      </div>

                      <div className="field">
                        <span>Detailed Message</span>
                        <textarea
                          rows={4}
                          placeholder="Describe the issue, patient context, or question in detail…"
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setSupportSubject("");
                            setSupportMessage("");
                          }}
                        >
                          Clear
                        </button>
                        <button type="submit" className="button primary">
                          <Send size={14} className="mr-1" />
                          <span>Submit Ticket</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeTab === "issue" && (
                <div className="help-issue-view">
                  <h3>Report a Software Issue or Bug</h3>
                  <p className="text-muted text-xs mb-4">
                    Report unexpected behavior, layout discrepancies, or hardware connector issues.
                  </p>

                  {issueSubmitted ? (
                    <div className="support-success-card">
                      <CheckCircle2 size={32} className="text-emerald-600 mb-2" />
                      <h4>Issue Report Logged</h4>
                      <p>
                        Thank you for keeping Heal Your Heart EHR robust. Our engineering team has received your trace and diagnostic telemetry.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleIssueSubmit} className="support-form">
                      <div className="field">
                        <span>Affected Module</span>
                        <select
                          value={issueModule}
                          onChange={(e) => setIssueModule(e.target.value)}
                        >
                          <option value="Consultations & Charting">Consultations & Charting</option>
                          <option value="EECP Treatment Sessions">EECP Treatment Sessions</option>
                          <option value="Calendar & Scheduling">Calendar & Scheduling</option>
                          <option value="Lab Orders & Results">Lab Orders & Results</option>
                          <option value="Billing & Invoices">Billing & Invoices</option>
                          <option value="Settings & Preferences">Settings & Preferences</option>
                          <option value="Hardware / Device Sync">Hardware / Device Sync</option>
                        </select>
                      </div>

                      <div className="field">
                        <span>Issue Title</span>
                        <input
                          type="text"
                          placeholder="Short summary of what went wrong"
                          value={issueTitle}
                          onChange={(e) => setIssueTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div className="field">
                        <span>Steps to Reproduce & Expected Behavior</span>
                        <textarea
                          rows={4}
                          placeholder="1. What did you click? 2. What happened? 3. What did you expect to happen?"
                          value={issueDetails}
                          onChange={(e) => setIssueDetails(e.target.value)}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <button type="submit" className="button danger">
                          <AlertTriangle size={14} className="mr-1" />
                          <span>Submit Issue Report</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer flex justify-between items-center">
            <span className="text-xs text-muted">
              Heal Your Heart Clinical Knowledge Center · Version 0.1.0
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
