import React, { useEffect, useState } from "react";
import "./loaders.css";

const BOOT_MESSAGES = [
  "Syncing cardiology charts",
  "Loading EECP schedules",
  "Preparing patient records",
];

/**
 * Full-screen Login / Workspace Boot loader featuring the Doctor pushing an ECG cart.
 */
export function BootLoader({ message }: { message?: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % BOOT_MESSAGES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [message]);

  const activeMessage = message || BOOT_MESSAGES[idx];

  return (
    <div
      className="hyh-boot-screen"
      role="status"
      aria-live="polite"
      aria-label={activeMessage}
      data-testid="hyh-boot-loader"
    >
      <div className="hyh-boot-loader">
        <div className="hyh-boot-brand">Heal Your Heart EHR</div>
        <svg viewBox="0 0 240 100" aria-hidden="true">
          <defs>
            <clipPath id="hyh-room">
              <rect width="240" height="100" rx="12" />
            </clipPath>

            {/* Hospital double door with Heart Cardiology sign */}
            <g id="hyh-door">
              <rect x="22" y="12" width="18" height="8" rx="1.5" fill="#fff" />
              <path
                d="M31 18.2l-.4-.36C29.1 16.5 28.2 15.7 28.2 14.7a1.5 1.5 0 0 1 2.8-.7 1.5 1.5 0 0 1 2.8.7c0 1-.9 1.8-2.4 3.14l-.4.36z"
                fill="#B83B4A"
              />
              <rect
                x="14"
                y="22"
                width="34"
                height="66"
                rx="2"
                fill="var(--door)"
                stroke="var(--door-edge)"
                strokeWidth="1.2"
              />
              <line
                x1="31"
                y1="22"
                x2="31"
                y2="88"
                stroke="var(--door-edge)"
                strokeWidth="1.2"
              />
              <rect x="18" y="28" width="9" height="14" rx="1.5" fill="var(--sky)" />
              <rect x="35" y="28" width="9" height="14" rx="1.5" fill="var(--sky)" />
              <rect x="27.5" y="58" width="1.8" height="8" rx=".9" fill="var(--steel)" />
              <rect x="32.7" y="58" width="1.8" height="8" rx=".9" fill="var(--steel)" />
            </g>

            {/* Corridor window */}
            <g id="hyh-win">
              <rect
                x="74"
                y="24"
                width="30"
                height="26"
                rx="2"
                fill="var(--sky)"
                stroke="var(--door-edge)"
                strokeWidth="2.2"
              />
              <path
                d="M89 24V50M74 37H104"
                stroke="var(--door-edge)"
                strokeWidth="1.4"
              />
              <ellipse cx="82" cy="31" rx="5" ry="2.2" fill="#fff" opacity=".7" />
            </g>

            <g id="hyh-lamp">
              <rect
                x="2"
                y="3"
                width="32"
                height="9"
                rx="4"
                fill="var(--lamp-glow)"
                opacity=".5"
              />
              <rect x="6" y="3" width="24" height="4" rx="2" fill="var(--lamp)" />
            </g>
          </defs>

          {/* ===== HOSPITAL CORRIDOR ===== */}
          <g clipPath="url(#hyh-room)">
            <rect width="240" height="88" fill="var(--wall)" />
            <rect y="60" width="240" height="28" fill="var(--wain)" />
            <rect y="0" width="240" height="10" fill="var(--ceil)" />

            <g className="hyh-far">
              <use href="#hyh-door" x="0" />
              <use href="#hyh-door" x="120" />
              <use href="#hyh-door" x="240" />
              <use href="#hyh-win" x="0" />
              <use href="#hyh-win" x="120" />
              <use href="#hyh-win" x="240" />
            </g>

            <rect y="58" width="240" height="3" fill="var(--rail)" />

            <g className="hyh-lights">
              <use href="#hyh-lamp" x="0" />
              <use href="#hyh-lamp" x="48" />
              <use href="#hyh-lamp" x="96" />
              <use href="#hyh-lamp" x="144" />
              <use href="#hyh-lamp" x="192" />
              <use href="#hyh-lamp" x="240" />
              <use href="#hyh-lamp" x="288" />
            </g>

            {/* Floor: clinical tiles, seam, teal guide stripe */}
            <rect y="88" width="240" height="12" fill="var(--floor)" />
            <g className="hyh-tiles" stroke="var(--seam)" strokeWidth="1.2">
              <path d="M0 88V100M24 88V100M48 88V100M72 88V100M96 88V100M120 88V100M144 88V100M168 88V100M192 88V100M216 88V100M240 88V100M264 88V100" />
            </g>
            <line
              x1="0"
              y1="95.5"
              x2="240"
              y2="95.5"
              stroke="var(--guide)"
              strokeWidth="2.4"
              strokeDasharray="20 10"
              className="hyh-stripe"
            />
            <ellipse cx="116" cy="90" rx="74" ry="2.4" fill="var(--shadow)" />
          </g>

          <rect
            x=".6"
            y=".6"
            width="238.8"
            height="98.8"
            rx="11.4"
            fill="none"
            stroke="var(--panel-edge)"
            strokeWidth="1.2"
          />

          {/* ===== GURNEY WITH ECG MACHINE ===== */}
          <g className="hyh-rig">
            {/* IV pole + bag */}
            <line
              x1="165"
              y1="14"
              x2="165"
              y2="62"
              stroke="var(--steel)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M160 14H170"
              stroke="var(--steel)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <g className="hyh-bag">
              <path d="M165 16V19" stroke="var(--steel)" strokeWidth="1.2" />
              <rect
                x="160"
                y="19"
                width="10"
                height="14"
                rx="3"
                fill="#e6f7f6"
                stroke="#7dd3cc"
                strokeWidth="1"
              />
              <rect
                x="161.5"
                y="25"
                width="7"
                height="6.5"
                rx="2"
                fill="#2dd4bf"
                opacity=".65"
              />
            </g>

            {/* Gurney frame */}
            <path
              d="M104 70L104 78M160 70L160 78M104 74H160"
              fill="none"
              stroke="var(--steel)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect
              x="92"
              y="62"
              width="80"
              height="9"
              rx="4.5"
              fill="var(--mattress)"
            />
            <rect
              x="92"
              y="60.5"
              width="80"
              height="3.5"
              rx="1.75"
              fill="#fff"
              opacity=".92"
            />
            <path
              d="M86 57H96V66"
              fill="none"
              stroke="var(--steel)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* ECG machine */}
            <rect
              x="108"
              y="34"
              width="48"
              height="27"
              rx="5"
              fill="var(--machine)"
              stroke="var(--coat-edge)"
              strokeWidth="1.6"
            />
            <rect
              x="112"
              y="38"
              width="28"
              height="17"
              rx="3"
              fill="var(--screen)"
            />
            <path
              d="M114 47H120L122 44L124 50L127 40L129 53L131 47H138"
              fill="none"
              stroke="var(--screen-line)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".25"
            />
            <path
              className="hyh-trace"
              pathLength={100}
              d="M114 47H120L122 44L124 50L127 40L129 53L131 47H138"
              fill="none"
              stroke="var(--screen-line)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="45 55"
            />
            <circle className="hyh-pulse" cx="136" cy="41" r="1.6" fill="#f43f5e" />
            <circle className="hyh-knob" cx="149" cy="44" r="3" fill="#B83B4A" />
            <circle cx="149" cy="53" r="2.2" fill="#94a3b8" />
            <rect x="155" y="50" width="2.2" height="8" rx="1" fill="#475569" />

            {/* Fluttering ECG strip */}
            <g className="hyh-flag">
              <rect
                x="157"
                y="51"
                width="17"
                height="8"
                rx="1"
                fill="var(--paper)"
                stroke="#e5aeb0"
                strokeWidth=".8"
              />
              <path
                d="M159 56H163L165 52L167 59L170 56H173"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Teal/Crimson telemetry beacon */}
            <circle className="hyh-halo" cx="132" cy="29" r="9" />
            <rect
              x="128"
              y="31"
              width="8"
              height="3.2"
              rx="1"
              fill="var(--steel)"
            />
            <path className="hyh-dome" d="M128.5 31a3.5 3.5 0 0 1 7 0Z" fill="#B83B4A" />

            {/* Wheels */}
            <g className="hyh-wheel-a">
              <circle cx="104" cy="83" r="5" fill="#334155" />
              <circle cx="104" cy="83" r="1.9" fill="#e2e8f0" />
              <path
                d="M104 78.5V87.5M99.5 83H108.5"
                stroke="#94a3b8"
                strokeWidth="1"
              />
            </g>
            <g className="hyh-wheel-b">
              <circle cx="160" cy="83" r="5" fill="#334155" />
              <circle cx="160" cy="83" r="1.9" fill="#e2e8f0" />
              <path
                d="M160 78.5V87.5M155.5 83H164.5"
                stroke="#94a3b8"
                strokeWidth="1"
              />
            </g>
          </g>

          {/* ===== DOCTOR (pushing from behind) ===== */}
          <g className="hyh-bob">
            <g className="hyh-leg hyh-back">
              <path
                d="M56 64L49 75L45 85"
                fill="none"
                stroke="#334155"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse
                cx="46.5"
                cy="85.5"
                rx="5"
                ry="2.4"
                fill="#fff"
                stroke="#0B6E75"
                strokeWidth="1"
              />
            </g>
            <g className="hyh-tail">
              <path
                d="M52 50L41 66L54 67L60 55Z"
                fill="var(--coat)"
                stroke="var(--coat-edge)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
            <g className="hyh-leg">
              <path
                d="M56 64L61 75L57 85"
                fill="none"
                stroke="#1e293b"
                strokeWidth="5.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <ellipse
                cx="59"
                cy="85.5"
                rx="5.2"
                ry="2.4"
                fill="#fff"
                stroke="#0B6E75"
                strokeWidth="1"
              />
            </g>

            {/* Neck connecting head to coat */}
            <rect x="57" y="33" width="5.5" height="6" rx="2.5" fill="var(--skin)" />

            {/* Torso + white lab coat + teal scrub collar */}
            <g transform="rotate(10 56 50)">
              <rect
                x="49"
                y="37"
                width="15"
                height="27"
                rx="7"
                fill="var(--coat)"
                stroke="var(--coat-edge)"
                strokeWidth="1.6"
              />
              <polygon points="53.5,37 60.5,37 57.2,44.5" fill="var(--scrub)" />
              <path
                d="M53.5 37L55.8 43M60.5 37L58.4 43"
                fill="none"
                stroke="var(--coat-edge)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <rect x="59.2" y="47.5" width="3.8" height="4.8" rx="1" fill="var(--scrub)" />
            </g>

            {/* Stethoscope */}
            <path
              d="M55.5 37.5Q56 46 60.5 48.2"
              fill="none"
              stroke="#334155"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle
              cx="60.5"
              cy="48.2"
              r="2"
              fill="#e2e8f0"
              stroke="#334155"
              strokeWidth="1.1"
            />

            {/* Head, clean hair (no ear), sleek glasses, surgical mask */}
            <circle cx="62" cy="27.5" r="8" fill="var(--skin)" />
            <path
              d="M53.6 29.5C52.8 18.5 64.5 16.5 70.2 21.8C70.8 22.8 70.6 24.4 69.2 24.6C66.2 21.8 61 21.6 58.2 24.4C56.8 25.8 56.2 28.2 55.6 31.2Z"
              fill="var(--hair)"
            />
            <path
              d="M61.8 30.2L70.2 29.2Q70.4 34.4 65.8 36.2Q61.8 35.1 61.3 31.3Z"
              fill="#e6f4f3"
              stroke="#9fc7c3"
              strokeWidth=".85"
              strokeLinejoin="round"
            />
            <line
              x1="60.2"
              y1="26"
              x2="64.2"
              y2="26"
              stroke="#1e293b"
              strokeWidth=".9"
              strokeLinecap="round"
            />
            <rect
              x="64.2"
              y="24.2"
              width="5.2"
              height="3.6"
              rx="1.4"
              fill="#fff"
              fillOpacity=".22"
              stroke="#1e293b"
              strokeWidth=".95"
            />
            <circle cx="67.1" cy="26" r=".95" fill="#0f172a" />
            <path
              d="M64.6 22.9Q67.1 22.1 69.1 23.1"
              fill="none"
              stroke="#0f172a"
              strokeWidth=".85"
              strokeLinecap="round"
            />

            {/* Arm to push bar */}
            <path
              d="M59 42L75 52L89 57"
              fill="none"
              stroke="var(--coat-edge)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M59 42L75 52L89 57"
              fill="none"
              stroke="var(--coat)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="89.8" cy="57" r="2.4" fill="var(--skin)" />
          </g>
        </svg>

        <div className="hyh-boot-status">
          {activeMessage}
          <span className="hyh-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Calm in-app Live ECG Trace loader for patient charts, clinical modules, and tables.
 */
export function LiveEcgLoader({ label = "Loading clinical view…" }: { label?: string }) {
  return (
    <div
      className="hyh-ecg-loader"
      role="status"
      aria-live="polite"
      data-testid="hyh-ecg-loader"
    >
      <svg className="hyh-ecg-svg" viewBox="0 0 170 54" aria-hidden="true">
        <path
          className="hyh-ecg-ghost"
          d="M4 30 H34 L40 22 L46 30 H58 L63 37 L69 8 L75 45 L80 30 H94 L101 21 L108 30 H166"
        />
        <path
          className="hyh-ecg-line"
          d="M4 30 H34 L40 22 L46 30 H58 L63 37 L69 8 L75 45 L80 30 H94 L101 21 L108 30 H166"
        />
      </svg>
      <span className="hyh-ecg-label">{label}</span>
    </div>
  );
}
