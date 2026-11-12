import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Sliders,
  ChevronRight,
  Sparkles,
  Command,
  X,
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

// Exact 4-Column Layout Matrix matching live CharmHealth EHR (Row by Row)
// Row 1: Facility | Calendar | Patient | Templates
// Row 2: Questionnaires | Documents | Consultation | Health Trackers
// Row 3: Lab / Image | Rx | Immunization | Injections
// Row 4: Billing | Inventory | Message | Task
// Row 5: Patient Recall | Quick Text | Directory | PHR Settings
// Row 6: Charm TeleHealth | Charm Connect | Account | Security
// Row 7: Charm Assist
export function SettingsDashboard() {
  const { user } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<SettingOption | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Rank exact and title matches higher than description/keyword matches
    return matches.sort((a, b) => {
      const aExact = a.name.toLowerCase() === q;
      const bExact = b.name.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const aTitle = a.name.toLowerCase().includes(q);
      const bTitle = b.name.toLowerCase().includes(q);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;

      return 0;
    });
  }, [searchQuery]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Close dropdown on click outside
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

  // Handle keyboard navigation for search results
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

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.trim()})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.trim().toLowerCase() ? (
        <mark key={i} className="charm-search-mark">
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

  // Render a category card
  const renderCategoryCard = (category: SettingCategory) => {
    return (
      <div key={category.id} className="charm-settings-category-card">
        <h3
          className="charm-settings-category-heading"
          onClick={() => {
            if (category.options.length > 0) {
              handleOpenOption(category.options[0]);
            }
          }}
          title={`Configure ${category.name}`}
        >
          {category.name}
        </h3>
        <div className="charm-settings-links-wrap">
          {category.options.map((opt, idx) => (
            <React.Fragment key={opt.id}>
              <button
                type="button"
                className="charm-settings-link"
                onClick={() => handleOpenOption(opt)}
                title={opt.description}
              >
                <span>{opt.name}</span>
                {opt.badge && (
                  <span className="charm-badge-new">{opt.badge}</span>
                )}
              </button>
              {idx < category.options.length - 1 && (
                <span className="charm-settings-pipe">|</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="charm-settings-page-container">
      {/* Top Search Bar Section (Centered, rounded, subtle border & shadow) */}
      <section className="charm-settings-search-section">
        <div className="charm-settings-search-wrapper">
          <div
            className={`charm-settings-search-box ${isSearchFocused ? "focused" : ""}`}
          >
            <Search size={18} className="charm-search-left-icon" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search in Settings"
              placeholder="Search in Settings and perform actions"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              className="charm-settings-search-input"
            />
            {searchQuery ? (
              <button
                type="button"
                className="charm-search-clear-btn"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : null}
            <button
              type="button"
              className="charm-search-arrow-btn"
              onClick={() => {
                if (searchResults.length > 0) {
                  handleOpenOption(searchResults[0]);
                }
              }}
              aria-label="Search actions"
            >
              <ArrowRight size={17} />
            </button>
          </div>

          {/* Autocomplete Search Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div ref={dropdownRef} className="charm-settings-dropdown-results">
              {searchResults.length > 0 ? (
                <>
                  <div className="charm-dropdown-header">
                    <span>
                      Matching Settings ({searchResults.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Use ↑↓ and Enter to open
                    </span>
                  </div>
                  <div className="charm-dropdown-list">
                    {searchResults.map((opt, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={opt.id}
                          className={`charm-dropdown-item ${isSelected ? "selected" : ""}`}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={() => handleOpenOption(opt)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="charm-dropdown-cat-pill">
                                {opt.categoryName}
                              </span>
                              <strong className="charm-dropdown-opt-title">
                                {highlightMatch(opt.name, searchQuery)}
                              </strong>
                            </div>
                            <p className="charm-dropdown-opt-desc">
                              {highlightMatch(opt.description, searchQuery)}
                            </p>
                          </div>
                          <ChevronRight
                            size={16}
                            className="charm-dropdown-arrow"
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="charm-dropdown-empty">
                  <p>
                    No settings found matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </p>
                  <small>
                    Try searching for &quot;vitals&quot;, &quot;whatsapp&quot;, &quot;templates&quot;, &quot;calendar&quot;, or &quot;eecp&quot;
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Settings Content Panel (Large white panel, scrollable, 4-column responsive grid with perfect horizontal heading alignment) */}
      <section className="charm-settings-content-panel">
        <div className="charm-settings-grid-4col">
          {SETTINGS_CATEGORIES.map(renderCategoryCard)}
        </div>
      </section>

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
