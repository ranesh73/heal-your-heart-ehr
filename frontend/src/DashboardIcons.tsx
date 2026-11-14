import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

// Reusable gradients for clinical depth and visual consistency
const Gradients = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`teal-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#0f766e" />
      <stop offset="100%" stopColor="#115e59" />
    </linearGradient>
    <linearGradient id={`coral-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#f87171" />
      <stop offset="100%" stopColor="#ef4444" />
    </linearGradient>
  </defs>
);

// Heal Your Heart EHR Brand Logo Emblem (Image 1 Header Reference)
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

// 1. Patients Icon
export function PatientsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="pat" />
      {/* Back User (Coral Red) */}
      <circle cx="41" cy="22" r="7.5" fill="url(#coral-pat)" />
      <path
        d="M 33 45 C 33 37.5 36.5 34 41.5 34 C 46.5 34 50 37.5 50 45 C 50 46.5 48.5 47.5 47 47.5 L 34.5 47.5 C 33.5 47.5 33 46.5 33 45 Z"
        fill="url(#coral-pat)"
      />
      {/* Front User (Teal Green) */}
      <circle cx="23" cy="26" r="9" fill="url(#teal-pat)" />
      <path
        d="M 12 51 C 12 42 16 37.5 23 37.5 C 30 37.5 34 42 34 51 C 34 52.5 32.5 53.5 30.5 53.5 L 15.5 53.5 C 13.5 53.5 12 52.5 12 51 Z"
        fill="url(#teal-pat)"
      />
    </svg>
  );
}

// 2. Calendar Icon
export function CalendarIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="cal" />
      {/* Top Rings */}
      <rect x="21" y="11" width="4" height="8" rx="2" fill="url(#teal-cal)" />
      <rect x="39" y="11" width="4" height="8" rx="2" fill="url(#teal-cal)" />
      {/* Calendar Base Card */}
      <rect x="14" y="15" width="36" height="36" rx="7" fill="none" stroke="url(#teal-cal)" strokeWidth="3.5" />
      {/* Top Banner Line */}
      <path d="M 15 24 L 49 24" stroke="url(#teal-cal)" strokeWidth="3" />
      {/* Grid Dots */}
      {/* Row 1 */}
      <circle cx="22" cy="30" r="1.8" fill="url(#teal-cal)" />
      <circle cx="29" cy="30" r="1.8" fill="url(#teal-cal)" />
      <circle cx="36" cy="30" r="1.8" fill="url(#teal-cal)" />
      <circle cx="43" cy="30" r="1.8" fill="url(#teal-cal)" />
      {/* Row 2 */}
      <circle cx="22" cy="37" r="1.8" fill="url(#teal-cal)" />
      <circle cx="29" cy="37" r="1.8" fill="url(#teal-cal)" />
      {/* Active Coral Red Date */}
      <rect x="33.5" y="34.5" width="5.5" height="5.5" rx="1.5" fill="url(#coral-cal)" />
      <circle cx="43" cy="37" r="1.8" fill="url(#teal-cal)" />
      {/* Row 3 */}
      <circle cx="22" cy="44" r="1.8" fill="url(#teal-cal)" />
      <circle cx="29" cy="44" r="1.8" fill="url(#teal-cal)" />
      <circle cx="36" cy="44" r="1.8" fill="url(#teal-cal)" />
      <circle cx="43" cy="44" r="1.8" fill="url(#teal-cal)" />
    </svg>
  );
}

