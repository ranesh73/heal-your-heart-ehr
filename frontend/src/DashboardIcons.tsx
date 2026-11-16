import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

// Heal Your Heart EHR Brand Logo Emblem
export function HealYourHeartLogo({ size = 26, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 26.5 C16 26.5 4.5 19 4.5 11.5 C4.5 7.2 8 3.8 12.3 3.8 C14.6 3.8 15.6 4.8 16 5.8 C16.4 4.8 17.4 3.8 19.7 3.8 C24 3.8 27.5 7.2 27.5 11.5 C27.5 19 16 26.5 16 26.5 Z"
        stroke="#0f766e"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9 14.5 L12.5 14.5 L14.5 10.5 L17.5 18.5 L19.5 13 L21 14.5 L23 14.5"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PatientsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Secondary Back User (Coral Red) */}
  <g filter="url(#coral-shadow)">
    {/* Head */}
    <circle cx="81" cy="46" r="13" fill="url(#coral-sphere)" />
    {/* Torso */}
    <path d="M 66 69 C 72 65 79 65 85 68 C 95 73 99 82 99 93 C 99 95.5 97 97 94 97 L 72 97" fill="url(#coral-body)" />
    {/* Highlight on shoulder */}
    <path d="M 74 72 C 80 69 88 71 94 77" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
  </g>

  {/* Primary Foreground User (Teal) */}
  <g filter="url(#elem-shadow)">
    {/* Head */}
    <circle cx="50" cy="42" r="16.5" fill="url(#teal-sphere)" />
    {/* Torso */}
    <path d="M 23 93 C 23 71 35 63 50 63 C 65 63 77 71 77 93 C 77 96 74.5 97.5 71 97.5 L 29 97.5 C 25.5 97.5 23 96 23 93 Z" fill="url(#teal-vert)" />
    {/* Chest 3D Specular Arc */}
    <path d="M 32 89 C 33 75 40 69 50 69 C 60 69 67 75 68 89" stroke="rgba(255,255,255,0.38)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function CalendarIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Top Binder Rings */}
  <g filter="url(#elem-shadow)">
    <rect x="39" y="17" width="8" height="20" rx="4" fill="url(#teal-cyl)" />
    <rect x="41" y="19" width="2.5" height="15" rx="1.2" fill="rgba(255,255,255,0.6)" />

    <rect x="81" y="17" width="8" height="20" rx="4" fill="url(#teal-cyl)" />
    <rect x="83" y="19" width="2.5" height="15" rx="1.2" fill="rgba(255,255,255,0.6)" />
  </g>

  {/* Calendar Body */}
  <g filter="url(#elem-shadow)">
    {/* Main Outer Tablet */}
    <rect x="23" y="27" width="82" height="74" rx="16" fill="url(#teal-body)" />
    <path d="M 27 30 L 101 30" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />

    {/* Calendar Paper Sheet */}
    <rect x="29" y="44" width="70" height="51" rx="9" fill="#ffffff" />
    <rect x="29" y="44" width="70" height="4" fill="#f0fdfa" />

    {/* Grid of Dates - Row 1 */}
    <rect x="37" y="52" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    <rect x="52" y="52" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    <rect x="67" y="52" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    {/* Active Date Block (Coral Red) */}
    <rect x="80" y="51" width="12" height="12" rx="3" fill="url(#coral-body)" filter="url(#coral-shadow)" />
    <rect x="82" y="52.5" width="4" height="2" rx="1" fill="rgba(255,255,255,0.6)" />

    {/* Grid of Dates - Row 2 */}
    <rect x="37" y="68" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    <rect x="52" y="68" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    <rect x="67" y="68" width="10" height="10" rx="2.5" fill="url(#teal-body)" />
    <rect x="81" y="68" width="10" height="10" rx="2.5" fill="url(#teal-body)" />

    {/* Grid of Dates - Row 3 Dots/Mini */}
    <circle cx="42" cy="86" r="2.2" fill="#0d9488" opacity="0.6" />
    <circle cx="57" cy="86" r="2.2" fill="#0d9488" opacity="0.6" />
    <circle cx="72" cy="86" r="2.2" fill="#0d9488" opacity="0.6" />
    <circle cx="86" cy="86" r="2.2" fill="#0d9488" opacity="0.6" />
  </g>


    </svg>
  );
}
export function ChartNotesIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Stethoscope Binaural Tubes and Chestpiece */}
  <g filter="url(#elem-shadow)">
    {/* Headset Ear Tubes */}
    <path d="M 39 31 C 39 46 45 54 53 54 C 61 54 67 46 67 31" fill="none" stroke="url(#teal-cyl)" strokeWidth="6.5" strokeLinecap="round" />
    {/* Lower Looping Flexible Tube */}
    <path d="M 53 54 L 53 66 C 53 82 66 89 78 89 C 89 89 95 81 95 72" fill="none" stroke="url(#teal-cyl)" strokeWidth="6.2" strokeLinecap="round" />
    {/* Tube Highlight */}
    <path d="M 53 58 L 53 66 C 53 80 66 87 77 87" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" />
  </g>

  {/* Earpieces (Coral Red) */}
  <g filter="url(#coral-shadow)">
    <circle cx="39" cy="27" r="5.5" fill="url(#coral-sphere)" />
    <circle cx="67" cy="27" r="5.5" fill="url(#coral-sphere)" />
  </g>

  {/* Diaphragm / Chestpiece Ring (Coral Red) */}
  <g filter="url(#coral-shadow)">
    {/* Outer Beveled Ring */}
    <circle cx="95" cy="62" r="14" fill="url(#coral-body)" />
    {/* Metallic Inner Groove */}
    <circle cx="95" cy="62" r="11" fill="url(#coral-sphere)" />
    {/* White Center Aperture */}
    <circle cx="95" cy="62" r="6" fill="#ffffff" />
    {/* Specular Highlight */}
    <path d="M 88 56 C 92 51 98 51 102 56" stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function LabsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Erlenmeyer Flask Glass Container Background */}
  <g filter="url(#elem-shadow)">
    {/* Glass Flask Walls */}
    <path d="M 57 28 L 57 44 L 32 88 C 29 93 32.5 98 38 98 L 90 98 C 95.5 98 99 93 96 88 L 71 44 L 71 28" fill="#f0fdfa" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" strokeLinecap="round" />
  </g>

  {/* Bubbling Coral Red Fluid (Rich Vibrant Saturated Red) */}
  <g filter="url(#coral-shadow)">
    <path d="M 37.5 86 L 41 80 C 47 75 53 82 60 77 C 67 72 74 79 81 75 L 90.5 86 C 93 89.5 90.5 94 86 94 L 42 94 C 37.5 94 35 89.5 37.5 86 Z" fill="url(#coral-body)" />
    {/* Meniscus Highlight Wave */}
    <path d="M 42 79 C 48 75 54 81 60 76 C 66 72 73 78 80 75" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" />
  </g>

  {/* Fluid Bubbles */}
  <circle cx="50" cy="85" r="4.2" fill="#ffffff" opacity="0.95" filter="url(#glow-bubble)" />
  <circle cx="73" cy="86" r="3.6" fill="#ffffff" opacity="0.95" filter="url(#glow-bubble)" />
  <circle cx="63" cy="74" r="3" fill="#ffffff" opacity="0.95" />
  <circle cx="56" cy="62" r="3" fill="url(#coral-sphere)" />
  <circle cx="68" cy="51" r="2.5" fill="url(#coral-sphere)" />

  {/* Top Lip (Drawn over neck to cap cleanly) */}
  <g filter="url(#elem-shadow)">
    <rect x="52" y="24" width="24" height="6.5" rx="3.2" fill="url(#teal-body)" />
    <rect x="54" y="25.5" width="20" height="2" rx="1" fill="rgba(255,255,255,0.6)" />
  </g>

  {/* Left Wall Glass Reflection */}
  <path d="M 37 84 L 56 50 L 56 36" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />


    </svg>
  );
}
export function ImagesIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* 3D Picture / Radiology Frame */}
  <g filter="url(#elem-shadow)">
    {/* Outer Teal Frame */}
    <rect x="23" y="27" width="82" height="74" rx="18" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="7.5" />
    {/* Inner Frame Highlight */}
    <rect x="28" y="32" width="72" height="64" rx="12" fill="#f0fdfa" />
  </g>

  {/* Radiant Coral Red Sun Sphere */}
  <g filter="url(#coral-shadow)">
    <circle cx="82" cy="45" r="9.5" fill="url(#coral-sphere)" />
  </g>

  {/* 3D Mountain Peaks (Teal) */}
  <g filter="url(#elem-shadow)">
    {/* Left Major Mountain Peak */}
    <path d="M 28 88 L 54 51 L 80 88 Z" fill="url(#teal-vert)" />
    {/* Peak Highlight on Left Slope */}
    <path d="M 29 88 L 54 51" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" />

    {/* Right Secondary Mountain Peak */}
    <path d="M 64 88 L 80 62 L 98 88 Z" fill="url(#teal-body)" opacity="0.9" />
    <path d="M 65 88 L 80 62" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function DocumentsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Document Page with Folded Dog-Ear */}
  <g filter="url(#elem-shadow)">
    {/* Sheet Body */}
    <path d="M 31 23 L 75 23 L 97 45 L 97 97 C 97 101.5 93.5 105 89 105 L 31 105 C 26.5 105 23 101.5 23 97 L 23 31 C 23 26.5 26.5 23 31 23 Z" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" />

    {/* Dog-Ear Fold */}
    <path d="M 75 23 L 75 45 L 97 45 Z" fill="#e6f6f2" stroke="url(#teal-body)" strokeWidth="5" strokeLinejoin="round" />
    <path d="M 73 47 L 95 47" stroke="rgba(15,118,110,0.18)" strokeWidth="2" />
  </g>

  {/* Document Text Lines */}
  <g filter="url(#elem-shadow)">
    {/* Header Line (Teal) */}
    <rect x="36" y="52" width="22" height="7" rx="3.5" fill="url(#teal-cyl)" />
  </g>

  <g filter="url(#coral-shadow)">
    {/* Clinical Data Line 1 (Coral Red) */}
    <rect x="36" y="68" width="48" height="7.5" rx="3.75" fill="url(#coral-cyl)" />
    <rect x="38" y="69.5" width="24" height="2" rx="1" fill="rgba(255,255,255,0.5)" />

    {/* Clinical Data Line 2 (Coral Red) */}
    <rect x="36" y="84" width="48" height="7.5" rx="3.75" fill="url(#coral-cyl)" />
    <rect x="38" y="85.5" width="24" height="2" rx="1" fill="rgba(255,255,255,0.5)" />
  </g>


    </svg>
  );
}
export function InjectionsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* 45-degree Angled Syringe (Needle at bottom-left, Plunger at top-right) */}
  <g transform="rotate(45 64 64)">
    {/* Stainless Steel Needle Point (facing bottom-left in rotated frame) */}
    <line x1="64" y1="102" x2="64" y2="120" stroke="#94a3b8" strokeWidth="3.2" strokeLinecap="round" />

    {/* Syringe Hub Nozzle */}
    <g filter="url(#elem-shadow)">
      <rect x="59.5" y="95" width="9" height="7.5" rx="2" fill="url(#teal-body)" />
    </g>

    {/* Syringe Barrel Body */}
    <g filter="url(#elem-shadow)">
      <rect x="51" y="44" width="26" height="52" rx="4" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="5.5" />
      {/* Finger Flange Middle Collar */}
      <rect x="44" y="42" width="40" height="6.5" rx="3" fill="url(#teal-body)" />
    </g>

    {/* Coral Red Vaccine / Medicine Fluid */}
    <g filter="url(#coral-shadow)">
      <rect x="54.5" y="64" width="19" height="30" rx="2" fill="url(#coral-body)" />
      {/* Liquid Graduation Steps */}
      <path d="M 54.5 72 L 61 72 M 54.5 80 L 61 80 M 54.5 88 L 61 88" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 68 67 L 71 67" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Plunger Rod and Thumb Cap */}
    <g filter="url(#elem-shadow)">
      <rect x="61" y="21" width="6" height="23" fill="url(#teal-cyl)" />
      {/* Thumb Rest Cap */}
      <rect x="49" y="17" width="30" height="7" rx="3.5" fill="url(#teal-body)" />
      <rect x="51" y="18.5" width="26" height="2" rx="1" fill="rgba(255,255,255,0.6)" />
    </g>

    {/* Barrel Glass Highlight */}
    <line x1="53.5" y1="46" x2="53.5" y2="94" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function ReferralsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Left User Bust (Teal) */}
  <g filter="url(#elem-shadow)">
    <circle cx="43" cy="50" r="10" fill="url(#teal-sphere)" />
    <path d="M 27 77 C 27 65 34 61 43 61 C 52 61 59 65 59 77 Z" fill="url(#teal-vert)" />
    <path d="M 32 75 C 33 67 38 64 43 64 C 48 64 53 67 54 75" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </g>

  {/* Right User Bust (Teal) */}
  <g filter="url(#elem-shadow)">
    <circle cx="85" cy="50" r="10" fill="url(#teal-sphere)" />
    <path d="M 69 77 C 69 65 76 61 85 61 C 94 61 101 65 101 77 Z" fill="url(#teal-vert)" />
    <path d="M 74 75 C 75 67 80 64 85 64 C 90 64 95 67 96 75" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </g>

  {/* Top Curved Referral Arrow (Coral Red, Points Right) */}
  <g filter="url(#coral-shadow)">
    <path d="M 42 34 C 49 23 75 23 83 29" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M 76 21 L 91 30 L 78 40 Z" fill="url(#coral-body)" />
  </g>

  {/* Bottom Curved Referral Arrow (Coral Red, Points Left) */}
  <g filter="url(#coral-shadow)">
    <path d="M 86 91 C 79 102 53 102 45 96" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M 52 104 L 37 95 L 50 85 Z" fill="url(#coral-body)" />
  </g>


    </svg>
  );
}
export function MessagesIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Postal Mail Envelope Body */}
  <g filter="url(#elem-shadow)">
    <rect x="23" y="38" width="82" height="57" rx="11" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" />
  </g>

  {/* Open Coral Red Envelope Flap (Top Triangular Accent) */}
  <g filter="url(#coral-shadow)">
    <path d="M 28 42 L 64 17 L 100 42 Z" fill="url(#coral-body)" stroke="url(#coral-body)" strokeWidth="2" strokeLinejoin="round" />
    {/* Flap Bevel Highlight */}
    <path d="M 33 40 L 64 21 L 95 40" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </g>

  {/* Front V-Seams (Teal) */}
  <g filter="url(#elem-shadow)">
    <path d="M 25 41 L 64 70 L 103 41" fill="none" stroke="url(#teal-body)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="26" y1="92" x2="52" y2="62" stroke="url(#teal-body)" strokeWidth="4.5" strokeLinecap="round" />
    <line x1="102" y1="92" x2="76" y2="62" stroke="url(#teal-body)" strokeWidth="4.5" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function ChannelsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Central Telehealth Antenna Mast (Teal) */}
  <g filter="url(#elem-shadow)">
    {/* Base Plate */}
    <rect x="53" y="93" width="22" height="7" rx="3.5" fill="url(#teal-body)" />
    {/* Tapered Mast Column */}
    <path d="M 59 93 L 61.5 48 L 66.5 48 L 69 93 Z" fill="url(#teal-cyl)" />
    {/* Mast Vertical Highlight */}
    <line x1="63.5" y1="52" x2="63.5" y2="92" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" />

    {/* Top Transmitter Sphere */}
    <circle cx="64" cy="45" r="10" fill="url(#teal-sphere)" />
  </g>

  {/* Coral Red Broadcast Signal Waves */}
  <g filter="url(#coral-shadow)">
    {/* Left Inner Arc */}
    <path d="M 48 33 C 41 40 41 50 48 57" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />
    {/* Left Outer Arc */}
    <path d="M 36 23 C 24 35 24 55 36 67" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />

    {/* Right Inner Arc */}
    <path d="M 80 33 C 87 40 87 50 80 57" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />
    {/* Right Outer Arc */}
    <path d="M 92 23 C 104 35 104 55 92 67" fill="none" stroke="url(#coral-cyl)" strokeWidth="5.5" strokeLinecap="round" />
  </g>


    </svg>
  );
}
export function TasksIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Checkbox Frame (Teal with Top-Right Dynamic Gap) */}
  <g filter="url(#elem-shadow)">
    {/* Rounded Square Outline with Gap */}
    <path d="M 86 36 L 43 36 C 34 36 27 43 27 52 L 27 82 C 27 91 34 98 43 98 L 82 98 C 91 98 98 91 98 82 L 98 52 C 98 50 97.5 48 97 46" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
  </g>

  {/* 3D Coral Red Checkmark */}
  <g filter="url(#coral-shadow)">
    <path d="M 41 64 L 56 79 L 89 42" fill="none" stroke="url(#coral-cyl)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    {/* Specular Ridge Along Spine */}
    <path d="M 41 63 L 56 78 L 89 41" fill="none" stroke="rgba(255,255,255,0.48)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </g>


    </svg>
  );
}
export function BillingIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* Left Teal Coin Stack */}
  <g filter="url(#elem-shadow)">
    {/* Coin 3 (Bottom) */}
    <path d="M 23 74 L 23 85 C 23 90.5 33.5 94 46.5 94 C 59.5 94 70 90.5 70 85 L 70 74 Z" fill="url(#teal-cyl)" />
    <ellipse cx="46.5" cy="74" rx="23.5" ry="8.5" fill="#2dd4bf" stroke="url(#teal-body)" strokeWidth="1.8" />

    {/* Coin 2 (Middle) */}
    <path d="M 23 58 L 23 69 C 23 74.5 33.5 78 46.5 78 C 59.5 78 70 74.5 70 69 L 70 58 Z" fill="url(#teal-cyl)" />
    <ellipse cx="46.5" cy="58" rx="23.5" ry="8.5" fill="#5eead4" stroke="url(#teal-body)" strokeWidth="1.8" />

    {/* Coin 1 (Top) */}
    <path d="M 23 42 L 23 53 C 23 58.5 33.5 62 46.5 62 C 59.5 62 70 58.5 70 53 L 70 42 Z" fill="url(#teal-cyl)" />
    <ellipse cx="46.5" cy="42" rx="23.5" ry="8.5" fill="#99f6e4" stroke="url(#teal-body)" strokeWidth="2" />
  </g>

  {/* Foreground Coral Red Dollar Coin */}
  <g filter="url(#coral-shadow)">
    {/* Outer Beveled Edge */}
    <circle cx="82" cy="72" r="23" fill="url(#coral-sphere)" stroke="#ffffff" strokeWidth="1.8" />
    {/* Inner Coin Recess */}
    <circle cx="82" cy="72" r="19.5" fill="url(#coral-body)" />
    <circle cx="82" cy="72" r="19.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />

    {/* Embossed Dollar Sign */}
    <text x="82" y="80.5" textAnchor="middle" fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fontSize="25" fontWeight="900" fill="#ffffff">$</text>
  </g>


    </svg>
  );
}
export function InventoryIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* 3D Isometric Shipping Supply Box */}
  <g filter="url(#elem-shadow)">
    {/* Top Face (Lightest) */}
    <polygon points="64,24 99,43 64,61 29,43" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" />
    {/* Left Face (Mid tone) */}
    <polygon points="29,43 64,61 64,99 29,81" fill="#f0fdfa" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" />
    {/* Right Face (Darker for depth) */}
    <polygon points="64,61 99,43 99,81 64,99" fill="#e6f7f3" stroke="url(#teal-body)" strokeWidth="6.5" strokeLinejoin="round" />
  </g>

  {/* Coral Red Sealing Tape Band */}
  <g filter="url(#coral-shadow)">
    {/* Tape across top face */}
    <polygon points="54,29 74,40 54,51 34,40" fill="url(#coral-body)" />
    {/* Tape down front-left corner */}
    <polygon points="34,40 54,51 54,77 34,66" fill="url(#coral-cyl)" />
    {/* Tape Highlight */}
    <line x1="53" y1="30" x2="35" y2="40" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
    <line x1="35" y1="40" x2="35" y2="65" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
  </g>


    </svg>
  );
}
export function AnalyticsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* 4 Ascending 3D Columns / Bars (Teal) */}
  <g filter="url(#elem-shadow)">
    {/* Bar 1 */}
    <rect x="27" y="76" width="13.5" height="26" rx="5" fill="url(#teal-vert)" />
    <rect x="28.5" y="77" width="4" height="23" rx="2" fill="rgba(255,255,255,0.4)" />

    {/* Bar 2 */}
    <rect x="45.5" y="62" width="13.5" height="40" rx="5" fill="url(#teal-vert)" />
    <rect x="47" y="63" width="4" height="37" rx="2" fill="rgba(255,255,255,0.4)" />

    {/* Bar 3 */}
    <rect x="64" y="48" width="13.5" height="54" rx="5" fill="url(#teal-vert)" />
    <rect x="65.5" y="49" width="4" height="51" rx="2" fill="rgba(255,255,255,0.4)" />

    {/* Bar 4 */}
    <rect x="82.5" y="34" width="13.5" height="68" rx="5" fill="url(#teal-vert)" />
    <rect x="84" y="35" width="4" height="65" rx="2" fill="rgba(255,255,255,0.4)" />
  </g>

  {/* Upward Trend Line and Arrow (Coral Red) */}
  <g filter="url(#coral-shadow)">
    <path d="M 32 70 L 51 50 L 69 61 L 95 27" fill="none" stroke="url(#coral-cyl)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 32 69 L 51 49 L 69 60 L 95 26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

    {/* 3D Arrowhead */}
    <path d="M 80 23 L 99 23 L 99 42 Z" fill="url(#coral-body)" />
  </g>


    </svg>
  );
}
export function SettingsIcon({ size = 96, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" className={className}>

  <defs>

    <filter id="tile-shadow" x="-15%" y="-10%" width="130%" height="135%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f766e" floodOpacity="0.12" />
      <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#042f2e" floodOpacity="0.08" />
    </filter>

    <filter id="elem-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4.5" stdDeviation="3.5" floodColor="#042f2e" floodOpacity="0.22" />
    </filter>

    <filter id="coral-shadow" x="-25%" y="-20%" width="150%" height="155%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="3.2" floodColor="#7f1d1d" floodOpacity="0.28" />
    </filter>

    <filter id="glow-bubble" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    {/* Card Background Gradients */}
    <linearGradient id="bg-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="45%" stopColor="#fafffd" />
      <stop offset="100%" stopColor="#e9f6f2" />
    </linearGradient>

    <linearGradient id="border-tile" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
      <stop offset="60%" stopColor="#d1fae5" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.8" />
    </linearGradient>

    <linearGradient id="card-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>

    {/* Teal 3D Gradients */}
    <linearGradient id="teal-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#14b8a6" />
      <stop offset="35%" stopColor="#0d9488" />
      <stop offset="75%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="25%" stopColor="#14b8a6" />
      <stop offset="50%" stopColor="#5eead4" />
      <stop offset="75%" stopColor="#0d9488" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>

    <linearGradient id="teal-vert" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#2dd4bf" />
      <stop offset="30%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#134e4a" />
    </linearGradient>

    <radialGradient id="teal-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#5eead4" />
      <stop offset="25%" stopColor="#2dd4bf" />
      <stop offset="55%" stopColor="#0d9488" />
      <stop offset="85%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </radialGradient>

    {/* Coral Red 3D Gradients */}
    <linearGradient id="coral-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff7875" />
      <stop offset="30%" stopColor="#ff4d4f" />
      <stop offset="75%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#dc2626" />
    </linearGradient>

    <linearGradient id="coral-cyl" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#dc2626" />
      <stop offset="30%" stopColor="#ff7875" />
      <stop offset="55%" stopColor="#fca5a5" />
      <stop offset="80%" stopColor="#ef4444" />
      <stop offset="100%" stopColor="#b91c1c" />
    </linearGradient>

    <radialGradient id="coral-sphere" cx="35%" cy="32%" r="65%">
      <stop offset="0%" stopColor="#fee2e2" />
      <stop offset="22%" stopColor="#f87171" />
      <stop offset="60%" stopColor="#ef4444" />
      <stop offset="85%" stopColor="#dc2626" />
      <stop offset="100%" stopColor="#991b1b" />
    </radialGradient>

  </defs>

  {/* 3D Squircle Base Card Container */}
  <g filter="url(#tile-shadow)">
    <rect x="7" y="7" width="114" height="114" rx="26" ry="26" fill="url(#bg-tile)" stroke="url(#border-tile)" strokeWidth="1.6" />
  </g>

  {/* Subtle Inner Glass Reflection Rim */}
  <path d="M 12 33 C 12 21 21 12 33 12 L 95 12 C 107 12 116 21 116 33 C 116 39 104 45 64 45 C 24 45 12 39 12 33 Z" fill="url(#card-gloss)" opacity="0.65" pointerEvents="none" />

  {/* Module 3D Vector Artwork */}

  {/* 8-Tooth Mechanical Gear (Teal) */}
  <g filter="url(#elem-shadow)">
    {/* High-Precision 8-Tooth Gear Outline centered at (64, 64) */}
    <path d="
      M 59 23 L 69 23 L 71 31.5 C 74.5 32.8 77.8 34.6 80.8 36.9 L 88.5 33.5 L 95.5 40.5 L 92.1 48.2 C 94.4 51.2 96.2 54.5 97.5 58 L 106 60 L 106 70 L 97.5 72 C 96.2 75.5 94.4 78.8 92.1 81.8 L 95.5 89.5 L 88.5 96.5 L 80.8 93.1 C 77.8 95.4 74.5 97.2 71 98.5 L 69 107 L 59 107 L 57 98.5 C 53.5 97.2 50.2 95.4 47.2 93.1 L 39.5 96.5 L 32.5 89.5 L 35.9 81.8 C 33.6 78.8 31.8 75.5 30.5 72 L 22 70 L 22 60 L 30.5 58 C 31.8 54.5 33.6 51.2 35.9 48.2 L 32.5 40.5 L 39.5 33.5 L 47.2 36.9 C 50.2 34.6 53.5 32.8 57 31.5 Z
    " fill="url(#teal-body)" stroke="url(#teal-cyl)" strokeWidth="2.5" strokeLinejoin="round" />

    {/* Concentric Recessed White Channel */}
    <circle cx="64" cy="64" r="23" fill="#ffffff" stroke="url(#teal-body)" strokeWidth="2" />
  </g>

  {/* Central Hub (Coral Red) */}
  <g filter="url(#coral-shadow)">
    <circle cx="64" cy="64" r="14" fill="url(#coral-sphere)" />
    {/* Specular Highlight Point */}
    <circle cx="60" cy="60" r="3.8" fill="#ffffff" opacity="0.65" />
  </g>


    </svg>
  );
}

export const DASHBOARD_ICONS: Record<string, React.ComponentType<IconProps>> = {
  patients: PatientsIcon,
  calendar: CalendarIcon,
  clinical: ChartNotesIcon,
  labs: LabsIcon,
  images: ImagesIcon,
  documents: DocumentsIcon,
  injections: InjectionsIcon,
  referrals: ReferralsIcon,
  messages: MessagesIcon,
  channels: ChannelsIcon,
  tasks: TasksIcon,
  billing: BillingIcon,
  inventory: InventoryIcon,
  analytics: AnalyticsIcon,
  settings: SettingsIcon,
};
