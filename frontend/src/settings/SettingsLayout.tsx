import React from "react";
import { ArrowLeft, Search } from "lucide-react";
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
      {/* Centered Top Search Bar matching live CharmHealth */}
      <div className="charm-settings-search-wrapper">
        <div className="charm-settings-search-pill">
          <Search size={18} className="charm-search-icon" />
          <input
            type="text"
            className="charm-settings-search-input"
            placeholder="Search in Settings and perform actions"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate("/settings");
              }
            }}
          />
          <button
            type="button"
            className="charm-search-arrow-btn"
            title="Search Settings"
            onClick={() => navigate("/settings")}
          >
            ➔
          </button>
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
