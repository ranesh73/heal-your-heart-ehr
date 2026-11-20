import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClinicalTasksView } from "./clinicalTasks";
import { GlobalReferralsPage } from "./referralsManagement";
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
import { CharmInjectionsGlobal } from "./charmInjectionsGlobal";

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
   4. INJECTIONS & VACCINES MODULE (/injections) - CHARMHEALTH GLOBAL REPLICA
   ========================================================================== */
export function InjectionsPage() {
  return <CharmInjectionsGlobal />;
}

/* ==========================================================================
   5. REFERRALS MODULE (/referrals)
   ========================================================================== */
export function ReferralsPage() {
  return <GlobalReferralsPage />;
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
  return <ClinicalTasksView />;
}