// 3. Chart Notes (Stethoscope) Icon
export function ChartNotesIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="notes" />
      {/* Ear Tips (Coral Red) */}
      <circle cx="21" cy="19" r="3.2" fill="url(#coral-notes)" />
      <circle cx="41" cy="19" r="3.2" fill="url(#coral-notes)" />
      {/* Headset Tubes */}
      <path
        d="M 21 21 C 21 32 25.5 36 31 36 C 36.5 36 41 32 41 21"
        fill="none"
        stroke="url(#teal-notes)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Flexible Lower Tube */}
      <path
        d="M 31 36 L 31 40.5 C 31 45.5 36.5 48 41 45 C 45 42 45 37 45 37"
        fill="none"
        stroke="url(#teal-notes)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Chest Piece / Bell */}
      <circle cx="45" cy="37" r="5.5" fill="#ffffff" stroke="url(#teal-notes)" strokeWidth="2.5" />
      <circle cx="45" cy="37" r="3" fill="url(#coral-notes)" />
    </svg>
  );
}

// 4. Labs (Flask) Icon
export function LabsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="lab" />
      {/* Flask Lip */}
      <rect x="27" y="14" width="10" height="3" rx="1.5" fill="url(#teal-lab)" />
      {/* Flask Body */}
      <path
        d="M 29 17 L 29 27 L 17 46 C 15 49 17 53 21 53 L 43 53 C 47 53 49 49 47 46 L 35 27 L 35 17"
        fill="none"
        stroke="url(#teal-lab)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bubbling Fluid (Coral Red) */}
      <path
        d="M 20.5 42 L 19.5 48.5 C 19 50.5 20.5 52 22.5 52 L 41.5 52 C 43.5 52 45 50.5 44.5 48.5 L 43.5 42 C 40 43.5 37 41 32 42 C 27 43 24 40.5 20.5 42 Z"
        fill="url(#coral-lab)"
      />
      {/* Fluid Bubbles */}
      <circle cx="28" cy="46" r="1.8" fill="#ffffff" opacity="0.95" />
      <circle cx="36" cy="48" r="1.4" fill="#ffffff" opacity="0.95" />
      <circle cx="33" cy="44" r="1.2" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

// 5. Images (Picture Frame) Icon
export function ImagesIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="img" />
      {/* Picture Frame */}
      <rect x="14" y="16" width="36" height="32" rx="7" fill="none" stroke="url(#teal-img)" strokeWidth="3.5" />
      {/* Sun (Coral Red) */}
      <circle cx="39" cy="25" r="4.5" fill="url(#coral-img)" />
      {/* Mountains (Teal) */}
      <path d="M 29 42 L 35 33 L 44 43 Z" fill="url(#teal-img)" opacity="0.75" />
      <path d="M 18 44 L 27 31 L 38 44 Z" fill="url(#teal-img)" />
    </svg>
  );
}

// 6. Documents Icon
export function DocumentsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="doc" />
      {/* Page Sheet */}
      <path
        d="M 18 15 L 36 15 L 46 25 L 46 49 C 46 51 44.5 52.5 42.5 52.5 L 18 52.5 C 16 52.5 14.5 51 14.5 49 L 14.5 18.5 C 14.5 16.5 16 15 18 15 Z"
        fill="none"
        stroke="url(#teal-doc)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Folded Corner */}
      <path d="M 36 15 L 36 25 L 46 25" fill="none" stroke="url(#teal-doc)" strokeWidth="3.5" strokeLinejoin="round" />
      {/* Content Lines */}
      <path d="M 22 30 L 29 30" stroke="url(#teal-doc)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 22 37 L 38 37" stroke="url(#coral-doc)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 22 44 L 33 44" stroke="url(#coral-doc)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 7. Injections (Syringe) Icon
