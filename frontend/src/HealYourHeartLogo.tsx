import React from "react";
import { navigate } from "./api";

interface LogoProps {
  size?: "sm" | "nav" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  clickable?: boolean;
  className?: string;
  variant?: "horizontal" | "stacked" | "full-brand";
}

export function HealYourHeartLogo({
  size = "md",
  showWordmark = true,
  clickable = true,
  className = "",
  variant = "horizontal",
}: LogoProps) {
  const heights = {
    sm: 32,
    nav: 38,
    md: 52,
    lg: 72,
    xl: 96,
  };

  const fontSizes = {
    sm: 16,
    nav: 19,
    md: 24,
    lg: 32,
    xl: 40,
  };

  const subSizes = {
    sm: 9,
    nav: 10,
    md: 11,
    lg: 13,
    xl: 15,
  };

  const h = heights[size];
  const fs = fontSizes[size];
  const ss = subSizes[size];

  const handleClick = (e: React.MouseEvent) => {
    if (clickable) {
      e.preventDefault();
      navigate("/");
    }
  };

  if (variant === "full-brand") {
    // Official single-piece brand lockup with EHR suffix
    return (
      <div
        className={`hyh-logo-container ${clickable ? "clickable" : ""} ${className}`}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: clickable ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/images/hyh_emblem.png"
            alt="Heal Your Heart EHR Logo"
            style={{
              height: h,
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
          <span
            style={{
              fontSize: fs * 1.1,
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#0d9488",
              backgroundColor: "#f0fdfa",
              border: "2px solid #0d9488",
              padding: "2px 10px",
              borderRadius: 8,
              lineHeight: 1,
            }}
          >
            EHR
          </span>
        </div>
        <div
          style={{
            fontSize: ss,
            fontWeight: 600,
            color: "#64748b",
            marginTop: 4,
            letterSpacing: "0.04em",
          }}
        >
          Cardiovascular Care &amp; EECP Management Platform
        </div>
      </div>
    );
  }

  return (
    <div
      className={`hyh-logo-lockup ${clickable ? "clickable" : ""} ${className}`}
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" || size === "nav" ? 8 : 14,
        cursor: clickable ? "pointer" : "default",
        userSelect: "none",
        textDecoration: "none",
      }}
    >
      <img
        src="/images/hyh_emblem.png"
        alt="Heal Your Heart Logo"
        style={{
          height: h,
          width: "auto",
          objectFit: "contain",
          display: "block",
          maxHeight: "100%",
        }}
      />
      {showWordmark && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Single line wordmark: Heal Your Heart EHR */}
          <div
            style={{
              fontSize: fs,
              fontWeight: 800,
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "#0d9488" }}>Heal Your</span>
            <span style={{ color: "#d8312e" }}>Heart</span>
            <span
              style={{
                color: "#0f766e",
                fontWeight: 900,
                letterSpacing: "0.05em",
                backgroundColor: "#ccfbf1",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: Math.round(fs * 0.78),
                marginLeft: 4,
              }}
            >
              EHR
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
