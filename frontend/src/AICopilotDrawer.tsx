import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Bot,
  RefreshCw,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Trash2,
  Activity,
  HeartPulse,
  Info,
  Calendar,
  Syringe,
  FlaskConical,
  CreditCard,
  FileText,
  Clock,
  ChevronRight,
} from "lucide-react";
import { api, Row } from "./api";

interface PendingActionInfo {
  actionId: string;
  tool: string;
  args: Record<string, any>;
  summary: string;
  status: "pending" | "confirming" | "confirmed" | "rejected" | "error";
  result?: any;
  error?: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  mode?: string;
  isError?: boolean;
  confirmation?: PendingActionInfo;
}

export interface AICopilotDrawerProps {
  currentUser?: Row;
  activeFacilityId?: string;
  selectedPatientId?: string;
  selectedPatientName?: string;
  currentPage?: string;
  hideFloatingLauncher?: boolean;
}

export function AICopilotDrawer({
  currentUser,
  activeFacilityId,
  selectedPatientId,
  selectedPatientName,
  currentPage = "home",
  hideFloatingLauncher = false,
}: AICopilotDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    available: boolean;
    provider?: string;
    model: string;
    error?: string | null;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Global event listener to open copilot from docked topbar button
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("hyh_open_copilot", handleOpen);
    window.addEventListener("hyh_toggle_copilot", handleToggle);
    return () => {
      window.removeEventListener("hyh_open_copilot", handleOpen);
      window.removeEventListener("hyh_toggle_copilot", handleToggle);
    };
  }, []);

  const roleName = (currentUser?.role || "staff").toUpperCase();

  const getGreeting = () => ({
    id: "init-1",
    sender: "assistant" as const,
    text: `Hello ${currentUser?.name || "Staff"}. I am your Heal Your Heart EHR Assistant (${roleName}).\n\nI can summarize clinical records, retrieve patient charts, check appointment schedules, and assist with clinical workflows.\n\n🔒 Note: Restricted clinical actions (such as finalizing encounters or modifying prescribed medications) require authorized clinician sign-off.`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mode: "system",
  });

  const [messages, setMessages] = useState<Message[]>([getGreeting()]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input on drawer open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut listener: Ctrl + / or Cmd + / to toggle; Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Load AI health and model status
  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await api("/ai/status");
      setAiStatus({
        available: res.service_available,
        provider: res.provider || "ollama",
        model: res.model || "llama-3.3-70b-versatile",
        error: res.error,
      });
    } catch (err: any) {
      setAiStatus({
        available: false,
        provider: "ollama",
        model: "llama-3.3-70b-versatile",
        error: err.message || "Failed to query AI service status",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !aiStatus) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleClearChat = () => {
    setMessages([getGreeting()]);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setLoading(true);

    try {
      const res = await api("/ai/chat", "POST", {
        message: textToSend,
        patient_id: selectedPatientId || undefined,
      });

      const isConfirmation = res.type === "action_confirmation_required";
      const assistantMsg: Message = {
        id: "a-" + Date.now(),
        sender: "assistant",
        text: res.summary || res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: res.mode,
        confirmation: isConfirmation && res.action_id ? {
          actionId: res.action_id,
          tool: res.tool || "action",
          args: res.args || {},
          summary: res.summary || res.response,
          status: "pending",
        } : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: "err-" + Date.now(),
        sender: "assistant",
        text: `Error: ${err.message || "Unable to complete request. Please verify network and backend connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.confirmation
          ? { ...m, confirmation: { ...m.confirmation, status: "confirming" } }
          : m
      )
    );
    try {
      const res = await api(`/ai/actions/${actionId}/confirm`, "POST");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: "confirmed",
                  result: res.result,
                },
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: "error",
                  error: err.message || "Action expired or confirmation failed",
                },
              }
            : m
        )
      );
    }
  };

  const handleRejectAction = async (msgId: string, actionId: string) => {
    try {
      await api(`/ai/actions/${actionId}/reject`, "POST");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: "rejected",
                },
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.confirmation
            ? {
                ...m,
                confirmation: {
                  ...m.confirmation,
                  status: "error",
                  error: err.message || "Failed to cancel action",
                },
              }
            : m
        )
      );
    }
  };

  // Context-aware smart prompts based on active page
  const getPagePrompts = () => {
    if (selectedPatientId) {
      return [
        { label: "🫀 Patient Summary", prompt: `Summarize the clinical record and history for patient ${selectedPatientId}` },
        { label: "📈 Vitals Trend", prompt: `What are the latest vital signs and trends for patient ${selectedPatientId}?` },
        { label: "💊 Active Meds", prompt: `List all active medications and prescriptions for patient ${selectedPatientId}` },
      ];
    }

    switch (currentPage) {
      case "injections":
        return [
          { label: "💉 Injection Orders", prompt: "Summarize pending injection and vaccine orders for this branch" },
          { label: "📋 Administration Protocol", prompt: "Explain the safety verification protocol before administering cardiology injections" },
          { label: "📋 Medication Check", prompt: "Check common contraindications for cardiology injectables" },
        ];
      case "calendar":
      case "operations":
        return [
          { label: "📅 Today's Schedule", prompt: "Summarize today's appointment schedule and provider availability" },
          { label: "⏰ Open Slots", prompt: "How many open appointment slots are available for consultation today?" },
          { label: "📋 My Tasks", prompt: "What are my pending tasks for today?" },
        ];
      case "patients":
        return [
          { label: "👥 Patient Registry", prompt: "How do I filter high-risk cardiology patients in the registry?" },
          { label: "🏥 Arrival Workflow", prompt: "Explain the patient arrival and check-in workflow" },
          { label: "📋 My Tasks", prompt: "What are my pending tasks for today?" },
        ];
      case "labs":
        return [
          { label: "🧪 Abnormal Labs", prompt: "What are the critical abnormal lab thresholds for cardiology patients?" },
          { label: "📋 Pending Orders", prompt: "List pending lab results awaiting review" },
          { label: "📋 My Tasks", prompt: "What are my pending tasks for today?" },
        ];
      case "billing":
        return [
          { label: "💳 Unpaid Invoices", prompt: "Summarize outstanding patient balances and insurance claims" },
          { label: "📊 Billing Workflow", prompt: "Explain the billing and invoice finalization workflow" },
          { label: "📋 My Tasks", prompt: "What are my pending tasks for today?" },
        ];
      case "encounter":
        return [
          { label: "📝 SOAP Format", prompt: "Guide me through documenting an encounter SOAP note" },
          { label: "🔒 Finalize Encounter", prompt: "Sign encounter and finalize doctor note" },
          { label: "🩺 Cardiology Guidelines", prompt: "What are the ACC/AHA clinical guidelines for stable ischemic heart disease?" },
        ];
      default:
        return [
          { label: "📋 My Tasks", prompt: "What are my pending tasks for today?" },
          { label: "🏥 Arrival Workflow", prompt: "Explain the patient arrival triage workflow" },
          { label: "🩺 Clinical Protocol", prompt: "Explain the clinical sign-off requirements for patient notes" },
          { label: "📈 Branch Activity", prompt: "Summarize today's clinical and appointment activity" },
        ];
    }
  };

  const getPageTitle = (p: string) => {
    switch (p) {
      case "home": return "Dashboard";
      case "injections": return "Injections & Vaccines";
      case "calendar": case "operations": return "Appointments & Calendar";
      case "patients": return selectedPatientId ? "Patient Chart" : "Patient Directory";
      case "encounter": return "Encounter Note";
      case "labs": return "Laboratory Orders";
      case "images": return "Diagnostic Imaging";
      case "documents": return "Patient Documents";
      case "referrals": return "Referrals Management";
      case "messages": return "Clinical Messages";
      case "tasks": return "Task Worklist";
      case "billing": return "Billing & Invoices";
      case "inventory": return "Pharmacy & Inventory";
      case "analytics": return "Clinical Analytics";
      case "settings": return "Practice Settings";
      case "eecp": return "EECP Treatment Bed";
      default: return p.charAt(0).toUpperCase() + p.slice(1);
    }
  };

  return (
    <>
      {/* Floating Launcher Button (positioned above collab dock, below toolbar) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="charm-copilot-launcher group"
          aria-label="Open AI Copilot"
          title="Open AI Copilot (Ctrl + /)"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiStatus?.available ? "bg-emerald-400" : "bg-amber-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${aiStatus?.available ? "bg-emerald-500" : "bg-amber-500"}`}></span>
            </span>
          </div>
          <span className="font-semibold text-xs tracking-wide">AI Copilot</span>
          <span className="rounded-full bg-teal-900/60 border border-teal-600/50 px-2 py-0.5 text-[10px] font-medium text-teal-200 uppercase">
            {roleName}
          </span>
        </button>
      )}

      {/* Backdrop for easy dismiss */}
      {isOpen && (
        <div
          className="charm-copilot-backdrop"
          onClick={() => setIsOpen(false)}
          aria-label="Close AI Copilot backdrop"
        />
      )}

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div
          className={`charm-copilot-drawer ${
            isExpanded ? "w-full md:w-[700px] lg:w-[740px]" : "w-full sm:w-[450px]"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Heal Your Heart AI Copilot"
        >
          {/* Header (Always Visible, z-index guaranteed above everything) */}
          <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 px-4 py-3 text-white shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600/80 border border-teal-400/30 text-white shadow-inner">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold tracking-tight text-white truncate">
                    Heal Your Heart Copilot
                  </h3>
                  <span className="rounded bg-teal-700/80 border border-teal-500/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tracking-wider">
                    {roleName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-teal-200/90 mt-0.5">
                  {statusLoading ? (
                    <span className="flex items-center gap-1 text-slate-300">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verifying AI Service...
                    </span>
                  ) : aiStatus?.available ? (
                    <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
                      {aiStatus.provider === "groq" ? "Groq Cloud" : "Ollama Live"} ({aiStatus.model})
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-1.5 text-amber-300 font-medium cursor-help"
                      title={aiStatus?.error || "Offline: Rule-based fallback active"}
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                      Deterministic Mode ({aiStatus?.provider === "groq" ? "Groq Offline" : "Ollama Offline"})
                    </span>
                  )}
                  {activeFacilityId && (
                    <span className="text-teal-400/70 font-mono text-[10px]">
                      · {activeFacilityId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse to Standard Width" : "Expand to Wide Mode"}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-teal-200 hover:bg-teal-700/60 hover:text-white transition"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={fetchStatus}
                title="Refresh Status"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-teal-200 hover:bg-teal-700/60 hover:text-white transition"
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleClearChat}
                title="Clear Chat History"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-teal-200 hover:bg-teal-700/60 hover:text-white transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close AI Copilot (Esc)"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/50 text-white hover:bg-rose-600 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Current Page Context Strip */}
          <div className="shrink-0 bg-slate-100 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-600" />
              <span>Location:</span>
              <strong className="text-slate-800">{getPageTitle(currentPage)}</strong>
            </div>
            {selectedPatientId && (
              <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px] text-teal-800 font-semibold truncate max-w-[200px]">
                <HeartPulse className="h-3 w-3 text-teal-600 shrink-0" />
                <span className="truncate">{selectedPatientName || `Patient #${selectedPatientId}`}</span>
              </div>
            )}
          </div>

          {/* Chat Messages Body (Scrollable, min-h-0 prevents input cutoff) */}
          <div className="charm-copilot-messages p-4 space-y-3.5 bg-slate-50/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white mt-0.5 shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    m.sender === "user"
                      ? "bg-teal-700 text-white rounded-tr-none"
                      : m.isError
                      ? "bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                  {/* Action Confirmation Card (Confirm-Before-Write Pattern) */}
                  {m.confirmation && (
                    <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/80 p-3 shadow-sm text-left">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                        <span className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                          <ShieldAlert className="h-4 w-4 text-amber-600" /> Action Confirmation Required
                        </span>
                        <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          10m Timeout
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5 text-[11px] text-slate-700">
                        <p className="font-semibold text-slate-900 flex items-center gap-1">
                          <span>Action:</span>
                          <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-teal-800 font-semibold">
                            {m.confirmation.tool}
                          </code>
                        </p>
                        <div className="bg-white/95 p-2 rounded-lg border border-amber-200 space-y-1 shadow-inner">
                          {Object.entries(m.confirmation.args).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-[11px]">
                              <span className="font-medium text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                              <span className="font-semibold text-slate-800 truncate">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {m.confirmation.status === "pending" && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(m.id, m.confirmation!.actionId)}
                            className="flex-1 rounded-lg bg-teal-700 py-1.5 px-3 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 transition"
                          >
                            Confirm & Execute
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectAction(m.id, m.confirmation!.actionId)}
                            className="rounded-lg bg-slate-200 py-1.5 px-3 text-xs font-medium text-slate-700 hover:bg-slate-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {m.confirmation.status === "confirming" && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-teal-800 font-medium py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                          <span>Executing action...</span>
                        </div>
                      )}

                      {m.confirmation.status === "confirmed" && (
                        <div className="mt-2.5 rounded-lg bg-emerald-100/90 border border-emerald-300 p-2 flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                          <span>Action Confirmed & Executed Successfully</span>
                        </div>
                      )}

                      {m.confirmation.status === "rejected" && (
                        <div className="mt-2.5 rounded-lg bg-slate-200/80 border border-slate-300 p-2 flex items-center gap-2 text-xs text-slate-700">
                          <X className="h-4 w-4 text-slate-500 shrink-0" />
                          <span>Action Cancelled by User</span>
                        </div>
                      )}

                      {m.confirmation.status === "error" && (
                        <div className="mt-2.5 rounded-lg bg-rose-100 border border-rose-300 p-2 flex items-center gap-2 text-xs text-rose-800">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>{m.confirmation.error || "Action expired or failed"}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                      m.sender === "user" ? "text-teal-200" : "text-slate-400"
                    }`}
                  >
                    {m.mode && (
                      <span className="italic opacity-80">
                        {m.mode === "guardrail_rejected"
                          ? "🛡️ Clinical Guardrail"
                          : m.mode === "groq_live"
                          ? "⚡ Groq AI"
                          : m.mode === "ollama_live"
                          ? "🤖 Ollama AI"
                          : "⚙️ Deterministic"}
                      </span>
                    )}
                    <span>{m.timestamp}</span>
                  </div>
                </div>
                {m.sender === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 mt-0.5 shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200 px-4 py-3 text-xs text-slate-600 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                  <span>Analyzing EHR context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context-Aware Quick Prompts Chips */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap gap-1.5">
            {getPagePrompts().map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                className="rounded-full bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-teal-900 transition shadow-xs"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Pinned Input Form (Always Visible, shrink-0, proper padding) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="shrink-0 border-t border-slate-200 bg-white p-3 space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask AI Copilot or query EHR (e.g., summarize patient, list tasks)..."
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> to send</span>
              <span><kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Esc</kbd> to close · <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Ctrl + /</kbd> to toggle</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
