import React from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { navigate } from "../api";

interface SettingsLayoutProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs?: { id: string; label: string; badge?: string }[];
  children: React.ReactNode;
}

export const FACILITY_TABS = [
  { id: "facility-list", label: "Facility List" },
  { id: "facility-members", label: "Facility Members" },
  { id: "facility-resources", label: "Facility Resources" },
  { id: "kiosk-setup", label: "Kiosk Setup" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles" },
  { id: "notifications", label: "Notifications" },
];

export function SettingsLayout({
  activeTab,
  onTabChange,
  tabs = FACILITY_TABS,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="charm-settings-container">
      {/* Centered Top Search Bar */}
      <div className="charm-settings-search-wrapper flex justify-center mb-5">
        <div className="flex items-center gap-2.5 bg-white border border-slate-300 rounded-full px-4 py-2 w-full max-w-[580px] shadow-xs focus-within:ring-2 focus-within:ring-[#0B6E75] focus-within:border-transparent transition">
          <Search
            size={16}
            className="text-slate-400 shrink-0"
          />
          <input
            type="text"
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
            placeholder="Search in Settings and perform actions (press Enter)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate("/settings");
              }
            }}
          />
        </div>
      </div>

      {/* Main White Content Card */}
      <div className="charm-settings-main-card">
        {/* Horizontal Navigation Tabs Strip with Back Button */}
        <div className="charm-settings-tabs-strip">
          <button
            type="button"
            className="charm-settings-back-arrow-btn"
            title="Back to Settings Dashboard"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft size={16} />
          </button>

          <div className="charm-settings-tabs-list">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`charm-settings-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.badge && <span className="charm-badge-new">{tab.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="charm-settings-tab-content">{children}</div>
      </div>
    </div>
  );
}
