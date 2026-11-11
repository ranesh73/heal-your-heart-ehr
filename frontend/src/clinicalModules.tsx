import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  Flame,
  FolderOpen,
  Hash,
  Heart,
  HelpCircle,
  Inbox,
  Layers,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Stethoscope,
  Tag,
  Upload,
  User,
  Users,
} from "lucide-react";
import {
  api,
  branch,
  Row,
  day,
  dateTime,
  navigate,
  patientName,
  today,
} from "./api";
import { useApp } from "./context";
import {
  Button,
  Panel,
  PageHeading,
  Loading,
  ErrorBox,
  Badge,
  Empty,
  Table,
  Modal,
} from "./ui";

import { CharmLabOrders } from "./charmLabOrders";
import { CharmImages } from "./charmImages";

/* ==========================================================================
   1. LABS & DIAGNOSTIC RESULTS MODULE (/labs) - CHARMHEALTH GLOBAL REPLICA
   ========================================================================== */
export function LabsPage() {
  return (
    <div className="charm-module-wrap">
      <CharmLabOrders isGlobal={true} />
    </div>
  );
}

/* ==========================================================================
   2. CARDIOLOGY IMAGING MODULE (/images) - CHARMHEALTH GLOBAL REPLICA
   ========================================================================== */
export function ImagesPage() {
  return (
    <div className="charm-module-wrap">
      <CharmImages isGlobal={true} />
    </div>
  );
}

/* ==========================================================================
   3. DOCUMENTS MODULE (/documents)
   ========================================================================== */
export function DocumentsPage() {
  const { patients, staff, notify } = useApp();
  const [modal, setModal] = useState(false);
  const [category, setCategory] = useState("all");

  const mockDocs = [
    {
      id: "doc-1",
      title: "Signed EECP Informed Consent Form",
      category: "Consent",
      patient_id: patients[0]?.id || "p1",
      uploaded_by: staff[0]?.name || "Doctor",
      created_at: "2026-10-26T08:00:00Z",
      size: "245 KB",
    },
    {
      id: "doc-2",
      title: "Prior Hospital Discharge Summary (Apollo Greams)",
      category: "Discharge Summary",
      patient_id: patients[1]?.id || "p2",
      uploaded_by: staff[1]?.name || "Assistant",
      created_at: "2026-10-25T11:20:00Z",
      size: "1.4 MB",
    },
    {
      id: "doc-3",
      title: "Aadhaar Card Verification Copy",
      category: "ID Proof",
      patient_id: patients[2]?.id || "p3",
      uploaded_by: "Reception",
      created_at: "2026-10-24T16:45:00Z",
      size: "512 KB",
    },
  ];

  return (
    <div className="charm-module-wrap">
      <PageHeading
        eyebrow="Clinical Repository"
        title="Documents & Files"
        description="Practice document inbox, patient identification records, and signed medical consents."
        actions={
          <Button onClick={() => setModal(true)}>
            <Upload size={15} />
            Upload Document
          </Button>
        }
      />

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="actions">
          {["all", "Consent", "Discharge Summary", "ID Proof"].map((c) => (
            <Button
              key={c}
              variant={category === c ? "primary" : "secondary"}
              onClick={() => setCategory(c)}
            >
              {c === "all" ? "All Categories" : c}
            </Button>
          ))}
        </div>
      </div>

      <Table
        rows={mockDocs.filter((d) => (category === "all" ? true : d.category === category))}
        columns={[
          {
            title: "Document Title",
            render: (d) => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} color="#0f4c81" />
                <div>
                  <strong>{d.title}</strong>
                  <small className="cell-sub">{d.category} · {d.size}</small>
                </div>
              </div>
            ),
          },
          {
            title: "Patient",
            render: (d) => (
              <button
                className="text-link"
                onClick={() => navigate("/patients/" + d.patient_id)}
              >
                {patientName(d.patient_id, patients)}
              </button>
            ),
          },
          {
            title: "Uploaded By",
            render: (d) => <span>{d.uploaded_by}</span>,
          },
          {
            title: "Upload Date",
            render: (d) => <span className="mono">{day(d.created_at)}</span>,
          },
          {
            title: "Actions",
            render: (d) => (
              <Button
                variant="secondary"
                onClick={() => notify("Document download simulated.")}
              >
                <Download size={14} />
                Download
              </Button>
            ),
          },
        ]}
        empty="No documents uploaded in this category."
      />

      {modal && (
        <Modal title="Upload Patient Document" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Patient</span>
              <select>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Document Category</span>
              <select>
                <option value="consent">Consent Form</option>
                <option value="discharge">Discharge Summary</option>
                <option value="id">ID Proof</option>
                <option value="external">External Medical Record</option>
                <option value="referral">Referral Letter</option>
              </select>
            </label>
            <label className="field">
              <span>Document Title</span>
              <input placeholder="e.g. Post-PTCA Angiogram CD Report" />
            </label>
            <label className="field">
              <span>Attach File</span>
              <input type="file" />
            </label>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  notify("Document uploaded and linked to chart.");
                  setModal(false);
                }}
              >
                Save Document
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   4. INJECTIONS & VACCINES MODULE (/injections)
   ========================================================================== */
