import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Building2,
  CalendarDays,
  UserCheck,
  ClipboardList,
  FlaskConical,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { navigate } from "../api";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Determine current active section
  const activeSection: SettingsSection = useMemo(() => {
    return getSectionForCategory(currentCategoryId);
  }, [currentCategoryId]);

  // Determine tabs to display
  const displayTabs = useMemo(() => {
    if (tabs && tabs.length > 0) {
      return tabs;
    }
    return activeSection.tabs;
  }, [tabs, activeSection]);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_SETTING_OPTIONS.filter((opt) => {
      return (
        opt.name.toLowerCase().includes(q) ||
        opt.categoryName.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        opt.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }).slice(0, 8);
  }, [searchQuery]);

  const handleSelectSearchResult = (opt: SettingOption) => {
    setSearchQuery("");
    navigate(`/settings/${opt.categoryId}/${opt.id}`);
  };

  const currentTabId = activeTab || displayTabs[0]?.id;

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-[#F7F9FA]">
      {/* =========================================================================
          LEFT SETTINGS SIDEBAR (w-64 shrink-0 overflow-y-auto border-r border-slate-200)
         ========================================================================= */}
      <aside
        aria-label="Settings Navigation"
        className="w-64 shrink-0 h-full overflow-y-auto border-r border-slate-200 bg-white p-3 flex flex-col select-none"
      >
        {/* Compact Sidebar Search */}
        <div className="relative mb-3 shrink-0">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B6E75] focus:border-[#0B6E75] transition"
          />
          {searchQuery && (
            <button
              type="button"
              title="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={12} />
            </button>
          )}

          {/* Quick Search Results Dropdown */}
          {searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No matching settings found.
                </div>
              ) : (
                searchResults.map((opt) => (
                  <button
                    key={`${opt.categoryId}-${opt.id}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(opt)}
                    className="w-full text-left p-2.5 hover:bg-[#EFF8F7] transition-colors flex flex-col"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-800">
                        {opt.name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {opt.categoryName}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate mt-0.5">
                      {opt.description}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 8 Clean Settings Sections (No numeric count badges) */}
        <div className="space-y-1 flex-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors relative ${isActive
                  ? "bg-[#EFF8F7] text-[#0B6E75] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#0B6E75]"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  size={16}
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
          RIGHT CONTENT PANE (flex-1 min-w-0 overflow-y-auto p-6 bg-[#F7F9FA])
         ========================================================================= */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto p-6 bg-[#F7F9FA] flex flex-col">
        {/* Section Title Header */}
        <div className="mb-4 shrink-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {title || activeSection.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure {activeSection.title.toLowerCase()} preferences, policies, and parameters.
          </p>
        </div>

        {/* Horizontal Sub-Tabs (Clean underline tabs, no horizontal scrollbar clutter) */}
        <div className="border-b border-slate-200 mb-6 flex items-center gap-6 overflow-x-auto shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {displayTabs.map((tab) => {
            const isActive = currentTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (onTabChange) {
                    onTabChange(tab.id);
                  }
                  if (tab.route) {
                    navigate(tab.route);
                  }
                }}
                className={`pb-3 text-xs font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${isActive
                  ? "text-[#0B6E75] font-semibold"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}
