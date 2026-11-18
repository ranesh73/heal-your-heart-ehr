import React from "react";

export function HeroRibbonBackground() {
  return (
    <div
      data-testid="hero-ribbon-background"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ribbonEntrance {
          0% {
            opacity: 0;
            transform: translate3d(35px, 25px, 0) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes ribbonEntranceSecondary {
          0% {
            opacity: 0;
            transform: translate3d(-25px, 35px, 0) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        @keyframes ribbonContinuousFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-6px, -10px, 0);
          }
        }
        @keyframes ribbonContinuousFloatSecondary {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(8px, -6px, 0);
          }
        }
        .hyh-ribbon-layer-primary {
          animation: ribbonEntrance 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .hyh-ribbon-layer-secondary {
          animation: ribbonEntranceSecondary 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
        }
        .hyh-ribbon-float-group {
          animation: ribbonContinuousFloat 14s ease-in-out infinite alternate;
          transform-origin: 65% 75%;
        }
        .hyh-ribbon-float-secondary {
          animation: ribbonContinuousFloatSecondary 18s ease-in-out infinite alternate;
          transform-origin: 50% 85%;
        }
        @media (prefers-reduced-motion: reduce) {
          .hyh-ribbon-layer-primary,
          .hyh-ribbon-layer-secondary,
          .hyh-ribbon-float-group,
          .hyh-ribbon-float-secondary {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients using the Heal Your Heart brand palette */}
          <linearGradient id="hyhRibbonDeepGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EFFFFA" stopOpacity="0.2" />
            <stop offset="40%" stopColor="#BDEFE3" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#087F75" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#087F75" stopOpacity="0.28" />
          </linearGradient>

          <linearGradient id="hyhRibbonMidGrad" x1="0%" y1="80%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#EFFFFA" stopOpacity="0.3" />
            <stop offset="45%" stopColor="#BDEFE3" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#0D9488" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#087F75" stopOpacity="0.38" />
          </linearGradient>

          <linearGradient id="hyhRibbonLightGrad" x1="0%" y1="90%" x2="100%" y2="10%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="35%" stopColor="#EFFFFA" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#BDEFE3" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.22" />
          </linearGradient>

          <linearGradient id="hyhRibbonCrestGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#BDEFE3" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="hyhRibbonShadowGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#087F75" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#087F75" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Layer 1: Broad Deep Ribbon (Lower Base Wave) */}
        <g className="hyh-ribbon-layer-secondary hyh-ribbon-float-secondary">
          <path
            d="M -50 560 C 280 690, 680 820, 1020 660 C 1220 560, 1370 410, 1490 260 L 1490 920 L -50 920 Z"
            fill="url(#hyhRibbonDeepGrad)"
          />
          {/* Soft shadow ridge */}
          <path
            d="M 120 620 C 460 740, 800 810, 1100 660 C 1260 580, 1380 460, 1490 320 L 1490 360 C 1370 510, 1240 630, 1070 700 C 780 830, 440 760, 120 640 Z"
            fill="url(#hyhRibbonShadowGrad)"
          />
        </g>

        {/* Layer 2: Main Flowing Ribbon (Middle Concentric Layer) */}
        <g className="hyh-ribbon-layer-primary hyh-ribbon-float-group">
          <path
            d="M -30 460 C 340 590, 720 700, 1080 540 C 1260 450, 1380 300, 1480 140 L 1480 340 C 1380 500, 1220 640, 1020 720 C 690 840, 320 760, -30 600 Z"
            fill="url(#hyhRibbonMidGrad)"
          />
          
          {/* Layer 3: Foreground Accent Ribbon with Crisp Crest */}
          <path
            d="M -20 495 C 330 625, 710 715, 1060 570 C 1220 490, 1340 370, 1460 215 L 1460 255 C 1340 405, 1200 535, 1040 610 C 710 755, 330 670, -20 535 Z"
            fill="url(#hyhRibbonLightGrad)"
          />

          {/* Elegant White & Soft-Mint Specular Highlight Crest Line */}
          <path
            d="M -30 460 C 340 590, 720 700, 1080 540 C 1260 450, 1380 300, 1480 140"
            stroke="url(#hyhRibbonCrestGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Secondary Sub-Crest Trace Line */}
          <path
            d="M 180 550 C 480 670, 800 715, 1120 555 C 1270 475, 1370 355, 1470 205"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Tertiary Delicate Flow Trace Line */}
          <path
            d="M 400 645 C 680 735, 960 705, 1220 550 C 1320 480, 1390 410, 1460 325"
            stroke="rgba(189, 239, 227, 0.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
