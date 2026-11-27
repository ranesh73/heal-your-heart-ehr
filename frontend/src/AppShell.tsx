import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Image as ImageIcon,
  FileText,
  Syringe,
  Share2,
  HeartPulse,
  IndianRupee,
  Package,
  CheckCircle2,
  Mail,
  Hash,
  BarChart3,
  Settings,
  Building2,
  Video,
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Lock,
  LogOut,
  Sparkles,
  HelpCircle,
  Keyboard,
  Gift,
  Plug,
  Clock,
  ArrowUpRight,
  Activity,
  User as UserIcon,
  Shield,
  Layers,
} from "lucide-react";
import { Row, navigate, api, setSession } from "./api";
import { TaskNotificationCenter } from "./clinicalTasks";
import { KeyboardShortcutsModal } from "./settings/KeyboardShortcutsModal";
import { HelpModal } from "./settings/HelpModal";
import { AddonsModal } from "./settings/AddonsModal";
import { ReferFriendModal } from "./settings/ReferFriendModal";
import { ALL_SETTING_OPTIONS, SettingOption } from "./settings/settingsData";
import "./uiverseTopbar.css";

export interface NavItemConfig {
  id: string;
  label: string;
  route: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activeMatch?: string[];
  badgeCount?: number;
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

export const DEFAULT_NAV_SECTIONS: NavSectionConfig[] = [
  {
    title: "Clinical",
    items: [
      { id: "patients", label: "Patients", route: "/patients", icon: Users },
      {
        id: "clinical",
        label: "Chart Notes",
        route: "/chart-notes",
        icon: ClipboardList,
        activeMatch: ["clinical", "chart-notes", "encounter"],
      },
      { id: "labs", label: "Labs", route: "/labs", icon: FlaskConical },
      { id: "images", label: "Images", route: "/images", icon: ImageIcon },
      { id: "documents", label: "Documents", route: "/documents", icon: FileText },
      { id: "injections", label: "Injections", route: "/injections", icon: Syringe },
      { id: "referrals", label: "Referrals", route: "/referrals", icon: Share2 },
    ],
  },
  {
    title: "EECP",
    items: [
      { id: "eecp", label: "EECP Therapy", route: "/eecp", icon: HeartPulse },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "calendar", label: "Calendar", route: "/calendar", icon: CalendarDays },
      { id: "billing", label: "Billing", route: "/billing", icon: IndianRupee },
      { id: "inventory", label: "Inventory", route: "/inventory", icon: Package },
      { id: "tasks", label: "Tasks", route: "/tasks", icon: CheckCircle2 },
      { id: "messages", label: "Messages", route: "/messages", icon: Mail },
      { id: "channels", label: "Channels", route: "/channels", icon: Hash },
      { id: "analytics", label: "Analytics", route: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Admin",
    items: [
      { id: "settings", label: "Settings", route: "/settings", icon: Settings },
      { id: "administration", label: "Administration", route: "/administration", icon: Building2 },
    ],
  },
];

export interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
  };
  facilities: Row[];
  currentBranch: string;
  onBranchChange: (facilityId: string) => void;
  activePage: string;
  search: string;
  onSearchChange: (val: string) => void;
  searchResults: { data?: { items: Row[] }; isLoading?: boolean };
  onSelectPatient: (patientId: string) => void;
  onNewPatient: () => void;
  onNewAppointment?: () => void;
  notify: (text: string) => void;
  onLogout: () => Promise<void>;
  onSwitchRole?: (email: string) => void;
}

