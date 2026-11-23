import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRight,
  ChevronRight,
  X,
  Building2,
  ClipboardList,
  FlaskConical,
  CalendarDays,
  IndianRupee,
  MessageSquare,
  ShieldCheck,
  HeartPulse,
  Folder,
  UserCheck,
  FileText,
  CheckCircle2,
  Package,
  Settings,
  Lock,
  PhoneCall,
  Video,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  SETTINGS_CATEGORIES,
  ALL_SETTING_OPTIONS,
  SettingCategory,
  SettingOption,
} from "./settingsData";
import { SettingDetailModal } from "./SettingDetailModal";
import { useApp } from "../context";
import { navigate } from "../api";

export interface SettingsGroupConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  categoryIds: string[];
}

export const SETTINGS_GROUPS: SettingsGroupConfig[] = [
  {
    id: "practice-gov",
    title: "Practice & Governance",
    icon: Building2,
    categoryIds: ["facility", "directory", "account", "security"],
  },
  {
    id: "clinical-doc",
    title: "Clinical Documentation",
    icon: ClipboardList,
    categoryIds: ["consultation", "templates", "health-trackers", "questionnaires", "documents"],
  },
  {
    id: "diag-rx",
    title: "Diagnostics & Pharmacy",
    icon: FlaskConical,
    categoryIds: ["lab-image", "rx", "injections", "immunization"],
  },
  {
    id: "appt-pts",
    title: "Appointments & Patients",
    icon: CalendarDays,
    categoryIds: ["calendar", "patient", "patient-recall", "phr-settings"],
  },
  {
    id: "bill-ops",
    title: "Billing & Operations",
    icon: IndianRupee,
    categoryIds: ["billing", "inventory", "task", "quick-text"],
  },
  {
    id: "comm-tele",
    title: "Communication & Telehealth",
    icon: MessageSquare,
    categoryIds: ["message", "charm-telehealth", "charm-connect", "charm-assist"],
  },
];

export function SettingsDashboard() {
  const { user } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<SettingOption | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("facility");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categoryMap = useMemo(() => {
    return new Map(SETTINGS_CATEGORIES.map((c) => [c.id, c]));
  }, []);

  const activeCategory = categoryMap.get(activeCategoryId) || SETTINGS_CATEGORIES[0];

  // Filter and rank options based on search query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches = ALL_SETTING_OPTIONS.filter((opt) => {
      if (opt.name.toLowerCase().includes(q)) return true;
      if (opt.categoryName.toLowerCase().includes(q)) return true;
      if (opt.description.toLowerCase().includes(q)) return true;
      if (opt.keywords.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });

    return matches.sort((a, b) => {
      const aExact = a.name.toLowerCase() === q;
      const bExact = b.name.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? searchResults.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        handleOpenOption(searchResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsSearchFocused(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.trim()})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <mark key={i} className="charm-search-mark bg-amber-100 text-amber-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleOpenOption = (opt: SettingOption) => {
    navigate(`/settings/${opt.categoryId}/${opt.id}`);
    setIsSearchFocused(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F9FA] overflow-hidden">
      {/* 1. Centered Search Bar */}
      <div className="shrink-0 pt-5 pb-3 px-6 flex justify-center">
        <div className="relative w-full max-w-xl">
          <div className="flex items-center gap-2.5 bg-white border border-slate-300 rounded-full px-4 py-2 shadow-xs focus-within:ring-2 focus-within:ring-[#0B6E75] focus-within:border-transparent transition">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search in Settings"
              placeholder="Search setting options, tariffs, staff, notifications..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 p-0.5"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs"
            >
              {searchResults.length > 0 ? (
                <>
                  <div className="p-2.5 bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Matching Settings ({searchResults.length})</span>
                    <span className="text-[10px] text-slate-400">Use ↑↓ and Enter</span>
                  </div>
                  <div className="p-1">
                    {searchResults.map((opt, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                            isSelected ? "bg-[#EFF8F7] text-[#0B6E75]" : "hover:bg-slate-50 text-slate-800"
                          }`}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => handleOpenOption(opt)}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600">
                                {opt.categoryName}
                              </span>
                              <strong className="text-xs truncate">
                                {highlightMatch(opt.name, searchQuery)}
                              </strong>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {highlightMatch(opt.description, searchQuery)}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-slate-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  <p className="text-xs">No settings found matching &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Modern 2-Pane Settings Layout */}
      <div className="flex-1 flex overflow-hidden mx-6 mb-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        {/* Left Category Sidebar (Grouped into 6 Clean Clinical & Operational Sections) */}
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-50/70 flex flex-col overflow-y-auto p-3 space-y-4 select-none">
          {SETTINGS_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center gap-2 px-2.5 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <GroupIcon size={14} className="text-[#0B6E75]" />
                  <span>{group.title}</span>
                </div>
                <div className="space-y-0.5">
                  {group.categoryIds.map((catId) => {
                    const cat = categoryMap.get(catId);
                    if (!cat) return null;
                    const isActive = cat.id === activeCategoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors font-medium ${
                          isActive
                            ? "bg-[#EFF8F7] text-[#0B6E75] font-semibold shadow-2xs border border-[#0B6E75]/20"
                            : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cat.options.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Right Active Settings Panel (Option Cards with Direct Navigation Links) */}
        <div className="flex-1 bg-white overflow-y-auto p-6 flex flex-col">
          {activeCategory && (
            <>
              {/* Active Category Header */}
              <div className="border-b border-slate-200 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeCategory.name}
                  </h2>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                    {activeCategory.options.length} Configuration Modules
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  {activeCategory.description}
                </p>
              </div>

              {/* Options Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeCategory.options.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => handleOpenOption(opt)}
                    className="group border border-slate-200 hover:border-[#0B6E75]/50 bg-white hover:bg-teal-50/20 p-4 rounded-xl cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-[#0B6E75] transition-colors">
                          {opt.name}
                        </h4>
                        {opt.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                        {opt.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-[#0B6E75] font-medium group-hover:underline">
                      <span>Configure settings</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Setting Configuration Detail Modal */}
      {selectedOption && (
        <SettingDetailModal
          option={selectedOption}
          onClose={() => setSelectedOption(null)}
        />
      )}
    </div>
  );
}