export function InjectionsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="inj" />
      {/* Needle Tip */}
      <path d="M 20 44 L 14 50" stroke="url(#teal-inj)" strokeWidth="2.8" strokeLinecap="round" />
      {/* Hub */}
      <path d="M 23 41 L 19 45" stroke="url(#teal-inj)" strokeWidth="3.5" strokeLinecap="round" />
      {/* Syringe Barrel */}
      <path
        d="M 22 42 L 37 27 L 42 32 L 27 47 Z"
        fill="none"
        stroke="url(#teal-inj)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Liquid in Barrel (Coral Red) */}
      <path d="M 23.5 40.5 L 31.5 32.5 L 35 36 L 27 44 Z" fill="url(#coral-inj)" />
      {/* Plunger Flange */}
      <path d="M 35 25 L 44 34" stroke="url(#teal-inj)" strokeWidth="3.5" strokeLinecap="round" />
      {/* Plunger Rod */}
      <path d="M 39.5 29.5 L 47 22" stroke="url(#teal-inj)" strokeWidth="3.5" strokeLinecap="round" />
      {/* Thumb Cap */}
      <path d="M 44.5 19.5 L 50.5 25.5" stroke="url(#teal-inj)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// 8. Referrals Icon
export function ReferralsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="ref" />
      {/* Left User */}
      <circle cx="21" cy="27" r="4.5" fill="url(#teal-ref)" />
      <path d="M 15 41 C 15 36 17.5 33.5 21 33.5 C 24.5 33.5 27 36 27 41 Z" fill="url(#teal-ref)" />
      {/* Right User */}
      <circle cx="43" cy="27" r="4.5" fill="url(#teal-ref)" />
      <path d="M 37 41 C 37 36 39.5 33.5 43 33.5 C 46.5 33.5 49 36 49 41 Z" fill="url(#teal-ref)" />
      {/* Top Curved Arrow (Coral Red) */}
      <path d="M 26 19 C 31 16 35 16 40 18" fill="none" stroke="url(#coral-ref)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 37 14.5 L 43 18 L 38 23" fill="none" stroke="url(#coral-ref)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom Curved Arrow (Coral Red) */}
      <path d="M 38 48 C 33 51 29 51 24 49" fill="none" stroke="url(#coral-ref)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 27 52.5 L 21 49 L 26 44" fill="none" stroke="url(#coral-ref)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 9. Messages (Envelope) Icon
export function MessagesIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="msg" />
      {/* Triangular Flap (Coral Red) */}
      <path d="M 16 26 L 32 15 L 48 26 Z" fill="url(#coral-msg)" />
      {/* Envelope Body */}
      <path
        d="M 14 26 L 14 47 C 14 49.5 16 51 18.5 51 L 45.5 51 C 48 51 50 49.5 50 47 L 50 26 Z"
        fill="#ffffff"
        stroke="url(#teal-msg)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* V Folds */}
      <path
        d="M 15 28 L 32 40 L 49 28"
        fill="none"
        stroke="url(#teal-msg)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 10. Channels (Broadcast Antenna) Icon
export function ChannelsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="chan" />
      {/* Antenna Mast (Teal) */}
      <path d="M 32 29 L 32 50" stroke="url(#teal-chan)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 28 50 L 36 50" stroke="url(#teal-chan)" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="27" r="4.2" fill="url(#teal-chan)" />
      {/* Radio Waves (Coral Red) */}
      <path d="M 24 22 C 21 25 21 29 24 32" fill="none" stroke="url(#coral-chan)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 40 22 C 43 25 43 29 40 32" fill="none" stroke="url(#coral-chan)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 18 17 C 13 22 13 32 18 37" fill="none" stroke="url(#coral-chan)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 46 17 C 51 22 51 32 46 37" fill="none" stroke="url(#coral-chan)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 11. Tasks (Checkbox) Icon
export function TasksIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="task" />
      {/* Checkbox Frame (Teal) */}
      <rect x="15" y="15" width="34" height="34" rx="8" fill="none" stroke="url(#teal-task)" strokeWidth="3.5" />
      {/* Checkmark (Coral Red) */}
      <path
        d="M 23 32 L 29 38 L 41 24"
        fill="none"
        stroke="url(#coral-task)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 12. Billing (Coins) Icon
