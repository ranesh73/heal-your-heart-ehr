import React, { useMemo } from "react";
import {
  Building2,
  CalendarDays,
  UserCheck,
  ClipboardList,
  FlaskConical,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { navigate } from "../api";
import { AnimatedArrowButton } from "../AnimatedArrowButton";
import {
  SETTINGS_SECTIONS,
  getSectionForCategory,
  ALL_SETTING_OPTIONS,
  SettingOption,
  SettingsSection,
} from "./settingsData";

interface SettingsLayoutProps {
  currentCategoryId?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  tabs?: { id: string; label: string; badge?: string; route?: string }[];
  title?: string;
  children: React.ReactNode;
}

export const FACILITY_TABS = [
  { id: "facility-list", label: "Facility List", route: "/settings/facility/facility-list" },
  { id: "facility-members", label: "Members", route: "/settings/facility/facility-members" },
  { id: "facility-resources", label: "Resources", route: "/settings/facility/facility-resources" },
  { id: "departments", label: "Departments", route: "/settings/facility/departments" },
  { id: "roles", label: "Roles", route: "/settings/facility/roles" },
  { id: "kiosk-setup", label: "Kiosk", route: "/settings/facility/kiosk-setup" },
  { id: "notifications", label: "Notifications", route: "/settings/facility/notifications" },
];

const SECTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Building2,
  CalendarDays,
  UserCheck,
  ClipboardList,
  FlaskConical,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
};

export function SettingsLayout({
  currentCategoryId,
  activeTab,
  onTabChange,
  tabs,
  title,
  children,
}: SettingsLayoutProps) {
  // Determine current active section
  const activeSection: SettingsSection = useMemo(() => {
    return getSectionForCategory(currentCategoryId);
  }, [currentCategoryId]);

  // Determine tabs to display from canonical 8-section tab list
  const displayTabs = activeSection.tabs;

  const currentTabId = useMemo(() => {
    if (activeTab) {
      const match = displayTabs.find(
        (t) => t.id === activeTab || t.optionId === activeTab
      );
      if (match) return match.id;
    }
    if (currentCategoryId) {
      const match = displayTabs.find((t) => t.categoryId === currentCategoryId);
      if (match) return match.id;
    }
    return displayTabs[0]?.id;
  }, [displayTabs, activeTab, currentCategoryId]);

  return (
    <div className="flex -mx-[42px] -my-[35px] w-[calc(100%+84px)] h-[calc(100vh-56px)] overflow-hidden bg-[#F7F9FA]">
      {/* =========================================================================
          LEFT SETTINGS SIDEBAR (264px shrink-0 overflow-y-auto border-r border-slate-200)
         ========================================================================= */}
      <aside
        aria-label="Settings Navigation"
        className="w-[264px] shrink-0 h-full overflow-y-auto border-r border-slate-200 bg-white p-4 flex flex-col select-none"
      >
        {/* Back to Homepage Button (Clean, no weird outer rectangular box) */}
        <div className="mb-4 px-1 pt-1">
          <AnimatedArrowButton
            direction="left"
            size="sm"
            label="Back to Home"
            onClick={() => navigate("/home")}
          />
        </div>

        {/* 8 Clean Settings Sections (No numeric count badges) */}
        <div className="space-y-1 flex-1">
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Settings Workspace
          </div>
          {SETTINGS_SECTIONS.map((sec) => {
            const Icon = SECTION_ICONS[sec.iconName] || Building2;
            const isActive = activeSection.id === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => navigate(sec.defaultRoute)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl text-left transition-colors relative cursor-pointer ${isActive
                  ? "bg-[#EFF8F7] text-[#0B6E75] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#0B6E75]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  size={17}
                  className={`shrink-0 ${isActive ? "text-[#0B6E75]" : "text-slate-400"
                    }`}
                />
                <span className="truncate flex-1">{sec.title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CONTENT PANE (flex-1 min-w-0 overflow-y-auto px-8 py-6 bg-[#F7F9FA])
         ========================================================================= */}
      <section
        aria-label="Settings Content Pane"
        className="flex-1 min-w-0 h-full overflow-y-auto px-8 py-6 bg-[#F7F9FA] flex flex-col"
      >
        {/* Section Title Header */}
        <div className="mb-4 shrink-0">
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight">
            {title || activeSection.title}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Configure {activeSection.title.toLowerCase()} preferences, policies, and parameters.
          </p>
        </div>

        {/* Horizontal Sub-Tabs (Clean underline tabs, no horizontal scrollbar clutter) */}
        <div className="border-b border-slate-200 mb-5 flex items-center gap-6 overflow-x-auto shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {displayTabs.map((tab) => {
            const isActive = currentTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.route) {
                    navigate(tab.route);
                  } else if (onTabChange) {
                    onTabChange(tab.id);
                  }
                }}
                className={`pb-3 text-[13px] font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${isActive
                  ? "text-[#0B6E75] font-semibold"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B6E75] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Settings Content Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex-1 min-h-0">
          {children}
        </div>
      </section>
    </div>
  );
}
