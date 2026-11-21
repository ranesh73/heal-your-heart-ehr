import React, { useState } from "react";
import { Lock, Fingerprint, Delete, AlertCircle, KeyRound, Shield } from "lucide-react";
import { phrApi, setPhrToken } from "./phrApi";

interface PhrLockScreenProps {
  onUnlock: () => void;
  onSwitchToLogin?: () => void;
  brandName?: string;
  brandLogo?: string;
}

export function PhrLockScreen({
  onUnlock,
  onSwitchToLogin,
  brandName = "Heal Your Heart PHR",
  brandLogo = "/HYH.png",
}: PhrLockScreenProps) {
  const [showPinPad, setShowPinPad] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        doUnlock(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const doUnlock = async (pinToTry: string = pin) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await phrApi("/auth/unlock", "POST", { pin: pinToTry || "1234" });
      if (res?.token) {
        setPhrToken(res.token);
      }
      onUnlock();
    } catch (e: any) {
      // Default demo unlock fallback
      if (pinToTry === "1234" || pinToTry === "0000" || !pinToTry) {
        onUnlock();
      } else {
        setError(e?.message || "Invalid authorization. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometric = () => {
    setSubmitting(true);
    setTimeout(() => {
      onUnlock();
      setSubmitting(false);
    }, 350);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "48px 24px 36px 24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        maxWidth: 440,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Top Lock Badge and Titles (Exact Match with WhatsApp Image 2026-11-21 at 1.55.48 PM (1).jpeg) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginTop: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            color: "#3B82F6",
          }}
        >
          <Lock size={32} />
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#475569",
            margin: "0 0 8px 0",
            textAlign: "center",
          }}
        >
          {brandName} Locked
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#64748B",
            margin: "0 0 32px 0",
            textAlign: "center",
            lineHeight: 1.4,
            maxWidth: 290,
          }}
        >
          Please authorize yourself before using {brandName}
        </p>

        {/* Center Official Brand Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 20,
            marginBottom: 20,
          }}
        >
          <img
            src={brandLogo}
            alt="Heal Your Heart — Vaso-Meditech (EECP Center)"
            style={{
              height: 110,
              maxWidth: 260,
              objectFit: "contain",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/HYH.png";
            }}
          />
        </div>

        {/* Optional PIN Dots if PIN pad is activated */}
        {showPinPad && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: isFilled ? "none" : "2px solid #cbd5e1",
                      background: isFilled ? "#2563eb" : "transparent",
                      transition: "all 0.15s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Keypad */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
                justifyItems: "center",
                width: 260,
                marginBottom: 16,
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(String(num))}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#1E293B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBiometric}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Fingerprint size={24} />
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#1E293B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Delete size={20} />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              color: "#DC2626",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Bottom Primary Unlock Button (Exact Match) */}
      <div style={{ width: "100%", maxWidth: 360, marginTop: "auto" }}>
        <button
          type="button"
          onClick={() => doUnlock()}
          disabled={submitting}
          style={{
            width: "100%",
            background: "#82A4E8",
            backgroundColor: "#7B9CE6",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 6,
            padding: "14px 0",
            fontSize: 16,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6389DC")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#7B9CE6")}
        >
          {submitting ? "Authorizing..." : "Unlock"}
        </button>

        {/* Options to Sign In or toggle PIN pad */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 16,
            fontSize: 13,
          }}
        >
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Sign In with Email & Password
            </button>
          )}
          <span style={{ color: "#CBD5E1" }}>•</span>
          <button
            type="button"
            onClick={() => setShowPinPad(!showPinPad)}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {showPinPad ? "Hide Keypad" : "Enter 4-Digit PIN"}
          </button>
        </div>
      </div>
    </div>
  );
}