export function BillingIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="bill" />
      {/* Coin Stack (Teal) */}
      <ellipse cx="27" cy="24" rx="13" ry="5" fill="none" stroke="url(#teal-bill)" strokeWidth="3.5" />
      <path d="M 14 24 C 14 27.5 20 30 27 30 C 34 30 40 27.5 40 24" fill="none" stroke="url(#teal-bill)" strokeWidth="3.5" />
      <path d="M 14 31 C 14 34.5 20 37 27 37 C 34 37 40 34.5 40 31" fill="none" stroke="url(#teal-bill)" strokeWidth="3.5" />
      <path d="M 14 38 C 14 41.5 20 44 27 44 C 34 44 40 41.5 40 38" fill="none" stroke="url(#teal-bill)" strokeWidth="3.5" />
      {/* Front Coin (Coral Red) */}
      <circle cx="41" cy="40" r="11" fill="url(#coral-bill)" />
      <text x="41" y="45.5" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
        $
      </text>
    </svg>
  );
}

// 13. Inventory (3D Shipping Box) Icon
export function InventoryIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="inv" />
      {/* Box Outer Shape */}
      <path
        d="M 32 14 L 47 22 L 47 44 L 32 52 L 17 44 L 17 22 Z"
        fill="none"
        stroke="url(#teal-inv)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Internal Edges */}
      <path
        d="M 32 30 L 32 52 M 32 30 L 17 22 M 32 30 L 47 22"
        fill="none"
        stroke="url(#teal-inv)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Sealing Tape (Coral Red) */}
      <path d="M 28 16 L 39 26 L 35 28 L 24 18 Z" fill="url(#coral-inv)" />
      <path d="M 35 28 L 35 48 L 31 46 L 31 29 Z" fill="url(#coral-inv)" />
    </svg>
  );
}

// 14. Analytics (Growth Chart) Icon
export function AnalyticsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="ana" />
      {/* 4 Ascending Bars (Teal) */}
      <rect x="15" y="43" width="6" height="10" rx="2" fill="url(#teal-ana)" />
      <rect x="24" y="37" width="6" height="16" rx="2" fill="url(#teal-ana)" />
      <rect x="33" y="30" width="6" height="23" rx="2" fill="url(#teal-ana)" />
      <rect x="42" y="24" width="6" height="29" rx="2" fill="url(#teal-ana)" />
      {/* Upward Trend Arrow (Coral Red) */}
      <path
        d="M 16 38 L 27 30 L 35 34 L 47 18"
        fill="none"
        stroke="url(#coral-ana)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 40 18 L 47 18 L 47 25"
        fill="none"
        stroke="url(#coral-ana)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 15. Settings (Gear with Coral Hub) Icon
export function SettingsIcon({ size = 48, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <Gradients id="set" />
      {/* Centered 8-Tooth Outer Gear (Teal) */}
      <path
        d="M 28.6 15.9 L 29.3 9.7 L 34.7 9.7 L 35.4 15.9 L 41.0 18.2 L 45.9 14.3 L 49.7 18.1 L 45.8 23.0 L 48.1 28.6 L 54.3 29.3 L 54.3 34.7 L 48.1 35.4 L 45.8 41.0 L 49.7 45.9 L 45.9 49.7 L 41.0 45.8 L 35.4 48.1 L 34.7 54.3 L 29.3 54.3 L 28.6 48.1 L 23.0 45.8 L 18.1 49.7 L 14.3 45.9 L 18.2 41.0 L 15.9 35.4 L 9.7 34.7 L 9.7 29.3 L 15.9 28.6 L 18.2 23.0 L 14.3 18.1 L 18.1 14.3 L 23.0 18.2 Z"
        fill="url(#teal-set)"
        stroke="url(#teal-set)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Center Hub (Coral Red) */}
      <circle cx="32" cy="32" r="8.5" fill="url(#coral-set)" />
      {/* Inner White Dot */}
      <circle cx="32" cy="32" r="3.8" fill="#ffffff" />
    </svg>
  );
}

// Export dictionary mapping module IDs to icons
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