export function InjectionsPage() {
  const { patients, staff, notify } = useApp();
  const [modal, setModal] = useState(false);

  const mockInjections = [
    {
      id: "inj-1",
      name: "Heparin Sodium 5,000 IU/mL",
      type: "Injection",
      dose: "5,000 IU",
      route: "Subcutaneous",
      site: "Abdomen left lower quadrant",
      lot: "HEP-2026-8841",
      patient_id: patients[0]?.id || "p1",
      admin_by: staff[0]?.name || "Nurse",
      date: "2026-10-26T09:30:00Z",
    },
    {
      id: "inj-2",
      name: "Influenza Vaccine (Quadrivalent)",
      type: "Vaccine",
      dose: "0.5 mL",
      route: "Intramuscular",
      site: "Right Deltoid",
      lot: "FL-99321",
      patient_id: patients[1]?.id || "p2",
      admin_by: staff[1]?.name || "Nurse",
      date: "2026-10-25T11:00:00Z",
    },
  ];

  return (
    <div className="charm-module-wrap">
      <PageHeading
        eyebrow="Clinical Administration"
        title="Injections & Vaccines"
        description="Medication administration records (MAR), immunization schedules, and lot tracking."
        actions={
          <Button onClick={() => setModal(true)}>
            <Plus size={15} />
            Record Administration
          </Button>
        }
      />

      <Table
        rows={mockInjections}
        columns={[
          {
            title: "Drug / Vaccine",
            render: (r) => (
              <div>
                <strong>{r.name}</strong>
                <small className="cell-sub">{r.type} · Lot: {r.lot}</small>
              </div>
            ),
          },
          {
            title: "Patient",
            render: (r) => (
              <button
                className="text-link"
                onClick={() => navigate("/patients/" + r.patient_id)}
              >
                {patientName(r.patient_id, patients)}
              </button>
            ),
          },
          {
            title: "Dosage & Route",
            render: (r) => (
              <span>{r.dose} via {r.route} ({r.site})</span>
            ),
          },
          {
            title: "Administered By",
            render: (r) => <span>{r.admin_by}</span>,
          },
          {
            title: "Date & Time",
            render: (r) => <span className="mono">{dateTime(r.date)}</span>,
          },
        ]}
        empty="No injections or vaccines recorded."
      />

      {modal && (
        <Modal title="Record In-Clinic Administration" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Patient</span>
              <select>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Medication / Vaccine</span>
              <input placeholder="e.g. Vitamin B12 / Heparin / Tetanus Toxoid" />
            </label>
            <label className="field">
              <span>Dose & Unit</span>
              <input placeholder="e.g. 1000 mcg or 5000 IU" />
            </label>
            <label className="field">
              <span>Route & Anatomical Site</span>
              <select>
                <option value="im-r-deltoid">Intramuscular (IM) · Right Deltoid</option>
                <option value="im-l-deltoid">Intramuscular (IM) · Left Deltoid</option>
                <option value="sc-abdomen">Subcutaneous (SC) · Abdomen</option>
                <option value="iv-push">Intravenous (IV) Push</option>
              </select>
            </label>
            <label className="field">
              <span>Batch / Lot Number</span>
              <input placeholder="e.g. LOT-2026-X49" />
            </label>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  notify("Administration record logged to MAR.");
                  setModal(false);
                }}
              >
                Save Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   5. REFERRALS MODULE (/referrals)
   ========================================================================== */
export function ReferralsPage() {
  const { patients, staff, notify } = useApp();
  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");
  const [modal, setModal] = useState(false);

  const mockReferrals = [
    {
      id: "ref-1",
      type: "inbound",
      patient_id: patients[0]?.id || "p1",
      physician: "Dr. K. S. Sundararajan (Cardiologist, Apollo)",
      indication: "Refractory Angina CCS Class III post-CABG, referred for 35-Hour EECP",
      status: "Accepted & Enrolled",
      date: "2026-10-20",
    },
    {
      id: "ref-2",
      type: "outbound",
      patient_id: patients[1]?.id || "p2",
      physician: "Dr. P. Mohan (Electrophysiologist, MIOT)",
      indication: "Paroxysmal Atrial Fibrillation evaluation prior to completing EECP course",
      status: "Consultation Pending",
      date: "2026-10-24",
    },
  ];

  return (
    <div className="charm-module-wrap">
      <PageHeading
        eyebrow="Specialist Coordination"
        title="Referrals"
        description="Track inbound patient referrals for EECP therapy and outbound specialist consultations."
        actions={
          <Button onClick={() => setModal(true)}>
            <Plus size={15} />
            New Referral
          </Button>
        }
      />

      <div className="charm-subtabs">
        <button
          className={`charm-subtab-btn ${tab === "inbound" ? "active" : ""}`}
          onClick={() => setTab("inbound")}
        >
          Inbound Referrals
        </button>
        <button
          className={`charm-subtab-btn ${tab === "outbound" ? "active" : ""}`}
          onClick={() => setTab("outbound")}
        >
          Outbound Referrals
        </button>
      </div>

      <Table
        rows={mockReferrals.filter((r) => r.type === tab)}
        columns={[
          {
            title: "Specialist / Facility",
            render: (r) => (
              <div>
                <strong>{r.physician}</strong>
                <small className="cell-sub">{r.indication}</small>
              </div>
            ),
          },
          {
            title: "Patient",
            render: (r) => (
              <button
                className="text-link"
                onClick={() => navigate("/patients/" + r.patient_id)}
              >
                {patientName(r.patient_id, patients)}
              </button>
            ),
          },
          {
            title: "Date",
            render: (r) => <span className="mono">{day(r.date)}</span>,
          },
          {
            title: "Status",
            render: (r) => <Badge value={r.status} />,
          },
          {
            title: "Actions",
            render: (r) => (
              <Button
                variant="ghost"
                onClick={() => navigate("/patients/" + r.patient_id)}
              >
                View Patient
                <ChevronRight size={14} />
              </Button>
            ),
          },
        ]}
        empty="No referrals found in this view."
      />

      {modal && (
        <Modal title="Create Referral" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Referral Direction</span>
              <select>
                <option value="inbound">Inbound (External Doctor Referring to Heal Your Heart)</option>
                <option value="outbound">Outbound (Referring Patient to External Specialist)</option>
              </select>
            </label>
            <label className="field">
              <span>Patient</span>
              <select>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Specialist / Practice Name</span>
              <input placeholder="e.g. Dr. Ramesh Kumar, Chief of Cardiology" />
            </label>
            <label className="field">
              <span>Clinical Reason / Indication</span>
              <textarea placeholder="e.g. EECP 35 sessions counter-pulsation protocol" rows={3} />
            </label>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  notify("Referral record created successfully.");
                  setModal(false);
                }}
              >
                Save Referral
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   6. SECURE MESSAGING MODULE (/messages)
   ========================================================================== */
export function MessagesPage() {
  const { patients, staff, user, notify } = useApp();
  const [tab, setTab] = useState<"inbox" | "sent" | "drafts">("inbox");
  const [modal, setModal] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["messages", branch],
    queryFn: () => api<Row[]>("/records/messages"),
  });

  const messages = messagesQuery.data || [];
  const inbox = messages.filter((m) => m.recipient_id === user.id);
  const sent = messages.filter((m) => m.author_id === user.id);

  const activeList = tab === "inbox" ? inbox : tab === "sent" ? sent : [];

  return (
    <div className="charm-module-wrap">
      <PageHeading
        eyebrow="Communication"
        title="Messages"
        description="Secure internal clinical messaging and direct patient portal communications."
        actions={
          <Button onClick={() => setModal(true)}>
            <Send size={15} />
            Compose Message
          </Button>
        }
      />

      <div className="charm-subtabs">
        <button
          className={`charm-subtab-btn ${tab === "inbox" ? "active" : ""}`}
          onClick={() => setTab("inbox")}
        >
          Inbox ({inbox.length})
        </button>
        <button
          className={`charm-subtab-btn ${tab === "sent" ? "active" : ""}`}
          onClick={() => setTab("sent")}
        >
          Sent Messages ({sent.length})
        </button>
        <button
          className={`charm-subtab-btn ${tab === "drafts" ? "active" : ""}`}
          onClick={() => setTab("drafts")}
        >
          Drafts (0)
        </button>
      </div>

      {messagesQuery.isLoading ? (
        <Loading />
      ) : (
        <Table
          rows={activeList}
          columns={[
            {
              title: "Subject & Message",
              render: (m) => (
                <div>
                  <strong>{m.subject || "Clinical inquiry"}</strong>
                  <small className="cell-sub">{m.body || m.content}</small>
                </div>
              ),
            },
            {
              title: tab === "inbox" ? "From" : "To",
              render: (m) => (
                <span>
                  {staff.find((s) => s.id === (tab === "inbox" ? m.author_id : m.recipient_id))?.name || "Staff"}
                </span>
              ),
            },
            {
              title: "Patient Context",
              render: (m) =>
                m.patient_id ? (
                  <button
                    className="text-link"
                    onClick={() => navigate("/patients/" + m.patient_id)}
                  >
                    {patientName(m.patient_id, patients)}
                  </button>
                ) : (
                  <span className="muted">General</span>
                ),
            },
            {
              title: "Sent Date",
              render: (m) => <span className="mono">{dateTime(m.created_at)}</span>,
            },
          ]}
          empty="No messages in this folder."
        />
      )}

      {modal && (
        <Modal title="Compose Clinical Message" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Recipient</span>
              <select id="msg-recipient">
                {staff
                  .filter((s) => s.id !== user.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Patient (Optional Context)</span>
              <select id="msg-patient">
                <option value="">None (General Staff Message)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Subject</span>
              <input placeholder="e.g. EECP Session 15 Blood Pressure Observation" />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea placeholder="Write clinical message..." rows={4} />
            </label>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Discard
              </Button>
              <Button
                onClick={() => {
                  notify("Message sent securely.");
                  setModal(false);
                }}
              >
                Send Message
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   7. OFFICE CHANNELS MODULE (/channels)
   ========================================================================== */
export function ChannelsPage() {
  const { user, staff } = useApp();
  const [activeChannel, setActiveChannel] = useState("general-clinical");
  const [inputMsg, setInputMsg] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "c1",
      channel: "general-clinical",
      author: "Dr. Ananya Demo",
      role: "Cardiologist",
      time: "09:15 AM",
      text: "Good morning team. Patient Issac G is scheduled for EECP Session 14 today. Please check baseline BP prior to counterpulsation.",
    },
    {
      id: "c2",
      channel: "general-clinical",
      author: "Kavin Demo",
      role: "EECP Therapist",
      time: "09:22 AM",
      text: "Noted Dr. Ananya. Bed 02 is prepped and calibrated. Pre-session vitals will be recorded.",
    },
    {
      id: "c3",
      channel: "eecp-care-team",
      author: "Aarav Demo",
      role: "Doctor",
      time: "08:45 AM",
      text: "Neelankarai branch has 8 EECP patients scheduled across morning slots. All pressure cuffs sanitized.",
    },
    {
      id: "c4",
      channel: "billing-frontdesk",
      author: "Preethi Demo",
      role: "Billing Officer",
      time: "10:00 AM",
      text: "Reminder: Insurance pre-auth approved for 35-session package for patient UITest.",
    },
  ]);

  const send = () => {
    if (!inputMsg.trim()) return;
    setMessages([
      ...messages,
      {
        id: "msg-" + Date.now(),
        channel: activeChannel,
        author: user.name,
        role: user.role,
        time: "Just now",
        text: inputMsg,
      },
    ]);
    setInputMsg("");
  };

  const channelList = [
    { id: "general-clinical", name: "general-clinical", desc: "Care team wide coordination" },
    { id: "eecp-care-team", name: "eecp-care-team", desc: "Therapists & Cardiology discussions" },
    { id: "billing-frontdesk", name: "billing-frontdesk", desc: "Intake, claims & payments" },
    { id: "cardiology-rounds", name: "cardiology-rounds", desc: "Consultations & diagnostic reviews" },
  ];

  const filteredMsgs = messages.filter((m) => m.channel === activeChannel);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)" }}>
      {/* Channels Sidebar */}
      <div
        style={{
          width: 250,
          background: "#0f172a",
          color: "#94a3b8",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #1e293b" }}>
          <strong style={{ color: "#ffffff", fontSize: 14 }}>Office Channels</strong>
          <small style={{ display: "block", color: "#64748b", fontSize: 11 }}>
            Heal Your Heart Workspace
          </small>
        </div>
        <div style={{ padding: "10px 8px", flex: 1 }}>
          {channelList.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChannel(c.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 6,
                border: 0,
                background: activeChannel === c.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: activeChannel === c.id ? "#ffffff" : "#94a3b8",
                fontWeight: activeChannel === c.id ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 4,
              }}
            >
              <Hash size={16} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Channel Chat Feed */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff" }}>
        <div
          style={{
            height: 48,
            borderBottom: "1px solid #e2e8f0",
            padding: "0 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Hash size={18} color="#0f4c81" />
            <strong style={{ fontSize: 14, color: "#0f172a" }}>#{activeChannel}</strong>
          </div>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {channelList.find((c) => c.id === activeChannel)?.desc}
          </span>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredMsgs.map((m) => (
            <div key={m.id} style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "#0f4c81",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {m.author.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 13, color: "#0f172a" }}>{m.author}</strong>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{m.role}</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{m.time}</span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#334155" }}>
                  {m.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{ display: "flex", gap: 10 }}
          >
            <input
              placeholder={`Message #${activeChannel}...`}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{ flex: 1, height: 38 }}
            />
            <Button type="submit">
              <Send size={15} />
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   8. CLINICAL & PRACTICE TASKS MODULE (/tasks)
   ========================================================================== */
export function TasksPage() {
  const { patients, staff, user, notify } = useApp();
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);

  const tasksQuery = useQuery({
    queryKey: ["tasks", branch],
    queryFn: () => api<Row[]>("/records/tasks"),
  });

  const tasks = tasksQuery.data || [];
  const myTasks = tasks.filter((t) => t.assignee_id === user.id);
  const pendingTasks = tasks.filter((t) => t.status === "pending");

  const filtered = filter === "mine" ? myTasks : filter === "pending" ? pendingTasks : tasks;

  return (
    <div className="charm-module-wrap">
      <PageHeading
        eyebrow="Follow-up & Workflows"
        title="Tasks"
        description="Clinical to-dos, diagnostic review reminders, and patient follow-up assignments."
        actions={
          <Button onClick={() => setModal(true)}>
            <Plus size={15} />
            Add Task
          </Button>
        }
      />

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="actions">
          <Button
            variant={filter === "all" ? "primary" : "secondary"}
            onClick={() => setFilter("all")}
          >
            All Tasks ({tasks.length})
          </Button>
          <Button
            variant={filter === "mine" ? "primary" : "secondary"}
            onClick={() => setFilter("mine")}
          >
            Assigned to Me ({myTasks.length})
          </Button>
          <Button
            variant={filter === "pending" ? "primary" : "secondary"}
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingTasks.length})
          </Button>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <Loading />
      ) : (
        <Table
          rows={filtered}
          columns={[
            {
              title: "Task Description",
              render: (t) => (
                <div>
                  <strong>{t.title}</strong>
                  {t.description && <small className="cell-sub">{t.description}</small>}
                </div>
              ),
            },
            {
              title: "Patient Context",
              render: (t) =>
                t.patient_id ? (
                  <button
                    className="text-link"
                    onClick={() => navigate("/patients/" + t.patient_id)}
                  >
                    {patientName(t.patient_id, patients)}
                  </button>
                ) : (
                  <span className="muted">Administrative</span>
                ),
            },
            {
              title: "Priority",
              render: (t) => (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      t.priority === "high"
                        ? "#fee2e2"
                        : t.priority === "urgent"
                        ? "#fef3c7"
                        : "#f1f5f9",
                    color:
                      t.priority === "high"
                        ? "#b91c1c"
                        : t.priority === "urgent"
                        ? "#b45309"
                        : "#475569",
                  }}
                >
                  {t.priority || "normal"}
                </span>
              ),
            },
            {
              title: "Assigned To",
              render: (t) => (
                <span>{staff.find((s) => s.id === t.assignee_id)?.name || "Unassigned"}</span>
              ),
            },
            {
              title: "Due Date",
              render: (t) => <span className="mono">{t.due_date ? day(t.due_date) : "—"}</span>,
            },
            {
              title: "Status",
              render: (t) => <Badge value={t.status || "pending"} />,
            },
          ]}
          empty="No tasks found matching this criteria."
        />
      )}

      {modal && (
        <Modal title="Create New Task" onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label className="field">
              <span>Task Title</span>
              <input placeholder="e.g. Call patient to confirm EECP session 15" />
            </label>
            <label className="field">
              <span>Assign Staff Member</span>
              <select>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Patient (Optional)</span>
              <select>
                <option value="">None (Practice Internal Task)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="field">
              <span>Due Date</span>
              <input type="date" defaultValue={today()} />
            </label>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  notify("Task created and assigned.");
                  setModal(false);
                }}
              >
                Save Task
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
