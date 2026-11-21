import React, { useState, useEffect } from "react";
import { X, Send, User, AlertCircle, Clock } from "lucide-react";
import { phrApi } from "./phrApi";

interface PhrMessagesModalProps {
  onClose: () => void;
  charLimit?: number;
}

interface MessageItem {
  id: string;
  sender_type: "patient" | "practice";
  sender_name: string;
  body: string;
  created_at: string;
}

export function PhrMessagesModal({ onClose, charLimit = 500 }: PhrMessagesModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    try {
      const res = await phrApi("/messages");
      if (res?.messages) {
        setMessages(res.messages);
      }
    } catch (e: any) {
      console.error("Failed to load messages", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (newMessage.length > charLimit) {
      setError(`Message exceeds limit of ${charLimit} characters.`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await phrApi("/messages", "POST", {
        body: newMessage.trim(),
        recipient_role: "Doctor",
      });
      if (res?.sent) {
        setMessages((prev) => [...prev, res.sent]);
        setNewMessage("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

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
              Secure Doctor Messages
            </h2>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              Heal Your Heart Cardiology & EECP Care Team
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

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 20, color: "#94a3b8", fontSize: 13 }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                No messages yet
              </div>
              <div style={{ fontSize: 12 }}>
                Send a question to Dr. Prem Sekar or your EECP therapist below.
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isPatient = m.sender_type === "patient";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isPatient ? "flex-end" : "flex-start",
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isPatient ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3, padding: "0 4px" }}>
                    {isPatient ? "You" : m.sender_name || "Cardiology Team"}
                  </div>
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: 14,
                    borderBottomRightRadius: isPatient ? 2 : 14,
                    borderBottomLeftRadius: isPatient ? 14 : 2,
                    background: isPatient ? "#2563eb" : "#f1f5f9",
                    color: isPatient ? "#ffffff" : "#1e293b",
                    fontSize: 13,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, padding: "0 4px" }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: "#dc2626", fontSize: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* Input & Countdown */}
        <form onSubmit={handleSend} style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
            <span>Secure encryption active</span>
            <span style={{ color: newMessage.length > charLimit ? "#dc2626" : "#64748b" }}>
              {newMessage.length} / {charLimit} chars
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message to the clinic..."
              maxLength={charLimit}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                resize: "none",
              }}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              style={{
                background: newMessage.trim() ? "#2563eb" : "#94a3b8",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: newMessage.trim() ? "pointer" : "default",
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
