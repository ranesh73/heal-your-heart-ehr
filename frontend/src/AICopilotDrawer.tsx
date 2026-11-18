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
  ChevronDown,
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

interface AICopilotDrawerProps {
  currentUser?: Row;
  activeFacilityId?: string;
  selectedPatientId?: string;
  selectedPatientName?: string;
}

export function AICopilotDrawer({
  currentUser,
  activeFacilityId,
  selectedPatientId,
  selectedPatientName,
}: AICopilotDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    available: boolean;
    model: string;
    error?: string | null;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const initialGreeting: Message = {
    id: "init-1",
    sender: "assistant",
    text: `Hello ${currentUser?.name || "Staff"}. I am your Heal Your Heart EHR Assistant (${(currentUser?.role || "staff").toUpperCase()}).
I can summarize patient histories, track pending worklist tasks, and explain triage workflows.
Restricted clinical actions (such as signing encounters or prescribing medications) require licensed clinician authority.`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mode: "system",
  };

  const [messages, setMessages] = useState<Message[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Load AI health and model status
  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await api("/ai/status");
      setAiStatus({
        available: res.service_available,
        model: res.model || "llama3.1:8b",
        error: res.error,
      });
    } catch (err: any) {
      setAiStatus({
        available: false,
        model: "llama3.1:8b",
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
          status: "pending"
        } : undefined
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

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-teal-700 px-4 py-3 text-white shadow-xl transition-all duration-200 hover:bg-teal-800 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Open AI Copilot"
        >
          <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
          <span className="font-semibold text-sm tracking-wide">AI Copilot</span>
          <span className="ml-1 inline-flex items-center rounded-full bg-teal-900 px-2 py-0.5 text-[11px] font-medium text-teal-200">
            {currentUser?.role || "Staff"}
          </span>
        </button>
      )}

      {/* Slide-over Drawer Panel */}
      {isOpen && (
        <div
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300"
          style={{ height: "100vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">Heal Your Heart AI Copilot</h3>
                  <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 uppercase">
                    {currentUser?.role || "Staff"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {statusLoading ? (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking Ollama...
                    </span>
                  ) : aiStatus?.available ? (
                    <span className="text-emerald-700 flex items-center gap-1 font-medium">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Ollama Online ({aiStatus.model})
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1 font-medium" title={aiStatus?.error || "Offline"}>
                      <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                      Rule-Based Mode (Ollama Offline)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchStatus}
                title="Refresh Status"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Active Patient Context Header if present */}
          {selectedPatientId && (
            <div className="bg-teal-50 border-b border-teal-200 px-4 py-2 flex items-center justify-between text-xs text-teal-900">
              <span className="font-medium truncate">
                Context: <strong>{selectedPatientName || "Active Patient"}</strong>
              </span>
              <span className="text-[11px] text-teal-700 uppercase tracking-wider font-semibold">Active Chart</span>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    m.sender === "user"
                      ? "bg-teal-700 text-white rounded-tr-none"
                      : m.isError
                      ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                  {m.confirmation && (
                    <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/70 p-3 shadow-sm text-left">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                        <span className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                          <ShieldAlert className="h-4 w-4 text-amber-600" /> Action Confirmation Required
                        </span>
                        <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Expires in 10m
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] text-slate-700">
                        <p className="font-semibold text-slate-900">
                          Action: <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-teal-800">{m.confirmation.tool}</code>
                        </p>
                        <div className="mt-1 bg-white/90 p-2 rounded border border-amber-200 space-y-0.5">
                          {Object.entries(m.confirmation.args).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-[11px]">
                              <span className="font-medium text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span>
                              <span className="font-semibold text-slate-800">{String(v)}</span>
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
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-teal-800 font-medium">
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
                          ? "Safety Guardrail"
                          : m.mode === "ollama_live"
                          ? "Ollama AI"
                          : "Deterministic"}
                      </span>
                    )}
                    <span>{m.timestamp}</span>
                  </div>
                </div>
                {m.sender === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                  <span>Analyzing EHR context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts / Chips */}
          <div className="border-t border-slate-200 bg-white px-3 py-2 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendMessage("What are my pending tasks for today?")}
              className="rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] text-slate-700 transition"
            >
              📋 My Tasks
            </button>
            {selectedPatientId && (
              <button
                onClick={() => handleSendMessage("Summarize the current patient's clinical chart")}
                className="rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 text-[11px] text-teal-800 transition"
              >
                🫀 Patient Summary
              </button>
            )}
            <button
              onClick={() => handleSendMessage("Explain the patient arrival triage workflow")}
              className="rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-[11px] text-slate-700 transition"
            >
              🏥 Arrival Workflow
            </button>
            <button
              onClick={() => handleSendMessage("Sign encounter and finalize doctor note")}
              className="rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 text-[11px] text-rose-700 transition"
              title="Test Clinical Guardrail"
            >
              🔒 Test Guardrail
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-slate-200 bg-white p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI Copilot or query EHR..."
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
