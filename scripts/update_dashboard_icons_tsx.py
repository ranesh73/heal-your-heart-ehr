import re
import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
svg_dir = root / "frontend" / "public" / "assets" / "dashboard"
modules = [
    ("patients", "PatientsIcon"),
    ("calendar", "CalendarIcon"),
    ("clinical", "ChartNotesIcon"),
    ("labs", "LabsIcon"),
    ("images", "ImagesIcon"),
    ("documents", "DocumentsIcon"),
    ("injections", "InjectionsIcon"),
    ("referrals", "ReferralsIcon"),
    ("messages", "MessagesIcon"),
    ("channels", "ChannelsIcon"),
    ("tasks", "TasksIcon"),
    ("billing", "BillingIcon"),
    ("inventory", "InventoryIcon"),
    ("analytics", "AnalyticsIcon"),
    ("settings", "SettingsIcon"),
]

header = '''import React from "react";

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
'''

components = []
for mod, comp in modules:
    svg_file = svg_dir / f"tile_{mod}_clean.svg"
    content = svg_file.read_text(encoding="utf-8")
    svg_tag_end = content.find(">") + 1
    body = content[svg_tag_end:content.rfind("</svg>")]
    # Replace XML comments with JSX comments
    body = re.sub(r'<!--\s*(.*?)\s*-->', r'{/* \1 */}', body)
    jsx_body = (body
        .replace("stroke-width=", "strokeWidth=")
        .replace("stroke-linecap=", "strokeLinecap=")
        .replace("stroke-linejoin=", "strokeLinejoin=")
        .replace("stroke-dasharray=", "strokeDasharray=")
        .replace("stroke-dashoffset=", "strokeDashoffset=")
        .replace("stop-color=", "stopColor=")
        .replace("stop-opacity=", "stopOpacity=")
        .replace("flood-color=", "floodColor=")
        .replace("flood-opacity=", "floodOpacity=")
        .replace("fill-opacity=", "fillOpacity=")
        .replace("text-anchor=", "textAnchor=")
        .replace("font-family=", "fontFamily=")
        .replace("font-size=", "fontSize=")
        .replace("font-weight=", "fontWeight=")
        .replace("pointer-events=", "pointerEvents=")
    )
    code = f'''export function {comp}({{ size = 96, className }}: IconProps) {{
  return (
    <svg width={{size}} height={{size}} viewBox="0 0 128 128" fill="none" className={{className}}>
{jsx_body}
    </svg>
  );
}}'''
    components.append(code)

mapping = '''
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
'''

full_code = header + "\n" + "\n".join(components) + "\n" + mapping
dest = root / "frontend" / "src" / "DashboardIcons.tsx"
dest.write_text(full_code, encoding="utf-8")
print("Updated DashboardIcons.tsx successfully!")
