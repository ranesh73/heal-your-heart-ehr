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

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  mode?: string;
  isError?: boolean;
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

      const assistantMsg: Message = {
        id: "a-" + Date.now(),
        sender: "assistant",
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: res.mode,
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