export function AppShell({
  children,
  user,
  facilities,
  currentBranch,
  onBranchChange,
  activePage,
  search,
  onSearchChange,
  searchResults,
  onSelectPatient,
  onNewPatient,
  onNewAppointment,
  notify,
  onLogout,
  onSwitchRole,
}: AppShellProps) {
  // Sidebar collapsed state stored in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hyh_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [addonsModalOpen, setAddonsModalOpen] = useState(false);
  const [referFriendModalOpen, setReferFriendModalOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hyh_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcuts: Alt+[ for sidebar collapse, Ctrl+K / Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+[
      if (e.altKey && e.key === "[") {
        e.preventDefault();
        toggleCollapsed();
      }
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Escape to close menus
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    };
    if (userMenuOpen || branchMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen, branchMenuOpen]);

  // Focus input when command palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => paletteInputRef.current?.focus(), 50);
    } else {
      setPaletteQuery("");
    }
  }, [commandPaletteOpen]);

  const currentFacility = facilities.find((f) => f.id === currentBranch) || facilities[0];

  const quickRoles = [
    { role: "Doctor", email: "doctor@demo.local" },
    { role: "Assistant", email: "assistant@demo.local" },
    { role: "Therapist", email: "therapist@demo.local" },
    { role: "Reception", email: "reception@demo.local" },
    { role: "Billing", email: "billing@demo.local" },
    { role: "Admin", email: "admin@demo.local" },
  ];

  // Quick modules list for Command Palette
  const allModules = [
    { label: "Patients", route: "/patients", icon: Users, group: "Clinical" },
    { label: "Chart Notes", route: "/chart-notes", icon: ClipboardList, group: "Clinical" },
    { label: "Labs", route: "/labs", icon: FlaskConical, group: "Clinical" },
    { label: "Images", route: "/images", icon: ImageIcon, group: "Clinical" },
    { label: "Documents", route: "/documents", icon: FileText, group: "Clinical" },
    { label: "Injections", route: "/injections", icon: Syringe, group: "Clinical" },
    { label: "Referrals", route: "/referrals", icon: Share2, group: "Clinical" },
    { label: "EECP Therapy", route: "/eecp", icon: HeartPulse, group: "EECP" },
    { label: "Calendar", route: "/calendar", icon: CalendarDays, group: "Operations" },
    { label: "Billing", route: "/billing", icon: IndianRupee, group: "Operations" },
    { label: "Inventory", route: "/inventory", icon: Package, group: "Operations" },
    { label: "Tasks", route: "/tasks", icon: CheckCircle2, group: "Operations" },
    { label: "Messages", route: "/messages", icon: Mail, group: "Operations" },
    { label: "Channels", route: "/channels", icon: Hash, group: "Operations" },
    { label: "Communication Threads", route: "/communication", icon: Layers, group: "Operations" },
    { label: "Analytics", route: "/analytics", icon: BarChart3, group: "Operations" },
    { label: "Settings", route: "/settings", icon: Settings, group: "Admin" },
    { label: "Practice Administration", route: "/administration", icon: Building2, group: "Admin" },
  ];

  const filteredPaletteModules = paletteQuery.trim()
    ? allModules.filter((m) =>
        m.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
        m.group.toLowerCase().includes(paletteQuery.toLowerCase())
      )
    : allModules;

  const isSettingsMode = activePage === "settings" || activePage === "templates";

  const filteredSettingsOptions = useMemo(() => {
    if (!settingsSearchQuery.trim()) return [];
    const q = settingsSearchQuery.toLowerCase().trim();
    return ALL_SETTING_OPTIONS.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        opt.categoryName.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [settingsSearchQuery]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg-canvas,#F7F9FA)] text-[var(--color-text-primary,#0F172A)] font-sans">
      {/* =========================================================================
          1. FULL-WIDTH 56px TOPBAR ([☰] [Heal Your Heart EHR] | [Branch] [Search] ...)
         ========================================================================= */}
      <header
        className={`charm-global-topbar h-14 bg-white border-b border-slate-200 ${isSettingsMode ? "pl-4" : "pl-0"} pr-4 flex items-center justify-between gap-4 shrink-0 z-20`}
        style={{ height: 56 }}
      >
        {/* Left Area: 64px Sidebar Toggle Slot (aligned with collapsed rail) + Brand Logo + Branch Selector */}
        <div className="flex items-center gap-[12px] min-w-0">
          {!isSettingsMode && (
            <div className="w-[64px] shrink-0 flex items-center justify-center">
              {/*
                From Uiverse.io by vinodjangid07 - https://uiverse.io/vinodjangid07/soft-octopus-29
                MIT License, Copyright (c) vinodjangid07 (Vinod Jangid)
              */}
              <input
                type="checkbox"
                id="hyh-sidebar-toggle"
                className="hyh-uiverse-checkbox"
                checked={!collapsed}
                onChange={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar (Alt+[)" : "Collapse sidebar (Alt+[)"}
              />
              <label
                htmlFor="hyh-sidebar-toggle"
                className="hyh-uiverse-toggle"
                title={collapsed ? "Expand sidebar (Alt+[)" : "Collapse sidebar (Alt+[)"}
              >
                <div className="hyh-uiverse-bars" id="hyh-uiverse-bar1" />
                <div className="hyh-uiverse-bars" id="hyh-uiverse-bar2" />
                <div className="hyh-uiverse-bars" id="hyh-uiverse-bar3" />
              </label>
            </div>
          )}
          <img
            src="/assets/dashboard/heal_your_heart_logo_transparent.png"
            alt="Heal Your Heart EHR"
            onClick={() => navigate("/home")}
            className="h-8 w-auto object-contain cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
            title="Heal Your Heart EHR · Home"
          />
          <div className="h-5 w-px bg-slate-200 shrink-0" />
            <div className="relative" ref={branchMenuRef}>
              <button
                type="button"
                aria-label="Active branch"
                onClick={() => setBranchMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold cursor-pointer shadow-2xs"
              >
                <Building2
                  size={15}
                  className="text-[#0B6E75] shrink-0"
                />
                <span className="truncate max-w-[260px] text-left">
                  {currentFacility?.name.replace(/^Heal Your Heart\s*[·-]?\s*/i, "") || "Select Branch"}
                </span>
                <ChevronDown size={13} className="text-slate-500 shrink-0" />
              </button>

              {branchMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 divide-y divide-slate-100 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Practice Branch
                  </div>
                  <div className="py-1 max-h-56 overflow-y-auto">
                    {facilities.map((f: Row) => {
                      const isCurrent = f.id === currentBranch;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setBranchMenuOpen(false);
                            onBranchChange(f.id);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                            isCurrent
                              ? "bg-[#EFF8F7] text-[#0B6E75] font-semibold"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate text-xs">
                              {f.name.replace(/^Heal Your Heart\s*[·-]?\s*/i, "")}
                            </span>
                            {f.city && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {f.city}
                              </span>
                            )}
                          </div>
                          {isCurrent && (
                            <CheckCircle2
                              size={14}
                              className="text-[#0B6E75] shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Area: Context-Aware Search (Settings search on /settings, Patient search elsewhere) */}
          <div className="flex-1 max-w-md mx-auto relative">
            {isSettingsMode ? (
              /* Dedicated Settings Search Bar on Top */
              <>
                <div className="hyh-uiverse-search">
                  <Search
                    size={14}
                    className="absolute left-1 bottom-[9px] text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    aria-label="Search settings options"
                    value={settingsSearchQuery}
                    onChange={(e) => setSettingsSearchQuery(e.target.value)}
                  />
                  <label>
                    {"Search settings...".split("").map((ch, idx) => (
                      <span key={idx} style={{ transitionDelay: `${idx * 25}ms` }}>
                        {ch}
                      </span>
                    ))}
                  </label>
                  {settingsSearchQuery.length > 0 && (
                    <button
                      type="button"
                      title="Clear search"
                      onClick={() => setSettingsSearchQuery("")}
                      className="absolute right-0 bottom-[7px] text-[#94A3B8] hover:text-[#0F172A] p-1 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Inline settings search dropdown anchored below topbar */}
                {settingsSearchQuery.trim().length > 0 && (
                  <div className="charm-search-dropdown-anchored absolute left-0 right-0 top-full mt-1 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                    {filteredSettingsOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#64748B]">
                        No settings matching "{settingsSearchQuery}"
                      </div>
                    ) : (
                      filteredSettingsOptions.map((opt) => (
                        <button
                          key={`${opt.categoryId}-${opt.id}`}
                          type="button"
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#EFF8F7] flex items-center justify-between group transition-colors cursor-pointer"
                          onClick={() => {
                            navigate(`/settings/${opt.categoryId}/${opt.id}`);
                            setSettingsSearchQuery("");
                          }}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-xs text-[#0F172A] group-hover:text-[var(--color-primary-clinical,#0B6E75)] flex items-center gap-1.5">
                              <span className="truncate">{opt.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                {opt.categoryName}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                              {opt.description}
                            </div>
                          </div>
                          <ArrowUpRight
                            size={14}
                            className="text-[#94A3B8] group-hover:text-[var(--color-primary-clinical,#0B6E75)] shrink-0"
                          />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Global Patient Search Bar */
              <>
                {/*
                  From Uiverse.io by liyaxu123 - https://uiverse.io/liyaxu123/warm-eel-62
                  MIT License, Copyright (c) liyaxu123 (????)
                */}
                <div className="hyh-uiverse-search">
                  <Search
                    size={14}
                    className="absolute left-1 bottom-[9px] text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    required
                    aria-label="Find a patient"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                  <label>
                    {"Search".split("").map((ch, idx) => (
                      <span key={idx} style={{ transitionDelay: `${idx * 50}ms` }}>
                        {ch}
                      </span>
                    ))}
                  </label>
                  {search.length > 0 && (
                    <button
                      type="button"
                      title="Clear search"
                      onClick={() => onSearchChange("")}
                      className="absolute right-0 bottom-[7px] text-[#94A3B8] hover:text-[#0F172A] p-1 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Inline search dropdown directly anchored below search box */}
                {search.length > 1 && (
                  <div className="charm-search-dropdown-anchored absolute left-0 right-0 top-full mt-1 bg-white border border-[#CBD5E1] rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto divide-y divide-[#F1F5F9]">
                    {searchResults.data?.items.map((p: Row) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3.5 py-2.5 hover:bg-[#F8FAFC] flex items-center justify-between group transition-colors"
                        onClick={() => {
                          onSelectPatient(p.id);
                          onSearchChange("");
                        }}
                      >
                        <div>
                          <div className="font-semibold text-xs text-[#0F172A] group-hover:text-[var(--color-primary-clinical,#0B6E75)]">
                            {p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim()}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono">
                            MRN: {p.mrn} · Phone: {p.phone || "None"}
                          </div>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="text-[#94A3B8] group-hover:text-[var(--color-primary-clinical,#0B6E75)]"
                        />
                      </button>
                    ))}
                    {searchResults.data?.items.length === 0 && !searchResults.isLoading && (
                      <div className="p-3 text-center text-xs text-[#64748B]">
                        No patients matching "{search}"
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Area: Controls & Docked Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* TeleHealth Session Toggle */}
            <button
              type="button"
              onClick={() => notify("TeleHealth session initialized.")}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 mr-1 rounded-lg text-[12.5px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Initialize TeleHealth Session"
            >
              <Video size={14} className="text-[#0B6E75]" />
              <span className="hidden sm:inline">TeleHealth</span>
            </button>

            {/* Task Notifications Bell (aligned cleanly with utility icons) */}
            <div className="[&_button.charm-icon-btn-round]:!border-0 [&_button.charm-icon-btn-round]:!bg-transparent [&_button.charm-icon-btn-round]:!rounded-lg [&_button.charm-icon-btn-round]:!w-8 [&_button.charm-icon-btn-round]:!h-8 [&_button.charm-icon-btn-round]:!text-slate-500 [&_button.charm-icon-btn-round]:hover:!bg-slate-100 [&_button.charm-icon-btn-round]:hover:!text-slate-900">
              <TaskNotificationCenter />
            </div>

            {/* Help / Utilities Quick Trigger */}
            <button
              type="button"
              onClick={() => setHelpModalOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clinical Documentation & Help"
            >
              <HelpCircle size={16} />
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              type="button"
              onClick={() => setShortcutsModalOpen(true)}
              className="w-8 h-8 rounded-lg hidden lg:inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Keyboard Shortcuts"
            >
              <Keyboard size={16} />
            </button>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[#0B6E75]/30 transition-all outline-none cursor-pointer"
                title={`${user.name} (${user.role})`}
                aria-label="User Profile"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B6E75] text-white flex items-center justify-center font-semibold text-xs tracking-wide shadow-2xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              </button>

              {userMenuOpen && (
                <div className="charm-user-popup absolute right-0 top-full mt-2 w-64 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 py-2 divide-y divide-[#F1F5F9] text-xs">
                  {/* User Profile Header */}
                  <div className="px-3.5 py-2.5">
                    <div className="font-bold text-[#0F172A] text-sm">{user.name}</div>
                    <div className="flex items-center gap-1.5 text-[#64748B] text-[11px] mt-0.5">
                      <span className="charm-role-bracket font-semibold text-[var(--color-primary-clinical,#0B6E75)]">
                        [{user.role}]
                      </span>
                      <span>·</span>
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#059669] font-medium mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      <span>{currentFacility?.name.replace("Heal Your Heart · ", "") || "Branch"}</span>
                    </div>
                  </div>

                  {/* Switch Demo Role */}
                  <div className="px-3.5 py-2">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5">
                      Switch Demo Role
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {quickRoles.map((qr) => (
                        <button
                          key={qr.role}
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            if (onSwitchRole) onSwitchRole(qr.email);
                          }}
                          className={`text-left px-2 py-1 rounded text-[11px] transition-colors ${
                            user.role.toLowerCase() === qr.role.toLowerCase()
                              ? "bg-[#E8F4F3] font-bold text-[var(--color-primary-clinical,#0B6E75)]"
                              : "text-[#334155] hover:bg-[#F1F5F9]"
                          }`}
                        >
                          {qr.role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Practice Links */}
                  <div className="py-1">
                    <button
                      type="button"
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-[#F8FAFC] text-[#334155] transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/settings");
                      }}
                    >
                      <Settings size={14} className="text-[#64748B]" />
                      <span>Settings & Preferences</span>
                    </button>
                    <button
                      type="button"
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-[#F8FAFC] text-[#334155] transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShortcutsModalOpen(true);
                      }}
                    >
                      <Keyboard size={14} className="text-[#64748B]" />
                      <span>Keyboard Shortcuts</span>
                    </button>
                    <button
                      type="button"
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-[#F8FAFC] text-[#334155] transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        notify("Screen locked. Re-enter credentials to continue.");
                      }}
                    >
                      <Lock size={14} className="text-[#64748B]" />
                      <span>Lock Screen</span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="py-1">
                    <button
                      type="button"
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 hover:bg-[#FEF2F2] text-[#B83B4A] transition-colors font-medium"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await onLogout();
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =========================================================================
            2. BODY ROW (Clean White Clinical Sidebar + Content Viewport)
           ========================================================================= */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {!isSettingsMode && (
            <aside
              aria-label="Global Navigation"
              data-collapsed={collapsed ? "true" : "false"}
              className={`charm-global-sidebar flex flex-col shrink-0 h-full transition-all duration-200 border-r border-slate-200 bg-white select-none ${
                collapsed ? "w-16" : "w-[232px]"
              }`}
              style={{
                width: collapsed ? 64 : 232,
                minWidth: collapsed ? 64 : 232,
                maxWidth: collapsed ? 64 : 232,
              }}
            >
              {/* Navigation Groups (starts directly without redundant top logo box) */}
              <div
                className={`flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                  collapsed ? "py-2 px-1 space-y-1.5" : "py-3 px-2 space-y-4"
                }`}
              >
                {DEFAULT_NAV_SECTIONS.map((section, sectionIdx) => (
                  <div key={section.title} className={collapsed ? "space-y-0.5" : "space-y-1"}>
                    {!collapsed && (
                      <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {section.title}
                      </div>
                    )}
                    {collapsed && sectionIdx > 0 && (
                      <div className="my-1.5 mx-auto w-5 border-t border-slate-200" />
                    )}
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.activeMatch
                        ? item.activeMatch.includes(activePage)
                        : activePage === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={item.label}
                          title={collapsed ? item.label : undefined}
                          onClick={() => navigate(item.route)}
                          className={`charm-sidebar-btn w-full flex items-center rounded-lg text-[13px] font-medium transition-colors text-left relative ${
                            collapsed
                              ? "justify-center h-8 my-0.5 px-0"
                              : "gap-3 px-3 py-2"
                          } ${
                            isActive
                              ? "bg-[#EFF8F7] text-[#0B6E75] font-semibold shadow-xs"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#0B6E75]"
                              aria-hidden="true"
                            />
                          )}
                          <Icon
                            size={18}
                            className={`shrink-0 ${
                              isActive
                                ? "text-[#0B6E75]"
                                : "text-slate-500"
                            }`}
                          />
                          {!collapsed && (
                            <span className="truncate flex-1">{item.label}</span>
                          )}
                          {!collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#0B6E75] text-white">
                              {item.badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Content Viewport */}
          <main className={`flex-1 min-w-0 h-full ${isSettingsMode ? "overflow-hidden flex flex-col" : "overflow-y-auto"} bg-[var(--color-bg-canvas,#F7F9FA)]`}>
            {children}
          </main>
        </div>

      {/* =========================================================================
          3. COMMAND PALETTE MODAL (Ctrl+K / Cmd+K Quick Jump)
         ========================================================================= */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4 z-50"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-[#E2E8F0] flex items-center gap-2.5">
              <Search size={18} className="text-[#64748B]" />
              <input
                ref={paletteInputRef}
                type="text"
                placeholder="Jump to patient, chart, module, or setting..."
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                className="flex-1 text-sm outline-none placeholder-[#94A3B8]"
              />
              <kbd className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] px-1.5 py-0.5 rounded">
                ESC
              </kbd>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Quick Actions */}
              <div>
                <div className="px-2 py-1 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Quick Actions
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      onNewPatient();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#0F172A] hover:bg-[#F1F5F9] text-left transition-colors"
                  >
                    <Plus size={15} className="text-[var(--color-primary-clinical,#0B6E75)]" />
                    <span>Register New Patient</span>
                  </button>
                  {onNewAppointment && (
                    <button
                      type="button"
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        onNewAppointment();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#0F172A] hover:bg-[#F1F5F9] text-left transition-colors"
                    >
                      <CalendarDays size={15} className="text-[var(--color-primary-clinical,#0B6E75)]" />
                      <span>Schedule New Appointment</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      window.dispatchEvent(new CustomEvent("hyh_toggle_copilot"));
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#0F172A] hover:bg-[#F1F5F9] text-left transition-colors"
                  >
                    <Sparkles size={15} className="text-[var(--color-primary-clinical,#0B6E75)]" />
                    <span>Open AI Clinical Copilot</span>
                  </button>
                </div>
              </div>

              {/* Modules Jump */}
              <div>
                <div className="px-2 py-1 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Modules & Workspaces
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {filteredPaletteModules.map((m) => {
                    const MIcon = m.icon;
                    return (
                      <button
                        key={m.route}
                        type="button"
                        onClick={() => {
                          setCommandPaletteOpen(false);
                          navigate(m.route);
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#0F172A] hover:bg-[#F1F5F9] text-left transition-colors"
                      >
                        <MIcon size={15} className="text-[#64748B]" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Utilities Modals from old FloatingToolbar */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
      <HelpModal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      <AddonsModal open={addonsModalOpen} onClose={() => setAddonsModalOpen(false)} />
      <ReferFriendModal
        open={referFriendModalOpen}
        onClose={() => setReferFriendModalOpen(false)}
      />
    </div>
  );
}
